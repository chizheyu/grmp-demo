/* GRMP Demo — state engine + seeded cohort.
   Single source of truth in localStorage. Deterministic seed (mulberry32) so tests are stable.
   Demo date is fixed at 2026-12-15 (mid-cycle: R1 closed, R2 running) so every view has life. */

const DB_KEY = 'grmp_demo_v5';   // bumped: submitted mentors + sign-out
const TODAY = '2026-12-15';

/* Node compatibility: same file runs headless for CLI backend tests (localStorage shim). */
if (typeof localStorage === 'undefined') {
  globalThis.__mem = {};
  globalThis.localStorage = {
    getItem: k => (k in globalThis.__mem ? globalThis.__mem[k] : null),
    setItem: (k,v) => { globalThis.__mem[k] = String(v); },
    removeItem: k => { delete globalThis.__mem[k]; },
  };
}

/* ---------- deterministic PRNG ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const rnd = mulberry32(20261215);
const pick = arr => arr[Math.floor(rnd()*arr.length)];
const pickN = (arr,n)=>{const c=[...arr],out=[];while(out.length<n&&c.length)out.push(c.splice(Math.floor(rnd()*c.length),1)[0]);return out};

/* ---------- name pools (SG mix) ---------- */
const FIRST = ['Wei Jie','Jun Kai','Zhi Hao','Kai Xin','Hui Ling','Mei Yi','Jia Hui','Yu Xuan','Zi Yang','Cheng Han','Xin Yi','Li Ting','Nur Aisyah','Siti Nurul','Muhammad Danish','Ahmad Irfan','Farah','Nadia','Arjun','Priya','Kavya','Rohan','Divya','Karthik','Meera','Rajiv','Daniel','Marcus','Chloe','Grace','Ryan','Sophie','Ethan','Rachel','Nicholas','Amanda','Bryan','Michelle','Isaac','Clara'];
const LAST  = ['Tan','Lim','Lee','Ng','Wong','Chua','Goh','Ong','Teo','Koh','Chen','Low','Ho','Yeo','Sim','Toh','Chan','Loh','Bin Rahman','Binte Hassan','Menon','Pillai','Nair','Sharma','Krishnan','Raj','Kumar','s/o Suresh'];
const uname = (used)=>{let n;do{n=pick(FIRST)+' '+pick(LAST)}while(used.has(n));used.add(n);return n};

/* ---------- track content pools ---------- */
const TRACKS = {
  general:        {label:'General',          industries:['Finance','Technology','Communications','Human Resources','Education','Healthcare','Consulting']},
  entrepreneurship:{label:'Entrepreneurship', industries:['Startups','Venture Building','E-commerce','Climate Tech','FoodTech']},
  ai:             {label:'AI',               industries:['AI Products','Data & ML','AI in Finance','AI in Marketing','AI Operations']},
};
/* Organisation and industry are paired, not drawn independently — otherwise the seed
   produces "Director at Shopee, 27 years in education", which reads as fake to anyone
   who knows Singapore. Every org here sits in an industry its track actually offers. */
const MENTOR_ORGS = {general:[
    ['DBS','Finance'],['OCBC','Finance'],['Grab','Technology'],['Shopee','Technology'],
    ['Sea Group','Technology'],['ST Engineering','Technology'],['Singtel','Communications'],
    ['SPH Media','Communications'],['MOE','Education'],['NIE','Education'],
    ['McKinsey','Consulting'],['PwC','Consulting'],['EDB','Consulting'],
    ['SingHealth','Healthcare'],['NUHS','Healthcare'],['Mercer','Human Resources'],['Randstad','Human Resources']],
  entrepreneurship:[
    ['GreenLoop (founder)','Climate Tech'],['Carousell (early team)','E-commerce'],
    ['own venture (2x founder)','Startups'],['Stealth startup','Startups'],
    ['Antler SG','Venture Building'],['Glife','FoodTech']],
  ai:[
    ['Google','AI Products'],['Microsoft','AI Products'],['AI Singapore','Data & ML'],
    ['Databricks','Data & ML'],['TikTok','AI in Marketing'],['OpenGov','AI Operations']]};
const MENTOR_ROLES = {general:['Vice President','Director','Senior Manager','Head of Department','Partner','Regional Lead'],
  entrepreneurship:['Founder & CEO','Co-founder','Founding Partner','Venture Builder'],
  ai:['ML Engineering Lead','AI Product Manager','Head of Data Science','Applied AI Lead','Senior AI Engineer']};
const COURSES = ['Business Management','Accountancy','Economics','Information Systems','Computer Science','Law','Social Sciences','Psychology'];
const GOALS = {general:['clarify my career direction in my industry','build confidence for my first job search','learn how leaders think about career growth','navigate from school into the corporate world'],
  entrepreneurship:['test whether founding a startup suits me','learn how to validate and launch an idea','understand fundraising and early operations'],
  ai:['understand how AI is changing my target industry','build a career that combines my degree with AI skills','learn practical AI adoption from a practitioner']};
const DEVNEEDS = ['communication and presence','networking and building professional relationships','structured thinking and prioritisation','confidence and self-belief','industry knowledge and career mapping','leadership and taking initiative'];
const MOTIVES = ['give back to the next generation','share lessons I wish someone had told me earlier','stay connected with young perspectives','strengthen Singapore’s talent pipeline'];

