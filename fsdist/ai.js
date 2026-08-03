/* GRMP Demo — live AI layer (Gemini free tier), with graceful degradation.
   Design: pages render instantly with the simulated text, then upgrade in place
   when Gemini responds. Any failure (timeout / quota / offline) silently keeps
   the simulated version — the demo can never break because of the AI.
   The key is a free-tier demo key by deliberate choice; responses are cached
   per browser so each summary is generated once. Automated test runs
   (navigator.webdriver) skip live calls entirely. */

const AI = {
  key: 'AIzaSyB6OATmFTq1xAZvkAqA1Ch_FJUQHNSoFsw',
  model: 'gemini-flash-latest',
  enabled: (typeof navigator!=='undefined' && !navigator.webdriver),
  cache: (()=>{ try{ return JSON.parse(localStorage.getItem('grmp_ai_cache')||'{}'); }catch(e){ return {}; } })(),

  async gen(id, prompt){
    if(this.cache[id]) return this.cache[id];
    if(!this.enabled) return null;
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
      const ctl = new AbortController(); const t = setTimeout(()=>ctl.abort(), 10000);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`, {
        method:'POST',
        headers:{'Content-Type':'application/json','X-goog-api-key':this.key},
        body:JSON.stringify({contents:[{parts:[{text:prompt}]}]}),
        signal:ctl.signal});
      clearTimeout(t);
      if(!r.ok) return null;
      const j = await r.json();
      const txt = ((((j.candidates||[])[0]||{}).content||{}).parts||[]).map(p=>p.text||'').join('').trim();
      if(!txt) return null;
      this.cache[id]=txt;
      try{ localStorage.setItem('grmp_ai_cache', JSON.stringify(this.cache)); }catch(e){}
      return txt;
    }catch(e){ return null; }
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

  rationalePrompt(mentor, mentee){
    return `A Singapore mentorship programme pairs mentees with mentors inside the same track.
In exactly 3 short plain-language lines (one reason per line, no markdown, no numbering),
explain why this pairing could work well. Be specific to the data.
Mentee: ${JSON.stringify({course:mentee.course, year:mentee.year, goals:mentee.goals, needs:mentee.devNeeds, industryInterest:mentee.industryInterest, track:mentee.track})}
Mentor: ${JSON.stringify({role:mentor.role, organisation:mentor.org, industry:mentor.industry, background:mentor.background, motivation:mentor.motivation, track:mentor.track})}`;
  },
};
if (typeof window!=='undefined') window.AI = AI;
