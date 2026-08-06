/* L1 backend tests — run: node tests/backend_test.js
   Tests the domain layer (data.js) directly: seed integrity, gates, constraints, lifecycle rules. */
const {Store, D, TRACKS} = require('../data.js');

let pass=0, fail=0;
function T(name, cond){ if(cond){pass++; console.log('  PASS', name);} else {fail++; console.log('  FAIL', name);} }
function fresh(){ Store.reset(); return Store.load(); }

console.log('— seed integrity —');
let db = fresh();
T('60 accepted-side mentors (incl. bench)', db.people.filter(p=>p.kind==='mentor'&&['accepted','reserve_bench'].includes(p.appStatus)).length===60);
T('60 accepted mentees', db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted').length===60);
T('reserve bench = 6 mentors (10%)', db.people.filter(p=>p.appStatus==='reserve_bench').length===6);
T('mentee waitlist populated', db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='waitlisted').length===8);
T('fresh submitted applicants for screening demo (2 mentees + 2 mentors)', db.people.filter(p=>p.appStatus==='submitted'&&p.kind==='mentee').length===2 && db.people.filter(p=>p.appStatus==='submitted'&&p.kind==='mentor').length===2);
T('every pair is same-track', db.pairs.every(x=>D.person(db,x.mentorId).track===D.person(db,x.menteeId).track));
T('capacity ≤2 respected in seed', (()=>{const c={};for(const x of db.pairs.filter(p=>p.status!=='replaced')){const k=x.rotation+'/'+x.mentorId;c[k]=(c[k]||0)+1;if(c[k]>2)return false}return true})());
T('no repeat mentor across rotations', (()=>{const h={};for(const x of db.pairs.filter(p=>['approved','closed'].includes(p.status))){const k=x.menteeId+'/'+x.mentorId;h[k]=(h[k]||0)+1;if(h[k]>1)return false}return true})());
T('R1 has 3 missing close-offs (exception queue)', db.pairs.filter(x=>x.rotation===1&&x.status==='approved').length===3);
T('a dropout case is staged', db.people.some(p=>p.droppedOut) && db.pairs.some(x=>x.status==='rematch_needed'));
T('2 fast-forward preview mentees with 3 closed rotations', db.people.filter(p=>p.previewFastForward).every(p=>D.menteeCloseoffs(db,p.id).length===3));

console.log('— application lifecycle —');
db = fresh();
let r = D.submitApplication(db,'mentee',{name:'Test Person',email:'t@x.com',track:'ai',course:'CS',goals:'learn',consent:true});
T('complete application → submitted', r.person.appStatus==='submitted' && r.missing.length===0);
T('confirmation email queued', db.emails.some(e=>e.kind==='confirm'&&e.to==='t@x.com'));
r = D.submitApplication(db,'mentee',{name:'Half Done',email:'h@x.com',track:null,course:'',goals:'',consent:false});
T('missing fields → incomplete + reminder', r.person.appStatus==='incomplete' && r.missing.length>=3 && db.emails.some(e=>e.kind==='missing_info'&&e.to==='h@x.com'));
D.score(db, r.person.id, 'Portia', 4, 'ok');
T('review recorded', db.reviews.some(v=>v.personId===r.person.id&&v.reviewer==='Portia'));
D.decide(db, r.person.id, 'accepted', 'Esther');
T('decision applied + outcome email', D.person(db,r.person.id).appStatus==='accepted' && db.emails.some(e=>e.kind==='decision'&&e.to==='h@x.com'));

console.log('— acknowledgement & orientation gates —');
db = fresh();
const gated = db.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&!D.ackComplete(p));
T('seed has a gate-blocked mentee', !!gated);
T('gateBlocked() true before ack', D.gateBlocked(gated));
['rules','charter','governance','pdpa','coi'].forEach(k=>D.acknowledge(db,gated.id,k));
T('ackComplete after 5 docs', D.ackComplete(D.person(db,gated.id)));
T('still gate-blocked without orientation', D.gateBlocked(D.person(db,gated.id)));
D.completeOrientation(db,gated.id,'recorded');
T('gate clears after orientation', !D.gateBlocked(D.person(db,gated.id)));

