/* GRMP Demo — admin console views (manual ch.4–8). Sign-in simulated; role-scoped.
   R5: criteria-based review scoring, Reserve list management, decline variants,
   Kick-Off exception queue, "place confirmed" dashboard, verbatim email templates. */

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
navItems(db, R){
  const D = GRMP.D;
  const items = [];
  if(R.includes('coordinator')||R.includes('lead')||R.includes('dashboard_viewer')) items.push(['dashboard','📊 Dashboard']);
  if(R.includes('mentor_reviewer')) items.push(['review-mentors','🎓 Review mentors', db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='submitted').length]);
  if(R.includes('mentee_reviewer')) items.push(['review-mentees','👤 Review mentees', db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='submitted').length]);
  if(R.includes('lead')) items.push(['decisions','⚖ Decisions', db.people.filter(p=>p.appStatus==='submitted'&&db.reviews.some(v=>v.personId===p.id)).length]);
  if(R.includes('lead')||R.includes('coordinator')) items.push(['matching','🤝 Matching', db.pairs.filter(p=>p.status==='proposed').length]);
  if(R.includes('lead')||R.includes('coordinator')) items.push(['submissions','📝 Submissions', db.midreviews.length+db.builderReflections.length]);
  if(R.includes('coordinator')) items.push(['reminders','⏰ Reminders', db.people.filter(p=>p.appStatus==='accepted'&&!D.ackComplete(p)).length]);
  if(R.includes('coordinator')||R.includes('lead')) items.push(['reserve','📋 Reserve lists', db.people.filter(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===null).length]);
  const pastR = db.config.rotations.filter(r=>db.today>r.end).map(r=>r.n);
  if(R.includes('coordinator')||R.includes('lead')) items.push(['exceptions','⚠ Exceptions',
    db.pairs.filter(p=>['rematch_needed'].includes(p.status)).length
    + db.pairs.filter(p=>pastR.includes(p.rotation)&&p.status==='approved').length
    + D.kickoffExceptionsOpen(db).length]);
  if(R.includes('coordinator')) items.push(['events','🎪 Events']);
  if(R.includes('lead')) items.push(['certificates','🏅 Certificates']);
  if(R.includes('escalation')) items.push(['concerns','🔒 Concern inbox', db.concerns.length]);
  if(R.includes('lead')) items.push(['audit','🧾 Audit log', db.people.filter(p=>p.duplicateFlag).length||0]);
  items.push(['emails','✉ Emails', db.emails.length]);
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
  const acc = db.people.filter(p=>p.appStatus==='accepted');
  const confirmedN = acc.filter(D.placeConfirmed).length;
  const notConfirmed = acc.filter(p=>!D.placeConfirmed(p));
  const koConfirmed = acc.filter(p=>p.kickoff&&p.kickoff.status==='confirmed').length;
  const koExc = D.kickoffExceptionsOpen(db);
  const r1closed = db.pairs.filter(p=>p.rotation===1&&p.status==='closed').length;
  const r1total = db.pairs.filter(p=>p.rotation===1&&['approved','closed','replaced'].includes(p.status)).length;
  const CF = D.cohortFacts(db);
  const curN = D.currentRotation(db)?D.currentRotation(db).n:3;
  const r2 = db.pairs.filter(p=>p.rotation===curN&&['approved','closed'].includes(p.status)).length;
  const pastRd = db.config.rotations.filter(r=>db.today>r.end).map(r=>r.n);
  const exceptions = db.pairs.filter(p=>p.status==='rematch_needed').length + db.pairs.filter(p=>pastRd.includes(p.rotation)&&p.status==='approved').length;
  const reserveM = db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='reserve_invited');
  const reserveE = db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='reserve_invited');
  const reserveAwait = db.people.filter(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===null).length;

  const nav = new Set(Console.navItems(db, admin.roles).map(i=>i[0]));
  const to = k => nav.has(k) ? `#/console/${encodeURIComponent(admin.name)}/${k}` : null;
  const stat = (n, label, href, warn) => href
    ? `<a class="stat stat-go" href="${href}"><div class="n"${warn?' style="color:var(--warn)"':''}>${n}</div><div class="l">${label}</div><span class="go">→</span></a>`
    : `<div class="stat"><div class="n"${warn?' style="color:var(--warn)"':''}>${n}</div><div class="l">${label}</div></div>`;

  const decisionsDue = db.people.filter(p=>p.appStatus==='submitted'&&db.reviews.some(v=>v.personId===p.id)).length;
  const proposed = db.pairs.filter(p=>p.status==='proposed').length;
  const unmatchedNow = D.currentRotation(db) ? db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'
    && !D.gateBlocked(p) && !db.pairs.some(x=>x.rotation===curN&&x.menteeId===p.id&&['proposed','approved','closed'].includes(x.status))).length : 0;
  const certsReady = db.people.filter(p=>p.appStatus==='accepted'
    && D.certEligible(db,p) && !db.certificates.some(c=>c.personId===p.id)).length;
  const queue = (kind,role) => admin.roles.includes(role)
    ? db.people.filter(p=>p.kind===kind&&p.appStatus==='submitted').length : 0;
  const mentorsToScore = queue('mentor','mentor_reviewer');
  const menteesToScore = queue('mentee','mentee_reviewer');
  const todo = [
    [mentorsToScore, `mentor application${mentorsToScore===1?'':'s'} waiting for your review score`, to('review-mentors'), 'Score'],
    [menteesToScore, `mentee application${menteesToScore===1?'':'s'} waiting for your review score`, to('review-mentees'), 'Score'],
    [decisionsDue, `application${decisionsDue===1?'':'s'} scored and waiting for your decision`, to('decisions'), 'Decide'],
    [proposed,     `proposed match${proposed===1?'':'es'} awaiting your approval`,               to('matching'),  'Review'],
    [unmatchedNow, `confirmed mentee${unmatchedNow===1?'':'s'} still unmatched in Rotation ${curN}`, to('matching'), 'Match'],
    [notConfirmed.length, `accepted ${notConfirmed.length===1?'person has':'people have'} not yet confirmed their place (deadline ${CF.acceptByLong})`, to('reminders'), 'Chase'],
    [koExc.length, `Kick-Off exception request${koExc.length===1?'':'s'} awaiting a decision`,     to('exceptions'),'Decide'],
    [exceptions,   `close-off / re-match exception${exceptions===1?'':'s'} open`,                 to('exceptions'),'Chase'],
    [reserveAwait, `Reserve-list repl${reserveAwait===1?'y':'ies'} still awaited`,                to('reserve'),   'Record'],
    [db.concerns.length, `concern${db.concerns.length===1?'':'s'} in your private inbox`,         to('concerns'),  'Open'],
    [certsReady,   `certificate${certsReady===1?'':'s'} ready to issue`,                          to('certificates'),'Issue'],
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
    ${stat(`${CF.mentors} + ${CF.mentees}`, `Accepted mentors + mentees (cap ${CF.menteeCap})`, null)}
    ${stat(`${confirmedN}<span style="font-size:13px;color:var(--ink-3)">/${acc.length}</span>`, `Place confirmed (gate done, by ${CF.acceptByLong})`, to('reminders'), notConfirmed.length>0)}
    ${stat(`${koConfirmed}<span style="font-size:13px;color:var(--ink-3)">/${acc.length}</span>`, 'Kick-Off attendance confirmed', to('events'))}
    ${stat(`${r1closed}/${r1total}`, 'R1 closed off', to('exceptions'))}
    ${stat(r2, `R${curN} pairs`, to('matching'))}
    ${stat(exceptions + koExc.length, 'Open exceptions', to('exceptions'), (exceptions+koExc.length)>0)}
    ${stat(`${reserveM.length} · ${reserveE.length}`, 'Reserve lists (mentors · mentees)', to('reserve'))}
    ${stat(db.midreviews.length, 'Mid-programme reviews in', to('submissions'))}
    ${stat(db.builderReflections.length, 'Builder’s Commitments in', to('submissions'))}
    ${stat(db.certificates.length, 'Certificates issued', to('certificates'))}
    ${stat(db.events.kickoff.attendance.length, 'Kick-Off check-ins', to('events'))}
  </div>
  ${admin.roles.includes('lead')?`<div style="margin:-6px 0 14px"><button class="btn sm btn-ghost" data-act="exportReport">⬇ Export cohort report (CSV)</button>
    <span style="font-size:11px;color:var(--ink-3);margin-left:8px">export restricted to Programme Lead + System Administrator</span></div>`:''}
  ${notConfirmed.length?`<div class="qcard"><b style="font-size:13.5px">⛔ Place not yet confirmed (${notConfirmed.length})</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 8px">Accepted, outcome email sent, but the acceptance gate (Rules · COI · Kick-Off) is not completed — so their place is not confirmed and the system will not let them into matching. Deadline ${CF.acceptByLong}${CF.reserveAcceptByLong?` (activated reserves: ${CF.reserveAcceptByLong})`:''}.</p>
    ${notConfirmed.map(p=>`<div style="display:flex;gap:10px;align-items:center;padding:6px 0;border-top:1px solid var(--line-2);font-size:13px;flex-wrap:wrap">
      <b>${p.name}</b><span class="ind-chip">${esc(p.kind==='mentor'?(p.industry||''):((p.industryPrefs||[])[0]||''))}</span>
      <span style="color:var(--ink-3);font-size:12px">${['rules','coi','kickoff'].map(k=>(p.ack&&p.ack[k])?`✓ ${k}`:`✗ ${k}`).join(' · ')}${p.acceptReminderAt?` · reminded ${p.acceptReminderAt}`:' · not yet reminded'}</span>
      <a style="margin-left:auto;font-size:12px" href="#/me/${p.id}">open their page →</a></div>`).join('')}</div>`:''}
  ${inferred('Q7')}`;
},

/* ---------- 4.1 reviewer queues (criteria-based, R5) ---------- */
v_review_mentors(admin){ return this._review(admin,'mentor'); },
v_review_mentees(admin){ return this._review(admin,'mentee'); },
_review(admin, kind){
  const db = __demo.db, D = GRMP.D;
  const queue = db.people.filter(p=>p.kind===kind && p.appStatus==='submitted');
  const scored = db.people.filter(p=>p.kind===kind && p.appStatus!=='submitted' && db.reviews.some(v=>v.personId===p.id)).slice(0,4);
  const CRITS = kind==='mentor'?GRMP.MENTOR_CRITERIA:GRMP.MENTEE_CRITERIA;
  const chip = p => `<span class="ind-chip">${esc(kind==='mentor'?(p.industry||''):((p.industryPrefs||[])[0]||''))}</span>`;
  const appBody = p => kind==='mentee'
    ? `<div class="rv-app">
        <div style="font-size:12.5px;color:var(--ink-2);margin-bottom:6px">${esc(p.faculty||'')} · ${esc(p.degree||'')} · ${esc(p.year||'')} · prefers: ${esc((p.industryPrefs||[]).join(' → '))}</div>
        <details open><summary style="font-size:12px;font-weight:700">Prompt 1 — growth & ownership <span style="font-weight:400;color:var(--ink-3)">(read for: Readiness to Learn · Values Awareness · Ownership)</span></summary>
          <p style="font-size:13px;margin:6px 0">${esc(p.prompt1||'—')}</p></details>
        <details open><summary style="font-size:12px;font-weight:700">Prompt 2 — curiosity & community <span style="font-weight:400;color:var(--ink-3)">(read for: Global Curiosity · Community Mindset)</span></summary>
          <p style="font-size:13px;margin:6px 0">${esc(p.prompt2||'—')}</p></details>`
    : `<div class="rv-app">
        <div style="font-size:12.5px;color:var(--ink-2)">${esc(p.designation||'')} @ ${esc(p.org||'')} · ${esc(p.industry||'')}${p.returning?' · <b>returning mentor (screening grandfathered)</b>':''}</div>
        ${p.returning?'':`<div style="font-size:12.5px;color:var(--ink-2);margin-top:4px">Experience: ${esc(p.yearsExp||'—')} · led a team: ${esc(p.ledTeam||'—')} · breadth: ${esc(p.crossIndustry||'—')} · prior mentoring: ${esc(p.priorMentoring||'—')}</div>
        <p style="font-size:13px;margin:6px 0 0">“${esc(p.leadership||'')}”</p>`}
        <div style="font-size:12.5px;color:var(--ink-2);margin-top:4px">Draws: ${esc((p.draws||[]).join('; ')||'—')} · Interests: ${esc(p.interests||'—')}</div>`;
  return `<h1 class="co-title">Review ${kind}s</h1>
  <p class="co-sub">Every criterion arrives with a <b>proposed score</b> already filled in, read from the application itself, so nobody keys ${db.config.selection.menteeCap} applications in by hand. Read, adjust anything that does not look right, then submit. Commitment is a confirmation captured on the form, not a score. You recommend; the Programme Lead decides the outcome.</p>
  ${queue.length? queue.map(p=>`
    <div class="qcard" id="q-${p.id}">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <b style="font-size:14.5px">${p.name}</b>${chip(p)}
        <span class="badge b-neut"><span class="d"></span>submitted ${p.submittedAt}</span>
        ${p.commit==='yes'?`<span class="badge b-ok"><span class="d"></span>Commitment confirmed on the form</span>`:`<span class="badge b-warn"><span class="d"></span>Commitment: “I have some questions first”</span>`}
      </div>
      <div class="ai-block" data-ai-sum="${p.id}"><div class="t">✦ AI summary — <span class="ai-src">${(window.AI&&AI.cache['sum:'+p.id])?'generated live':'template · generating…'}</span></div><div class="ai-txt">${(window.AI&&AI.cache['sum:'+p.id])||D.aiSummary(p)}</div></div>
      ${appBody(p)}</div>
      ${(()=>{ const prop = GRMP.D.proposeScores(db, p);
               if(typeof window!=='undefined'){ window.__PROPOSED = window.__PROPOSED||{}; window.__PROPOSED[p.id] = prop; }
               const live = window.AI && AI.cache['score:'+p.id];
        return `<div class="ai-block" data-ai-score="${p.id}" style="margin-top:10px">
        <div class="t">✦ Proposed scores — <span class="ai-src">${live?'AI reading of this application':'read from the application · rule-based first cut'}</span></div>
        <div class="ai-txt">Average ${prop.avg}/5 across the ${prop.items.length} scored criteria. These are a starting point, not a decision: change any of them below.${live?'':' Where an application gives little to go on, the proposal stays at 3 and the line under each criterion says what was found.'}</div></div>
      <div class="crit-grid" style="margin-top:10px">
        ${CRITS.filter(c=>c.scored).map((c,i)=>{ const pr = prop.items[i]||{score:'',why:''};
          return `<div class="crit-row">
          <div class="crit-lab"><b>${esc(c.key)}</b><div class="crit-hint">${esc(c.hint)}</div>
            <div class="crit-hint" style="color:var(--ai-ink)">Proposed ${pr.score}/5 · ${esc(pr.why)}</div></div>
          <select id="sc-${p.id}-${i}" data-proposed="${pr.score}" aria-label="Score for ${esc(c.key)} (proposed ${pr.score} of 5, change if needed)"><option value=""></option>
            <option value="5"${pr.score===5?' selected':''}>5 — outstanding</option><option value="4"${pr.score===4?' selected':''}>4 — strong</option>
            <option value="3"${pr.score===3?' selected':''}>3 — adequate</option><option value="2"${pr.score===2?' selected':''}>2 — weak</option><option value="1"${pr.score===1?' selected':''}>1 — not ready</option></select>
        </div>`; }).join('')}
      </div>`; })()}
      <div style="display:flex;gap:10px;align-items:center;margin-top:10px;flex-wrap:wrap">
        <input id="cm-${p.id}" type="text" placeholder="Comment (optional)" style="flex:1;min-width:180px;border:1px solid var(--line);border-radius:8px;padding:7px 10px">
        <button class="btn sm btn-primary" data-act="score" data-person="${p.id}" data-kind="${kind}" data-reviewer="${admin.name}">Confirm scores</button>
      </div>
      ${db.reviews.filter(v=>v.personId===p.id).map(v=>`<div style="font-size:12px;color:var(--ink-3);margin-top:6px">✓ ${v.reviewer}: ${v.score}/5 ${v.comment?('— '+v.comment):''}</div>`).join('')}
    </div>`).join('')
  : `<div class="qcard">Queue clear — no new ${kind} applications awaiting review. (Submit one from the public site to see it appear here.)</div>`}
  <h3 style="margin:20px 0 8px;font-size:14px;color:var(--ink-2)">Recently scored (sample)</h3>
  ${scored.map(p=>`<div class="qcard" style="padding:10px 16px;font-size:13px;display:flex;gap:10px;align-items:center;flex-wrap:wrap">
    <b>${p.name}</b>${chip(p)}
    <span style="color:var(--ink-3)">${db.reviews.filter(v=>v.personId===p.id).map(v=>`${v.reviewer} ${v.score}/5`).join(' · ')}</span>
    <span class="badge b-neut" style="margin-left:auto">${p.appStatus.replace(/_/g,' ')}</span></div>`).join('')}`;
},

/* ---------- 5.1 decisions ---------- */
v_decisions(admin){
  const db = __demo.db, D = GRMP.D, CF = D.cohortFacts(db);
  const ready = db.people.filter(p=>p.appStatus==='submitted' && db.reviews.some(v=>v.personId===p.id));
  const noScores = db.people.filter(p=>p.appStatus==='submitted' && !db.reviews.some(v=>v.personId===p.id));
  return `<h1 class="co-title">Decisions</h1>
  <p class="co-sub">Single decision authority: you. Reviewers recommend; every acceptance, Reserve-list placement and decline is yours, logged and auditable. <b>Approving is the send:</b> each decision issues its outcome email automatically, verbatim from the approved templates — acceptance emails carry the personal link and the ${CF.acceptByLong} deadline.</p>
  ${inferred('Q9')}
  ${ready.length? ready.map(p=>`
    <div class="qcard">
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
        <b style="font-size:14.5px">${p.name}</b>
        <span class="ind-chip">${esc(p.kind==='mentor'?(p.industry||''):((p.industryPrefs||[])[0]||''))}</span>
        <span style="font-size:12.5px;color:var(--ink-2)">${db.reviews.filter(v=>v.personId===p.id).map(v=>`${v.reviewer}: <b>${v.score}/5</b>`).join(' · ')}</span>
      </div>
      <div class="ai-block" data-ai-sum="${p.id}"><div class="t">✦ AI summary — <span class="ai-src">${(window.AI&&AI.cache['sum:'+p.id])?'generated live':'template · generating…'}</span></div><div class="ai-txt">${(window.AI&&AI.cache['sum:'+p.id])||D.aiSummary(p)}</div></div>
      ${p.kind==='mentee'&&!p.eligibilityConfirmed?`<div style="font-size:12.5px;color:var(--warn);margin-top:6px">⚠ Eligibility not confirmed on the form — if this applicant is not a current undergraduate, use Decline (ineligible), which sends the honest variant.</div>`:''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <button class="btn sm btn-ok" data-act="decide" data-person="${p.id}" data-decision="accepted" data-actor="${admin.name}">Accept (sends acceptance email)</button>
        <button class="btn sm btn-ghost" data-act="decide" data-person="${p.id}" data-decision="reserve_invited" data-actor="${admin.name}">Reserve list</button>
        ${p.kind==='mentor'
          ? `<button class="btn sm btn-ghost" style="color:var(--red)" data-act="decide" data-person="${p.id}" data-decision="declined" data-actor="${admin.name}">Decline</button>`
          : `<button class="btn sm btn-ghost" style="color:var(--red)" data-act="decide" data-person="${p.id}" data-decision="declined_not_selected" data-actor="${admin.name}">Decline (not selected)</button>
             <button class="btn sm btn-ghost" style="color:var(--red)" data-act="decide" data-person="${p.id}" data-decision="declined_ineligible" data-actor="${admin.name}">Decline (ineligible)</button>`}
      </div></div>`).join('')
  : (()=>{
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
  const hidden = window.__hiddenProposals;
  const activePair = x => ['proposed','approved','closed'].includes(x.status) && !(hidden && hidden.has(x.id));
  const unmatched = db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'
    && !D.gateBlocked(p)
    && !db.pairs.some(x=>x.rotation===rot&&x.menteeId===p.id&&activePair(x)));
  const proposed = db.pairs.filter(p=>p.rotation===rot&&p.status==='proposed'&&!(hidden&&hidden.has(p.id)));
  const rotLabel = db.config.rotations.find(r=>r.n===rot).label;
  const coiDeclared = db.people.filter(p=>p.appStatus==='accepted'&&p.coi&&p.coi.declared);
  return `<h1 class="co-title">Matching — Rotation ${rot} (${rotLabel})</h1>
  <p class="co-sub">Hard constraints enforced: ≤2 mentees per mentor · no repeat mentor · only confirmed places enter matching.
  The system scores every eligible mentor on the mentee's three ranked industry preferences (same option list on both forms), breadth and diversity, and proposes the top match with its reasons; nothing is matched until you approve it.<br>
  <span style="color:var(--ink-3)">Scoring weights are a first cut — tuned with the programme team as real applications land.</span></p>
  ${coiDeclared.length?`<div class="qcard" style="border-left:3px solid var(--warn)"><b style="font-size:13px">⚠ Declared conflicts of interest (${coiDeclared.length})</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:4px 0 6px">Declared at the acceptance gate — check proposed pairings against these before approving.</p>
    ${coiDeclared.map(p=>`<div style="font-size:12.5px;padding:4px 0;border-top:1px solid var(--line-2)"><b>${p.name}</b> (${p.kind}): “${esc(p.coi.details)}”</div>`).join('')}</div>`:''}
  <div class="funnel-grid" style="grid-template-columns:repeat(2,1fr)">
    <div class="stat"><div class="n">${unmatched.length}</div>
      <div class="l">confirmed mentees unmatched in Rotation ${rot}</div>
      <button class="btn sm btn-ai" style="margin-top:8px" data-act="suggest" data-rotation="${rot}"
        ${window.__suggestBusy?'disabled':''}>${window.__suggestBusy?'Scoring the pool…':'✦ Suggest matches'}</button></div>
    <div class="stat"><div class="n">${proposed.length}</div><div class="l">proposed, awaiting approval</div></div>
  </div>
  <p style="font-size:11.5px;color:var(--ink-3);margin:-6px 0 12px">Suggest scores each unmatched mentee against every eligible mentor — deterministic and auditable, which is why it is fast.</p>
  ${proposed.length? `<h3 style="margin:8px 0 10px;font-size:14.5px">Proposed — awaiting your approval (${proposed.length})</h3>`:''}
  ${proposed.map(x=>{
    const m=D.person(db,x.mentorId), e=D.person(db,x.menteeId);
    return `<div class="pair-row" data-ai-pair="${x.id}">
      <div class="who"><b>${e.name}</b> <span class="ind-chip">${esc((e.industryPrefs||[])[0]||'')}</span>
        <div class="sub">${esc(e.degree||'')}, ${esc(e.year||'')} · prefers: ${esc((e.industryPrefs||[]).join(' → '))}</div></div>
      <div style="color:var(--ai);font-weight:800">→</div>
      <div class="who"><b>${m.name}</b><div class="sub">${esc(m.designation||'')} · ${esc(m.org||'')} · ${esc(m.industry||'')}</div></div>
      ${admin.roles.includes('lead')?`<button class="btn sm btn-primary" data-act="approvePair" data-pair="${x.id}" data-actor="${admin.name}">Approve match</button>`:`<span class="badge b-warn"><span class="d"></span>awaiting Programme Lead approval</span>`}
      <ul class="why">${x.rationale.map(r=>`<li>${r}</li>`).join('')}
        <li style="color:var(--ai-ink);font-weight:650">${x.adjustedBy?`Adjusted by ${x.adjustedBy} — the decision is yours.`:'System-ranked — the decision above is yours.'}</li></ul>
      ${admin.roles.includes('lead')?(()=>{
        const alts=D.alternativesFor(db,x.id,3);
        return `<details class="alts"><summary>Not this one? See the next ${alts.length} the ranking offers, or discard</summary>
        ${alts.map(a=>`<div class="alt-row">
          <div class="alt-who"><b>${a.m.name}</b> <span class="alt-sub">${esc(a.m.designation||'')} · ${esc(a.m.org||'')} · ${esc(a.m.industry||'')}</span>
            <div class="alt-why">${a.reasons.length?a.reasons[0]:'No industry-preference signal — breadth and availability only'}</div></div>
          <span class="alt-score">score ${Math.round(a.score*10)/10}</span>
          <button class="btn sm btn-ghost" data-act="reassignPair" data-pair="${x.id}" data-mentor="${a.m.id}" data-actor="${admin.name}">Use this mentor</button>
        </div>`).join('')||'<div class="alt-row"><span class="alt-sub">No other eligible mentor has capacity right now.</span></div>'}
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
        <td><span class="ind-chip">${esc(m?(m.industry||''):'')}</span></td>
        <td style="white-space:nowrap">${x.approvedAt||'—'}</td>
        <td>${x.status==='closed'?'<span class="badge b-ok"><span class="d"></span>Closed off</span>':'<span class="badge b-neut"><span class="d"></span>Running</span>'}</td></tr>`;};
    const HEAD = '<tr><th>Mentee</th><th>Mentor</th><th>Mentor industry</th><th>Approved</th><th>Status</th></tr>';
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
  const db = __demo.db, D = GRMP.D, CF = D.cohortFacts(db);
  const acc = db.people.filter(p=>p.appStatus==='accepted');
  const notConfirmed = acc.filter(p=>!D.placeConfirmed(p));
  const targets = D.reminderTargets(db);
  return `<h1 class="co-title">Reminders — the machine chases, not you</h1>
  <p class="co-sub">Acceptance reminders follow the confirmed rule: <b>sent once</b>, a few days before the ${CF.acceptByLong} deadline, only to accepted people whose place is not yet confirmed. Activated reserves get the compressed variant before ${CF.reserveAcceptByLong}. No final same-day nudge.</p>
  <table class="tb"><tr><th>When (scheduled)</th><th>What</th><th>Who receives it</th></tr>
    ${(db.config.ackLadder||[]).map(l=>`<tr><td>${l.date}</td><td>${l.what}</td><td>${l.who}</td></tr>`).join('')}
    <tr><td>rotation end −7d</td><td>Close-off reminder</td><td>mentees with open close-off</td></tr>
    <tr><td>${CF.midMonth} window</td><td>Mid-programme review request</td><td>mentors</td></tr>
    <tr><td>${CF.closingMonth} window</td><td>Builder’s Commitment request</td><td>mentees</td></tr>
  </table>
  <div class="qcard" style="margin-top:12px">
    <b style="font-size:13.5px">Place not yet confirmed (${notConfirmed.length})</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 8px">The team's follow-up list: accepted, but the acceptance gate is incomplete. ${targets.length?`${targets.length} of them have not been reminded yet.`:'Everyone outstanding has already had their one reminder.'}</p>
    ${notConfirmed.map(p=>`<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-top:1px solid var(--line-2);font-size:13px;flex-wrap:wrap">
      <b>${p.name}</b><span style="color:var(--ink-3);font-size:11.5px">${p.kind}</span>
      <span style="color:var(--ink-3);font-size:12px">${['rules','coi','kickoff'].map(k=>(p.ack&&p.ack[k])?`✓ ${k}`:`✗ ${k}`).join(' · ')}</span>
      <span class="badge ${p.acceptReminderAt?'b-ok':'b-warn'}" style="margin-left:auto"><span class="d"></span>${p.acceptReminderAt?'reminded '+p.acceptReminderAt:'not yet reminded'}</span>
      <a style="font-size:12px" href="#/me/${p.id}">page →</a></div>`).join('')||'<p style="color:var(--ink-3);font-size:13px;margin:6px 0 0">Everyone accepted has confirmed their place.</p>'}
    ${targets.length?`<button class="btn sm btn-primary" style="margin-top:10px" data-act="sendReminders" data-actor="${admin.name}">Send ${targets.length} reminder${targets.length>1?'s':''} now →</button>
    <span style="font-size:11px;color:var(--ink-3);margin-left:8px">in production this fires on the scheduled date; staging sends on demand</span>`:''}
  </div>
  ${(()=>{
    const pend = D.pendingWithdrawal(db);
    if(!D.acceptDeadlinePassed(db))
      return `<div class="qcard" style="margin-top:12px"><b style="font-size:13.5px">Seat release</b>
        <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 0">The acceptance deadline (${CF.acceptByLong}) has not passed on the simulated clock, so nobody can be released.</p></div>`;
    if(!pend.length)
      return `<div class="qcard" style="margin-top:12px"><b style="font-size:13.5px">Seat release</b>
        <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 0">Everyone accepted has confirmed. Nothing to release.</p></div>`;
    return `<div class="qcard" style="margin-top:12px;border-left:3px solid var(--warn)">
      <b style="font-size:13.5px">Seat release — ${pend.length} past their deadline without confirming</b>
      <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 8px">Per the confirmed rule (Q5) they are treated as withdrawn and their seats freed for the Reserve list. This is your call, not an automatic one.</p>
      ${pend.map(p=>`<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-top:1px solid var(--line-2);font-size:13px">
        <b>${p.name}</b><span style="color:var(--ink-3);font-size:11.5px">${p.kind}</span>
        <span style="color:var(--ink-3);font-size:12px">deadline ${D.deadlineFor(db,p)}</span></div>`).join('')}
      <button class="btn sm btn-primary" style="margin-top:10px" data-act="withdrawUnack" data-actor="${admin.name}">Release ${pend.length} seat${pend.length>1?'s':''} →</button>
    </div>`;
  })()}`;
},

/* ---------- 6.3 Reserve lists (R5 — replaces the waitlist) ---------- */
v_reserve(admin){
  const db = __demo.db, D = GRMP.D, CF = D.cohortFacts(db);
  const list = kind => db.people.filter(p=>p.kind===kind&&p.appStatus==='reserve_invited')
    .map(p=>({p, score: db.reviews.filter(v=>v.personId===p.id).reduce((s,v)=>s+v.score,0)/Math.max(1,db.reviews.filter(v=>v.personId===p.id).length)}))
    .sort((a,b)=>b.score-a.score);
  const section = (kind,label) => {
    const rows = list(kind);
    return `<h3 style="font-size:14.5px;margin:14px 0 8px">${label} (${rows.length})</h3>
    ${rows.length?`<table class="tb"><tr><th>#</th><th>Name</th><th>Avg score</th><th>Reply (by ${CF.acceptByLong})</th><th></th></tr>
    ${rows.map((r,i)=>`<tr><td>${i+1}</td><td><b>${r.p.name}</b></td>
      <td>${r.score?r.score.toFixed(1):'—'}</td>
      <td>${r.p.reserveOptIn===true?`<span class="badge b-ok"><span class="d"></span>Opted in${r.p.reserveRepliedAt?' · '+r.p.reserveRepliedAt:''}</span>`
          :r.p.reserveOptIn===false?`<span class="badge b-neut"><span class="d"></span>Declined</span>`
          :`<span class="badge b-warn"><span class="d"></span>Awaiting reply</span>
            <button class="btn sm btn-ghost" data-act="reserveReply" data-person="${r.p.id}" data-reply="in" data-actor="${admin.name}">Record: opted in</button>
            <button class="btn sm btn-ghost" data-act="reserveReply" data-person="${r.p.id}" data-reply="out" data-actor="${admin.name}">Record: declined</button>`}</td>
      <td>${r.p.reserveOptIn!==false?`<button class="btn sm btn-primary" data-act="activateReserve" data-person="${r.p.id}" data-actor="${admin.name}">Activate</button>`:''}</td></tr>`).join('')}
    </table>`:'<p style="color:var(--ink-3);font-size:13px">Empty.</p>'}`;
  };
  return `<h1 class="co-title">Reserve lists</h1>
  <p class="co-sub">Strong applicants held against the cap, with their agreement. Replies arrive by email (a short reply to ${CF.enquiries} is all we ask) — record them here. <b>Activate</b> sends the activation acceptance email with the later ${CF.reserveAcceptByLong} deadline and puts the person into the normal acceptance-gate flow. If a place opens too close to that date for email to be practical, contact the person directly (confirmed: no email fallback deadline).</p>
  ${section('mentor','Reserve Mentor list')}
  ${section('mentee','Reserve Mentee list')}`;
},

/* ---------- 6.4/6.6 exceptions ---------- */
v_exceptions(admin){
  const db = __demo.db, D = GRMP.D;
  const pastRots = db.config.rotations.filter(r=>db.today>r.end).map(r=>r.n);
  const missing = db.pairs.filter(p=>pastRots.includes(p.rotation)&&p.status==='approved');
  const rematch = db.pairs.filter(p=>p.status==='rematch_needed');
  const koExc = D.kickoffExceptionsOpen(db);
  const koResolved = db.people.filter(p=>p.kickoff&&p.kickoff.status==='exception_requested'&&p.kickoff.resolved);
  const reserveMentors = db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='reserve_invited'&&p.reserveOptIn===true);
  const isOwner = admin.roles.includes('lead');
  return `<h1 class="co-title">Exceptions</h1>
  <p class="co-sub">What the system escalates: Kick-Off exception requests, a close-off not completed after a rotation, and a mentor dropout. Everything else, the pair manages themselves.</p>
  <h3 style="font-size:14.5px;margin:6px 0 8px">Kick-Off exception requests (${koExc.length} open)</h3>
  <p style="font-size:12px;color:var(--ink-3);margin:0 0 8px">Routed to Esther Koh and Wei Kiat Koh (both are also emailed). An exception request is a request, not an automatic waiver — the form captures it; a human decides.</p>
  ${koExc.map(p=>`<div class="pair-row"><div class="who"><b>${p.name}</b> <span style="color:var(--ink-3);font-size:11.5px">${p.kind}</span>
      <div class="sub">“${esc(p.kickoff.reason||'')}”</div></div>
    ${isOwner?`<button class="btn sm btn-primary" data-act="resolveKickoffExc" data-person="${p.id}" data-outcome="waived" data-actor="${admin.name}">Approve exception</button>
    <button class="btn sm btn-ghost" data-act="resolveKickoffExc" data-person="${p.id}" data-outcome="attend" data-actor="${admin.name}">Ask to attend</button>`
    :'<span class="badge b-warn"><span class="d"></span>decision sits with Esther Koh / Wei Kiat Koh</span>'}</div>`).join('')||'<p style="color:var(--ink-3)">None open.</p>'}
  ${koResolved.length?`<p style="font-size:12px;color:var(--ink-3);margin:6px 0 0">Resolved: ${koResolved.map(p=>`${p.name} (${p.kickoff.resolved.outcome} by ${p.kickoff.resolved.by}, ${p.kickoff.resolved.at})`).join(' · ')}</p>`:''}
  <h3 style="font-size:14.5px;margin:18px 0 8px">Rotation close-off missing (${missing.length})</h3>
  ${missing.map(x=>{const e=D.person(db,x.menteeId), m=D.person(db,x.mentorId);
    return `<div class="pair-row"><div class="who"><b>${e.name}</b><div class="sub">paired with ${m.name} · R${x.rotation} ended · <b style="color:var(--warn)">close-off overdue</b></div></div>
      <button class="btn sm btn-ghost" data-act="remindCloseoff" data-email="${e.email}">Remind again</button>
      <a class="btn sm btn-ghost" href="#/me/${e.id}" style="text-decoration:none">Open their page</a></div>`;}).join('')||'<p style="color:var(--ink-3)">None.</p>'}
  <h3 style="font-size:14.5px;margin:18px 0 8px">Mentor dropout — replacement needed (${rematch.length})</h3>
  ${rematch.map(x=>{const e=D.person(db,x.menteeId); const old=D.person(db,x.mentorId);
    return `<div class="pair-row"><div class="who"><b>${e.name}</b><div class="sub">${old.name} dropped out ${old.droppedOut.at} (${old.droppedOut.reason}) · replace from the opted-in Reserve Mentor list within 7 days</div></div>
      ${reserveMentors.length? `<select id="bench-${x.id}" style="border:1px solid var(--line);border-radius:8px;padding:7px 10px">
          ${reserveMentors.map(bm=>`<option value="${bm.id}">${bm.name} — ${esc(bm.designation||'')}, ${esc(bm.org||'')} (${esc(bm.industry||'')})</option>`).join('')}</select>
        <button class="btn sm btn-primary" data-act="replaceMentorSel" data-pair="${x.id}" data-actor="${admin.name}">Activate & assign</button>`
        : '<span class="badge b-risk"><span class="d"></span>no opted-in Reserve mentor left</span>'}</div>`;}).join('')||'<p style="color:var(--ink-3)">None.</p>'}
  ${(()=>{
    const serving = db.people.filter(m=>m.kind==='mentor'&&m.appStatus==='accepted'&&!m.droppedOut
      && db.pairs.some(p=>p.mentorId===m.id&&p.status==='approved'));
    if(!serving.length) return '';
    return `<div class="qcard" style="margin-top:16px"><b style="font-size:13.5px">Mark a mentor as dropped out</b>
      <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 10px">Their current-rotation mentees move into the re-match queue above, refilled from the opted-in Reserve Mentor list. Target: replacement within 7 days.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <select id="drop-mentor" aria-label="Mentor who dropped out" style="border:1px solid var(--line);border-radius:8px;padding:7px 10px;max-width:320px">
          ${serving.map(m=>`<option value="${m.id}">${m.name} — ${esc(m.designation||'')}, ${esc(m.org||'')} (${db.pairs.filter(p=>p.mentorId===m.id&&p.status==='approved').length} active mentee(s))</option>`).join('')}</select>
        <input type="text" id="drop-reason" aria-label="Reason" placeholder="reason (e.g. work relocation)" style="border:1px solid var(--line);border-radius:8px;padding:7px 10px;flex:1;min-width:180px">
        <button class="btn sm btn-ghost" style="color:var(--red)" data-act="markDropout" data-actor="${admin.name}">Mark dropped</button>
      </div></div>`;
  })()}`;
},

/* ---------- 6.5 events ---------- */
v_events(admin){
  const db = __demo.db, D = GRMP.D, CF = D.cohortFacts(db);
  const acc = db.people.filter(p=>p.appStatus==='accepted');
  const koConfirmed = acc.filter(p=>p.kickoff&&p.kickoff.status==='confirmed');
  const dietary = koConfirmed.map(p=>(p.kickoffLogistics&&p.kickoffLogistics.dietary||'').trim()).filter(Boolean);
  const dietCounts = {};
  dietary.forEach(d0=>{ const k=d0.toLowerCase(); dietCounts[k]=(dietCounts[k]||0)+1; });
  const arrivals = koConfirmed.filter(p=>p.kickoffLogistics&&(p.kickoffLogistics.arrival||'').trim());
  const ev = db.events;
  const row = (key,e,pool)=>`<div class="qcard"><b style="font-size:14px">${e.name}</b>
    <span style="font-size:12px;color:var(--ink-3)"> · ${e.date}${e.time?` · ${e.time}`:''}${e.venue?` · ${e.venue}`:''} · ${e.attendance.length}/${pool.length} checked in</span>
    <div style="max-height:220px;overflow-y:auto;margin-top:10px;border-top:1px solid var(--line-2)">
    ${pool.slice(0,30).map(p=>`<div style="display:flex;gap:10px;align-items:center;padding:5px 0;border-bottom:1px solid var(--line-2);font-size:13px">
      <span style="flex:1"><b>${p.name}</b> <span style="color:var(--ink-3);font-size:11.5px">${p.kind}</span></span>
      <button class="btn sm ${e.attendance.includes(p.id)?'btn-ok':'btn-ghost'}" data-act="checkin" data-event="${key}" data-person="${p.id}">
        ${e.attendance.includes(p.id)?'✓ Present':'Check in'}</button></div>`).join('')}
    <div style="font-size:11.5px;color:var(--ink-3);padding:6px 0">…list truncated in demo (showing 30 of ${pool.length}); search comes with the real build.</div></div></div>`;
  return `<h1 class="co-title">Events</h1>
  <p class="co-sub">Built for a phone at the door. The Kick-Off check-in list is everyone who confirmed attendance in the acceptance gate; dietary details below come only from confirmed attendees and are used only to cater the event.</p>
  <div class="qcard"><b style="font-size:14px">Kick-Off catering & arrivals — from the logistics step</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 6px">${koConfirmed.length} attendance confirmations · ${dietary.length} dietary notes${Object.keys(dietCounts).length?': '+Object.entries(dietCounts).map(([k,n])=>`${k} ×${n}`).join(' · '):''}</p>
    ${arrivals.length?`<div style="font-size:12.5px;color:var(--ink-2)">Arrival notes: ${arrivals.map(p=>`<b>${p.name}</b> — “${esc(p.kickoffLogistics.arrival)}”`).join(' · ')}</div>`:''}
  </div>
  ${row('kickoff',ev.kickoff,koConfirmed)}${row('appreciation',ev.appreciation,acc)}`;
},

/* ---------- 5.4 certificates ---------- */
v_certificates(admin){
  const db = __demo.db, D = GRMP.D, CF = D.cohortFacts(db);
  const isLead = admin.roles.includes('lead');
  const acc = db.people.filter(p=>p.appStatus==='accepted');
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
  const chip = p => `<span class="ind-chip">${esc(p.kind==='mentor'?(p.industry||''):((p.industryPrefs||[])[0]||''))}</span>`;
  return `<h1 class="co-title">Submissions</h1>
  <p class="co-sub">Everything participants have written, in one place — visible to the Programme Lead and Coordinator only. (Private reflections are never here: they live outside the system by design.)</p>
  <p style="font-size:11.5px;color:var(--ink-3);margin:-6px 0 14px">Entries dated after the simulated today come from the two <b>fast-forward preview</b> pairs — real samples to read before the ${CF.midMonth} and ${CF.closingMonth} windows open for everyone else.</p>
  <h3 style="font-size:14.5px;margin:6px 0 8px">Mid-programme reviews — mentors (${db.midreviews.length})</h3>
  ${db.midreviews.map(m=>{const p=D.person(db,m.mentorId);return `<div class="qcard" style="padding:12px 16px">
    <b style="font-size:13.5px">${p.name}</b> ${chip(p)}
    <span style="font-size:11.5px;color:var(--ink-3)"> · ${m.at}</span>
    <p style="font-size:13px;margin:6px 0 0">${m.text}</p></div>`}).join('')||`<p style="color:var(--ink-3);font-size:13px">None yet — mentors submit these in the ${CF.midMonth} window. <span style="color:var(--ink-3)">(See one today: advance the demo clock in Configuration, then submit as <b>mentor.active</b>.)</span></p>`}
  <h3 style="font-size:14.5px;margin:16px 0 8px">Mid-programme reviews — mentees, with their R2 close-off (${(db.menteeMidReviews||[]).length})</h3>
  ${(db.menteeMidReviews||[]).map(m=>{const p=D.person(db,m.menteeId);return `<div class="qcard" style="padding:12px 16px">
    <b style="font-size:13.5px">${p.name}</b> ${chip(p)}
    <span style="font-size:11.5px;color:var(--ink-3)"> · ${m.at}</span>
    <p style="font-size:13px;margin:6px 0 0">${m.text}</p></div>`}).join('')||`<p style="color:var(--ink-3);font-size:13px">None yet — mentees write these as part of the Rotation 2 close-off.</p>`}
  <h3 style="font-size:14.5px;margin:16px 0 8px">End-of-programme evaluations (${(db.endEvaluations||[]).length})</h3>
  ${(db.endEvaluations||[]).map(e=>{const p=D.person(db,e.personId);return p?`<div class="qcard" style="padding:12px 16px">
    <b style="font-size:13.5px">${p.name}</b> <span style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">${p.kind}</span>
    <span style="font-size:11.5px;color:var(--ink-3)"> · ${e.at}</span>
    <p style="font-size:13px;margin:6px 0 0">${e.text}</p></div>`:''}).join('')||`<p style="color:var(--ink-3);font-size:13px">None yet — mentees submit theirs with the R3 close-off, mentors from their personal page at closing (${CF.closingMonth}).</p>`}
  <h3 style="font-size:14.5px;margin:16px 0 8px">Builder’s Commitments — mentees (${db.builderReflections.length})</h3>
  ${db.builderReflections.map(b=>{const p=D.person(db,b.menteeId);return `<div class="qcard" style="padding:12px 16px">
    <b style="font-size:13.5px">${p.name}</b> ${chip(p)}
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

/* ---------- email log + verbatim templates ---------- */
v_emails(admin){
  const db = __demo.db, CF = GRMP.D.cohortFacts(db);
  const TPL_GROUPS = [
    ['Mentor set', ['mentor_invite','mentor_receipt','mentor_accept','mentor_accept_reminder','mentor_reserve','mentor_reserve_activation','mentor_reserve_activation_reminder','mentor_decline']],
    ['Mentee set', ['mentee_invite','mentee_receipt','mentee_accept','mentee_accept_reminder','mentee_reserve','mentee_reserve_activation','mentee_reserve_activation_reminder','mentee_decline_not_selected','mentee_decline_ineligible']],
    ['Operational', ['otp_code','onboarding']],
  ];
  const tplName = k => k.replace(/^(mentor|mentee)_/,'').replace(/_/g,' ');
  return `<h1 class="co-title">Emails</h1>
  <p class="co-sub">Sender identity on every system email: From <b>${CF.mailFrom}</b>, reply-to <b>${CF.enquiries}</b> (configured at the mail-platform level in production). Bodies are the approved verbatim templates — open any row or template to read the exact copy. Relationship-defining emails are dual-signed (Esther Koh + Wei Kiat Koh); operational chase-ups are signed by Wei Kiat Koh only.</p>
  <div class="qcard"><b style="font-size:13.5px">Approved templates (verbatim, from the specs)</b>
    <p style="font-size:12px;color:var(--ink-3);margin:4px 0 8px">Click to preview with placeholder data. The onboarding email is a placeholder pending approved copy (outstanding content item).</p>
    ${TPL_GROUPS.map(([g,keys])=>`<div style="font-size:12.5px;margin:6px 0"><b>${g}:</b>
      ${keys.map(k=>`<button class="btn sm btn-ghost" style="margin:2px" data-act="openMailTpl" data-tpl="${k}">${tplName(k)}</button>`).join('')}</div>`).join('')}
  </div>
  <h3 style="font-size:14.5px;margin:14px 0 8px">Sent log (${db.emails.length})</h3>
  <table class="tb"><tr><th>Date</th><th>To</th><th>Subject</th><th></th></tr>
  ${db.emails.map((e,ix)=>({e,ix})).reverse().map(({e,ix})=>{
    const m = GRMP.D.renderMail(db, e);
    return `<tr><td style="white-space:nowrap">${e.at}</td><td style="font-size:12px">${esc(e.to)}</td>
      <td>${esc(m.subject||e.subject||'')}</td>
      <td>${(e.tpl)?`<button class="btn sm btn-ghost" data-act="openMail" data-ix="${ix}">Open</button>`:''}</td></tr>`;}).join('')}
  </table>`;
},

/* ---------- 8 config ---------- */
v_config(admin){
  const NY = iso => String(Number(iso.slice(0,4))+1)+iso.slice(4);
  const [R0,R1,R2] = __demo.db.config.rotations;
  const db = __demo.db, CF = GRMP.D.cohortFacts(db);
  const sel = db.config.selection||{};
  return `<h1 class="co-title">Configuration</h1>
  <p class="co-sub">Everything a new cycle needs — dates, windows, reminders, roles — is configuration, not code. The next cycle or another university launches by editing this page.</p>
  ${inferred('Q12')}
  <div class="qcard"><b>Cycle</b><table class="tb" style="margin-top:8px"><tr><th>Rotation</th><th>Theme</th><th>Window</th></tr>
    ${db.config.rotations.map(r=>`<tr><td>R${r.n}</td><td>${r.label}</td><td>${r.start} → ${r.end}</td></tr>`).join('')}</table></div>
  <div class="qcard"><b>Selection timeline (spec-confirmed)</b>
    <table class="tb" style="margin-top:8px"><tr><th>Milestone</th><th>Date</th></tr>
      <tr><td>Applications open → close</td><td>${db.config.registration.opens} → ${db.config.registration.closes}</td></tr>
      <tr><td>Internal review & approvals completed</td><td>${sel.approvalsBy||'—'}</td></tr>
      <tr><td>Applicants told the outcome by</td><td>${sel.outcomeBy||'—'}</td></tr>
      <tr><td>Acceptance reminder (once)</td><td>${sel.reminderOn||'—'}</td></tr>
      <tr><td>Acceptance deadline (complete the portal gate)</td><td>${sel.acceptBy||'—'}</td></tr>
      <tr><td>Reserve-activation acceptance deadline</td><td>${sel.reserveAcceptBy||'—'}</td></tr>
      <tr><td>Kick-Off Night</td><td>${db.events.kickoff.date} · ${db.events.kickoff.time||''} · ${db.events.kickoff.venue||''}</td></tr>
      <tr><td>Mentee cap</td><td>${sel.menteeCap||'—'} (Reserve list beyond the cap)</td></tr></table></div>
  <div class="qcard"><b>Roles — ${db.config.cohort.label}</b>
    ${db.config.admins.map(a=>`<div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--line-2)"><b>${a.name}</b> — ${a.role}</div>`).join('')}
    <div style="font-size:12px;color:var(--ink-3);margin-top:6px">Data Protection owner: Tracy. Roles are assignable per cohort/institution.</div></div>
  <div class="qcard"><b>Open items (the yellow cards)</b>
    <p style="font-size:12.5px;color:var(--ink-2)">Inferred defaults and their standing — settled ones keep their record on the <a href="#/decisions">decisions register</a>.</p>
    ${Object.entries(db.config.openItems).map(([k,v])=>`<div style="font-size:12.5px;padding:4px 0;border-top:1px solid var(--line-2)"><b>${k}</b>${v.settled?' <span class="badge b-ok" style="font-size:10px"><span class="d"></span>settled</span>':' <span class="badge b-ai" style="font-size:10px">open</span>'} — ${v.title}</div>`).join('')}</div>
  <div class="qcard"><b>Demo clock</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:4px 0 8px">Advance the simulated date to walk the full cycle to the end — Rotation 3 matching, final close-offs, Builder’s Commitments and certificates.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn sm ${db.today===CF.midR2?'btn-primary':'btn-ghost'}" data-act="setToday" data-date="${CF.midR2}">${GRMP.D.fmtDMY(CF.midR2)} · mid Rotation 2</button>
      <button class="btn sm ${db.today===CF.r3Start?'btn-primary':'btn-ghost'}" data-act="setToday" data-date="${CF.r3Start}">${GRMP.D.fmtDMY(CF.r3Start)} · Rotation 3 begins</button>
      <button class="btn sm ${db.today===CF.closingWeek?'btn-primary':'btn-ghost'}" data-act="setToday" data-date="${CF.closingWeek}">${GRMP.D.fmtDMY(CF.closingWeek)} · closing week</button>
    </div></div>
  ${admin.roles.includes('lead')?`<div class="qcard"><b>Start a new cycle</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:4px 0 10px">Run the programme again next year without redevelopment: the current cycle is archived (stats kept), returning mentors carry over as <b>invited</b> (the acceptance gate re-applies automatically), and everything else resets. Configuration, not code.</p>
    <div class="f-grid2">
      <div class="f-row"><label>Cycle label</label><input type="text" id="cy-label" value="${db.config.cohort.label.replace(/\d{4}/g,y=>String(Number(y)+1))}"></div>
      <div class="f-row"><label>Working start date (system clock)</label><input type="text" id="cy-today" value="${NY(db.config.registration.opens)}"></div>
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
  <div class="qcard"><b>Briefing recordings (optional resource)</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:6px 0 8px">Paste links to recorded briefings (YouTube / Drive). Confirmed participants see them as an optional card on their personal page — they are <b>not a gate</b>: the binding step is the acceptance gate, per the post-selection specs (Q11). Starting a new cycle clears both.</p>
    <div class="f-row" style="margin-bottom:8px"><label>Mentee briefing (used by everyone if the mentor one is empty)</label>
      <input type="text" id="ov-url" value="${esc(db.config.orientationVideo||'')}" placeholder="https://youtu.be/… or Drive link"></div>
    <div class="f-row" style="margin-bottom:8px"><label>Mentor briefing (optional)</label>
      <input type="text" id="ov-url-mentor" value="${esc(db.config.orientationVideoMentor||'')}" placeholder="leave empty to share the mentee briefing"></div>
    <button class="btn sm btn-primary" data-act="saveOrientVideo" data-actor="${admin.name}">Save links</button>
  </div>
  <div class="qcard"><b>Demo controls</b><br>
    <button class="btn sm btn-ghost" style="margin-top:8px" data-act="reset">↺ Reset ${(typeof NET!=='undefined'&&NET)?'the SHARED database':'demo data'} to seeded state</button></div>`;
},
};
