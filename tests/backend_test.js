/* L1 backend tests — run: node tests/backend_test.js
   Tests the domain layer (data.js) directly: seed integrity, the R5 spec model
   (staged applications, OTP, the three-item acceptance gate, Reserve lists, decline
   variants, industry-preference matching), lifecycle rules, and the VERBATIM guard
   (legal text + email copy compared against Joanne's spec files where present). */
const G = require('../data.js');
const {Store, D, INDUSTRIES, FACULTIES, FORM_OPTS, COPY, MAILS} = G;
const fs = require('fs'), path = require('path');

let pass=0, fail=0;
function T(name, cond){ if(cond){pass++; console.log('  PASS', name);} else {fail++; console.log('  FAIL', name);} }
function fresh(){ Store.reset(); return Store.load(); }

/* A complete, valid application payload for each kind (the specs' field set). */
const MENTEE_OK = {email:'t.mentee@smu.example.edu', firstName:'Test', lastName:'Mentee', phone:'+65 9123 4567',
  nationality:'Singaporean', linkedin:'linkedin.com/in/test-mentee', heard:FORM_OPTS.heardMentee[1],
  year:'Year 2', faculty:FACULTIES[0], faculty2:'Not applicable', degree:'BBM, Finance',
  eligibilityConfirmed:true, prompt1:'I want to grow.', prompt2:'I am curious.',
  industryPrefs:[INDUSTRIES[2],INDUSTRIES[1],INDUSTRIES[4]], commit:'yes', telegramConsent:'Yes', pdpa:true};
const MENTOR_OK = {email:'t.mentor@example.com', firstName:'Test', lastName:'Mentor', phone:'+65 9876 5432',
  nationality:'Singaporean', heard:FORM_OPTS.heardMentor[2], org:'DBS', designation:'Director',
  industry:INDUSTRIES[2], linkedin:'linkedin.com/in/test-mentor', yearsExp:FORM_OPTS.yearsExp[2],
  ledTeam:'Yes', leadership:'Led a regional team of 12.', crossIndustry:FORM_OPTS.crossIndustry[0],
  priorMentoring:'Yes', draws:[FORM_OPTS.draws[0]], interests:'Fintech careers', commit:'yes',
  whatsappConsent:'Yes', pdpa:true};

console.log('— seed integrity (R5 model) —');
let db = fresh();
T('60 accepted mentors', db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='accepted').length===60);
T('60 accepted mentees (the cap)', db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted').length===60
  && db.config.selection.menteeCap===60);
T('Reserve lists populated (8 mentors + 8 mentees, invited)', db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='reserve_invited').length===8
  && db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='reserve_invited').length===8);
T('reserve replies staged: opted-in, awaiting and one declined', db.people.some(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===true)
  && db.people.some(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===null)
  && db.people.some(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===false));
T('mentee decline variants staged (not-selected + ineligible)', db.people.filter(p=>p.appStatus==='declined_not_selected').length===3
  && db.people.filter(p=>p.appStatus==='declined_ineligible').length===1);
T('fresh submitted applicants for screening demo (2 mentees + 2 mentors)', db.people.filter(p=>p.appStatus==='submitted'&&p.kind==='mentee').length===2 && db.people.filter(p=>p.appStatus==='submitted'&&p.kind==='mentor').length===2);
T('every mentor industry comes from the 17-option list', db.people.filter(p=>p.kind==='mentor'&&p.industry).every(p=>INDUSTRIES.includes(p.industry)));
T('every mentee carries 3 DISTINCT industry preferences from the same list', db.people.filter(p=>p.kind==='mentee'&&p.appStatus!=='submitted'||p.industryPrefs).filter(p=>p.kind==='mentee').every(p=>
  (p.industryPrefs||[]).length===3 && new Set(p.industryPrefs).size===3 && p.industryPrefs.every(i=>INDUSTRIES.includes(i))));
T('every mentee faculty comes from the 7 verified schools', db.people.filter(p=>p.kind==='mentee'&&p.faculty).every(p=>FACULTIES.includes(p.faculty)));
T('exactly 2 accepted people have not completed the gate (demo material)', db.people.filter(p=>D.gateBlocked(p)).length===2);
T('confirmed people carry three separate ISO timestamps (rules/coi/kickoff)', db.people.filter(p=>p.appStatus==='accepted'&&D.placeConfirmed(p)).every(p=>
  ['rules','coi','kickoff'].every(k=>/^\d{4}-\d{2}-\d{2}T/.test(p.ack[k]))));
T('everyone non-fresh has a PDPA timestamp from the application', db.people.filter(p=>p.appStatus!=='submitted').every(p=>!!p.pdpaAt));
T('a Kick-Off exception is staged open, another resolved', D.kickoffExceptionsOpen(db).length===1
  && db.people.some(p=>p.kickoff&&p.kickoff.status==='exception_requested'&&p.kickoff.resolved));
T('a declared COI is staged for the matching page', db.people.some(p=>p.appStatus==='accepted'&&p.coi&&p.coi.declared&&p.coi.details));
T('all applications submitted inside the 1–10 Sept window', db.people.filter(p=>p.submittedAt&&p.appStatus!=='submitted').every(p=>
  p.submittedAt>=db.config.registration.opens && p.submittedAt<=db.config.registration.closes));
T('capacity ≤2 respected in seed', (()=>{const c={};for(const x of db.pairs.filter(p=>p.status!=='replaced')){const k=x.rotation+'/'+x.mentorId;c[k]=(c[k]||0)+1;if(c[k]>2)return false}return true})());
T('no repeat mentor across rotations', (()=>{const h={};for(const x of db.pairs.filter(p=>['approved','closed'].includes(p.status))){const k=x.menteeId+'/'+x.mentorId;h[k]=(h[k]||0)+1;if(h[k]>1)return false}return true})());
T('only confirmed places were ever matched in the seed', db.pairs.every(x=>{const e=D.person(db,x.menteeId); return !e || !D.gateBlocked(e);}));
T('R1 has 3 missing close-offs (exception queue)', db.pairs.filter(x=>x.rotation===1&&x.status==='approved').length===3);
T('a dropout case is staged', db.people.some(p=>p.droppedOut) && db.pairs.some(x=>x.status==='rematch_needed'));
T('2 fast-forward preview mentees with 3 closed rotations', db.people.filter(p=>p.previewFastForward).every(p=>D.menteeCloseoffs(db,p.id).length===3));

console.log('— application intake: no drafts, spec validation —');
db = fresh();
let r = D.submitApplication(db,'mentee',MENTEE_OK);
T('complete mentee application → submitted + receipt email (verbatim template)', r.person && r.person.appStatus==='submitted'
  && db.emails.some(e=>e.tpl==='mentee_receipt'&&e.to===MENTEE_OK.email));
T('submitted person composes name from first + last', r.person.name==='Test Mentee');
r = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'x2@smu.example.edu', prompt2:''});
T('incomplete application creates NOTHING (no drafts — spec-confirmed)', r.person===null
  && r.missing.includes('prompt2') && !db.people.some(p=>p.email==='x2@smu.example.edu'));
r = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'x3@smu.example.edu', prompt1:Array(201).fill('word').join(' ')});
T('a 201-word prompt is rejected (hard cap at 200)', r.person===null && r.missing.includes('prompt1'));
r = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'x4@smu.example.edu', industryPrefs:[INDUSTRIES[0],INDUSTRIES[0],INDUSTRIES[1]]});
T('duplicate industry preferences are rejected (three distinct required)', r.person===null && r.missing.includes('industryPrefs'));
r = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'x5@smu.example.edu', eligibilityConfirmed:false});
T('the undergraduate eligibility checkbox is a hard gate', r.person===null && r.missing.includes('eligibilityConfirmed'));
r = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'x6@smu.example.edu', telegramConsent:'No'});
T('declining the Telegram group requires a contact preference', r.person===null && r.missing.includes('contactPref'));
/* "Other" must always carry the free text behind it — Wei Kiat, F0817-235816. */
r = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'x7@smu.example.edu',
  industryPrefs:[G.IND_OTHER, INDUSTRIES[1], INDUSTRIES[2]]});
