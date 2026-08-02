/* GRMP Demo — core: router, shell, open-as switcher, email popups.
   Views live in views_public.js (microsite + personal) and views_console.js (admin). */

let db = GRMP.Store.load();
const $app = () => document.getElementById('app');
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- persistence wrapper: every action saves + rerenders ---------- */
function act(fn){ const out = fn(db); GRMP.Store.save(db); render(); return out; }

/* ---------- email popup (the "this email would be sent" surface) ---------- */
let lastEmailShown = db.emails.length;
function showEmail(e){
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className = 'email-pop';
  el.innerHTML = `<div class="head">✉ EMAIL — sent by the system <button class="x" aria-label="close">×</button></div>
    <div class="body"><div class="subj">${esc(e.subject)}</div>
    <div class="meta">To: ${esc(e.to)} · ${esc(e.at)}</div>
    <div class="txt">In production this email is delivered automatically. The demo shows it here instead.</div></div>`;
  el.querySelector('.x').onclick = () => el.remove();
  root.appendChild(el);
  setTimeout(()=>el.remove(), 9000);
}
function flushEmails(){
  while(lastEmailShown < db.emails.length){ showEmail(db.emails[lastEmailShown]); lastEmailShown++; }
}

/* ---------- non-blocking toast (replaces alert — never blocks the page or automation) ---------- */
function toast(msg, ok=true){
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className='email-pop'; el.style.width='360px';
  el.innerHTML = `<div class="head" style="background:${ok?'#2E9E6B':'#C8102E'}">${ok?'✓':'!'} ${ok?'DONE':'CHECK'}
      <button class="x" aria-label="close">×</button></div>
    <div class="body"><div class="txt" style="font-size:13.5px;color:var(--ink)">${esc(msg)}</div></div>`;
  el.querySelector('.x').onclick=()=>el.remove();
  root.appendChild(el);
  setTimeout(()=>el.remove(), 5000);
}

/* ---------- yellow card helper ---------- */
function inferred(qid){
  const it = db.config.openItems[qid]; if(!it) return '';
  return `<div class="inferred" data-inferred="${qid}"><span class="tag">INFERRED · ${qid}</span>
    <div><b>Running as the default — confirm or change (Round 2 · ${qid}).</b> ${esc(it.title)}</div></div>`;
}

/* ---------- open-as switcher ---------- */
let openasOpen = false;
function renderOpenAs(){
  const mentees = db.people.filter(p=>p.kind==='mentee' && ['accepted','reserve_bench'].includes(p.appStatus)).slice(0,6);
  const mentors = db.people.filter(p=>p.kind==='mentor' && p.appStatus==='accepted' && !p.droppedOut).slice(0,4);
  const preview = db.people.filter(p=>p.previewFastForward);
  return `<div class="openas">
    ${openasOpen?`<div class="openas-menu">
      <div class="sec">Admin console (sign in)</div>
      <button data-goto="#/console">⚙ Console sign-in page</button>
      <div class="sec">Open a mentee's personal link</div>
      ${preview.map(p=>`<button data-goto="#/me/${p.id}">👤 ${esc(p.name)} <span class="badge b-ai" style="margin-left:auto">fast-forwarded to March</span></button>`).join('')}
      ${mentees.filter(p=>!p.previewFastForward).map(p=>`<button data-goto="#/me/${p.id}">👤 ${esc(p.name)} <span class="track-chip track-${p.track}" style="margin-left:auto">${esc(GRMP.TRACKS[p.track].label)}</span></button>`).join('')}
      <div class="sec">Open a mentor's personal link</div>
      ${mentors.map(p=>`<button data-goto="#/me/${p.id}">🎓 ${esc(p.name)} <span class="track-chip track-${p.track}" style="margin-left:auto">${esc(GRMP.TRACKS[p.track].label)}</span></button>`).join('')}
      <div class="sec">Microsite</div>
      <button data-goto="#/">🏠 Public landing page</button>
    </div>`:''}
    <button class="openas-btn" id="openas-toggle">⇄ Open as… <span style="opacity:.6;font-weight:600">roles & links</span></button>
  </div>`;
}

/* ---------- banner ---------- */
function demoBanner(){
  const rot = GRMP.D.currentRotation(db);
  const phase = rot ? `Rotation ${rot.n} · ${rot.label}` : (db.today>'2027-03-31'?'after the cycle':'closing weeks');
  return `<div class="demo-banner">Requirements demo · sample data only · simulated today: <b>${db.today}</b> (${phase}) ·
    advance the demo clock in <a href="#/console/Esther/config">Configuration</a> · yellow boxes are inferred defaults · <a href="#/manual">user manual</a></div>`;
}

