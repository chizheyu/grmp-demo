/* GRMP Demo — live AI layer, with graceful degradation.
   Design: pages render instantly with the deterministic text, then upgrade in place
   when the model responds. Any failure (timeout / quota / offline / no key) silently
   keeps the deterministic version — the demo can never break because of the AI.

   No API key ever reaches this file or the browser. Calls go to a server-side proxy
   (Apps Script) that holds the key in Script Properties. The previous build shipped a
   key in client JS; a public repo plus a vendor secret-scanner killed it inside a day.

   Results are cached per browser, and pair rationales are additionally written back to
   the shared database, so each one is generated once for everyone. Automated test runs
   (navigator.webdriver) skip live calls entirely. */

const AI = {
  proxy: (typeof window!=='undefined' && window.AI_PROXY_URL) || '',
  enabled: (typeof navigator!=='undefined' && !navigator.webdriver
            && !!(typeof window!=='undefined' && window.AI_PROXY_URL)),
  cache: (()=>{ try{ return JSON.parse(localStorage.getItem('grmp_ai_cache')||'{}'); }catch(e){ return {}; } })(),
  cooldown: 0,                                   // set only after repeated hard failures
  misses: 0,
  _chain: Promise.resolve(),                     // Apps Script serialises executions per user;
                                                 // firing six at once makes most of them fail

  /* One at a time, in the order the cards appear. Each card still upgrades the
     moment its own call returns, so the page fills in progressively. */
  gen(id, prompt){
    const run = async () => {
      const first = await this._gen(id, prompt);
      if(first !== null) return first;
      // Apps Script hands back a one-shot redirect URL that intermittently 404s on
      // rapid successive calls. One retry after a breath clears almost all of them.
      await new Promise(r=>setTimeout(r, 1500));
      return this._gen(id, prompt);
    };
    const next = this._chain.then(run, run);
    this._chain = next.then(()=>new Promise(r=>setTimeout(r,400))).catch(()=>{});
    return next;
  },

  async _gen(id, prompt){
    if(this.cache[id]) return this.cache[id];
    if(!this.enabled) return null;
    if(Date.now() < this.cooldown) return null;
    if(typeof google!=='undefined' && google.script && google.script.run){
      try{
        const txt = await new Promise((res,rej)=>google.script.run
          .withSuccessHandler(res).withFailureHandler(rej)
          .aiGen((window.SESSION_TOKEN_FN&&window.SESSION_TOKEN_FN())||null, id, prompt));
        if(txt){ this.cache[id]=txt; try{localStorage.setItem('grmp_ai_cache',JSON.stringify(this.cache));}catch(e){} }
        return txt||null;
      }catch(e){ return null; }
    }
    try{
      const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), 15000);
      const r = await fetch(this.proxy, {
        method:'POST',
        headers:{'Content-Type':'text/plain;charset=utf-8'},   // keeps it a CORS simple request
        body:JSON.stringify({op:'ai', prompt}),
        signal:ctl.signal});
      clearTimeout(t);
      if(!r.ok) return this.miss();
      const j = await r.json();
      if(!j.ok || !j.text) return this.miss();
      this.misses = 0;
      this.cache[id]=j.text;
      try{ localStorage.setItem('grmp_ai_cache', JSON.stringify(this.cache)); }catch(e){}
      return j.text;
    }catch(e){ return this.miss(); }                 // also covers a non-JSON reply
  },

  /* One bad call is normal (a slow upstream, a queued Apps Script execution).
     Only back off once failures repeat, so a single blip never silences the page. */
  miss(){
    if(++this.misses >= 2) this.cooldown = Date.now() + 60000;
    return null;
  },

  summaryPrompt(p){
    const data = p.kind==='mentor'
      ? {role:p.role, organisation:p.org, industry:p.industry, background:p.background,
         leadership:p.leadership, crossCultural:p.xcultural, languages:p.languages,
         motivation:p.motivation, track:p.track}
      : {university:p.university, course:p.course, year:p.year, goals:p.goals,
         developmentNeeds:p.devNeeds, industryInterest:p.industryInterest,
         expectations:p.expectations, readinessToReflect:p.readiness, track:p.track};
    return `You are assisting volunteer reviewers of GRMP, a Singapore mentorship programme.
Summarise this ${p.kind} application in 3 short factual sentences a busy reviewer can scan.
Do NOT recommend accepting or rejecting. No greetings, no markdown, plain text only.
Application data: ${JSON.stringify(data)}`;
  },

  /* The system decides the pairing and computes why. The model's only job is to make
     that reasoning readable. It is never asked to find reasons of its own — given raw
     profiles it will invent alignments that are not there ("communications background
     aligns with an interest in finance"), and the Programme Lead would be reading a
     fabricated justification for a real decision. */
  rationalePrompt(mentor, mentee, reasons){
    return `Rewrite the following match reasons for a Singapore mentorship programme so a
busy volunteer can scan them. Output exactly ${reasons.length} lines, one per input reason,
in the same order. Plain text, no markdown, no numbering, no preamble.

Rules you must follow:
- Rephrase only. Do not add a reason, drop a reason, or merge them.
- Do not claim any similarity, alignment or fit that is not stated in the input.
- Keep every concrete fact (years, organisation, role, the named development need).

Reasons:
${reasons.map((r,i)=>`${i+1}. ${r}`).join('\n')}`;
  },
};
if (typeof window!=='undefined') window.AI = AI;