T('choosing Other as an industry preference without the free text is rejected',
  r.person===null && r.missing.includes('industryPrefOther'));
r = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'x8@smu.example.edu',
  industryPrefs:[G.IND_OTHER, INDUSTRIES[1], INDUSTRIES[2]], industryPrefOther:'Marine biotech'});
T('choosing Other WITH the free text goes through and keeps the answer',
  r.person && r.person.industryPrefOther==='Marine biotech');
r = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'x9@smu.example.edu', heard:'Other'});
T('answering Other to "how did you hear" without the free text is rejected',
  r.person===null && r.missing.includes('heardOther'));
r = D.submitApplication(db,'mentor',{...MENTOR_OK, email:'m9@example.com', industry:G.IND_OTHER});
T('a mentor picking Other as their industry must name it',
  r.person===null && r.missing.includes('industryOther'));
T('AI is selectable as an industry on both forms', (()=>{
  const a = D.submitApplication(db,'mentor',{...MENTOR_OK, email:'ai1@example.com', industry:'Artificial Intelligence (AI)'});
  const b = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'ai2@smu.example.edu',
    industryPrefs:['Artificial Intelligence (AI)', INDUSTRIES[1], INDUSTRIES[2]]});
  return a.person && b.person && b.person.industryPrefs[0]==='Artificial Intelligence (AI)'
      && !/Other/.test(a.person.background);   // the free-text branch must not fire
})());
r = D.submitApplication(db,'mentor',MENTOR_OK);
T('complete mentor application → submitted + receipt', r.person && r.person.appStatus==='submitted'
  && db.emails.some(e=>e.tpl==='mentor_receipt'&&e.to===MENTOR_OK.email));
r = D.submitApplication(db,'mentor',{...MENTOR_OK, email:'m2@example.com', yearsExp:''});
T('non-returning mentor without screening fields is rejected', r.person===null && r.missing.includes('yearsExp'));
r = D.submitApplication(db,'mentor',{...MENTOR_OK, email:'m3@example.com', heard:FORM_OPTS.heardMentor[0], yearsExp:'', ledTeam:'', leadership:'', crossIndustry:'', priorMentoring:''});
T('returning mentor skips the screening fields (grandfathered path)', r.person && r.person.returning===true);
r = D.submitApplication(db,'mentor',{...MENTOR_OK, email:'m4@example.com', draws:[]});
T('at least one "what draws you" selection is required', r.person===null && r.missing.includes('draws'));
const first = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'dup@smu.example.edu'}).person;
const second = D.submitApplication(db,'mentee',{...MENTEE_OK, email:'DUP@smu.example.edu'}).person;
T('A3 a repeat email flags BOTH records, merging or rejecting neither',
  second.duplicateFlag && D.person(db,first.id).duplicateFlag
  && second.duplicateOf===first.id && db.people.filter(p=>p.id===first.id).length===1);
T('A3 the flag is auditable', db.audit.some(a=>a.action==='duplicate_email_flagged'));
T('no mutation ever leaves undefined field values (shared-database write safety)', (()=>{
  const d=fresh();
  // conditional form fields arrive as explicit undefined when their branch never rendered
  const r1=D.submitApplication(d,'mentee',{...MENTEE_OK, email:'safe@smu.example.edu',
    referrer:undefined, contactPref:undefined});
  const r2=D.submitApplication(d,'mentor',{...MENTOR_OK, email:'safe2@example.com',
    referrer:undefined, lastCycleEmail:undefined, contactPref:undefined, industryOther:undefined});
  const clean=o=>o && !Object.values(o).some(v=>v===undefined);
  // and the whole seed must be Firestore-safe too (deep scan)
  let deepBad=false;
  const scan=o=>{ if(o===undefined){deepBad=true;return;} if(o&&typeof o==='object') Object.values(o).forEach(scan); };
  ['people','pairs','reviews','emails','events','config'].forEach(s=>scan(d[s]));
  return clean(r1.person) && clean(r2.person) && !deepBad;
})());

console.log('— proposed scores: the reviewer confirms, never keys in (Wei Kiat F0818-004720/004811) —');
db = fresh();
const scoredKeys = k => (k==='mentor'?G.MENTOR_CRITERIA:G.MENTEE_CRITERIA).filter(c=>c.scored).map(c=>c.key);
['mentor','mentee'].forEach(kind=>{
  const who = db.people.find(p=>p.kind===kind&&p.appStatus==='submitted');
  const prop = D.proposeScores(db, who);
  T(`${kind}: every scored criterion arrives proposed, in the console's own order`,
    prop.items.length===scoredKeys(kind).length
    && prop.items.every((it,i)=>it.key===scoredKeys(kind)[i]));
  T(`${kind}: every proposal is a usable 1-5 with a reason the reviewer can check`,
    prop.items.every(it=>Number.isInteger(it.score) && it.score>=1 && it.score<=5
                      && typeof it.why==='string' && it.why.length>10));
  T(`${kind}: the average is the average of the rows`,
    prop.avg===Math.round(prop.items.reduce((a,b)=>a+b.score,0)/prop.items.length*10)/10);
});
T('proposals read the application: a stronger mentor profile does not score below a thinner one', (()=>{
  const strong = {kind:'mentor', yearsExp:'More than 15 years', ledTeam:'Yes',
    leadership:'Led a regional team of 40 across four markets for six years.',
    crossIndustry:'Yes, significantly', priorMentoring:'Yes',
    draws:G.FORM_OPTS.draws, interests:'Fintech, regional expansion, building first-time managers well.'};
  const thin = {kind:'mentor', yearsExp:'Under 5 years', ledTeam:'No', leadership:'Some.',
    crossIndustry:'Not really', priorMentoring:'No', draws:[G.FORM_OPTS.draws[0]], interests:'Tech.'};
  return D.proposeScores(db, strong).avg > D.proposeScores(db, thin).avg;
})());
T('a returning mentor is proposed from the previous cycle, and the row says so', (()=>{
  const ret = D.proposeScores(db, {kind:'mentor', returning:true});
  return ret.items.length===scoredKeys('mentor').length
      && ret.items.every(i=>i.score===4 && /[Rr]eturning mentor/.test(i.why));
})());
T('a renamed criterion still gets a row rather than an empty dropdown', (()=>{
  const saved = G.MENTEE_CRITERIA[0].key;
  G.MENTEE_CRITERIA[0].key = 'Some New Criterion';
  const out = D.proposeScores(db, db.people.find(p=>p.kind==='mentee'&&p.appStatus==='submitted'));
  G.MENTEE_CRITERIA[0].key = saved;
  return out.items[0] && out.items[0].key==='Some New Criterion' && out.items[0].score>=1;
})());

/* ai.js is browser-only (no module.exports), so evaluate it in a bare vm. Worth the trouble:
   parseScores is the seam where a model's free-form answer becomes numbers a human signs off. */
