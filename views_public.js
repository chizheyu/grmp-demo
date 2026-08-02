/* GRMP Demo — public views: microsite (manual ch.1) + personal pages (ch.2–3). */

const Views = {

/* ---------- shared microsite chrome ---------- */
msNav(){
  return `<nav class="ms-nav"><div class="wrap row">
    <a href="#/" class="ms-logo" style="text-decoration:none">SMC · GRMP<small>GLOBAL READY MENTORSHIP</small></a>
    <span class="spacer"></span>
    <a href="#/guide/mentee">For Mentees</a>
    <a href="#/guide/mentor">For Mentors</a>
    <a href="#/reflection">Reflection Sheet</a>
    <a href="#/apply/mentee" class="btn sm" style="background:#fff;color:var(--red);border-radius:8px">Apply</a>
  </div></nav>`;
},
msFooter(){
  return `<footer class="ms-footer"><div class="wrap" style="display:flex;gap:20px;flex-wrap:wrap;align-items:center">
    <span>Singapore Mentorship Committee · GRMP 2026 (SMU pilot)</span>
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
    <p>The Global Ready Mentorship Programme pairs SMU students and young professionals with senior
       leaders across three rotations — October 2026 to March 2027. One hour with the right mentor
       can reframe a career.</p>
    <div class="cta">
      <a class="btn btn-light" href="#/apply/mentee" style="text-decoration:none">Apply as Mentee</a>
      <a class="btn btn-line" href="#/apply/mentor" style="text-decoration:none">Register as Mentor</a>
    </div>
  </div></header>
  <div class="ms-strip">Cycle 1 is piloted with SMU · 60 mentors · 60 mentees · applications reviewed by the programme team</div>

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
    <h2>How the six months run</h2>
    <p class="lede">Every step below is handled on this platform — no forms lost in inboxes, no chasing.</p>
    <div class="timeline">
      <div class="tl-node"><div class="dot">1</div><h4>Apply · Sept</h4><p>One form, reviewed by the programme team</p></div>
      <div class="tl-node"><div class="dot">2</div><h4>Acknowledge</h4><p>Programme Rules, PDPA & conduct — digital, timestamped</p></div>
      <div class="tl-node"><div class="dot">3</div><h4>Orientation & Kickoff · Oct</h4><p>Required before Rotation 1</p></div>
      <div class="tl-node"><div class="dot">4</div><h4>3 rotations · Oct–Mar</h4><p>Know Yourself · Know Your World · Know Your Path</p></div>
      <div class="tl-node"><div class="dot">5</div><h4>Close-off each rotation</h4><p>Two meetings + your private reflection</p></div>
      <div class="tl-node"><div class="dot">6</div><h4>Certificate · Mar</h4><p>Complete all three rotations</p></div>
    </div>
  </div></section>

  <section class="ms-section" style="background:var(--surface);border-top:1px solid var(--line)"><div class="wrap" style="display:flex;gap:26px;align-items:center;flex-wrap:wrap">
    <div style="flex:1;min-width:260px">
      <h2 style="margin-bottom:8px">Mentors: two hours a month that change a trajectory</h2>
      <p class="lede" style="margin:0">Meet your mentee at least twice per two-month rotation, at times you both choose.
      No admin burden — the platform handles everything except the conversation.</p>
    </div>
    <a class="btn btn-primary" href="#/apply/mentor" style="text-decoration:none">Register as Mentor</a>
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
    <p style="font-size:12px;color:var(--ink-3)">Placeholder structure — final wording comes from the programme team's mentee guide.</p>
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
      <li>A single short mid-programme review in January — two minutes, on your personal page.</li></ul></div>
    <p style="font-size:12px;color:var(--ink-3)">Placeholder structure — final wording comes from the programme team's mentor brief.</p>
  </div>` + this.msFooter();
},

/* ---------- 1.3 reflection sheet ---------- */
reflection(){
  return this.msNav() + `<div class="doc-page">
    <h1>Reflection Sheet</h1>
    <div class="privacy-note">🔒 <span>This reflection is <b>yours</b>. The platform never stores what you write here —
      it records only your end-of-rotation close-off. Keep this document anywhere private (your notes app, a doc, paper).</span></div>
    ${inferred('Q1')}
    <div class="doc-card"><h3>Rotation 1 — Know Yourself</h3><ul>
      <li>What did I learn about my strengths that I didn't know in September?</li>
      <li>Which assumption about my career did this rotation challenge?</li>
      <li>One thing my mentor said that I keep thinking about.</li></ul></div>
    <div class="doc-card"><h3>Rotation 2 — Know Your World</h3><ul>
      <li>How does my target industry actually work, beyond what I imagined?</li>
      <li>Where does my track (General / Entrepreneurship / AI) fit into that world?</li></ul></div>
    <div class="doc-card"><h3>Rotation 3 — Know Your Path</h3><ul>
      <li>What path am I now considering that I wasn't before?</li>
      <li>What would I tell September-me?</li></ul></div>
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
    <p class="lede">${mentee?'GRMP 2026 · October to March · reviewed by the programme team.':'Welcome — this is the registration linked from your invitation.'}</p>
    ${inferred('Q4')}
    <div class="form" id="apply-form">
      <div class="f-grid2">
        <div class="f-row"><label>Full name <span class="req">*</span></label><input type="text" id="f-name" placeholder="Your name"></div>
        <div class="f-row"><label>Email <span class="req">*</span></label><input type="email" id="f-email" placeholder="you@example.com"></div>
      </div>
      <div class="f-grid2">
        <div class="f-row"><label>Mobile</label><input type="text" id="f-mobile" placeholder="+65"></div>
        ${mentee
          ? `<div class="f-row"><label>Course at SMU <span class="req">*</span></label><input type="text" id="f-course" placeholder="e.g. Business Management"></div>`
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
        <b>incomplete</b> and sends a reminder — try it: that behaviour is part of the demo.</p>
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
    <h1 style="font-size:24px">${ok?'Application received':'Saved — but incomplete'}</h1>
    <p class="lede">${ok
      ? `Thank you, ${esc(p.name)}. A confirmation email is on its way. The programme team reviews applications and you'll hear the outcome by email — every next step will arrive as a personal link, no account needed.`
      : `We saved what you entered, ${esc(p.name)}, and emailed you a reminder listing what's missing. Your application enters review once it's complete.`}</p>
    <div class="card" style="text-align:left"><h3>What happens behind the scenes</h3>
      <p style="font-size:13px;color:var(--ink-2);margin:0">Your application is now in the master tracker with status
      <b>${esc(p.appStatus)}</b> — visible to reviewers in the admin console. Open the console from the
      <b>Open as…</b> switcher (bottom-left) to see the other side of this demo.</p></div>
    <a class="btn btn-ghost" href="#/" style="text-decoration:none">Back to the microsite</a>
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
  const cert = db.certificates.some(c=>c.personId===personId);
  const eligible = D.certEligible(db, p);

  /* timeline model */
  const steps = mentee
    ? [['Applied',true],['Accepted',['accepted','reserve_bench'].includes(p.appStatus)],['Acknowledged',ackDone],
       ['Orientation',!!p.orientation],['R1',closed>=1],['R2',closed>=2],['R3',closed>=3],
       ['Builder Reflection',hasBR],['Certificate',cert||eligible]]
    : [['Registered',true],['Accepted',['accepted','reserve_bench'].includes(p.appStatus)],['Acknowledged',ackDone],
       ['Orientation',!!p.orientation],['Matched',myPairs.length>0],['Mid-programme review',hasMR],['Certificate',cert||eligible]];
  let curIdx = steps.findIndex(s=>!s[1]); if(curIdx<0) curIdx = steps.length-1;

  /* --- next-step card --- */
  let nextCard = '';
  const DOCS = [['rules','GRMP Programme Rules','v2.0'],['charter','SMC Charter','v1.3'],['governance','Governance Guidelines','v1.1'],['pdpa','PDPA Consent','v1.0'],['coi','Conflict-of-Interest Declaration','v1.0']];
  if(!ackDone){
    nextCard = `<div class="card"><h3>📄 Acknowledge the programme documents</h3>
      <p style="font-size:13px;color:var(--ink-2)">Five documents, each recorded with a timestamp and version.
      <b>You can't be matched until all five are done.</b></p>
      <div class="acklist">${DOCS.map(([k,nm,ver])=>{
        const done = p.ack && p.ack[k];
        return `<div class="ackrow"><span class="nm">${nm}</span><span class="ver">${ver}</span>
          ${done?`<span class="badge b-ok"><span class="d"></span>Acknowledged ${done}</span>`
                :`<button class="btn sm btn-primary" data-act="ack" data-person="${p.id}" data-doc="${k}">Read & acknowledge</button>`}</div>`;
      }).join('')}</div>
      ${inferred('Q5')}
      <div style="margin-top:10px"><button class="btn sm btn-ghost" data-act="ackAll" data-person="${p.id}">Acknowledge all (demo shortcut)</button></div></div>`;
  } else if(!p.orientation){
    nextCard = `<div class="card"><h3>🎓 Complete your orientation</h3>
      <p style="font-size:13px;color:var(--ink-2)">Attend the live session, or watch the recorded module —
      <b>required before Rotation 1, no exceptions.</b></p>
      <div style="background:#14171d;border-radius:12px;aspect-ratio:16/7;display:grid;place-items:center;margin:4px 0 10px;cursor:pointer" data-act="orient" data-person="${p.id}" data-mode="recorded" role="button" tabindex="0" aria-label="Play orientation recording">
        <div style="text-align:center;color:#fff"><div style="width:54px;height:54px;border-radius:50%;background:var(--red);display:grid;place-items:center;margin:0 auto 8px;font-size:20px">▶</div>
        <div style="font-size:13px;font-weight:700">GRMP Orientation 2026 — session recording</div>
        <div style="font-size:11px;opacity:.7">sent to everyone after the live session · opening it records your completion</div></div>
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
        <div style="font-size:11.5px;color:var(--ink-3);margin:-4px 0 8px 26px"><a href="#/reflection">Open the Reflection Sheet ↗</a></div>
        <div class="f-row"><input type="text" id="co-comment" placeholder="Optional comment"></div>
        <button class="btn btn-primary" data-act="closeoff" data-pair="${openPair.id}">Submit close-off</button>
        ${rotEnded?'':`<p style="font-size:11.5px;color:var(--ink-3);margin:8px 0 0">Rotation ${openPair.rotation} runs until ${rotNow.end} — in the demo you can close off early.</p>`}</div>`;
    } else if(closed>=3 && !hasBR){
      nextCard = `<div class="card"><h3>🏗 Your Builder Reflection</h3>
        <p style="font-size:13px;color:var(--ink-2)">You've completed all three rotations. Close the programme with a free-text
        reflection: how will you contribute back to the ecosystem that mentored you?</p>
        <div class="f-row"><textarea id="br-text" placeholder="Write freely — there are no categories to pick (deferred to Cycle 2)"></textarea></div>
        <button class="btn btn-primary" data-act="builder" data-person="${p.id}">Submit Builder Reflection</button></div>`;
    } else if(eligible && !cert){
      nextCard = `<div class="card"><h3>🎉 You qualify for your certificate</h3>
        <p style="font-size:13px;color:var(--ink-2)">All three rotations closed + Builder Reflection submitted.
        The Programme Lead issues certificates from the console — yours will arrive by email.</p></div>`;
    } else if(!myPairs.length){
      nextCard = `<div class="card"><h3>🤝 Matching in progress</h3>
        <p style="font-size:13px;color:var(--ink-2)">You're cleared (acknowledged + orientated). The programme team is preparing
        Rotation ${rotNow?rotNow.n:2} matches — you'll get one email with your mentor, the dates and the guide.</p></div>`;
    }
  } else {                                     /* mentor next-steps */
    const servedEarly = GRMP.D.pairsFor(db,personId).some(x=>x.rotation<=2 && x.status!=='rejected');
    if(!hasMR && servedEarly){
      nextCard = `<div class="card"><h3>📝 Mid-programme review (your one checkpoint)</h3>
        <p style="font-size:13px;color:var(--ink-2)">Two minutes in January: how is the pairing going, anything the team should know?
        (The demo lets you submit early.)</p>
        <div class="f-row"><textarea id="mr-text" placeholder="How is it going with your mentee(s)?"></textarea></div>
        <button class="btn btn-primary" data-act="midreview" data-person="${p.id}">Submit review</button></div>`;
    }
  }

  /* --- pairs display --- */
  const pairCards = myPairs.filter(x=>x.status!=='replaced').map(x=>{
    const other = D.person(db, mentee? x.mentorId : x.menteeId);
    const rot = db.config.rotations.find(r=>r.n===x.rotation);
    return `<div class="card"><h3>Rotation ${x.rotation} — ${rot.label}
        ${x.status==='closed'?'<span class="badge b-ok"><span class="d"></span>Closed off</span>'
          : x.status==='rematch_needed'?'<span class="badge b-warn"><span class="d"></span>Replacement pending</span>'
          : '<span class="badge b-neut"><span class="d"></span>Running · Dec–Jan</span>'}</h3>
      <div class="mentor-card">
        <div class="avatar ${mentee?'av-mentor':'av-mentee'}" style="width:44px;height:44px;font-size:14px">${esc(other.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</div>
        <div style="flex:1">
          <b>${esc(other.name)}</b> <span class="track-chip track-${other.track}">${esc(GRMP.TRACKS[other.track].label)}</span>
          <div style="font-size:12.5px;color:var(--ink-2)">${mentee?esc(other.role+' · '+other.org):esc(other.university+' · '+other.course+', year '+other.year)}</div>
          <div style="font-size:12px;color:var(--ink-3);margin-top:3px">${mentee?esc('Background: '+other.background):esc('Goal: '+other.goals)}</div>
        </div></div>
      ${x.status==='closed'&&x.closeoff&&x.closeoff.comment&&mentee?`<div style="margin-top:10px;background:var(--surface-2);border:1px solid var(--line-2);border-radius:9px;padding:9px 12px;font-size:12.5px"><b style="color:var(--ink-3);font-size:10.5px;text-transform:uppercase;letter-spacing:.04em">Your close-off note</b><br>“${esc(x.closeoff.comment)}”</div>`:''}
      <p style="font-size:12px;color:var(--ink-3);margin:10px 0 0">Guide: <a href="#/reflection">${rot.label} — reflection prompts</a> · suggested first step: a 30-minute intro call.</p>
    </div>`;
  }).join('');

  const myBR = db.builderReflections.find(b=>b.menteeId===personId);
  const myMR = db.midreviews.find(m=>m.mentorId===personId);
  const brCard = (mentee&&myBR)?`<div class="card"><h3>🏗 Your Builder Reflection <span class="badge b-ok"><span class="d"></span>submitted ${myBR.at}</span></h3>
      <p style="font-size:13.5px;margin:0">“${esc(myBR.text)}”</p></div>`:'';
  const mrCard = (!mentee&&myMR)?`<div class="card"><h3>📝 Your mid-programme review <span class="badge b-ok"><span class="d"></span>submitted ${myMR.at}</span></h3>
      <p style="font-size:13.5px;margin:0">“${esc(myMR.text)}”</p></div>`:'';
  const certCard = cert ? `<div class="cert"><div style="font-size:11px;letter-spacing:.18em;font-weight:800;color:var(--gold)">SINGAPORE MENTORSHIP COMMITTEE</div>
      <h2>Certificate of Completion</h2><div class="nm">${esc(p.name)}</div>
      <div class="meta">Global Ready Mentorship Programme 2026 · all three rotations completed · issued ${esc(db.certificates.find(c=>c.personId===p.id).at)}</div></div>` : '';

  return `<div class="pp-shell">
    <div class="pp-head">
      <div class="avatar ${mentee?'av-mentee':'av-mentor'}">${esc(p.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</div>
      <div><h1>Hi ${esc(p.name.split(' ')[0])}</h1>
        <div class="sub">${mentee?'Mentee':'Mentor'} · ${esc(GRMP.TRACKS[p.track].label)} track · GRMP 2026
        ${p.previewFastForward?' · <b style="color:var(--ai-ink)">demo fast-forwarded to March</b>':''}</div></div>
    </div>
    <div style="font-size:11.5px;color:var(--ink-3);margin:-8px 0 14px">🔗 You opened this from your personal link — no account, no password. That's by design.</div>
    <div class="steps">${steps.map((s,i)=>`<div class="step ${s[1]?'done':(i===curIdx?'cur':'')}"><div class="dot">${s[1]?'✓':i+1}</div><span>${s[0]}</span></div>`).join('')}</div>
    ${nextCard}${certCard}${brCard}${mrCard}${pairCards}
    ${inferred('Q2')}
  </div>`;
},
};
