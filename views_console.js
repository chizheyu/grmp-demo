/* GRMP Demo — admin console views (manual ch.4–8). Sign-in simulated; role-scoped. */

const Console = {

/* ---------- 4.0 login ---------- */
login(){
  const db = __demo.db;
  return `<div class="login-wrap"><div class="login-card">
    <h1>GRMP Console</h1>
    <div class="sub">Programme team sign-in · GRMP 2026 (SMU pilot)</div>
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
shell(name, view){
  const db = __demo.db;
  const admin = db.config.admins.find(a=>a.name===name);
  if(!admin) return this.login();
  const R = admin.roles;
  const items = [];
  if(R.includes('coordinator')||R.includes('lead')) items.push(['dashboard','📊 Dashboard']);
  if(R.includes('mentor_reviewer')) items.push(['review-mentors','🎓 Review mentors', db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='submitted').length]);
  if(R.includes('mentee_reviewer')) items.push(['review-mentees','👤 Review mentees', db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='submitted').length]);
  if(R.includes('lead')) items.push(['decisions','⚖ Decisions', db.people.filter(p=>p.appStatus==='submitted'&&db.reviews.some(v=>v.personId===p.id)).length]);
  if(R.includes('lead')) items.push(['matching','🤝 Matching', db.pairs.filter(p=>p.status==='proposed').length]);
  if(R.includes('coordinator')) items.push(['reminders','⏰ Reminders']);
  if(R.includes('coordinator')) items.push(['waitlist','📋 Waitlist', db.people.filter(p=>p.appStatus==='waitlisted').length]);
  const pastR = db.config.rotations.filter(r=>db.today>r.end).map(r=>r.n);
  if(R.includes('coordinator')) items.push(['exceptions','⚠ Exceptions', db.pairs.filter(p=>['rematch_needed'].includes(p.status)).length + db.pairs.filter(p=>pastR.includes(p.rotation)&&p.status==='approved').length]);
  if(R.includes('coordinator')) items.push(['events','🎪 Events']);
  if(R.includes('lead')) items.push(['certificates','🏅 Certificates']);
  if(R.includes('escalation')) items.push(['concerns','🔒 Concern inbox', db.concerns.length]);
  items.push(['emails','✉ Email log', db.emails.length]);
  items.push(['config','⚙ Configuration']);
  const cur = view || items[0][0];
  const body = this['v_'+cur.replace(/-/g,'_')] ? this['v_'+cur.replace(/-/g,'_')](admin) :
    `<p>View not available for your role.</p>`;
  return `<div class="co-shell">
    <aside class="co-side">
      <div class="co-brand">GRMP Console<small>SMC · MENTORSHIP OS</small></div>
      <nav class="co-nav">
        <div class="lab">${admin.role}</div>
        ${items.map(([k,label,n])=>`<button class="co-item ${k===cur?'on':''}" data-goto="#/console/${encodeURIComponent(name)}/${k}">${label}${n?`<span class="n">${n}</span>`:''}</button>`).join('')}
      </nav>
      <div class="co-user"><b>${admin.name}</b>${admin.role}<br><a href="#/console" style="color:#8b93a1;font-size:11px">Switch user</a></div>
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
  const curN = D.currentRotation(db)?D.currentRotation(db).n:3;
  const r2 = db.pairs.filter(p=>p.rotation===curN&&['approved','closed'].includes(p.status)).length;
  const blocked = db.people.filter(p=>p.appStatus==='accepted'&&D.gateBlocked(p));
  const pastRd = db.config.rotations.filter(r=>db.today>r.end).map(r=>r.n);
  const exceptions = db.pairs.filter(p=>p.status==='rematch_needed').length + db.pairs.filter(p=>pastRd.includes(p.rotation)&&p.status==='approved').length;
  const track = t => db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&p.track===t).length;
  return `<h1 class="co-title">Dashboard</h1>
  <p class="co-sub">Single source of truth · simulated today: ${db.today}${D.currentRotation(db)?` · Rotation ${D.currentRotation(db).n} (${D.currentRotation(db).label}) is running`:' · closing phase'}.</p>
  <div class="funnel-grid">
    <div class="stat"><div class="n">${db.people.filter(p=>p.kind==='mentee').length} / ${db.people.filter(p=>p.kind==='mentor').length}</div><div class="l">Mentee / mentor applications</div></div>
    <div class="stat"><div class="n">60 + 60</div><div class="l">Accepted (incl. 6 bench mentors)</div></div>
    <div class="stat"><div class="n">${ackDone}<span style="font-size:13px;color:var(--ink-3)">/${acc.length}</span></div><div class="l">Acknowledged (binding gate)</div></div>
    <div class="stat"><div class="n">${orient}<span style="font-size:13px;color:var(--ink-3)">/${acc.length}</span></div><div class="l">Orientation complete</div></div>
    <div class="stat"><div class="n">${r1closed}/60</div><div class="l">R1 closed off</div></div>
    <div class="stat"><div class="n">${r2}</div><div class="l">R${D.currentRotation(db)?D.currentRotation(db).n:3} pairs</div></div>
    <div class="stat"><div class="n" style="color:${exceptions?'var(--warn)':'var(--ok)'}">${exceptions}</div><div class="l">Open exceptions</div></div>
    <div class="stat"><div class="n">${track('general')}·${track('entrepreneurship')}·${track('ai')}</div><div class="l">Mentees by track (G·E·AI)</div></div>
    <div class="stat"><div class="n">${db.midreviews.length}</div><div class="l">Mid-programme reviews in</div></div>
    <div class="stat"><div class="n">${db.builderReflections.length}</div><div class="l">Builder Reflections in</div></div>
    <div class="stat"><div class="n">${db.certificates.length}</div><div class="l">Certificates issued</div></div>
    <div class="stat"><div class="n">${db.events.kickoff.attendance.length}</div><div class="l">Kickoff attendance</div></div>
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
      <div class="ai-block"><div class="t">✦ AI summary — simulated in demo, labelled by rule</div>${D.aiSummary(p)}</div>
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
  : `<div class="qcard">Queue clear — no new ${kind} applications awaiting review. (Submit one from the microsite to see it appear here.)</div>`}
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
      <div class="ai-block"><div class="t">✦ AI summary</div>${D.aiSummary(p)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <button class="btn sm btn-ok" data-act="decide" data-person="${p.id}" data-decision="accepted" data-actor="${admin.name}">Accept</button>
        ${p.kind==='mentor'?`<button class="btn sm btn-ghost" data-act="decide" data-person="${p.id}" data-decision="reserve_bench" data-actor="${admin.name}">Reserve bench</button>`:''}
        <button class="btn sm btn-ghost" data-act="decide" data-person="${p.id}" data-decision="waitlisted" data-actor="${admin.name}">Waitlist</button>
        <button class="btn sm btn-ghost" style="color:var(--red)" data-act="decide" data-person="${p.id}" data-decision="declined" data-actor="${admin.name}">Decline</button>
      </div></div>`).join('')
  : `<div class="qcard">No applications ready for decision. ${noScores.length? noScores.length+' submitted application(s) are still awaiting reviewer scores.':''}
     (Submit one on the microsite, score it in a reviewer queue, and it appears here — the full pipeline works end-to-end in this demo.)</div>`}`;
},

/* ---------- 5.2 matching board ---------- */
v_matching(admin){
  const db = __demo.db, D = GRMP.D;
  const rotNow = D.currentRotation(db);
  const rot = rotNow ? rotNow.n : 3;
  const tracks = ['general','entrepreneurship','ai'];
  const unmatched = t => db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&p.track===t
    && !D.gateBlocked(p)
    && !db.pairs.some(x=>x.rotation===rot&&x.menteeId===p.id&&['proposed','approved','closed'].includes(x.status)));
  const proposed = db.pairs.filter(p=>p.rotation===rot&&p.status==='proposed');
  const rotLabel = db.config.rotations.find(r=>r.n===rot).label;
  return `<h1 class="co-title">Matching — Rotation ${rot} (${rotLabel})</h1>
  <p class="co-sub">Strictly within track. Hard constraints enforced: ≤2 mentees per mentor · no conflict · no repeat mentor.
  AI proposes with rationale; nothing is matched until you approve it.</p>
  ${inferred('Q3')}
  <div class="funnel-grid" style="grid-template-columns:repeat(3,1fr)">
    ${tracks.map(t=>`<div class="stat"><div class="n">${unmatched(t).length}</div>
      <div class="l">${GRMP.TRACKS[t].label} mentees unmatched</div>
      <button class="btn sm btn-ai" style="margin-top:8px" data-act="suggest" data-rotation="${rot}" data-track="${t}">✦ Suggest matches (AI)</button></div>`).join('')}
  </div>
  ${proposed.length? `<h3 style="margin:8px 0 10px;font-size:14.5px">Proposed — awaiting your approval (${proposed.length})</h3>`:''}
  ${proposed.map(x=>{
    const m=D.person(db,x.mentorId), e=D.person(db,x.menteeId);
    return `<div class="pair-row">
      <div class="who"><b>${e.name}</b> <span class="track-chip track-${e.track}">${GRMP.TRACKS[e.track].label}</span>
        <div class="sub">${e.course}, yr ${e.year} · wants: ${(e.goals||'').slice(0,60)}…</div></div>
      <div style="color:var(--ai);font-weight:800">→</div>
      <div class="who"><b>${m.name}</b><div class="sub">${m.role} · ${m.org}</div></div>
      <button class="btn sm btn-primary" data-act="approvePair" data-pair="${x.id}" data-actor="${admin.name}">Approve match</button>
      <ul class="why">${x.rationale.map(r=>`<li>${r}</li>`).join('')}
        <li style="color:var(--ai-ink);font-weight:650">AI-suggested (simulated in demo) — the decision above is yours.</li></ul>
    </div>`;}).join('')}
  ${db.pairs.filter(p=>p.rotation===rot&&p.status==='approved').length?
    `<h3 style="margin:16px 0 8px;font-size:14px;color:var(--ink-2)">Approved this rotation: ${db.pairs.filter(p=>p.rotation===rot&&p.status==='approved').length} pairs</h3>`:''}`;
},

/* ---------- 6.2 reminders ---------- */
v_reminders(admin){
  const db = __demo.db;
  return `<h1 class="co-title">Reminders — the machine chases, not you</h1>
  <p class="co-sub">Every reminder is rule-triggered from the tracker. This September's acknowledgement ladder already fired (history below); rotation and checkpoint reminders continue automatically.</p>
  ${inferred('Q5')}
  <table class="tb"><tr><th>When</th><th>What</th><th>Who receives it</th><th>Status</th></tr>
    ${db.config.ackLadder.map(l=>`<tr><td>${l.date} (${l.week})</td><td>${l.what}</td><td>outstanding acknowledgements only</td>
      <td><span class="badge b-ok"><span class="d"></span>fired</span></td></tr>`).join('')}
    <tr><td>rotation end −7d</td><td>Close-off reminder</td><td>mentees with open close-off</td><td><span class="badge b-neut"><span class="d"></span>scheduled</span></td></tr>
    <tr><td>rotation end +1d</td><td>Close-off escalation</td><td>coordinator queue</td><td><span class="badge b-neut"><span class="d"></span>scheduled</span></td></tr>
    <tr><td>January window</td><td>Mid-programme review request</td><td>mentors</td><td><span class="badge b-neut"><span class="d"></span>scheduled</span></td></tr>
    <tr><td>March window</td><td>Builder Reflection request</td><td>mentees</td><td><span class="badge b-neut"><span class="d"></span>scheduled</span></td></tr>
  </table>`;
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
        : '<span class="badge b-risk"><span class="d"></span>no same-track bench mentor left</span>'}</div>`;}).join('')||'<p style="color:var(--ink-3)">None.</p>'}`;
},

/* ---------- 6.5 events ---------- */
v_events(admin){
  const db = __demo.db;
  const acc = db.people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus));
  const ev = db.events;
  const row = (key,e)=>`<div class="qcard"><b style="font-size:14px">${e.name}</b>
    <span style="font-size:12px;color:var(--ink-3)"> · ${e.date} · ${e.attendance.length}/${acc.length} checked in</span>
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
  const db = __demo.db, D = GRMP.D;
  const acc = db.people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus));
  const rows = acc.map(p=>{
    const closeoffs = p.kind==='mentee'? D.menteeCloseoffs(db,p.id).length : null;
    const br = db.builderReflections.some(b=>b.menteeId===p.id);
    const mr = db.midreviews.some(m=>m.mentorId===p.id);
    const has = db.certificates.some(c=>c.personId===p.id);
    const eligible = D.certEligible(db,p);
    return {p,closeoffs,br,mr,has,eligible};
  }).sort((a,b)=>(b.eligible?1:0)-(a.eligible?1:0));
  const eligibleN = rows.filter(r=>r.eligible&&!r.has).length;
  return `<h1 class="co-title">Certificates</h1>
  <p class="co-sub">The rule runs itself — you press one button and everyone who qualifies gets their certificate by email, logged.</p>
  ${inferred('Q2')}
  <div style="margin:0 0 14px"><button class="btn btn-primary" data-act="issueCerts" data-actor="${admin.name}">Issue all qualifying certificates (${eligibleN} ready)</button></div>
  <table class="tb"><tr><th>Name</th><th>Kind</th><th>Progress against the rule</th><th>Status</th></tr>
  ${rows.slice(0,25).map(r=>`<tr><td><b>${r.p.name}</b>${r.p.previewFastForward?' <span class="badge b-ai">fast-forward preview</span>':''}</td><td>${r.p.kind}</td>
    <td style="font-size:12px">${r.p.kind==='mentee' ? `${r.closeoffs}/3 close-offs · Builder Reflection ${r.br?'✓':'✗'}` : `serving rotations ✓ · mid-review ${r.mr?'✓':'✗'}`}</td>
    <td>${r.has?'<span class="badge b-ok"><span class="d"></span>Issued</span>' : r.eligible?'<span class="badge b-warn"><span class="d"></span>Ready to issue</span>':'<span class="badge b-neut"><span class="d"></span>In progress</span>'}</td></tr>`).join('')}
  </table>
  <p style="font-size:11.5px;color:var(--ink-3);margin-top:8px">Showing 25 of ${rows.length} — most of the cohort is naturally “in progress” on 15 Dec; the two fast-forward preview mentees exist so you can see the full path today.</p>`;
},

