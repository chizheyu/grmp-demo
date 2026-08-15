/* GRMP Demo — admin console views (manual ch.4–8). Sign-in simulated; role-scoped. */

const Console = {

/* ---------- 4.0 login ---------- */
login(){
  const db = __demo.db;
  return `<div class="login-wrap"><div class="login-card">
    <h1>GRMP Console</h1>
    <div class="sub">Programme team sign-in · ${db.config.cohort.label}</div>
    ${db.config.admins.map(a=>`
      <button class="login-row" data-goto="#/console/${encodeURIComponent(a.name)}">
        <div class="avatar av-mentor" style="width:36px;height:36px;font-size:12px;border-radius:10px">${a.name.split(' ').map(w=>w[0]).slice(0,2).join('')}</div>
        <div style="flex:1"><b>${a.name}</b><div class="r">${a.role}</div></div>
        <span style="color:var(--ink-3)">→</span>
      </button>`).join('')}
    <div class="sim-note">🔐 In production this is Google sign-in. The demo simulates it — click a person to enter with their permissions.</div>
  </div></div>`;
},

/* ---------- console shell + routing ---------- */
/* Nav is the single source of truth for "which pages can this admin act on".
   The dashboard reads it too, so a tile is only ever made clickable when the
   viewer actually has somewhere to land. */
navItems(db, R){
  const items = [];
  if(R.includes('coordinator')||R.includes('lead')||R.includes('dashboard_viewer')) items.push(['dashboard','📊 Dashboard']);
  if(R.includes('mentor_reviewer')) items.push(['review-mentors','🎓 Review mentors', db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='submitted').length]);
  if(R.includes('mentee_reviewer')) items.push(['review-mentees','👤 Review mentees', db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='submitted').length]);
  if(R.includes('lead')) items.push(['decisions','⚖ Decisions', db.people.filter(p=>p.appStatus==='submitted'&&db.reviews.some(v=>v.personId===p.id)).length]);
  if(R.includes('lead')||R.includes('coordinator')) items.push(['matching','🤝 Matching', db.pairs.filter(p=>p.status==='proposed').length]);
  if(R.includes('lead')||R.includes('coordinator')) items.push(['submissions','📝 Submissions', db.midreviews.length+db.builderReflections.length]);
  if(R.includes('coordinator')) items.push(['reminders','⏰ Reminders']);
  if(R.includes('coordinator')) items.push(['waitlist','📋 Waitlist', db.people.filter(p=>p.appStatus==='waitlisted').length]);
  const pastR = db.config.rotations.filter(r=>db.today>r.end).map(r=>r.n);
  // Exceptions is the Lead's problem too — she is the one the dashboard shows the count to.
  if(R.includes('coordinator')||R.includes('lead')) items.push(['exceptions','⚠ Exceptions', db.pairs.filter(p=>['rematch_needed'].includes(p.status)).length + db.pairs.filter(p=>pastR.includes(p.rotation)&&p.status==='approved').length]);
  if(R.includes('coordinator')) items.push(['events','🎪 Events']);
  if(R.includes('lead')) items.push(['certificates','🏅 Certificates']);
  if(R.includes('escalation')) items.push(['concerns','🔒 Concern inbox', db.concerns.length]);
  // PRD I3: the audit trail was being written but never shown. "Logged" is only half a
  // governance answer — someone has to be able to read it.
  if(R.includes('lead')) items.push(['audit','🧾 Audit log', db.people.filter(p=>p.duplicateFlag).length||0]);
  items.push(['emails','✉ Email log', db.emails.length]);
  items.push(['config','⚙ Configuration']);
  return items;
},
shell(name, view){
  const db = __demo.db;
  const admin = db.config.admins.find(a=>a.name===name);
  if(!admin) return this.login();
  const items = this.navItems(db, admin.roles);
  const cur = view || items[0][0];
  const body = this['v_'+cur.replace(/-/g,'_')] ? this['v_'+cur.replace(/-/g,'_')](admin) :
    `<p>View not available for your role.</p>`;
  return `<div class="co-shell">
    <aside class="co-side">
      <div class="co-brand">GRMP Console<small>${db.config.cohort.label.toUpperCase()}</small></div>
      <nav class="co-nav">
        <div class="lab">${admin.role}</div>
        ${items.map(([k,label,n])=>`<button class="co-item ${k===cur?'on':''}" data-goto="#/console/${encodeURIComponent(name)}/${k}">${label}${n?`<span class="n">${n}</span>`:''}</button>`).join('')}
      </nav>
      <div class="co-user"><b>${admin.name}</b>${admin.role}<br>
        ${(typeof NET!=='undefined'&&NET)?'<button data-act="logout" style="background:none;border:0;color:#9AA2B0;font-size:11px;padding:0;cursor:pointer">Sign out</button>':'<a href="#/console" style="color:#9AA2B0;font-size:11px">Switch user</a>'}</div>
    </aside>
    <main class="co-main">${body}</main>
  </div>`;
},

