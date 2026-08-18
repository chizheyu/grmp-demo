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

  /* Field names must track the application specs. They were left on the pre-R5 shape
     (role / track / goals / devNeeds) after the forms were rebuilt, so the model was being
     handed a near-empty object and filling the gaps itself. Read from what the form collects. */
  _appData(p){
    return p.kind==='mentor'
      ? {designation:p.designation, organisation:p.org, industry:p.industry,
         yearsOfExperience:p.yearsExp, hasLedATeam:p.ledTeam, leadershipExperience:p.leadership,
         crossIndustryExposure:p.crossIndustry, priorMentoring:p.priorMentoring,
         whatDrawsThemToMentoring:p.draws, interestsTheyOffer:p.interests,
         anythingElse:p.anythingElse, returningMentor:!!p.returning}
      : {university:p.university, faculty:p.faculty, secondFaculty:p.faculty2,
         degreeOrMajor:p.degree, yearOfStudy:p.year, industryPreferences:p.industryPrefs,
         prompt1_growthAndOwnership:p.prompt1, prompt2_curiosityAndCommunity:p.prompt2,
         commitmentAnswer:p.commit};
  },

  summaryPrompt(p){
    return `You are assisting volunteer reviewers of GRMP, a Singapore mentorship programme.
Summarise this ${p.kind} application in 3 short factual sentences a busy reviewer can scan.
Use only what is in the data. Do NOT recommend accepting or rejecting.
No greetings, no markdown, plain text only.
Application data: ${JSON.stringify(this._appData(p))}`;
  },

  /* Per-criterion score proposal (Wei Kiat, F0818-004720 / F0818-004811). The reviewer keys
     nothing in; they check and adjust. Strict JSON so a malformed answer is discarded rather
     than half-parsed — on any doubt the rule-based proposal already on screen stands. */
  scorePrompt(p, criteria){
    return `You are assisting volunteer reviewers of GRMP, a Singapore mentorship programme.
Propose a score from 1 to 5 for each selection criterion below, reading ONLY the application data.
5 = outstanding, 4 = strong, 3 = adequate, 2 = weak, 1 = not ready.

Rules you must follow:
- Score every criterion listed, using its exact name as the key.
- Judge only on evidence present in the data. Absent evidence is a 3, not a guess.
- Give a "why" of at most 15 words per criterion, quoting or naming what you read.
- Do NOT recommend accepting, reserving or rejecting. The score is a proposal a human confirms.
- Output STRICT JSON only, no markdown fence, no preamble, in exactly this shape:
{"scores":[{"key":"<criterion name>","score":<1-5>,"why":"<short reason>"}]}

Criteria: ${JSON.stringify(criteria.map(c=>({key:c.key, reads:c.hint})))}
Application data: ${JSON.stringify(this._appData(p))}`;
  },

  /* Returns [{key, score, why}] or null. Never throws — the caller keeps its rule-based rows. */
  parseScores(txt, criteria){
    try{
      const m = String(txt||'').match(/\{[\s\S]*\}/);          // tolerate a stray fence or prose
      const j = JSON.parse(m ? m[0] : txt);
      const rows = j && j.scores;
      if(!Array.isArray(rows) || !rows.length) return null;
      const out = criteria.map(c=>{
        const r = rows.find(x=>x && String(x.key).trim().toLowerCase()===c.key.toLowerCase());
        const n = r && Math.round(Number(r.score));
        if(!(n>=1 && n<=5)) return null;                        // one bad row voids the set:
        return {key:c.key, score:n, why:String(r.why||'').slice(0,140)};
      });
      return out.every(Boolean) ? out : null;                   // partial fills are worse than none
    }catch(e){ return null; }
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
