/* GRMP Demo — core: router, shell, open-as switcher, email popups.
   Views live in views_public.js (microsite + personal) and views_console.js (admin). */

/* ---------- runtime mode ----------
   REMOTE: served from Apps Script (google.script.run available) — shared database, real accounts.
   local : GitHub Pages / file — per-browser sandbox (kept for tests and public demo). */
const REMOTE = (typeof google!=='undefined' && google.script && google.script.run);
let SESSION = null;
try{ SESSION = JSON.parse(localStorage.getItem('grmp_session')||'null'); }catch(e){}
let db = REMOTE ? null : GRMP.Store.load();

function busy(on){
  let el=document.getElementById('rpc-busy');
  if(on){ if(!el){ el=document.createElement('div'); el.id='rpc-busy'; el.className='rpc-busy'; document.body.appendChild(el);} }
  else if(el) el.remove();
}
/* every mutation goes through call(): local = apply directly; remote = server applies + returns new db */
function call(fn, ...args){
  if(!REMOTE){
    const out = GRMP.D[fn](db, ...args);
    GRMP.Store.save(db); render(); return Promise.resolve(out);
  }
  busy(true);
  return new Promise((res,rej)=>google.script.run
    .withSuccessHandler(r=>{ busy(false);
      if(!r.ok){ toast(r.error||'Not permitted.', false); rej(r); return; }
      db=r.db; render(); res(r.out); })
    .withFailureHandler(e=>{ busy(false); toast('Server error — try again. '+(e&&e.message||''), false); rej(e); })
    .applyAction(SESSION&&SESSION.token, fn, args));
}
function rpc(name, ...args){
  return new Promise((res,rej)=>google.script.run
    .withSuccessHandler(res).withFailureHandler(rej)[name](...args));
}

/* Feedback channel — filled in once the Apps Script backend is deployed.
   Empty string = button hidden, demo unaffected. */
const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbwvothqM0XvOFOE_HxzkcoZS0v9kSmiEiP_D3FmdJEZOOGz4L46QHD7jvP00PyGdo3v/exec';
const $app = () => document.getElementById('app');
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- local-only persistence wrapper (sandbox mode) ---------- */
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

/* ---------- yellow card helper (in-product decision confirmation) ---------- */
let decisionCache = null;
function inferred(qid){
  const it = db.config.openItems[qid]; if(!it) return '';
  const dec = decisionCache && decisionCache[qid];
  const status = dec ? (dec.kind==='confirm'
      ? `<span class="badge b-ok" style="flex:none"><span class="d"></span>Confirmed by ${esc(dec.author)}</span>`
      : `<span class="badge b-warn" style="flex:none"><span class="d"></span>Change requested by ${esc(dec.author)}</span>`) : '';
  return `<div class="inferred" data-inferred="${qid}"><span class="tag">INFERRED · ${qid}</span>
    <div style="flex:1"><b>Running as the default.</b> ${esc(it.title)}
      <div style="display:flex;gap:8px;margin-top:8px;align-items:center;flex-wrap:wrap">
        ${status || `<button class="btn sm btn-ok" data-act="decideDefault" data-q="${qid}" data-kind="confirm">✓ Confirm</button>
        <button class="btn sm btn-ghost" data-act="decideDefault" data-q="${qid}" data-kind="change">✎ Request a change</button>`}
        <a href="#/decisions" style="font-size:11.5px">all decisions →</a>
      </div></div></div>`;
}
async function loadDecisions(){
  if(!FEEDBACK_URL) return;
  try{
    const r = await fetch(FEEDBACK_URL+'?list=1'); const j = await r.json();
    const map = {};
    [...j.items].reverse().forEach(it=>{                       // oldest→newest so latest wins
      if(it.status==='wont_fix') return;                       // voided decisions (admin) don't count
      const m = (it.page||'').match(/^DECISION:(Q\d+):(confirm|change)$/);
      if(m) map[m[1]] = {kind:m[2], author:it.author, text:it.text, ts:it.ts, status:it.status, note:it.note};
    });
    decisionCache = map;
  }catch(e){}
}