/* ---------- 6.1 dashboard ---------- */
v_dashboard(admin){
  const db = __demo.db, D = GRMP.D;
  const acc = db.people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus));
  const ackDone = acc.filter(D.ackComplete).length;
  const orient = acc.filter(p=>p.orientation).length;
  const r1closed = db.pairs.filter(p=>p.rotation===1&&p.status==='closed').length;
  const r1total = db.pairs.filter(p=>p.rotation===1&&['approved','closed','replaced'].includes(p.status)).length;
  const CF = D.cohortFacts(db);
  const curN = D.currentRotation(db)?D.currentRotation(db).n:3;
  const r2 = db.pairs.filter(p=>p.rotation===curN&&['approved','closed'].includes(p.status)).length;
  const blocked = db.people.filter(p=>p.appStatus==='accepted'&&D.gateBlocked(p));
  const pastRd = db.config.rotations.filter(r=>db.today>r.end).map(r=>r.n);
  const exceptions = db.pairs.filter(p=>p.status==='rematch_needed').length + db.pairs.filter(p=>pastRd.includes(p.rotation)&&p.status==='approved').length;
  const track = t => db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&p.track===t).length;

  /* --- every number that represents outstanding work must lead somewhere --- */
  const nav = new Set(Console.navItems(db, admin.roles).map(i=>i[0]));
  const to = k => nav.has(k) ? `#/console/${encodeURIComponent(admin.name)}/${k}` : null;
  const stat = (n, label, href, warn) => href
    ? `<a class="stat stat-go" href="${href}"><div class="n"${warn?' style="color:var(--warn)"':''}>${n}</div><div class="l">${label}</div><span class="go">→</span></a>`
    : `<div class="stat"><div class="n"${warn?' style="color:var(--warn)"':''}>${n}</div><div class="l">${label}</div></div>`;

  const decisionsDue = db.people.filter(p=>p.appStatus==='submitted'&&db.reviews.some(v=>v.personId===p.id)).length;
  const proposed = db.pairs.filter(p=>p.status==='proposed').length;
  const unmatchedNow = D.currentRotation(db) ? db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'
    && !D.gateBlocked(p) && !db.pairs.some(x=>x.rotation===curN&&x.menteeId===p.id&&['proposed','approved','closed'].includes(x.status))).length : 0;
  // same rule issueCertificates() applies, so the count equals what "Issue" would produce
  const certsReady = db.people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus)
    && D.certEligible(db,p) && !db.certificates.some(c=>c.personId===p.id)).length;
  const waiting = db.people.filter(p=>p.appStatus==='waitlisted').length;
  // Reviewing is work too — Esther and Wei Kiat both hold reviewer roles, and the
  // sidebar badge was the only place saying so.
  const queue = (kind,role) => admin.roles.includes(role)
    ? db.people.filter(p=>p.kind===kind&&p.appStatus==='submitted').length : 0;
  const mentorsToScore = queue('mentor','mentor_reviewer');
  const menteesToScore = queue('mentee','mentee_reviewer');
  const todo = [
    [mentorsToScore, `mentor application${mentorsToScore===1?'':'s'} waiting for your review score`, to('review-mentors'), 'Score'],
    [menteesToScore, `mentee application${menteesToScore===1?'':'s'} waiting for your review score`, to('review-mentees'), 'Score'],
    [decisionsDue, `application${decisionsDue===1?'':'s'} scored and waiting for your decision`, to('decisions'), 'Decide'],
    [proposed,     `proposed match${proposed===1?'':'es'} awaiting your approval`,               to('matching'),  'Review'],
    [unmatchedNow, `accepted mentee${unmatchedNow===1?'':'s'} still unmatched in Rotation ${curN}`, to('matching'), 'Match'],
    [exceptions,   `close-off / re-match exception${exceptions===1?'':'s'} open`,                 to('exceptions'),'Chase'],
    [blocked.length, `accepted ${blocked.length===1?'person':'people'} blocked at the gates`,     to('reminders'), 'Remind'],
    [db.concerns.length, `concern${db.concerns.length===1?'':'s'} in your private inbox`,         to('concerns'),  'Open'],
    [certsReady,   `certificate${certsReady===1?'':'s'} ready to issue`,                          to('certificates'),'Issue'],
    [waiting,      `applicant${waiting===1?'':'s'} on the waitlist`,                              to('waitlist'),  'Promote'],
  ].filter(([n,,href])=>n>0 && href);

  return `<h1 class="co-title">Dashboard</h1>
  <p class="co-sub">Single source of truth · simulated today: ${db.today}${D.currentRotation(db)?` · Rotation ${D.currentRotation(db).n} (${D.currentRotation(db).label}) is running`:' · closing phase'}.</p>
  <div class="worklist">
    <b class="wl-h">${todo.length?`What needs you (${todo.length})`:'Nothing needs you right now'}</b>
    ${todo.length
      ? todo.map(([n,label,href,cta])=>`<div class="wl-row"><span class="wl-n">${n}</span>
          <span class="wl-l">${label}</span>
          <a class="btn sm btn-primary wl-b" href="${href}">${cta} →</a></div>`).join('')
      : `<p class="wl-empty">No decisions, matches, exceptions or certificates are waiting on you. The counters below are the cohort's standing state.</p>`}
  </div>
  <div class="funnel-grid">
    ${stat(`${db.people.filter(p=>p.kind==='mentee').length} / ${db.people.filter(p=>p.kind==='mentor').length}`, 'Mentee / mentor applications', null)}
    ${stat(`${CF.mentors} + ${CF.mentees}`, `Accepted (incl. ${CF.bench} bench mentors)`, null)}
    ${stat(`${ackDone}<span style="font-size:13px;color:var(--ink-3)">/${acc.length}</span>`, 'Acknowledged (binding gate)', to('reminders'))}
    ${stat(`${orient}<span style="font-size:13px;color:var(--ink-3)">/${acc.length}</span>`, 'Orientation complete', to('reminders'))}
    ${stat(`${r1closed}/${r1total}`, 'R1 closed off', to('exceptions'))}
    ${stat(r2, `R${curN} pairs`, to('matching'))}
    ${stat(exceptions, 'Open exceptions', to('exceptions'), exceptions>0)}
    ${stat(`${track('general')}·${track('entrepreneurship')}·${track('ai')}`, 'Mentees by track (G·E·AI)', null)}
    ${stat(db.midreviews.length, 'Mid-programme reviews in', to('submissions'))}
    ${stat(db.builderReflections.length, 'Builder Reflections in', to('submissions'))}
    ${stat(db.certificates.length, 'Certificates issued', to('certificates'))}
    ${stat(db.events.kickoff.attendance.length, 'Kickoff attendance', to('events'))}
  </div>
  ${admin.roles.includes('lead')?`<div style="margin:-6px 0 14px"><button class="btn sm btn-ghost" data-act="exportReport">⬇ Export cohort report (CSV)</button>
    <span style="font-size:11px;color:var(--ink-3);margin-left:8px">export restricted to Programme Lead + System Administrator</span></div>`:''}
  ${blocked.length?`<div class="qcard"><b style="font-size:13.5px">⛔ Blocked at the gates (${blocked.length})</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 8px">Accepted but not yet matchable — acknowledgement or orientation outstanding. The system will not let these into matching.</p>
    ${blocked.map(p=>`<div style="display:flex;gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--line-2);font-size:13px">
      <b>${p.name}</b><span class="track-chip track-${p.track}">${GRMP.TRACKS[p.track].label}</span>
      <span style="color:var(--ink-3);font-size:12px">${D.ackComplete(p)?'✓ acknowledged':'✗ acknowledgement'} · ${p.orientation?'✓ orientation':'✗ orientation'}</span>
      <a style="margin-left:auto;font-size:12px" href="#/me/${p.id}">open their page →</a></div>`).join('')}</div>`:''}
  ${inferred('Q7')}`;
},

/* ---------- 4.1 reviewer queues ---------- */
v_review_mentors(admin){ return this._review(admin,'mentor'); },
v_review_mentees(admin){ return this._review(admin,'mentee'); },
_review(admin, kind){
  const db = __demo.db, D = GRMP.D;
  const queue = db.people.filter(p=>p.kind===kind && p.appStatus==='submitted');
  const scored = db.people.filter(p=>p.kind===kind && p.appStatus!=='submitted' && db.reviews.some(v=>v.personId===p.id)).slice(0,4);
  return `<h1 class="co-title">Review ${kind}s</h1>
  <p class="co-sub">Score lightly (1–5) and comment. You recommend — the Programme Lead decides. The AI summary speeds reading; it never recommends an outcome.</p>
  ${queue.length? queue.map(p=>`
    <div class="qcard" id="q-${p.id}">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <b style="font-size:14.5px">${p.name}</b>
        <span class="track-chip track-${p.track}">${GRMP.TRACKS[p.track].label}</span>
        <span class="badge b-neut"><span class="d"></span>submitted ${p.submittedAt}</span>
      </div>
      <div class="ai-block" data-ai-sum="${p.id}"><div class="t">✦ AI summary — <span class="ai-src">${(window.AI&&AI.cache['sum:'+p.id])?'generated live':'template · generating…'}</span></div><div class="ai-txt">${(window.AI&&AI.cache['sum:'+p.id])||D.aiSummary(p)}</div></div>
      <div style="font-size:12.5px;color:var(--ink-2)">
        ${kind==='mentee' ? `Goals: ${p.goals||'—'} · Needs: ${p.devNeeds||'—'} · ${p.course||''} yr ${p.year||''}`
                          : `${p.role||''} @ ${p.org||''} · ${p.background||''}`}</div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap">
        <select id="sc-${p.id}" style="border:1px solid var(--line);border-radius:8px;padding:7px 10px">
          <option value="5">5 — outstanding</option><option value="4" selected>4 — strong</option>
          <option value="3">3 — adequate</option><option value="2">2 — weak</option><option value="1">1 — not ready</option></select>
        <input id="cm-${p.id}" type="text" placeholder="Comment (optional)" style="flex:1;min-width:180px;border:1px solid var(--line);border-radius:8px;padding:7px 10px">
        <button class="btn sm btn-primary" data-act="score" data-person="${p.id}" data-reviewer="${admin.name}">Submit score</button>
      </div>
      ${db.reviews.filter(v=>v.personId===p.id).map(v=>`<div style="font-size:12px;color:var(--ink-3);margin-top:6px">✓ ${v.reviewer}: ${v.score}/5 ${v.comment?('— '+v.comment):''}</div>`).join('')}
    </div>`).join('')
  : `<div class="qcard">Queue clear — no new ${kind} applications awaiting review. (Submit one from the public site to see it appear here.)</div>`}
  <h3 style="margin:20px 0 8px;font-size:14px;color:var(--ink-2)">Recently scored (sample)</h3>
  ${scored.map(p=>`<div class="qcard" style="padding:10px 16px;font-size:13px;display:flex;gap:10px;align-items:center">
    <b>${p.name}</b><span class="track-chip track-${p.track}">${GRMP.TRACKS[p.track].label}</span>
    <span style="color:var(--ink-3)">${db.reviews.filter(v=>v.personId===p.id).map(v=>`${v.reviewer} ${v.score}/5`).join(' · ')}</span>
    <span class="badge b-neut" style="margin-left:auto">${p.appStatus}</span></div>`).join('')}`;
},

/* ---------- 5.1 decisions ---------- */
v_decisions(admin){
  const db = __demo.db, D = GRMP.D;
  const ready = db.people.filter(p=>p.appStatus==='submitted' && db.reviews.some(v=>v.personId===p.id));
  const noScores = db.people.filter(p=>p.appStatus==='submitted' && !db.reviews.some(v=>v.personId===p.id));
  return `<h1 class="co-title">Decisions</h1>
  <p class="co-sub">Single decision authority: you. Reviewers recommend; every acceptance, bench placement, waitlist and decline is yours, logged and auditable. Each decision sends the outcome email automatically.</p>
  ${ready.length? ready.map(p=>`
    <div class="qcard">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <b style="font-size:14.5px">${p.name}</b>
        <span class="track-chip track-${p.track}">${GRMP.TRACKS[p.track].label}</span>
        <span style="font-size:12.5px;color:var(--ink-2)">${db.reviews.filter(v=>v.personId===p.id).map(v=>`${v.reviewer}: <b>${v.score}/5</b>`).join(' · ')}</span>
      </div>
      <div class="ai-block" data-ai-sum="${p.id}"><div class="t">✦ AI summary — <span class="ai-src">${(window.AI&&AI.cache['sum:'+p.id])?'generated live':'template · generating…'}</span></div><div class="ai-txt">${(window.AI&&AI.cache['sum:'+p.id])||D.aiSummary(p)}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <button class="btn sm btn-ok" data-act="decide" data-person="${p.id}" data-decision="accepted" data-actor="${admin.name}">Accept</button>
        ${p.kind==='mentor'?`<button class="btn sm btn-ghost" data-act="decide" data-person="${p.id}" data-decision="reserve_bench" data-actor="${admin.name}">Reserve bench</button>`:''}
        <button class="btn sm btn-ghost" data-act="decide" data-person="${p.id}" data-decision="waitlisted" data-actor="${admin.name}">Waitlist</button>
        <button class="btn sm btn-ghost" style="color:var(--red)" data-act="decide" data-person="${p.id}" data-decision="declined" data-actor="${admin.name}">Decline</button>
      </div></div>`).join('')
  : (()=>{
      // An empty queue must still tell you what to do next, or the visit was wasted.
      const R=admin.roles, me=encodeURIComponent(admin.name);
      const mentorsToScore=db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='submitted').length;
      const menteesToScore=db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='submitted').length;
      const ctas=[];
      if(mentorsToScore&&R.includes('mentor_reviewer'))
        ctas.push(`<a class="btn sm btn-primary" style="text-decoration:none" href="#/console/${me}/review-mentors">Score ${mentorsToScore} mentor application${mentorsToScore>1?'s':''} →</a>`);
      if(menteesToScore&&R.includes('mentee_reviewer'))
        ctas.push(`<a class="btn sm btn-primary" style="text-decoration:none" href="#/console/${me}/review-mentees">Score ${menteesToScore} mentee application${menteesToScore>1?'s':''} →</a>`);
      ctas.push(`<a class="btn sm btn-ghost" style="text-decoration:none" href="#/apply/mentee">Submit a test application →</a>`);
      return `<div class="qcard empty-state"><b style="font-size:13.5px">Nothing to decide yet.</b>
        <p style="font-size:13px;color:var(--ink-2);margin:6px 0 10px">${noScores.length
          ? `${noScores.length} submitted application${noScores.length>1?'s are':' is'} still waiting for reviewer scores — decisions appear here the moment an application has been scored.`
          : 'Applications appear here once a reviewer has scored them.'}</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap">${ctas.join('')}</div></div>`;
    })()}`;
},

/* ---------- 5.2 matching board ---------- */
v_matching(admin){
  const db = __demo.db, D = GRMP.D;
  const rotNow = D.currentRotation(db);
  const rot = rotNow ? rotNow.n : 3;
  const tracks = ['general','entrepreneurship','ai'];
  // During the paced reveal, a proposal already exists in the db but has not been shown
  // yet — its mentee still counts as unmatched so the counter ticks down card by card.
  const hidden = window.__hiddenProposals;
  const activePair = x => ['proposed','approved','closed'].includes(x.status) && !(hidden && hidden.has(x.id));
  const unmatched = t => db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&p.track===t
    && !D.gateBlocked(p)
    && !db.pairs.some(x=>x.rotation===rot&&x.menteeId===p.id&&activePair(x)));
  const proposed = db.pairs.filter(p=>p.rotation===rot&&p.status==='proposed'&&!(hidden&&hidden.has(p.id)));
  const rotLabel = db.config.rotations.find(r=>r.n===rot).label;
  return `<h1 class="co-title">Matching — Rotation ${rot} (${rotLabel})</h1>
  <p class="co-sub">Strictly within track. Hard constraints enforced: ≤2 mentees per mentor · no conflict · no repeat mentor.
  The system scores every eligible mentor on the four criteria and proposes the top match with its reasons; nothing is matched until you approve it.<br>
  <span style="color:var(--ink-3)">Scoring is a first-cut rule set tuned to the sample data — the weights and rules get re-tuned with the programme team once the next cycle's real form fields are fixed.</span></p>
  ${inferred('Q3')}
  <div class="funnel-grid" style="grid-template-columns:repeat(3,1fr)">
    ${tracks.map(t=>`<div class="stat"><div class="n">${unmatched(t).length}</div>
      <div class="l">${GRMP.TRACKS[t].label} mentees unmatched</div>
      <button class="btn sm btn-ai" style="margin-top:8px" data-act="suggest" data-rotation="${rot}" data-track="${t}"
        ${window.__suggestBusy?'disabled':''}>${window.__suggestBusy===t?'Scoring the pool…':'✦ Suggest matches'}</button></div>`).join('')}
  </div>
  <p style="font-size:11.5px;color:var(--ink-3);margin:-6px 0 12px">The unmatched above are staged in the sample cohort. Suggest scores each of them against every eligible mentor — deterministic and auditable, which is why it is fast.</p>
  ${proposed.length? `<h3 style="margin:8px 0 10px;font-size:14.5px">Proposed — awaiting your approval (${proposed.length})</h3>`:''}
  ${proposed.map(x=>{
    const m=D.person(db,x.mentorId), e=D.person(db,x.menteeId);
    return `<div class="pair-row" data-ai-pair="${x.id}">
      <div class="who"><b>${e.name}</b> <span class="track-chip track-${e.track}">${GRMP.TRACKS[e.track].label}</span>
        <div class="sub">${e.course}, yr ${e.year} · wants: ${(e.goals||'').slice(0,64)}…</div></div>
      <div style="color:var(--ai);font-weight:800">→</div>
      <div class="who"><b>${m.name}</b><div class="sub">${m.role} · ${m.org}</div></div>
      ${admin.roles.includes('lead')?`<button class="btn sm btn-primary" data-act="approvePair" data-pair="${x.id}" data-actor="${admin.name}">Approve match</button>`:`<span class="badge b-warn"><span class="d"></span>awaiting Programme Lead approval</span>`}
      <ul class="why">${x.rationale.map(r=>`<li>${r}</li>`).join('')}
        <li style="color:var(--ai-ink);font-weight:650">${x.adjustedBy?`Adjusted by ${x.adjustedBy} — the decision is yours.`:'System-ranked — the decision above is yours.'}</li></ul>
      ${admin.roles.includes('lead')?(()=>{
        const alts=D.alternativesFor(db,x.id,3);
        return `<details class="alts"><summary>Not this one? See the next ${alts.length} the ranking offers, or discard</summary>
        ${alts.map(a=>`<div class="alt-row">
          <div class="alt-who"><b>${a.m.name}</b> <span class="alt-sub">${a.m.role} · ${a.m.org}</span>
            <div class="alt-why">${a.reasons.length?a.reasons[0]:'No development-need or industry signal — availability only'}</div></div>
          <span class="alt-score">score ${Math.round(a.score*10)/10}</span>
          <button class="btn sm btn-ghost" data-act="reassignPair" data-pair="${x.id}" data-mentor="${a.m.id}" data-actor="${admin.name}">Use this mentor</button>
        </div>`).join('')||'<div class="alt-row"><span class="alt-sub">No other eligible mentor has capacity in this track right now.</span></div>'}
        <div class="alt-row"><span class="alt-sub" style="flex:1">Discard this suggestion — the mentee returns to the unmatched pool and can be suggested again.</span>
          <button class="btn sm btn-ghost" data-act="discardPair" data-pair="${x.id}" data-actor="${admin.name}">Discard</button></div>
        </details>`;})():''}
    </div>`;}).join('')}
  ${(()=>{
    const done = db.pairs.filter(p=>p.rotation===rot&&['approved','closed'].includes(p.status))
      .sort((a,b)=>String(b.approvedAt||'').localeCompare(String(a.approvedAt||'')));
    if(!done.length) return '';
    const row = x=>{const m=D.person(db,x.mentorId), e=D.person(db,x.menteeId);
      return `<tr><td><b>${e?e.name:x.menteeId}</b></td><td>${m?m.name:x.mentorId}</td>
        <td><span class="track-chip track-${e?e.track:'general'}">${e?GRMP.TRACKS[e.track].label:''}</span></td>
        <td style="white-space:nowrap">${x.approvedAt||'—'}</td>
        <td>${x.status==='closed'?'<span class="badge b-ok"><span class="d"></span>Closed off</span>':'<span class="badge b-neut"><span class="d"></span>Running</span>'}</td></tr>`;};
    const HEAD = '<tr><th>Mentee</th><th>Mentor</th><th>Track</th><th>Approved</th><th>Status</th></tr>';
    // Newest first, and only the recent ones by default — the rest is seeded history
    // nobody needs to scroll past to find what they just approved.
    const recent = done.slice(0,8), older = done.slice(8);
    const dates = done.map(x=>x.approvedAt).filter(Boolean).sort();
    const span = dates.length>1 && dates[0]!==dates[dates.length-1]
      ? ` <span style="font-weight:400;font-size:12px;color:var(--ink-3)">· approved ${GRMP.D.fmtDMY(dates[0])} – ${GRMP.D.fmtDMY(dates[dates.length-1])}, newest first</span>` : '';
    return `<h3 style="margin:18px 0 8px;font-size:14.5px">Approved this rotation (${done.length})${span}</h3>
    <table class="tb">${HEAD}${recent.map(row).join('')}</table>
    ${older.length?`<details class="alts" style="margin-top:6px"><summary>Show the earlier ${older.length} approved this rotation</summary>
      <table class="tb" style="margin-top:6px">${HEAD}${older.map(row).join('')}</table></details>`:''}`;
  })()}`;
},

/* ---------- I3 audit log ---------- */
v_audit(admin){
  const db = __demo.db, D = GRMP.D;
  const dupes = db.people.filter(p=>p.duplicateFlag);
  const log = [...db.audit].reverse().slice(0,120);
  const who = id => (D.person(db,id)||{}).name || id;
  return `<h1 class="co-title">Audit log</h1>
  <p class="co-sub">Every decision, acknowledgement, match and export — who did it and when, to the minute. Visible to the Programme Lead and System Administrator only. This is the answer to “who changed what, and when”.</p>
  ${dupes.length?`<div class="qcard" style="border-left:3px solid var(--warn)">
    <b style="font-size:13.5px">⚠ Duplicate applications flagged (${dupes.length})</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 8px">Same email applied more than once. Both records are kept and flagged — nothing is merged or rejected automatically.</p>
    ${dupes.map(p=>`<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-top:1px solid var(--line-2);font-size:13px">
      <b>${p.name}</b><span style="color:var(--ink-3);font-size:12px">${p.email}</span>
      <span class="badge b-warn"><span class="d"></span>${p.duplicateOf?'later submission':'original'}</span>
      <a style="margin-left:auto;font-size:12px" href="#/me/${p.id}">open their page →</a></div>`).join('')}
  </div>`:''}
  <table class="tb"><tr><th>When</th><th>Actor</th><th>Action</th><th>Record</th></tr>
  ${log.map(a=>{
    // Only the real instant is shown. The cohort's simulated date is a demo artefact —
    // in production the two are the same date, so a second column asks a question
    // instead of answering one. `at` stays in the record for the domain to use.
    const real = a.ts ? new Date(a.ts).toLocaleString('en-SG',{timeZone:'Asia/Singapore',
      year:'numeric',month:'short',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})
      : `<span style="color:var(--ink-3)" title="written before timestamps were recorded">${a.at}</span>`;
    return `<tr><td style="white-space:nowrap">${real}</td><td>${a.actor}</td>
      <td>${String(a.action).replace(/_/g,' ')}</td><td>${who(a.entity)}</td></tr>`;}).join('')}
  </table>
  ${db.audit.length>120?`<p style="font-size:12px;color:var(--ink-3);margin-top:8px">Showing the 120 most recent of ${db.audit.length} entries.</p>`:''}`;
},

/* ---------- 6.2 reminders ---------- */
v_reminders(admin){
  const db = __demo.db, CF = GRMP.D.cohortFacts(__demo.db);
  return `<h1 class="co-title">Reminders — the machine chases, not you</h1>
  <p class="co-sub">Every reminder is rule-triggered from the tracker. The ${CF.applyMonth} acknowledgement ladder has fired (history below); rotation and checkpoint reminders continue automatically.</p>
  ${inferred('Q5')}
  <table class="tb"><tr><th>When</th><th>What</th><th>Who receives it</th><th>Status</th></tr>
    ${db.config.ackLadder.map(l=>`<tr><td>${l.date} (${l.week})</td><td>${l.what}</td><td>outstanding acknowledgements only</td>
      <td><span class="badge b-ok"><span class="d"></span>fired</span></td></tr>`).join('')}
    <tr><td>rotation end −7d</td><td>Close-off reminder</td><td>mentees with open close-off</td><td><span class="badge b-neut"><span class="d"></span>scheduled</span></td></tr>
    <tr><td>rotation end +1d</td><td>Close-off escalation</td><td>coordinator queue</td><td><span class="badge b-neut"><span class="d"></span>scheduled</span></td></tr>
    <tr><td>${CF.midMonth} window</td><td>Mid-programme review request</td><td>mentors</td><td><span class="badge b-neut"><span class="d"></span>scheduled</span></td></tr>
    <tr><td>${CF.closingMonth} window</td><td>Builder’s Commitment request</td><td>mentees</td><td><span class="badge b-neut"><span class="d"></span>scheduled</span></td></tr>
  </table>
  ${(()=>{
    const pend = D.pendingWithdrawal(db);
    if(!D.finalReminderPassed(db))
      return `<div class="qcard" style="margin-top:12px"><b style="font-size:13.5px">Seat release</b>
        <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 0">The final reminder (${(db.config.ackLadder.slice(-1)[0]||{}).date}) has not passed yet, so nobody can be withdrawn.</p></div>`;
    if(!pend.length)
      return `<div class="qcard" style="margin-top:12px"><b style="font-size:13.5px">Seat release</b>
        <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 0">Everyone accepted has acknowledged. Nothing to release.</p></div>`;
    return `<div class="qcard" style="margin-top:12px;border-left:3px solid var(--warn)">
      <b style="font-size:13.5px">Seat release — ${pend.length} still unacknowledged after the final reminder</b>
      <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 8px">Per the Q5 default they are treated as withdrawn and their seats freed for the waitlist. This is your call, not an automatic one.</p>
      ${pend.map(p=>`<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-top:1px solid var(--line-2);font-size:13px">
        <b>${p.name}</b><span class="track-chip track-${p.track}">${GRMP.TRACKS[p.track].label}</span>
        <span style="color:var(--ink-3);font-size:12px">${D.ackComplete(p)?'':'acknowledgement outstanding'}</span></div>`).join('')}
      <button class="btn sm btn-primary" style="margin-top:10px" data-act="withdrawUnack" data-actor="${admin.name}">Release ${pend.length} seat${pend.length>1?'s':''} →</button>
    </div>`;
  })()}`;
},

/* ---------- 6.3 waitlist ---------- */
v_waitlist(admin){
  const db = __demo.db;
  const wl = db.people.filter(p=>p.appStatus==='waitlisted')
    .map(p=>({p, score: db.reviews.filter(v=>v.personId===p.id).reduce((s,v)=>s+v.score,0)/Math.max(1,db.reviews.filter(v=>v.personId===p.id).length)}))
    .sort((a,b)=>b.score-a.score);
  return `<h1 class="co-title">Waitlist</h1>
  <p class="co-sub">Ranked by reviewer score. When capacity opens, promote the top — one click moves them into the accepted flow (acknowledgement, orientation, matching).</p>
  <table class="tb"><tr><th>#</th><th>Name</th><th>Kind</th><th>Track</th><th>Avg score</th><th></th></tr>
  ${wl.map((r,i)=>`<tr><td>${i+1}</td><td><b>${r.p.name}</b></td><td>${r.p.kind}</td>
    <td><span class="track-chip track-${r.p.track}">${GRMP.TRACKS[r.p.track].label}</span></td>
    <td>${r.score.toFixed(1)}</td>
    <td><button class="btn sm btn-primary" data-act="promote" data-person="${r.p.id}" data-actor="${admin.name}">Promote</button></td></tr>`).join('')}
  </table>`;
},

/* ---------- 6.4/6.6 exceptions ---------- */
v_exceptions(admin){
  const db = __demo.db, D = GRMP.D;
  const pastRots = db.config.rotations.filter(r=>db.today>r.end).map(r=>r.n);
  const missing = db.pairs.filter(p=>pastRots.includes(p.rotation)&&p.status==='approved');
  const rematch = db.pairs.filter(p=>p.status==='rematch_needed');
  const bench = t => db.people.filter(p=>p.appStatus==='reserve_bench'&&p.track===t);
  return `<h1 class="co-title">Exceptions</h1>
  <p class="co-sub">The only things the system escalates: a close-off not completed after a rotation, and a mentor dropout. Everything else, the pair manages themselves.</p>
  <h3 style="font-size:14.5px;margin:6px 0 8px">Rotation 1 close-off missing (${missing.length})</h3>
  ${missing.map(x=>{const e=D.person(db,x.menteeId), m=D.person(db,x.mentorId);
    return `<div class="pair-row"><div class="who"><b>${e.name}</b><div class="sub">paired with ${m.name} · R${x.rotation} ended · <b style="color:var(--warn)">close-off overdue</b></div></div>
      <button class="btn sm btn-ghost" data-act="remindCloseoff" data-email="${e.email}">Remind again</button>
      <a class="btn sm btn-ghost" href="#/me/${e.id}" style="text-decoration:none">Open their page</a></div>`;}).join('')||'<p style="color:var(--ink-3)">None.</p>'}
  <h3 style="font-size:14.5px;margin:18px 0 8px">Mentor dropout — replacement needed (${rematch.length})</h3>
  ${rematch.map(x=>{const e=D.person(db,x.menteeId); const old=D.person(db,x.mentorId); const b=bench(old.track);
    return `<div class="pair-row"><div class="who"><b>${e.name}</b><div class="sub">${old.name} dropped out ${old.droppedOut.at} (${old.droppedOut.reason}) · replace from same-track reserve bench within 7 days</div></div>
      ${b.length? `<select id="bench-${x.id}" style="border:1px solid var(--line);border-radius:8px;padding:7px 10px">
          ${b.map(bm=>`<option value="${bm.id}">${bm.name} — ${bm.role}, ${bm.org}</option>`).join('')}</select>
        <button class="btn sm btn-primary" data-act="replaceMentorSel" data-pair="${x.id}" data-actor="${admin.name}">Assign replacement</button>`
        : '<span class="badge b-risk"><span class="d"></span>no same-track bench mentor left</span>'}</div>`;}).join('')||'<p style="color:var(--ink-3)">None.</p>'}
  ${(()=>{
    // Manual 6.6, first half — the coordinator has to be able to RECORD a dropout, not
    // just process one the seed staged. Only mentors currently serving are offered.
    const serving = db.people.filter(m=>m.kind==='mentor'&&m.appStatus==='accepted'&&!m.droppedOut
      && db.pairs.some(p=>p.mentorId===m.id&&p.status==='approved'));
    if(!serving.length) return '';
    return `<div class="qcard" style="margin-top:16px"><b style="font-size:13.5px">Mark a mentor as dropped out</b>
      <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 10px">Their current-rotation mentees move into the re-match queue above, restricted to same-track reserve-bench mentors. Target: replacement within 7 days.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <select id="drop-mentor" aria-label="Mentor who dropped out" style="border:1px solid var(--line);border-radius:8px;padding:7px 10px;max-width:320px">
          ${serving.map(m=>`<option value="${m.id}">${m.name} — ${m.role}, ${m.org} (${db.pairs.filter(p=>p.mentorId===m.id&&p.status==='approved').length} active mentee(s))</option>`).join('')}</select>
        <input type="text" id="drop-reason" aria-label="Reason" placeholder="reason (e.g. work relocation)" style="border:1px solid var(--line);border-radius:8px;padding:7px 10px;flex:1;min-width:180px">
        <button class="btn sm btn-ghost" style="color:var(--red)" data-act="markDropout" data-actor="${admin.name}">Mark dropped</button>
      </div></div>`;
  })()}`;
},

/* ---------- 6.5 events ---------- */
v_events(admin){
  const db = __demo.db;
  const acc = db.people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus));
  const ev = db.events;
  const row = (key,e)=>`<div class="qcard"><b style="font-size:14px">${e.name}</b>
    <span style="font-size:12px;color:var(--ink-3)"> · ${e.date}${e.time?` · ${e.time}`:''}${e.venue?` · ${e.venue}`:''} · ${e.attendance.length}/${acc.length} checked in</span>
    <div style="max-height:220px;overflow-y:auto;margin-top:10px;border-top:1px solid var(--line-2)">
    ${acc.slice(0,30).map(p=>`<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line-2);font-size:13px">
      <span style="flex:1"><b>${p.name}</b> <span style="color:var(--ink-3);font-size:11.5px">${p.kind}</span></span>
      <button class="btn sm ${e.attendance.includes(p.id)?'btn-ok':'btn-ghost'}" data-act="checkin" data-event="${key}" data-person="${p.id}">
        ${e.attendance.includes(p.id)?'✓ Present':'Check in'}</button></div>`).join('')}
    <div style="font-size:11.5px;color:var(--ink-3);padding:6px 0">…list truncated in demo (showing 30 of ${acc.length}); search comes with the real build.</div></div></div>`;
  const noOrient = acc.filter(p=>!p.orientation);
  const orientRow = `<div class="qcard"><b style="font-size:14px">Orientation — live session</b>
    <span style="font-size:12px;color:var(--ink-3)"> · mark in-person attendance (per your rule: live = tracked in person) · ${acc.length-noOrient.length}/${acc.length} complete</span>
    ${noOrient.length? `<div style="margin-top:10px;border-top:1px solid var(--line-2)">
      ${noOrient.slice(0,20).map(p=>`<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line-2);font-size:13px">
        <span style="flex:1"><b>${p.name}</b> <span style="color:var(--ink-3);font-size:11.5px">${p.kind}</span></span>
        <button class="btn sm btn-ghost" data-act="orient" data-person="${p.id}" data-mode="live">Mark attended</button></div>`).join('')}
      </div>` : '<div style="font-size:12.5px;color:var(--ok);margin-top:8px">Everyone has completed orientation (live or recorded).</div>'}</div>`;
  return `<h1 class="co-title">Events check-in</h1>
  <p class="co-sub">Built for a phone at the door. Attendance feeds completion recognition (Kickoff) and the cohort report (Appreciation Night). SMC Hikes are a separate programme — not tracked here.</p>
  ${orientRow}${row('kickoff',ev.kickoff)}${row('appreciation',ev.appreciation)}`;
},

/* ---------- 5.4 certificates ---------- */
v_certificates(admin){
  const db = __demo.db, D = GRMP.D, CF = D.cohortFacts(db);
  const isLead = admin.roles.includes('lead');
  const acc = db.people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus));
  const rows = acc.map(p=>{
    const missing = D.certMissing(db,p);
    const total = p.kind==='mentee'?4:2;
    const cert = db.certificates.find(c=>c.personId===p.id);
    return {p, missing, cert, eligible:!missing.length, progress:(total-missing.length)/total};
  }).sort((a,b)=> (b.cert?1:0)-(a.cert?1:0) || (b.eligible?1:0)-(a.eligible?1:0)
                || b.progress-a.progress || a.p.name.localeCompare(b.p.name));
  const eligibleN = rows.filter(r=>r.eligible&&!r.cert).length;
  const excRows = rows.filter(r=>!r.cert&&!r.eligible).slice(0,15);
  const excTotal = rows.filter(r=>!r.cert&&!r.eligible).length;
  const crit = p=>p.kind==='mentee'
    ? '3 close-offs · mid-prog review (R2) · end-prog evaluation (R3) · Builder’s Commitment'
    : 'mid-prog feedback · end-prog evaluation';
  return `<h1 class="co-title">Certificates</h1>
  <p class="co-sub">Certificates are <b>printed and presented at the Appreciation Night</b> (${CF.appreciationDate||CF.closingMonth}).
  This page tracks who qualifies under the completion criteria and records the decision; the email participants get is a heads-up, not the certificate itself.</p>
  ${inferred('Q2')}
  <div style="margin:0 0 14px"><button class="btn btn-primary" data-act="issueCerts" data-actor="${admin.name}">Mark all qualifying certificates ready (${eligibleN})</button></div>
  <table class="tb"><tr><th>Name</th><th>Kind</th><th>Progress against the criteria</th><th>Status</th></tr>
  ${(()=>{
    const row = r=>`<tr><td><b>${r.p.name}</b>${r.p.previewFastForward?' <span class="badge b-ai">fast-forward preview</span>':''}</td><td>${r.p.kind}</td>
      <td style="font-size:12px">${r.missing.length?`missing: ${r.missing.join(' · ')}`:'all criteria met ✓'}</td>
      <td>${r.cert? (r.cert.byException
              ? `<span class="badge b-warn" title="${(r.cert.byException.reason||'').replace(/"/g,'&quot;')}"><span class="d"></span>By exception · ${r.cert.byException.by}</span>`
              : '<span class="badge b-ok"><span class="d"></span>Ready · presented at Appreciation Night</span>')
          : r.eligible?'<span class="badge b-warn"><span class="d"></span>Qualifies — not yet marked</span>'
          :'<span class="badge b-neut"><span class="d"></span>In progress</span>'}</td></tr>`;
    const head = rows.slice(0,25), tail = rows.slice(25);
    const mentees = head.filter(r=>r.p.kind==='mentee').length;
    return head.map(row).join('') + `</table>
    <p style="font-size:11.5px;color:var(--ink-3);margin-top:8px">Criteria — mentee: ${crit({kind:'mentee'})}. Mentor: ${crit({kind:'mentor'})}.
    Showing the 25 furthest along (${mentees} mentees, ${head.length-mentees} mentors) of ${rows.length}; most of the cohort is naturally “in progress” at this point in the cycle.</p>
    ${tail.length?`<details class="alts"><summary>Show the remaining ${tail.length}</summary>
      <table class="tb" style="margin-top:6px"><tr><th>Name</th><th>Kind</th><th>Progress against the criteria</th><th>Status</th></tr>
      ${tail.map(row).join('')}</table></details>`:''}`;
  })()}
  <h3 style="font-size:14.5px;margin:20px 0 6px">Exception report — close to qualifying, or needs a call</h3>
  <p style="font-size:12.5px;color:var(--ink-3);margin:0 0 10px">Everyone below misses at least one criterion. ${isLead
    ? 'As Programme Lead you can approve a certificate <b>by exception</b> — the reason is mandatory, shown on the record and written to the audit log.'
    : 'Only the Programme Lead can approve a certificate by exception.'}</p>
  ${excRows.length?`<table class="tb"><tr><th>Name</th><th>Kind</th><th>Missing</th>${isLead?'<th>Approve by exception</th>':''}</tr>
    ${excRows.map(r=>`<tr><td><b>${r.p.name}</b>${r.p.previewFastForward?' <span class="badge b-ai">fast-forward preview</span>':''}</td><td>${r.p.kind}</td>
      <td style="font-size:12px">${r.missing.join(' · ')}</td>
      ${isLead?`<td style="min-width:260px"><div style="display:flex;gap:6px">
        <input type="text" id="exc-reason-${r.p.id}" placeholder="Reason (required, audited)" style="flex:1;font-size:12px;padding:6px 8px;border:1px solid var(--line-2);border-radius:7px">
        <button class="btn sm" data-act="certException" data-person="${r.p.id}" data-actor="${admin.name}">Approve</button></div></td>`:''}</tr>`).join('')}
  </table>
  ${excTotal>excRows.length?`<p style="font-size:11.5px;color:var(--ink-3)">Showing the ${excRows.length} closest to qualifying of ${excTotal}. The rest are early in the cycle — this report matters most in ${CF.closingMonth}.</p>`:''}`
  :'<p style="font-size:13px;color:var(--ink-3)">Everyone has either qualified or been marked ready — nothing to review.</p>'}`;
},

