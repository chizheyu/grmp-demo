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
check('mentees page', () => V.pageMentees());
check('mentors page', () => V.pageMentors());
check('faq (default tab)', () => V.pageFaq());
for (const t of ['mentees','mentors'])
  check(`faq (${t} tab)`, () => vm.runInContext(`window.__FAQTAB=${JSON.stringify(t)}; (()=>{const h=Views.pageFaq(); window.__FAQTAB=null; return h;})()`, ctx));
check('resources', () => V.resources());
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
  /* Q9 was confirmed twice on 18 Aug (Esther F0817-145316, Joanne F0818-131700), so its card retires
     from Decisions and lives on in the register with a Settled badge. */
  T('Q9 settled by Esther and Joanne → no card left on Decisions', !/INFERRED · Q9/.test(html_dec));
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

  /* 18 Aug (Joanne): the written no-save notice is gone from both forms — the browser's own
     leave-page warning says it — and the revised PDPA must reach BOTH forms, not just the one
     she happened to file the feedback from. */
  vm.runInContext(`window.__APPLY = {kind:'mentee', step:4, d:{}, errors:{}}`, ctx);
  const step4Mentee = V.apply('mentee');
  vm.runInContext(`window.__APPLY = {kind:'mentor', step:4, d:{}, errors:{}}`, ctx);
  const step4Mentor = V.apply('mentor');
  T('the written no-save notice is off both application forms',
    [step4Mentee, step4Mentor].every(h => !h.includes('there is no save function')));
  T('the revised PDPA (AI/service-provider paragraph) renders on both forms',
    [step4Mentee, step4Mentor].every(h =>
      h.includes('technology service providers, including AI assisted tools')
      && h.includes('SMC will not otherwise share your personal data')));

  /* A mentor who declines the WhatsApp group is offered Phone call, not Telegram: the form never
     collects a mentor's Telegram handle, so the old option promised a channel we cannot use. */
  vm.runInContext(`window.__APPLY = {kind:'mentor', step:4, d:{whatsappConsent:'No'}, errors:{}}`, ctx);
  const mentorDeclined = V.apply('mentor');
  T('declining the mentor group offers Phone call / Email, with Telegram gone',
    mentorDeclined.includes('>Phone call<') && mentorDeclined.includes('>Email<')
    && !/>Telegram</.test(mentorDeclined));
  vm.runInContext(`window.__APPLY = {kind:'mentee', step:4, d:{telegramConsent:'No'}, errors:{}}`, ctx);
  T('the mentee side still offers Email / Phone per its own spec',
    /<option[^>]*>Email</.test(V.apply('mentee')));
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

