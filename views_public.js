/* GRMP Demo — public views: microsite (manual ch.1) + personal pages (ch.2–3).
   R5: staged 4-step application forms (Joanne's specs, verbatim), OTP link login,
   gated acceptance (Rules + COI + Kick-Off) and the post-gate logistics step.
   NO cohort literal (year / institution / cap / month) may appear in this file —
   everything comes from GRMP.D.cohortFacts(db) or GRMP.COPY (guard-tested in L1). */

/* Cohort facts, read lazily at render time. */
const F = () => GRMP.D.cohortFacts((typeof __demo!=='undefined'&&__demo.db)||db);

/* Verbatim copy renderer: '**x**' → bold, list-ish lines keep their own row. */
function copyHTML(lines){
  return lines.map(l=>{
    const h = esc(l).replace(/\*\*([^*]+)\*\*/g,'<b>$1</b>');
    const tight = /^(\d+\.|-)\s/.test(l) ? 'margin:2px 0 2px 14px' : 'margin:8px 0';
    return `<p style="${tight}">${h}</p>`;
  }).join('');
}
/* Multi-step application state (in memory only — the specs confirm no save-and-resume). */
window.__APPLY = window.__APPLY || null;
window.__OTP = window.__OTP || null;

const Views = {

/* ---------- shared microsite chrome ---------- */
msNav(){
  return `<nav class="ms-nav"><div class="wrap row">
    <a href="#/" class="ms-logo" style="text-decoration:none">SMC · GRMP<small>GLOBAL READY MENTORSHIP</small></a>
    <span class="spacer"></span>
    <a href="#/guide/mentee">For Mentees</a>
    <a href="#/guide/mentor">For Mentors</a>
    <a href="#/apply/mentee" class="btn sm" style="background:#fff;color:var(--red);border-radius:8px">Apply</a>
    ${(typeof NET!=='undefined'&&NET)?(SESSION?`<a href="${SESSION.identity&&SESSION.identity.kind==='person'?'#/me/'+SESSION.identity.personId:'#/console/'+encodeURIComponent((SESSION.identity&&SESSION.identity.name)||'')}" style="font-size:12px;opacity:.95">👤 ${esc((SESSION.identity&&SESSION.identity.name)||'me')}</a>`:`<a href="#/login" style="font-size:12.5px;font-weight:700">Sign in</a>`):''}
  </div></nav>`;
},
msFooter(){
  return `<footer class="ms-footer"><div class="wrap" style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
    <span>Singapore Mentorship Committee · ${F().label}</span>
    <span class="spacer" style="flex:1"></span>
    <a href="#/concern">Raise a concern (private)</a>
  </div></footer>`;
},

/* ---------- 1.1 landing ---------- */
landing(){
  return this.msNav() + `
  <header class="ms-hero"><div class="wrap">
    <div class="eyebrow">Singapore Mentorship Committee · Global Ready for SG100</div>
    <h1>Six months. Three mentors. A global-ready you.</h1>
    <p>The Global Ready Mentorship Programme pairs ${F().inst?F().inst+' ':''}students with senior leaders across three rotations — ${F().spanLong}. One hour with the right mentor
       can reframe a career.</p>
    <div class="cta">
      <a class="btn btn-light" href="#/apply/mentee" style="text-decoration:none">Apply as a Mentee</a>
      <a class="btn btn-line" href="#/apply/mentor" style="text-decoration:none">Apply as a Mentor</a>
    </div>
  </div></header>
  <div class="ms-strip">${F().short}${F().inst?` is piloted with ${F().inst}`:``} · ${F().mentors} mentors · ${F().mentees} mentees · applications reviewed by the programme team</div>

  <section class="ms-section"><div class="wrap">
    <h2>Is this for you?</h2>
    <div class="cards3" style="margin-top:14px">
      <div class="tcard"><h3 style="margin-top:0">Who can apply</h3>
        <p>Current ${F().inst?F().inst+' ':''}undergraduates from every school and every year — ready to be mentored,
        and to do the reflecting that makes mentorship work. Places are capped at ${F().menteeCap}, and every application is read with care.</p></div>
      <div class="tcard"><h3 style="margin-top:0">What it asks of you</h3>
        <p>Meet your mentor <b>at least twice</b> in each two-month rotation, at times you both choose.
        Write a private reflection after each rotation. One minute to close each rotation off. That is all.</p></div>
      <div class="tcard"><h3 style="margin-top:0">What you leave with</h3>
        <p>Three mentors across three rotations, matched to your industry preferences, a habit of reflecting on your own direction, and a
        completion certificate presented jointly by ${F().inst||'the university'} and the Singapore Mentorship Committee.</p></div>
    </div>
  </div></section>

  <section class="ms-section" style="padding-top:0"><div class="wrap">
    <h2>How the six months run</h2>
    <p class="lede">Every step below is handled on this platform — no forms lost in inboxes, no chasing.</p>
    <div class="timeline">
      <div class="tl-node"><div class="dot">1</div><h4>Apply · ${F().regWindow||F().applyShort}</h4><p>One staged form, reviewed by the programme team · outcome by ${F().outcomeByLong}</p></div>
      <div class="tl-node"><div class="dot">2</div><h4>Accept your place</h4><p>Your personal link opens the portal gate — Programme Rules, a conflict declaration and Kick-Off attendance, by ${F().acceptByLong}</p></div>
      <div class="tl-node"><div class="dot">3</div><h4>Kick-Off · ${F().kickoffShort}</h4><p>${F().kickoffLong}, ${F().kickoffTime} — a binding programme requirement</p></div>
      <div class="tl-node"><div class="dot">4</div><h4>3 rotations · ${F().r1Short}–${F().endShort}</h4><p>Know Yourself · Know Your World · Know Your Path</p></div>
      <div class="tl-node"><div class="dot">5</div><h4>Close-off each rotation</h4><p>Two meetings + your private reflection</p></div>
      <div class="tl-node"><div class="dot">6</div><h4>Certificate · ${F().endShort}</h4><p>Complete all three rotations</p></div>
    </div>
  </div></section>

  <section class="ms-section" style="background:var(--surface);border-top:1px solid var(--line)"><div class="wrap" style="display:flex;gap:26px;align-items:center;flex-wrap:wrap">
    <div style="flex:1;min-width:260px">
      <h2 style="margin-bottom:8px">Mentors: two hours a month that change a trajectory</h2>
      <p class="lede" style="margin:0">Meet your mentee at least twice per two-month rotation, at times you both choose.
      No admin burden — the platform handles everything except the conversation.</p>
    </div>
    <a class="btn btn-primary" href="#/apply/mentor" style="text-decoration:none">Apply as a Mentor</a>
  </div></section>

  <section class="ms-section"><div class="wrap">
    <h2>Questions people ask before applying</h2>
    <div class="faq">
      ${[
        ['Do I need an account or a password?',
         'No password, ever. Your acceptance email carries your own personal link; opening it sends a one-time code to your email, and that signs you in. Only the programme team holds accounts.'],
        ['How much time does it really take?',
         'Two conversations per rotation, arranged directly between you and your mentor, plus a one-minute close-off at the end of each. Six conversations over six months.'],
        ['Do I have to hand in my reflections?',
         'No. Your reflection is yours. The platform records only that you completed the rotation — never what you wrote.'],
        ['What if my mentor drops out?',
         'You are re-matched within seven days from our Reserve Mentor list and briefed on the hand-over.'],
        ['Can I get the same mentor twice?',
         'No — you meet a different mentor in each rotation. That is the point of three rotations.'],
        ['What if something goes wrong?',
         'Every page carries a private "Raise a concern" link. It reaches the Escalation Owner alone — no other role, including IT support, can see it, and it is referred into SMC’s Grievance &amp; Misconduct process.'],
      ].map(([q,a])=>`<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join('')}
    </div>
  </div></section>

  <section class="ms-section" style="background:var(--ai-wash);border-top:1px solid var(--line)"><div class="wrap" style="text-align:center">
    <h2 style="margin-bottom:6px">Applications are open</h2>
    <p class="lede" style="margin:0 auto 18px">Reviewed by the programme team, with an outcome by ${F().outcomeByLong}. One staged form, no account.</p>
    <div class="cta" style="justify-content:center">
      <a class="btn btn-primary" href="#/apply/mentee" style="text-decoration:none">Apply as a Mentee</a>
      <a class="btn btn-ghost" href="#/apply/mentor" style="text-decoration:none">Apply as a Mentor</a>
    </div>
  </div></section>` + this.msFooter();
},

/* ---------- 1.2 guides ---------- */
guideMentee(){
  return this.msNav() + `<div class="doc-page">
    <h1>Mentee Guide</h1>
    <p class="lede">What's expected of you, and what you can expect from GRMP.</p>
    <div class="doc-card"><h3>Your role</h3><ul>
      <li>You own the relationship: reach out first, propose times, come prepared.</li>
      <li>Meet your mentor at least twice per rotation.</li>
      <li>Write your private reflection after each rotation, then close off on your personal page.</li></ul></div>
    <div class="doc-card"><h3>Preparation expectations</h3><ul>
      <li>Before each meeting: one topic you want to explore, one question you can't answer alone.</li>
      <li>After: capture what shifted in your Reflection Sheet.</li></ul></div>
    <div class="doc-card"><h3>Conduct</h3><ul>
      <li>Respect your mentor's time and confidentiality. Mentorship is guidance, not job placement.</li>
      <li>Concerns can be raised privately via the link in the footer.</li></ul></div>
    <p style="font-size:12px;color:var(--ink-3)">Placeholder structure — the final Mentee Guide comes from Marylyn, GRMP’s content creator.</p>
  </div>` + this.msFooter();
},
guideMentor(){
  return this.msNav() + `<div class="doc-page">
    <h1>Mentor Brief</h1>
    <p class="lede">Thank you for volunteering. Here's the shape of the commitment.</p>
    <div class="doc-card"><h3>Role expectations</h3><ul>
      <li>Up to two mentees per rotation; at least two meetings with each per rotation.</li>
      <li>Share honestly — your career's real turns are the curriculum.</li></ul></div>
    <div class="doc-card"><h3>Boundaries & confidentiality</h3><ul>
      <li>What your mentee shares stays between you, except safety concerns (use the private concern link).</li>
      <li>Mentorship is not recruitment; avoid conflicts of interest.</li></ul></div>
    <div class="doc-card"><h3>Your one checkpoint</h3><ul>
      <li>A single short mid-programme review in ${F().midMonth} — two minutes, on your personal page.</li></ul></div>
    <p style="font-size:12px;color:var(--ink-3)">Placeholder structure — the final Mentor Brief comes from Marylyn, GRMP’s content creator.</p>
  </div>` + this.msFooter();
},

/* ---------- 1.3 reflection sheet ---------- */
reflection(pid){
  const db=__demo.db;
  const asPerson = pid && GRMP.D.person(db, pid);
  const asAdmin = (typeof SESSION!=='undefined') && SESSION && SESSION.identity && SESSION.identity.kind!=='person';
  if(!asPerson && !asAdmin){
    return this.msNav() + `<div class="doc-page"><h1>Reflection Sheet</h1>
      <div class="doc-card"><h3>🔒 For programme participants</h3>
      <p style="font-size:13.5px">The Reflection Sheet and Conversation Guides are shared with accepted participants only —
      open this page from <b>your personal link</b> (the one in your acceptance email). Decided by the Programme Owner.</p>
      <p style="font-size:12.5px;color:var(--ink-3)">Not in the programme yet? <a href="#/apply/mentee">Apply as a mentee</a> or <a href="#/apply/mentor">apply as a mentor</a>.</p></div>
    </div>` + this.msFooter();
  }
  return this.msNav() + `<div class="doc-page">
    <h1>Reflection Sheet</h1>
    <div class="privacy-note">🔒 <span>This reflection is <b>yours</b>. The platform never stores what you write here —
      it records only your end-of-rotation close-off. Keep this document anywhere private (your notes app, a doc, paper).</span></div>
    ${inferred('Q1')}
    <div class="doc-card"><h3>Rotation 1 — Know Yourself</h3><ul>
      <li>What did I learn about my strengths that I didn't know in ${F().applyMonth}?</li>
      <li>Which assumption about my career did this rotation challenge?</li>
      <li>One thing my mentor said that I keep thinking about.</li></ul></div>
    <div class="doc-card"><h3>Rotation 2 — Know Your World</h3><ul>
      <li>How does my target industry actually work, beyond what I imagined?</li>
      <li>Which of my three industry preferences still holds up now that I've seen one from inside?</li></ul></div>
    <div class="doc-card"><h3>Rotation 3 — Know Your Path</h3><ul>
      <li>What path am I now considering that I wasn't before?</li>
      <li>What would I tell ${F().applyMonth}-me?</li></ul></div>
    <p style="font-size:13px;color:var(--ink-2)">When you've reflected, go to your personal page (from your email link) and complete the one-minute close-off.</p>
  </div>` + this.msFooter();
},

/* ---------- 1.4 concern ---------- */
concern(){
  return this.msNav() + `<div class="doc-page" style="max-width:560px">
    <h1>Raise a concern</h1>
    <p class="lede">If something in your mentoring experience isn't right — for example inappropriate behaviour —
      tell us here, privately.</p>
    <div class="privacy-note">🔒 <span>Your report goes <b>only</b> to the designated Escalation Owner (Esther).
      Coordinators, reviewers and IT support cannot see it. The case is handled under SMC's Grievance &amp;
      Misconduct process — this platform records only that a referral was made.</span></div>
    ${inferred('Q6')}
    <div class="form">
      <div class="f-row"><label>What happened? <span class="req">*</span></label>
        <textarea id="cn-text" placeholder="Describe the concern in your own words"></textarea></div>
      <button class="btn btn-primary" data-act="raiseConcern">Submit privately</button>
    </div>
  </div>` + this.msFooter();
},

/* ---------- 1.5/1.6 staged application forms (R5, Joanne's specs) ---------- */
_applyState(kind){
  if(!window.__APPLY || window.__APPLY.kind!==kind) window.__APPLY = {kind, step:1, d:{}, errors:{}, warned:false};
  return window.__APPLY;
},
_stepLabels(kind){
  return kind==='mentee'
    ? ['About you','Your studies','Your growth','Commitment & consent']
    : ['About you','Your experience','Your mentoring contributions','Commitment & consent'];
},
_stepper(kind, step){
  const labels = this._stepLabels(kind);
  return `<div class="stepper" role="group" aria-label="Application progress">
    ${labels.map((l,i)=>{
      const n=i+1, st = n<step?'done':(n===step?'cur':'');
      return `<div class="st-node ${st}" ${n===step?'aria-current="step"':''}>
        <div class="st-dot">${n<step?'✓':n}</div><span class="st-lab">${l}</span></div>`;
    }).join('')}
    <div class="st-txt">Step ${step} of ${labels.length}</div>
  </div>`;
},
_err(state,k){ return state.errors[k] ? `<div class="f-err" role="alert">${esc(state.errors[k])}</div>` : ''; },
_v(state,k){ return esc(state.d[k]||''); },
_sel(state,k,opt){ return state.d[k]===opt?' selected':''; },
_rad(state,k,val){ return state.d[k]===val?' checked':''; },

apply(kind){
  const mentee = kind==='mentee';
  const S = this._applyState(kind);
  const CF = F();
  const intro = (mentee?GRMP.COPY.menteeIntro(CF):GRMP.COPY.mentorIntro(CF)).split('\n');
  const head = `<div class="doc-page" style="max-width:680px">
    <h1>${mentee?'Apply as a Mentee':'Apply as a Mentor'}</h1>
    ${GRMP.D.registrationOpen(db)?'':`<div class="inferred" style="margin-bottom:14px"><span class="tag">NOTE</span>
      <div style="flex:1">Applications for this cycle ran ${CF.regWindow} and have closed on the simulated clock.
      <b>The staging form stays open</b> so the team can test the full pipeline any day.</div></div>`}
    ${S.step===1?`<div class="doc-card" style="background:var(--surface-2)">${copyHTML(intro)}</div>`:''}
    ${this._stepper(kind, S.step)}
    <div class="form" id="apply-form" data-kind="${kind}">`;
  const foot = `</div>
    <p style="font-size:11.5px;color:var(--ink-3);margin:10px 0 0">This application is completed in one sitting — there is no save function
    (confirmed by the programme team; there is no applicant sign-in to attach a partial record to). If you try to leave the page, your browser will warn you first.</p>
  </div>`;
  const nav = `<div style="display:flex;gap:8px;margin-top:16px">
    ${S.step>1?`<button class="btn btn-ghost" data-act="applyBack" data-kind="${kind}">← Back</button>`:''}
    <span style="flex:1"></span>
    ${S.step<4?`<button class="btn btn-primary" data-act="applyNext" data-kind="${kind}">Next →</button>`
              :`<button class="btn btn-primary" id="apply-submit" data-act="applySubmit" data-kind="${kind}">Submit application</button>`}
  </div>`;
  const body = this['_'+kind+'Step'+S.step](S, CF);
  return this.msNav() + head + body + nav + foot + this.msFooter();
},

/* --- mentee steps --- */
_menteeStep1(S, CF){
  const smuWarn = S.d.email && !/smu/i.test(String(S.d.email).split('@')[1]||'');
  return `
  <div class="f-row"><label>School (${CF.inst}) email <span class="req">*</span></label>
    <input type="email" id="af-email" value="${this._v(S,'email')}" placeholder="johndoe@business.smu.example.edu" autocomplete="email">
    <div class="f-micro">${esc(GRMP.COPY.smuEmailMicro)}</div>
    ${smuWarn?`<div class="f-warn">${esc(GRMP.COPY.smuEmailSoftWarn)}</div>`:''}${this._err(S,'email')}</div>
  <div class="f-grid2">
    <div class="f-row"><label>First name <span class="req">*</span></label><input type="text" id="af-firstName" maxlength="50" value="${this._v(S,'firstName')}">${this._err(S,'firstName')}</div>
    <div class="f-row"><label>Last name <span class="req">*</span></label><input type="text" id="af-lastName" maxlength="50" value="${this._v(S,'lastName')}">${this._err(S,'lastName')}</div>
  </div>
  <div class="f-grid2">
    <div class="f-row"><label>Phone number <span class="req">*</span></label><input type="tel" id="af-phone" value="${this._v(S,'phone')}" placeholder="+65">${this._err(S,'phone')}</div>
    <div class="f-row"><label>Nationality <span class="req">*</span></label><input type="text" id="af-nationality" value="${this._v(S,'nationality')}">${this._err(S,'nationality')}</div>
  </div>
  <div class="f-row"><label>LinkedIn profile URL <span class="req">*</span></label>
    <input type="text" id="af-linkedin" value="${this._v(S,'linkedin')}" placeholder="linkedin.com/in/yourname">
    <div class="f-micro">This helps your future mentor get to know you.</div>${this._err(S,'linkedin')}</div>
  <div class="f-row"><label>How did you hear about GRMP? <span class="req">*</span></label>
    <select id="af-heard"><option value=""></option>${GRMP.FORM_OPTS.heardMentee.map(o=>`<option${this._sel(S,'heard',o)}>${esc(o)}</option>`).join('')}</select>${this._err(S,'heard')}</div>
  ${/referred/.test(S.d.heard||'')?`<div class="f-row"><label>Who referred you? <span class="req">*</span></label>
    <input type="text" id="af-referrer" value="${this._v(S,'referrer')}" placeholder="Name of the person who referred you.">${this._err(S,'referrer')}</div>`:''}`;
},
_menteeStep2(S, CF){
  return `
  <p class="f-secnote">This step establishes eligibility and supports matching — it is not scored.</p>
  <div class="f-grid2">
    <div class="f-row"><label>Year of study <span class="req">*</span></label>
      <select id="af-year"><option value=""></option>${GRMP.FORM_OPTS.years.map(o=>`<option${this._sel(S,'year',o)}>${o}</option>`).join('')}</select>
      <div class="f-micro">All undergraduate years are eligible, including final-year students.</div>${this._err(S,'year')}</div>
    <div class="f-row"><label>Faculty (first degree) <span class="req">*</span></label>
      <select id="af-faculty"><option value=""></option>${GRMP.FACULTIES.map(o=>`<option${this._sel(S,'faculty',o)}>${esc(o)}</option>`).join('')}</select>${this._err(S,'faculty')}</div>
  </div>
  <div class="f-grid2">
    <div class="f-row"><label>Faculty (second degree, if any)</label>
      <select id="af-faculty2"><option${!S.d.faculty2||S.d.faculty2==='Not applicable'?' selected':''}>Not applicable</option>${GRMP.FACULTIES.map(o=>`<option${this._sel(S,'faculty2',o)}>${esc(o)}</option>`).join('')}</select></div>
    <div class="f-row"><label>Degree / major <span class="req">*</span></label>
      <input type="text" id="af-degree" value="${this._v(S,'degree')}" placeholder="e.g. BBM, Finance"><div class="f-micro">Your degree and major.</div>${this._err(S,'degree')}</div>
  </div>
  <label class="f-row f-check" style="display:flex"><input type="checkbox" id="af-eligibilityConfirmed" ${S.d.eligibilityConfirmed?'checked':''}>
    <span>${esc(GRMP.COPY.eligibilityTick)} <span class="req">*</span></span></label>${this._err(S,'eligibilityConfirmed')}`;
},
_menteeStep3(S, CF){
  const wc = k => GRMP.D.wordCount(S.d[k]);
  const indSel = (k,label,err)=>`<div class="f-row"><label>${label} <span class="req">*</span></label>
    <select id="af-${k}"><option value=""></option>${GRMP.INDUSTRIES.map(o=>`<option${this._sel(S,k,o)}>${esc(o)}</option>`).join('')}</select>${this._err(S,k)}</div>`;
  return `
  <div class="f-row"><label>${esc(GRMP.COPY.menteePrompt1)} <span class="req">*</span></label>
    <textarea id="af-prompt1" data-wordcap="200" rows="6">${this._v(S,'prompt1')}</textarea>
    <div class="f-micro">We value focused thinking over length. <span class="wc" data-wc-for="af-prompt1">${wc('prompt1')}</span>/200 words (hard cap).</div>${this._err(S,'prompt1')}</div>
  <div class="f-row"><label>${esc(GRMP.COPY.menteePrompt2)} <span class="req">*</span></label>
    <textarea id="af-prompt2" data-wordcap="200" rows="6">${this._v(S,'prompt2')}</textarea>
    <div class="f-micro"><span class="wc" data-wc-for="af-prompt2">${wc('prompt2')}</span>/200 words (hard cap).</div>${this._err(S,'prompt2')}</div>
  ${indSel('ind1','Most preferred industry')}
  ${indSel('ind2','Second preferred industry')}
  ${indSel('ind3','Third preferred industry')}
  <p class="f-secnote">Your three preferences must be three different industries — they map directly to how mentors describe themselves, so we can match on the same keys.</p>`;
},
_menteeStep4(S, CF){
  return `
  <div class="doc-card" style="background:var(--surface-2)">
    <b>The programme asks mentees to:</b>
    <ul style="margin:6px 0 8px">${GRMP.COPY.menteeCommitAsk(CF).map(l=>`<li>${esc(l)}</li>`).join('')}</ul>
    <p style="font-size:12.5px;color:var(--ink-2);margin:0">${esc(GRMP.COPY.rotationsLine(CF))}</p>
  </div>
  <div class="f-row"><label>Can you commit to the above across the full cycle? <span class="req">*</span></label>
    <select id="af-commit"><option value=""></option><option${this._sel(S,'commit','yes')} value="yes">Yes</option><option${this._sel(S,'commit','questions')} value="questions">I have some questions first</option></select>${this._err(S,'commit')}</div>
  <div class="f-row"><label>Consent to join the Mentee programme Telegram group for updates? <span class="req">*</span></label>
    <select id="af-telegramConsent"><option value=""></option><option${this._sel(S,'telegramConsent','Yes')}>Yes</option><option${this._sel(S,'telegramConsent','No')}>No</option></select>${this._err(S,'telegramConsent')}</div>
  ${S.d.telegramConsent==='No'?`<div class="f-row"><label>Preferred contact method <span class="req">*</span></label>
    <select id="af-contactPref"><option value=""></option><option${this._sel(S,'contactPref','Email')}>Email</option><option${this._sel(S,'contactPref','Phone')}>Phone</option></select>${this._err(S,'contactPref')}</div>`:''}
  <div class="doc-card" style="max-height:300px;overflow-y:auto"><h3 style="margin-top:0">${esc(GRMP.COPY.pdpaTitle)}</h3>${copyHTML(GRMP.COPY.pdpaBody)}</div>
  <label class="f-row f-check" style="display:flex"><input type="checkbox" id="af-pdpa" ${S.d.pdpa?'checked':''}>
    <span>${esc(GRMP.COPY.pdpaTick)} <span class="req">*</span></span></label>${this._err(S,'pdpa')}`;
},

/* --- mentor steps --- */
_mentorStep1(S, CF){
  return `
  <div class="f-row"><label>Email <span class="req">*</span></label>
    <input type="email" id="af-email" value="${this._v(S,'email')}" placeholder="name@company.com" autocomplete="email">
    <div class="f-micro">Our main point of contact.</div>${this._err(S,'email')}</div>
  <div class="f-grid2">
    <div class="f-row"><label>First name <span class="req">*</span></label><input type="text" id="af-firstName" maxlength="50" value="${this._v(S,'firstName')}">${this._err(S,'firstName')}</div>
    <div class="f-row"><label>Last name <span class="req">*</span></label><input type="text" id="af-lastName" maxlength="50" value="${this._v(S,'lastName')}">${this._err(S,'lastName')}</div>
  </div>
  <div class="f-grid2">
    <div class="f-row"><label>Phone number <span class="req">*</span></label><input type="tel" id="af-phone" value="${this._v(S,'phone')}" placeholder="+65">${this._err(S,'phone')}</div>
    <div class="f-row"><label>Nationality <span class="req">*</span></label><input type="text" id="af-nationality" value="${this._v(S,'nationality')}">${this._err(S,'nationality')}</div>
  </div>
  <div class="f-row"><label>How did you hear about GRMP? <span class="req">*</span></label>
    <select id="af-heard"><option value=""></option>${GRMP.FORM_OPTS.heardMentor.map(o=>`<option${this._sel(S,'heard',o)}>${esc(o)}</option>`).join('')}</select>${this._err(S,'heard')}</div>
  ${/referred/.test(S.d.heard||'')?`<div class="f-row"><label>Who referred you? <span class="req">*</span></label>
    <input type="text" id="af-referrer" value="${this._v(S,'referrer')}" placeholder="Name of the person who referred you.">${this._err(S,'referrer')}</div>`:''}
  ${S.d.heard===GRMP.FORM_OPTS.heardMentor[0]?`<div class="f-row"><label>Which email did you use when you mentored last cycle?</label>
    <input type="text" id="af-lastCycleEmail" value="${this._v(S,'lastCycleEmail')}" placeholder="If different from the email above.">
    <div class="f-micro">This helps us find your records.</div></div>`:''}`;
},
_mentorStep2(S, CF){
  const returning = S.d.heard===GRMP.FORM_OPTS.heardMentor[0];
  return `
  ${returning?`<p class="f-secnote">Welcome back — as a returning mentor we only need your current professional details.</p>`:''}
  <div class="f-grid2">
    <div class="f-row"><label>Organisation <span class="req">*</span></label><input type="text" id="af-org" value="${this._v(S,'org')}"><div class="f-micro">May have changed since last cycle.</div>${this._err(S,'org')}</div>
    <div class="f-row"><label>Designation <span class="req">*</span></label><input type="text" id="af-designation" value="${this._v(S,'designation')}">${this._err(S,'designation')}</div>
  </div>
  <div class="f-row"><label>Current industry <span class="req">*</span></label>
    <select id="af-industry"><option value=""></option>${GRMP.INDUSTRIES.map(o=>`<option${this._sel(S,'industry',o)}>${esc(o)}</option>`).join('')}</select>${this._err(S,'industry')}</div>
  ${S.d.industry===GRMP.INDUSTRIES[16]?`<div class="f-row"><label>Your industry (free text) <span class="req">*</span></label>
    <input type="text" id="af-industryOther" value="${this._v(S,'industryOther')}">${this._err(S,'industryOther')}</div>`:''}
  <div class="f-row"><label>LinkedIn profile URL <span class="req">*</span></label>
    <input type="text" id="af-linkedin" value="${this._v(S,'linkedin')}" placeholder="linkedin.com/in/yourname">
    <div class="f-micro">Helps us get to know your background.</div>${this._err(S,'linkedin')}</div>
  ${returning?'':`
  <div class="f-grid2">
    <div class="f-row"><label>Years of professional experience <span class="req">*</span></label>
      <select id="af-yearsExp"><option value=""></option>${GRMP.FORM_OPTS.yearsExp.map(o=>`<option${this._sel(S,'yearsExp',o)}>${esc(o)}</option>`).join('')}</select>
      <div class="f-micro">Helps us match you well.</div>${this._err(S,'yearsExp')}</div>
    <div class="f-row"><label>Have you led a team, project, organisation or business? <span class="req">*</span></label>
      <select id="af-ledTeam"><option value=""></option><option${this._sel(S,'ledTeam','Yes')}>Yes</option><option${this._sel(S,'ledTeam','No')}>No</option></select>${this._err(S,'ledTeam')}</div>
  </div>
  <div class="f-row"><label>Briefly, what leadership or entrepreneurial experience would you bring? <span class="req">*</span></label>
    <textarea id="af-leadership" maxlength="300" rows="3" placeholder="e.g. led a 12-person team, founded a startup, ran a regional function.">${this._v(S,'leadership')}</textarea>
    <div class="f-micro">A sentence or two is plenty.</div>${this._err(S,'leadership')}</div>
  <div class="f-row"><label>Have you worked across different industries, markets, cultures or communities? <span class="req">*</span></label>
    <select id="af-crossIndustry"><option value=""></option>${GRMP.FORM_OPTS.crossIndustry.map(o=>`<option${this._sel(S,'crossIndustry',o)}>${esc(o)}</option>`).join('')}</select>${this._err(S,'crossIndustry')}</div>`}`;
},
_mentorStep3(S, CF){
  const returning = S.d.heard===GRMP.FORM_OPTS.heardMentor[0];
  const draws = S.d.draws||[];
  return `
  ${returning?'':`<div class="f-row"><label>Do you have previous mentoring or coaching experience? <span class="req">*</span></label>
    <select id="af-priorMentoring"><option value=""></option><option${this._sel(S,'priorMentoring','Yes')}>Yes</option><option${this._sel(S,'priorMentoring','No')}>No</option></select>
    <div class="f-micro">Not essential, we welcome first-time mentors.</div>${this._err(S,'priorMentoring')}</div>`}
  <div class="f-row"><label>What draws you to mentoring with GRMP? <span class="req">*</span></label>
    <div class="f-micro" style="margin-bottom:6px">Select all that apply.</div>
    ${GRMP.FORM_OPTS.draws.map((o,i)=>`<label class="f-check" style="display:flex;margin:4px 0"><input type="checkbox" class="af-draw" value="${esc(o)}" ${draws.includes(o)?'checked':''}><span>${esc(o)}</span></label>`).join('')}
    ${this._err(S,'draws')}</div>
  <div class="f-row"><label>Anything else you would like to share?</label>
    <textarea id="af-anythingElse" maxlength="300" rows="2" placeholder="Optional, anything you would like us to know.">${this._v(S,'anythingElse')}</textarea></div>
  <div class="f-row"><label>Your interests <span class="req">*</span></label>
    <textarea id="af-interests" maxlength="300" rows="2" placeholder="e.g. topics or industries you would gladly share on.">${this._v(S,'interests')}</textarea>
    <div class="f-micro">Helps us match you with the right mentee.</div>${this._err(S,'interests')}</div>`;
},
_mentorStep4(S, CF){
  return `
  <div class="doc-card" style="background:var(--surface-2)">
    <b>The programme asks mentors to:</b>
    <ul style="margin:6px 0 8px">${GRMP.COPY.mentorCommitAsk(CF).map(l=>`<li>${esc(l)}</li>`).join('')}</ul>
    <p style="font-size:12.5px;color:var(--ink-2);margin:0">${esc(GRMP.COPY.rotationsLine(CF))}</p>
  </div>
  <div class="f-row"><label>Can you commit to the above across the full cycle? <span class="req">*</span></label>
    <select id="af-commit"><option value=""></option><option${this._sel(S,'commit','yes')} value="yes">Yes</option><option${this._sel(S,'commit','questions')} value="questions">I have some questions first</option></select>${this._err(S,'commit')}</div>
  <div class="f-row"><label>Consent to join the Mentor WhatsApp group for programme updates? <span class="req">*</span></label>
    <select id="af-whatsappConsent"><option value=""></option><option${this._sel(S,'whatsappConsent','Yes')}>Yes</option><option${this._sel(S,'whatsappConsent','No')}>No</option></select>${this._err(S,'whatsappConsent')}</div>
  ${S.d.whatsappConsent==='No'?`<div class="f-row"><label>Preferred contact method <span class="req">*</span></label>
    <select id="af-contactPref"><option value=""></option><option${this._sel(S,'contactPref','Telegram')}>Telegram</option><option${this._sel(S,'contactPref','Email')}>Email</option></select>${this._err(S,'contactPref')}</div>`:''}
  <div class="doc-card" style="max-height:300px;overflow-y:auto"><h3 style="margin-top:0">${esc(GRMP.COPY.pdpaTitle)}</h3>${copyHTML(GRMP.COPY.pdpaBody)}</div>
  <label class="f-row f-check" style="display:flex"><input type="checkbox" id="af-pdpa" ${S.d.pdpa?'checked':''}>
    <span>${esc(GRMP.COPY.pdpaTick)} <span class="req">*</span></span></label>${this._err(S,'pdpa')}`;
},

/* ---------- applied confirmation ---------- */
applied(personId){
  const p = GRMP.D.person(__demo.db, personId);
  if(!p) return this.landing();
  const CF = F();
  const txt = (p.kind==='mentee'?GRMP.COPY.menteeConfirmScreen(CF):GRMP.COPY.mentorConfirmScreen(CF)).split('\n');
  return this.msNav() + `<div class="doc-page" style="max-width:560px;text-align:center">
    <div style="font-size:44px;margin:16px 0">✅</div>
    ${copyHTML(txt)}
    <div class="card" style="text-align:left"><h3>What happens behind the scenes</h3>
      <p style="font-size:13px;color:var(--ink-2);margin:0">Your application is now in the master tracker with status
      <b>${esc(p.appStatus)}</b>, and your acknowledgement email is in the outbox — visible to reviewers in the admin console. Open the console from the
      <b>Open as…</b> switcher (bottom-left) to see the other side of this staging build.</p></div>
    <a class="btn btn-ghost" href="#/" style="text-decoration:none">Back to the programme site</a>
  </div>` + this.msFooter();
},

/* ---------- manual pointer ---------- */
manual(){
  return this.msNav() + `<div class="doc-page">
    <h1>User manual</h1>
    <p class="lede">The full manual (also the build spec and test script) ships in the repository:
      <b>USER_MANUAL.md</b>. Chapters: 1 Microsite · 2 Mentee · 3 Mentor · 4 Reviewer · 5 Programme Lead ·
      6 Coordinator · 7 Escalation Owner · 8 Admin.</p>
    <p><a href="USER_MANUAL.md" target="_blank" rel="noopener">Open the manual ↗</a></p>
  </div>` + this.msFooter();
},

/* ---------- changelog (acceptance loop, public) ---------- */
changelog(){
  setTimeout(async ()=>{
    const box = document.getElementById('cl-body');
    if(!box) return;
    if(Views.__clCache && Date.now()-Views.__clCacheAt<60000){
      box.innerHTML = Views.__clCache; return;
    }
    const url = (typeof FEEDBACK_URL!=='undefined') && FEEDBACK_URL;
    if(!url){ box.innerHTML = '<p style="color:var(--ink-3)">The feedback channel is being connected — check back shortly.</p>'; return; }
    try{
      const r = await fetch(url+'?list=1'); const j = await r.json();
      j.items = (j.items||[]).filter(it=>!String(it.page||'').startsWith('DECISION:'));
      if(!j.ok || !j.items.length){ box.innerHTML='<p style="color:var(--ink-3)">No feedback yet — be the first: every screen has a 💬 Feedback button.</p>'; return; }
      let threads={};
      const live = (typeof NET!=='undefined'&&NET&&typeof FIRE!=='undefined'&&FIRE.fs);
      if(live){
        try{
          const snap = await FIRE.fs.collection('feedback_comments').get();
          snap.docs.map(d=>d.data()).sort((a,b)=>String(a.ts).localeCompare(String(b.ts)))
            .forEach(c=>{ (threads[c.fid]=threads[c.fid]||[]).push(c); });
        }catch(e){}
      }
      const chip = s => s==='fixed' ? '<span class="badge b-ok"><span class="d"></span>Fixed</span>'
        : s==='in_progress' ? '<span class="badge b-warn"><span class="d"></span>In progress</span>'
        : s==='wont_fix' ? '<span class="badge b-neut"><span class="d"></span>Not planned</span>'
        : '<span class="badge b-ai">New</span>';
      const html = j.items.map(it=>{
        const th = threads[it.id]||[];
        return `<div class="doc-card" style="padding:14px 18px">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">${chip(it.status)}
          <b style="font-size:13px">${it.author&&it.author!=='anonymous'?it.author:'Someone'}</b>
          <span style="font-size:11.5px;color:var(--ink-3)">${fmtSGT(it.ts)} · on ${it.page} · as ${it.role}</span></div>
        <p style="font-size:13.5px;margin:8px 0 0">${it.text}</p>
        ${it.note?`<p style="font-size:12.5px;margin:8px 0 0;color:var(--ok);background:var(--ok-wash);border-radius:8px;padding:8px 12px"><b>Build team:</b> ${it.note}${it.resolvedAt?' · '+fmtSGT(it.resolvedAt):''}</p>`:''}
        ${th.length?`<div style="margin-top:10px;display:flex;flex-direction:column;gap:6px">${th.map(c=>{
          const build=/build team/i.test(c.by||'');
          return `<div style="font-size:12.5px;border:1px solid var(--line-2);border-radius:9px;padding:8px 12px;background:${build?'var(--surface-2)':'#FFF'};${build?'':'border-left:3px solid var(--red)'}">
            <b>${esc(c.by||'')}</b> <span style="color:var(--ink-3);font-size:11px">· ${fmtSGT(c.ts)}</span>
            <div style="margin-top:3px;white-space:pre-wrap">${esc(c.text||'')}</div></div>`;}).join('')}</div>`:''}
        ${live?`<div style="display:flex;gap:6px;margin-top:10px">
          <input type="text" id="cl-reply-${it.id}" placeholder="Reply in this thread — the build team answers here" style="flex:1;font-size:12.5px;padding:8px 11px;border:1px solid var(--line-2);border-radius:8px">
          <button class="btn sm" data-act="fbReply" data-fid="${it.id}">Reply</button></div>`:''}
      </div>`;}).join('');
      Views.__clCache = html; Views.__clCacheAt = Date.now();
      if(!document.contains(box)){ const b2=document.getElementById('cl-body'); if(b2) b2.innerHTML=html; return; }
      box.innerHTML = html;
    }catch(e){ if(document.contains(box)) box.innerHTML='<p style="color:var(--ink-3)">Could not load right now — refresh in a minute.</p>'; }
  }, 50);
  return this.msNav() + `<div class="doc-page">
    <h1>Changelog — your feedback, our fixes</h1>
    <p class="lede">Every screen has a 💬 Feedback button. What you send lands here with a status — and each item is a conversation: reply in the thread and the build team answers in the same place.</p>
    <div id="cl-body"><p style="color:var(--ink-3)">Loading…</p></div>
  </div>` + this.msFooter();
},

/* ---------- decisions register ---------- */
decisions(){
  setTimeout(async ()=>{
    await loadDecisions();
    const box=document.getElementById('dc-body'); if(!box) return;
    const items = Object.entries(__demo.db.config.openItems).map(([q,it])=>{
      const dec = decisionCache && decisionCache[q];
      const chip = it.settled
        ? `<span class="badge b-ok"><span class="d"></span>Settled · ${it.settled.by} · ${it.settled.on} · ${it.settled.via}</span>`
        : dec ? (dec.kind==='confirm'
        ? `<span class="badge b-ok"><span class="d"></span>Confirmed · ${dec.author} · ${fmtSGT(dec.ts)}</span>`
        : `<span class="badge b-warn"><span class="d"></span>Change requested · ${dec.author}</span>`)
        : '<span class="badge b-ai">Awaiting confirmation</span>';
      return `<div class="doc-card" style="padding:14px 18px">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><b>${q}</b>${chip}
          <span class="spacer" style="flex:1"></span>
          <button class="btn sm btn-ghost" data-act="fbDiscuss" data-q="${q}">💬 Discuss</button></div>
        <p style="font-size:13.5px;margin:6px 0 0">${it.title}</p>
        ${dec&&dec.kind==='change'?`<p style="font-size:12.5px;margin:6px 0 0;color:var(--warn)">Requested: “${dec.text}”</p>`:''}
      </div>`;
    }).join('');
    box.innerHTML = items;
  },50);
  return this.msNav() + `<div class="doc-page">
    <h1>Decisions register</h1>
    <p class="lede">The inferred defaults running in this system. Settled items are on record below and no longer carry a card in the product; the rest can be confirmed right where their yellow card appears.</p>
    <div id="dc-body"><p style="color:var(--ink-3)">Loading…</p></div>
  </div>` + this.msFooter();
},

/* ---------- OTP link login (spec §2: personalized link + emailed one-time code) ---------- */
_otpCard(p){
  const O = window.__OTP && window.__OTP.pid===p.id ? window.__OTP : (window.__OTP={pid:p.id, stage:'email', err:null});
  return `<div class="pp-shell" style="max-width:520px">
    <div class="login-card" style="margin:40px auto">
      <h1 style="font-size:20px">Confirm it's you</h1>
      <div class="sub">This is a personal link for one participant. Sign in with the email you applied with.</div>
      ${O.err?`<div class="f-err" role="alert" style="margin-bottom:8px">${esc(O.err)}</div>`:''}
      ${O.stage==='email'?`
        <div class="f-row"><label>Enter the email address you used in your application</label>
          <input type="email" id="otp-email" autocomplete="email"></div>
        <button class="btn btn-primary" style="width:100%" data-act="otpRequest" data-person="${p.id}">Send me the verification code</button>
        <p style="font-size:11.5px;color:var(--ink-3);margin-top:10px">We will send a one-time verification code to that email. Entering it signs you in — no password, ever.</p>`
      :`
        <div class="f-row"><label>Enter the verification code we emailed you</label>
          <input type="text" id="otp-code" inputmode="numeric" autocomplete="one-time-code"></div>
        <button class="btn btn-primary" style="width:100%" data-act="otpVerify" data-person="${p.id}">Verify and continue</button>
        <p style="font-size:11.5px;color:var(--ink-3);margin-top:10px">Staging note: no real email is sent here — the code appears in the ✉ email popup (and the console's Email log). In production it arrives in the participant's inbox.</p>
        <button class="btn sm btn-ghost" style="margin-top:8px" data-act="otpRestart" data-person="${p.id}">Use a different email</button>`}
    </div></div>`;
},

/* ---------- the acceptance gate (first login; mandatory; binding) ---------- */
_gateCard(p){
  const CF = F();
  const mentee = p.kind==='mentee';
  const rulesDone = p.ack && p.ack.rules, coiDone = p.ack && p.ack.coi, koDone = p.ack && p.ack.kickoff;
  const ts = iso => iso ? new Date(iso).toLocaleString('en-SG',{timeZone:'Asia/Singapore',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false}) : '';
  const doneBadge = iso => `<span class="badge b-ok"><span class="d"></span>Recorded · ${ts(iso)}</span>`;
  return `<div class="card" id="gate">
    <h3>📄 Confirm your place — three acknowledgements</h3>
    <p style="font-size:13px;color:var(--ink-2)">Each item is actioned separately and each is timestamped on action.
    Completing all three <b>confirms your place</b> in the programme and opens your portal page.
    Please complete this by <b>${p.activatedFromReserve?CF.reserveAcceptByLong:CF.acceptByLong}</b>.</p>

    <div class="gate-item ${rulesDone?'g-done':''}">
      <div class="g-head"><b>1 · ${esc(mentee?GRMP.COPY.rulesTitleMentee:GRMP.COPY.rulesTitleMentor)}</b>${rulesDone?doneBadge(p.ack.rules):''}</div>
      ${rulesDone?'':`
      <div class="doc-body g-scroll">${copyHTML(mentee?GRMP.COPY.rulesMentee:GRMP.COPY.rulesMentor)}</div>
      <label class="f-check g-tick"><input type="checkbox" id="g-rules-tick"><span>${esc(GRMP.COPY.rulesTick)}</span></label>
      <div class="f-err" id="g-rules-err" style="display:none">${esc(GRMP.COPY.rulesTickErr)}</div>
      <button class="btn sm btn-primary" data-act="gateRules" data-person="${p.id}">Confirm the Programme Rules</button>`}
    </div>

    <div class="gate-item ${coiDone?'g-done':''}">
      <div class="g-head"><b>2 · ${esc(mentee?GRMP.COPY.coiTitleMentee:GRMP.COPY.coiTitleMentor)}</b>${coiDone?doneBadge(p.ack.coi):''}</div>
      ${coiDone?`${p.coi&&p.coi.declared?`<p style="font-size:12.5px;color:var(--warn);margin:6px 0 0">Conflict declared — the programme team will assess and manage it.</p>`:''}`:`
      <div class="doc-body g-scroll" style="max-height:180px">${copyHTML(mentee?GRMP.COPY.coiMentee:GRMP.COPY.coiMentor)}</div>
      <div style="font-size:13px;margin:8px 0 4px">Please select one:</div>
      <label class="f-check g-tick"><input type="radio" name="g-coi" value="none"><span>${esc(GRMP.COPY.coiNone)}</span></label>
      <label class="f-check g-tick"><input type="radio" name="g-coi" value="some"><span>${esc(GRMP.COPY.coiSome)}</span></label>
      <div id="g-coi-details" style="display:none;margin:6px 0"><label style="font-size:12.5px;display:block;margin-bottom:4px">${esc(mentee?GRMP.COPY.coiDetailsLabelMentee:GRMP.COPY.coiDetailsLabelMentor)}</label>
        <textarea id="g-coi-text" rows="3" style="width:100%"></textarea></div>
      <label class="f-check g-tick"><input type="checkbox" id="g-coi-confirm"><span>${esc(GRMP.COPY.coiTick)}</span></label>
      <div class="f-err" id="g-coi-err" style="display:none"></div>
      <button class="btn sm btn-primary" data-act="gateCoi" data-person="${p.id}">Submit my declaration</button>`}
    </div>

    <div class="gate-item ${koDone?'g-done':''}">
      <div class="g-head"><b>3 · Kick-Off attendance</b>${koDone?doneBadge(p.ack.kickoff):''}</div>
      ${koDone?`${p.kickoff&&p.kickoff.status==='exception_requested'?`<p style="font-size:12.5px;color:var(--warn);margin:6px 0 0">Exception requested — Esther Koh and Wei Kiat Koh will review it and come back to you. An exception request is a request, not an automatic waiver.</p>`:''}`:`
      <div class="doc-body" style="padding:10px 14px">${copyHTML([GRMP.COPY.kickoffFraming(CF, p.kind)])}</div>
      <label class="f-check g-tick"><input type="radio" name="g-ko" value="attend"><span>${esc(GRMP.COPY.kickoffAttend(CF))}</span></label>
      <label class="f-check g-tick"><input type="radio" name="g-ko" value="exception"><span>${esc(GRMP.COPY.kickoffException)}</span></label>
      <div id="g-ko-reason" style="display:none;margin:6px 0"><label style="font-size:12.5px;display:block;margin-bottom:4px">${esc(GRMP.COPY.kickoffReasonLabel)}</label>
        <textarea id="g-ko-text" rows="3" style="width:100%"></textarea></div>
      <div class="f-err" id="g-ko-err" style="display:none"></div>
      <button class="btn sm btn-primary" data-act="gateKickoff" data-person="${p.id}">Confirm</button>`}
    </div>

    ${(typeof NET==='undefined'||!NET)?`<div style="margin-top:10px"><button class="btn sm btn-ghost" data-act="gateDemoAll" data-person="${p.id}">Complete all three (demo shortcut)</button></div>`:''}
    <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
      <a href="#/concern" style="font-size:12.5px">🔒 Raise a concern (private)</a></div>
  </div>`;
},

/* ---------- 2/3 personal pages ---------- */
personal(personId){
  const db = __demo.db, D = GRMP.D;
  const p = D.person(db, personId);
  if(!p) return this.landing();
  const CF = F();
  const mentee = p.kind==='mentee';
  const chip = txt => txt?`<span class="ind-chip">${esc(txt)}</span>`:'';

  /* --- personalized-link auth: session identity or emailed one-time code --- */
  if(typeof meAuthed==='function' && !meAuthed(personId)) return this.msNav() + this._otpCard(p);

  /* --- non-accepted states get an honest page, not a broken journey --- */
  if(p.appStatus==='reserve_invited'){
    return `<div class="pp-shell"><div class="pp-head">
      <div class="avatar ${mentee?'av-mentee':'av-mentor'}">${esc(p.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</div>
      <div><h1>Hi ${esc(p.firstName||p.name.split(' ')[0])}</h1>
        <div class="sub">${mentee?'Reserve Mentee list':'Reserve Mentor list'} · ${esc(db.config.cohort.label)}</div></div></div>
      <div class="card"><h3>You are on the ${mentee?'Reserve Mentee':'Reserve Mentor'} list</h3>
      <p style="font-size:13px;color:var(--ink-2)">${p.reserveOptIn===true
        ? 'You have told us you are happy to be on the list — thank you. Should a place open, we will invite you in with your own acceptance email and everything you need to begin well.'
        : p.reserveOptIn===false
        ? 'You have told us you would prefer not to be included this cycle. Thank you for your interest — we hope to see you in a future cycle.'
        : `We have asked whether you are happy to be placed on the list — a short reply to ${esc(CF.enquiries)} by ${esc(CF.acceptByLong)} is all we need.`}</p>
      <p style="font-size:12px;color:var(--ink-3)">A place on the list is not a guarantee of participation this cycle — we wanted to be candid about that.</p></div></div>`;
  }
  if(['declined','declined_not_selected','declined_ineligible','withdrawn'].includes(p.appStatus)){
    return `<div class="pp-shell"><div class="card" style="margin-top:30px"><h3>About your application</h3>
      <p style="font-size:13px;color:var(--ink-2)">The outcome of your application was sent to ${esc(p.email)}. For anything else, please write to ${esc(CF.enquiries)} — and you are warmly welcome in the wider SMC community at https://www.smcmentorship.org/.</p></div></div>`;
  }

  const confirmed = D.placeConfirmed(p);
  const rotNow = D.currentRotation(db);
  const myPairs = D.pairsFor(db, personId).filter(x=>['approved','closed','rematch_needed','replaced'].includes(x.status));
  const closed = mentee ? D.menteeCloseoffs(db, personId).length : null;
  const hasBR = db.builderReflections.some(b=>b.menteeId===personId);
  const hasMR = db.midreviews.some(m=>m.mentorId===personId);
  const hasEE = (db.endEvaluations||[]).some(e=>e.personId===personId);
  const cert = db.certificates.some(c=>c.personId===personId);
  const eligible = D.certEligible(db, p);

  /* timeline model — "Place confirmed" = the acceptance gate (Rules + COI + Kick-Off) */
  const steps = mentee
    ? [['Applied',true],['Accepted',p.appStatus==='accepted'],['Place confirmed',confirmed],
       ['R1',closed>=1],['R2',closed>=2],['R3',closed>=3],
       ['Builder’s Commitment',hasBR],['Certificate',cert||eligible]]
    : [['Applied',true],['Accepted',p.appStatus==='accepted'],['Place confirmed',confirmed],
       ['Matched',myPairs.length>0],['Mid-prog feedback',hasMR],
       ['End-prog evaluation',hasEE],['Certificate',cert||eligible]];
  let curIdx = steps.findIndex(s=>!s[1]); if(curIdx<0) curIdx = steps.length-1;

  /* --- next-step card --- */
  let nextCard = '';
  if(p.appStatus==='invited'){
    nextCard = `<div class="card"><h3>👋 Welcome back — ${esc(db.config.cohort.label)}</h3>
      <p style="font-size:13px;color:var(--ink-2)">You mentored in a previous cycle and the programme team has invited you to return.
      Confirm below — then complete this cycle's acceptance gate (the documents may have changed).</p>
      <button class="btn btn-primary" data-act="confirmReturn" data-person="${p.id}">Yes — I'm returning as a mentor</button></div>`;
    return `<div class="pp-shell">
      <div class="pp-head">
        <div class="avatar av-mentor">${esc(p.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</div>
        <div><h1>Hi ${esc(p.firstName||p.name.split(' ')[0])}</h1>
          <div class="sub">Returning mentor · ${chip(p.industry)} · ${esc(db.config.cohort.label)}</div></div>
      </div>
      ${nextCard}
    </div>`;
  }
  if(!confirmed){
    nextCard = this._gateCard(p);
  } else if(p.kickoff && p.kickoff.status==='confirmed' && !p.kickoffLogistics){
    nextCard = `<div class="card"><h3>🎪 Kick-Off details — see you there</h3>
      <p style="font-size:13px;color:var(--ink-2)"><b>Kick-Off Night</b>: ${esc(CF.kickoffLong)}, ${esc(CF.kickoffTime)}. Venue: ${esc(CF.kickoffVenue)}.</p>
      <p style="font-size:12.5px;color:var(--ink-3);margin:0 0 8px">${esc(GRMP.COPY.rotationsLine(CF))}</p>
      <div class="f-grid2">
        <div class="f-row"><label>Arrival / departure note</label><input type="text" id="ko-arrival" placeholder="e.g. arriving late, leaving early, optional."></div>
        <div class="f-row"><label>Dietary restrictions</label><input type="text" id="ko-dietary" placeholder="e.g. vegetarian, halal, allergies, optional."></div>
      </div>
      <button class="btn sm btn-primary" data-act="kickoffLogistics" data-person="${p.id}">Save details</button>
      <button class="btn sm btn-ghost" data-act="kickoffLogistics" data-person="${p.id}" data-skip="1">Nothing to add</button>
      <p style="font-size:11px;color:var(--ink-3);margin:8px 0 0">Both fields are optional. Dietary information is used only to cater the event. You can come back to this step any time.</p></div>`;
  } else if(mentee){
    const openPair = myPairs.find(x=>x.status==='approved' && x.rotation===(rotNow?rotNow.n:2));
    const needRematch = myPairs.find(x=>x.status==='rematch_needed');
    if(needRematch){
      nextCard = `<div class="card"><h3>⏳ Your mentor changed jobs — replacement on the way</h3>
        <p style="font-size:13px;color:var(--ink-2)">Your Rotation ${needRematch.rotation} mentor had to step away.
        The coordinator is arranging a replacement from the Reserve Mentor list within 7 days; you'll get a hand-over email.</p></div>`;
    } else if(openPair){
      const rotEnded = rotNow && db.today >= rotNow.end;
      nextCard = `<div class="card"><h3>✅ Close off Rotation ${openPair.rotation} (one minute)</h3>
        <p style="font-size:13px;color:var(--ink-2)">At the end of the rotation, confirm two things. The platform tracks nothing else about your meetings — it's on the two of you.</p>
        <label class="f-check" style="margin:8px 0"><input type="checkbox" id="co-met"><span>We met at least <b>twice</b> this rotation</span></label>
        <label class="f-check" style="margin:8px 0"><input type="checkbox" id="co-ref"><span>I completed my private reflection</span></label>
        <div style="font-size:11.5px;color:var(--ink-3);margin:-4px 0 8px 26px"><a href="#/reflection/${p.id}">Open the Reflection Sheet ↗</a></div>
        ${openPair.rotation===2?`<label class="f-label" style="margin-top:6px">Your mid-programme review <span style="color:var(--red)">*</span>
          <span style="font-weight:400;color:var(--ink-3)"> — part of the R2 close-off; the programme team reads these</span></label>
        <div class="f-row"><textarea id="co-extra" placeholder="How is the programme going for you at the halfway mark?"></textarea></div>`:''}
        ${openPair.rotation===3?`<label class="f-label" style="margin-top:6px">Your end-of-programme evaluation <span style="color:var(--red)">*</span>
          <span style="font-weight:400;color:var(--ink-3)"> — part of the R3 close-off; counts toward your certificate</span></label>
        <div class="f-row"><textarea id="co-extra" placeholder="What did GRMP change for you? What should the next cohort know?"></textarea></div>`:''}
        <div class="f-row"><input type="text" id="co-comment" placeholder="Optional comment"></div>
        <button class="btn btn-primary" data-act="closeoff" data-pair="${openPair.id}" data-rot="${openPair.rotation}">Submit close-off</button>
        ${rotEnded?'':`<p style="font-size:11.5px;color:var(--ink-3);margin:8px 0 0">Rotation ${openPair.rotation} runs until ${rotNow.end} — in the demo you can close off early.</p>`}</div>`;
    } else if(closed>=3 && !hasBR){
      nextCard = `<div class="card"><h3>🏗 Your Builder’s Commitment</h3>
        <p style="font-size:13px;color:var(--ink-2)">You've completed all three rotations. Close the programme with a free-text
        reflection: how will you contribute back to the ecosystem that mentored you?</p>
        <div class="f-row"><textarea id="br-text" placeholder="Write freely — no categories to pick"></textarea></div>
        <button class="btn btn-primary" data-act="builder" data-person="${p.id}">Submit Builder’s Commitment</button></div>`;
    } else if(eligible && !cert){
      nextCard = `<div class="card"><h3>🎉 You qualify for your certificate</h3>
        <p style="font-size:13px;color:var(--ink-2)">Three close-offs, mid-programme review, end-of-programme evaluation and your Builder’s Commitment — all in.
        Certificates are printed and presented at the Appreciation Night; you'll get an email when yours is ready.</p></div>`;
    } else if(!myPairs.length){
      nextCard = `<div class="card"><h3>🤝 Matching in progress</h3>
        <p style="font-size:13px;color:var(--ink-2)">Your place is confirmed. The programme team is preparing
        Rotation ${rotNow?rotNow.n:2} matches against your industry preferences — you'll get one email with your mentor, the dates and the guide.</p></div>`;
    }
  } else {                                     /* mentor next-steps */
    const servedEarly = GRMP.D.pairsFor(db,personId).some(x=>x.rotation<=2 && x.status!=='rejected');
    if(!hasMR && servedEarly){
      nextCard = `<div class="card"><h3>📝 Mid-programme review (checkpoint 1 of 2)</h3>
        <p style="font-size:13px;color:var(--ink-2)">Two minutes in ${F().midMonth}: how is the pairing going, anything the team should know?
        (The demo lets you submit early.)</p>
        <div class="f-row"><textarea id="mr-text" placeholder="How is it going with your mentee(s)?"></textarea></div>
        <button class="btn btn-primary" data-act="midreview" data-person="${p.id}">Submit review</button></div>`;
    } else if(hasMR && !hasEE){
      nextCard = `<div class="card"><h3>🏁 End-of-programme evaluation</h3>
        <p style="font-size:13px;color:var(--ink-2)">Your closing checkpoint, due by ${F().closingMonth} — how the mentoring went end-to-end,
        and whether you'd serve again. Together with your mid-programme review it completes your certificate criteria.
        (The demo lets you submit early.)</p>
        <div class="f-row"><textarea id="ee-text" placeholder="How did the programme go, start to finish?"></textarea></div>
        <button class="btn btn-primary" data-act="endeval" data-person="${p.id}">Submit evaluation</button></div>`;
    }
  }

  /* optional briefing recording — a resource, not a gate (Q11) */
  const vidUrl = GRMP.D.orientationVideoFor(db, p);
  const vidCard = (confirmed && vidUrl) ? `<div class="card"><h3>🎓 Programme briefing recording</h3>
    <p style="font-size:13px;color:var(--ink-2)">Optional viewing before the Kick-Off — the recorded briefing for ${mentee?'mentees':'mentors'}.
    <a href="${esc(vidUrl)}" target="_blank" rel="noopener">Open the recording ↗</a></p></div>` : '';

  /* --- pairs display --- */
  const pairCards = myPairs.filter(x=>x.status!=='replaced').map(x=>{
    const other = D.person(db, mentee? x.mentorId : x.menteeId);
    const rot = db.config.rotations.find(r=>r.n===x.rotation);
    return `<div class="card"><h3>Rotation ${x.rotation} — ${rot.label}
        ${x.status==='closed'?'<span class="badge b-ok"><span class="d"></span>Closed off</span>'
          : x.status==='rematch_needed'?'<span class="badge b-warn"><span class="d"></span>Replacement pending</span>'
          : `<span class="badge b-neut"><span class="d"></span>Running · ${GRMP.D.monthShort(rot.start)}–${GRMP.D.monthShort(rot.end)}</span>`}</h3>
      <div class="mentor-card">
        <div class="avatar ${mentee?'av-mentor':'av-mentee'}" style="width:44px;height:44px;font-size:14px">${esc(other.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</div>
        <div style="flex:1">
          <b>${esc(other.name)}</b> ${chip(mentee?other.industry:(other.industryPrefs||[])[0])}
          <div style="font-size:12.5px;color:var(--ink-2)">${mentee?esc((other.designation||'')+' · '+(other.org||'')):esc((other.university||'')+' · '+(other.degree||'')+', '+(other.year||''))}</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:3px">${mentee?esc('Background: '+(other.background||'')):esc('Growth focus: '+String(other.prompt1||'').slice(0,110)+'…')}</div>
        </div></div>
      ${x.status==='closed'&&x.closeoff&&x.closeoff.comment&&mentee?`<div style="margin-top:10px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:9px;padding:9px 12px;font-size:12.5px"><b style="color:var(--ink-3);font-size:10.5px;text-transform:uppercase;letter-spacing:.04em">Your close-off note</b><br>“${esc(x.closeoff.comment)}”</div>`:''}
      <p style="font-size:12px;color:var(--ink-3);margin:10px 0 0">Guide: <a href="#/reflection/${personId}">${rot.label} — reflection prompts</a> · suggested first step: a 30-minute intro call.</p>
    </div>`;
  }).join('');

  const myBR = db.builderReflections.find(b=>b.menteeId===personId);
  const myMR = db.midreviews.find(m=>m.mentorId===personId);
  const brCard = (mentee&&myBR)?`<div class="card"><h3>🏗 Your Builder’s Commitment <span class="badge b-ok"><span class="d"></span>submitted ${myBR.at}</span></h3>
      <p style="font-size:13.5px;margin:0">“${esc(myBR.text)}”</p></div>`:'';
  const mrCard = (!mentee&&myMR)?`<div class="card"><h3>📝 Your mid-programme review <span class="badge b-ok"><span class="d"></span>submitted ${myMR.at}</span></h3>
      <p style="font-size:13.5px;margin:0">“${esc(myMR.text)}”</p></div>`:'';
  const myMMR = mentee ? (db.menteeMidReviews||[]).find(m=>m.menteeId===personId) : null;
  const mmrCard = myMMR?`<div class="card"><h3>📝 Your mid-programme review <span class="badge b-ok"><span class="d"></span>with your R2 close-off · ${myMMR.at}</span></h3>
      <p style="font-size:13.5px;margin:0">“${esc(myMMR.text)}”</p></div>`:'';
  const myEE = (db.endEvaluations||[]).find(e=>e.personId===personId);
  const eeCard = myEE?`<div class="card"><h3>🏁 Your end-of-programme evaluation <span class="badge b-ok"><span class="d"></span>submitted ${myEE.at}</span></h3>
      <p style="font-size:13.5px;margin:0">“${esc(myEE.text)}”</p></div>`:'';
  const certCard = cert ? `<div class="cert"><div style="font-size:11px;letter-spacing:.18em;font-weight:800;color:var(--gold)">SINGAPORE MENTORSHIP COMMITTEE</div>
      <h2>Certificate of Completion</h2><div class="nm">${esc(p.name)}</div>
      <div class="meta">${F().label} · all three rotations completed · issued ${esc(db.certificates.find(c=>c.personId===p.id).at)}</div></div>` : '';

  return `<div class="pp-shell">
    <div class="pp-head">
      <div class="avatar ${mentee?'av-mentee':'av-mentor'}">${esc(p.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</div>
      <div><h1>Hi ${esc(p.firstName||p.name.split(' ')[0])}</h1>
        <div class="sub">${mentee?'Mentee':'Mentor'} · ${chip(mentee?(p.industryPrefs||[])[0]:p.industry)} · ${esc(db.config.cohort.label)}
        ${p.previewFastForward?` · <b style="color:var(--ai-ink)">demo fast-forwarded to ${F().closingMonth}</b>`:''}</div></div>
    </div>
    <div style="font-size:11.5px;color:var(--ink-3);margin:-8px 0 14px">🔗 You opened this from your personal link — email + one-time code, no password. That's by design.</div>
    <div class="steps">${steps.map((s,i)=>`<div class="step ${s[1]?'done':(i===curIdx?'cur':'')}"><div class="dot">${s[1]?'✓':i+1}</div><span>${s[0]}</span></div>`).join('')}</div>
    ${nextCard}${vidCard}${certCard}${brCard}${mrCard}${mmrCard}${eeCard}${pairCards}
    ${inferred('Q2')}
  </div>`;
},
};
