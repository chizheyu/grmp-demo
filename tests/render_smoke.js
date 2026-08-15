/* Render smoke — execute every view function in Node, on the exact files the browser
   loads, in the same order. A template that references an undefined name (the CF-in-
   v_config class of bug) throws HERE instead of shipping: the literal-guard greps text,
   the e2e suites need a deploy first — this is the gap between them.
   Run: node tests/render_smoke.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');

let pass = 0, fail = 0;
function T(name, cond, note) {
  if (cond) { pass++; console.log('  PASS', name); }
  else { fail++; console.log('  FAIL', name, note ? '— ' + note : ''); }
}

/* Browser-shaped context: enough window/document for load-time code, nothing more —
   if a view starts needing real DOM at render time, that is a finding, not a shim gap. */
const ctx = {
  console, setTimeout, clearTimeout,
  navigator: { webdriver: true },
  window: { addEventListener: () => {} },
  document: { getElementById: () => null, querySelectorAll: () => [], querySelector: () => null,
              createElement: () => ({ style: {}, classList: { add() {} }, setAttribute() {} }),
              addEventListener: () => {} },
  localStorage: (() => { const m = {}; return {
    getItem: k => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); },
    removeItem: k => { delete m[k]; } }; })(),
  location: { hash: '#/', reload: () => {} },
  fetch: () => new Promise(() => {}),
};
ctx.globalThis = ctx;
vm.createContext(ctx);

for (const f of ['data.js', 'ai.js', 'views_public.js', 'views_console.js', 'app.js']) {
  const src = fs.readFileSync(path.join(root, f), 'utf8');
  try {
    new vm.Script(src, { filename: f }).runInContext(ctx);
    // the browser reaches window.* as bare globals; mirror that between file loads
    if (ctx.window.GRMP && !ctx.GRMP) ctx.GRMP = ctx.window.GRMP;
    if (ctx.window.AI && !ctx.AI) ctx.AI = ctx.window.AI;
  }
  catch (e) { console.log(`  FAIL load ${f} — ${e.message}`); fail++; }
}

/* Top-level const/let in a vm Script live in the context's lexical environment —
   visible to the next script (exactly like browser <script> tags) but not as ctx.*
   properties. Pull the bindings out by evaluating inside the context. */
const G = vm.runInContext(
  '({Views, Console, GRMP, db}); globalThis.__demo={db}; window.__demo=__demo; ({Views, Console, GRMP, db})', ctx);
const db = G.db;