/* ---------- open-as switcher ---------- */
let openasOpen = false;
function renderOpenAs(){
  if(REMOTE) return '';
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

/* ---------- feedback (acceptance loop) ---------- */
function feedbackContext(){
  const h = location.hash||'#/';
  let role = 'visitor';
  let m;
  if((m=h.match(/^#\/console\/([^/]+)/))) role = 'console: '+decodeURIComponent(m[1]);
  else if((m=h.match(/^#\/me\/(.+)$/))){ const p=GRMP.D.person(db,m[1]); role = p? (p.kind+': '+p.name) : 'personal page'; }
  return {page:h, role};
}
function renderFeedbackBtn(){
  if(!FEEDBACK_URL) return '';
  return `<button class="fb-btn" data-act="openFeedback">💬 Feedback</button>`;
}
function openFeedbackModal(){
  const ctx = feedbackContext();
  const root = document.getElementById('overlay-root');
  const wrap = document.createElement('div');
  wrap.className='fb-wrap';
  wrap.innerHTML = `<div class="fb-bg"></div>
   <div class="fb-modal">
     <h3 style="margin:0 0 4px;font-size:16px">Feedback on this screen</h3>
     <div style="font-size:11.5px;color:var(--ink-3);margin-bottom:10px">Attached automatically: <b>${esc(ctx.page)}</b> · viewing as <b>${esc(ctx.role)}</b></div>
     <div class="f-row"><label>Your name (optional)</label><input type="text" id="fb-name" placeholder="so we can follow up"></div>
     <div class="f-row"><label>What should change? <span class="req">*</span></label><textarea id="fb-text" placeholder="Describe what you expected, what you saw, or what's missing"></textarea></div>
     <div style="display:flex;gap:8px;justify-content:flex-end">
       <button class="btn sm btn-ghost" id="fb-cancel">Cancel</button>
       <button class="btn sm btn-primary" id="fb-send">Send feedback</button>
     </div>
     <div style="font-size:11px;color:var(--ink-3);margin-top:8px">Feedback lands with the build team; status appears on the <a href="#/changelog">changelog</a>.</div>
   </div>`;
  root.appendChild(wrap);
  wrap.querySelector('.fb-bg').onclick = ()=>wrap.remove();
  wrap.querySelector('#fb-cancel').onclick = ()=>wrap.remove();
  wrap.querySelector('#fb-send').onclick = async ()=>{
    const text = wrap.querySelector('#fb-text').value.trim();
    if(!text){ toast('Please describe the change first.', false); return; }
    const payload = {page:ctx.page, role:ctx.role, author:wrap.querySelector('#fb-name').value.trim()||'anonymous', text};
    wrap.querySelector('#fb-send').disabled = true;
    try{
      const r = await fetch(FEEDBACK_URL, {method:'POST', body: JSON.stringify(payload)});
      const j = await r.json();
      if(!j.ok) throw 0;
      wrap.remove();
      toast('Feedback sent — thank you. Track it on the changelog.');
    }catch(e){
      wrap.querySelector('#fb-send').disabled = false;
      toast('Could not send right now — please try again in a minute.', false);
    }
  };
}

/* ---------- decision modal (extracted) ---------- */
function __decideDefault(d){
  const it = db.config.openItems[d.q]; if(!it || !FEEDBACK_URL) return;
  const confirm_ = d.kind==='confirm';
  const root = document.getElementById('overlay-root');
  const wrap = document.createElement('div');
  wrap.className='fb-wrap';
  wrap.innerHTML = `<div class="fb-bg"></div>
   <div class="fb-modal">
     <h3 style="margin:0 0 4px;font-size:16px">${confirm_?'Confirm this default':'Request a change'}</h3>
     <div style="font-size:12.5px;color:var(--ink-2);margin-bottom:12px;background:var(--surface-2);border-radius:8px;padding:9px 12px"><b>${d.q}</b> · ${esc(it.title)}</div>
     <div class="f-row"><label>Your name (for the decision record) <span class="req">*</span></label><input type="text" id="dc-name" placeholder="e.g. Esther" value="${SESSION&&SESSION.identity?esc(SESSION.identity.name||SESSION.identity.label||''):''}"></div>
     ${confirm_?'':`<div class="f-row"><label>What should it be instead? <span class="req">*</span></label><textarea id="dc-text"></textarea></div>`}
     <div style="display:flex;gap:8px;justify-content:flex-end">
       <button class="btn sm btn-ghost" id="dc-cancel">Cancel</button>
       <button class="btn sm ${confirm_?'btn-ok':'btn-primary'}" id="dc-send">${confirm_?'✓ Confirm':'Send change request'}</button>
     </div></div>`;
  root.appendChild(wrap);
  wrap.querySelector('.fb-bg').onclick=()=>wrap.remove();
  wrap.querySelector('#dc-cancel').onclick=()=>wrap.remove();
  wrap.querySelector('#dc-send').onclick=async ()=>{
    const name=wrap.querySelector('#dc-name').value.trim();
    if(!name){ toast('Please add your name — decisions need an owner.', false); return; }
    const text=confirm_?'Confirmed as running.':(wrap.querySelector('#dc-text').value.trim());
    if(!text){ toast('Please describe the change.', false); return; }
    wrap.querySelector('#dc-send').disabled=true;
    try{
      await fetch(FEEDBACK_URL,{method:'POST',body:JSON.stringify({page:'DECISION:'+d.q+':'+d.kind,role:'decision',author:name,text})});
      wrap.remove();
      toast(confirm_?'Decision recorded — thank you, '+name+'.':'Change request recorded — the build team will follow up.');
      await loadDecisions(); render();
    }catch(e){ wrap.querySelector('#dc-send').disabled=false; toast('Could not record right now — try again in a minute.', false); }
  };
}

/* ---------- banner ---------- */
function demoBanner(){
  const rot = GRMP.D.currentRotation(db);
  const phase = rot ? `Rotation ${rot.n} · ${rot.label}` : (db.today>'2027-03-31'?'after the cycle':'closing weeks');
  return `<div class="demo-banner">Requirements demo · sample data only · simulated today: <b>${db.today}</b> (${phase}) ·
    advance the demo clock in <a href="#/console/Esther/config">Configuration</a> · yellow boxes are inferred defaults · <a href="#/changelog">changelog</a> · <a href="#/manual">user manual</a></div>`;
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
  {re:/^#\/changelog$/,       view:()=>Views.changelog()},
  {re:/^#\/decisions$/,       view:()=>Views.decisions()},
  {re:/^#\/console$/,         view:()=>Console.login()},
  {re:/^#\/console\/([^/]+)\/?([^/]*)$/, view:m=>Console.shell(decodeURIComponent(m[1]), m[2]||'')},
];
function render(){
  if(REMOTE && !db){ $app().innerHTML = `<div class="login-wrap"><div class="login-card" style="text-align:center"><h1>GRMP Platform</h1><div class="sub">Connecting to the shared database…</div></div></div>`; return; }
  if(REMOTE && !SESSION){ $app().innerHTML = renderLogin(); bindGlobal(); return; }
  const h = location.hash || '#/';
  let html = null;
  for(const r of routes){ const m = h.match(r.re); if(m){ html = r.view(m); break; } }
  if(html===null){ location.hash = '#/'; return; }
  $app().innerHTML = demoBanner() + html + renderOpenAs() + renderFeedbackBtn();
  bindGlobal();
  flushEmails();
  upgradeAI();
  window.scrollTo(0,0);
}

/* ---------- login (remote mode) ---------- */
function renderLogin(){
  const err = window.__loginErr ? `<div style="color:var(--red);font-size:12.5px;margin-bottom:10px">${esc(window.__loginErr)}</div>` : '';
  return `<div class="login-wrap"><div class="login-card">
    <h1>GRMP Platform</h1>
    <div class="sub">Shared staging environment · sign in with a demo account</div>
    ${err}
    <div class="f-row"><label>Account</label><input type="text" id="lg-u" placeholder="e.g. esther · mentee.new · mentor.active" autocomplete="off"></div>
    <div class="f-row"><label>Passcode</label><input type="password" id="lg-p" placeholder="shared demo passcode" autocomplete="off"></div>
    <button class="btn btn-primary" style="width:100%" data-act="doLogin">Sign in</button>
    <div style="margin-top:14px;border-top:1px solid var(--line);padding-top:10px">
      <div style="font-size:11px;font-weight:700;letter-spacing:.05em;color:var(--ink-3);text-transform:uppercase;margin-bottom:6px">Demo accounts (passcode in the group message)</div>
      <div style="font-size:12px;color:var(--ink-2);line-height:1.7">
        <b>Admins:</b> esther · weikiat · kenzie · yutong · portia · sapranshu<br>
        <b>Participants:</b> mentee.new · mentee.mid · mentee.done · mentor.active · mentor.bench</div>
    </div>
    <div class="sim-note">Fictional sample data · every action is shared with everyone signed in — that's the point.</div>
  </div></div>`;
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
window.addEventListener('DOMContentLoaded', ()=>{
  if(!REMOTE){ render(); loadDecisions().then(()=>render()); return; }
  render();                                   // connecting splash / login
  rpc('boot', SESSION&&SESSION.token).then(r=>{
    if(r.ok){ db=r.db; if(r.identity) SESSION={...(SESSION||{}), identity:r.identity};
      render(); loadDecisions().then(()=>render()); }
    else { SESSION=null; localStorage.removeItem('grmp_session'); db=r.db||null;
      if(r.db){ render(); } else { rpc('boot', null).then(r2=>{ db=r2.db; render(); }); } }
  }).catch(e=>{ $app().innerHTML='<div class="login-wrap"><div class="login-card"><h1>GRMP Platform</h1><div class="sub">Could not reach the server — refresh to retry.</div></div></div>'; });
});

/* ---------- action registry (wired from data-act attributes) ---------- */
const Actions = {
  doLogin(){
    const u=(document.getElementById('lg-u')||{}).value?.trim().toLowerCase();
    const p=(document.getElementById('lg-p')||{}).value?.trim();
    if(!u||!p){ window.__loginErr='Enter the account and passcode.'; render(); return; }
    busy(true);
    rpc('login', u, p).then(r=>{ busy(false);
      if(!r.ok){ window.__loginErr=r.error||'Wrong account or passcode.'; render(); return; }
      window.__loginErr=null; SESSION={token:r.token, identity:r.identity};
      localStorage.setItem('grmp_session', JSON.stringify(SESSION));
      db=r.db; render();
      toast('Signed in as '+r.identity.label+'. Everything you do here is shared with the team.');
      const id=r.identity;
      if(id.kind==='person') location.hash='#/me/'+id.personId;
      else location.hash='#/console/'+encodeURIComponent(id.name);
    }).catch(e=>{ busy(false); window.__loginErr='Server unreachable — try again.'; render(); });
  },
  logout(){
    if(REMOTE && SESSION) rpc('logout', SESSION.token).catch(()=>{});
    SESSION=null; localStorage.removeItem('grmp_session'); location.hash='#/'; render();
  },
  reset(){
    if(REMOTE){ if(confirm('Reset the SHARED database to the seeded state for everyone?')) call('adminReset'); return; }
    if(confirm('Reset all demo data to the seeded state?')){ db = GRMP.Store.reset(); lastEmailShown = db.emails.length; render(); }
  },
  ack(d){ call('acknowledge', d.person, d.doc); },
  ackAll(d){ if(REMOTE){ call('ackAllDocs', d.person); } else { act(x=>{['rules','charter','governance','pdpa','coi'].forEach(k=>GRMP.D.acknowledge(x,d.person,k))}); } },
  orient(d){ call('completeOrientation', d.person, d.mode).then(()=>toast(d.mode==='recorded'?'Recording opened — your completion has been recorded.':'Live attendance marked — orientation complete.')); },
  confirmReturn(d){ call('confirmReturn', d.person).then(()=>toast('Welcome back! Please re-acknowledge the programme documents below.')); },
  closeoff(d){
    const met = document.getElementById('co-met').checked;
    const ref = document.getElementById('co-ref').checked;
    if(!met || !ref){ toast('Both confirmations are required to close off the rotation.', false); return; }
    const c = document.getElementById('co-comment').value;
    call('closeoff', d.pair, true, true, c);
  },
  midreview(d){
    const t = document.getElementById('mr-text').value.trim();
    if(!t){ toast('Please write a short review first.', false); return; }
    call('submitMidReview', d.person, t);
  },
  builder(d){
    const t = document.getElementById('br-text').value.trim();
    if(!t){ toast('Please write your Builder Reflection first.', false); return; }
    call('submitBuilderReflection', d.person, t);
  },
  score(d){
    const s = document.getElementById('sc-'+d.person).value;
    const c = document.getElementById('cm-'+d.person).value;
    call('score', d.person, d.reviewer, Number(s), c);
  },
  decide(d){ call('decide', d.person, d.decision, d.actor); },
  suggest(d){ call('suggestMatches', Number(d.rotation), d.track).then(n=>{ if(!n||!n.length) toast('No unmatched mentees (or no capacity) in this track right now.', false); }); },
  approvePair(d){ call('approvePair', d.pair, d.actor); },
  promote(d){ call('promoteWaitlist', d.person, d.actor); },
  replaceMentor(d){ call('replaceMentor', d.pair, d.bench, d.actor); },
  issueCerts(d){ call('issueCertificates', d.actor).then(out=>toast((out&&out.length)? out.length+' certificate(s) issued and emailed.' : 'Nobody newly qualifies yet — the rule needs all three rotations completed.', !!(out&&out.length))); },
  remindCloseoff(d){ call('remindCloseoff', d.email).then(()=>toast('Reminder queued.')); },
  checkin(d){ call('toggleAttendance', d.event, d.person); },
  setToday(d){ call('setToday', d.date); },
  startNewCycle(){
    const g=id=>(document.getElementById(id)||{}).value?.trim();
    const label=g('cy-label');
    const rot=[{n:1,label:'Know Yourself',start:g('cy-r1s'),end:g('cy-r1e')},
               {n:2,label:'Know Your World',start:g('cy-r2s'),end:g('cy-r2e')},
               {n:3,label:'Know Your Path',start:g('cy-r3s'),end:g('cy-r3e')}];
    const today=g('cy-today');
    const carry=(document.getElementById('cy-carry')||{}).checked;
    if(!label||rot.some(r=>!r.start||!r.end)||!today){ toast('Fill in the cycle label, all six rotation dates and the start date.', false); return; }
    if(!confirm('Start "'+label+'"? The current cycle will be archived; mentors '+(carry?'carry over as invited':'are NOT carried over')+'; mentees, pairs and certificates reset.')) return;
    call('startNewCycle', {label, rotations:rot, today, actor:(SESSION&&SESSION.identity&&SESSION.identity.name)||'lead', carryOverMentors:carry})
      .then(id=>{ toast('New cycle '+id+' started — previous cycle archived.'); location.hash='#/console/'+encodeURIComponent((SESSION&&SESSION.identity&&SESSION.identity.name)||'Esther'); });
  },
  exportReport(){
    const D=GRMP.D;
    const rows=[['id','name','kind','track','status','acknowledged','orientation','closeoffs','mid_review','builder_reflection','certificate']];
    db.people.filter(p=>['accepted','reserve_bench','invited'].includes(p.appStatus)).forEach(p=>{
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
  },
  openFeedback(){ openFeedbackModal(); },
  decideDefault(d){ __decideDefault(d); },
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
    call('submitApplication', kind, fields).then(res=>{ location.hash = '#/applied/'+res.person.id; });
  },
  pickTrack(d){
    document.querySelectorAll('.track-opt').forEach(el=>el.classList.remove('sel'));
    document.querySelector(`.track-opt[data-track="${d.track}"]`).classList.add('sel');
  },
  raiseConcern(){
    const t = document.getElementById('cn-text').value.trim();
    if(!t){ toast('Please describe the concern first.', false); return; }
    call('raiseConcern', t).then(()=>{
      location.hash = '#/';
      toast('Submitted privately. Only the Escalation Owner can see this; it is referred to the SMC Grievance & Misconduct process.');
    });
  },
};
window.__demo = {get db(){return db}, act, Actions};   // exposed for Playwright tests
