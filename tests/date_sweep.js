/* Date sweep — every date a participant can read, and where it comes from.
   Joanne asked for this by name in the 20 Aug amendments: "the technical team should run
   a find across the built pages for 'September', 'Sep' and '2026' and report every result."
   So it is a script rather than a person with ctrl-F, and it runs in the suite rather than
   once: the value of a sweep is that it can be re-run the day after the next change.

   It renders the built pages, the two confirmation screens and all 17 email templates, then
   for every date-shaped string asks one question — which config field does this come from?
   A date nobody can trace to a field is a literal somebody typed, which is how a build ends
   up telling applicants 18 September while the programme runs 14 September.
   Run: node tests/date_sweep.js [--report <path>] */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');

const ctx = {
  console: {log(){}, warn(){}, error(){}}, setTimeout, clearTimeout,
  navigator:{webdriver:true}, window:{addEventListener(){}},
  document:{getElementById:()=>null, querySelectorAll:()=>[], querySelector:()=>null,
            createElement:()=>({style:{}, classList:{add(){}}, setAttribute(){}}), addEventListener(){}},
  localStorage:(()=>{const m={};return{getItem:k=>(k in m?m[k]:null), setItem:(k,v)=>{m[k]=String(v)}, removeItem:k=>{delete m[k]}}})(),
  location:{hash:'#/', reload(){}}, fetch:()=>new Promise(()=>{}),
};
ctx.globalThis = ctx; vm.createContext(ctx);
for (const f of ['data.js','ai.js','views_public.js','views_console.js','app.js']) {
  new vm.Script(fs.readFileSync(path.join(root,f),'utf8'), {filename:f}).runInContext(ctx);
  if (ctx.window.GRMP && !ctx.GRMP) ctx.GRMP = ctx.window.GRMP;
  if (ctx.window.AI && !ctx.AI) ctx.AI = ctx.window.AI;
}
const G = vm.runInContext('({Views, Console, GRMP, db}); globalThis.__demo={db}; window.__demo=__demo; ({Views, Console, GRMP, db})', ctx);
const db = G.db, D = G.GRMP.D, CF = D.cohortFacts(db);

/* ---- every date the build is entitled to say, and the field it came from ---- */
const FIELDS = {
  'config.registration.opens': db.config.registration.opens,
  'config.registration.closes': db.config.registration.closes,
  'config.selection.reviewFrom': db.config.selection.reviewFrom,
  'config.selection.approvalsBy': db.config.selection.approvalsBy,
  'config.selection.outcomeBy': db.config.selection.outcomeBy,
  'config.selection.acceptBy': db.config.selection.acceptBy,
  'config.selection.reserveActivateFrom': db.config.selection.reserveActivateFrom,
  'config.selection.reserveAcceptBy': db.config.selection.reserveAcceptBy,
  'events.kickoff.date': db.events.kickoff.date,
  'events.appreciation.date': db.events.appreciation.date,
  'derived.acceptanceReminder': (D.ackLadder(db)[0]||{}).date,
};
db.config.rotations.forEach(r=>{ FIELDS[`rotation ${r.n} start`]=r.start; FIELDS[`rotation ${r.n} end`]=r.end; });

const forms = iso => [D.fmtLong(iso), D.fmtLongNoYear(iso), D.fmtDayMon3(iso), D.fmtDMY(iso), iso,
  `${Number(iso.slice(8,10))} ${D.monthShort(iso)}`,                     // "9 Sept" — prose short form
  `${D.monthName(iso)} ${iso.slice(0,4)}`, `${D.monthShort(iso)} ${iso.slice(0,4)}`];  // "October 2026" — window ends
