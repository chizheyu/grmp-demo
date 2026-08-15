/* GRMP Demo — core: router, shell, open-as switcher, email popups.
   Views live in views_public.js (microsite + personal) and views_console.js (admin).
   R5: staged application actions, OTP link login, acceptance-gate actions, verbatim
   email bodies in the popup, leave-site guard on the (no-save) application forms. */

/* ---------- runtime mode ----------
   REMOTE: served from Apps Script (google.script.run available) — shared database, real accounts.
   local : GitHub Pages / file — per-browser sandbox (kept for tests and public demo). */
const REMOTE = (typeof google!=='undefined' && google.script && google.script.run);
const FS = (typeof window!=='undefined' && window.FIREBASE_CONFIG && typeof firebase!=='undefined');
const NET = REMOTE || FS;                  // any shared-database mode
window.NET = NET;
let SESSION = null;
try{ SESSION = JSON.parse(localStorage.getItem('grmp_session')||'null'); }catch(e){}
let db = NET ? null : GRMP.Store.load();
window.SESSION_TOKEN_FN = ()=> SESSION && SESSION.token;

/* ---------- personalized-link auth (R5, spec §2) ----------
   NET mode: a personal page needs a signed-in identity (team account or the person's
   own persona) OR a completed email + one-time-code verification, stored per browser.
   Sandbox: the Open-as switcher IS the simulated identity — no OTP friction there. */
function meAuthed(pid){
  if(!NET) return true;
  if(SESSION && SESSION.identity){
    if(SESSION.identity.kind==='admin') return true;
    if(SESSION.identity.kind==='person' && SESSION.identity.personId===pid) return true;
  }
  try{ const m=JSON.parse(localStorage.getItem('grmp_link_auth')||'{}'); return !!m[pid]; }catch(e){ return false; }
}
function grantMeAuth(pid){
  try{ const m=JSON.parse(localStorage.getItem('grmp_link_auth')||'{}');
    m[pid]=new Date().toISOString(); localStorage.setItem('grmp_link_auth', JSON.stringify(m)); }catch(e){}
}

/* A failed write must stay on screen until a later write succeeds. */
function syncBanner(on, msg){
  let el=document.getElementById('sync-fail');
  if(!on){ if(el) el.remove(); return; }
  if(!el){ el=document.createElement('div'); el.id='sync-fail'; document.body.appendChild(el);
    el.style.cssText='position:fixed;bottom:0;left:0;right:0;z-index:999;background:#C8102E;color:#fff;font-size:13px;font-weight:650;padding:10px 16px;text-align:center'; }
  el.textContent='⚠ Your last change could not reach the shared database — it is applied on this screen and will retry on your next action. '+(msg?'('+String(msg).slice(0,80)+')':'');
}
function busy(on){
  let el=document.getElementById('rpc-busy');
  if(on){ if(!el){ el=document.createElement('div'); el.id='rpc-busy'; el.className='rpc-busy'; document.body.appendChild(el);} }
  else if(el) el.remove();
}
/* every mutation goes through call(): local = apply directly; remote = server applies + returns new db */
function call(fn, ...args){
  if(FS){
    const out = GRMP.D[fn](db, ...args);
    render();
    busy(true);
    FIRE.persist(db).then(()=>{ busy(false); syncBanner(false); })
      .catch(e=>{ busy(false); syncBanner(true, e&&e.message); });
    return Promise.resolve(out);
  }
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

/* Feedback channel. Empty string = button hidden, demo unaffected. */
const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbwvothqM0XvOFOE_HxzkcoZS0v9kSmiEiP_D3FmdJEZOOGz4L46QHD7jvP00PyGdo3v/exec';
const $app = () => document.getElementById('app');
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- local-only persistence wrapper (sandbox mode) ---------- */
function act(fn){ const out = fn(db); GRMP.Store.save(db); render(); return out; }

/* ---------- email popup: renders the verbatim template body (R5) ---------- */
let lastEmailShown = db ? db.emails.length : 0;
function showEmail(e){
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className = 'email-pop';
  const m = GRMP.D.renderMail(db, e);
  const subj = m.subject || e.subject || '';
  const bodyHtml = m.body
    ? `<div class="txt" style="white-space:pre-wrap;max-height:300px;overflow-y:auto;color:var(--ink)">${
        esc(m.body).replace(/#\/me\/[A-Za-z0-9]+/g, x=>`<a href="${x}">${x}</a>`)}</div>`
    : `<div class="txt">In production this email is delivered automatically. The demo shows it here instead.</div>`;
  el.innerHTML = `<div class="head">✉ EMAIL — sent by the system <button class="x" aria-label="close">×</button></div>
    <div class="body"><div class="subj">${esc(subj)}</div>
    <div class="meta">From: ${esc(m.from||'')} · To: ${esc(e.to)} · reply-to ${esc(m.replyTo||'')} · ${esc(e.at)}</div>
    ${bodyHtml}</div>`;
  el.querySelector('.x').onclick = () => el.remove();
  root.appendChild(el);
  setTimeout(()=>el.remove(), m.body ? 20000 : 9000);
}
function flushEmails(){
  while(lastEmailShown < db.emails.length){ showEmail(db.emails[lastEmailShown]); lastEmailShown++; }
}

/* ---------- non-blocking toast (replaces alert) ---------- */
function toast(msg, ok=true){
  const root = document.getElementById('overlay-root');
  const el = document.createElement('div');
  el.className='email-pop'; el.style.width='360px';
  el.innerHTML = `<div class="head" style="background:${ok?'#27865A':'#C8102E'}">${ok?'✓':'!'} ${ok?'DONE':'CHECK'}
      <button class="x" aria-label="close">×</button></div>
    <div class="body"><div class="txt" style="font-size:13.5px;color:var(--ink)">${esc(msg)}</div></div>`;
  el.querySelector('.x').onclick=()=>el.remove();
  root.appendChild(el);
  setTimeout(()=>el.remove(), 5000);
}

/* In-page confirm. Native confirm() blocks the whole page. */
function confirmBox(title, body, danger, onYes){
  const root = document.getElementById('overlay-root');
  const wrap = document.createElement('div');
  wrap.className='fb-wrap';
  wrap.innerHTML = `<div class="fb-bg"></div>
   <div class="fb-modal">
     <h3 style="margin:0 0 6px;font-size:16px">${esc(title)}</h3>
     <div style="font-size:13px;color:var(--ink-2);margin-bottom:14px">${esc(body)}</div>
     <div style="display:flex;gap:8px;justify-content:flex-end">
       <button class="btn sm btn-ghost" data-x="no">Cancel</button>
       <button class="btn sm ${danger?'btn-danger':'btn-primary'}" data-x="yes">${danger?'Yes, reset':'Confirm'}</button>
     </div></div>`;
  const close=()=>wrap.remove();
  wrap.querySelector('[data-x="no"]').onclick=close;
  wrap.querySelector('.fb-bg').onclick=close;
  wrap.querySelector('[data-x="yes"]').onclick=()=>{ close(); onYes(); };
  root.appendChild(wrap);
}

/* ---------- yellow card helper (in-product decision confirmation) ---------- */
let decisionCache = null;
function inferred(qid){
  const it = db.config.openItems[qid]; if(!it) return '';
  if(it.settled) return '';
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
      if(it.status==='wont_fix') return;
      const m = (it.page||'').match(/^DECISION:(Q\d+):(confirm|change)$/);
      if(m) map[m[1]] = {kind:m[2], author:it.author, text:it.text, ts:it.ts, status:it.status, note:it.note};
    });
    decisionCache = map;
  }catch(e){}
}