console.log('— pre-login site: the build spec, rendered —');
{
  const V = G.Views, CF = G.GRMP.D.cohortFacts(db);
  const home = V.landing(), mentees = V.pageMentees(), mentors = V.pageMentors(), faq = V.pageFaq();
  const pages = {home, mentees, mentors, faq};

  T('nav is exactly Mentees, Mentors, FAQ, in that order, on every public page',
    Object.values(pages).every(h => {
      const nav = h.slice(0, h.indexOf('</nav>'));
      const labels = [...nav.matchAll(/class="ms-navlink[^"]*"[^>]*>([^<]+)</g)].map(m => m[1]);
      return labels.join('|') === 'Mentees|Mentors|FAQ';
    }));
  T('Apply is never in the nav (it is the in-body primary action only)',
    Object.values(pages).every(h => !/ms-navlink[^>]*>[^<]*Apply/.test(h)));
  T('Sign in is present, secondary, and carries the confirmed cue copy',
    Object.values(pages).every(h => h.includes('ms-signin') && h.includes('Already accepted?')));
  T('the current page is marked active for assistive tech',
    mentees.includes('aria-current="page"') && mentors.includes('aria-current="page"') && faq.includes('aria-current="page"'));

  T('footer carries About SMC, the Charter and the enquiries address, on every page',
    Object.values(pages).every(h => h.includes('https://www.smcmentorship.org/')
      && h.includes('docs/SMC_Charter_V1.0.pdf') && h.includes('mailto:' + CF.enquiries)));
  T('both footer reference links open in a new tab, safely',
    (home.match(/target="_blank" rel="noopener"/g) || []).length >= 2);

  const HOME_SPEC = ['Six months. A mentoring journey that works both ways.', 'Two ways in',
    'How the six months run', 'Applications are open.', 'Discover the mentee journey',
    'Explore the mentor journey', 'Apply as a Mentee', 'Apply as a Mentor'];
  T('Home carries the spec copy verbatim', HOME_SPEC.every(t => home.includes(t)));
  T('Home timeline reads the cycle, not literals (Sep short in the timeline, September in prose)',
    home.includes('Apply · by ' + CF.closesDayShort)
    && home.includes('Accept · by ' + CF.acceptByDayShort)
    && home.includes('Kick-Off · ' + CF.kickoffDayShort)
    && home.includes('3 rotations · ' + CF.rotSpanShort)
    && home.includes('Complete · ' + CF.endMon3));
  T('Home carries no FAQ answers (they moved to the FAQ page)',
    !home.includes('faq-item') && home.includes('#/faq'));

  T('Mentees page: gain-led copy, the four asks, and the reflection bar',
    mentees.includes('Three mentors. Six months. A clearer sense of where you are going.')
    && mentees.includes('What you gain') && mentees.includes('What it asks of you')
    && mentees.includes("Close with a Builder's Commitment: one simple way to give back to SMC.")
    && mentees.includes('it never needs to be submitted'));
  T('Mentors page: contribute-led copy, four gains, the role block, navy lane',
    mentors.includes('Two hours a rotation. A perspective a student will carry for years.')
    && mentors.includes('What you contribute') && mentors.includes('Your role: guide, challenge, inspire')
    && mentors.includes('hero-navy'));
  T('the rotation arc appears on both audience pages, framed for each',
    mentees.includes('Surface your values, identity and strengths.')
    && mentors.includes('Help surface values, identity and strengths.')
    && [mentees, mentors].every(h => ['修身','治国','平天下','AI-WT Mindset'].every(t => h.includes(t))));
  T('closing bands quote the real deadlines',
    [mentees, mentors].every(h => h.includes(CF.applyClosesLong) && h.includes(CF.outcomeByNoYear)));

  T('FAQ has the three tabs with About GRMP selected by default',
    (faq.match(/role="tab"/g) || []).length === 3
    && /id="faqtab-about"[^>]*aria-selected="true"/.test(faq));
  T('every FAQ row is collapsed on load and single-open within its tab',
    !/<details[^>]* open/.test(faq)
    && (faq.match(/<details class="faq-item" name="faq-about"/g) || []).length === 9);
  /* The two [CONTENT] answers carried an "awaiting owner confirmation" badge until Joanne
     confirmed both on 18 Aug (F0818-131510). Nothing is flagged now; the badge mechanism
     stays for the next answer we have to draft ahead of the owner. */
  T('the two answers the spec left open are confirmed, no flags left on the page',
    (faq.match(/faq-flag/g) || []).length === 0
    && faq.includes('Do I need an account or a password to apply?')
    && faq.includes('How much time does it really take?'));
  T('the account answer drops the programme-team line Joanne asked us to remove',
    !faq.includes('Accounts exist only for the programme team'));
  T('the FAQ sub-line Joanne asked us to remove is gone',
    !faq.includes('Pick your view'));
  T('FAQ never links the gated Resources area', !faq.includes('#/resources'));
}

console.log('— Resources library (post-login) —');
{
  const html = G.Views.resources();
  const esc = t => String(t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  T('all five documents render, in the spec order, under their two headings',
    G.GRMP.RESOURCES.length === 5
    && G.GRMP.RESOURCES.every(d => html.includes(esc(d.title)) && html.includes(esc(d.desc))
                                && html.includes('docs/resources/' + d.file))
    && html.indexOf('For mentees') < html.indexOf('For mentors')
    && html.indexOf(esc(G.GRMP.RESOURCES[0].title)) < html.indexOf(esc(G.GRMP.RESOURCES[3].title)));
  T('every open control names its document rather than saying "Download"',
    !/>\s*Download\s*</.test(html)
    && G.GRMP.RESOURCES.every(d => html.includes('Open ' + esc(d.title))));
  T('documents open in a new tab and are hosted here, never hot-linked to Drive',
    !html.includes('drive.google.com')
    && (html.match(/target="_blank" rel="noopener"/g) || []).length >= 5);
  T('the page carries no application links and no public-site sections (spec: nothing else)',
    !html.includes('#/apply/') && !html.includes('ms-hero'));
  T('the Charter is NOT in Resources (it is the public footer PDF)',
    !/docs\/resources\/[^"]*charter/i.test(html));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