function loadAI(){
  const vm = require('vm');
  const ctx = vm.createContext({navigator:{}, console});
  // `const AI = {...}` never lands on the context object; take the script's completion value.
  return vm.runInContext(fs.readFileSync(path.join(__dirname,'..','ai.js'),'utf8')+'\n;AI;', ctx);
}
console.log('— AI score proposals: only a clean, complete answer may replace the rules —');
T('AI score parsing accepts a good answer, rejects everything doubtful', (()=>{
  const AI = loadAI(), crits = G.MENTOR_CRITERIA.filter(c=>c.scored);
  const good = JSON.stringify({scores:crits.map(c=>({key:c.key, score:4, why:'strong evidence'}))});
  const ok = AI.parseScores(good, crits);
  const fenced = AI.parseScores('```json\n'+good+'\n```', crits);          // fences are tolerated
  const partial = AI.parseScores(JSON.stringify({scores:[{key:crits[0].key,score:4,why:'x'}]}), crits);
  const outOfRange = AI.parseScores(JSON.stringify({scores:crits.map(c=>({key:c.key,score:9,why:'x'}))}), crits);
  const prose = AI.parseScores('I think this mentor is strong overall.', crits);
  return ok && ok.length===crits.length && ok.every(r=>r.score===4)
      && ok.map(r=>r.key).join('|')===crits.map(c=>c.key).join('|')       // order follows the console
      && fenced && !partial && !outOfRange && !prose
      && AI.parseScores('', crits)===null && AI.parseScores(null, crits)===null;
})());
T('the AI prompt is built from fields the R5 forms actually collect', (()=>{
  const mentee = D.person(db, db.people.find(p=>p.kind==='mentee'&&p.prompt1).id);
  const data = loadAI()._appData(mentee);
  /* The pre-R5 shape (goals / devNeeds / track) was silently feeding the model an empty
     object, so it filled the blanks itself. Every key must resolve to real data. */
  return Object.keys(data).length>=8 && data.prompt1_growthAndOwnership===mentee.prompt1
      && !('track' in data) && !('goals' in data)
      && Object.values(data).filter(v=>v===undefined).length===0;
})());

console.log('— criteria scoring + decisions issue the verbatim outcome emails —');
db = fresh();
const cand = db.people.find(p=>p.kind==='mentee'&&p.appStatus==='submitted');
const candProp = D.proposeScores(db, cand);
D.score(db, cand.id, 'Portia', 4.2, 'ok', {'Readiness to Learn':4,'Global Curiosity':5,'Values Awareness':4,'Ownership':4,'Community Mindset':4}, candProp);
T('review stores the per-criteria breakdown', db.reviews.some(v=>v.personId===cand.id&&v.criteria&&v.criteria['Global Curiosity']===5));
T('review also stores what was proposed, so the override rate is measurable',
  db.reviews.some(v=>v.personId===cand.id && v.proposed && v.proposed.items.length===5 && v.proposedBasis==='rules'));
T('a score submitted without a proposal still records cleanly (never undefined)', (()=>{
  const other = db.people.find(p=>p.kind==='mentor'&&p.appStatus==='submitted');
  D.score(db, other.id, 'Kenzie', 4, '', {'Professional Credibility':4});
  const v = db.reviews.find(x=>x.personId===other.id);
  return v.proposed===null && v.proposedBasis===null;
})());
D.decide(db, cand.id, 'accepted', 'Esther');
T('accept → status + mentee acceptance email with personal link', D.person(db,cand.id).appStatus==='accepted'
  && db.emails.some(e=>e.tpl==='mentee_accept'&&e.to===cand.email&&e.vars.link==='#/me/'+cand.id));
const mcand = db.people.find(p=>p.kind==='mentor'&&p.appStatus==='submitted');
T('a mentee cannot get the mentor decline (variant guard)', D.decide(db, db.people.find(p=>p.kind==='mentee'&&p.appStatus==='submitted').id, 'declined', 'Esther')===null);
D.decide(db, mcand.id, 'reserve_invited', 'Esther');
T('reserve decision → reserve_invited, opt-in unknown, reserve email', D.person(db,mcand.id).appStatus==='reserve_invited'
  && D.person(db,mcand.id).reserveOptIn===null && db.emails.some(e=>e.tpl==='mentor_reserve'&&e.to===mcand.email));
const e2 = db.people.find(p=>p.kind==='mentee'&&p.appStatus==='submitted');
D.decide(db, e2.id, 'declined_ineligible', 'Esther');
T('the ineligible decline sends its own honest variant', db.emails.some(e=>e.tpl==='mentee_decline_ineligible'&&e.to===e2.email));

console.log('— OTP link login (personalized link + emailed one-time code) —');
db = fresh();
const gated = db.people.find(p=>p.appStatus==='accepted'&&!D.placeConfirmed(p));
T('seed has a gate-ahead person', !!gated);
T('a wrong email is refused with a message', !!D.requestOtp(db, gated.id, 'not@theirs.com').error);
T('the application email (case-insensitive) gets a code by email', (()=>{
  const r0=D.requestOtp(db, gated.id, gated.email.toUpperCase());
  return r0.ok && /^\d{6}$/.test(gated.otp.code) && db.emails.some(e=>e.tpl==='otp_code'&&e.to===gated.email&&e.vars.code===gated.otp.code);
})());
T('a wrong code is refused; the right one verifies and audits', D.verifyOtp(db, gated.id, '000000')===false
  && D.verifyOtp(db, gated.id, gated.otp.code)===true
  && db.audit.some(a=>a.action==='link_signin'&&a.entity===gated.id));

console.log('— the acceptance gate: three items, separately timestamped, completion confirms —');
db = fresh();
const g2 = db.people.find(p=>p.appStatus==='accepted'&&!D.placeConfirmed(p));
T('gateBlocked before the gate', D.gateBlocked(g2));
D.ackRules(db, g2.id);
T('rules alone do not confirm', !D.placeConfirmed(D.person(db,g2.id)) && !g2.placeConfirmedAt);
T('a declared conflict requires details', D.submitCoi(db, g2.id, true, '  ')===null);
D.submitCoi(db, g2.id, true, 'My employer sponsors a mentee applicant.');
T('COI declaration stored with the ack timestamp', g2.coi.declared===true && /sponsors/.test(g2.coi.details) && !!g2.ack.coi);
T('an exception without a reason is refused', D.submitKickoff(db, g2.id, false, '')===null);
D.submitKickoff(db, g2.id, false, 'I am overseas that week.');
T('gate completion → place confirmed + onboarding email', !!g2.placeConfirmedAt && D.placeConfirmed(g2)
  && db.emails.some(e=>e.tpl==='onboarding'&&e.to===g2.email));
T('three timestamps are individually recorded', ['rules','coi','kickoff'].every(k=>/^\d{4}-\d{2}-\d{2}T/.test(g2.ack[k])));
T('the exception routed to the named owners (email fallback fired)', db.emails.some(e=>e.kind==='kickoff_exception'&&/Esther Koh, Wei Kiat Koh/.test(e.to)));
T('the exception sits in the open queue', D.kickoffExceptionsOpen(db).some(p=>p.id===g2.id));
D.resolveKickoffException(db, g2.id, 'waived', 'Wei Kiat');
T('resolving records outcome/by/at and notifies the participant', g2.kickoff.resolved.outcome==='waived'
  && db.emails.some(e=>e.kind==='kickoff_exception'&&e.to===g2.email));
T('gate no longer blocks matching', !D.gateBlocked(g2));
const g3 = db.people.find(p=>p.appStatus==='accepted'&&!D.placeConfirmed(p));
D.demoCompleteGate(db, g3.id);
T('demo shortcut completes all three and confirms', D.placeConfirmed(g3) && g3.kickoff.status==='confirmed');
T('kick-off logistics stores arrival + dietary (catering only)', (()=>{
  const l=D.saveKickoffLogistics(db, g3.id, 'arriving late', 'vegetarian');
  return l.arrival==='arriving late' && l.dietary==='vegetarian';
})());

console.log('— Reserve lists: reply, activation, later deadline —');
db = fresh();
const awaiting = db.people.find(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===null);
D.recordReserveReply(db, awaiting.id, true, 'Wei Kiat');
T('a reply is recorded with the date', awaiting.reserveOptIn===true && awaiting.reserveRepliedAt===db.today);
const act = db.people.find(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===true);
D.activateReserve(db, act.id, 'Esther');
T('activation → accepted + activation acceptance email with the personal link', act.appStatus==='accepted'
  && db.emails.some(e=>e.tpl===act.kind+'_reserve_activation'&&e.to===act.email));
T('an activated reserve gets the LATER deadline', D.deadlineFor(db,act)===db.config.selection.reserveAcceptBy
  && D.deadlineFor(db, db.people.find(p=>p.appStatus==='accepted'&&!p.activatedFromReserve))===db.config.selection.acceptBy);
T('activating a non-reserve person is refused', D.activateReserve(db, db.people.find(p=>p.appStatus==='accepted'&&!p.activatedFromReserve).id, 'Esther')===null);

