/* GRMP Demo — core: router, shell, open-as switcher, email popups.
   Views live in views_public.js (microsite + personal) and views_console.js (admin). */

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

/* A failed write must stay on screen until a later write succeeds — a 5-second toast
   is invisible exactly when it matters. The banner also tells the user their action is
   applied locally and will retry, which is the truth. */
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

/* Feedback channel — filled in once the Apps Script backend is deployed.
   Empty string = button hidden, demo unaffected. */
const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbwvothqM0XvOFOE_HxzkcoZS0v9kSmiEiP_D3FmdJEZOOGz4L46QHD7jvP00PyGdo3v/exec';
const $app = () => document.getElementById('app');
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- local-only persistence wrapper (sandbox mode) ---------- */
function act(fn){ const out = fn(db); GRMP.Store.save(db); render(); return out; }

/* ---------- email popup (the "this email would be sent" surface) ---------- */
let lastEmailShown = db ? db.emails.length : 0;
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
  el.innerHTML = `<div class="head" style="background:${ok?'#27865A':'#C8102E'}">${ok?'✓':'!'} ${ok?'DONE':'CHECK'}
      <button class="x" aria-label="close">×</button></div>
    <div class="body"><div class="txt" style="font-size:13.5px;color:var(--ink)">${esc(msg)}</div></div>`;
  el.querySelector('.x').onclick=()=>el.remove();
  root.appendChild(el);
  setTimeout(()=>el.remove(), 5000);
}

/* Acknowledgement documents — structure only; SMC supplies final wording (R2-Q4 sibling). */
const DOC_TEXT = {
  rules:`<p>What the programme expects of you: attend your rotations, meet your mentor at least twice
    per rotation, and complete your close-off within the rotation window.</p>
    <p>Missing a close-off after the final reminder frees your seat for someone on the waitlist.</p>`,
  charter:`<p>SMC is a volunteer-run committee. Everyone in GRMP — mentors, mentees and the programme
    team — is bound by the Committee's charter on conduct, respect and confidentiality.</p>`,
  governance:`<p>How decisions are made and escalated: the Programme Lead decides matches and outcomes;
    concerns go to the Escalation Owner privately and are referred to SMC's Grievance &amp; Misconduct process.</p>`,
  pdpa:`<p>SMC collects your name, contact details and application answers in order to run GRMP:
    screening, matching, reminders and certificates.</p>
    <p>Your reflections are <b>not</b> stored — the system records only that you completed a close-off.
    Your data is held in Singapore, is not sold or shared outside SMC, and you may request deletion
    at any time by contacting the programme team.</p>`,
  coi:`<p>Declare any relationship that could affect a pairing — an employer, a relative, a close
    friend, or a current reporting line. Declared conflicts block that pairing automatically.</p>`,
};