/* ---------- open-as switcher ---------- */
let openasOpen = false;
function renderOpenAs(){
  if(NET) return '';
  const mentees = db.people.filter(p=>p.kind==='mentee' && p.appStatus==='accepted').slice(0,6);
  const mentors = db.people.filter(p=>p.kind==='mentor' && p.appStatus==='accepted' && !p.droppedOut).slice(0,4);
  const preview = db.people.filter(p=>p.previewFastForward);
  const ind = p => p.kind==='mentor' ? (p.industry||'') : ((p.industryPrefs||[])[0]||'');
  return `<div class="openas">
    ${openasOpen?`<div class="openas-menu">
      <div class="sec">Admin console (sign in)</div>
      <button data-goto="#/console">⚙ Console sign-in page</button>
      <div class="sec">Open a mentee's personal link</div>
      ${preview.map(p=>`<button data-goto="#/me/${p.id}">👤 ${esc(p.name)} <span class="badge b-ai" style="margin-left:auto">fast-forwarded to cycle end</span></button>`).join('')}
      ${mentees.filter(p=>!p.previewFastForward).map(p=>`<button data-goto="#/me/${p.id}">👤 ${esc(p.name)} <span class="ind-chip" style="margin-left:auto">${esc(ind(p))}</span></button>`).join('')}
      <div class="sec">Open a mentor's personal link</div>
      ${mentors.map(p=>`<button data-goto="#/me/${p.id}">🎓 ${esc(p.name)} <span class="ind-chip" style="margin-left:auto">${esc(ind(p))}</span></button>`).join('')}
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
function openFeedbackModal(prefill){
  const ctx = feedbackContext();
  const root = document.getElementById('overlay-root');
  const wrap = document.createElement('div');
  wrap.className='fb-wrap';
  wrap.innerHTML = `<div class="fb-bg"></div>
   <div class="fb-modal">
     <h3 style="margin:0 0 4px;font-size:16px">Feedback on this screen</h3>
     <div style="font-size:11.5px;color:var(--ink-3);margin-bottom:10px">Attached automatically: <b>${esc(ctx.page)}</b> · viewing as <b>${esc(ctx.role)}</b></div>
     <div class="f-row"><label>Your name (optional)</label><input type="text" id="fb-name" placeholder="so we can follow up"></div>
     <div class="f-row"><label>What should change? <span class="req">*</span></label><textarea id="fb-text" placeholder="Describe what you expected, what you saw, or what's missing">${esc(prefill||'')}</textarea></div>
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
  const phase = rot ? `Rotation ${rot.n} · ${rot.label}` : (db.today>db.config.rotations[2].end?'after the cycle':'closing weeks');
  const who = (NET && SESSION && SESSION.identity)
    ? ` · signed in: <b>${esc(SESSION.identity.name||SESSION.identity.label)}</b> · <a href="#" data-act="logout">sign out</a>` : '';
  const openN = Object.values(db.config.openItems||{}).filter(i=>!i.settled).length;
  const open = openN ? ` · <a href="#/decisions"><b>${openN} decision${openN===1?'':'s'} await${openN===1?'s':''} your confirmation</b></a>` : '';
  return `<div class="demo-banner">Sample data only · simulated today: <b>${db.today}</b> (${phase})${open} ·
    <a href="#/changelog">changelog</a> · <a href="#/manual">user manual</a>${who}</div>`;
}

/* SGT display for machine timestamps */
function fmtSGT(iso){
  try{ const d=new Date(iso); if(isNaN(d)) return iso;
    return d.toLocaleString('en-SG',{timeZone:'Asia/Singapore',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',hour12:false})+' SGT';
  }catch(e){ return iso; }
}
/* ---------- router ---------- */
const routes = [
  {re:/^#\/$/,                view:()=>Views.landing()},
  {re:/^#\/guide\/mentee$/,   view:()=>Views.guideMentee()},
  {re:/^#\/guide\/mentor$/,   view:()=>Views.guideMentor()},
  {re:/^#\/reflection(?:\/(.+))?$/, view:m=>Views.reflection(m[1])},
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
  const h0 = location.hash || '#/';
  /* Console needs a team session. Personal pages do NOT force the account login any
     more: they carry their own email + one-time-code flow (spec §2), handled in the view. */
  const gated = /^#\/console/.test(h0);
  if(NET && !SESSION && (gated || h0==='#/login')){ $app().innerHTML = renderLogin(); bindGlobal(); return; }
  if(NET && SESSION && /^#\/console/.test(h0)){
    const who = SESSION.identity, m = h0.match(/^#\/console\/([^/]+)/);
    if(who && who.kind==='person'){ location.hash = '#/me/'+who.personId; return; }
    if(who && who.name && (!m || decodeURIComponent(m[1])!==who.name)){
      location.hash = '#/console/'+encodeURIComponent(who.name); return;
    }
  }
  /* A signed-in participant persona stays on their own page. */
  if(NET && SESSION && SESSION.identity && SESSION.identity.kind==='person'){
    const m = h0.match(/^#\/me\/(.+)$/);
    if(m && m[1]!==SESSION.identity.personId){ location.hash='#/me/'+SESSION.identity.personId; return; }
  }
  if(NET && !db){ $app().innerHTML = `<div class="login-wrap"><div class="login-card" style="text-align:center"><h1>GRMP Platform</h1><div class="sub">Connecting to the shared database…</div></div></div>`; return; }
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
    <div style="text-align:center;margin-top:10px"><a href="#/" onclick="location.hash='#/';" style="font-size:12.5px">← Browse the programme site without signing in</a></div>
  </div></div>`;
}

/* ---------- progressive AI upgrade: template → live model, in place ---------- */
async function upgradeAI(){
  if(!window.AI || !AI.enabled) return;
  document.querySelectorAll('[data-ai-sum]').forEach(async el=>{
    const id = el.dataset.aiSum, ck = 'sum:'+id;
    if(AI.cache[ck]) return;
    const p = GRMP.D.person(db, id); if(!p) return;
    const txt = await AI.gen(ck, AI.summaryPrompt(p));
    if(txt && el.isConnected){
      const tx=el.querySelector('.ai-txt'), src=el.querySelector('.ai-src');
      if(tx) tx.textContent = txt;
      if(src) src.textContent = 'generated live';
    } else if(el.isConnected){
      const src=el.querySelector('.ai-src'); if(src) src.textContent='template (model unavailable)';
    }
  });
  const AI_REWRITES_RATIONALES = false;
  if(!AI_REWRITES_RATIONALES) return;
}
/* Every form row is `<div class="f-row"><label>…</label><control></div>` — link labels
   programmatically so assistive tech announces every control. */
let _lblSeq = 0;
function linkFormLabels(){
  document.querySelectorAll('.f-row').forEach(row=>{
    const label = row.querySelector('label');
    const ctls = [...row.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')];
    if(!label || !ctls.length) return;
    const base = label.textContent.replace(/\*/g,'').trim();
    const parts = base.split(/\s*[\/·]\s*/);
    ctls.forEach((ctl,i)=>{
      if(!ctl.id) ctl.id = 'fld-' + (++_lblSeq);
      if(i===0 && !label.htmlFor) label.htmlFor = ctl.id;
      if(!ctl.getAttribute('aria-label'))
        ctl.setAttribute('aria-label', ctls.length>1 && parts.length>1
          ? `${parts[0]} ${parts[Math.min(i,parts.length-1)]}`.trim() : base);
    });
  });
  document.querySelectorAll('select:not([aria-label])').forEach(s=>{
    const near = s.closest('td,div')?.querySelector('label,b,strong');
    s.setAttribute('aria-label', (near && near.textContent.trim()) || 'Select an option');
  });
}
function bindGlobal(){
  linkFormLabels();
  const t = document.getElementById('openas-toggle');
  if(t) t.onclick = ()=>{ openasOpen = !openasOpen; render(); };
}
/* Single document-level delegation: markup injected AFTER render gets working
   buttons too. Registered once. */
document.addEventListener('click', e=>{
  const g = e.target.closest('[data-goto]');
  if(g){ openasOpen=false; location.hash = g.dataset.goto; return; }
  const b = e.target.closest('[data-act]');
  if(b){ const fn = Actions[b.dataset.act]; if(fn) fn(b.dataset); }
});
/* R5 form behaviour, delegated once:
   - conditional fields re-resolve when their driver changes (spec: branch re-resolves)
   - the two mentee prompts hard-cap at 200 words with a live count
   - gate radios reveal their conditional detail fields without a full re-render */
document.addEventListener('change', e=>{
  const id = e.target && e.target.id;
  if(['af-heard','af-industry','af-telegramConsent','af-whatsappConsent'].includes(id)){
    Actions._applyCollect(); render(); return;
  }
  if(e.target && e.target.name==='g-coi'){
    const d=document.getElementById('g-coi-details');
    if(d) d.style.display = e.target.value==='some' ? '' : 'none';
  }
  if(e.target && e.target.name==='g-ko'){
    const d=document.getElementById('g-ko-reason');
    if(d) d.style.display = e.target.value==='exception' ? '' : 'none';
  }
});
document.addEventListener('input', e=>{
  const el = e.target;
  if(el && el.dataset && el.dataset.wordcap){
    const cap = Number(el.dataset.wordcap);
    const words = String(el.value).trim().split(/\s+/).filter(Boolean);
    if(words.length>cap){ el.value = words.slice(0,cap).join(' '); }
    const wc = document.querySelector(`.wc[data-wc-for="${el.id}"]`);
    if(wc) wc.textContent = String(Math.min(words.length,cap));
  }
});
/* No save-and-resume (confirmed): the browser leave-site warning is the only guard
   against losing a partly-completed application — a firm requirement, not optional. */
window.addEventListener('beforeunload', e=>{
  const S = window.__APPLY;
  if(S && Object.values(S.d||{}).some(v=>v && String(v).trim && String(v).trim())){
    e.preventDefault(); e.returnValue = '';
  }
});
window.addEventListener('hashchange', ()=>{
  /* Navigating away from the form drops its in-memory state (that is the no-save
     model); returning starts fresh at step 1. */
  if(window.__APPLY && !/^#\/apply\//.test(location.hash||'')) window.__APPLY = null;
  render();
});
window.addEventListener('DOMContentLoaded', ()=>{
  if(FS){
    render();
    if(!FIRE.init()){ $app().innerHTML='<div class="login-wrap"><div class="login-card"><h1>GRMP Platform</h1><div class="sub">Firebase failed to load — refresh to retry.</div></div></div>'; return; }
    FIRE.boot((newDb, first)=>{
      db = newDb;
      if(first){ lastEmailShown = db.emails.length; }
      if(SESSION && SESSION.identity && SESSION.identity.kind==='person' &&
         !db.people.some(p=>p.id===SESSION.identity.personId)){ SESSION=null; localStorage.removeItem('grmp_session'); }
      render();
    }).then(()=>{ loadDecisions().then(()=>render()); });
    return;
  }
  if(!REMOTE){ render(); loadDecisions().then(()=>render()); return; }
  render();
  rpc('boot', SESSION&&SESSION.token).then(r=>{
    db=r.db; lastEmailShown=db?db.emails.length:0;
    if(r.identity){ SESSION={...(SESSION||{}), identity:r.identity}; }
    else if(SESSION){ SESSION=null; localStorage.removeItem('grmp_session'); }
    render(); loadDecisions().then(()=>render());
  }).catch(e=>{ $app().innerHTML='<div class="login-wrap"><div class="login-card"><h1>GRMP Platform</h1><div class="sub">Could not reach the server — refresh to retry.</div></div></div>'; });
});

/* ---------- R5 application-form validation (spec error strings, per step) ---------- */
const APPLY_VAL = {
  _email:v=>/.+@.+\..+/.test(v||''),
  _phone:v=>/^[+\d][\d\s+\-]{6,18}$/.test(String(v||'').trim()),
  _linkedin:v=>/^((https?:\/\/)?(www\.)?linkedin\.com\/)/i.test(String(v||'').trim()),
  mentee:{
    1:d=>{
      const e={};
      if(!APPLY_VAL._email(d.email)) e.email='Please enter a valid email address.';
      if(!String(d.firstName||'').trim()) e.firstName='Please enter your first name.';
      if(!String(d.lastName||'').trim()) e.lastName='Please enter your last name.';
      if(!APPLY_VAL._phone(d.phone)) e.phone='Please enter a valid phone number.';
      if(!String(d.nationality||'').trim()) e.nationality='Please tell us your nationality.';
      if(!APPLY_VAL._linkedin(d.linkedin)) e.linkedin='Please enter a valid LinkedIn URL.';
      if(!d.heard) e.heard='Please select an option.';
      if(/referred/.test(d.heard||'') && !String(d.referrer||'').trim()) e.referrer='Please tell us who referred you.';
      return e;
    },
    2:d=>{
      const e={};
      if(!d.year) e.year='Please select your year of study.';
      if(!d.faculty) e.faculty='Please select your faculty.';
      if(!String(d.degree||'').trim()) e.degree='Please enter your degree and major.';
      if(!d.eligibilityConfirmed) e.eligibilityConfirmed=GRMP.COPY.eligibilityErr;
      return e;
    },
    3:d=>{
      const e={};
      if(!String(d.prompt1||'').trim()) e.prompt1='Please share a little about what you would like to grow.';
      if(!String(d.prompt2||'').trim()) e.prompt2='Please share a little about your curiosity and how you would contribute.';
      if(!d.ind1) e.ind1='Please select an industry.';
      if(!d.ind2) e.ind2='Please select an industry.';
      else if(d.ind2===d.ind1) e.ind2='Please select a different industry from your first choice.';
      if(!d.ind3) e.ind3='Please select an industry.';
      else if(d.ind3===d.ind1||d.ind3===d.ind2) e.ind3='Please select a different industry from your earlier choices.';
      return e;
    },
    4:d=>{
      const e={};
      if(!d.commit) e.commit='Please select an option.';
      if(!d.telegramConsent) e.telegramConsent='Please select an option.';
      if(d.telegramConsent==='No' && !d.contactPref) e.contactPref='Please tell us how you would like to be contacted.';
      if(!d.pdpa) e.pdpa='Please provide consent to proceed.';
      return e;
    },
  },
  mentor:{
    1:d=>{
      const e={};
      if(!APPLY_VAL._email(d.email)) e.email='Please enter a valid email address.';
      if(!String(d.firstName||'').trim()) e.firstName='Please enter your first name.';
      if(!String(d.lastName||'').trim()) e.lastName='Please enter your last name.';
      if(!APPLY_VAL._phone(d.phone)) e.phone='Please enter a valid phone number.';
      if(!String(d.nationality||'').trim()) e.nationality='Please tell us your nationality.';
      if(!d.heard) e.heard='Please select an option.';
      if(/referred/.test(d.heard||'') && !String(d.referrer||'').trim()) e.referrer='Please tell us who referred you.';
      return e;
    },
    2:d=>{
      const e={};
      const returning = d.heard===GRMP.FORM_OPTS.heardMentor[0];
      if(!String(d.org||'').trim()) e.org='Please enter your organisation.';
      if(!String(d.designation||'').trim()) e.designation='Please enter your designation.';
      if(!d.industry) e.industry='Please select your industry.';
      if(d.industry===GRMP.INDUSTRIES[16] && !String(d.industryOther||'').trim()) e.industryOther='Please tell us your industry.';
      if(!String(d.linkedin||'').trim()) e.linkedin='Please enter your LinkedIn profile URL.';
      else if(!APPLY_VAL._linkedin(d.linkedin)) e.linkedin='Please enter a valid LinkedIn URL.';
      if(!returning){
        if(!d.yearsExp) e.yearsExp='Please select a range.';
        if(!d.ledTeam) e.ledTeam='Please select an option.';
        if(!String(d.leadership||'').trim()) e.leadership='Please share a little about your experience.';
        if(!d.crossIndustry) e.crossIndustry='Please select an option.';
      }
      return e;
    },
    3:d=>{
      const e={};
      const returning = d.heard===GRMP.FORM_OPTS.heardMentor[0];
      if(!returning && !d.priorMentoring) e.priorMentoring='Please select an option.';
      if(!(d.draws||[]).length) e.draws='Please select at least one.';
      if(!String(d.interests||'').trim()) e.interests='Please tell us a little about your interests.';
      return e;
    },
    4:d=>{
      const e={};
      if(!d.commit) e.commit='Please select an option.';
      if(!d.whatsappConsent) e.whatsappConsent='Please select an option.';
      if(d.whatsappConsent==='No' && !d.contactPref) e.contactPref='Please tell us how you would like to be contacted.';
      if(!d.pdpa) e.pdpa='Please provide consent to proceed.';
      return e;
    },
  },
};

/* ---------- action registry (wired from data-act attributes) ---------- */
const Actions = {
  doLogin(){
    const u=(document.getElementById('lg-u')||{}).value?.trim().toLowerCase();
    const p=(document.getElementById('lg-p')||{}).value?.trim();
    if(!u||!p){ window.__loginErr='Enter the account and passcode.'; render(); return; }
    if(FS){
      const acct=(db.config.accounts||[]).find(x=>x.u===u);
      if(!acct || acct.pass!==p){ window.__loginErr='Wrong account or passcode.'; render(); return; }
      const identity = acct.kind==='admin'
        ? {kind:'admin', name:acct.name, label:acct.label, roles:(db.config.admins.find(x=>x.name===acct.name)||{}).roles||[]}
        : {kind:'person', personId:acct.personId, name:(GRMP.D.person(db,acct.personId)||{}).name||acct.u, label:acct.label, roles:['participant']};
      SESSION={token:'fs-'+Math.random().toString(36).slice(2), identity};
      localStorage.setItem('grmp_session', JSON.stringify(SESSION));
      window.__loginErr=null;
      GRMP.D.logAudit(db, db.today, identity.name, 'signin', acct.u);
      FIRE.persist(db);
      render();
      toast('Signed in as '+identity.label+'. Everything here is shared live with the team.');
      if(identity.kind==='person') location.hash='#/me/'+identity.personId;
      else location.hash='#/console/'+encodeURIComponent(identity.name);
      return;
    }
    busy(true);
    rpc('login', u, p).then(r=>{ busy(false);
      if(!r.ok){ window.__loginErr=r.error||'Wrong account or passcode.'; render(); return; }
      window.__loginErr=null; SESSION={token:r.token, identity:r.identity};
      localStorage.setItem('grmp_session', JSON.stringify(SESSION));
      db=r.db; lastEmailShown=db.emails.length; render();
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
    const shared = FS || REMOTE;
    confirmBox(
      shared ? 'Reset the shared database?' : 'Reset the demo data?',
      shared ? 'Everyone signed in sees this. All applications, matches, close-offs and certificates return to the seeded sample cohort.'
             : 'Everything in this browser returns to the seeded sample cohort.',
      true,
      ()=>{
        if(FS){ busy(true);
          FIRE.resetAll().then(fresh=>{ db=fresh; lastEmailShown=db.emails.length; busy(false); render(); toast('Shared database reset to seed.'); })
            .catch(e=>{ busy(false); toast('Reset failed: '+(e&&e.message||''), false); });
          return; }
        if(REMOTE){ call('adminReset'); return; }
        db = GRMP.Store.reset(); lastEmailShown = db.emails.length; render(); toast('Demo data reset to seed.');
      });
  },

  /* --- R5 staged application form --- */
  _applyCollect(){
    const S=window.__APPLY; if(!S) return;
    document.querySelectorAll('#apply-form input[id^="af-"], #apply-form select[id^="af-"], #apply-form textarea[id^="af-"]').forEach(el=>{
      const k=el.id.slice(3);
      S.d[k] = el.type==='checkbox' ? el.checked : el.value;
    });
    if(document.querySelector('.af-draw'))
      S.d.draws=[...document.querySelectorAll('.af-draw:checked')].map(c=>c.value);
  },
  applyNext(d){
    const S=window.__APPLY; if(!S) return;
    Actions._applyCollect();
    const errs = APPLY_VAL[S.kind][S.step](S.d);
    S.errors = errs;
    if(Object.keys(errs).length){ render(); Actions._focusFirstError(); return; }
    S.step++; render(); window.scrollTo(0,0);
  },
  applyBack(){
    const S=window.__APPLY; if(!S) return;
    Actions._applyCollect();                 // back-navigation preserves all entered data
    S.errors={}; S.step--; render(); window.scrollTo(0,0);
  },
  _focusFirstError(){
    setTimeout(()=>{
      const err=document.querySelector('.f-err');
      const row=err && err.closest('.f-row');
      const ctl=row && row.querySelector('input,select,textarea');
      if(ctl) ctl.focus();
    },30);
  },
  applySubmit(d){
    const S=window.__APPLY; if(!S) return;
    Actions._applyCollect();
    const errs = APPLY_VAL[S.kind][4](S.d);
    S.errors = errs;
    if(Object.keys(errs).length){ render(); Actions._focusFirstError(); return; }
    const btn=document.getElementById('apply-submit'); if(btn) btn.disabled=true;
    const x=S.d;
    const payload = S.kind==='mentee'
      ? {email:x.email, firstName:x.firstName, lastName:x.lastName, phone:x.phone, nationality:x.nationality,
         linkedin:x.linkedin, heard:x.heard, referrer:x.referrer, year:x.year, faculty:x.faculty,
         faculty2:x.faculty2||'Not applicable', degree:x.degree, eligibilityConfirmed:!!x.eligibilityConfirmed,
         prompt1:x.prompt1, prompt2:x.prompt2, industryPrefs:[x.ind1,x.ind2,x.ind3],
         commit:x.commit, telegramConsent:x.telegramConsent, contactPref:x.contactPref, pdpa:true}
      : {email:x.email, firstName:x.firstName, lastName:x.lastName, phone:x.phone, nationality:x.nationality,
         heard:x.heard, referrer:x.referrer, lastCycleEmail:x.lastCycleEmail,
         org:x.org, designation:x.designation, industry:x.industry, industryOther:x.industryOther,
         linkedin:x.linkedin, yearsExp:x.yearsExp, ledTeam:x.ledTeam, leadership:x.leadership,
         crossIndustry:x.crossIndustry, priorMentoring:x.priorMentoring, draws:x.draws||[],
         anythingElse:x.anythingElse, interests:x.interests,
         commit:x.commit, whatsappConsent:x.whatsappConsent, contactPref:x.contactPref, pdpa:true};
    call('submitApplication', S.kind, payload).then(res=>{
      if(!res || !res.person){
        if(btn) btn.disabled=false;
        toast('Something is incomplete: '+((res&&res.missing)||[]).join(', '), false);
        return;
      }
      window.__APPLY=null;
      location.hash = '#/applied/'+res.person.id;
    }).catch(()=>{ if(btn) btn.disabled=false; });   // on failure keep all entered data
  },

  /* --- R5 OTP link login --- */
  otpRequest(d){
    const email=(document.getElementById('otp-email')||{}).value||'';
    call('requestOtp', d.person, email).then(r=>{
      if(r && r.error){ window.__OTP={pid:d.person, stage:'email', err:r.error}; render(); return; }
      window.__OTP={pid:d.person, stage:'code', err:null}; render();
      toast('Verification code sent — in staging it appears in the ✉ email popup.');
    });
  },
  otpVerify(d){
    const code=(document.getElementById('otp-code')||{}).value||'';
    call('verifyOtp', d.person, code).then(ok=>{
      if(ok){ grantMeAuth(d.person); window.__OTP=null; render(); toast('Signed in — welcome.'); }
      else { window.__OTP={pid:d.person, stage:'code', err:'That code does not match — check the latest email and try again.'}; render(); }
    });
  },
  otpRestart(d){ window.__OTP={pid:d.person, stage:'email', err:null}; render(); },

  /* --- R5 acceptance gate (three separately-timestamped items) --- */
  gateRules(d){
    const tick=document.getElementById('g-rules-tick');
    const err=document.getElementById('g-rules-err');
    if(!tick || !tick.checked){ if(err) err.style.display=''; return; }
    call('ackRules', d.person).then(()=>toast('Programme Rules acknowledged — timestamp recorded.'));
  },
  gateCoi(d){
    const sel=document.querySelector('input[name="g-coi"]:checked');
    const confirm_=document.getElementById('g-coi-confirm');
    const details=(document.getElementById('g-coi-text')||{}).value||'';
    const err=document.getElementById('g-coi-err');
    const fail=msg=>{ if(err){ err.textContent=msg; err.style.display=''; } };
    if(!sel){ fail(GRMP.COPY.coiSelectErr); return; }
    const declared = sel.value==='some';
    if(declared && !details.trim()){ fail(GRMP.COPY.coiDetailsErr); return; }
    if(!confirm_ || !confirm_.checked){ fail(GRMP.COPY.coiTickErr); return; }
    call('submitCoi', d.person, declared, details).then(p=>{
      toast(p ? 'Conflict of Interest declaration recorded.' : 'Please complete the declaration.', !!p);
      Actions._maybeConfirmToast(d.person);
    });
  },
  gateKickoff(d){
    const sel=document.querySelector('input[name="g-ko"]:checked');
    const reason=(document.getElementById('g-ko-text')||{}).value||'';
    const err=document.getElementById('g-ko-err');
    const fail=msg=>{ if(err){ err.textContent=msg; err.style.display=''; } };
    if(!sel){ fail(GRMP.COPY.kickoffSelectErr); return; }
    const attend = sel.value==='attend';
    if(!attend && !reason.trim()){ fail(GRMP.COPY.kickoffReasonErr); return; }
    call('submitKickoff', d.person, attend, reason).then(p=>{
      toast(p ? (attend?'Kick-Off attendance confirmed.':'Exception request recorded — Esther Koh and Wei Kiat Koh will review it.') : 'Please complete this item.', !!p);
      Actions._maybeConfirmToast(d.person);
    });
  },
  _maybeConfirmToast(pid){
    const p=GRMP.D.person(db,pid);
    if(p && GRMP.D.placeConfirmed(p)) setTimeout(()=>toast('All three acknowledgements recorded — your place is confirmed. Welcome!'), 600);
  },
  gateDemoAll(d){ call('demoCompleteGate', d.person).then(()=>toast('Gate completed (demo shortcut) — place confirmed.')); },
  kickoffLogistics(d){
    const arrival = d.skip ? '' : ((document.getElementById('ko-arrival')||{}).value||'');
    const dietary = d.skip ? '' : ((document.getElementById('ko-dietary')||{}).value||'');
    call('saveKickoffLogistics', d.person, arrival, dietary)
      .then(()=>toast('Noted — see you at the Kick-Off.'));
  },

  saveOrientVideo(d){
    const mentee=(document.getElementById('ov-url')||{}).value||'';
    const mentor=(document.getElementById('ov-url-mentor')||{}).value||'';
    call('setOrientationVideos', mentee, mentor, d.actor)
      .then(v=>toast((v.mentee||v.mentor)?'Recording links saved — participants see them as an optional briefing on their page.':'Links cleared.'));
  },
  confirmReturn(d){ call('confirmReturn', d.person).then(()=>toast('Welcome back! Please complete this cycle’s acceptance gate below.')); },
  closeoff(d){
    const met = document.getElementById('co-met').checked;
    const ref = document.getElementById('co-ref').checked;
    if(!met || !ref){ toast('Both confirmations are required to close off the rotation.', false); return; }
    const extraEl = document.getElementById('co-extra');
    const extra = extraEl ? extraEl.value.trim() : '';
    if(extraEl && !extra){
      toast(d.rot==='2' ? 'Your mid-programme review is part of the Rotation 2 close-off.'
                        : 'Your end-of-programme evaluation is part of the Rotation 3 close-off.', false);
      return;
    }
    const c = document.getElementById('co-comment').value;
    call('closeoff', d.pair, true, true, c, extra);
  },
  endeval(d){
    const t = document.getElementById('ee-text').value.trim();
    if(!t){ toast('Please write your end-of-programme evaluation first.', false); return; }
    call('submitEndEvaluation', d.person, t).then(()=>toast('End-of-programme evaluation submitted — thank you.'));
  },
  fbReply(d){
    const inp=document.getElementById('cl-reply-'+d.fid);
    const text=(inp&&inp.value.trim())||'';
    if(!text){ toast('Write the reply first.', false); return; }
    if(!(typeof NET!=='undefined'&&NET&&FIRE&&FIRE.fs)){ toast('Replies need the shared database (online mode).', false); return; }
    let who='SMC team';
    if(SESSION&&SESSION.identity){
      who = SESSION.identity.name
         || (SESSION.identity.kind==='person' && (GRMP.D.person(__demo.db, SESSION.identity.personId)||{}).name)
         || 'SMC team';
    }
    const btn=document.querySelector(`button[data-act="fbReply"][data-fid="${d.fid}"]`); if(btn) btn.disabled=true;
    FIRE.fs.collection('feedback_comments').add({fid:d.fid, by:who, text:text.slice(0,1500), ts:new Date().toISOString()})
      .then(()=>{ toast('Reply posted — it appears for everyone on this page.'); Views.__clCache=null; render(); })
      .catch(()=>{ if(btn) btn.disabled=false; toast('Could not post right now — try again in a minute.', false); });
  },
  fbDiscuss(d){ openFeedbackModal(`[${d.q}] `); },
  certException(d){
    const inp = document.getElementById('exc-reason-'+d.person);
    const reason = inp ? inp.value.trim() : '';
    if(!reason){ toast('A reason is required — it is recorded on the certificate and audited.', false); return; }
    const nm = (GRMP.D.person(__demo.db, d.person)||{}).name || d.person;
    confirmBox(`Approve ${nm}'s certificate by exception?`,
      `Reason: “${reason}” — recorded on the certificate and written to the audit log under your name.`, false, ()=>{
      call('approveByException', d.person, reason, d.actor).then(r=>{
        toast(r? 'Approved by exception — recorded and audited.' : 'Nothing to approve — already certified or fully eligible.', !!r);
      });
    });
  },
  midreview(d){
    const t = document.getElementById('mr-text').value.trim();
    if(!t){ toast('Please write a short review first.', false); return; }
    call('submitMidReview', d.person, t);
  },
  builder(d){
    const t = document.getElementById('br-text').value.trim();
    if(!t){ toast('Please write your Builder’s Commitment first.', false); return; }
    call('submitBuilderReflection', d.person, t);
  },
  score(d){
    const crits = (d.kind==='mentor'?GRMP.MENTOR_CRITERIA:GRMP.MENTEE_CRITERIA).filter(c=>c.scored);
    const criteria={}; let sum=0, n=0, missing=false;
    crits.forEach((c,i)=>{
      const el=document.getElementById(`sc-${d.person}-${i}`);
      if(!el || !el.value){ missing=true; return; }
      criteria[c.key]=Number(el.value); sum+=Number(el.value); n++;
    });
    if(missing || !n){ toast('Please score every criterion (1–5) before submitting.', false); return; }
    const avg = Math.round(sum/n*10)/10;
    const c = (document.getElementById('cm-'+d.person)||{}).value||'';
    call('score', d.person, d.reviewer, avg, c, criteria);
  },
  decide(d){ call('decide', d.person, d.decision, d.actor); },
  reserveReply(d){ call('recordReserveReply', d.person, d.reply==='in', d.actor)
    .then(r=>toast(r? (d.reply==='in'?'Recorded — opted in to the Reserve list.':'Recorded — declined the Reserve list.') : 'Not on the Reserve list.', !!r)); },
  activateReserve(d){
    const nm=(GRMP.D.person(__demo.db,d.person)||{}).name||d.person;
    confirmBox(`Activate ${nm} from the Reserve list?`,
      'They receive their activation acceptance email with the later deadline, and enter the normal acceptance-gate flow.', false,
      ()=>call('activateReserve', d.person, d.actor).then(r=>toast(r?'Activated — acceptance email sent with the later deadline.':'Could not activate.', !!r)));
  },
  sendReminders(d){
    const n = GRMP.D.reminderTargets(__demo.db).length;
    if(!n){ toast('Nobody is waiting on a reminder — everyone accepted has confirmed (or already been reminded).', false); return; }
    confirmBox(`Send ${n} acceptance reminder${n>1?'s':''}?`,
      'Only accepted participants whose place is not yet confirmed, each at most once (no same-day nudge, per the confirmed rule). Activated reserves get the activation variant.', false,
      ()=>call('sendAcceptanceReminders', d.actor).then(out=>toast(`${(out||[]).length} reminder(s) sent.`)));
  },
  resolveKickoffExc(d){ call('resolveKickoffException', d.person, d.outcome, d.actor)
    .then(r=>toast(r? (d.outcome==='waived'?'Exception approved — attendance waived and the participant notified.':'Recorded — the participant is asked to attend; notified.') : 'Already resolved.', !!r)); },
  suggest(d){
    if(REMOTE){ call('suggestMatches', Number(d.rotation)).then(n=>{ if(!n||!n.length) toast('No unmatched mentees (or no mentor capacity) right now.', false); }); return; }
    if(window.__suggestBusy) return;
    const rot=Number(d.rotation);
    const out = GRMP.D.suggestMatches(db, rot);
    const done = ()=>{
      if(FS){ busy(true); FIRE.persist(db).then(()=>busy(false)).catch(e=>{ busy(false); toast('Sync failed — retrying on next action. '+(e&&e.message||''), false); }); }
      else GRMP.Store.save(db);
    };
    if(!out || !out.length){ render(); toast('No unmatched mentees (or no mentor capacity) right now.', false); return; }
    if(navigator.webdriver){ render(); done(); return; }
    window.__suggestBusy = true;
    window.__hiddenProposals = new Set(out.map(p=>p.id));
    render();
    (async()=>{
      for(const pr of out){
        await new Promise(r=>setTimeout(r, 450));
        window.__hiddenProposals.delete(pr.id);
        render();
      }
      window.__suggestBusy = null; window.__hiddenProposals = null;
      render();
      toast(`${out.length} match${out.length>1?'es':''} ranked and proposed — each card shows what it was ranked against.`);
      done();
    })();
  },
  approvePair(d){ call('approvePair', d.pair, d.actor); },
  reassignPair(d){ call('reassignProposal', d.pair, d.mentor, d.actor)
    .then(r=>toast(r? 'Mentor swapped — the rationale now reflects your choice.' : 'That mentor is no longer eligible.', !!r)); },
  discardPair(d){ call('discardProposal', d.pair, d.actor)
    .then(r=>toast(r? 'Suggestion discarded — the mentee is back in the unmatched pool.' : 'Already actioned.', !!r)); },
  withdrawUnack(d){
    const n = GRMP.D.pendingWithdrawal(db).length;
    confirmBox(`Release ${n} seat${n>1?'s':''}?`,
      `Their acceptance deadline has passed without the gate being completed. Per the confirmed rule their places are freed for the Reserve list and each is notified. Activating someone from the Reserve list is how the seat is refilled.`,
      true, ()=>call('withdrawUnacknowledged', d.actor)
        .then(out=>toast(`${(out||[]).length} seat(s) released and notified.`)));
  },
  replaceMentor(d){ call('replaceMentor', d.pair, d.bench, d.actor); },
  replaceMentorSel(d){
    const sel = document.getElementById('bench-'+d.pair);
    if(sel) Actions.replaceMentor({pair:d.pair, bench:sel.value, actor:d.actor});
  },
  markDropout(d){
    const mentorId = (document.getElementById('drop-mentor')||{}).value;
    const reason = (document.getElementById('drop-reason')||{}).value || '';
    if(!mentorId) return;
    const m = GRMP.D.person(db, mentorId);
    const n = db.pairs.filter(p=>p.mentorId===mentorId&&p.status==='approved').length;
    confirmBox(`Mark ${m?m.name:'this mentor'} as dropped out?`,
      `${n} active mentee${n===1?'':'s'} move to the re-match queue, refilled from the opted-in Reserve Mentor list. The mentor is removed from all future matching.`,
      true, ()=>call('markDropout', mentorId, reason, d.actor)
        .then(out=>toast(out? `${out.affected} mentee(s) queued for re-match.` : 'Already marked as dropped.', !!out)));
  },
  issueCerts(d){ call('issueCertificates', d.actor).then(out=>toast((out&&out.length)? out.length+' certificate(s) marked ready — presented at the Appreciation Night; participants got a heads-up email.' : 'Nobody newly qualifies yet — check the exception report below for who misses what.', !!(out&&out.length))); },
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
    confirmBox('Start "'+label+'"?',
      'The current cycle is archived. Mentors '+(carry?'carry over as invited and must complete the new cycle’s acceptance gate':'are NOT carried over')
      +'. Mentees, pairs and certificates reset for the new cycle.', true, ()=>{
      call('startNewCycle', {label, rotations:rot, today, actor:(SESSION&&SESSION.identity&&SESSION.identity.name)||'lead', carryOverMentors:carry})
        .then(id=>{ toast('New cycle '+id+' started — previous cycle archived.'); location.hash='#/console/'+encodeURIComponent((SESSION&&SESSION.identity&&SESSION.identity.name)||'Esther'); });
    });
  },
  exportReport(){
    const D=GRMP.D;
    const rows=[['id','name','kind','industry','status','place_confirmed','kickoff','closeoffs','mid_review','builder_reflection','certificate']];
    db.people.filter(p=>['accepted','invited'].includes(p.appStatus)).forEach(p=>{
      rows.push([p.id,p.name,p.kind,
        p.kind==='mentor'?(p.industry||''):((p.industryPrefs||[])[0]||''),
        p.appStatus,D.placeConfirmed(p)?'yes':'no',
        p.kickoff?(p.kickoff.status==='confirmed'?'confirmed':'exception'):'-',
        p.kind==='mentee'?D.menteeCloseoffs(db,p.id).length:'-',
        p.kind==='mentor'?(db.midreviews.some(m=>m.mentorId===p.id)?'yes':'no'):'-',
        p.kind==='mentee'?(db.builderReflections.some(b=>b.menteeId===p.id)?'yes':'no'):'-',
        db.certificates.some(c=>c.personId===p.id)?'yes':'no']);
    });
    const csv=rows.map(r=>r.map(v=>String(v).includes(',')?`"${v}"`:v).join(',')).join('\n');
    const blob=new Blob([csv],{type:'text/csv'});
    const aEl=document.createElement('a'); aEl.href=URL.createObjectURL(blob); aEl.download='grmp_cohort_report.csv'; aEl.click();
    toast('Cohort report downloaded ('+(rows.length-1)+' rows).');
  },
  openFeedback(){ openFeedbackModal(); },
  decideDefault(d){ __decideDefault(d); },
  openMail(d){
    const e = db.emails[Number(d.ix)];
    if(e) showEmail(e);
  },
  openMailTpl(d){
    showEmail({tpl:d.tpl, to:'(template preview)', at:db.today,
      vars:{name:'[Name]', link:'#/me/'+(db.people.find(p=>p.appStatus==='accepted')||{id:'E001'}).id, code:'123456'}});
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