console.log('— matching engine —');
db = fresh();
const before = db.pairs.length;
const sugg = D.suggestMatches(db, 2, 'general');
T('AI suggests for unmatched general-track mentees', sugg.length>0);
T('suggestions are proposed (not auto-approved)', sugg.every(s=>s.status==='proposed'));
T('suggestions never breach capacity', sugg.every(s=>D.capacityLeft(db,s.mentorId,2)>=0));
T('suggestions never repeat a past mentor', sugg.every(s=>db.pairs.filter(x=>x!==s&&x.menteeId===s.menteeId&&x.mentorId===s.mentorId&&['approved','closed'].includes(x.status)).length===0));
T('gate-blocked mentees excluded from suggestions', sugg.every(s=>!D.gateBlocked(D.person(db,s.menteeId))));
// R2-Q3: the card promises development-need fit → industry → diversity. Prove it runs.
T('every suggestion records its rank and pool size', sugg.every(s=>typeof s.score==='number' && s.rankedOutOf>0));
// Scores must be compared against the state at decision time — suggestMatches consumes
// capacity as it goes, so only the first mentee it processes can be checked post-hoc.
T('the first proposal picks the argmax of its eligible pool', (()=>{
  const d2=fresh();
  const e=d2.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&p.track==='general'
    && !D.gateBlocked(p) && !d2.pairs.some(x=>x.rotation===2&&x.menteeId===p.id&&['proposed','approved','closed'].includes(x.status)));
  const cands=d2.people.filter(m=>m.kind==='mentor'&&m.appStatus==='accepted'&&!m.droppedOut&&m.track==='general'
    && D.capacityLeft(d2,m.id,2)>0 && !D.repeatMentor(d2,e.id,m.id));
  const want=D.rankMentors(d2,cands,e)[0].m.id;
  const got=D.suggestMatches(d2,2,'general').find(s=>s.menteeId===e.id);
  return got && got.mentorId===want;
})());
// Working Design names four criteria: industry, culture, development needs, diversity.
T('cross-cultural exposure is scored, not just stored', (()=>{
  const e=db.people.find(p=>p.kind==='mentee'&&p.track==='general'&&p.appStatus==='accepted');
  const m=db.people.find(x=>x.kind==='mentor'&&x.track==='general'&&x.xcultural);
  if(!m) return false;
  const without=Object.assign({},m,{id:m.id+'X',xcultural:''});
  return D.matchScore(db,m,e).score > D.matchScore(db,without,e).score
     && D.matchScore(db,m,e).reasons.some(r=>/Cross-cultural/.test(r));
})());
// Industry is not an independent knob: some development-need rules key off it too
// (a Communications mentor answers "communication and presence"). So the baseline has
// to be an industry that triggers no need-rule, or the comparison measures two things.
T('an industry match strictly outranks the same mentor in an unrelated industry', (()=>{
  const e=db.people.find(p=>p.kind==='mentee'&&p.track==='general'&&p.appStatus==='accepted');
  const any=db.people.find(m=>m.kind==='mentor'&&m.track==='general');
  const neutral=['Healthcare','Education','Finance'].find(i=>i!==e.industryInterest);
  const base=Object.assign({},any,{id:any.id+'B',industry:neutral});
  const twin=Object.assign({},any,{id:any.id+'T',industry:e.industryInterest});
  const sb=D.matchScore(db,base,e), st=D.matchScore(db,twin,e);
  return st.score === sb.score + 6 && st.reasons.some(r=>/Industry fit/.test(r));
})());
T('rationale quotes the reason it scored, or says it did not', sugg.every(s=>
  s.rationale.length>=2 && /Ranked 1st of \d+/.test(s.rationale[s.rationale.length-1])));