/* ---------- submissions: reviews, reflections, close-off notes ---------- */
v_submissions(admin){
  const db = __demo.db, D = GRMP.D, CF = D.cohortFacts(__demo.db);
  const notes = db.pairs.filter(p=>p.status==='closed'&&p.closeoff&&p.closeoff.comment).slice(-12).reverse();
  return `<h1 class="co-title">Submissions</h1>
  <p class="co-sub">Everything participants have written, in one place — visible to the Programme Lead and Coordinator only. (Private reflections are never here: they live outside the system by design.)</p>
  <p style="font-size:11.5px;color:var(--ink-3);margin:-6px 0 14px">Entries dated after the simulated today come from the two <b>fast-forward preview</b> pairs — real samples to read before the ${CF.midMonth} and ${CF.closingMonth} windows open for everyone else.</p>
  <h3 style="font-size:14.5px;margin:6px 0 8px">Mid-programme reviews — mentors (${db.midreviews.length})</h3>
  ${db.midreviews.map(m=>{const p=D.person(db,m.mentorId);return `<div class="qcard" style="padding:12px 16px">
    <b style="font-size:13.5px">${p.name}</b> <span class="track-chip track-${p.track}">${GRMP.TRACKS[p.track].label}</span>
    <span style="font-size:11.5px;color:var(--ink-3)"> · ${m.at}</span>
    <p style="font-size:13px;margin:6px 0 0">${m.text}</p></div>`}).join('')||`<p style="color:var(--ink-3);font-size:13px">None yet — mentors submit these in the ${CF.midMonth} window. <span style="color:var(--ink-3)">(See one today: advance the demo clock in Configuration, then submit as <b>mentor.active</b>.)</span></p>`}
  <h3 style="font-size:14.5px;margin:16px 0 8px">Mid-programme reviews — mentees, with their R2 close-off (${(db.menteeMidReviews||[]).length})</h3>
  ${(db.menteeMidReviews||[]).map(m=>{const p=D.person(db,m.menteeId);return `<div class="qcard" style="padding:12px 16px">
    <b style="font-size:13.5px">${p.name}</b> <span class="track-chip track-${p.track}">${GRMP.TRACKS[p.track].label}</span>
    <span style="font-size:11.5px;color:var(--ink-3)"> · ${m.at}</span>
    <p style="font-size:13px;margin:6px 0 0">${m.text}</p></div>`}).join('')||`<p style="color:var(--ink-3);font-size:13px">None yet — mentees write these as part of the Rotation 2 close-off.</p>`}
  <h3 style="font-size:14.5px;margin:16px 0 8px">End-of-programme evaluations (${(db.endEvaluations||[]).length})</h3>
  ${(db.endEvaluations||[]).map(e=>{const p=D.person(db,e.personId);return p?`<div class="qcard" style="padding:12px 16px">
    <b style="font-size:13.5px">${p.name}</b> <span style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">${p.kind}</span>
    <span style="font-size:11.5px;color:var(--ink-3)"> · ${e.at}</span>
    <p style="font-size:13px;margin:6px 0 0">${e.text}</p></div>`:''}).join('')||`<p style="color:var(--ink-3);font-size:13px">None yet — mentees submit theirs with the R3 close-off, mentors from their personal page at closing (${CF.closingMonth}).</p>`}
  <h3 style="font-size:14.5px;margin:16px 0 8px">Builder’s Commitments — mentees (${db.builderReflections.length})</h3>
  ${db.builderReflections.map(b=>{const p=D.person(db,b.menteeId);return `<div class="qcard" style="padding:12px 16px">
    <b style="font-size:13.5px">${p.name}</b> <span class="track-chip track-${p.track}">${GRMP.TRACKS[p.track].label}</span>
    <span style="font-size:11.5px;color:var(--ink-3)"> · ${b.at}</span>
    <p style="font-size:13px;margin:6px 0 0">${b.text}</p></div>`}).join('')||`<p style="color:var(--ink-3);font-size:13px">None yet — mentees submit these at closing (${CF.closingMonth}). <span style="color:var(--ink-3)">(See one today: advance the demo clock to closing week, then submit as <b>mentee.done</b>.)</span></p>`}
  <h3 style="font-size:14.5px;margin:16px 0 8px">Close-off notes — optional comments (latest ${notes.length})</h3>
  ${notes.map(x=>{const e=D.person(db,x.menteeId);return `<div class="qcard" style="padding:10px 16px;font-size:13px">
    <b>${e.name}</b> <span style="color:var(--ink-3);font-size:11.5px">R${x.rotation} · ${x.closeoff.at}</span>
    <span style="margin-left:8px">“${x.closeoff.comment}”</span></div>`}).join('')||'<p style="color:var(--ink-3);font-size:13px">No comments yet.</p>'}`;
},