/* ---------- 7 concern inbox ---------- */
v_concerns(admin){
  const db = __demo.db;
  return `<h1 class="co-title">Concern inbox 🔒</h1>
  <p class="co-sub">Visible to you alone as Escalation Owner. The platform stores the referral record only —
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
  const db = __demo.db;
  return `<h1 class="co-title">Configuration</h1>
  <p class="co-sub">Everything a new cycle needs — dates, windows, reminders, roles — is configuration, not code. Cycle 2 or another university launches by editing this page.</p>
  ${inferred('Q8')}
  <div class="qcard"><b>Cycle</b><table class="tb" style="margin-top:8px"><tr><th>Rotation</th><th>Theme</th><th>Window</th></tr>
    ${db.config.rotations.map(r=>`<tr><td>R${r.n}</td><td>${r.label}</td><td>${r.start} → ${r.end}</td></tr>`).join('')}</table></div>
  <div class="qcard"><b>Roles (SMU pilot)</b>
    ${db.config.admins.map(a=>`<div style="font-size:13px;padding:5px 0;border-bottom:1px solid var(--line-2)"><b>${a.name}</b> — ${a.role}</div>`).join('')}
    <div style="font-size:12px;color:var(--ink-3);margin-top:6px">Data Protection owner: Tracy. Roles are assignable per cohort/institution.</div></div>
  <div class="qcard"><b>Open items (the yellow cards)</b>
    <p style="font-size:12.5px;color:var(--ink-2)">Eight inferred defaults are running in this demo. Each is marked where it lives, and listed in Round 2 for one-tap confirmation.</p>
    ${Object.entries(db.config.openItems).map(([k,v])=>`<div style="font-size:12.5px;padding:4px 0;border-top:1px solid var(--line-2)"><b>${k}</b> — ${v.title}</div>`).join('')}</div>
  <div class="qcard"><b>Demo clock</b>
    <p style="font-size:12.5px;color:var(--ink-2);margin:4px 0 8px">Advance the simulated date to walk the full cycle to the end — Rotation 3 matching, final close-offs, Builder Reflections and certificates.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn sm ${db.today==='2026-12-15'?'btn-primary':'btn-ghost'}" data-act="setToday" data-date="2026-12-15">15 Dec 2026 · Rotation 2</button>
      <button class="btn sm ${db.today==='2027-02-01'?'btn-primary':'btn-ghost'}" data-act="setToday" data-date="2027-02-01">1 Feb 2027 · Rotation 3 begins</button>
      <button class="btn sm ${db.today==='2027-03-20'?'btn-primary':'btn-ghost'}" data-act="setToday" data-date="2027-03-20">20 Mar 2027 · closing week</button>
    </div></div>
  <div class="qcard"><b>Demo controls</b><br>
    <button class="btn sm btn-ghost" style="margin-top:8px" data-act="reset">↺ Reset demo data to seeded state</button></div>`;
},
};

/* selector-based replacement action (needs the select value) */
Actions_replaceMentorSel_init = false;
document.addEventListener('click', e=>{
  const b = e.target.closest('[data-act="replaceMentorSel"]');
  if(!b) return;
  const sel = document.getElementById('bench-'+b.dataset.pair);
  if(sel) window.__demo.Actions.replaceMentor({pair:b.dataset.pair, bench:sel.value, actor:b.dataset.actor});
});