console.log('— acceptance reminders: once each, only the unconfirmed —');
db = fresh();
const targets0 = D.reminderTargets(db);
T('targets are exactly the accepted-but-unconfirmed without a prior reminder', targets0.length>0
  && targets0.every(p=>p.appStatus==='accepted'&&!D.placeConfirmed(p)&&!p.acceptReminderAt));
const sent = D.sendAcceptanceReminders(db, 'Wei Kiat');
T('reminders sent with the verbatim template + stamped', sent.length===targets0.length
  && sent.every(p=>p.acceptReminderAt===db.today)
  && db.emails.filter(e=>e.kind==='reminder'&&e.at===db.today).length===sent.length);
T('sending twice sends nothing more (once per person, confirmed rule)', D.sendAcceptanceReminders(db,'Wei Kiat').length===0);
db = fresh();
const resAct = db.people.find(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===true);
D.activateReserve(db, resAct.id, 'Esther');
T('an activated-but-unconfirmed reserve gets the activation reminder variant', (()=>{
  const out=D.sendAcceptanceReminders(db,'Wei Kiat');
  return out.some(p=>p.id===resAct.id) && db.emails.some(e=>e.tpl===resAct.kind+'_reserve_activation_reminder'&&e.to===resAct.email);
})());

console.log('— release rule: per-person deadline, human-owned —');
db = fresh();
db.today = '2026-09-19';
T('before the deadline nobody is releasable', D.pendingWithdrawal(db).length===0 && !D.acceptDeadlinePassed(db));
db.today = '2026-09-21';
const pending = D.pendingWithdrawal(db);
T('past the accept-by date the unconfirmed are listed', D.acceptDeadlinePassed(db) && pending.length>0
  && pending.every(p=>!D.placeConfirmed(p)));
const resAct2 = db.people.find(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===true);
D.activateReserve(db, resAct2.id, 'Esther');
T('an activated reserve is NOT releasable before 29 Sept', !D.pendingWithdrawal(db).some(p=>p.id===resAct2.id));
db.today = '2026-09-30';
T('past 29 Sept the activated reserve becomes releasable too', D.pendingWithdrawal(db).some(p=>p.id===resAct2.id));
const released = D.withdrawUnacknowledged(db, 'Wei Kiat');
T('releasing sets withdrawn, notifies, and logs', released.length>0
  && released.every(p=>p.appStatus==='withdrawn')
  && db.emails.some(e=>e.kind==='withdrawn')
  && db.audit.some(a=>a.action==='withdrawn_place_not_confirmed'));
T('running it twice releases nothing more', D.withdrawUnacknowledged(db,'Wei Kiat').length===0);

console.log('— matching engine: industry preference → breadth → diversity —');
db = fresh();
const sugg = D.suggestMatches(db, 2);
T('suggestions produced for unmatched confirmed mentees', sugg.length>0);
T('suggestions are proposed (not auto-approved)', sugg.every(s=>s.status==='proposed'));
T('suggestions never breach capacity', sugg.every(s=>D.capacityLeft(db,s.mentorId,2)>=0));
T('suggestions never repeat a past mentor', sugg.every(s=>db.pairs.filter(x=>x!==s&&x.menteeId===s.menteeId&&x.mentorId===s.mentorId&&['approved','closed'].includes(x.status)).length===0));
T('unconfirmed places are excluded from suggestions', sugg.every(s=>!D.gateBlocked(D.person(db,s.menteeId))));
T('every suggestion records its rank and pool size', sugg.every(s=>typeof s.score==='number' && s.rankedOutOf>0));
T('the first proposal picks the argmax of its eligible pool', (()=>{
  const d2=fresh();
  const e=d2.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'
    && !D.gateBlocked(p) && !d2.pairs.some(x=>x.rotation===2&&x.menteeId===p.id&&['proposed','approved','closed'].includes(x.status)));
  const cands=d2.people.filter(m=>m.kind==='mentor'&&m.appStatus==='accepted'&&!m.droppedOut
    && D.capacityLeft(d2,m.id,2)>0 && !D.repeatMentor(d2,e.id,m.id));
  const want=D.rankMentors(d2,cands,e)[0].m.id;
  const got=D.suggestMatches(d2,2).find(s=>s.menteeId===e.id);
  return got && got.mentorId===want;
})());
T('a first-preference industry strictly outranks second, second outranks third', (()=>{
  const e=db.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&(p.industryPrefs||[]).length===3);
  const any=db.people.find(m=>m.kind==='mentor'&&m.appStatus==='accepted');
  const at=i=>D.matchScore(db, Object.assign({},any,{id:any.id+i,industry:e.industryPrefs[i]}), e).score;
  const off=D.matchScore(db, Object.assign({},any,{id:any.id+'X',industry:INDUSTRIES.find(x=>!e.industryPrefs.includes(x))}), e).score;
  return at(0)>at(1) && at(1)>at(2) && at(2)>off
    && D.matchScore(db, Object.assign({},any,{id:any.id+'0',industry:e.industryPrefs[0]}), e).reasons.some(r=>/First-preference industry/.test(r));
})());
T('significant cross-industry breadth is scored, not just stored', (()=>{
  const e=db.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted');
  const m=db.people.find(x=>x.kind==='mentor'&&x.crossIndustry==='Yes, significantly');
  if(!m) return false;
  const without=Object.assign({},m,{id:m.id+'X',crossIndustry:'Somewhat'});
  return D.matchScore(db,m,e).score > D.matchScore(db,without,e).score
     && D.matchScore(db,m,e).reasons.some(r=>/Breadth/.test(r));
})());
T('rationale quotes the reason it scored + the ranking line', sugg.every(s=>
  s.rationale.length>=2 && /Ranked 1st of \d+ eligible mentors \(industry preference → breadth → diversity\)/.test(s.rationale[s.rationale.length-1])));
T('a proposal does not cost its own mentor the diversity credit', sugg.every(s=>{
  const e=D.person(db,s.menteeId), m=D.person(db,s.mentorId);
  return D.matchScore(db,m,e).score >= s.score - 0.5 - 0.001;
}));
const alts = D.alternativesFor(db, sugg[0].id, 3);
T('alternatives offered for a proposal, ranked best first', alts.length>0 && alts.every(a=>a.m.id!==sugg[0].mentorId)
  && alts.every((a,i)=>i===0||alts[i-1].score>=a.score));
const swapped = D.reassignProposal(db, sugg[0].id, alts[0].m.id, 'Esther');
T('swap replaces the mentor and re-explains the choice',
  swapped && swapped.mentorId===alts[0].m.id && /Chosen by Esther/.test(swapped.rationale.join(' ')));
T('swap is refused when it would breach no-repeat or capacity',
  D.reassignProposal(db, sugg[0].id, sugg[0].menteeId, 'Esther')===null);
const doomed = sugg[1];
const menteeOfDoomed = doomed.menteeId;
T('discard removes the proposal and frees the mentee',
  !!D.discardProposal(db, doomed.id, 'Esther')
  && !db.pairs.some(p=>p.id===doomed.id)
  && !db.pairs.some(p=>p.menteeId===menteeOfDoomed&&p.rotation===2&&p.status==='proposed'));
T('discarding twice is a no-op, not a crash', D.discardProposal(db, doomed.id, 'Esther')===null);
T('a discarded mentee can be suggested again',
  D.suggestMatches(db,2).some(s=>s.menteeId===menteeOfDoomed));
D.approvePair(db, sugg[0].id, 'Esther');
T('approval flips status + notifies both', db.pairs.find(x=>x.id===sugg[0].id).status==='approved' && db.emails.some(e=>e.kind==='match'&&e.at===db.today));