// A literal ${ in rendered HTML means a template expression fell into a plain string —
// the exact bug class the eye catches instantly and 'is it a string?' checks never did.
const BAD = /undefined|\bNaN\b|\[object Object\]|\$\{/;
const check = (name, fn) => {
  try {
    const html = fn();
    T(name, typeof html === 'string' && html.length > 200 && !BAD.test(html),
      typeof html !== 'string' ? 'not a string' : html.length <= 200 ? `only ${html.length} chars`
        : 'contains ' + (html.match(BAD) || [])[0]);
  } catch (e) { T(name, false, e.message); }
};

console.log('— public views —');
const V = G.Views;
check('landing', () => V.landing());
check('guideMentee', () => V.guideMentee());
check('guideMentor', () => V.guideMentor());
check('reflection', () => V.reflection());
check('concern', () => V.concern());
check('apply(mentee)', () => V.apply('mentee'));
check('apply(mentor)', () => V.apply('mentor'));
check('manual', () => V.manual());
check('decisions', () => V.decisions());

console.log('— personal pages (every persona state) —');
for (const acct of (db.config.accounts || []).filter(a => a.kind === 'person'))
  check(`personal ${acct.u}`, () => V.personal(acct.personId));

console.log('— console: every admin × every view they can open —');
const C = G.Console;
check('console login', () => C.login());
for (const admin of db.config.admins) {
  for (const [key] of C.navItems(db, admin.roles))
    check(`${admin.name} → ${key}`, () => C.shell(admin.name, key));
}

console.log('— settled decisions carry no card; open ones still do —');
{
  const html_rem = C.shell('Wei Kiat','reminders');
  T('Q5 settled → no card on Reminders', !/INFERRED · Q5/.test(html_rem));
  const html_dash = C.shell('Esther','dashboard');
  T('Q7 settled → no card on Dashboard', !/INFERRED · Q7/.test(html_dash));
  const html_match = C.shell('Esther','matching');
  T('Q3 settled by the specs → no card on Matching', !/INFERRED · Q3/.test(html_match));
  const html_apply = V.apply('mentee');
  T('Q4/Q10 settled by the specs → no card on the application form', !/INFERRED · (Q4|Q10)/.test(html_apply));
  const html_dec = C.shell('Esther','decisions');
  T('Q9 (auto-issue on approval) still open → its card stays on Decisions', /INFERRED · Q9/.test(html_dec));
  const html_cfg = C.shell('Esther','config');
  T('Q8 settled → no card on Configuration', !/INFERRED · Q8/.test(html_cfg));
  T('Q12 (brand assets outstanding) still open → its card stays on Configuration', /INFERRED · Q12/.test(html_cfg));
}
console.log('— R5: the gate, OTP card and staged form render in every state —');
{
  const gatep = db.people.find(p=>p.appStatus==='accepted' && !G.GRMP.D.placeConfirmed(p));
  check('personal (gate ahead)', () => V.personal(gatep.id));
  const res = db.people.find(p=>p.appStatus==='reserve_invited');
  check('personal (reserve list)', () => V.personal(res.id));
  for(const s of [1,2,3,4]){
    vm.runInContext(`window.__APPLY = {kind:'mentee', step:${s}, d:{}, errors:{}}`, ctx);
    check(`apply mentee step ${s}`, () => V.apply('mentee'));
  }
  for(const s of [1,2,3,4]){
    vm.runInContext(`window.__APPLY = {kind:'mentor', step:${s}, d:${s>1?`{heard:GRMP.FORM_OPTS.heardMentor[0]}`:'{}'}, errors:{}}`, ctx);
    check(`apply mentor step ${s}${s>1?' (returning branch)':''}`, () => V.apply('mentor'));
  }
  vm.runInContext('window.__APPLY = null', ctx);
}

console.log('— and the same sweep on a brand-new cycle (derived-facts proof) —');
G.GRMP.D.startNewCycle(db, { label: 'GRMP 2031 (NTU pilot)', today: '2031-09-01', actor: 'smoke',
  rotations: [{ n: 1, label: 'Know Yourself', start: '2031-10-01', end: '2031-11-30' },
              { n: 2, label: 'Know Your World', start: '2031-12-01', end: '2032-01-31' },
              { n: 3, label: 'Know Your Path', start: '2032-02-01', end: '2032-03-31' }] });
check('landing (new cycle)', () => {
  const html = V.landing();
  if (!/2031|2032/.test(html)) throw new Error('new-cycle dates missing from the page');
  if (/\b2026\b|\b2027\b/.test(html)) throw new Error('old-cycle dates still rendered');
  if (!/NTU/.test(html)) throw new Error('institution not derived');
  return html;
});
for (const admin of db.config.admins)
  for (const [key] of C.navItems(db, admin.roles))
    check(`new-cycle ${admin.name} → ${key}`, () => C.shell(admin.name, key));

console.log('— every data-act in shipped markup has a real Action behind it —');
// The thread Reply buttons shipped dead because per-element binding missed
// async-injected markup. Delegation fixed the wiring; this guard catches the
// other failure mode — a data-act value with no Actions handler at all.
{
  const src = ['views_public.js','views_console.js','app.js']
    .map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
  const used = new Set([...src.matchAll(/data-act="([a-zA-Z]+)"/g)].map(m => m[1]));
  const actionsSrc = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const bodyStart = actionsSrc.indexOf('const Actions');
  const defined = new Set([...actionsSrc.slice(bodyStart).matchAll(/^  ([a-zA-Z]+)\(/gm)].map(m => m[1]));
  const missing = [...used].filter(a => !defined.has(a));
  T('all data-act values resolve to Actions (' + used.size + ' wired)', missing.length === 0,
    missing.length ? 'no handler for: ' + missing.join(', ') : '');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