/* ---------- seed builder ---------- */
function buildSeed(){
  const used = new Set();
  const people = [];
  let seq = 1;
  const mk = (kind, track, appStatus) => {
    const name = uname(used);
    const id = (kind==='mentor'?'M':'E') + String(seq++).padStart(3,'0');
    const posting = kind==='mentor' ? pick(MENTOR_ORGS[track]) : null;   // org decides industry
    const ind = posting ? posting[1] : pick(TRACKS[track].industries);
    const p = {id, kind, track, name,
      email: name.toLowerCase().replace(/[^a-z ]/g,'').replace(/ +/g,'.') + (kind==='mentor'?'@example.com':'@smu.example.edu'),
      mobile: '+65 9'+String(100+Math.floor(rnd()*900))+' '+String(1000+Math.floor(rnd()*9000)),
      appStatus, submittedAt:'2026-08-'+String(20+Math.floor(rnd()*10)),
      ack:null, orientation:null, source:'form'};
    if(kind==='mentor'){
      Object.assign(p,{org:posting[0], role:pick(MENTOR_ROLES[track]), industry:ind,
        background:`${12+Math.floor(rnd()*18)} years in ${ind.toLowerCase()}`,
        leadership:pick(['leads a team of '+(4+Math.floor(rnd()*30)),'built and managed regional teams','mentored juniors throughout career']),
        xcultural:pick(['worked across SEA markets','led projects in 3+ countries','studied and worked overseas']),
        languages:pickN(['English','Mandarin','Malay','Tamil','Cantonese','Hindi'],1+Math.floor(rnd()*2)),
        motivation:pick(MOTIVES)});
    }else{
      Object.assign(p,{university:'SMU', course:pick(COURSES), year:String(2+Math.floor(rnd()*3)),
        goals:pick(GOALS[track]), devNeeds:pickN(DEVNEEDS,2).join('; '),
        industryInterest:ind, expectations:'a mentor who is honest, generous with stories, and challenges me',
        readiness:'I journal regularly and am ready to reflect after each meeting'});
    }
    people.push(p); return p;
  };

  // Mentors: 60 accepted (incl. 6 reserve bench) + 3 waitlist + 3 declined
  const mentors = [];
  const mtracks = [...Array(36).fill('general'),...Array(12).fill('entrepreneurship'),...Array(12).fill('ai')];
  mtracks.forEach(t=>mentors.push(mk('mentor',t,'accepted')));
  pickN(mentors,6).forEach(m=>m.appStatus='reserve_bench');
  for(let i=0;i<3;i++) mk('mentor',pick(['general','ai']),'waitlisted');
  for(let i=0;i<3;i++) mk('mentor','general','declined');
  for(let i=0;i<2;i++) mk('mentor',pick(['general','ai']),'submitted');   // fresh, for mentor reviewers

  // Mentees: 60 accepted + 8 waitlist + 4 declined + 2 fresh submitted (screening demo)
  const mentees = [];
  const etracks = [...Array(36).fill('general'),...Array(12).fill('entrepreneurship'),...Array(12).fill('ai')];
  etracks.forEach(t=>mentees.push(mk('mentee',t,'accepted')));
  for(let i=0;i<8;i++) mk('mentee',pick(['general','entrepreneurship','ai']),'waitlisted');
  for(let i=0;i<4;i++) mk('mentee',pick(['general','ai']),'declined');
  for(let i=0;i<2;i++) mk('mentee',pick(['general','ai']),'submitted');   // still in screening

  /* acknowledgement + orientation: all accepted done EXCEPT 2 late mentees (gate demo) */
  const DOCS = ['rules','pdpa','coi'];   // Owner F0806-235605: Charter & Grievance folded into Rules by reference
  const lateAck = pickN(mentees.filter(e=>e.appStatus==='accepted'),2);
  people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus)).forEach(p=>{
    if(lateAck.includes(p)){ p.ack = {rules:'2026-09-08'}; p.orientation=null; return; }   // partial ack, blocked
    p.ack = Object.fromEntries(DOCS.map(d=>[d,'2026-09-0'+(2+Math.floor(rnd()*7))]));
    p.orientation = {mode: rnd()<0.7?'live':'recorded', at:'2026-09-'+String(15+Math.floor(rnd()*10))};
  });

  /* reviews: every non-new applicant has 2 reviewer scores */
  const REVIEWERS = {mentor:['Esther','Wei Kiat','Kenzie','Yu Tong'], mentee:['Esther','Wei Kiat','Portia','Sapranshu']};
  const reviews = [];
  people.forEach(p=>{
    if(p.appStatus==='submitted') return;                     // fresh ones: not yet scored (live demo material)
    pickN(REVIEWERS[p.kind],2).forEach(r=>reviews.push({personId:p.id,reviewer:r,score:3+Math.floor(rnd()*3),comment:pick(['Strong fit','Thoughtful application','Clear goals','Good energy, some vagueness','Solid, keep an eye on commitment'])}));
  });

  /* pairs — R1 (closed) + R2 (running). Track-pure, ≤2 mentees/mentor, no repeat mentor. */
  const activeMentors = mentors.filter(m=>m.appStatus==='accepted');
  const activeMentees = mentees.filter(e=>e.appStatus==='accepted');
  const pairs=[]; let pid=1;
  const capUsed = {};                                          // rotation -> mentorId -> count
  const history = {};                                          // menteeId -> Set(mentorId)
  function pairUp(rotation, mentee, statusPlan){
    const cands = activeMentors.filter(m=>m.track===mentee.track
      && (capUsed[rotation]?.[m.id]||0) < 2
      && !(history[mentee.id]?.has(m.id)));
    if(!cands.length) return null;
    const mentor = cands[Math.floor(rnd()*cands.length)];
    capUsed[rotation]=capUsed[rotation]||{}; capUsed[rotation][mentor.id]=(capUsed[rotation][mentor.id]||0)+1;
    history[mentee.id]=history[mentee.id]||new Set(); history[mentee.id].add(mentor.id);
    const pr={id:'P'+String(pid++).padStart(3,'0'), rotation, mentorId:mentor.id, menteeId:mentee.id,
      // Spread over the approval window. A Programme Lead works through a matching board
      // across several evenings; 43 pairs stamped with one identical date reads as generated.
      status:statusPlan,
      approvedAt: rotation===1 ? '2026-09-'+String(24+Math.floor(rnd()*5)).padStart(2,'0')
                               : '2026-11-'+String(26+Math.floor(rnd()*5)).padStart(2,'0'),
      rationale:[`Same track (${TRACKS[mentee.track].label}) and mentee's development needs match the mentor's background`,
                 `Mentee aims to ${mentee.goals}; mentor brings ${mentor.background}`,
                 `Capacity and no-repeat checks passed`]};
    pairs.push(pr); return pr;
  }
  // R1: everyone paired EXCEPT the gate-blocked (no acknowledgement → never matched, per the binding rule)
  const r1=[]; activeMentees.filter(e=>!lateAck.includes(e)).forEach(e=>{const p=pairUp(1,e,'approved'); if(p)r1.push(p)});
  const r1Missing = pickN(r1,3);
  r1.forEach(p=>{ if(!r1Missing.includes(p)){ p.status='closed';
      p.closeoff={metTwice:true,reflectionDone:true,at:'2026-11-'+String(25+Math.floor(rnd()*5)),comment:pick(['Great pairing.','Learned a lot.','We clicked well.',''])};}});
  // R2: most paired; 8 mentees left unmatched (live matching demo); 1 mentor dropout staged
  const unmatchedR2 = pickN(activeMentees.filter(e=>!lateAck.includes(e)),6).concat(lateAck); // 8 total, incl. 2 gate-blocked
  activeMentees.forEach(e=>{ if(!unmatchedR2.includes(e)) pairUp(2,e,'approved'); });
  // dropout: pick a mentor with 2 R2 pairs
  const byMentor={}; pairs.filter(p=>p.rotation===2).forEach(p=>{(byMentor[p.mentorId]=byMentor[p.mentorId]||[]).push(p)});
  const dropMentorId = Object.keys(byMentor).find(k=>byMentor[k].length===2) || Object.keys(byMentor)[0];
  const dropped = people.find(p=>p.id===dropMentorId);
  dropped.droppedOut = {at:'2026-12-10', reason:'work relocation'};
  byMentor[dropMentorId].forEach(p=>{p.status='rematch_needed'});

  /* fast-forward previews: 2 mentees with all 3 rotations closed (certificate/builder-reflection demo) */
  // Must not reuse a mentee whose R1 close-off is deliberately missing — they would
  // never qualify for a certificate, silently breaking the very demo this exists for.
  const r1MissingMentees = new Set(r1Missing.map(p=>p.menteeId));
  const preview = pickN(activeMentees.filter(e=>!unmatchedR2.includes(e) && !r1MissingMentees.has(e.id)),2);
  preview.forEach(e=>{
    const pr2 = pairs.find(p=>p.rotation===2 && p.menteeId===e.id);
    if(pr2){pr2.status='closed'; pr2.closeoff={metTwice:true,reflectionDone:true,at:'2026-12-14',comment:''};}
    const p3=pairUp(3,e,'closed'); if(p3){p3.approvedAt='2027-02-01';p3.closeoff={metTwice:true,reflectionDone:true,at:'2027-03-10',comment:''};p3.preview=true;}
    e.previewFastForward = true;
  });
  /* The fast-forward pairs exist so every late-cycle surface has something real to show
     TODAY. They close R3 in the seed — so their paperwork must exist too, or Submissions
     sits empty and the whole preview idea stops half-way. One preview mentee gets her
     Builder’s Commitment (→ "Ready to issue" demonstrates the happy path on Certificates);
     the other stays without (→ the ✗ shows what the rule still demands). */
  const midreviews=[], builderReflections=[];
  const pvMentors=[...new Set(pairs.filter(p=>p.preview||p.rotation===2&&preview.some(e=>e.id===p.menteeId))
    .map(p=>p.mentorId))].slice(0,2);
  const MIDTEXT=['Pairing is going well — we have met twice and are working through interview preparation. No support needed.',
                 'Good engagement from my mentee; we agreed on a networking plan for the new year. One scheduling wobble, resolved.'];
  pvMentors.forEach((mid,i)=>midreviews.push({mentorId:mid, text:MIDTEXT[i%MIDTEXT.length], at:'2027-01-1'+(8+i)}));
  const menteeMidReviews=[], endEvaluations=[];
  if(preview[0]){
    menteeMidReviews.push({menteeId:preview[0].id, text:'Mid-programme check-in: rotation pace works well; my mentor pushes me to prepare better questions.', at:'2027-01-20'});
    endEvaluations.push({personId:preview[0].id, kind:'mentee', text:'GRMP delivered exactly what it promised — three genuinely different mentors and a habit of structured reflection.', at:'2027-03-11'});
    endEvaluations.push({personId:pvMentors[0], kind:'mentor', text:'A strong close to the programme; my mentee arrived prepared every single session.', at:'2027-03-12'});
  }
  if(preview[1]){
    menteeMidReviews.push({menteeId:preview[1].id, text:'Enjoying the rotations; the switch of mentors each rotation is the best part.', at:'2027-01-21'});
    // deliberately NO end evaluation for preview[1] — the exception report needs a live case
  }
  if(preview[0]) builderReflections.push({menteeId:preview[0].id, at:'2027-03-12',
    text:'GRMP gave me three very different mirrors. I will pay it forward by mentoring two juniors in my CCA and starting a monthly peer career circle.'});

  /* events */
  const attendedKickoff = people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus) && p.orientation).map(p=>p.id);
  const events = {
    // Dates below are CONFIRMED by the programme team (Wei Kiat, 4 Aug) — no longer placeholders.
    kickoff:      {name:'Kickoff Night', date:'2026-10-01', time:'7.30–9.00 pm', venue:'Alcove', attendance:pickN(attendedKickoff, Math.floor(attendedKickoff.length*0.9))},
    appreciation: {name:'Appreciation Night', date:'2027-03-26', venue:'to be confirmed', attendance:[]},
  };

  /* concerns: 1 sample referral */
  const concerns = [{id:'C001', at:'2026-11-18', from:'(mentee — identity visible to Escalation Owner only)',
    summary:'Raised a concern about repeated last-minute cancellations', status:'referred to SMC Grievance process'}];

  /* email log (what would have been sent) */
  const emails = [
    {at:'2026-09-01', to:'all accepted', subject:'Welcome to the programme — please acknowledge the Programme Rules', kind:'ack_notify'},
    {at:'2026-09-08', to:'12 outstanding', subject:'Reminder: acknowledgement outstanding', kind:'ack_remind'},
    {at:'2026-09-15', to:'4 outstanding', subject:'Final reminder: acknowledgement required to be matched', kind:'ack_final'},
    {at:'2026-09-28', to:'all matched pairs', subject:'Your Rotation 1 match — Know Yourself', kind:'match'},
    {at:'2026-11-25', to:'mentees', subject:'Rotation 1 close-off — two quick confirmations', kind:'closeoff'},
    {at:'2026-11-30', to:'all matched pairs', subject:'Your Rotation 2 match — Know Your World', kind:'match'},
  ];

  /* preset accounts: 6 admins + 5 participant personas (picked deterministically) */
  const DOCS5=['rules','pdpa','coi'];
  const acctGate = people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&!(p.ack&&DOCS5.every(k=>p.ack[k])));
  const acctFF   = people.find(p=>p.previewFastForward);
  const acctMid  = (pairs.find(x=>x.rotation===2&&x.status==='approved'&&!people.find(pp=>pp.id===x.menteeId).previewFastForward)||{}).menteeId;
  const acctMentor = (pairs.find(x=>x.rotation===2&&x.status==='approved')||{}).mentorId;
  const acctBench  = people.find(p=>p.appStatus==='reserve_bench');
  const accounts = [
    {u:'esther',   pass:'grmp2026', kind:'admin', name:'Esther',    label:'Programme Owner'},
    {u:'weikiat',  pass:'grmp2026', kind:'admin', name:'Wei Kiat',  label:'Programme Lead'},
    {u:'kenzie',   pass:'grmp2026', kind:'admin', name:'Kenzie',    label:'Mentor Reviewer (SMU)'},
    {u:'yutong',   pass:'grmp2026', kind:'admin', name:'Yu Tong',   label:'Mentor Reviewer (SMU)'},
    {u:'portia',   pass:'grmp2026', kind:'admin', name:'Portia',    label:'Mentee Reviewer (SMU)'},
    {u:'sapranshu',pass:'grmp2026', kind:'admin', name:'Sapranshu', label:'Mentee Reviewer (SMU)'},
    {u:'mentee.new',  pass:'grmp2026', kind:'person', personId:acctGate.id,  label:'Mentee — start of journey (gates ahead)'},
    {u:'mentee.mid',  pass:'grmp2026', kind:'person', personId:acctMid,      label:'Mentee — mid-cycle (close-off due)'},
    {u:'mentee.done', pass:'grmp2026', kind:'person', personId:acctFF.id,    label:'Mentee — end of journey (certificate path)'},
    {u:'mentor.active',pass:'grmp2026',kind:'person', personId:acctMentor,   label:'Mentor — active with mentees'},
    {u:'mentor.bench', pass:'grmp2026',kind:'person', personId:acctBench.id, label:'Mentor — reserve bench'},
  ];

  return {
    version:1, today:TODAY,
    archives:[], aiCache:{}, sessions:{},
    config:{
      cohort:{id:'C2026', label:'GRMP 2026 (SMU pilot)'},
      // Working Design: onboarding = "online guide, video briefing and acknowledgement".
      // The team pastes real recording links in Configuration; empty = placeholder player.
      // Two slots because mentor and mentee orientations are usually different sessions —
      // the mentor slot is optional and falls back to the shared/mentee one.
      orientationVideo:'', orientationVideoMentor:'',
      registration:{opens:'2026-09-01', closes:'2026-09-10'},   // confirmed 4 Aug
      accounts,
      cycle:'GRMP 2026 (SMU pilot)',
      rotations:[{n:1,label:'Know Yourself',start:'2026-10-01',end:'2026-11-30'},
                 {n:2,label:'Know Your World',start:'2026-12-01',end:'2027-01-31'},
                 {n:3,label:'Know Your Path',start:'2027-02-01',end:'2027-03-31'}],
      ackLadder:[{week:'Sept W1',date:'2026-09-01',what:'Acknowledgement notification'},
                 {week:'Sept W2',date:'2026-09-08',what:'First reminder'},
                 {week:'Sept W3',date:'2026-09-15',what:'Final reminder'}],
      admins:[{name:'Esther', role:'Programme Owner', roles:['lead','mentor_reviewer','mentee_reviewer','escalation']},
              {name:'Wei Kiat', role:'Programme Lead', roles:['lead','coordinator','mentor_reviewer','mentee_reviewer','escalation']},
              {name:'Kenzie', role:'Mentor Reviewer (SMU)', roles:['mentor_reviewer']},
              {name:'Yu Tong', role:'Mentor Reviewer (SMU)', roles:['mentor_reviewer','dashboard_viewer']},
              {name:'Portia', role:'Mentee Reviewer (SMU)', roles:['mentee_reviewer','dashboard_viewer']},
              {name:'Sapranshu', role:'Mentee Reviewer (SMU)', roles:['mentee_reviewer','dashboard_viewer']}],
      openItems:{
        Q0:{title:'Roles: Esther is the Programme Owner (full access, final decisions); Wei Kiat is the Programme Lead running GRMP operations — he now holds the full operational permission set (decisions, matching, certificates, audit) on top of coordinator tools.', inferred:true, settled:{by:'Esther', on:'2026-08-06', via:'feedback F0806-181128'}},
        Q1:{title:'Privacy boundary (Esther, F0806-173822): the system records close-offs only, never reflection content. The mid-prog review travels with the R2 close-off, the end-prog evaluation with the R3 close-off. Reflection Sheet & Conversation Guides are participant-only — opened from personal links, no longer public.', inferred:true, settled:{by:'Esther', on:'2026-08-06', via:'feedback F0806-173822 — built as decided'}},
        Q2:{title:'Completion criteria (Esther, F0806-172216): certificates are printed & presented at Appreciation Night. Mentor: mid-prog review + end-prog evaluation. Mentee: 3 rotation close-offs + mid-prog review + end-prog evaluation + Builder’s Commitment. Near-misses go through the exception report with an audited approve-by-exception.', inferred:true, settled:{by:'Esther', on:'2026-08-06', via:'feedback F0806-172216 — built as decided'}},
        Q3:{title:'Esther (F0806-175411): include AI matching wherever possible — direction accepted; scope, guardrails and what stays human-approved to be agreed on the call. Still open underneath: the three tracks are OUR addition (confirm or drop), and scoring weights are a first cut to re-tune with real form fields.', inferred:true},
        Q4:{title:'Form fields follow Working Design §3 until Joanne’s final form arrives', inferred:true},
        Q5:{title:'No acknowledgement after the final reminder → treated as withdrawn, seat freed', inferred:true, settled:{by:'Wei Kiat', on:'2026-08-04', via:'confirmed in-app'}},
        Q6:{title:'Concern link on every public page + the acknowledgement page. Primary recipient: Wei Kiat (Programme Lead, first point of contact); Esther as alternate escalation where further review is needed.', inferred:true, settled:{by:'Esther', on:'2026-08-06', via:'feedback F0806-174654'}},
        Q7:{title:'Lean scope: no pair/meeting/availability tracking, no kickoff-goals form, no reflection content stored', inferred:true, settled:{by:'Wei Kiat', on:'2026-08-04', via:'confirmed in-app'}},
        Q8:{title:'Registration 1–10 Sept 2026 · Kick-Off Night 1 Oct 2026, 7.30–9.00 pm at Alcove · Appreciation Night 26 Mar 2027. (Rotation windows remain inferred; the site launch date sits with Esther.)', inferred:true, settled:{by:'Wei Kiat', on:'2026-08-04', via:'group message — dates entered into the system'}},
      },
    },
    people, reviews, pairs, events, concerns, emails,
    midreviews, builderReflections, menteeMidReviews, endEvaluations, certificates:[], audit:[],
  };
}