/* ---------- 7 concern inbox ---------- */
v_concerns(admin){
  const db = __demo.db;
  return `<h1 class="co-title">Concern inbox 🔒</h1>
  <p class="co-sub">Visible to the Programme Lead (primary) and Programme Owner (alternate escalation) only. The platform stores the referral record only —
  the case itself is handled in SMC's Grievance &amp; Misconduct process. AI never reads this store.</p>
  ${inferred('Q6')}
  ${db.concerns.map(c=>`<div class="qcard" style="border-left:3px solid var(--red)">
    <b style="font-size:13.5px">${c.id}</b> <span style="font-size:12px;color:var(--ink-3)">· ${c.at} · ${c.from}</span>
    <p style="font-size:13px;margin:6px 0 4px">${c.summary}</p>
    <span class="badge b-neut"><span class="d"></span>${c.status}</span></div>`).join('')||'<p>No referrals.</p>'}`;
},

/* ---------- email log ---------- */
v_emails(admin){
  const db = __demo.db;
  return `<h1 class="co-title">Email log</h1>
  <p class="co-sub">Every message the system has sent (in the demo: would have sent). Copy is drafted by the build team and approved by the programme team before launch.</p>
  <table class="tb"><tr><th>Date</th><th>To</th><th>Subject</th></tr>
  ${[...db.emails].reverse().map(e=>`<tr><td style="white-space:nowrap">${e.at}</td><td style="font-size:12px">${e.to}</td><td>${e.subject}</td></tr>`).join('')}
  </table>`;
},