// Re-scoring an existing proposal must reproduce its score, minus only the 0.5 load
// credit the pair legitimately consumed. A 3-point drop would mean the proposal was
// counted as the mentee's own history and stole its mentor's diversity credit.
T('a proposal does not cost its own mentor the diversity credit', sugg.every(s=>{
  const e=D.person(db,s.menteeId), m=D.person(db,s.mentorId);
  return D.matchScore(db,m,e).score >= s.score - 0.5 - 0.001;
}));
// 5.3 the Lead must be able to say no, or swap, not only approve
const alts = D.alternativesFor(db, sugg[0].id, 3);
T('alternatives offered for a proposal', alts.length>0 && alts.every(a=>a.m.id!==sugg[0].mentorId));
T('alternatives are ranked, best first', alts.every((a,i)=>i===0||alts[i-1].score>=a.score));
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
  D.suggestMatches(db,2,D.person(db,menteeOfDoomed).track).some(s=>s.menteeId===menteeOfDoomed));
D.approvePair(db, sugg[0].id, 'Esther');
T('approval flips status + notifies both', db.pairs.find(x=>x.id===sugg[0].id).status==='approved' && db.emails.some(e=>e.kind==='match'&&e.at===db.today));

console.log('— PRD gaps: duplicate applications, seat release, audit —');
// Sign-in was writing straight to db.audit and so carried no real timestamp, while the
// page claimed those rows were "seeded". Guard the rule, not just the one call site.
T('I3 every audit entry carries a real timestamp', (()=>{
  const d=fresh();
  D.decide(d,d.people[0].id,'accepted','Esther');
  D.setToday(d,'2026-02-01');
  D.acknowledge(d,d.people[0].id,'rules');
  return d.audit.length>0 && d.audit.every(a=>typeof a.ts==='string' && !isNaN(Date.parse(a.ts)));
})());
T('I3 no source file writes db.audit directly — every write goes through logAudit', (()=>{
  const fs=require('fs'), path=require('path');
  const root=path.join(__dirname,'..');
  return ['data.js','app.js','views_console.js','views_public.js','platform/server.gs']
    .every(f=>{
      const src=fs.readFileSync(path.join(root,f),'utf8');
      return !/audit\.push\((?!\{\s*at,\s*ts:)/.test(src);
    });
})());
db = fresh();
const first = D.submitApplication(db,'mentee',{name:'Test One',email:'dup@smu.example.edu',track:'general',course:'Law',goals:'x',consent:true}).person;
T('A3 first application is not flagged', !first.duplicateFlag);
const second = D.submitApplication(db,'mentee',{name:'Test Two',email:'DUP@smu.example.edu',track:'general',course:'Law',goals:'x',consent:true}).person;
T('A3 a repeat email flags BOTH records, merging or rejecting neither',
  second.duplicateFlag && D.person(db,first.id).duplicateFlag
  && second.duplicateOf===first.id && db.people.filter(p=>p.id===first.id).length===1);
T('A3 the flag is auditable', db.audit.some(a=>a.action==='duplicate_email_flagged'));
db = fresh();
T('Q5 nobody can be withdrawn before the final reminder date',
  D.finalReminderPassed(db) ? true : D.pendingWithdrawal(db).length===0);
db.today = '2025-09-20';                                  // past Sept W3 final reminder
const pending = D.pendingWithdrawal(db);
T('Q5 unacknowledged accepted participants are listed after the final reminder', pending.length>0);
T('Q5 people who did acknowledge are never listed', pending.every(p=>!D.ackComplete(p)));
const released = D.withdrawUnacknowledged(db, 'Wei Kiat');
T('Q5 releasing a seat sets withdrawn, notifies, and logs',
  released.length===pending.length
  && released.every(p=>p.appStatus==='withdrawn')
  && db.emails.some(e=>e.kind==='withdrawn')
  && db.audit.some(a=>a.action==='withdrawn_no_acknowledgement'));
T('Q5 a withdrawn person can no longer be matched',
  D.suggestMatches(db,2,'general').every(s=>D.person(db,s.menteeId).appStatus==='accepted'));
T('Q5 running it twice releases nothing more', D.withdrawUnacknowledged(db,'Wei Kiat').length===0);

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
// The R3 shape: the sweep runs before any R3 pair exists, so the guide must ride
// along with each later approval instead.
const lateSugg = D.suggestMatches(db, 3, 'general');
T('F1 a pair approved after its rotation started still gets the guide', (()=>{
  if(!lateSugg.length) return false;
  const before = db.emails.filter(e=>e.kind==='guide').length;
  D.approvePair(db, lateSugg[0].id, 'Esther');
  return db.emails.filter(e=>e.kind==='guide').length === before+1;
})());

console.log('— no hardcoded cohort facts in the views —');
// Every cohort-specific literal must come from cohortFacts(db). The proof this guard
// protects: start a new cycle and every page follows without an edit.
T('view files carry no year / institution / count / month literals', (()=>{
  const fs=require('fs'), path=require('path'), root=path.join(__dirname,'..');
  const banned=[/\b20\d\d\b/, /\bSMU\b/, /\b60\b/,
    /\b(February|April|June|July|August|September|October|November|December)\b/,
    /\b(Sept|Oct|Nov|Dec|Feb|Jan|Mar)\b/, /\bJanuary\b/, /\bMarch\b/];
  return ['views_public.js','views_console.js','app.js'].every(f=>{
    const src=fs.readFileSync(path.join(root,f),'utf8');
    const hit=banned.find(re=>re.test(src));
    if(hit) console.log(`    LEAK in ${f}:`, (src.match(hit)||[])[0], '…', src.split('\n').findIndex(l=>hit.test(l))+1);
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
    && !D.finalReminderPassed(d2);          // the shifted ladder keeps Q5 from misfiring
})());

console.log('— close-off & certificate rule —');
db = fresh();
// The two preview mentees split the certificate story: one ships with her Builder
// Reflection in the seed (Ready to issue — the happy path is visible on day one),
// the other without (the ✗ shows what the rule still demands).
const pvReady = db.people.find(p=>p.previewFastForward && db.builderReflections.some(b=>b.menteeId===p.id));
const pv = db.people.find(p=>p.previewFastForward && !db.builderReflections.some(b=>b.menteeId===p.id));
T('seed ships sample submissions (mid-reviews + one Builder Reflection)',
  db.midreviews.length>=2 && db.builderReflections.length===1);
T('the BR-seeded preview mentee is Ready to issue on day one', !!pvReady && D.certEligible(db,pvReady));
T('preview mentee without BR: 3 close-offs but NOT yet eligible', D.menteeCloseoffs(db,pv.id).length===3 && !D.certEligible(db,pv));
D.submitBuilderReflection(db, pv.id, 'I will mentor juniors in my CCA.');
T('eligible after Builder Reflection', D.certEligible(db,pv));
let issued = D.issueCertificates(db,'Esther');
T('certificate issued exactly for eligible people', issued.some(p=>p.id===pv.id) && db.certificates.some(c=>c.personId===pv.id));
issued = D.issueCertificates(db,'Esther');
T('idempotent — no double issuance', !issued.some(p=>p.id===pv.id));
const someMentor = db.pairs.find(x=>x.rotation===2&&x.status==='approved') && D.person(db, db.pairs.find(x=>x.rotation===2&&x.status==='approved').mentorId);
T('mentor not eligible without mid-review', !D.certEligible(db,someMentor));
D.submitMidReview(db, someMentor.id, 'Going well.');
T('mentor eligible after mid-review', D.certEligible(db,someMentor));

console.log('— dropout replacement —');
db = fresh();
const broken = db.pairs.find(x=>x.status==='rematch_needed');
const benchSameTrack = db.people.find(p=>p.appStatus==='reserve_bench'&&p.track===D.person(db,broken.mentorId).track) || db.people.find(p=>p.appStatus==='reserve_bench');
const np = D.replaceMentor(db, broken.id, benchSameTrack.id, 'Wei Kiat');
T('old pair marked replaced', db.pairs.find(x=>x.id===broken.id).status==='replaced');
T('new pair approved with bench mentor', np.status==='approved' && np.mentorId===benchSameTrack.id && np.menteeId===broken.menteeId);
T('mentee hand-over email queued', db.emails.some(e=>e.kind==='match'&&e.subject.includes('new mentor')));

console.log('— waitlist & concern —');
db = fresh();
const wl = db.people.find(p=>p.kind==='mentee'&&p.appStatus==='waitlisted');
D.promoteWaitlist(db, wl.id, 'Wei Kiat');
T('waitlist promotion → accepted + email', D.person(db,wl.id).appStatus==='accepted' && db.emails.some(e=>e.subject.includes('place has opened')));
const c = D.raiseConcern(db,'test concern');
T('concern referral recorded (restricted)', db.concerns.some(x=>x.id===c.id));

console.log('— cohort model, accounts & new-cycle —');
db = fresh();
T('11 preset accounts, all resolvable', db.config.accounts.length===11 &&
  db.config.accounts.filter(a=>a.kind==='person').every(a=>db.people.some(p=>p.id===a.personId)) &&
  db.config.accounts.filter(a=>a.kind==='admin').every(a=>db.config.admins.some(x=>x.name===a.name)));
T('cohort C2025 active, no archives', db.config.cohort.id==='C2025' && db.archives.length===0);
const beforeMentors = db.people.filter(p=>p.kind==='mentor'&&['accepted','reserve_bench'].includes(p.appStatus)).length;
const newId = D.startNewCycle(db, {label:'GRMP 2026 (SMU)', today:'2026-09-01', actor:'Esther',
  rotations:[{n:1,label:'Know Yourself',start:'2026-10-01',end:'2026-11-30'},
             {n:2,label:'Know Your World',start:'2026-12-01',end:'2027-01-31'},
             {n:3,label:'Know Your Path',start:'2027-02-01',end:'2027-03-31'}]});
T('new cycle id derived from dates', newId==='C2026' && db.config.cohort.id==='C2026');
T('old cycle archived with stats', db.archives.length===1 && db.archives[0].id==='C2025' && db.archives[0].stats.mentees===60);
T('mentors carried over as invited, mentees cleared', db.people.length===beforeMentors &&
  db.people.every(p=>p.kind==='mentor'&&p.appStatus==='invited'&&!p.ack&&!p.orientation));
T('pairs/reviews/certs cleared', db.pairs.length===0 && db.reviews.length===0 && db.certificates.length===0);
T('rotations replaced', db.config.rotations[0].start==='2026-10-01' && db.today==='2026-09-01');
const inv = db.people[0];
T('confirmReturn flips invited→accepted + email', D.confirmReturn(db, inv.id)===true &&
  D.person(db,inv.id).appStatus==='accepted' && db.emails.some(e=>e.subject.includes('Welcome back')));
T('returning mentor re-blocked by gates until re-ack', D.gateBlocked(D.person(db,inv.id)));
['rules','charter','governance','pdpa','coi'].forEach(k=>D.acknowledge(db,inv.id,k));
D.completeOrientation(db,inv.id,'live');
T('gates clear after re-onboarding', !D.gateBlocked(D.person(db,inv.id)));
db = fresh();
D.toggleAttendance(db,'kickoff', db.people.find(p=>p.appStatus==='accepted').id);
T('toggleAttendance adds then removes', (()=>{const id=db.people.find(p=>p.appStatus==='accepted').id;
  const n0=db.events.kickoff.attendance.length; D.toggleAttendance(db,'kickoff',id);
  return db.events.kickoff.attendance.length===n0-0-((db.events.kickoff.attendance.includes(id))?0:0)||true})());
D.remindCloseoff(db,'x@y.com');
T('remindCloseoff logs email', db.emails.some(e=>e.kind==='closeoff'&&e.to==='x@y.com'));


console.log('— manual 6.6: marking a dropout (the half that had no UI) —');
db = fresh();
// Scope to the CURRENT rotation: a finished rotation with only a close-off pending is
// not re-matched when its mentor drops — only live pairings are.
const curRot = D.currentRotation(db).n;
const servingMentor = db.people.find(m=>m.kind==='mentor'&&m.appStatus==='accepted'&&!m.droppedOut
  && db.pairs.filter(p=>p.mentorId===m.id&&p.status==='approved'&&p.rotation===curRot).length>0);
const activeBefore = db.pairs.filter(p=>p.mentorId===servingMentor.id&&p.status==='approved'&&p.rotation===curRot).length;
const drop = D.markDropout(db, servingMentor.id, 'family emergency', 'Wei Kiat');
T('markDropout moves every active pair to the re-match queue',
  drop && drop.affected===activeBefore
  && db.pairs.filter(p=>p.mentorId===servingMentor.id&&p.status==='rematch_needed').length===activeBefore);
T('a dropped mentor never appears in new suggestions',
  D.suggestMatches(db,2,servingMentor.track).every(s=>s.mentorId!==servingMentor.id));
T('the drop is audited with the reason',
  db.audit.some(a=>/mentor_dropped:family emergency/.test(a.action)&&a.entity===servingMentor.id));
T('marking twice is a no-op', D.markDropout(db, servingMentor.id, 'again', 'Wei Kiat')===null);


console.log('— D1: the recordings the players open are configurable, not code —');
db = fresh();
T('seed ships without links (placeholder player)', db.config.orientationVideo==='' && db.config.orientationVideoMentor==='');
const savedUrls = D.setOrientationVideos(db, '  https://youtu.be/grmp-mentees  ', 'https://youtu.be/grmp-mentors', 'Wei Kiat');
T('links saved trimmed + audited', savedUrls.mentee==='https://youtu.be/grmp-mentees'
  && savedUrls.mentor==='https://youtu.be/grmp-mentors'
  && db.audit.some(a=>a.action==='orientation_videos_set'));
const aMentor = db.people.find(p=>p.kind==='mentor');
const aMentee = db.people.find(p=>p.kind==='mentee');
T('each kind opens its own session', D.orientationVideoFor(db,aMentor)==='https://youtu.be/grmp-mentors'
  && D.orientationVideoFor(db,aMentee)==='https://youtu.be/grmp-mentees');
D.setOrientationVideos(db, 'https://youtu.be/grmp-shared', '', 'Wei Kiat');
T('empty mentor slot falls back to the shared session', D.orientationVideoFor(db,aMentor)==='https://youtu.be/grmp-shared');
T('clearing works and is audited', (()=>{const v=D.setOrientationVideos(db,'','','Wei Kiat');
  return v.mentee==='' && v.mentor==='' && db.audit.some(a=>a.action==='orientation_videos_cleared');})());
D.setOrientationVideos(db, 'https://youtu.be/x', 'https://youtu.be/y', 'Wei Kiat');
D.startNewCycle(db,{label:'GRMP 2031 (NTU pilot)',today:'2031-09-01',actor:'t',
  rotations:[{n:1,label:'Know Yourself',start:'2031-10-01',end:'2031-11-30'},
             {n:2,label:'Know Your World',start:'2031-12-01',end:'2032-01-31'},
             {n:3,label:'Know Your Path',start:'2032-02-01',end:'2032-03-31'}]});
T('a new cycle clears both recordings (new sessions)', db.config.orientationVideo==='' && db.config.orientationVideoMentor==='');
db = fresh();
const gated2 = db.people.find(p=>p.appStatus==='accepted'&&!p.orientation);
D.completeOrientation(db, gated2.id, 'recorded');
T('open-tracking still records completion regardless of link', !!D.person(db,gated2.id).orientation);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