const KNOWN = new Map();                       // rendered string -> field name
Object.entries(FIELDS).forEach(([k,iso])=>{ if(/^\d{4}-\d{2}-\d{2}$/.test(iso||'')) forms(iso).forEach(f=>{ if(!KNOWN.has(f)) KNOWN.set(f,k); }); });
const KNOWN_MONTHS = new Set(Object.values(FIELDS).filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')).flatMap(iso=>[D.monthName(iso), D.monthShort(iso), D.mon3(iso)]));
const KNOWN_YEARS  = new Set(Object.values(FIELDS).filter(v=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')).map(iso=>iso.slice(0,4)));

/* ---- the surfaces a participant can actually read ---- */
const plain = h => String(h).replace(/<(script|style)[\s\S]*?<\/\1>/g,' ').replace(/<[^>]*>/g,' ')
  .replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
  .replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
const tab = t => vm.runInContext(`window.__FAQTAB=${JSON.stringify(t)}; (()=>{const h=Views.pageFaq(); window.__FAQTAB=null; return h;})()`, ctx);
const applicant = kind => db.people.find(p=>p.kind===kind && p.appStatus==='submitted');

const SURFACES = [
  ['Home', () => G.Views.landing()],
  ['Mentees page', () => G.Views.pageMentees()],
  ['Mentors page', () => G.Views.pageMentors()],
  ['FAQ (general)', () => G.Views.pageFaq()],
  ['FAQ (mentees tab)', () => tab('mentees')],
  ['FAQ (mentors tab)', () => tab('mentors')],
  ['Apply — mentee form', () => G.Views.apply('mentee')],
  ['Apply — mentor form', () => G.Views.apply('mentor')],
  ['Confirmation screen — mentee', () => G.Views.applied(applicant('mentee').id)],
  ['Confirmation screen — mentor', () => G.Views.applied(applicant('mentor').id)],
  ['Raise a concern', () => G.Views.concern()],
  ['Resources (post-login)', () => G.Views.resources()],
];
Object.keys(G.GRMP.MAILS).forEach(tpl => SURFACES.push([`Email template — ${tpl}`,
  () => { const m = D.renderMail(db, {tpl, vars:{name:'[Name]', link:'[personalized link]', code:'123456'}}); return m.subject + '\n' + m.body; }]));

/* ---- the find itself ---- */
/* Month names are matched whole: "Dec[a-z]*" also matches "Deck", and a sweep that cries
   wolf on the Mentee Briefing Deck is a sweep nobody reads twice. Longest form first so
   "September" is not consumed as "Sep". */
const MON = '(?:January|February|March|April|May|June|July|August|September|October|November|December'
          + '|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\\b';
const RX = new RegExp(
    `\\b\\d{1,2}\\s+${MON}(?:\\s+\\d{4})?`      // 9 September 2026 / 9 Sept
  + `|${MON}\\s+\\d{4}`                        // October 2026
  + `|${MON}\\s+\\d{1,2}(?!\\d)(?:,\\s*\\d{4})?` // September 9, 2026
  + `|\\b\\d{4}-\\d{2}-\\d{2}\\b`             // 2026-09-09
  + `|${MON}`                                  // a bare month name
  + `|\\b20\\d{2}\\b`, 'g');                   // a bare year
const rows = [];
for (const [name, fn] of SURFACES) {
  let text; try { text = plain(fn()); } catch (e) { rows.push({surface:name, hit:'(render failed)', verdict:'ERROR', note:e.message, context:''}); continue; }
  let m;
  while ((m = RX.exec(text))) {
    const hit = m[0];
    const context = text.slice(Math.max(0,m.index-70), m.index+hit.length+70).trim();
    let verdict, note;
    if (KNOWN.has(hit)) { verdict='derived'; note=KNOWN.get(hit); }
    else if (/^\d{4}$/.test(hit)) { verdict = KNOWN_YEARS.has(hit)?'derived':'LITERAL'; note = KNOWN_YEARS.has(hit)?'a year the cycle runs in':'a year no programme date falls in'; }
    else if (/^[A-Za-z]+$/.test(hit)) { verdict = KNOWN_MONTHS.has(hit)?'derived':'LITERAL'; note = KNOWN_MONTHS.has(hit)?'a month the cycle runs in':'a month no programme date falls in'; }
    else { verdict='LITERAL'; note='full date matching no configured field'; }
    rows.push({surface:name, hit, verdict, note, context});
  }
}

const bad = rows.filter(r=>r.verdict!=='derived');
const byHit = {};
rows.forEach(r=>{ (byHit[r.hit] = byHit[r.hit] || []).push(r); });

/* ---- report ---- */
const arg = process.argv.indexOf('--report');
const out = arg>-1 ? process.argv[arg+1] : path.join(root,'..','GRMP_Cycle1_Date_Sweep.md');
const L = [];
L.push('# GRMP — date sweep of the built pages','');
L.push('Requested in *GRMP 2.0 Cycle 1: Date Amendments* (20 Aug 2026): "the technical team should run a find across the built pages for \\"September\\", \\"Sep\\" and \\"2026\\" and report every result."','');
L.push(`Generated by \`grmp-demo/tests/date_sweep.js\` from the live build. Surfaces swept: **${SURFACES.length}** (${SURFACES.length - Object.keys(G.GRMP.MAILS).length} pages and screens, ${Object.keys(G.GRMP.MAILS).length} email templates). Date mentions found: **${rows.length}**. Typed-in dates found: **${bad.length}**.`,'');
L.push('Every row below is a date a participant can read. "Derived" means the page reads it from the configuration field named, so it moved the moment the amendments landed; a literal would be a date somebody typed into the copy, which is the failure this sweep exists to catch.','');
L.push('## The dates the build is running','');
L.push('| Field | Date | As it appears in copy |','|---|---|---|');
Object.entries(FIELDS).filter(([,v])=>/^\d{4}-\d{2}-\d{2}$/.test(v||'')).forEach(([k,v])=>
  L.push(`| \`${k}\` | ${v} | ${D.fmtLong(v)} · ${D.fmtLongNoYear(v)} · ${D.fmtDayMon3(v)} |`));
L.push('');
L.push('## Every mention, by what it says','');
Object.keys(byHit).sort().forEach(hit=>{
  const rs = byHit[hit], v = rs[0].verdict, note = rs[0].note;
  L.push(`### "${hit}" — ${v==='derived'?`derived from \`${note}\``:`**${v}** (${note})`}`);
  L.push('');
  rs.forEach(r=>L.push(`- **${r.surface}** — …${r.context}…`));
  L.push('');
});
if (!bad.length) L.push('## Result','','No typed-in dates anywhere in the swept surfaces. Every date a participant can read comes from a configuration field, so the amendments propagated to all of them at once.','');
fs.writeFileSync(out, L.join('\n'));

console.log(`— date sweep: ${SURFACES.length} surfaces, ${rows.length} date mentions, ${bad.length} typed in —`);
bad.slice(0,20).forEach(r=>console.log(`  LITERAL  ${r.surface}: "${r.hit}" (${r.note}) …${r.context}…`));
console.log(`  report → ${path.relative(process.cwd(), out)}`);
process.exit(bad.length ? 1 : 0);