/* ---------- router ---------- */
const routes = [
  {re:/^#\/$/,                view:()=>Views.landing()},
  {re:/^#\/guide\/mentee$/,   view:()=>Views.guideMentee()},
  {re:/^#\/guide\/mentor$/,   view:()=>Views.guideMentor()},
  {re:/^#\/reflection$/,      view:()=>Views.reflection()},
  {re:/^#\/concern$/,         view:()=>Views.concern()},
  {re:/^#\/apply\/(mentee|mentor)$/, view:m=>Views.apply(m[1])},
  {re:/^#\/applied\/(.+)$/,   view:m=>Views.applied(m[1])},
  {re:/^#\/me\/(.+)$/,        view:m=>Views.personal(m[1])},
  {re:/^#\/manual$/,          view:()=>Views.manual()},
  {re:/^#\/console$/,         view:()=>Console.login()},
  {re:/^#\/console\/([^/]+)\/?([^/]*)$/, view:m=>Console.shell(decodeURIComponent(m[1]), m[2]||'')},
];
function render(){
  const h = location.hash || '#/';
  let html = null;
  for(const r of routes){ const m = h.match(r.re); if(m){ html = r.view(m); break; } }
  if(html===null){ location.hash = '#/'; return; }
  $app().innerHTML = demoBanner() + html + renderOpenAs();
  bindGlobal();
  flushEmails();
  upgradeAI();
  window.scrollTo(0,0);
}

/* ---------- progressive AI upgrade: simulated → Gemini, in place ---------- */
async function upgradeAI(){
  if(!window.AI || !AI.enabled) return;
  document.querySelectorAll('[data-ai-sum]').forEach(async el=>{
    const id = el.dataset.aiSum, ck = 'sum:'+id;
    if(AI.cache[ck]) return;                                  // rendered from cache already
    const p = GRMP.D.person(db, id); if(!p) return;
    const txt = await AI.gen(ck, AI.summaryPrompt(p));
    if(txt && el.isConnected){
      const tx=el.querySelector('.ai-txt'), src=el.querySelector('.ai-src');
      if(tx) tx.textContent = txt;
      if(src) src.textContent = 'Gemini (live)';
    } else if(el.isConnected){
      const src=el.querySelector('.ai-src'); if(src) src.textContent='simulated in demo';
    }
  });
  document.querySelectorAll('[data-ai-pair]').forEach(async el=>{
    const id = el.dataset.aiPair, ck = 'pair:'+id;
    const pr = db.pairs.find(x=>x.id===id); if(!pr || pr.status!=='proposed') return;
    const apply = lines=>{
      pr.rationale = lines; pr.aiLive = true; GRMP.Store.save(db);
      const ul = el.querySelector('ul.why');
      if(ul) ul.innerHTML = lines.map(l=>`<li>${esc(l)}</li>`).join('')
        + `<li style="color:var(--ai-ink);font-weight:650">Generated live by Gemini — the decision above is yours.</li>`;
    };
    if(AI.cache[ck]){ if(!pr.aiLive) apply(AI.cache[ck].split('\n').map(s=>s.replace(/^[-*•\d.\s]+/,'').trim()).filter(Boolean).slice(0,3)); return; }
    const m = GRMP.D.person(db, pr.mentorId), e = GRMP.D.person(db, pr.menteeId);
    const txt = await AI.gen(ck, AI.rationalePrompt(m, e));
    if(txt && el.isConnected) apply(txt.split('\n').map(s=>s.replace(/^[-*•\d.\s]+/,'').trim()).filter(Boolean).slice(0,3));
  });
}
function bindGlobal(){
  const t = document.getElementById('openas-toggle');
  if(t) t.onclick = ()=>{ openasOpen = !openasOpen; render(); };
  document.querySelectorAll('[data-goto]').forEach(b=>b.onclick = ()=>{ openasOpen=false; location.hash = b.dataset.goto; });
  document.querySelectorAll('[data-act]').forEach(b=>b.onclick = ()=>{
    const fn = Actions[b.dataset.act]; if(fn) fn(b.dataset);
  });
}
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', render);

/* ---------- action registry (wired from data-act attributes) ---------- */
const Actions = {
  reset(){ if(confirm('Reset all demo data to the seeded state?')){ db = GRMP.Store.reset(); lastEmailShown = db.emails.length; render(); } },
  ack(d){ act(x=>GRMP.D.acknowledge(x, d.person, d.doc)); },
  ackAll(d){ act(x=>{['rules','charter','governance','pdpa','coi'].forEach(k=>GRMP.D.acknowledge(x,d.person,k))}); },
  orient(d){ act(x=>GRMP.D.completeOrientation(x, d.person, d.mode)); toast(d.mode==='recorded'?'Recording opened — your completion has been recorded.':'Live attendance marked — orientation complete.'); },
  closeoff(d){
    const met = document.getElementById('co-met').checked;
    const ref = document.getElementById('co-ref').checked;
    if(!met || !ref){ toast('Both confirmations are required to close off the rotation.', false); return; }
    const c = document.getElementById('co-comment').value;
    act(x=>GRMP.D.closeoff(x, d.pair, true, true, c));
  },
  midreview(d){
    const t = document.getElementById('mr-text').value.trim();
    if(!t){ toast('Please write a short review first.', false); return; }
    act(x=>GRMP.D.submitMidReview(x, d.person, t));
  },
  builder(d){
    const t = document.getElementById('br-text').value.trim();
    if(!t){ toast('Please write your Builder Reflection first.', false); return; }
    act(x=>GRMP.D.submitBuilderReflection(x, d.person, t));
  },
  score(d){
    const s = document.getElementById('sc-'+d.person).value;
    const c = document.getElementById('cm-'+d.person).value;
    act(x=>GRMP.D.score(x, d.person, d.reviewer, Number(s), c));
  },
  decide(d){ act(x=>GRMP.D.decide(x, d.person, d.decision, d.actor)); },
  suggest(d){ const n = act(x=>GRMP.D.suggestMatches(x, Number(d.rotation), d.track)); if(!n.length) toast('No unmatched mentees (or no capacity) in this track right now.', false); },
  approvePair(d){ act(x=>GRMP.D.approvePair(x, d.pair, d.actor)); },
  promote(d){ act(x=>GRMP.D.promoteWaitlist(x, d.person, d.actor)); },
  replaceMentor(d){ act(x=>GRMP.D.replaceMentor(x, d.pair, d.bench, d.actor)); },
  issueCerts(d){ const out = act(x=>GRMP.D.issueCertificates(x, d.actor)); toast(out.length? out.length+' certificate(s) issued and emailed.' : 'Nobody newly qualifies yet — the rule needs all three rotations completed.', out.length>0); },
  remindCloseoff(d){ act(x=>{ x.emails.push({at:x.today,to:d.email,kind:'closeoff',subject:'Reminder: please close off your rotation (two quick confirmations)'}); }); },
  checkin(d){ act(x=>{ const ev=x.events[d.event]; const i=ev.attendance.indexOf(d.person);
    if(i>=0) ev.attendance.splice(i,1); else ev.attendance.push(d.person); }); },
  submitApply(d){
    const kind = d.kind;
    const get = id => (document.getElementById(id)||{}).value || '';
    const consent = (document.getElementById('f-consent')||{}).checked;
    const track = (document.querySelector('.track-opt.sel')||{}).dataset?.track;
    const fields = kind==='mentee'
      ? {name:get('f-name'),email:get('f-email'),mobile:get('f-mobile'),track,university:'SMU',course:get('f-course'),
         year:get('f-year'),goals:get('f-goals'),devNeeds:get('f-dev'),industryInterest:get('f-ind'),
         expectations:get('f-exp'),readiness:get('f-read'),consent}
      : {name:get('f-name'),email:get('f-email'),mobile:get('f-mobile'),track,org:get('f-org'),role:get('f-role'),
         industry:get('f-ind'),background:get('f-bg'),leadership:get('f-lead'),xcultural:get('f-x'),
         languages:[get('f-lang')],motivation:get('f-mot'),consent};
    const res = act(x=>GRMP.D.submitApplication(x, kind, fields));
    location.hash = '#/applied/'+res.person.id;
  },
  pickTrack(d){
    document.querySelectorAll('.track-opt').forEach(el=>el.classList.remove('sel'));
    document.querySelector(`.track-opt[data-track="${d.track}"]`).classList.add('sel');
  },
  setToday(d){ act(x=>GRMP.D.setToday(x, d.date)); },
  exportReport(){
    const D=GRMP.D;
    const rows=[['id','name','kind','track','status','acknowledged','orientation','closeoffs','mid_review','builder_reflection','certificate']];
    db.people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus)).forEach(p=>{
      rows.push([p.id,p.name,p.kind,p.track,p.appStatus,D.ackComplete(p)?'yes':'no',p.orientation?'yes':'no',
        p.kind==='mentee'?D.menteeCloseoffs(db,p.id).length:'-',
        p.kind==='mentor'?(db.midreviews.some(m=>m.mentorId===p.id)?'yes':'no'):'-',
        p.kind==='mentee'?(db.builderReflections.some(b=>b.menteeId===p.id)?'yes':'no'):'-',
        db.certificates.some(c=>c.personId===p.id)?'yes':'no']);
    });
    const csv=rows.map(r=>r.join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const aEl=document.createElement('a'); aEl.href=URL.createObjectURL(blob); aEl.download='grmp_cohort_report.csv'; aEl.click();
    toast('Cohort report downloaded ('+(rows.length-1)+' rows).');
    db.audit.push({at:db.today,actor:'lead',action:'export_report',entity:'dashboard'});
    GRMP.Store.save(db);
  },
  raiseConcern(){
    const t = document.getElementById('cn-text').value.trim();
    if(!t){ toast('Please describe the concern first.', false); return; }
    act(x=>GRMP.D.raiseConcern(x, t));
    location.hash = '#/';
    toast('Submitted privately. Only the Escalation Owner can see this; it is referred to the SMC Grievance & Misconduct process.');
  },
};
window.__demo = {get db(){return db}, act, Actions};   // exposed for Playwright tests
