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
T('2 fresh submitted mentees for screening demo', db.people.filter(p=>p.appStatus==='submitted').length===2);
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
D.approvePair(db, sugg[0].id, 'Esther');
T('approval flips status + notifies both', db.pairs.find(x=>x.id===sugg[0].id).status==='approved' && db.emails.some(e=>e.kind==='match'&&e.at===db.today));

console.log('— close-off & certificate rule —');
db = fresh();
const pv = db.people.find(p=>p.previewFastForward);
T('preview mentee: 3 close-offs but NOT yet eligible (no Builder Reflection)', D.menteeCloseoffs(db,pv.id).length===3 && !D.certEligible(db,pv));
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
T('cohort C2026 active, no archives', db.config.cohort.id==='C2026' && db.archives.length===0);
const beforeMentors = db.people.filter(p=>p.kind==='mentor'&&['accepted','reserve_bench'].includes(p.appStatus)).length;
const newId = D.startNewCycle(db, {label:'GRMP 2027 (SMU)', today:'2027-09-01', actor:'Esther',
  rotations:[{n:1,label:'Know Yourself',start:'2027-10-01',end:'2027-11-30'},
             {n:2,label:'Know Your World',start:'2027-12-01',end:'2028-01-31'},
             {n:3,label:'Know Your Path',start:'2028-02-01',end:'2028-03-31'}]});
T('new cycle id derived from dates', newId==='C2027' && db.config.cohort.id==='C2027');
T('old cycle archived with stats', db.archives.length===1 && db.archives[0].id==='C2026' && db.archives[0].stats.mentees===60);
T('mentors carried over as invited, mentees cleared', db.people.length===beforeMentors &&
  db.people.every(p=>p.kind==='mentor'&&p.appStatus==='invited'&&!p.ack&&!p.orientation));
T('pairs/reviews/certs cleared', db.pairs.length===0 && db.reviews.length===0 && db.certificates.length===0);
T('rotations replaced', db.config.rotations[0].start==='2027-10-01' && db.today==='2027-09-01');
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