console.log('— audit discipline —');
T('I3 every audit entry carries a real timestamp', (()=>{
  const d=fresh();
  D.decide(d,d.people.find(p=>p.appStatus==='submitted').id,'accepted','Esther');
  D.setToday(d,'2027-02-01');
  D.ackRules(d,d.people[0].id);
  return d.audit.length>0 && d.audit.every(a=>typeof a.ts==='string' && !isNaN(Date.parse(a.ts)));
})());
T('I3 no source file writes db.audit directly — every write goes through logAudit', (()=>{
  const root=path.join(__dirname,'..');
  return ['data.js','app.js','views_console.js','views_public.js','platform/server.gs']
    .every(f=>{
      const src=fs.readFileSync(path.join(root,f),'utf8');
      return !/audit\.push\((?!\{\s*at,\s*ts:)/.test(src);
    });
})());

console.log('— rotation guides (F1) —');
db = fresh();
const r3start = db.config.rotations.find(r=>r.n===3).start;
const beforeGuides = db.emails.filter(e=>e.kind==='guide').length;
D.setToday(db, r3start);
const afterGuides = db.emails.filter(e=>e.kind==='guide').length;
T('F1 crossing a rotation start releases the guide to that rotation\'s pairs',
  afterGuides > beforeGuides && db.audit.some(a=>/rotation_guide_released:R3/.test(a.action)));
D.setToday(db, r3start);
T('F1 releasing is idempotent — the same rotation never sends twice',
  db.emails.filter(e=>e.kind==='guide').length === afterGuides);
const lateSugg = D.suggestMatches(db, 3);
T('F1 a pair approved after its rotation started still gets the guide', (()=>{
  if(!lateSugg.length) return false;
  const before = db.emails.filter(e=>e.kind==='guide').length;
  D.approvePair(db, lateSugg[0].id, 'Esther');
  return db.emails.filter(e=>e.kind==='guide').length === before+1;
})());

console.log('— no hardcoded cohort facts in the views —');
T('view files carry no year / institution / count / month literals', (()=>{
  const root=path.join(__dirname,'..');
  const banned=[/\b20\d\d\b/, /\bSMU\b/, /\b60\b/,
    /\b(February|April|June|July|August|September|October|November|December)\b/,
    /\b(Sept|Oct|Nov|Dec|Feb|Jan|Mar)\b/, /\bJanuary\b/, /\bMarch\b/];
  return ['views_public.js','views_console.js','app.js'].every(f=>{
    const src=fs.readFileSync(path.join(root,f),'utf8');
    const hit=banned.find(re=>re.test(src));
    if(hit) console.log(`    LEAK in ${f}:`, (src.match(hit)||[])[0], 'line', src.split('\n').findIndex(l=>hit.test(l))+1);
    return !hit;
  });
})());
T('cohortFacts derives a different cycle end-to-end', (()=>{
  const d2=fresh();
  const F1=D.cohortFacts(d2);
  D.startNewCycle(d2,{label:'GRMP 2031 (NTU pilot)',today:'2031-09-01',actor:'Esther',
    rotations:[{n:1,label:'Know Yourself',start:'2031-10-01',end:'2031-11-30'},
               {n:2,label:'Know Your World',start:'2031-12-01',end:'2032-01-31'},
               {n:3,label:'Know Your Path',start:'2032-02-01',end:'2032-03-31'}]});
  const F2=D.cohortFacts(d2);
  return F1.inst==='SMU' && F2.inst==='NTU' && /2031/.test(F2.spanLong)
    && F2.mentees===0 && F2.label==='GRMP 2031 (NTU pilot)'
    && F2.acceptBy==='2031-09-20'            // selection timeline shifted with the cycle
    && !D.acceptDeadlinePassed(d2);
})());

console.log('— close-off & certificate rule (Owner decision F0806-172216) —');
db = fresh();
const pvReady = db.people.find(p=>p.previewFastForward && db.builderReflections.some(b=>b.menteeId===p.id));
const pv = db.people.find(p=>p.previewFastForward && !db.builderReflections.some(b=>b.menteeId===p.id));
T('seed ships sample submissions (mentor mid-reviews + mentee mid-reviews + end-evals + one BC)',
  db.midreviews.length>=2 && db.menteeMidReviews.length===2 && db.endEvaluations.length>=2 && db.builderReflections.length===1);
T('full-set preview mentee is Ready on day one', !!pvReady && D.certEligible(db,pvReady) && D.certMissing(db,pvReady).length===0);
T('preview mentee #2 misses exactly end-eval + BC', (()=>{const m=D.certMissing(db,pv);
  return m.length===2 && m.some(x=>/end-prog/.test(x)) && m.some(x=>/Builder/.test(x));})());
D.submitBuilderReflection(db, pv.id, 'I will mentor juniors in my CCA.');
T('BC alone does not qualify — end-prog evaluation still missing', !D.certEligible(db,pv) && D.certMissing(db,pv).join()==='end-prog evaluation (R3 close-off)');
db.endEvaluations.push({personId:pv.id, kind:'mentee', text:'Great programme.', at:db.today});
T('eligible once all four criteria are in', D.certEligible(db,pv));
let issued = D.issueCertificates(db,'Esther');
T('certificate issued exactly for eligible people', issued.some(p=>p.id===pv.id) && db.certificates.some(c=>c.personId===pv.id));
issued = D.issueCertificates(db,'Esther');
T('idempotent — no double issuance', !issued.some(p=>p.id===pv.id));
const someMentor = db.pairs.find(x=>x.rotation===2&&x.status==='approved') && D.person(db, db.pairs.find(x=>x.rotation===2&&x.status==='approved').mentorId);
T('mentor not eligible without both checkpoints', !D.certEligible(db,someMentor) && D.certMissing(db,someMentor).length===2);
D.submitMidReview(db, someMentor.id, 'Going well.');
T('mid-review alone: end-prog evaluation still missing', !D.certEligible(db,someMentor) && D.certMissing(db,someMentor).join()==='end-prog evaluation');
D.submitEndEvaluation(db, someMentor.id, 'Would gladly serve again.');
T('mentor eligible after mid-review + end evaluation', D.certEligible(db,someMentor));

console.log('— close-off carries the R2/R3 artefacts (F0806-173822) —');
db = fresh();
const r2pair = db.pairs.find(x=>x.rotation===2 && x.status==='approved' && !db.people.find(q=>q.id===x.menteeId).previewFastForward);
D.closeoff(db, r2pair.id, true, true, 'good rotation', 'Halfway check: learning a lot.');
T('R2 close-off stores the mentee mid-prog review', db.menteeMidReviews.some(m=>m.menteeId===r2pair.menteeId && /Halfway/.test(m.text)));
const r3pair = {id:'PRX', menteeId:r2pair.menteeId, mentorId:'whoever', rotation:3, status:'approved'};
db.pairs.push(r3pair);
D.closeoff(db, 'PRX', true, true, '', 'End evaluation: transformed how I network.');
T('R3 close-off stores the end-prog evaluation', db.endEvaluations.some(e=>e.personId===r2pair.menteeId && /transformed/.test(e.text)));

console.log('— approve by exception (F0806-232836) —');
db = fresh();
const exMentee = db.people.find(p=>p.previewFastForward && !db.builderReflections.some(b=>b.menteeId===p.id));
T('no reason → refused', D.approveByException(db, exMentee.id, '   ', 'Esther')===null && !db.certificates.some(c=>c.personId===exMentee.id));
const fullOK = db.people.find(p=>p.previewFastForward && db.builderReflections.some(b=>b.menteeId===p.id));
T('fully-eligible person → refused (nothing exceptional)', D.approveByException(db, fullOK.id, 'reason', 'Esther')===null);
const exc = D.approveByException(db, exMentee.id, 'Overseas exchange in March; evaluated verbally with the Lead.', 'Esther');
T('exception approval records by/reason/missing + audit + email', !!exc && exc.byException.by==='Esther'
  && exc.byException.missing.length===2
  && db.audit.some(a=>a.action.startsWith('certificate_by_exception') && a.entity===exMentee.id && a.actor==='Esther')
  && db.emails.some(e=>/by exception/.test(e.subject||'')));
T('already certified → second exception refused', D.approveByException(db, exMentee.id, 'again', 'Esther')===null);

console.log('— dropout replacement from the Reserve Mentor list —');
db = fresh();
const broken = db.pairs.find(x=>x.status==='rematch_needed');
const reserveMentor = db.people.find(p=>p.kind==='mentor'&&p.appStatus==='reserve_invited'&&p.reserveOptIn===true);
const np = D.replaceMentor(db, broken.id, reserveMentor.id, 'Wei Kiat');
T('old pair marked replaced', db.pairs.find(x=>x.id===broken.id).status==='replaced');
T('the reserve mentor is ACTIVATED (accepted + activation email), then paired', reserveMentor.appStatus==='accepted'
  && db.emails.some(e=>e.tpl==='mentor_reserve_activation'&&e.to===reserveMentor.email)
  && np.status==='approved' && np.mentorId===reserveMentor.id && np.menteeId===broken.menteeId);
T('mentee hand-over email queued', db.emails.some(e=>e.kind==='match'&&e.subject&&e.subject.includes('new mentor')));

console.log('— cohort model, accounts & new-cycle —');
db = fresh();
T('11 preset accounts, all resolvable', db.config.accounts.length===11 &&
  db.config.accounts.filter(a=>a.kind==='person').every(a=>db.people.some(p=>p.id===a.personId)) &&
  db.config.accounts.filter(a=>a.kind==='admin').every(a=>db.config.admins.some(x=>x.name===a.name)));
T('the mentor.bench persona maps to an opted-in Reserve mentor', (()=>{
  const a=db.config.accounts.find(x=>x.u==='mentor.bench');
  const p=D.person(db,a.personId);
  return p.appStatus==='reserve_invited' && p.reserveOptIn===true;
})());
T('cohort C2026 active, no archives', db.config.cohort.id==='C2026' && db.archives.length===0);
const beforeMentors = db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='accepted').length;
const newId = D.startNewCycle(db, {label:'GRMP 2027 (SMU)', today:'2027-09-01', actor:'Esther',
  rotations:[{n:1,label:'Know Yourself',start:'2027-10-01',end:'2027-11-30'},
             {n:2,label:'Know Your World',start:'2027-12-01',end:'2028-01-31'},
             {n:3,label:'Know Your Path',start:'2028-02-01',end:'2028-03-31'}]});
T('new cycle id derived from dates', newId==='C2027' && db.config.cohort.id==='C2027');
T('old cycle archived with stats', db.archives.length===1 && db.archives[0].id==='C2026' && db.archives[0].stats.mentees===60);
T('mentors carried over as invited, gate state cleared', db.people.length===beforeMentors &&
  db.people.every(p=>p.kind==='mentor'&&p.appStatus==='invited'&&!p.ack&&!p.coi&&!p.kickoff&&!p.placeConfirmedAt));
T('pairs/reviews/certs cleared', db.pairs.length===0 && db.reviews.length===0 && db.certificates.length===0);
T('rotations + selection dates shifted into the new cycle', db.config.rotations[0].start==='2027-10-01' && db.today==='2027-09-01'
  && db.config.selection.acceptBy==='2027-09-20' && db.config.selection.reserveAcceptBy==='2027-09-29');
const inv = db.people[0];
T('confirmReturn flips invited→accepted + email', D.confirmReturn(db, inv.id)===true &&
  D.person(db,inv.id).appStatus==='accepted' && db.emails.some(e=>e.subject&&e.subject.includes('Welcome back')));
T('returning mentor re-blocked by the gate until they complete it again', D.gateBlocked(D.person(db,inv.id)));
D.demoCompleteGate(db, inv.id);
T('gate clears after re-onboarding', !D.gateBlocked(D.person(db,inv.id)));

console.log('— briefing recordings: configurable resource, not a gate —');
db = fresh();
T('seed ships without links', db.config.orientationVideo==='' && db.config.orientationVideoMentor==='');
const savedUrls = D.setOrientationVideos(db, '  https://youtu.be/grmp-mentees  ', 'https://youtu.be/grmp-mentors', 'Wei Kiat');
T('links saved trimmed + audited', savedUrls.mentee==='https://youtu.be/grmp-mentees'
  && savedUrls.mentor==='https://youtu.be/grmp-mentors'
  && db.audit.some(a=>a.action==='orientation_videos_set'));
const aMentor = db.people.find(p=>p.kind==='mentor');
const aMentee = db.people.find(p=>p.kind==='mentee');
T('each kind opens its own briefing', D.orientationVideoFor(db,aMentor)==='https://youtu.be/grmp-mentors'
  && D.orientationVideoFor(db,aMentee)==='https://youtu.be/grmp-mentees');
D.setOrientationVideos(db, 'https://youtu.be/grmp-shared', '', 'Wei Kiat');
T('empty mentor slot falls back to the shared briefing', D.orientationVideoFor(db,aMentor)==='https://youtu.be/grmp-shared');
T('the recording never blocks anyone (no gate involvement)', (()=>{
  const p = db.people.find(x=>x.appStatus==='accepted'&&D.placeConfirmed(x));
  return !D.gateBlocked(p);
})());

/* ================= VERBATIM GUARD =================
   The legal text and email copy shipped in data.js must match Joanne's specs
   EXACTLY. Where the spec .md files are present locally, the legal blocks are
   diffed wholesale (normalised for markdown/quote style); the email set is
   spot-checked against embedded expected strings either way. */
console.log('— verbatim guard: subjects + signature rules on all templates —');
db = fresh();
const CF = D.cohortFacts(db);
const rm = tpl => D.renderMail(db, {tpl, vars:{name:'[Name]', link:'[personalized link]', code:'123456'}});
const SUBJECTS = {
  mentor_invite:'Shape a Global-Ready Leader as an SMU–SMC GRMP Mentor',
  mentee_invite:'An Invitation to Grow: Join the SMU–SMC Global-Ready Mentoring Programme',
  mentor_receipt:'We have received your GRMP mentor application',
  mentee_receipt:'We have received your GRMP mentee application',
  mentor_accept:'Welcome as an SMU–SMC GRMP mentor',
  mentee_accept:'Welcome to the SMU–SMC Global-Ready Mentoring Programme',
  mentor_accept_reminder:'A reminder to confirm your place as a GRMP mentor',
  mentee_accept_reminder:'A reminder to confirm your place in GRMP',
  mentor_reserve:'Your GRMP mentor application: an update',
  mentee_reserve:'Your GRMP mentee application: an update',
  mentor_reserve_activation:'A place has opened, welcome as an SMU–SMC GRMP mentor',
  mentee_reserve_activation:'A place has opened, welcome to the SMU–SMC GRMP',
  mentor_reserve_activation_reminder:'A reminder to confirm your place as a GRMP mentor',
  mentee_reserve_activation_reminder:'A reminder to confirm your place in GRMP',
  mentor_decline:'Your GRMP mentor application',
  mentee_decline_not_selected:'Your GRMP mentee application',
  mentee_decline_ineligible:'Your GRMP mentee application',
};
T('all 17 participant templates exist (+ otp/onboarding operational)', Object.keys(SUBJECTS).every(k=>MAILS[k]) && MAILS.otp_code && MAILS.onboarding);
Object.entries(SUBJECTS).forEach(([k,subj])=>{
  T(`subject verbatim · ${k}`, rm(k).subject===subj);
});
/* Deadline dates inside these fragments come from config, not from the template text: the
   accept-by moved 26 Sept -> 20 Sept in R6 (later pre-login spec, confirmed; Esther asked for
   the same in F0816-152143), so the sentence stays verbatim while the date follows the cycle. */
const BODY_SPOT = {
  mentor_accept:['We are delighted to let you know that your application to mentor with the SMU–SMC Global-Ready Mentoring Programme (GRMP) is successful. Thank you for the care you put into your application, and welcome.',
    'Please complete this by 20 September 2026.'],
  mentee_accept:['and to confirm your attendance at the Kick-Off. This confirms your place.',
    'The GRMP portal is the one place to track your GRMP participation and your wider SMC journey, and you will use it throughout the programme.'],
  mentor_accept_reminder:['If you did not receive the verification code, please check your spam or junk folder, or email us at smu.smc@sa.smu.edu.sg and we will help.',
    'we would be grateful if you could let us know, so that we may offer your place to another mentor.'],
  mentee_accept_reminder:['Places in this cycle are limited. If your circumstances have changed and you are no longer able to take part, we would be grateful if you could let us know, so that we may offer your place to another student.'],
  mentor_reserve:['we will give you at least two weeks’ notice, along with the materials you need to begin well.',
    'a place on the Reserve Mentor list is not a guarantee of participation this cycle.',
    'Please let us know by 20 September 2026 whether you are happy to be placed on the Reserve Mentor list.'],
  mentee_reserve:['a place on the Reserve Mentee list is not a guarantee of participation this cycle.'],
  mentor_reserve_activation:['As this is a later activation, please complete this by 29 September 2026 so that we can prepare you for the Kick-Off on 1 October 2026.'],
  mentee_reserve_activation:['Please complete this by 29 September 2026 so that we can prepare you for the Kick-Off on 1 October 2026.'],
  mentor_decline:['The response to this cycle was exceptional, with many more applications than the places available. After careful consideration, we are not able to offer you a mentoring place this programme cycle.',
    'This reflects the strength of the pool rather than any shortcoming in your application'],
  mentee_decline_not_selected:['After careful consideration, we are not able to offer you a place this programme cycle.'],
  mentee_decline_ineligible:['The GRMP mentee programme this cycle is open to current SMU undergraduates, and from your application we are not able to offer you a place on this occasion. We are sorry to pass on news that is not what you hoped for.'],
  mentor_invite:['The distance between your world and a student’s is precisely what makes your experience worth sharing.',
    'Expand your network as part of a global community of 5,000+ SMC members across 35 countries.'],
  mentee_invite:['The people who shape us are often the ones who see the world differently from us.',
    'Understand yourself first: your interests, strengths and values, before turning to careers and choices.'],
  mentor_receipt:['We will review applications from across the cohort and be in touch by 18 September 2026 with the next steps. If you are confirmed as a mentor, that message will include your onboarding details.'],
  mentee_receipt:['Places are limited, and we read every application with care.'],
};
Object.entries(BODY_SPOT).forEach(([k,frags])=>{
  const body = rm(k).body;
  T(`body verbatim spot-check · ${k}`, frags.every(f=>body.includes(f)));
});
T('the 4-step acceptance instructions appear in every accept/reminder/activation email', ['mentor_accept','mentee_accept','mentor_accept_reminder','mentee_accept_reminder','mentor_reserve_activation','mentee_reserve_activation'].every(k=>{
  const b=rm(k).body;
  return b.includes('1. Open your personalized link:') && b.includes('2. Enter the email address you used in your application.')
    && b.includes('3. We will send a one-time verification code to that email. Enter the code to log in.');
}));
T('dual-signed emails carry BOTH signatories, stacked with titles', ['mentor_invite','mentor_accept','mentor_reserve','mentor_decline','mentee_accept','mentee_reserve_activation'].every(k=>{
  const b=rm(k).body;
  return b.includes('Esther Koh\nChief, SMC HR & Transformation') && b.includes('Wei Kiat Koh\nVice President External, SMU–SMC\nGRMP Programme Lead');
}));
T('operational chase-ups are signed by Wei Kiat Koh ONLY', ['mentor_receipt','mentee_receipt','mentor_accept_reminder','mentee_accept_reminder','mentor_reserve_activation_reminder','mentee_reserve_activation_reminder'].every(k=>{
  const b=rm(k).body;
  return !b.includes('Esther Koh') && b.includes('Wei Kiat Koh\nVice President External, SMU–SMC\nGRMP Programme Lead');
}));
T('sender identity: From SMC GRMP Team, reply-to smu.smc@sa.smu.edu.sg on every template', Object.keys(SUBJECTS).every(k=>{
  const m=rm(k); return m.from==='SMC GRMP Team' && m.replyTo==='smu.smc@sa.smu.edu.sg';
}));
T('no em dashes in any participant-facing email (house style)', Object.keys(SUBJECTS).every(k=>!rm(k).body.includes('—')&&!rm(k).subject.includes('—')));
T('no template leaks ${ / undefined / NaN', Object.keys(MAILS).every(k=>{
  const m=rm(k); const s=m.subject+m.body;
  return !/\$\{|undefined|\bNaN\b/.test(s);
}));

console.log('— verbatim guard: legal blocks diffed against the spec files (when present) —');
const SPECS_DIR = path.join(__dirname, '..', '..', 'specs_joanne', 'Mentor & Mentee Application Workflow Content');
/* PDPA moved to its own R7 file on 18 Aug: Joanne revised the text (AI/service-provider paragraph
   + "will not otherwise share") in a separate doc, so the block inside the R5 application specs is
   superseded and must NOT be the thing we diff against. */
const PDPA_DIR = path.join(__dirname, '..', '..', 'specs_joanne_r7');
if(fs.existsSync(SPECS_DIR) && fs.existsSync(PDPA_DIR)){
  const norm = s => String(s).replace(/\*\*/g,'').replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
  const blockFrom = (dir, file, startMarker, endMarker) => {
    const txt = fs.readFileSync(path.join(dir,file),'utf8');
    const i = txt.indexOf(startMarker); const j = txt.indexOf(endMarker, i);
    return norm(txt.slice(i,j).split('\n').map(l=>l.replace(/^>\s?/,'')).filter(l=>l.trim()).join(' '));
  };
  const specBlock = (file, startMarker, endMarker) => blockFrom(SPECS_DIR, file, startMarker, endMarker);
  T('PDPA wording matches Joanne’s 18 Aug revised text verbatim',
    blockFrom(PDPA_DIR,'GRMP_PDPA_Consent_Revised.md','> **GRMP PDPA Consent and Acknowledgement**','> ☐')
    === norm([COPY.pdpaTitle,...COPY.pdpaBody].join(' ')));
  T('the superseded R5 PDPA block is no longer what we ship (the revision really landed)',
    specBlock('GRMP_Mentor_Application_Spec.md','> **GRMP PDPA Consent and Acknowledgement**','> ☐')
    !== norm([COPY.pdpaTitle,...COPY.pdpaBody].join(' ')));
  T('both revised sentences are live: AI/service-provider paragraph and the "otherwise" carve-out',
    COPY.pdpaBody.some(l=>l.includes('technology service providers, including AI assisted tools'))
    && COPY.pdpaBody.some(l=>l.startsWith('SMC will not otherwise share your personal data')));
  T('mentor Programme Rules match the post-selection spec verbatim',
    specBlock('GRMP_Mentor_PostSelection_Spec.md','> **GRMP Programme Rules Acknowledgement**','- Acknowledgement:')
    === norm([COPY.rulesTitleMentor,...COPY.rulesMentor].join(' ')));
  T('mentee Programme Rules match the post-selection spec verbatim',
    specBlock('GRMP_Mentee_PostSelection_Spec.md','> **GRMP Programme Rules Acknowledgement (mentee)**','- Acknowledgement:')
    === norm(['GRMP Programme Rules Acknowledgement (mentee)',...COPY.rulesMentee].join(' ')));
  T('mentor COI matches the post-selection spec verbatim',
    specBlock('GRMP_Mentor_PostSelection_Spec.md','> **GRMP Conflict of Interest Declaration**','- **(i) Selection')
    === norm([COPY.coiTitleMentor,...COPY.coiMentor].join(' ')));
  T('mentee COI matches the post-selection spec verbatim',
    specBlock('GRMP_Mentee_PostSelection_Spec.md','> **GRMP Conflict of Interest Declaration (mentee)**','- **(i) Selection')
    === norm(['GRMP Conflict of Interest Declaration (mentee)',...COPY.coiMentee].join(' ')));
} else {
  console.log('  (spec .md files not present in this clone — wholesale diff skipped; embedded checks above still ran)');
}
/* ---- promise-vs-capability guards -------------------------------------------------
   Joanne found us offering mentors a Telegram option while the form never collects a
   Telegram handle: a promise the build could not keep. That is a CLASS, not one bug, so
   the sweep for its siblings is nailed down here rather than repeated by hand. Two shapes:
   (1) we ask for something and no one can ever read it back;
   (2) participant-facing copy claims a narrower audience than the roles actually allow. */
console.log('— promise vs capability: nothing collected into a hole, no copy narrower than the roles —');
/* Half-fixing is its own failure mode: the Telegram option was corrected while the answer
   people gave it still went nowhere useful. A preferred contact method is asked once per
   person and used once per cohort, so "readable" has to mean a list, with the matching
   detail already on it — not twenty individual pages the team has to open one at a time. */
T('the channel roster lists everyone outside the group, with the detail their own preference points at', (()=>{
  const R = D.channelRoster(db);
  const accM = db.people.filter(p=>p.kind==='mentor' && p.appStatus==='accepted');
  const accE = db.people.filter(p=>p.kind==='mentee' && p.appStatus==='accepted');
  const shapeOK = R.mentors.channel==='WhatsApp' && R.mentees.channel==='Telegram'
    && R.mentors.total===accM.length && R.mentees.total===accE.length
    && R.mentors.joined + R.mentors.out.length === R.mentors.total
    && R.mentees.joined + R.mentees.out.length === R.mentees.total;
  const optedOut = [...R.mentors.out, ...R.mentees.out];
  // exactly the people who said No, nobody else
  const rightPeople = optedOut.length === db.people.filter(p=>p.appStatus==='accepted'
      && (p.whatsappConsent==='No' || p.telegramConsent==='No')).length;
  // a phone preference must hand over a phone number, anything else an email
  const detailMatchesPref = optedOut.every(o=>{
    const p = D.person(db, o.id);
    return /phone|call/i.test(o.pref) ? o.detail === (p.phone||p.mobile) : o.detail === p.email;
  });
  return shapeOK && rightPeople && detailMatchesPref && optedOut.every(o=>!!o.detail);
})());
T('nobody is offered a channel the form never collects a handle for', (()=>{
  // The original bug, pinned: every stored contact preference must be one we can actually act on.
  const REACHABLE = ['Email','Phone','Phone call'];
  return db.people.filter(p=>p.contactPref).every(p=>REACHABLE.includes(p.contactPref));
})());
T('every field the application collects is readable by someone (no data black holes)', (()=>{
  const root = path.join(__dirname,'..');
  const pub = fs.readFileSync(path.join(root,'views_public.js'),'utf8');
  const surfaces = pub + fs.readFileSync(path.join(root,'views_console.js'),'utf8')
                       + fs.readFileSync(path.join(root,'ai.js'),'utf8');
  const collected = [...new Set([...pub.matchAll(/id="af-([a-zA-Z0-9]+)"/g)].map(m=>m[1]))];
  // Collection reads form state (S.d.x / d.x); display reads a stored record (p.x / other.x).
  const shown = f => new RegExp('\\b(?:p|other|x|person)\\.' + f + '\\b').test(surfaces);
  // Anything here must carry the reason it is invisible, in words, or it does not belong here.
  const NOT_SHOWN_ON_PURPOSE = {
    lastName: 'composed into p.name, which every surface renders',
    firstName: 'composed into p.name; also greeted by p.firstName on the personal page',
    pdpa: 'the tick only gates submission — what a human needs to see is p.pdpaAt, on the team card',
  };
  const holes = collected.filter(f => !NOT_SHOWN_ON_PURPOSE[f] && !shown(f));
  if(holes.length) console.log('    collected but shown to nobody: ' + holes.join(', '));
  return holes.length === 0;
})());
/* the matching guard — concern-page copy vs the escalation role — needs a rendered page,
   so it lives in render_smoke.js next to the other view assertions. */

T('gate checkbox labels are the approved exact strings',
  COPY.rulesTick==='I have read and understood the GRMP Programme Rules and agree to follow them throughout my participation in GRMP. I also acknowledge the principles set out in the SMC Charter.'
  && COPY.coiTick==='I confirm that this declaration is accurate to the best of my knowledge and that I will inform SMC promptly if an actual or potential conflict of interest arises during my participation in GRMP.'
  && COPY.coiNone==='I have NO actual or potential conflict of interest to declare.'
  && COPY.pdpaTick==='I have read and understood the above. I consent to SMC collecting and using my personal data as described and agree to protect and appropriately handle the personal data of other GRMP participants.');
T('spec error strings are exact', COPY.rulesTickErr==='Please confirm you have read and agree to the Programme Rules.'
  && COPY.coiSelectErr==='Please select one option.'
  && COPY.coiTickErr==='Please confirm your declaration to proceed.'
  && COPY.kickoffReasonErr==='Please provide a reason so we can discuss an exception with you.'
  && COPY.eligibilityTick==='I confirm I am a current SMU undergraduate.'
  && COPY.smuEmailSoftWarn==='This does not look like an SMU student email. Please check before continuing.');
T('the two mentee prompts are the spec’s exact questions',
  COPY.menteePrompt1==='Six months from now, what do you hope will have changed in you? Tell us what you would most like to grow, and share a moment when you took real ownership of your own development, at work, in your studies, or in life.'
  && COPY.menteePrompt2==='We are drawn to people who are curious about the world beyond their own field. What pulls your attention, and how would you want to show up for the people around you in this community?');
/* The spec's 17 options, plus Artificial Intelligence added on Wei Kiat's request
   (F0818-001327 / F0817-235816). Asserted by value, not by index: the list grows. */
const SPEC_INDUSTRIES = ['Accounting, Audit & Tax','Consulting & Professional Services',
  'Banking, Finance & Insurance','Legal','Technology, Media & Telecommunications (TMT)',
  'Consumer Goods & Retail (incl. FMCG)','Manufacturing & Industrials',
  'Energy, Utilities & Resources','Real Estate, Construction & Infrastructure',
  'Transport, Logistics & Supply Chain','Healthcare, Pharmaceuticals & Life Sciences',
  'Education & Research','Government, Public Sector & Non-Profit',
  'Media, Arts, Creative & Entertainment','Hospitality, Travel & F&B','Sustainability & ESG','Other'];
T('industry list keeps all 17 spec options, in the spec’s relative order',
  SPEC_INDUSTRIES.every(o=>INDUSTRIES.includes(o))
  && SPEC_INDUSTRIES.map(o=>INDUSTRIES.indexOf(o)).every((v,i,a)=>i===0||v>a[i-1]));
T('AI is on the list (Wei Kiat) and Other is still last',
  INDUSTRIES.includes('Artificial Intelligence (AI)')
  && INDUSTRIES[INDUSTRIES.length-1]==='Other' && INDUSTRIES.length===SPEC_INDUSTRIES.length+1);
T('nothing reads the industry list by hard-coded index (the list grows)', (()=>{
  const root=path.join(__dirname,'..');
  return ['data.js','views_public.js','views_console.js','app.js']
    .every(f=>!/INDUSTRIES\s*\[\s*\d+\s*\]/.test(fs.readFileSync(path.join(root,f),'utf8')));
})());
T('faculty list is the 7 verified schools, no Other', FACULTIES.length===7
  && FACULTIES.includes('Yong Pung How School of Law') && FACULTIES.includes('College of Integrative Studies')
  && !FACULTIES.includes('Other'));
T('selection timeline constants match the standards note',
  db.config.registration.closes==='2026-09-10' && db.config.selection.approvalsBy==='2026-09-16'
  && db.config.selection.outcomeBy==='2026-09-18' && db.config.selection.acceptBy==='2026-09-20'
  && db.config.selection.reserveAcceptBy==='2026-09-29'
  && db.events.kickoff.date==='2026-10-01' && db.events.kickoff.venue==='SMU ALCove, 80 Stamford Road, #B1-62, Singapore 178902');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