/* In-page confirm. Native confirm() blocks the whole page and some browsers
   suppress it outright — the button then looks broken, which is worse than no
   guard at all. Same reason alert() was removed earlier. */
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
  // A settled decision is done arguing: the yellow card and its Confirm UI disappear
  // from every page. The register keeps the record (who, when, how).
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
  if(NET) return '';
  const mentees = db.people.filter(p=>p.kind==='mentee' && ['accepted','reserve_bench'].includes(p.appStatus)).slice(0,6);
  const mentors = db.people.filter(p=>p.kind==='mentor' && p.appStatus==='accepted' && !p.droppedOut).slice(0,4);
  const preview = db.people.filter(p=>p.previewFastForward);
  return `<div class="openas">
    ${openasOpen?`<div class="openas-menu">
      <div class="sec">Admin console (sign in)</div>
      <button data-goto="#/console">⚙ Console sign-in page</button>
      <div class="sec">Open a mentee's personal link</div>
      ${preview.map(p=>`<button data-goto="#/me/${p.id}">👤 ${esc(p.name)} <span class="badge b-ai" style="margin-left:auto">fast-forwarded to cycle end</span></button>`).join('')}
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
  const phase = rot ? `Rotation ${rot.n} · ${rot.label}` : (db.today>db.config.rotations[2].end?'after the cycle':'closing weeks');
  const who = (NET && SESSION && SESSION.identity)
    ? ` · signed in: <b>${esc(SESSION.identity.name||SESSION.identity.label)}</b> · <a href="#" data-act="logout">sign out</a>` : '';
  // The decisions register has to be reachable from every page, including the public
  // ones. Internal INFERRED cards do not belong in public page content, but hiding the
  // register with them would leave a visitor reading our assumptions as settled fact.
  const openN = Object.values(db.config.openItems||{}).filter(i=>!i.settled).length;
  const open = openN ? ` · <a href="#/decisions"><b>${openN} decision${openN===1?'':'s'} await${openN===1?'s':''} your confirmation</b></a>` : '';
  return `<div class="demo-banner">Sample data only · simulated today: <b>${db.today}</b> (${phase})${open} ·
    <a href="#/changelog">changelog</a> · <a href="#/manual">user manual</a>${who}</div>`;
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
  const h0 = location.hash || '#/';
  const gated = /^#\/(console|me\/)/.test(h0);
  if(NET && !SESSION && (gated || h0==='#/login')){ $app().innerHTML = renderLogin(); bindGlobal(); return; }
  // The console renders whoever the URL names — so the URL must not be able to name
  // someone you are not. Participants bounce to their own page; admins to their own
  // console. (Staging enforces app-side; production replaces this with real Auth.)
  if(NET && SESSION && /^#\/console/.test(h0)){
    const who = SESSION.identity, m = h0.match(/^#\/console\/([^/]+)/);
    if(who && who.kind==='person'){ location.hash = '#/me/'+who.personId; return; }
    if(who && who.name && (!m || decodeURIComponent(m[1])!==who.name)){
      location.hash = '#/console/'+encodeURIComponent(who.name); return;
    }
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
    if(AI.cache[ck]) return;                                  // rendered from cache already
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
  /* Match rationales are NOT sent to the model. They are already short, precise and
     derived from the score — a small model rewriting them loses the direction of the
     claim ("structured thinking is crucial for the mentor" when it is the mentee's
     need). The division of labour that holds up: the model reads and compresses free
     text; the system decides and explains its own decision. Flip this on only with a
     model strong enough to be measured against the deterministic text. */
  const AI_REWRITES_RATIONALES = false;
  if(!AI_REWRITES_RATIONALES) return;
  document.querySelectorAll('[data-ai-pair]').forEach(async el=>{
    const id = el.dataset.aiPair, ck = 'pair:'+id;
    const pr = db.pairs.find(x=>x.id===id); if(!pr || pr.status!=='proposed') return;
    const apply = lines=>{
      // The model may only rephrase the reasons. The ranking line is the audit trail
      // for the R2-Q3 rule and is re-attached from the pair's own numbers, never
      // from the model — otherwise the proof of ranking vanishes the moment AI is on.
      const rank = pr.rankedOutOf
        ? `Ranked 1st of ${pr.rankedOutOf} eligible mentors on development-need fit → industry → diversity (score ${pr.score}); capacity, conflict and no-repeat checks passed`
        : (pr.rationale || []).slice(-1)[0];
      const kept = lines.slice(0,3).concat(rank?[rank]:[]);
      pr.rationale = kept; pr.aiLive = true; GRMP.Store.save(db);
      const ul = el.querySelector('ul.why');
      if(ul) ul.innerHTML = kept.map(l=>`<li>${esc(l)}</li>`).join('')
        + `<li style="color:var(--ai-ink);font-weight:650">Reasons rewritten live by the model; the ranking above is computed by the system, not the model.</li>`;
    };
    // Only the scored reasons go to the model — the trailing ranking line is ours to keep.
    const reasons = (pr.rationale||[]).slice(0, Math.max(0,(pr.rationale||[]).length-1));
    if(!reasons.length) return;
    const clean = t => t.split('\n').map(s=>s.replace(/^[-*•\d.\s]+/,'').trim()).filter(Boolean).slice(0,reasons.length);
    if(AI.cache[ck]){ if(!pr.aiLive) apply(clean(AI.cache[ck])); return; }
    const m = GRMP.D.person(db, pr.mentorId), e = GRMP.D.person(db, pr.menteeId);
    const txt = await AI.gen(ck, AI.rationalePrompt(m, e, reasons));
    if(txt && el.isConnected) apply(clean(txt));
  });
}
/* Every form row is `<div class="f-row"><label>…</label><control></div>`, which LOOKS
   labelled and is not: with no for/id link a screen reader announces the control as
   nameless, so the public application form was unusable with assistive tech. Linking
   them here fixes every form at once instead of patching markup in twelve places. */
let _lblSeq = 0;
function linkFormLabels(){
  document.querySelectorAll('.f-row').forEach(row=>{
    const label = row.querySelector('label');
    const ctls = [...row.querySelectorAll('input:not([type=checkbox]):not([type=radio]),select,textarea')];
    if(!label || !ctls.length) return;
    const base = label.textContent.replace(/\*/g,'').trim();
    // Rows like "Rotation 1 start / end" hold two controls under one label — the second
    // one was left nameless. Split the label on its own separator so each gets a name.
    const parts = base.split(/\s*[\/·]\s*/);
    ctls.forEach((ctl,i)=>{
      if(!ctl.id) ctl.id = 'fld-' + (++_lblSeq);
      if(i===0 && !label.htmlFor) label.htmlFor = ctl.id;
      if(!ctl.getAttribute('aria-label'))
        ctl.setAttribute('aria-label', ctls.length>1 && parts.length>1
          ? `${parts[0]} ${parts[Math.min(i,parts.length-1)]}`.trim() : base);
    });
  });
  // Selects rendered outside .f-row (the re-match picker) still need a name.
  document.querySelectorAll('select:not([aria-label])').forEach(s=>{
    const near = s.closest('td,div')?.querySelector('label,b,strong');
    s.setAttribute('aria-label', (near && near.textContent.trim()) || 'Select an option');
  });
}
function bindGlobal(){
  linkFormLabels();
  const t = document.getElementById('openas-toggle');
  if(t) t.onclick = ()=>{ openasOpen = !openasOpen; render(); };
  document.querySelectorAll('[data-goto]').forEach(b=>b.onclick = ()=>{ openasOpen=false; location.hash = b.dataset.goto; });
  document.querySelectorAll('[data-act]').forEach(b=>b.onclick = ()=>{
    const fn = Actions[b.dataset.act]; if(fn) fn(b.dataset);
  });
}
window.addEventListener('hashchange', render);
window.addEventListener('DOMContentLoaded', ()=>{
  if(FS){
    render();                                 // splash while first snapshot arrives
    if(!FIRE.init()){ $app().innerHTML='<div class="login-wrap"><div class="login-card"><h1>GRMP Platform</h1><div class="sub">Firebase failed to load — refresh to retry.</div></div></div>'; return; }
    FIRE.boot((newDb, first)=>{
      db = newDb;
      if(first){ lastEmailShown = db.emails.length; }
      // validate stored identity still resolves (accounts may have been reseeded)
      if(SESSION && SESSION.identity && SESSION.identity.kind==='person' &&
         !db.people.some(p=>p.id===SESSION.identity.personId)){ SESSION=null; localStorage.removeItem('grmp_session'); }
      render();
    }).then(()=>{ loadDecisions().then(()=>render()); });
    return;
  }
  if(!REMOTE){ render(); loadDecisions().then(()=>render()); return; }
  render();                                   // splash / login while booting
  rpc('boot', SESSION&&SESSION.token).then(r=>{
    db=r.db; lastEmailShown=db?db.emails.length:0;
    if(r.identity){ SESSION={...(SESSION||{}), identity:r.identity}; }
    else if(SESSION){ SESSION=null; localStorage.removeItem('grmp_session'); }
    render(); loadDecisions().then(()=>render());
  }).catch(e=>{ $app().innerHTML='<div class="login-wrap"><div class="login-card"><h1>GRMP Platform</h1><div class="sub">Could not reach the server — refresh to retry.</div></div></div>'; });
});

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
    // FS mode: session is client-side only
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
  ack(d){ call('acknowledge', d.person, d.doc); },
  /* An acknowledgement that records consent without showing anything to consent to
     is not an acknowledgement. Placeholder text, real mechanism: open → read → tick → confirm. */
  openDoc(d){
    const root = document.getElementById('overlay-root');
    const wrap = document.createElement('div');
    wrap.className='fb-wrap';
    wrap.innerHTML = `<div class="fb-bg"></div>
     <div class="fb-modal" style="max-width:620px">
       <h3 style="margin:0 0 2px;font-size:16px">${esc(d.title)}</h3>
       <div style="font-size:11.5px;color:var(--ink-3);margin-bottom:10px">Version ${esc(d.ver)} · this version is what gets recorded against your name</div>
       <div class="doc-body">${DOC_TEXT[d.doc]||'<p>Document text to be supplied by the programme team.</p>'}
         <p class="doc-ph">Placeholder structure — SMC supplies the final wording before go-live.</p></div>
       <label class="doc-tick"><input type="checkbox" id="doc-tick"> I have read ${esc(d.title)} (${esc(d.ver)}) and I acknowledge it.</label>
       <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:12px">
         <button class="btn sm btn-ghost" data-x="no">Cancel</button>
         <button class="btn sm btn-primary" data-x="yes" disabled>Confirm acknowledgement</button>
       </div></div>`;
    const yes = wrap.querySelector('[data-x="yes"]');
    wrap.querySelector('#doc-tick').onchange = e => { yes.disabled = !e.target.checked; };
    const close = ()=>wrap.remove();
    wrap.querySelector('[data-x="no"]').onclick = close;
    wrap.querySelector('.fb-bg').onclick = close;
    yes.onclick = ()=>{ close(); call('acknowledge', d.person, d.doc)
      .then(()=>toast(d.title+' acknowledged — timestamp and version recorded.')); };
    root.appendChild(wrap);
  },
  ackAll(d){ if(REMOTE){ call('ackAllDocs', d.person); } else { act(x=>{['rules','charter','governance','pdpa','coi'].forEach(k=>GRMP.D.acknowledge(x,d.person,k))}); } },
  saveOrientVideo(d){
    const mentee=(document.getElementById('ov-url')||{}).value||'';
    const mentor=(document.getElementById('ov-url-mentor')||{}).value||'';
    call('setOrientationVideos', mentee, mentor, d.actor)
      .then(v=>toast((v.mentee||v.mentor)?'Recording links saved — each player opens the right session.':'Links cleared — players show the placeholder again.'));
  },
  orient(d){
    const url = GRMP.D.orientationVideoFor(db, GRMP.D.person(db, d.person));
    if(d.mode==='recorded' && url){ try{ window.open(url, '_blank', 'noopener'); }catch(e){} }
    return call('completeOrientation', d.person, d.mode).then(()=>toast(d.mode==='recorded'?'Recording opened — your completion has been recorded.':'Live attendance marked — orientation complete.')); },
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
  /* All proposals for a track are computed in one synchronous pass — each mentee is
     genuinely scored against every eligible mentor, it is just fast. Rendering six
     finished cards in the same frame made the real computation indistinguishable from
     a canned list, so the reveal is paced: the cards exist in the db at once, and are
     shown one by one as the board re-renders. Real work, made legible — no fake spinner,
     no fabricated delay on the data itself. Automation (webdriver) gets the instant path. */
  suggest(d){
    if(REMOTE){ call('suggestMatches', Number(d.rotation), d.track).then(n=>{ if(!n||!n.length) toast('No unmatched mentees (or no capacity) in this track right now.', false); }); return; }
    if(window.__suggestBusy) return;
    const rot=Number(d.rotation), track=d.track;
    const out = GRMP.D.suggestMatches(db, rot, track);
    const done = ()=>{
      if(FS){ busy(true); FIRE.persist(db).then(()=>busy(false)).catch(e=>{ busy(false); toast('Sync failed — retrying on next action. '+(e&&e.message||''), false); }); }
      else GRMP.Store.save(db);
    };
    if(!out || !out.length){ render(); toast('No unmatched mentees (or no capacity) in this track right now.', false); return; }
    if(navigator.webdriver){ render(); done(); return; }
    window.__suggestBusy = track;
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
  promote(d){ call('promoteWaitlist', d.person, d.actor); },
  withdrawUnack(d){
    const n = GRMP.D.pendingWithdrawal(db).length;
    confirmBox(`Release ${n} seat${n>1?'s':''}?`,
      `They did not acknowledge after the final reminder. Their places are freed for the waitlist and each is notified. Promoting someone from the waitlist is how you undo this.`,
      true, ()=>call('withdrawUnacknowledged', d.actor)
        .then(out=>toast(`${(out||[]).length} seat(s) released and notified.`)));
  },
  replaceMentor(d){ call('replaceMentor', d.pair, d.bench, d.actor); },
  markDropout(d){
    // bindGlobal passes only the button's dataset — the two form inputs are read here,
    // in one place, so the button cannot be wired twice with different argument shapes.
    const mentorId = (document.getElementById('drop-mentor')||{}).value;
    const reason = (document.getElementById('drop-reason')||{}).value || '';
    if(!mentorId) return;
    const m = GRMP.D.person(db, mentorId);
    const n = db.pairs.filter(p=>p.mentorId===mentorId&&p.status==='approved').length;
    confirmBox(`Mark ${m?m.name:'this mentor'} as dropped out?`,
      `${n} active mentee${n===1?'':'s'} move to the re-match queue, restricted to same-track reserve-bench mentors. The mentor is removed from all future matching.`,
      true, ()=>call('markDropout', mentorId, reason, d.actor)
        .then(out=>toast(out? `${out.affected} mentee(s) queued for re-match.` : 'Already marked as dropped.', !!out)));
  },
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
    confirmBox('Start "'+label+'"?',
      'The current cycle is archived. Mentors '+(carry?'carry over as invited and must re-acknowledge':'are NOT carried over')
      +'. Mentees, pairs and certificates reset for the new cycle.', true, ()=>{
      call('startNewCycle', {label, rotations:rot, today, actor:(SESSION&&SESSION.identity&&SESSION.identity.name)||'lead', carryOverMentors:carry})
        .then(id=>{ toast('New cycle '+id+' started — previous cycle archived.'); location.hash='#/console/'+encodeURIComponent((SESSION&&SESSION.identity&&SESSION.identity.name)||'Esther'); });
    });
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
      ? {name:get('f-name'),email:get('f-email'),mobile:get('f-mobile'),track,university:GRMP.D.cohortFacts(db).inst||'',course:get('f-course'),
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