/* ---------- 8 config ---------- */
v_config(admin){
  // Next-cycle prefill derives from the CURRENT cycle (+1 year) — after any new cycle
  // the form suggests the one after, instead of a frozen year.
  const NY = iso => String(Number(iso.slice(0,4))+1)+iso.slice(4);
  const [R0,R1,R2] = __demo.db.config.rotations;
  const db = __demo.db, CF = GRMP.D.cohortFacts(db);
  return `<h1 class="co-title">Configuration</h1>
  <p class="co-sub">Everything a new cycle needs — dates, windows, reminders, roles — is configuration, not code. The next cycle or another university launches by editing this page.</p>
  ${inferred('Q8')}
  <div class="qcard"><b>Cycle</b><table class="tb" style="margin-top:8px"><tr><th>Rotation</th><th>Theme</th><th>Window</th></tr>
    ${db.config.rotations.map(r=>`<tr><td>R${r.n}</td><td>${r.label}</td><td>${r.start} → ${r.end}</td></tr>`).join('')}</table></div>
  <div class="qcard"><b>Roles — ${db.config.cohort.label}</b>
    ${db.config.admins.map(a=>`<div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--line-2)"><b>${a.name}</b> — ${a.role}</div>`).join('')}
    <div style="font-size:12px;color:var(--ink-3);margin-top:6px">Data Protection owner: Tracy. Roles are assignable per cohort/institution.</div></div>
  <div class="qcard"><b>Open items (the yellow cards)</b>
    <p style="font-size:12.5px;color:var(--ink-2)">Eight inferred defaults are running in this demo. Each is marked where it lives, and listed in Round 2 for one-tap confirmation.</p>
    ${Object.entries(db.config.openItems).map(([k,v])=>`<div style="font-size:12.5px;padding:4px 0;border-top:1px solid var(--line-2)"><b>${k}</b> — ${v.title}</div>`).join('')}</div>
  <div class="qcard"><b>Demo clock</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:4px 0 8px">Advance the simulated date to walk the full cycle to the end — Rotation 3 matching, final close-offs, Builder Reflections and certificates.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn sm ${db.today===CF.midR2?'btn-primary':'btn-ghost'}" data-act="setToday" data-date="${CF.midR2}">${GRMP.D.fmtDMY(CF.midR2)} · mid Rotation 2</button>
      <button class="btn sm ${db.today===CF.r3Start?'btn-primary':'btn-ghost'}" data-act="setToday" data-date="${CF.r3Start}">${GRMP.D.fmtDMY(CF.r3Start)} · Rotation 3 begins</button>
      <button class="btn sm ${db.today===CF.closingWeek?'btn-primary':'btn-ghost'}" data-act="setToday" data-date="${CF.closingWeek}">${GRMP.D.fmtDMY(CF.closingWeek)} · closing week</button>
    </div></div>
  ${admin.roles.includes('lead')?`<div class="qcard"><b>Start a new cycle</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:4px 0 10px">Run the programme again next year without redevelopment: the current cycle is archived (stats kept), returning mentors carry over as <b>invited</b> (gates re-apply automatically), and everything else resets. Configuration, not code.</p>
    <div class="f-grid2">
      <div class="f-row"><label>Cycle label</label><input type="text" id="cy-label" value="${db.config.cohort.label.replace(/\d{4}/g,y=>String(Number(y)+1))}"></div>
      <div class="f-row"><label>Working start date (system clock)</label><input type="text" id="cy-today" value="${NY((db.config.ackLadder[0]||{date:R0.start}).date)}"></div>
    </div>
    <div class="f-grid2">
      <div class="f-row"><label>Rotation 1 start / end</label><div style="display:flex;gap:6px"><input type="text" id="cy-r1s" value="${NY(R0.start)}"><input type="text" id="cy-r1e" value="${NY(R0.end)}"></div></div>
      <div class="f-row"><label>Rotation 2 start / end</label><div style="display:flex;gap:6px"><input type="text" id="cy-r2s" value="${NY(R1.start)}"><input type="text" id="cy-r2e" value="${NY(R1.end)}"></div></div>
    </div>
    <div class="f-grid2">
      <div class="f-row"><label>Rotation 3 start / end</label><div style="display:flex;gap:6px"><input type="text" id="cy-r3s" value="${NY(R2.start)}"><input type="text" id="cy-r3e" value="${NY(R2.end)}"></div></div>
      <div class="f-row" style="display:flex;align-items:flex-end"><label class="f-check" style="margin-bottom:10px"><input type="checkbox" id="cy-carry" checked><span>Carry mentors over as invited returning mentors</span></label></div>
    </div>
    <button class="btn btn-primary" data-act="startNewCycle">Archive current cycle & start new one</button></div>`:''}
  ${db.archives.length?`<div class="qcard"><b>Archived cycles</b>
    ${db.archives.map(ar=>`<div style="display:flex;gap:12px;align-items:center;padding:8px 0;border-top:1px solid var(--line-2);font-size:13px;flex-wrap:wrap">
      <b>${ar.label}</b><span class="badge b-neut"><span class="d"></span>archived ${ar.archivedAt}</span>
      <span style="color:var(--ink-3);font-size:12px">${ar.stats.mentors} mentors · ${ar.stats.mentees} mentees · close-offs ${ar.stats.r1}/${ar.stats.r2}/${ar.stats.r3} · ${ar.stats.certificates} certificates · kickoff ${ar.stats.kickoff}</span></div>`).join('')}</div>`:''}
  <div class="qcard"><b>Orientation recordings</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 8px">Paste the links to the recorded orientation sessions (YouTube / Drive). Each participant's player opens the right one, and opening records their completion — the Rotation-1 gate feeds off that. Starting a new cycle clears both (new sessions, new recordings).</p>
    <div class="f-row" style="margin-bottom:8px"><label>Mentee session (used by everyone if the mentor one is empty)</label>
      <input type="text" id="ov-url" value="${esc(db.config.orientationVideo||'')}" placeholder="https://youtu.be/… or Drive link"></div>
    <div class="f-row" style="margin-bottom:8px"><label>Mentor session (optional)</label>
      <input type="text" id="ov-url-mentor" value="${esc(db.config.orientationVideoMentor||'')}" placeholder="leave empty to share the mentee session"></div>
    <button class="btn sm btn-primary" data-act="saveOrientVideo" data-actor="${admin.name}">Save links</button>
    ${(db.config.orientationVideo||db.config.orientationVideoMentor)?`<p style="font-size:11.5px;color:var(--ok-ink);margin:8px 0 0">✓ Set — ${db.config.orientationVideoMentor?'mentors and mentees open their own sessions':'everyone opens the mentee session'}.</p>`:`<p style="font-size:11.5px;color:var(--ink-3);margin:8px 0 0">Not set — participants see a placeholder player (clicking still records completion in the demo).</p>`}
  </div>
  <div class="qcard"><b>Demo controls</b><br>
    <button class="btn sm btn-ghost" style="margin-top:8px" data-act="reset">↺ Reset ${(typeof NET!=='undefined'&&NET)?'the SHARED database':'demo data'} to seeded state</button></div>`;
},
};