/* ---------- store API ---------- */
const Store = {
  load(){
    try{ const raw = localStorage.getItem(DB_KEY); if(raw){ const db=JSON.parse(raw); if(db.version===1) return db; } }catch(e){}
    const db = buildSeed(); localStorage.setItem(DB_KEY, JSON.stringify(db)); return db;
  },
  save(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); },
  reset(){ localStorage.removeItem(DB_KEY); return Store.load(); },
};

/* ---------- domain helpers (shared by views + tests) ---------- */
const D = {
  person:(db,id)=>db.people.find(p=>p.id===id),
  mentors:db=>db.people.filter(p=>p.kind==='mentor'),
  mentees:db=>db.people.filter(p=>p.kind==='mentee'),
  ackComplete:p=>p.ack && ['rules','pdpa','coi'].every(d=>p.ack[d]),
  gateBlocked:p=>['accepted'].includes(p.appStatus) && !(D.ackComplete(p) && p.orientation),
  currentRotation:db=>{const t=db.today;return db.config.rotations.find(r=>t>=r.start&&t<=r.end)||null},
  pairsFor:(db,personId)=>db.pairs.filter(p=>p.mentorId===personId||p.menteeId===personId),
  /* An audit entry needs two different times, and only one of them was being kept.
     `at` is the PROGRAMME date the action belongs to (the simulated cohort clock).
     `ts` is when it actually happened in the real world — the forensic answer to
     "who changed what, and when". Without `ts` every entry in a session collapsed
     onto the same date with no time of day, which is not an audit trail. */
  logAudit(db, at, actor, action, entity){
    db.audit.push({at, ts:new Date().toISOString(), actor, action, entity});
  },
  /* ---- cohort facts: the single source for every user-visible cohort number, date,
     institution name and window. Views must read from here, never carry a literal —
     the proof is Start-new-cycle: flip to a new year and every page follows unedited.
     A guard test greps the view files for year/institution/count literals. ---- */
  shiftDate:(iso,days)=>{const d=new Date(iso+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10)},
  monthName:iso=>['January','February','March','April','May','June','July','August','September','October','November','December'][Number(iso.slice(5,7))-1],
  monthShort:iso=>D.monthName(iso).slice(0,4)==='Sept'?'Sept':D.monthName(iso).slice(0,3),
  fmtDMY:iso=>`${Number(iso.slice(8,10))} ${D.monthShort(iso)} ${iso.slice(0,4)}`,
  registrationOpen(db){
    const r=db.config.registration;
    return !r || (db.today>=r.opens && db.today<=r.closes);
  },
  cohortFacts(db){
    const c=db.config, r=c.rotations, label=c.cohort.label;
    const short=label.replace(/\s*\(.*\)\s*/,'').trim();
    const inst=(label.match(/\(([^)]*?)(?:\s+pilot)?\)/i)||[])[1]||'';
    const ackStart=(c.ackLadder&&c.ackLadder[0]&&c.ackLadder[0].date)||r[0].start;
    const kickoff=(db.events&&db.events.kickoff&&db.events.kickoff.date)||r[0].start;
    const appre = db.events && db.events.appreciation && db.events.appreciation.date;
    return {label, short, inst,
      appreciationDate: appre ? `${D.monthName(appre)} ${appre.slice(8,10).replace(/^0/,'')}, ${appre.slice(0,4)}` : null,
      mentors: db.people.filter(p=>p.kind==='mentor'&&['accepted','reserve_bench'].includes(p.appStatus)).length,
      mentees: db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted').length,
      bench:   db.people.filter(p=>p.appStatus==='reserve_bench').length,
      spanLong:`${D.monthName(r[0].start)} ${r[0].start.slice(0,4)} to ${D.monthName(r[2].end)} ${r[2].end.slice(0,4)}`,
      spanMonths:`${D.monthName(r[0].start)} to ${D.monthName(r[2].end)}`,
      applyMonth:D.monthName(ackStart), applyShort:D.monthShort(ackStart),
      regWindow: c.registration ? `${Number(c.registration.opens.slice(8,10))}–${Number(c.registration.closes.slice(8,10))} ${D.monthShort(c.registration.opens)}` : '',
      regCloses: c.registration ? c.registration.closes : '',
      kickoffShort:D.monthShort(kickoff),
      r1Short:D.monthShort(r[0].start), endShort:D.monthShort(r[2].end),
      midMonth:D.monthName(r[1].end), closingMonth:D.monthName(r[2].end),
      midR2:D.shiftDate(r[1].start,14), r3Start:r[2].start, closingWeek:D.shiftDate(r[2].end,-11),
      cycleEnd:r[2].end};
  },
  capacityLeft:(db,mentorId,rotation)=>2 - db.pairs.filter(p=>p.rotation===rotation&&p.mentorId===mentorId&&p.status!=='rejected').length,
  repeatMentor:(db,menteeId,mentorId)=>db.pairs.some(p=>p.menteeId===menteeId&&p.mentorId===mentorId&&p.status!=='rejected'),
  menteeCloseoffs:(db,menteeId)=>db.pairs.filter(p=>p.menteeId===menteeId&&p.status==='closed'&&p.closeoff),
  /* Owner-decided rule (F0806-172216). Certificates are presented physically at
     Appreciation Night; "issuing" here records qualification and readiness.
     Mentee: 3 close-offs + mid-prog review + end-prog evaluation + Builder's Commitment.
     Mentor: mid-prog feedback + end-prog evaluation. */
  certMissing:(db,p)=>{
    const miss=[];
    if(p.kind==='mentee'){
      const co=D.menteeCloseoffs(db,p.id).length;
      if(co<3) miss.push(`${3-co} rotation close-off${3-co>1?'s':''}`);
      if(!(db.menteeMidReviews||[]).some(m=>m.menteeId===p.id)) miss.push('mid-prog review (R2 close-off)');
      if(!(db.endEvaluations||[]).some(e=>e.personId===p.id)) miss.push('end-prog evaluation (R3 close-off)');
      if(!db.builderReflections.some(b=>b.menteeId===p.id)) miss.push("Builder's Commitment");
    } else {
      if(!db.midreviews.some(m=>m.mentorId===p.id)) miss.push('mid-prog feedback');
      if(!(db.endEvaluations||[]).some(e=>e.personId===p.id)) miss.push('end-prog evaluation');
    }
    return miss;
  },
  certEligible:(db,p)=>D.certMissing(db,p).length===0,
  /* Approve-by-exception (F0806-232836): a lead may certify someone who misses a
     criterion, with a mandatory reason — recorded on the certificate and audited. */
  approveByException(db, personId, reason, actor){
    const p=D.person(db,personId);
    if(!p || db.certificates.some(c=>c.personId===personId)) return null;
    const missing=D.certMissing(db,p);
    if(!missing.length) return null;                       // nothing exceptional about it
    if(!reason || !String(reason).trim()) return null;     // the audit trail needs a why
    db.certificates.push({personId, at:db.today,
      byException:{by:actor, reason:String(reason).trim().slice(0,300), missing}});
    db.emails.push({at:db.today,to:p.email,kind:'certificate',
      subject:`Your ${db.config.cohort.label.replace(/\s*\(.*\)\s*/,'')} certificate (approved by exception), ${p.name}`});
    D.logAudit(db, db.today, actor, 'certificate_by_exception:'+missing.join('+'), personId);
    return db.certificates[db.certificates.length-1];
  },
  aiSummary:p=>{                                   // simulated AI output, clearly labelled in UI
    if(p.kind==='mentor')
      return `${p.role} at ${p.org} (${p.background}). ${p.xcultural}; ${p.leadership}. Track: ${p.track}. Motivation: ${p.motivation}. No flags.`;
    return `${p.university} ${p.course}, year ${p.year}. Goal: ${p.goals}. Development needs: ${p.devNeeds}. Track: ${p.track}. Ready to reflect. No flags.`;
  },
  /* ---- matching priority (R2-Q3): development-need fit → industry → diversity ----
     Each signal below is what earns a mentor points, and the same text is quoted back
     in the rationale — so the explanation the Programme Lead reads is the actual
     reason the pair ranked first, not a template written after the fact. */
  mentorYears:m=>parseInt((m.background||'').match(/^(\d+)/)?.[1]||'0',10),
  DEVNEED_FIT:{
    'communication and presence': m=>
      m.industry==='Communications' ? `works in communications (${m.background})`
      : (m.languages||[]).length>1 ? `works across ${m.languages.join(', ')}` : null,
    'networking and building professional relationships': m=>
      /markets|countries|overseas/.test(m.xcultural||'') ? m.xcultural : null,
    'structured thinking and prioritisation': m=>
      (m.industry==='Consulting'||/Partner|Director|Regional Lead/.test(m.role||''))
        ? `${m.role} in ${(m.industry||'').toLowerCase()}` : null,
    'confidence and self-belief': m=>
      /mentored juniors/.test(m.leadership||'') ? m.leadership : null,
    'industry knowledge and career mapping': m=>
      D.mentorYears(m)>=18 ? `${m.background} at ${m.org}` : null,
    'leadership and taking initiative': m=>
      /leads a team|built and managed/.test(m.leadership||'') ? m.leadership : null,
  },
  matchScore(db, mentor, mentee){
    const reasons=[]; let score=0;
    (mentee.devNeeds||'').split(';').map(s=>s.trim()).filter(Boolean).forEach(n=>{
      const hit = D.DEVNEED_FIT[n] && D.DEVNEED_FIT[n](mentor);
      if(hit){ score+=10; reasons.push(`Development need “${n}” — mentor ${hit}`); }
    });
    if(mentor.industry && mentor.industry===mentee.industryInterest){ score+=6;
      reasons.push(`Industry fit: mentee is aiming at ${mentee.industryInterest}; mentor brings ${mentor.background} at ${mentor.org}`); }
    // Working Design lists matching criteria as industry, CULTURE, development needs and
    // diversity. Cross-cultural exposure was in the mentor record but never scored.
    if(mentor.xcultural){ score+=4;
      reasons.push(`Cross-cultural exposure: mentor ${mentor.xcultural}`); }
    // History means rotations already settled. A pending proposal is not history —
    // counting it makes the proposed mentor lose its own diversity credit on re-score.
    const priorOrgs=new Set(db.pairs.filter(x=>x.menteeId===mentee.id&&['approved','closed'].includes(x.status))
      .map(x=>(D.person(db,x.mentorId)||{}).org).filter(Boolean));
    if(priorOrgs.size && !priorOrgs.has(mentor.org)){ score+=3;
      reasons.push(`Diversity: a different organisation from this mentee's earlier rotation${priorOrgs.size>1?'s':''} (${[...priorOrgs].join(', ')})`); }
    const load=db.pairs.filter(x=>x.mentorId===mentor.id&&['proposed','approved','closed'].includes(x.status)).length;
    score += Math.max(0, 2-load)*0.5;                       // spread the load across the pool
    return {score, reasons, load};
  },
  rankMentors(db, cands, mentee){
    return cands.map(m=>Object.assign({m}, D.matchScore(db,m,mentee)))
      .sort((a,b)=> b.score-a.score || (a.m.id<b.m.id?-1:1));   // deterministic tiebreak
  },
  rationaleFor(best, mentee, poolSize){
    const lines = best.reasons.slice(0,2);
    if(!lines.length) lines.push(`No development-need or industry signal separates this mentor from the rest of the ${TRACKS[mentee.track].label} pool — ranked on availability alone`);
    lines.push(`Ranked 1st of ${poolSize} eligible ${TRACKS[mentee.track].label}-track mentors (development-need fit → industry → cross-cultural → diversity); capacity, conflict and no-repeat checks passed`);
    return lines;
  },
  aiRationale:(db,mentor,mentee)=>{
    const s=D.matchScore(db,mentor,mentee);
    return s.reasons.length? s.reasons.slice(0,2)
      : [`Same ${TRACKS[mentee.track].label} track; mentor brings ${mentor.background} at ${mentor.org}`];
  },
  /* actions (all mutations go through here — the demo's "backend") */
  submitApplication(db, kind, fields){
    const required = kind==='mentee' ? ['name','email','track','course','goals','consent'] : ['name','email','track','org','role','consent'];
    const missing = required.filter(k=>!fields[k]);
    const id=(kind==='mentor'?'M':'E')+String(900+db.people.filter(p=>p.id[0]===(kind==='mentor'?'M':'E')).length);
    const p={id,kind,track:fields.track||null,name:fields.name||'(no name)',email:fields.email||'',mobile:fields.mobile||'',
      appStatus:missing.length?'draft':'submitted',submittedAt:db.today,ack:null,orientation:null,source:'form',...fields};
    // A3: a second application on a known email flags BOTH records for a human to look
    // at — never silently merged (loses data) and never rejected (locks out a genuine
    // re-submission after a typo).
    const clash = fields.email ? db.people.filter(x=>x.email && x.email.toLowerCase()===String(fields.email).toLowerCase()) : [];
    if(clash.length){
      p.duplicateOf = clash[0].id;
      clash.forEach(x=>{ x.duplicateFlag = true; });
      p.duplicateFlag = true;
      D.logAudit(db, db.today, 'system', 'duplicate_email_flagged', id);
    }
    db.people.push(p);
    if(!missing.length){
      db.emails.push({at:db.today,to:p.email||'(applicant)',kind:'confirm',
        subject:`GRMP: application received — thank you, ${p.name}`});
    }
    D.logAudit(db, db.today, 'system', missing.length?'application_draft_saved':'application_submitted', id);
    return {person:p,missing};
  },
  score(db, personId, reviewer, score, comment){
    db.reviews.push({personId,reviewer,score,comment});
    D.logAudit(db, db.today, reviewer, 'scored', personId);
  },
  decide(db, personId, decision, actor){
    const p=D.person(db,personId); p.appStatus=decision;
    const subj={accepted:'You’re in! Next: acknowledge the Programme Rules',reserve_bench:'You’re on our mentor reserve bench',
      waitlisted:'GRMP: you’re on the waitlist',declined:'GRMP: application outcome'}[decision];
    db.emails.push({at:db.today,to:p.email,kind:'decision',subject:subj});
    D.logAudit(db, db.today, actor, 'decision:'+decision, personId);
  },
  acknowledge(db, personId, docKey){
    const p=D.person(db,personId); p.ack=p.ack||{}; p.ack[docKey]=db.today;
    D.logAudit(db, db.today, personId, 'acknowledged:'+docKey, personId);
  },
  setOrientationVideos(db, menteeUrl, mentorUrl, actor){
    db.config.orientationVideo = String(menteeUrl||'').trim().slice(0,300);
    db.config.orientationVideoMentor = String(mentorUrl||'').trim().slice(0,300);
    const any = db.config.orientationVideo || db.config.orientationVideoMentor;
    D.logAudit(db, db.today, actor, any?'orientation_videos_set':'orientation_videos_cleared', 'config');
    return {mentee: db.config.orientationVideo, mentor: db.config.orientationVideoMentor};
  },
  // The one place that decides which recording a given person's player opens.
  orientationVideoFor(db, person){
    if(person && person.kind==='mentor' && db.config.orientationVideoMentor) return db.config.orientationVideoMentor;
    return db.config.orientationVideo || '';
  },
  completeOrientation(db, personId, mode){
    const p=D.person(db,personId); p.orientation={mode,at:db.today};
    D.logAudit(db, db.today, personId, 'orientation:'+mode, personId);
  },
  suggestMatches(db, rotation, track){
    const mentees=db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&p.track===track
      && !D.gateBlocked(p) && !db.pairs.some(x=>x.rotation===rotation&&x.menteeId===p.id&&['proposed','approved','closed'].includes(x.status)));
    const out=[];
    mentees.forEach(e=>{
      const cands=db.people.filter(m=>m.kind==='mentor'&&['accepted'].includes(m.appStatus)&&!m.droppedOut&&m.track===track
        && D.capacityLeft(db,m.id,rotation)>0 && !D.repeatMentor(db,e.id,m.id));
      if(cands.length){
        const ranked=D.rankMentors(db,cands,e), best=ranked[0];
        const pr={id:'P'+String(db.pairs.length+1).padStart(3,'0'),rotation,mentorId:best.m.id,menteeId:e.id,
          status:'proposed', score:Math.round(best.score*10)/10, rankedOutOf:ranked.length,
          rationale:D.rationaleFor(best,e,ranked.length)};
        db.pairs.push(pr); out.push(pr);
      }
    });
    D.logAudit(db, db.today, 'matching engine', `suggested ${out.length} pairs (R${rotation}/${track})`, 'matching');
    return out;
  },
  /* The Lead has to be able to say no, not only yes (manual 5.3: "or adjust:
     swap a suggestion before approving"). Alternatives are the same ranking the
     proposal came from, so the Lead can see what she is overriding. */
  alternativesFor(db, pairId, n){
    const pr=db.pairs.find(p=>p.id===pairId); if(!pr) return [];
    const e=D.person(db,pr.menteeId);
    const cands=db.people.filter(m=>m.kind==='mentor'&&m.appStatus==='accepted'&&!m.droppedOut&&m.track===e.track
      && D.capacityLeft(db,m.id,pr.rotation)>0 && !D.repeatMentor(db,e.id,m.id) && m.id!==pr.mentorId);
    return D.rankMentors(db,cands,e).slice(0,n||3);
  },
  discardProposal(db, pairId, actor){
    const pr=db.pairs.find(p=>p.id===pairId);
    if(!pr || pr.status!=='proposed') return null;
    db.pairs = db.pairs.filter(p=>p.id!==pairId);
    D.logAudit(db, db.today, actor, 'proposal_discarded', pairId);
    return pr;
  },
  reassignProposal(db, pairId, mentorId, actor){
    const pr=db.pairs.find(p=>p.id===pairId);
    if(!pr || pr.status!=='proposed') return null;
    const e=D.person(db,pr.menteeId), m=D.person(db,mentorId);
    if(!m || m.kind!=='mentor' || m.track!==e.track || m.droppedOut) return null;
    if(D.capacityLeft(db,m.id,pr.rotation)<=0 || D.repeatMentor(db,e.id,m.id)) return null;
    const s=D.matchScore(db,m,e);
    pr.mentorId=m.id; pr.score=Math.round(s.score*10)/10; pr.adjustedBy=actor;
    pr.rationale=(s.reasons.length? s.reasons.slice(0,2)
      : [`Same ${TRACKS[e.track].label} track; mentor brings ${m.background} at ${m.org}`])
      .concat([`Chosen by ${actor} over the AI's first pick; capacity, conflict and no-repeat checks passed`]);
    D.logAudit(db, db.today, actor, 'proposal_reassigned', pairId);
    return pr;
  },
  /* R2-Q5: "no acknowledgement after the final reminder → treated as withdrawn, seat
     freed". The card claimed this while nothing implemented it. The rule is deliberately
     an explicit action, not a silent cron: freeing someone's seat is a decision a human
     owns, and it must be reversible by promoting from the waitlist. */
  finalReminderPassed(db){
    const last = (db.config.ackLadder||[]).slice(-1)[0];
    return !!last && db.today > last.date;
  },
  pendingWithdrawal(db){
    if(!D.finalReminderPassed(db)) return [];
    return db.people.filter(p=>p.appStatus==='accepted' && !D.ackComplete(p));
  },
  withdrawUnacknowledged(db, actor){
    const out=[];
    D.pendingWithdrawal(db).forEach(p=>{
      p.appStatus='withdrawn'; p.withdrawnAt=db.today; out.push(p);
      db.emails.push({at:db.today,to:p.email,kind:'withdrawn',
        subject:`GRMP: your place has been released — ${p.name}`});
      D.logAudit(db, db.today, actor, 'withdrawn_no_acknowledgement', p.id);
    });
    return out;
  },
  approvePair(db, pairId, actor){
    const pr=db.pairs.find(p=>p.id===pairId); pr.status='approved'; pr.approvedAt=db.today;
    const m=D.person(db,pr.mentorId), e=D.person(db,pr.menteeId);
    db.emails.push({at:db.today,to:`${m.email}, ${e.email}`,kind:'match',subject:`Your Rotation ${pr.rotation} match: ${m.name} ↔ ${e.name}`});
    // F1 gap: the bulk guide release fires when the clock crosses a rotation's start —
    // but R3 pairs are approved AFTER R3 begins, so the sweep has already run (over an
    // empty list) and would never reach them. A pair approved mid-rotation gets its
    // guide with the match notification.
    const rot=db.config.rotations.find(r=>r.n===pr.rotation);
    if(rot && db.today>=rot.start){
      db.emails.push({at:db.today,to:`${m.email}, ${e.email}`,kind:'guide',
        subject:`Rotation ${pr.rotation} guide — ${rot.label}`});
    }
    D.logAudit(db, db.today, actor, 'pair_approved', pairId);
  },
  closeoff(db, pairId, metTwice, reflectionDone, comment, extraText){
    const pr=db.pairs.find(p=>p.id===pairId);
    pr.status='closed'; pr.closeoff={metTwice,reflectionDone,comment:comment||'',at:db.today};
    // Owner F0806-173822: the R2 close-off carries the mentee's mid-prog review,
    // the R3 close-off carries their end-prog evaluation.
    if(extraText && String(extraText).trim()){
      const t=String(extraText).trim().slice(0,2000);
      if(pr.rotation===2) db.menteeMidReviews=(db.menteeMidReviews||[]), db.menteeMidReviews.push({menteeId:pr.menteeId,text:t,at:db.today});
      if(pr.rotation===3) db.endEvaluations=(db.endEvaluations||[]), db.endEvaluations.push({personId:pr.menteeId,kind:'mentee',text:t,at:db.today});
    }
    D.logAudit(db, db.today, pr.menteeId, 'closeoff', pairId);
  },
  submitEndEvaluation(db, personId, text){
    db.endEvaluations=(db.endEvaluations||[]);
    db.endEvaluations.push({personId, kind:(D.person(db,personId)||{}).kind||'mentor', text:String(text||'').trim().slice(0,2000), at:db.today});
    D.logAudit(db, db.today, personId, 'end_evaluation', personId);
  },
  submitMidReview(db, mentorId, text){
    db.midreviews.push({mentorId,text,at:db.today});
    D.logAudit(db, db.today, mentorId, 'mid_review', mentorId);
  },
  submitBuilderReflection(db, menteeId, text){
    db.builderReflections.push({menteeId,text,at:db.today});
    D.logAudit(db, db.today, menteeId, 'builder_reflection', menteeId);
  },
  issueCertificates(db, actor){
    const issued=[];
    db.people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus)).forEach(p=>{
      if(D.certEligible(db,p) && !db.certificates.some(c=>c.personId===p.id)){
        db.certificates.push({personId:p.id,at:db.today}); issued.push(p);
        db.emails.push({at:db.today,to:p.email,kind:'certificate',subject:`Your ${db.config.cohort.label.replace(/\s*\(.*\)\s*/,'')} completion certificate, ${p.name}`});
      }
    });
    D.logAudit(db, db.today, actor, `certificates_issued:${issued.length}`, 'certificates');
    return issued;
  },
  promoteWaitlist(db, personId, actor){
    const p=D.person(db,personId); p.appStatus='accepted';
    db.emails.push({at:db.today,to:p.email,kind:'decision',subject:'Good news — a place has opened up for you in GRMP'});
    D.logAudit(db, db.today, actor, 'waitlist_promoted', personId);
  },
  /* Manual 6.6 first half: "Mark a mentor dropped → their mentees enter a re-match
     queue". The queue, the bench restriction and the replacement all existed — but the
     marking itself only ever happened in the seed. A dropout the coordinator cannot
     record is a feature that does not exist. */
  markDropout(db, mentorId, reason, actor){
    const m=D.person(db,mentorId);
    if(!m || m.kind!=='mentor' || m.droppedOut) return null;
    m.droppedOut={at:db.today, reason:(reason||'not given').slice(0,140)};
    const rot=D.currentRotation(db);
    const affected=db.pairs.filter(p=>p.mentorId===mentorId
      && p.status==='approved' && (!rot || p.rotation===rot.n));
    affected.forEach(p=>{ p.status='rematch_needed'; });
    D.logAudit(db, db.today, actor, 'mentor_dropped:'+(reason||'not given').slice(0,60), mentorId);
    return {mentor:m, affected:affected.length};
  },
  replaceMentor(db, pairId, benchMentorId, actor){
    const old=db.pairs.find(p=>p.id===pairId);
    const bench=D.person(db,benchMentorId); bench.appStatus='accepted';
    const pr={id:'P'+String(db.pairs.length+1).padStart(3,'0'),rotation:old.rotation,mentorId:benchMentorId,menteeId:old.menteeId,
      status:'approved',approvedAt:db.today,rationale:['Reserve-bench replacement after mentor dropout',...D.aiRationale(db,bench,D.person(db,old.menteeId)).slice(0,1)]};
    old.status='replaced';
    db.pairs.push(pr);
    const e=D.person(db,old.menteeId);
    db.emails.push({at:db.today,to:e.email,kind:'match',subject:`Your new mentor for Rotation ${old.rotation}: ${bench.name}`});
    D.logAudit(db, db.today, actor, 'mentor_replaced', pairId);
    return pr;
  },
  toggleAttendance(db, eventKey, personId){
    const ev = db.events[eventKey]; if(!ev) return;
    const i = ev.attendance.indexOf(personId);
    if(i>=0) ev.attendance.splice(i,1); else ev.attendance.push(personId);
    D.logAudit(db, db.today, 'coordinator', 'attendance:'+eventKey, personId);
  },
  remindCloseoff(db, email){
    db.emails.push({at:db.today,to:email,kind:'closeoff',subject:'Reminder: please close off your rotation (two quick confirmations)'});
  },
  confirmReturn(db, personId){
    const p = D.person(db, personId);
    if(!p || p.appStatus!=='invited') return false;
    p.appStatus='accepted';
    db.emails.push({at:db.today,to:p.email,kind:'decision',subject:`Welcome back to ${db.config.cohort.label}, ${p.name}!`});
    D.logAudit(db, db.today, personId, 'returning_mentor_confirmed', personId);
    return true;
  },
  startNewCycle(db, opts){
    // opts: {label, rotations:[{n,label,start,end}x3], ackLadder?, today, actor, carryOverMentors=true}
    const old = db.config.cohort;
    const closed = n=>db.pairs.filter(x=>x.rotation===n&&x.status==='closed').length;
    db.archives.push({id:old.id, label:old.label, archivedAt:db.today,
      stats:{mentors:db.people.filter(p=>p.kind==='mentor'&&['accepted','reserve_bench'].includes(p.appStatus)).length,
             mentees:db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted').length,
             r1:closed(1), r2:closed(2), r3:closed(3),
             certificates:db.certificates.length,
             kickoff:db.events.kickoff.attendance.length}});
    const carry = opts.carryOverMentors!==false;
    const keep = carry ? db.people.filter(p=>p.kind==='mentor'&&['accepted','reserve_bench'].includes(p.appStatus)) : [];
    keep.forEach(m=>{ m.appStatus='invited'; m.ack=null; m.orientation=null; delete m.droppedOut; });
    db.people = keep;
    db.reviews=[]; db.pairs=[]; db.midreviews=[]; db.menteeMidReviews=[]; db.endEvaluations=[]; db.builderReflections=[]; db.certificates=[]; db.concerns=[];
    db.emails=[{at:opts.today,to:carry?keep.length+' returning mentors':'—',kind:'decision',
      subject:`${opts.label}: invitation to return as a mentor`}];
    const newId = 'C'+(opts.rotations[0].start||'').slice(0,4);
    db.events = {kickoff:{name:'Kickoff Night', date:opts.kickoffDate||opts.rotations[0].start, attendance:[]},
                 appreciation:{name:'Appreciation Night', date:opts.appreciationDate||opts.rotations[2].end, attendance:[]}};
    db.config.cohort = {id:newId, label:opts.label};
    db.config.orientationVideo=''; db.config.orientationVideoMentor='';   // new cycle, new sessions
    db.config.cycle = opts.label;
    const oldR1Year = Number((db.config.rotations[0].start||'0000').slice(0,4));
    db.config.rotations = opts.rotations;
    if(opts.ackLadder) db.config.ackLadder = opts.ackLadder;
    else {
      // Carrying the old ladder verbatim leaves its dates in the previous cycle, so the
      // "final reminder passed" rule fires on day one and every returning mentor becomes
      // instantly withdrawable. Shift the ladder into the new cycle's year.
      const delta = Number(opts.rotations[0].start.slice(0,4)) - oldR1Year;
      db.config.ackLadder = (db.config.ackLadder||[]).map(l=>({...l,
        date: String(Number(l.date.slice(0,4))+delta)+l.date.slice(4)}));
      if(db.config.registration){
        const sh=iso=>String(Number(iso.slice(0,4))+delta)+iso.slice(4);
        db.config.registration={opens:sh(db.config.registration.opens), closes:sh(db.config.registration.closes)};
      }
    }
    db.today = opts.today;
    D.logAudit(db, opts.today, opts.actor||'lead', 'new_cycle_started:'+newId+' (archived '+old.id+')', 'config');
    return newId;
  },
  setToday(db, dateStr){
    const before = db.today;
    db.today = dateStr;
    D.logAudit(db, dateStr, 'demo', 'clock_set:'+dateStr, 'config');
    D.releaseRotationGuides(db, before);
  },
  /* PRD F1: the rotation guide goes out on the rotation start date, to every active
     pair, without anyone remembering. Date-driven, and idempotent — crossing the same
     start date twice must not send it twice. */
  releaseRotationGuides(db, since){
    db.guidesSent = db.guidesSent || [];
    const due = db.config.rotations.filter(r=>r.start<=db.today && (!since || r.start>since));
    const sent=[];
    due.forEach(r=>{
      if(db.guidesSent.includes(r.n)) return;
      const pairs = db.pairs.filter(p=>p.rotation===r.n && ['approved','closed'].includes(p.status));
      pairs.forEach(p=>{
        const m=D.person(db,p.mentorId), e=D.person(db,p.menteeId);
        db.emails.push({at:db.today,to:`${m?m.email:''}, ${e?e.email:''}`,kind:'guide',
          subject:`Rotation ${r.n} starts — your ${r.label} guide`});
      });
      db.guidesSent.push(r.n);
      D.logAudit(db, db.today, 'system', `rotation_guide_released:R${r.n}`, 'rotations');
      sent.push({rotation:r.n, pairs:pairs.length});
    });
    return sent;
  },
  raiseConcern(db, summary){
    const c={id:'C'+String(db.concerns.length+1).padStart(3,'0'),at:db.today,from:'(identity visible to Escalation Owner only)',
      summary,status:'referred to SMC Grievance process'};
    db.concerns.push(c);
    D.logAudit(db, db.today, '(private)', 'concern_referred', c.id);
    return c;
  },
};
const GRMP_EXPORT = {Store, D, TRACKS, DB_KEY, buildSeed};
if (typeof window !== 'undefined') window.GRMP = GRMP_EXPORT;
if (typeof module !== 'undefined' && module.exports) module.exports = GRMP_EXPORT;
