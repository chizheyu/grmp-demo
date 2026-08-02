/* GRMP Demo — state engine + seeded cohort.
   Single source of truth in localStorage. Deterministic seed (mulberry32) so tests are stable.
   Demo date is fixed at 2026-12-15 (mid-cycle: R1 closed, R2 running) so every view has life. */

const DB_KEY = 'grmp_demo_v1';
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
const MENTOR_ORGS = {general:['DBS','OCBC','Grab','Singtel','Shopee','MOE','SPH Media','EDB','McKinsey','PwC','Sea Group','ST Engineering'],
  entrepreneurship:['GreenLoop (founder)','Carousell (early team)','own venture (2x founder)','Antler SG','Glife','Stealth startup'],
  ai:['TikTok','Google','Microsoft','AI Singapore','Databricks','OpenGov']};
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
    const ind = pick(TRACKS[track].industries);
    const p = {id, kind, track, name,
      email: name.toLowerCase().replace(/[^a-z ]/g,'').replace(/ +/g,'.') + (kind==='mentor'?'@example.com':'@smu.example.edu'),
      mobile: '+65 9'+String(100+Math.floor(rnd()*900))+' '+String(1000+Math.floor(rnd()*9000)),
      appStatus, submittedAt:'2026-08-'+String(20+Math.floor(rnd()*10)),
      ack:null, orientation:null, source:'form'};
    if(kind==='mentor'){
      Object.assign(p,{org:pick(MENTOR_ORGS[track]), role:pick(MENTOR_ROLES[track]), industry:ind,
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

  // Mentees: 60 accepted + 8 waitlist + 4 declined + 2 fresh submitted (screening demo)
  const mentees = [];
  const etracks = [...Array(36).fill('general'),...Array(12).fill('entrepreneurship'),...Array(12).fill('ai')];
  etracks.forEach(t=>mentees.push(mk('mentee',t,'accepted')));
  for(let i=0;i<8;i++) mk('mentee',pick(['general','entrepreneurship','ai']),'waitlisted');
  for(let i=0;i<4;i++) mk('mentee',pick(['general','ai']),'declined');
  for(let i=0;i<2;i++) mk('mentee',pick(['general','ai']),'submitted');   // still in screening

  /* acknowledgement + orientation: all accepted done EXCEPT 2 late mentees (gate demo) */
  const DOCS = ['rules','charter','governance','pdpa','coi'];
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
      status:statusPlan, approvedAt: rotation===1?'2026-09-28':'2026-11-30',
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
  const preview = pickN(activeMentees.filter(e=>!unmatchedR2.includes(e)),2);
  preview.forEach(e=>{
    const pr2 = pairs.find(p=>p.rotation===2 && p.menteeId===e.id);
    if(pr2){pr2.status='closed'; pr2.closeoff={metTwice:true,reflectionDone:true,at:'2026-12-14',comment:''};}
    const p3=pairUp(3,e,'closed'); if(p3){p3.approvedAt='2027-02-01';p3.closeoff={metTwice:true,reflectionDone:true,at:'2027-03-10',comment:''};p3.preview=true;}
    e.previewFastForward = true;
  });

  /* events */
  const attendedKickoff = people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus) && p.orientation).map(p=>p.id);
  const events = {
    kickoff:      {name:'Kickoff Night', date:'2026-10-03', attendance:pickN(attendedKickoff, Math.floor(attendedKickoff.length*0.9))},
    appreciation: {name:'Appreciation Night', date:'2027-03-27', attendance:[]},
  };

  /* concerns: 1 sample referral */
  const concerns = [{id:'C001', at:'2026-11-18', from:'(mentee — identity visible to Escalation Owner only)',
    summary:'Raised a concern about repeated last-minute cancellations', status:'referred to SMC Grievance process'}];

  /* email log (what would have been sent) */
  const emails = [
    {at:'2026-09-01', to:'all accepted', subject:'Welcome to GRMP 2026 — please acknowledge the Programme Rules', kind:'ack_notify'},
    {at:'2026-09-08', to:'12 outstanding', subject:'Reminder: acknowledgement outstanding', kind:'ack_remind'},
    {at:'2026-09-15', to:'4 outstanding', subject:'Final reminder: acknowledgement required to be matched', kind:'ack_final'},
    {at:'2026-09-28', to:'all matched pairs', subject:'Your Rotation 1 match — Know Yourself', kind:'match'},
    {at:'2026-11-25', to:'mentees', subject:'Rotation 1 close-off — two quick confirmations', kind:'closeoff'},
    {at:'2026-11-30', to:'all matched pairs', subject:'Your Rotation 2 match — Know Your World', kind:'match'},
  ];

  return {
    version:1, today:TODAY,
    config:{
      cycle:'GRMP 2026 (SMU pilot)',
      rotations:[{n:1,label:'Know Yourself',start:'2026-10-01',end:'2026-11-30'},
                 {n:2,label:'Know Your World',start:'2026-12-01',end:'2027-01-31'},
                 {n:3,label:'Know Your Path',start:'2027-02-01',end:'2027-03-31'}],
      ackLadder:[{week:'Sept W1',date:'2026-09-01',what:'Acknowledgement notification'},
                 {week:'Sept W2',date:'2026-09-08',what:'First reminder'},
                 {week:'Sept W3',date:'2026-09-15',what:'Final reminder'}],
      admins:[{name:'Esther', role:'Programme Lead', roles:['lead','mentor_reviewer','mentee_reviewer','escalation']},
              {name:'Wei Kiat', role:'Programme Coordinator', roles:['coordinator','mentor_reviewer','mentee_reviewer']},
              {name:'Kenzie', role:'Mentor Reviewer (SMU)', roles:['mentor_reviewer']},
              {name:'Yu Tong', role:'Mentor Reviewer (SMU)', roles:['mentor_reviewer']},
              {name:'Portia', role:'Mentee Reviewer (SMU)', roles:['mentee_reviewer']},
              {name:'Sapranshu', role:'Mentee Reviewer (SMU)', roles:['mentee_reviewer']}],
      openItems:{
        Q1:{title:'Reflection Sheet lives on the microsite; system records close-offs only', inferred:true},
        Q2:{title:'Certificate after all 3 rotations (mentee: 3 close-offs + Builder Reflection; mentor: all rotations + mid-programme review)', inferred:true},
        Q3:{title:'One track per mentee; matching strictly within track; priority = development-need fit → industry → diversity', inferred:true},
        Q4:{title:'Form fields follow Working Design §3 until Joanne’s final form arrives', inferred:true},
        Q5:{title:'No acknowledgement after the final reminder → treated as withdrawn, seat freed', inferred:true},
        Q6:{title:'Concern link on microsite + acknowledgement page; Esther is sole recipient', inferred:true},
        Q7:{title:'Lean scope: no pair/meeting/availability tracking, no kickoff-goals form, no reflection content stored', inferred:true},
        Q8:{title:'Placeholder dates: registration early Sept · Kickoff early Oct · microsite live before registration', inferred:true},
      },
    },
    people, reviews, pairs, events, concerns, emails,
    midreviews:[], builderReflections:[], certificates:[], audit:[],
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
  ackComplete:p=>p.ack && ['rules','charter','governance','pdpa','coi'].every(d=>p.ack[d]),
  gateBlocked:p=>['accepted'].includes(p.appStatus) && !(D.ackComplete(p) && p.orientation),
  currentRotation:db=>{const t=db.today;return db.config.rotations.find(r=>t>=r.start&&t<=r.end)||null},
  pairsFor:(db,personId)=>db.pairs.filter(p=>p.mentorId===personId||p.menteeId===personId),
  capacityLeft:(db,mentorId,rotation)=>2 - db.pairs.filter(p=>p.rotation===rotation&&p.mentorId===mentorId&&p.status!=='rejected').length,
  repeatMentor:(db,menteeId,mentorId)=>db.pairs.some(p=>p.menteeId===menteeId&&p.mentorId===mentorId&&p.status!=='rejected'),
  menteeCloseoffs:(db,menteeId)=>db.pairs.filter(p=>p.menteeId===menteeId&&p.status==='closed'&&p.closeoff),
  certEligible:(db,p)=>{
    if(p.kind==='mentee'){
      return D.menteeCloseoffs(db,p.id).length>=3 && db.builderReflections.some(b=>b.menteeId===p.id);
    }
    const served = db.pairs.some(x=>x.mentorId===p.id&&['approved','closed'].includes(x.status));
    const earlyServed = db.pairs.some(x=>x.mentorId===p.id&&x.rotation<=2&&['approved','closed','replaced'].includes(x.status));
    return served && (!earlyServed || db.midreviews.some(m=>m.mentorId===p.id));
  },
  aiSummary:p=>{                                   // simulated AI output, clearly labelled in UI
    if(p.kind==='mentor')
      return `${p.role} at ${p.org} (${p.background}). ${p.xcultural}; ${p.leadership}. Track: ${p.track}. Motivation: ${p.motivation}. No flags.`;
    return `${p.university} ${p.course}, year ${p.year}. Goal: ${p.goals}. Development needs: ${p.devNeeds}. Track: ${p.track}. Ready to reflect. No flags.`;
  },
  aiRationale:(mentor,mentee)=>[
    `Same ${TRACKS[mentee.track].label} track; mentee's needs (${mentee.devNeeds.split(';')[0].trim()}) match the mentor's strengths`,
    `Mentee aims to ${mentee.goals}; mentor offers ${mentor.background} at ${mentor.org}`,
    `Constraint checks passed: capacity, no conflict, no repeat mentor`,
  ],
  /* actions (all mutations go through here — the demo's "backend") */
  submitApplication(db, kind, fields){
    const required = kind==='mentee' ? ['name','email','track','course','goals','consent'] : ['name','email','track','org','role','consent'];
    const missing = required.filter(k=>!fields[k]);
    const id=(kind==='mentor'?'M':'E')+String(900+db.people.filter(p=>p.id[0]===(kind==='mentor'?'M':'E')).length);
    const p={id,kind,track:fields.track||null,name:fields.name||'(no name)',email:fields.email||'',mobile:fields.mobile||'',
      appStatus:missing.length?'incomplete':'submitted',submittedAt:db.today,ack:null,orientation:null,source:'form',...fields};
    db.people.push(p);
    db.emails.push({at:db.today,to:p.email||'(applicant)',kind:missing.length?'missing_info':'confirm',
      subject:missing.length?`Your GRMP application is missing: ${missing.join(', ')}`:`GRMP: application received — thank you, ${p.name}`});
    db.audit.push({at:db.today,actor:'system',action:missing.length?'application_incomplete':'application_submitted',entity:id});
    return {person:p,missing};
  },
  score(db, personId, reviewer, score, comment){
    db.reviews.push({personId,reviewer,score,comment});
    db.audit.push({at:db.today,actor:reviewer,action:'scored',entity:personId});
  },
  decide(db, personId, decision, actor){
    const p=D.person(db,personId); p.appStatus=decision;
    const subj={accepted:'You’re in! Next: acknowledge the Programme Rules',reserve_bench:'You’re on our mentor reserve bench',
      waitlisted:'GRMP: you’re on the waitlist',declined:'GRMP: application outcome'}[decision];
    db.emails.push({at:db.today,to:p.email,kind:'decision',subject:subj});
    db.audit.push({at:db.today,actor,action:'decision:'+decision,entity:personId});
  },
  acknowledge(db, personId, docKey){
    const p=D.person(db,personId); p.ack=p.ack||{}; p.ack[docKey]=db.today;
    db.audit.push({at:db.today,actor:personId,action:'acknowledged:'+docKey,entity:personId});
  },
  completeOrientation(db, personId, mode){
    const p=D.person(db,personId); p.orientation={mode,at:db.today};
    db.audit.push({at:db.today,actor:personId,action:'orientation:'+mode,entity:personId});
  },
  suggestMatches(db, rotation, track){
    const mentees=db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&p.track===track
      && !D.gateBlocked(p) && !db.pairs.some(x=>x.rotation===rotation&&x.menteeId===p.id&&['proposed','approved','closed'].includes(x.status)));
    const out=[];
    mentees.forEach(e=>{
      const cands=db.people.filter(m=>m.kind==='mentor'&&['accepted'].includes(m.appStatus)&&!m.droppedOut&&m.track===track
        && D.capacityLeft(db,m.id,rotation)>0 && !D.repeatMentor(db,e.id,m.id));
      if(cands.length){
        const m=cands[0];
        const pr={id:'P'+String(db.pairs.length+1).padStart(3,'0'),rotation,mentorId:m.id,menteeId:e.id,
          status:'proposed',rationale:D.aiRationale(m,e)};
        db.pairs.push(pr); out.push(pr);
      }
    });
    db.audit.push({at:db.today,actor:'AI',action:`suggested ${out.length} pairs (R${rotation}/${track})`,entity:'matching'});
    return out;
  },
  approvePair(db, pairId, actor){
    const pr=db.pairs.find(p=>p.id===pairId); pr.status='approved'; pr.approvedAt=db.today;
    const m=D.person(db,pr.mentorId), e=D.person(db,pr.menteeId);
    db.emails.push({at:db.today,to:`${m.email}, ${e.email}`,kind:'match',subject:`Your Rotation ${pr.rotation} match: ${m.name} ↔ ${e.name}`});
    db.audit.push({at:db.today,actor,action:'pair_approved',entity:pairId});
  },
  closeoff(db, pairId, metTwice, reflectionDone, comment){
    const pr=db.pairs.find(p=>p.id===pairId);
    pr.status='closed'; pr.closeoff={metTwice,reflectionDone,comment:comment||'',at:db.today};
    db.audit.push({at:db.today,actor:pr.menteeId,action:'closeoff',entity:pairId});
  },
  submitMidReview(db, mentorId, text){
    db.midreviews.push({mentorId,text,at:db.today});
    db.audit.push({at:db.today,actor:mentorId,action:'mid_review',entity:mentorId});
  },
  submitBuilderReflection(db, menteeId, text){
    db.builderReflections.push({menteeId,text,at:db.today});
    db.audit.push({at:db.today,actor:menteeId,action:'builder_reflection',entity:menteeId});
  },
  issueCertificates(db, actor){
    const issued=[];
    db.people.filter(p=>['accepted','reserve_bench'].includes(p.appStatus)).forEach(p=>{
      if(D.certEligible(db,p) && !db.certificates.some(c=>c.personId===p.id)){
        db.certificates.push({personId:p.id,at:db.today}); issued.push(p);
        db.emails.push({at:db.today,to:p.email,kind:'certificate',subject:`Your GRMP 2026 completion certificate, ${p.name}`});
      }
    });
    db.audit.push({at:db.today,actor,action:`certificates_issued:${issued.length}`,entity:'certificates'});
    return issued;
  },
  promoteWaitlist(db, personId, actor){
    const p=D.person(db,personId); p.appStatus='accepted';
    db.emails.push({at:db.today,to:p.email,kind:'decision',subject:'Good news — a place has opened up for you in GRMP'});
    db.audit.push({at:db.today,actor,action:'waitlist_promoted',entity:personId});
  },
  replaceMentor(db, pairId, benchMentorId, actor){
    const old=db.pairs.find(p=>p.id===pairId);
    const bench=D.person(db,benchMentorId); bench.appStatus='accepted';
    const pr={id:'P'+String(db.pairs.length+1).padStart(3,'0'),rotation:old.rotation,mentorId:benchMentorId,menteeId:old.menteeId,
      status:'approved',approvedAt:db.today,rationale:['Reserve-bench replacement after mentor dropout',...D.aiRationale(bench,D.person(db,old.menteeId)).slice(0,1)]};
    old.status='replaced';
    db.pairs.push(pr);
    const e=D.person(db,old.menteeId);
    db.emails.push({at:db.today,to:e.email,kind:'match',subject:`Your new mentor for Rotation ${old.rotation}: ${bench.name}`});
    db.audit.push({at:db.today,actor,action:'mentor_replaced',entity:pairId});
    return pr;
  },
  setToday(db, dateStr){
    db.today = dateStr;
    db.audit.push({at:dateStr,actor:'demo',action:'clock_set:'+dateStr,entity:'config'});
  },
  raiseConcern(db, summary){
    const c={id:'C'+String(db.concerns.length+1).padStart(3,'0'),at:db.today,from:'(identity visible to Escalation Owner only)',
      summary,status:'referred to SMC Grievance process'};
    db.concerns.push(c);
    db.audit.push({at:db.today,actor:'(private)',action:'concern_referred',entity:c.id});
    return c;
  },
};
const GRMP_EXPORT = {Store, D, TRACKS, DB_KEY};
if (typeof window !== 'undefined') window.GRMP = GRMP_EXPORT;
if (typeof module !== 'undefined' && module.exports) module.exports = GRMP_EXPORT;
