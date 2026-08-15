/* GRMP Demo — public views: microsite (manual ch.1) + personal pages (ch.2–3). */

/* Cohort facts, read lazily at render time — every cohort-specific number, date or
   institution name in these templates must come from here (guard-tested in L1). */
const F = () => GRMP.D.cohortFacts((typeof __demo!=='undefined'&&__demo.db)||db);

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
  const t = GRMP.TRACKS;
  return this.msNav() + `
  <header class="ms-hero"><div class="wrap">
    <div class="eyebrow">Singapore Mentorship Committee · Global Ready for SG100</div>
    <h1>Six months. Three mentors. A global-ready you.</h1>
    <p>The Global Ready Mentorship Programme pairs ${F().inst?F().inst+' ':''}students and young professionals with senior leaders across three rotations — ${F().spanLong}. One hour with the right mentor
       can reframe a career.</p>
    <div class="cta">
      <a class="btn btn-light" href="#/apply/mentee" style="text-decoration:none">Apply as Mentee</a>
      <a class="btn btn-line" href="#/apply/mentor" style="text-decoration:none">Register as Mentor</a>
    </div>
  </div></header>
  <div class="ms-strip">${F().short}${F().inst?` is piloted with ${F().inst}`:``} · ${F().mentors} mentors · ${F().mentees} mentees · applications reviewed by the programme team</div>

  <section class="ms-section"><div class="wrap">
    <h2>Three tracks, one journey</h2>
    <p class="lede">Choose the track that matches where you want to grow. You'll be matched with a different mentor from your track in each rotation.</p>
    <div class="cards3">
      <div class="tcard"><div class="glyph" style="background:#1A56A0">G</div><h3>General</h3>
        <p>Mentors from Finance, Tech, Communications, HR, Education and more — for building a strong career foundation.</p></div>
      <div class="tcard"><div class="glyph" style="background:#B85C1E">E</div><h3>Entrepreneurship</h3>
        <p>Builders and founders — for those testing whether the founder's path is theirs.</p></div>
      <div class="tcard"><div class="glyph" style="background:#6D5CF0">AI</div><h3>AI</h3>
        <p>Practitioners applying AI in real workplaces — for careers that ride the wave instead of watching it.</p></div>
    </div>
  </div></section>

  <section class="ms-section" style="padding-top:0"><div class="wrap">
    <h2>Is this for you?</h2>
    <div class="cards3" style="margin-top:14px">
      <div class="tcard"><h3 style="margin-top:0">Who can apply</h3>
        <p>${F().inst?F().inst+' ':''}students and young professionals ready to be mentored — and to do the reflecting that makes mentorship work.</p></div>
      <div class="tcard"><h3 style="margin-top:0">What it asks of you</h3>
        <p>Meet your mentor <b>at least twice</b> in each two-month rotation, at times you both choose.
        Write a private reflection after each rotation. One minute to close each rotation off. That is all.</p></div>
      <div class="tcard"><h3 style="margin-top:0">What you leave with</h3>
        <p>Three mentors across three themes, a habit of reflecting on your own direction, and a
        completion certificate from the Singapore Mentorship Committee.</p></div>
    </div>
  </div></section>

  <section class="ms-section" style="padding-top:0"><div class="wrap">
    <h2>How the six months run</h2>
    <p class="lede">Every step below is handled on this platform — no forms lost in inboxes, no chasing.</p>
    <div class="timeline">
      <div class="tl-node"><div class="dot">1</div><h4>Apply · ${F().regWindow||F().applyShort}</h4><p>One form, reviewed by the programme team</p></div>
      <div class="tl-node"><div class="dot">2</div><h4>Acknowledge</h4><p>Programme Rules, PDPA & conduct — digital, timestamped</p></div>
      <div class="tl-node"><div class="dot">3</div><h4>Orientation & Kickoff · ${F().kickoffShort}</h4><p>Required before Rotation 1</p></div>
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
    <a class="btn btn-primary" href="#/apply/mentor" style="text-decoration:none">Register as Mentor</a>
  </div></section>

  <section class="ms-section"><div class="wrap">
    <h2>Questions people ask before applying</h2>
    <div class="faq">
      ${[
        ['Do I need an account or a password?',
         'No — never. Every email we send carries your own link straight to your page. Only the ten-person programme team signs in.'],
        ['How much time does it really take?',
         'Two conversations per rotation, arranged directly between you and your mentor, plus a one-minute close-off at the end of each. Six conversations over six months.'],
        ['Do I have to hand in my reflections?',
         'No. Your reflection is yours. The platform records only that you completed the rotation — never what you wrote.'],
        ['What if my mentor drops out?',
         'You are re-matched from the reserve bench within seven days, in the same track, and briefed on the hand-over.'],
        ['Can I get the same mentor twice?',
         'No — you meet a different mentor in each rotation. That is the point of three rotations.'],
        ['What if something goes wrong?',
         'Every page carries a private "Raise a concern" link. It reaches the Escalation Owner alone — no other role, including IT support, can see it, and it is referred into SMC’s Grievance &amp; Misconduct process.'],
      ].map(([q,a])=>`<details class="faq-item"><summary>${q}</summary><p>${a}</p></details>`).join('')}
    </div>
  </div></section>

  <section class="ms-section" style="background:var(--ai-wash);border-top:1px solid var(--line)"><div class="wrap" style="text-align:center">
    <h2 style="margin-bottom:6px">Applications are open</h2>
    <p class="lede" style="margin:0 auto 18px">Reviewed by the programme team, with an outcome by email. One form, no account.</p>
    <div class="cta" style="justify-content:center">
      <a class="btn btn-primary" href="#/apply/mentee" style="text-decoration:none">Apply as Mentee</a>
      <a class="btn btn-ghost" href="#/apply/mentor" style="text-decoration:none">Register as Mentor</a>
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
      <p style="font-size:12.5px;color:var(--ink-3)">Not in the programme yet? <a href="#/apply/mentee">Apply as a mentee</a> or <a href="#/apply/mentor">register as a mentor</a>.</p></div>
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
      <li>Where does my track (General / Entrepreneurship / AI) fit into that world?</li></ul></div>
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

/* ---------- 1.5/1.6 apply forms ---------- */
apply(kind){
  const mentee = kind==='mentee';
  return this.msNav() + `<div class="doc-page" style="max-width:640px">
    <h1>${mentee?'Apply as a Mentee':'Register as a Mentor'}</h1>
    <p class="lede">${mentee?`${F().short} · ${F().spanMonths} · reviewed by the programme team.`:'Welcome — this is the registration linked from your invitation.'}</p>
  ${GRMP.D.registrationOpen(db)?'':`<div class="inferred" style="margin-bottom:14px"><span class="tag">NOTE</span>
    <div style="flex:1">Registration for this cycle ran ${F().regWindow} and has closed on the simulated clock.
    <b>The staging form stays open</b> so the team can test the full pipeline any day.</div></div>`}
    ${inferred('Q4')}
    <div class="form" id="apply-form">
      <div class="f-grid2">
        <div class="f-row"><label>Full name <span class="req">*</span></label><input type="text" id="f-name" placeholder="Your name"></div>
        <div class="f-row"><label>Email <span class="req">*</span></label><input type="email" id="f-email" placeholder="you@example.com"></div>
      </div>
      <div class="f-grid2">
        <div class="f-row"><label>Mobile</label><input type="text" id="f-mobile" placeholder="+65"></div>
        ${mentee
          ? `<div class="f-row"><label>Course${F().inst?' at '+F().inst:''} <span class="req">*</span></label><input type="text" id="f-course" placeholder="e.g. Business Management"></div>`
          : `<div class="f-row"><label>Organisation <span class="req">*</span></label><input type="text" id="f-org" placeholder="Company / venture"></div>`}
      </div>
      ${mentee ? `
      <div class="f-grid2">
        <div class="f-row"><label>Year of study</label><select id="f-year"><option>1</option><option>2</option><option selected>3</option><option>4</option><option>Postgraduate</option></select></div>
        <div class="f-row"><label>Industry interest</label><input type="text" id="f-ind" placeholder="e.g. Finance"></div>
      </div>
      <div class="f-row"><label>Your goals for GRMP <span class="req">*</span></label><textarea id="f-goals" placeholder="What do you want out of these six months?"></textarea></div>
      <div class="f-row"><label>Development needs</label><input type="text" id="f-dev" placeholder="e.g. confidence; networking"></div>
      <div class="f-row"><label>What do you expect from a mentor?</label><input type="text" id="f-exp"></div>
      <div class="f-row"><label>Readiness to reflect</label><input type="text" id="f-read" placeholder="How do you usually reflect on experiences?"></div>`
      : `
      <div class="f-grid2">
        <div class="f-row"><label>Role / title <span class="req">*</span></label><input type="text" id="f-role" placeholder="e.g. Director"></div>
        <div class="f-row"><label>Industry</label><input type="text" id="f-ind" placeholder="e.g. Technology"></div>
      </div>
      <div class="f-row"><label>Professional background</label><textarea id="f-bg" placeholder="A few lines on your experience"></textarea></div>
      <div class="f-grid2">
        <div class="f-row"><label>Leadership experience</label><input type="text" id="f-lead"></div>
        <div class="f-row"><label>Global / cross-cultural exposure</label><input type="text" id="f-x"></div>
      </div>
      <div class="f-grid2">
        <div class="f-row"><label>Languages</label><input type="text" id="f-lang" placeholder="English, ..."></div>
        <div class="f-row"><label>Why mentor with GRMP?</label><input type="text" id="f-mot"></div>
      </div>
      <div class="inferred" style="margin:6px 0 14px"><span class="tag">RULE</span><div>Every mentor is allocated <b>up to two mentees</b> — fixed by the programme, so we don't ask. We also don't collect weekly availability: meeting times are yours and your mentee's to arrange.</div></div>`}
      <div class="f-row"><label>Choose your track <span class="req">*</span></label>
        <div class="track-pick">
          <div class="track-opt" data-track="general" data-act="pickTrack"><h4>General</h4><p>Finance · Tech · Comms · HR · Education</p></div>
          <div class="track-opt" data-track="entrepreneurship" data-act="pickTrack"><h4>Entrepreneurship</h4><p>Founders & builders</p></div>
          <div class="track-opt" data-track="ai" data-act="pickTrack"><h4>AI</h4><p>AI applied in the workplace</p></div>
        </div>${inferred('Q3')}</div>
      <label class="f-row f-check" style="display:flex"><input type="checkbox" id="f-consent">
        <span>I consent to SMC collecting and using this information to run GRMP, per the PDPA consent statement. <span class="req">*</span></span></label>
      <button class="btn btn-primary" data-act="submitApply" data-kind="${kind}">Submit ${mentee?'application':'registration'}</button>
      <p style="font-size:12px;color:var(--ink-3);margin:10px 0 0">Submitting with missing required fields saves your application as
        a <b>draft</b> you can return to and finish — no reminder emails. Only complete, submitted applications enter selection.</p>
    </div>
  </div>` + this.msFooter();
},

/* ---------- applied confirmation ---------- */
applied(personId){
  const p = GRMP.D.person(__demo.db, personId);
  if(!p) return this.landing();
  const ok = p.appStatus==='submitted';
  return this.msNav() + `<div class="doc-page" style="max-width:560px;text-align:center">
    <div style="font-size:44px;margin:16px 0">${ok?'✅':'🟡'}</div>
    <h1 style="font-size:24px">${ok?'Application received':'Saved as a draft'}</h1>
    <p class="lede">${ok
      ? `Thank you, ${esc(p.name)}. A confirmation email is on its way. The programme team reviews applications and you'll hear the outcome by email — every next step will arrive as a personal link, no account needed.`
      : `We saved what you entered, ${esc(p.name)}, and emailed you a reminder listing what's missing. Your application enters review once it's complete.`}</p>
    <div class="card" style="text-align:left"><h3>What happens behind the scenes</h3>
      <p style="font-size:13px;color:var(--ink-2);margin:0">Your application is now in the master tracker with status
      <b>${esc(p.appStatus)}</b> — visible to reviewers in the admin console. Open the console from the
      <b>Open as…</b> switcher (bottom-left) to see the other side of this demo.</p></div>
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
    /* Re-renders arrive constantly (every remote onSnapshot). Serve the cached list
       instantly so the page never flashes back to Loading, and never write into a
       box that a newer render has already replaced. */
    if(Views.__clCache && Date.now()-Views.__clCacheAt<60000){
      box.innerHTML = Views.__clCache; return;
    }
    const url = (typeof FEEDBACK_URL!=='undefined') && FEEDBACK_URL;
    if(!url){ box.innerHTML = '<p style="color:var(--ink-3)">The feedback channel is being connected — check back shortly.</p>'; return; }
    try{
      const r = await fetch(url+'?list=1'); const j = await r.json();
      j.items = (j.items||[]).filter(it=>!String(it.page||'').startsWith('DECISION:'));
      if(!j.ok || !j.items.length){ box.innerHTML='<p style="color:var(--ink-3)">No feedback yet — be the first: every screen has a 💬 Feedback button.</p>'; return; }
      /* conversation threads live in Firestore (outside /state, so demo resets keep them) */
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

/* ---------- decisions register (replaces the Round 2 sheet) ---------- */
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
    <p class="lede">The inferred defaults running in this system. Settled items are on record below and no longer carry a card in the product; the rest can be confirmed right where their yellow card appears — Q1 and Q2 are Esther's calls. This register replaces the Round-2 sheet.</p>
    <div id="dc-body"><p style="color:var(--ink-3)">Loading…</p></div>
  </div>` + this.msFooter();
},

/* ---------- 2/3 personal pages ---------- */
personal(personId){
  const db = __demo.db, D = GRMP.D;
  const p = D.person(db, personId);
  if(!p) return this.landing();
  const mentee = p.kind==='mentee';
  const ackDone = D.ackComplete(p);
  const rotNow = D.currentRotation(db);
  const myPairs = D.pairsFor(db, personId).filter(x=>['approved','closed','rematch_needed','replaced'].includes(x.status));
  const closed = mentee ? D.menteeCloseoffs(db, personId).length : null;
  const hasBR = db.builderReflections.some(b=>b.menteeId===personId);
  const hasMR = db.midreviews.some(m=>m.mentorId===personId);
  const hasEE = (db.endEvaluations||[]).some(e=>e.personId===personId);
  const hasMMR = (db.menteeMidReviews||[]).some(m=>m.menteeId===personId);
  const cert = db.certificates.some(c=>c.personId===personId);
  const eligible = D.certEligible(db, p);

  /* timeline model */
  const steps = mentee
    ? [['Applied',true],['Accepted',['accepted','reserve_bench'].includes(p.appStatus)],['Acknowledged',ackDone],
       ['Orientation',!!p.orientation],['R1',closed>=1],['R2',closed>=2],['R3',closed>=3],
       ['Builder’s Commitment',hasBR],['Certificate',cert||eligible]]
    : [['Registered',true],['Accepted',['accepted','reserve_bench'].includes(p.appStatus)],['Acknowledged',ackDone],
       ['Orientation',!!p.orientation],['Matched',myPairs.length>0],['Mid-prog feedback',hasMR],
       ['End-prog evaluation',hasEE],['Certificate',cert||eligible]];
  let curIdx = steps.findIndex(s=>!s[1]); if(curIdx<0) curIdx = steps.length-1;

  /* --- next-step card --- */
  let nextCard = '';
  if(p.appStatus==='invited'){
    nextCard = `<div class="card"><h3>👋 Welcome back — ${esc(db.config.cohort.label)}</h3>
      <p style="font-size:13px;color:var(--ink-2)">You mentored in a previous cycle and the programme team has invited you to return.
      Confirm below — then re-acknowledge the programme documents (they may have changed) and complete this cycle's orientation.</p>
      <button class="btn btn-primary" data-act="confirmReturn" data-person="${p.id}">Yes — I'm returning as a mentor</button></div>`;
    return `<div class="pp-shell">
      <div class="pp-head">
        <div class="avatar av-mentor">${esc(p.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</div>
        <div><h1>Hi ${esc(p.name.split(' ')[0])}</h1>
          <div class="sub">Returning mentor · ${esc(GRMP.TRACKS[p.track].label)} track · ${esc(db.config.cohort.label)}</div></div>
      </div>
      ${nextCard}
    </div>`;
  }
  const DOCS = [['rules','GRMP Programme Rules','v2.1'],['pdpa','PDPA Consent','v1.0'],['coi','Conflict-of-Interest Declaration','v1.0']];   // Rules v2.1 incorporates the SMC Charter and the Grievance & Misconduct Procedure by reference (Owner F0806-235605)
  if(!ackDone){
    nextCard = `<div class="card"><h3>📄 Acknowledge the programme documents</h3>
      <p style="font-size:13px;color:var(--ink-2)">Three documents, each recorded with a timestamp and version. The Programme Rules incorporate the SMC Charter and the Grievance &amp; Misconduct Procedure by reference.
      <b>You can't be matched until all three are done.</b></p>
      <div class="acklist">${DOCS.map(([k,nm,ver])=>{
        const done = p.ack && p.ack[k];
        return `<div class="ackrow"><span class="nm">${nm}</span><span class="ver">${ver}</span>
          ${done?`<span class="badge b-ok"><span class="d"></span>Acknowledged ${done}</span>`
                :`<button class="btn sm btn-primary" data-act="openDoc" data-person="${p.id}" data-doc="${k}" data-title="${nm}" data-ver="${ver}">Read &amp; acknowledge</button>`}</div>`;
      }).join('')}</div>
      ${inferred('Q5')}
      <div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <button class="btn sm btn-ghost" data-act="ackAll" data-person="${p.id}">Acknowledge all (demo shortcut)</button>
        <a href="#/concern" style="font-size:12.5px">🔒 Raise a concern (private)</a></div>
      <p style="font-size:11.5px;color:var(--ink-3);margin:8px 0 0">Concerns go only to the Escalation Owner — no other role, including IT support, can see them.</p></div>`;
  } else if(!p.orientation){
    nextCard = `<div class="card"><h3>🎓 Complete your orientation</h3>
      <p style="font-size:13px;color:var(--ink-2)">Attend the live session, or watch the recorded module —
      <b>required before Rotation 1, no exceptions.</b></p>
      <div style="background:#14171d;border-radius:12px;aspect-ratio:16/7;display:grid;place-items:center;margin:4px 0 10px;cursor:pointer" data-act="orient" data-person="${p.id}" data-mode="recorded" role="button" tabindex="0" aria-label="Play orientation recording">
        <div style="text-align:center;color:#fff"><div style="width:54px;height:54px;border-radius:50%;background:var(--red);display:grid;place-items:center;margin:0 auto 8px;font-size:20px">▶</div>
        <div style="font-size:13px;font-weight:700">${F().short} Orientation — session recording</div>
        <div style="font-size:11px;opacity:.7">${GRMP.D.orientationVideoFor(db,p)?'opens the recording in a new tab · opening it records your completion':'recording link not set yet — the programme team adds it in Configuration · clicking still records completion in this demo'}</div></div>
      </div>
      <div style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="btn btn-primary" data-act="orient" data-person="${p.id}" data-mode="recorded">▶ Watch recorded module (marks complete)</button>
        <span class="badge b-neut" style="align-self:center">live attendance is marked by the coordinator (Events)</span>
      </div></div>`;
  } else if(mentee){
    const openPair = myPairs.find(x=>x.status==='approved' && x.rotation===(rotNow?rotNow.n:2));
    const needRematch = myPairs.find(x=>x.status==='rematch_needed');
    if(needRematch){
      nextCard = `<div class="card"><h3>⏳ Your mentor changed jobs — replacement on the way</h3>
        <p style="font-size:13px;color:var(--ink-2)">Your Rotation ${needRematch.rotation} mentor had to step away.
        The coordinator is arranging a reserve-bench mentor within 7 days; you'll get a hand-over email.</p></div>`;
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
        <p style="font-size:13px;color:var(--ink-2)">You're cleared (acknowledged + orientated). The programme team is preparing
        Rotation ${rotNow?rotNow.n:2} matches — you'll get one email with your mentor, the dates and the guide.</p></div>`;
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
          <b>${esc(other.name)}</b> <span class="track-chip track-${other.track}">${esc(GRMP.TRACKS[other.track].label)}</span>
          <div style="font-size:12.5px;color:var(--ink-2)">${mentee?esc(other.role+' · '+other.org):esc(other.university+' · '+other.course+', year '+other.year)}</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:3px">${mentee?esc('Background: '+other.background):esc('Goal: '+other.goals)}</div>
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
      <div><h1>Hi ${esc(p.name.split(' ')[0])}</h1>
        <div class="sub">${mentee?'Mentee':'Mentor'} · ${esc(GRMP.TRACKS[p.track].label)} track · ${esc(db.config.cohort.label)}
        ${p.previewFastForward?` · <b style="color:var(--ai-ink)">demo fast-forwarded to ${F().closingMonth}</b>`:''}</div></div>
    </div>
    <div style="font-size:11.5px;color:var(--ink-3);margin:-8px 0 14px">🔗 You opened this from your personal link — no account, no password. That's by design.</div>
    <div class="steps">${steps.map((s,i)=>`<div class="step ${s[1]?'done':(i===curIdx?'cur':'')}"><div class="dot">${s[1]?'✓':i+1}</div><span>${s[0]}</span></div>`).join('')}</div>
    ${nextCard}${certCard}${brCard}${mrCard}${mmrCard}${eeCard}${pairCards}
    ${inferred('Q2')}
  </div>`;
},
};
