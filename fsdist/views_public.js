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

/* Documents supplied by the programme and hosted here, never hot-linked to Drive
   (Resources Area spec, "Document hosting"). Relative paths so the same build works on
   Firebase Hosting and on the sandbox. The Charter is the one public document. */
const CHARTER_URL = 'docs/SMC_Charter_V1.0.pdf';

const Views = {

/* ---------- shared chrome (pre-login spec §B and §C) ----------
   Nav is exactly Mentees / Mentors / FAQ, in that order. Apply is deliberately NOT in the
   nav: it is the primary red action and lives only in page bodies. Sign in is secondary and
   is never hidden, including inside the mobile menu. */
msNav(active){
  const signedIn = (typeof NET!=='undefined'&&NET) && SESSION && SESSION.identity;
  const meHref = signedIn
    ? (SESSION.identity.kind==='person' ? '#/me/'+SESSION.identity.personId
                                        : '#/console/'+encodeURIComponent(SESSION.identity.name||''))
    : '#/login';
  const open = (typeof window!=='undefined' && window.__NAVOPEN);
  const item = (key,href,label)=>`<a href="${href}" class="ms-navlink${active===key?' is-active':''}"${active===key?' aria-current="page"':''}>${label}</a>`;
  const links = item('mentees','#/mentees','Mentees') + item('mentors','#/mentors','Mentors') + item('faq','#/faq','FAQ');
  return `<nav class="ms-nav"><div class="wrap row">
    <a href="#/" class="ms-logo" style="text-decoration:none">${esc(F().pairName)} · GRMP<small>${esc(F().progName)}</small></a>
    <span class="spacer"></span>
    <div class="ms-links">${links}</div>
    ${signedIn
      ? `<a href="${meHref}" class="ms-signin">👤 ${esc(SESSION.identity.name||'me')}</a>`
      : `<span class="ms-signcue">Already accepted?</span><a href="${meHref}" class="ms-signin" title="For participants who have already been accepted">Sign in</a>`}
    <button class="ms-burger" data-act="navToggle" aria-expanded="${open?'true':'false'}" aria-label="${open?'Close menu':'Open menu'}">${open?'✕':'☰'} Menu</button>
  </div>${open?`<div class="ms-drawer wrap">${links}</div>`:''}</nav>`;
},
/* Footer: the spec's three elements, plus the private concern route. That fourth link is
   not in the pre-login spec, but the Programme Owner required it on every public page
   (Q6 / F0806-174654), so it stays and is flagged back to Joanne rather than dropped. */
msFooter(){
  return `<footer class="ms-footer"><div class="wrap">
    <div style="font-weight:700;color:#fff;margin-bottom:6px">${esc(F().progFull)}</div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
      <a href="https://www.smcmentorship.org/" target="_blank" rel="noopener">About SMC<span class="ext" aria-label="opens in a new tab"> ↗</span></a>
      <span aria-hidden="true">|</span>
      <a href="${CHARTER_URL}" target="_blank" rel="noopener">SMC Charter<span class="ext" aria-label="opens in a new tab"> ↗</span></a>
      <span aria-hidden="true">|</span>
      <span>Programme Enquiries: <a href="mailto:${esc(F().enquiries)}">${esc(F().enquiries)}</a></span>
      <span aria-hidden="true">|</span>
      <a href="#/concern">Raise a concern (private)</a>
    </div>
  </div></footer>`;
},

/* ---------- PAGE 1 — Home (pre-login spec §D) ----------
   Orientation and routing only. No rotation detail, no philosophy strip beyond the hero
   sub-line, and no FAQ block: those live on the dedicated pages. */
landing(){
  const CF = F();
  return this.msNav('home') + `
  <header class="ms-hero"><div class="wrap">
    <div class="eyebrow">Singapore Mentorship Committee · ${esc(CF.pairName)}</div>
    <h1>Six months. A mentoring journey that works both ways.</h1>
    <p>GRMP pairs ${esc(CF.inst)} undergraduates with experienced mentors from the SMC community
       across three rotations, from understanding yourself, to the world, to your way forward.
       ${esc(CF.spanLong)}.</p>
    <div class="cta">
      <a class="btn btn-light" href="#/apply/mentee" style="text-decoration:none">Apply as a Mentee</a>
      <a class="btn btn-line" href="#/apply/mentor" style="text-decoration:none">Apply as a Mentor</a>
    </div>
  </div></header>

  <section class="ms-section"><div class="wrap">
    <h2>Two ways in</h2>
    <div class="cards2" style="margin-top:14px">
      <div class="tcard lane-mentee">
        <h3 style="margin-top:0">Mentees</h3>
        <p>Current ${esc(CF.inst)} undergraduate, any school, any year.</p>
        <p style="margin-top:8px">Gain three mentors, real-world perspective, and a clearer next step.</p>
        <p style="margin-top:14px"><a href="#/mentees" style="font-weight:700">Discover the mentee journey →</a></p>
      </div>
      <div class="tcard lane-mentor">
        <h3 style="margin-top:0">Mentors</h3>
        <p>Experienced professional, 5+ years, with demonstrated experience working across different
           industries, cultures, markets or communities.</p>
        <p style="margin-top:8px">Contribute two hours a rotation; gain fresh perspective and a global network.</p>
        <p style="margin-top:14px"><a href="#/mentors" style="font-weight:700">Explore the mentor journey →</a></p>
      </div>
    </div>
  </div></section>

  <section class="ms-section" style="padding-top:0"><div class="wrap">
    <h2>How the six months run</h2>
    <div class="timeline">
      ${[['Apply · by '+CF.closesDayShort,'Complete a short application'],
         ['Accept · by '+CF.acceptByDayShort,'Accept the charter &amp; commitments'],
         ['Kick-Off · '+CF.kickoffDayShort,'Meet your cohort &amp; mentors'],
         ['3 rotations · '+CF.rotSpanShort,'Engage, inspire, learn'],
         ['Close each rotation','Reflect &amp; capture learning'],
         ['Complete · '+CF.endMon3,'Complete and take forward']]
        .map(([h,p],i)=>`<div class="tl-node"><div class="dot">${i+1}</div><h4>${esc(h).replace('&amp;amp;','&amp;')}</h4><p>${p}</p></div>`).join('')}
    </div>
    <p style="margin-top:18px;font-size:13.5px"><a href="#/faq">Questions people ask before applying →</a></p>
  </div></section>

  <section class="ms-section ms-closing"><div class="wrap" style="text-align:center">
    <h2 style="margin-bottom:14px">Applications are open.</h2>
    <div class="cta" style="justify-content:center">
      <a class="btn btn-primary" href="#/apply/mentee" style="text-decoration:none">Apply as a Mentee</a>
      <a class="btn btn-ghost" href="#/apply/mentor" style="text-decoration:none">Apply as a Mentor</a>
    </div>
  </div></section>` + this.msFooter();
},

/* The three-rotation arc, shared by the Mentees and Mentors pages. Same rotations, framed
   from each side: the mentee explores, the mentor contributes (spec §E and §F). */
_rotationArc(rows){
  return `
    <h2>The three-rotation arc</h2>
    <p class="arc-strip"><i>修身齐家治国平天下</i> | <b>AI-WT Mindset: Adaptive, Innovative, With the Times.</b>
       AI-WT underpins GRMP, with each rotation progressively building one core capacity.</p>
    <div class="cards3" style="margin-top:14px">
      ${rows.map(r=>`<div class="tcard rot-card">
        <div class="rot-label">${r[0]}</div>
        <h3 style="margin:6px 0 4px">${esc(r[1])}</h3>
        <p style="font-style:italic;margin-bottom:6px">${esc(r[2])}</p>
        <p>${esc(r[3])}</p>
      </div>`).join('')}
    </div>`;
},

/* ---------- PAGE 2 — Mentees (pre-login spec §E) · gain-led, red lane ---------- */
pageMentees(){
  const CF = F();
  return this.msNav('mentees') + `
  <header class="ms-hero"><div class="wrap">
    <div class="eyebrow">For mentees · ${esc(CF.inst)} undergraduates</div>
    <h1>Three mentors. Six months. A clearer sense of where you are going.</h1>
    <p>You do not need a plan yet. You need good questions, and people who have walked further ahead.
       GRMP gives you both.</p>
    <div class="cta"><a class="btn btn-light" href="#/apply/mentee" style="text-decoration:none">Apply as a Mentee</a></div>
  </div></header>

  <section class="ms-section"><div class="wrap">
    <h2>What you gain</h2>
    <div class="cards3" style="margin-top:14px">
      <div class="tcard"><h3 style="margin-top:0">Three mentors</h3><p>A new mentor each rotation, drawn from SMC's global community.</p></div>
      <div class="tcard"><h3 style="margin-top:0">Real-world perspective</h3><p>How industries, workplaces and cultures actually work, beyond the classroom.</p></div>
      <div class="tcard"><h3 style="margin-top:0">A clearer next step</h3><p>Direction, one practical step, and a certificate from ${esc(CF.inst)} and SMC.</p></div>
    </div>
  </div></section>

  <section class="ms-section" style="padding-top:0"><div class="wrap">
    <h2>What it asks of you</h2>
    <ul class="ms-list">
      <li>Attend the Kick-Off on ${esc(CF.kickoffLong)}. A binding programme requirement.</li>
      <li>Meet your mentor at least twice each rotation, virtually or in person.</li>
      <li>Prepare, reflect after each conversation, and take ownership of your own growth.</li>
      <li>Close with a Builder's Commitment: one simple way to give back to SMC.</li>
    </ul>
  </div></section>

  <section class="ms-section" style="padding-top:0"><div class="wrap">
    ${this._rotationArc([
      ['ROTATION 1 · 修身 | Adaptive','Understand yourself','Who am I as a global citizen?','Surface your values, identity and strengths.'],
      ['ROTATION 2 · 治国 | Innovative','Understand the real world','How do I navigate the world beyond my classroom?','Gain industry and cross-cultural perspective.'],
      ['ROTATION 3 · 平天下 | With the Times','Plan your next step','How do I step forward and bring others with me?','Shape your direction, action and contribution.'],
    ])}
    <div class="reflect-bar">
      <b>Your reflection sheet</b>
      <span>One continuous thread across all three rotations. It belongs to you: you decide what to share
        with each mentor, and it never needs to be submitted.</span>
    </div>
  </div></section>

  <section class="ms-section ms-closing"><div class="wrap" style="text-align:center">
    <h2 style="margin-bottom:6px">Ready to grow?</h2>
    <p class="lede" style="margin:0 auto 18px">Applications close ${esc(CF.applyClosesLong)}. Outcome by ${esc(CF.outcomeByNoYear)}.</p>
    <div class="cta" style="justify-content:center">
      <a class="btn btn-primary" href="#/apply/mentee" style="text-decoration:none">Apply as a Mentee</a>
    </div>
  </div></section>` + this.msFooter();
},

/* ---------- PAGE 3 — Mentors (pre-login spec §F) · contribute-led, navy lane ---------- */
pageMentors(){
  const CF = F();
  return this.msNav('mentors') + `
  <header class="ms-hero hero-navy"><div class="wrap">
    <div class="eyebrow">For mentors · Experienced professionals</div>
    <h1>Two hours a rotation. A perspective a student will carry for years.</h1>
    <p>You do not need all the answers. What matters is your willingness to listen, share honestly,
       and help a young person think more clearly.</p>
    <div class="cta"><a class="btn btn-primary" href="#/apply/mentor" style="text-decoration:none">Apply as a Mentor</a></div>
  </div></header>

  <section class="ms-section"><div class="wrap">
    <h2>What you contribute</h2>
    <ul class="ms-list">
      <li>Mentor across three rotations, a new mentee in each, ${esc(CF.spanLong)}.</li>
      <li>Meet your mentee at least twice per rotation, virtually or in person.</li>
      <li>Attend the Kick-Off on ${esc(CF.kickoffLong)}. A binding programme requirement.</li>
      <li>Share not just your successes, but the setbacks and choices that shaped you.</li>
    </ul>
  </div></section>

  <section class="ms-section" style="padding-top:0"><div class="wrap">
    <h2>What you gain</h2>
    <div class="cards2" style="margin-top:14px">
      <div class="tcard"><h3 style="margin-top:0">Sharper coaching and leadership</h3><p>Mentoring across a cohort strengthens how you guide and develop people.</p></div>
      <div class="tcard"><h3 style="margin-top:0">Fresh perspective</h3><p>See how the next generation thinks about work, values and change.</p></div>
      <div class="tcard"><h3 style="margin-top:0">A global network</h3><p>Join 5,000+ SMC members across 35 countries.</p></div>
      <div class="tcard"><h3 style="margin-top:0">Recognition</h3><p>A Certificate of Appreciation jointly presented by ${esc(CF.inst)} and SMC.</p></div>
    </div>
    <div class="role-block">
      <b>Your role: guide, challenge, inspire</b>
      <p>Ask the questions that open new thinking, share the experience that widens their view, and
         encourage them to act. You are not here to give answers or offer jobs, you are here to help
         them find their own next step. The rotation conversation guides give you a starting point.</p>
    </div>
  </div></section>

  <section class="ms-section" style="padding-top:0"><div class="wrap">
    ${this._rotationArc([
      ['ROTATION 1 · 修身 | Adaptive','Understand yourself','Who am I as a global citizen?','Help surface values, identity and strengths.'],
      ['ROTATION 2 · 治国 | Innovative','Understand the real world','How do I navigate the world beyond my classroom?','Bring industry and cross-cultural perspective.'],
      ['ROTATION 3 · 平天下 | With the Times','Plan the next step','How do I step forward and bring others with me?','Support direction, action and contribution.'],
    ])}
  </div></section>

  <section class="ms-section ms-closing"><div class="wrap" style="text-align:center">
    <h2 style="margin-bottom:6px">Shape a global-ready leader.</h2>
    <p class="lede" style="margin:0 auto 18px">Applications close ${esc(CF.applyClosesLong)}. Outcome by ${esc(CF.outcomeByNoYear)}.</p>
    <div class="cta" style="justify-content:center">
      <a class="btn btn-primary" href="#/apply/mentor" style="text-decoration:none">Apply as a Mentor</a>
    </div>
  </div></section>` + this.msFooter();
},

/* ---------- PAGE 4 — FAQ (pre-login spec §G) ----------
   Three tabs, sub-category headings, single-open accordions, all collapsed on load. Answers
   are the approved FAQ document's, with the two alignment notes the spec records. */
_faqContent(){
  const CF = F();
  return {
    about:{label:'About GRMP', groups:[
      ['The basics',[
        ['What is GRMP?',
         'GRMP is a six-month, one-to-one mentorship programme that connects university students with experienced professionals. Through mentor conversations, students reflect on themselves, learn about the real world, and think about their next steps.'],
        ['Is GRMP a job placement programme?',
         'No. GRMP does not guarantee internships, jobs or business opportunities. The programme is about learning, reflection, guidance and growth.'],
        ['What does "global-ready" mean?',
         'It means being able to navigate diverse cultures with confidence, solve the right problems with clarity, and turn uncertainty into opportunities to learn and grow, so that every generation can empower the next.'],
        ['How does GRMP work?',
         'GRMP has three mentoring rotations. Rotation 1, Understand Yourself: interests, strengths, values and goals. Rotation 2, Understand the Real World: work, industry, culture and real-world choices. Rotation 3, Plan Your Next Step: direction, action and giving back. The three-rotation journey is inspired by the founder’s philosophy 修身齐家治国平天下 and the AI-WT Mindset: Rotation 1 reflects 修身 and Adaptive, Rotation 2 reflects 治国 and Innovative, and Rotation 3 reflects 平天下 and With the Times.'],
      ]],
      ['Practical',[
        ['Do I need an account or a password to apply?',
         'No. Applications need no account and no password: you apply directly from the mentee or mentor page on this site. If you are offered a place, your acceptance email carries your own personal link, and opening it sends a one-time code to your email address.'],
        ['How much time does it really take?',
         'At least two conversations with your mentor in each rotation, arranged directly between the two of you, plus a short close-off at the end of each rotation. Six conversations across the six months, and the Kick-Off evening.'],
        ['What support and materials will I get?',
         'Once you join, you will have access to preparation notes, conversation guides and briefing materials for every rotation, all in one place on the platform.'],
        ['What if I have concerns during the programme?',
         `If you feel uncomfortable, unclear or unable to continue, please contact the programme team at ${CF.enquiries}. The team will provide support and guidance.`],
        ['How do I apply?',
         'Applications are made through this site. On the mentee or mentor page, choose Apply, and complete the short application before the closing date. No account is needed to apply.'],
      ]],
    ]},
    mentees:{label:'For mentees', groups:[
      ['Joining as a mentee',[
        ['Who can join as a mentee?',
         `Current ${CF.inst} undergraduates of all nationalities who are highly motivated and who value mentorship, and who are open to learning, asking questions and reflecting on their growth, can join as mentees. You do not need to have a clear career plan before joining.`],
        ['What can mentees gain?',
         'A better understanding of themselves; practical insights from real-world professionals; more confidence in asking questions; a wider view of work and society; meaningful connections with mentors and peers; and clearer next steps after the programme.'],
        ['What is expected of mentees?',
         'Attend mentor meetings responsibly; prepare questions before each session; be respectful of mentors’ time; reflect on what they learn; take small actions after each conversation; and think about how they can give back to SMC.'],
        ['What is the reflection sheet?',
         'The reflection sheet is a simple tool for mentees to record their goals, key learning, new insights, next steps and what they want to carry forward. It belongs to the mentee, and mentees decide what to share with each mentor.'],
      ]],
      ['Taking part',[
        ['What is a give-back action?',
         'A Builder’s Commitment, or give-back action, is one simple way a mentee can contribute back to the SMC community: sharing learning with peers, supporting future mentees, volunteering in an SMC activity, helping with a student initiative, or staying connected with the SMC community.'],
        ['How can mentees contribute?',
         'Share useful feedback; support future GRMP participants; share learning with peers; participate in SMC activities where appropriate; and commit to one practical way of giving back to the SMC community.'],
      ]],
    ]},
    mentors:{label:'For mentors', groups:[
      ['Becoming a mentor',[
        ['Who can become a mentor?',
         'Mentors are working professionals with at least five years of professional experience who are passionate about sharing their experience and supporting the development of young people. Mentors do not need to have all the answers. What matters most is their willingness to listen, guide and encourage.'],
        ['What is the mentor’s role?',
         'Mentors help mentees think more clearly, broaden their perspectives and take greater ownership of their development. They establish what the mentee hopes to achieve, share relevant real-world experience, ask thoughtful questions, offer industry and workplace insights, and help identify development areas, skills or knowledge gaps and practical next steps. Mentors are also expected to stay committed throughout the programme, maintain regular contact and respect the confidentiality of information shared by the mentee. Mentors are not expected to provide jobs or internships, or to have all the answers.'],
        ['How many meetings are expected?',
         'Each mentor-mentee pair should aim to have at least two meaningful conversations per rotation. Meetings can be in person or online.'],
      ]],
      ['Taking part',[
        ['How can mentors contribute?',
         'Join SMC community activities; share relevant expertise or perspectives with the wider community; encourage other suitable professionals to mentor; and support future SMC initiatives where appropriate.'],
      ]],
    ]},
  };
},
pageFaq(){
  const content = this._faqContent();
  const keys = ['about','mentees','mentors'];
  const tab = (typeof window!=='undefined' && window.__FAQTAB && content[window.__FAQTAB]) ? window.__FAQTAB : 'about';
  const panel = content[tab];
  let n = 0;
  return this.msNav('faq') + `
  <div class="doc-page" style="max-width:860px">
    <h1>Questions people ask before applying</h1>
    <div class="faq-tabs" role="tablist" aria-label="Question sets">
      ${keys.map(k=>`<button role="tab" id="faqtab-${k}" aria-controls="faqpanel" aria-selected="${k===tab?'true':'false'}"
        class="faq-tab${k===tab?' is-active':''}" data-act="faqTab" data-tab="${k}">${esc(content[k].label)}</button>`).join('')}
    </div>
    <div id="faqpanel" role="tabpanel" aria-labelledby="faqtab-${tab}">
      ${panel.groups.map(([heading, rows])=>`
        <h2 class="faq-group">${esc(heading)}</h2>
        <div class="faq">
          ${rows.map(([q,a,flagged])=>{ n++; return `<details class="faq-item" name="faq-${tab}">
            <summary>${esc(q)}</summary>
            <p>${esc(a)}${flagged?` <span class="faq-flag" title="Drafted for the programme owner to confirm before publishing">awaiting owner confirmation</span>`:''}</p>
          </details>`; }).join('')}
        </div>`).join('')}
    </div>
  </div>` + this.msFooter();
},

/* ---------- Resources (post-login) — Resources Area spec ----------
   Every signed-in participant sees every document; the two headings are labels, not filters.
   Nothing else on the page: no links out to the public site, no application links. */
resources(){
  if(typeof anyLinkAuthed==='function' && !anyLinkAuthed()){
    return this.msNav() + `<div class="doc-page" style="max-width:560px">
      <h1>Resources</h1>
      <p class="lede">These materials are for GRMP participants. Please open your personal link, or sign in, to reach them.</p>
      <a class="btn btn-primary" href="#/login" style="text-decoration:none">Sign in</a>
    </div>` + this.msFooter();
  }
  const secs = GRMP.RESOURCES;
  return this.ppNav('resources') + `<div class="doc-page" style="max-width:860px">
    <h1>Resources</h1>
    <p class="lede">Everything you need to prepare well, in one place. These materials are for GRMP participants.</p>
    ${['mentees','mentors'].map(key=>{
      const rows = secs.filter(d=>d.section===key);
      if(!rows.length) return '';
      return `<h2 class="res-head">${key==='mentees'?'For mentees':'For mentors'}</h2>
      ${rows.map(d=>`<div class="res-row">
        <div><b>${esc(d.title)}</b><div class="res-desc">${esc(d.desc)}</div></div>
        <a class="btn sm btn-ghost" href="docs/resources/${encodeURIComponent(d.file)}" target="_blank" rel="noopener"
           style="text-decoration:none;white-space:nowrap">Open ${esc(d.title)}<span class="ext" aria-label="opens in a new tab"> ↗</span></a>
      </div>`).join('')}`;
    }).join('')}
  </div>` + this.msFooter();
},

/* Authenticated participant chrome. Resources sits to the right, as the spec places it. */
ppNav(active, personId){
  const pid = personId
    || ((typeof SESSION!=='undefined' && SESSION && SESSION.identity && SESSION.identity.kind==='person')
        ? SESSION.identity.personId
        : (typeof lastLinkAuthed==='function' ? lastLinkAuthed() : null));
  return `<nav class="ms-nav pp-nav"><div class="wrap row">
    <a href="#/" class="ms-logo" style="text-decoration:none">${esc(F().pairName)} · GRMP<small>Participant portal</small></a>
    <span class="spacer"></span>
    ${pid?`<a href="#/me/${esc(pid)}" class="ms-navlink${active==='me'?' is-active':''}">My programme</a>`:''}
    <a href="#/resources" class="ms-navlink${active==='resources'?' is-active':''}"${active==='resources'?' aria-current="page"':''}>Resources</a>
  </div></nav>`;
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

/* Who can actually open the concern inbox, read off the permission model rather than typed
   into the sentence. The page used to name one person ("the designated Escalation Owner
   (Esther)") while two accounts held the escalation role — a safeguarding promise the build
   did not keep, and the kind of drift that only shows up when someone re-reads the roles.
   Derive it, and the sentence cannot go stale when the roles change. */
_escalationOwners(){
  const holders = (__demo.db.config.admins||[]).filter(a=>(a.roles||[]).includes('escalation'));
  const names = holders.map(a=>`${a.name} (${a.role})`);
  if(!names.length) return 'the designated Escalation Owner';
  if(names.length===1) return `the designated Escalation Owner, ${names[0]}`;
  return `the designated escalation route: ${names.slice(0,-1).join(', ')} and ${names[names.length-1]}`;
},

/* ---------- 1.4 concern ---------- */
concern(){
  return this.msNav() + `<div class="doc-page" style="max-width:560px">
    <h1>Raise a concern</h1>
    <p class="lede">If something in your mentoring experience isn't right — for example inappropriate behaviour —
      tell us here, privately.</p>
    <div class="privacy-note">🔒 <span>Your report goes <b>only</b> to ${esc(this._escalationOwners())}.
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
  /* The written no-save notice was removed on Joanne's request (F0818-145038): the browser's own
     leave-page warning already carries it, and the paragraph repeated what the warning says. */
  const foot = `</div></div>`;
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
    <input type="text" id="af-referrer" value="${this._v(S,'referrer')}" placeholder="Name of the person who referred you.">${this._err(S,'referrer')}</div>`:''}
  ${S.d.heard===GRMP.IND_OTHER?`<div class="f-row"><label>Please tell us how <span class="req">*</span></label>
    <input type="text" id="af-heardOther" value="${this._v(S,'heardOther')}" placeholder="Where you heard about GRMP.">${this._err(S,'heardOther')}</div>`:''}`;
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
  ${[S.d.ind1,S.d.ind2,S.d.ind3].includes(GRMP.IND_OTHER)?`<div class="f-row"><label>You chose Other — which industry is it? <span class="req">*</span></label>
    <input type="text" id="af-industryPrefOther" value="${this._v(S,'industryPrefOther')}" placeholder="The industry you have in mind.">
    <div class="f-micro">So we can match you even though it is not on the list.</div>${this._err(S,'industryPrefOther')}</div>`:''}
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
    <div class="f-row"><label>Organisation <span class="req">*</span></label><input type="text" id="af-org" value="${this._v(S,'org')}">${this._err(S,'org')}</div>
    <div class="f-row"><label>Designation <span class="req">*</span></label><input type="text" id="af-designation" value="${this._v(S,'designation')}">${this._err(S,'designation')}</div>
  </div>
  <div class="f-row"><label>Current industry <span class="req">*</span></label>
    <select id="af-industry"><option value=""></option>${GRMP.INDUSTRIES.map(o=>`<option${this._sel(S,'industry',o)}>${esc(o)}</option>`).join('')}</select>${this._err(S,'industry')}</div>
  ${S.d.industry===GRMP.IND_OTHER?`<div class="f-row"><label>Your industry (free text) <span class="req">*</span></label>
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
    <select id="af-contactPref"><option value=""></option><option${this._sel(S,'contactPref','Phone call')}>Phone call</option><option${this._sel(S,'contactPref','Email')}>Email</option></select>${this._err(S,'contactPref')}</div>`:''}
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
      <b>${esc(p.appStatus)}</b>, and your acknowledgement email is in the outbox.</p>
      ${/* Wei Kiat (F0818 group message): applicants must not see the staging pointer, and Esther
            asked the same question in F0816-160640. It stays for a signed-in team account, which
            is who it was written for, labelled so nobody mistakes it for applicant-facing copy. */
        (typeof SESSION!=='undefined' && SESSION && SESSION.identity && SESSION.identity.kind==='admin')
        ? `<p style="font-size:12px;color:var(--ink-3);margin:8px 0 0;border-top:1px dashed var(--line);padding-top:8px">
            <b>Team view only</b> (applicants do not see this line): the record is visible to reviewers in the admin console.
            Open the console from the <b>Open as…</b> switcher (bottom-left) to see the other side of this staging build.</p>`
        : ''}</div>
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
          ${other.linkedin?`<div style="font-size:12px;margin-top:3px"><a href="${esc(/^https?:/i.test(other.linkedin)?other.linkedin:'https://'+other.linkedin)}" target="_blank" rel="noopener">LinkedIn profile ↗</a></div>`:''}
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

  /* --- team-only: what they actually told us on the form ---------------------------
     Every field the application collects has to be readable by someone, or we are asking
     people for personal data under a PDPA consent and then dropping it in a hole. Twelve
     fields were doing exactly that (LinkedIn, phone, preferred contact method, group
     consent, the "Other" free-text, nationality, referrer, how they heard, the returning
     mentor's last-cycle email, the PDPA timestamp). This card is where they surface.
     Team accounts only — deliberately NOT the reviewer's scoring card: nationality and
     the like must not sit in front of someone assigning a score. */
  const teamCard = (typeof SESSION!=='undefined' && SESSION && SESSION.identity
                    && SESSION.identity.kind==='admin') ? (() => {
    const row = (label, value) => value ? `<div style="display:flex;gap:8px;padding:3px 0;font-size:12.5px">
      <span style="color:var(--ink-3);min-width:190px">${esc(label)}</span><span>${esc(String(value))}</span></div>` : '';
    const groupQ = mentee ? 'Mentee Telegram group' : 'Mentor WhatsApp group';
    const groupA = mentee ? p.telegramConsent : p.whatsappConsent;
    const otherInd = p.industryOther || p.industryPrefOther;
    return `<div class="card" style="border-left:3px solid var(--ai-ink)">
      <h3 style="margin-top:0">Application record <span class="badge b-ai" style="font-size:10px">Team view only</span></h3>
      <p style="font-size:11.5px;color:var(--ink-3);margin:-4px 0 8px">What ${esc(p.firstName||p.name)} gave us on the form. Participants do not see this card.</p>
      ${row('Email', p.email)}
      ${row('Phone', p.phone || p.mobile)}
      ${row('LinkedIn', p.linkedin)}
      ${row('Nationality', p.nationality)}
      ${row(groupQ, groupA)}
      ${row('Preferred contact method', p.contactPref)}
      ${row('"Other" industry, in their words', otherInd)}
      ${row('How they heard about GRMP', p.heard === GRMP.IND_OTHER ? p.heardOther : p.heard)}
      ${row('Referred by', p.referrer)}
      ${row('Second faculty / double degree', p.faculty2 && p.faculty2 !== 'Not applicable' ? p.faculty2 : '')}
      ${p.returning ? row('Email used last cycle', p.lastCycleEmail || '(same as above)') : ''}
      ${row('PDPA consent given', p.pdpaAt ? String(p.pdpaAt).replace('T',' ').slice(0,16) + ' SGT' : '')}
      ${row('Anything else they told us', p.anythingElse)}
    </div>`;
  })() : '';

  return this.ppNav('me', personId) + `<div class="pp-shell">
    <div class="pp-head">
      <div class="avatar ${mentee?'av-mentee':'av-mentor'}">${esc(p.name.split(' ').map(w=>w[0]).slice(0,2).join(''))}</div>
      <div><h1>Hi ${esc(p.firstName||p.name.split(' ')[0])}</h1>
        <div class="sub">${mentee?'Mentee':'Mentor'} · ${chip(mentee?(p.industryPrefs||[])[0]:p.industry)} · ${esc(db.config.cohort.label)}
        ${p.previewFastForward?` · <b style="color:var(--ai-ink)">demo fast-forwarded to ${F().closingMonth}</b>`:''}</div></div>
    </div>
    <div style="font-size:11.5px;color:var(--ink-3);margin:-8px 0 14px">🔗 You opened this from your personal link — email + one-time code, no password. That's by design.</div>
    <div class="steps">${steps.map((s,i)=>`<div class="step ${s[1]?'done':(i===curIdx?'cur':'')}"><div class="dot">${s[1]?'✓':i+1}</div><span>${s[0]}</span></div>`).join('')}</div>
    ${nextCard}${vidCard}${certCard}${brCard}${mrCard}${mmrCard}${eeCard}${pairCards}${teamCard}
    ${inferred('Q2')}
  </div>`;
},
};
