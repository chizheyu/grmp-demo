/* GRMP Demo — state engine + seeded cohort.
   Single source of truth in localStorage. Deterministic seed (mulberry32) so tests are stable.
   Demo date is fixed at 2026-12-15 (mid-cycle: R1 closed, R2 running) so every view has life.
   R5 (Aug 2026): built to Joanne's six specs — staged application forms, gated acceptance
   (Rules + COI + Kick-Off, separately timestamped), OTP link login, Reserve lists, decline
   variants, industry-preference matching (tracks removed), 17 verbatim email templates.
   ALL participant-facing legal text and email copy lives HERE (COPY / MAILS), verbatim from
   the specs — views interpolate, never rewrite. */

const DB_KEY = 'grmp_demo_v6';   // bumped: R5 spec model (forms/gate/reserve/industries)
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
const uname = (used)=>{let f,l,n;do{f=pick(FIRST);l=pick(LAST);n=f+' '+l}while(used.has(n));used.add(n);return {first:f,last:l,full:n}};

/* ---------- R5 taxonomies (verbatim option lists from the application specs) ---------- */
/* Industry list: IDENTICAL on the mentor form (self-classification) and the mentee form
   (three ranked preferences) — spec: "identical wording, so mentee preference and mentor
   self-classification match on the same keys". Do not diverge. */
const INDUSTRIES = [
  'Accounting, Audit & Tax',
  'Consulting & Professional Services',
  'Banking, Finance & Insurance',
  'Legal',
  'Technology, Media & Telecommunications (TMT)',
  'Consumer Goods & Retail (incl. FMCG)',
  'Manufacturing & Industrials',
  'Energy, Utilities & Resources',
  'Real Estate, Construction & Infrastructure',
  'Transport, Logistics & Supply Chain',
  'Healthcare, Pharmaceuticals & Life Sciences',
  'Education & Research',
  'Government, Public Sector & Non-Profit',
  'Media, Arts, Creative & Entertainment',
  'Hospitality, Travel & F&B',
  'Sustainability & ESG',
  'Other',
];
/* Seven SMU undergraduate schools, verified by Wei Kiat Koh for AY2026/27. No "Other". */
const FACULTIES = [
  'Lee Kong Chian School of Business',
  'School of Accountancy',
  'School of Computing and Information Systems',
  'School of Economics',
  'School of Social Sciences',
  'Yong Pung How School of Law',
  'College of Integrative Studies',
];
/* Selection criteria. `scored:false` = a confirmation captured on the form, not a 1–5 read. */
const MENTEE_CRITERIA = [
  {key:'Readiness to Learn', scored:true,  hint:'Prompt 1: what they want to grow, and how they talk about being shaped'},
  {key:'Commitment',         scored:false, hint:'Confirmed on the form (full-cycle commitment question)'},
  {key:'Global Curiosity',   scored:true,  hint:'Prompt 2: pull toward the world beyond their own field'},
  {key:'Values Awareness',   scored:true,  hint:'Prompt 1: self-knowledge and honesty about what needs work'},
  {key:'Ownership',          scored:true,  hint:'Prompt 1: the concrete moment of taking charge of their own development'},
  {key:'Community Mindset',  scored:true,  hint:'Prompt 2: how they would show up for the people around them'},
];
const MENTOR_CRITERIA = [
  {key:'Professional Credibility', scored:true,  hint:'Years of experience, leadership indicator, leadership free-text'},
  {key:'Breadth of Perspective',   scored:true,  hint:'Cross-industry / market / culture exposure'},
  {key:'Values Alignment',         scored:true,  hint:'"What draws you to mentoring" selections + anything-else'},
  {key:'Mentoring Mindset',        scored:true,  hint:'Prior mentoring experience + interests offered'},
  {key:'Commitment',               scored:false, hint:'Confirmed on the form (full-cycle commitment question)'},
];
const FORM_OPTS = {
  heardMentor: ['I was a mentor in last year’s programme','I was referred by someone','I discovered SMC and GRMP through the website or online'],
  heardMentee: ['I was referred by someone','I discovered SMC and GRMP through the website or online','Through an SMU class, club or faculty','Other'],
  yearsExp: ['Under 5 years','5–10 years','11–15 years','More than 15 years'],
  crossIndustry: ['Yes, significantly','Somewhat','Not really'],
  draws: ['Continue learning through perspectives different from my own','Contribute to SMC’s mentoring community and purpose','Share hard-won lessons from my own journey','Help develop globally ready Singapore talent'],
  years: ['Year 1','Year 2','Year 3','Year 4','Year 5'],
};

/* ---------- R5 verbatim participant-facing text (from the approved specs) ----------
   Render EXACTLY. Never paraphrase, restyle or reorder — the specs are explicit.
   Kick-Off framing interpolates the cycle's own date so a future cycle stays truthful. */
const COPY = {
  pdpaTitle: 'GRMP PDPA Consent and Acknowledgement',
  pdpaBody: [
    'SMC takes privacy seriously. In line with Singapore’s Personal Data Protection Act, SMC and GRMP participants are expected to handle personal information with care.',
    '**SMC’s Use of Your Personal Data**',
    'You consent to SMC collecting and using your personal data, including your name, contact details and relevant programme information, to manage your application and participation in GRMP, communicate with you, facilitate mentor and mentee matching, administer and evaluate the programme, and take photos or videos at SMC events for documentation.',
    'Where necessary for GRMP, relevant personal information may be shared with your matched mentor or mentee.',
    'SMC will not share your personal data with third parties without your consent unless required by law. You may access or correct your data, or withdraw your consent, by contacting SMC’s designated Data Protection Officer, subject to operational requirements.',
    '**Your Responsibility for Others’ Personal Data**',
    'You agree to:',
    '- use personal data received through GRMP only for purposes connected with the programme and mentoring relationship;',
    '- not share another participant’s personal stories, contact details or photos on social media, messaging apps or with others without their explicit consent; and',
    '- ensure you have the person’s consent before sharing their personal data with SMC.',
    'These responsibilities continue after your participation in GRMP ends.',
    '**Consent and Acknowledgement**',
  ],
  pdpaTick: 'I have read and understood the above. I consent to SMC collecting and using my personal data as described and agree to protect and appropriately handle the personal data of other GRMP participants.',

  rulesTitleMentor: 'GRMP Programme Rules Acknowledgement',
  rulesMentor: [
    'GRMP is a structured mentoring programme comprising three rotations, with each rotation running for two months. Mentors play an important role in providing a consistent and meaningful mentoring experience across the programme.',
    '**1. Programme Commitment**',
    'As a GRMP mentor, I agree to:',
    '1. Participate in all three rotations.',
    '2. Meet my assigned mentee at least twice during each rotation.',
    '3. Follow the GRMP Conversation Guide for each rotation so that mentoring conversations remain aligned with the purpose and developmental focus of the programme.',
    '4. Complete the Mid Programme Review when requested.',
    '5. Complete the GRMP Programme Feedback at the end of Rotation 3.',
    '6. Inform the GRMP Programme Lead promptly if I am unable to fulfil my programme commitments or if circumstances arise that may affect my participation.',
    '**2. Mentoring Conduct**',
    'As a GRMP mentor, I agree to:',
    '1. Treat my mentee and other GRMP participants with respect, fairness and inclusion.',
    '2. Maintain appropriate professional and personal boundaries in the mentoring relationship.',
    '3. Respect the confidentiality of mentoring conversations, except where a safeguarding, misconduct or other serious concern should appropriately be raised with SMC.',
    '4. Use my role as a GRMP mentor for the purpose of mentoring and not for personal, commercial, financial or religious gain.',
    '5. Observe the principles and standards of conduct set out in the [SMC Charter].',
    '**3. Raising Concerns**',
    'Any concern, grievance, misconduct issue or safeguarding matter should be raised in good faith with the GRMP Programme Lead or SMC Leadership Committee, as appropriate, in accordance with SMC’s Volunteer Grievances and Misconduct Guidelines and Procedure. The applicable process will be shared where relevant or upon request.',
    '**4. After GRMP Ends**',
    'GRMP formally ends upon completion of the programme. If a mentor and mentee choose to remain in contact or continue the mentoring relationship after GRMP ends, this becomes a private arrangement between the mentor and mentee and falls outside SMC’s programme administration and oversight. SMC is not responsible for managing, monitoring or supervising any mentoring relationship that continues after GRMP has ended. Mentors and mentees are expected to continue observing appropriate boundaries, confidentiality and mutual respect in any ongoing relationship.',
  ],
  rulesTitleMentee: 'GRMP Programme Rules Acknowledgement',
  rulesMentee: [
    'GRMP is a structured mentoring programme comprising three rotations, with each rotation running for approximately two months. Mentees are expected to take ownership of their learning and participation throughout the programme.',
    '**1. Programme Commitment**',
    'As a GRMP mentee, I agree to:',
    '1. Participate in all three rotations.',
    '2. Meet my assigned mentor at least twice during each rotation.',
    '3. Use the GRMP Conversation Guide for each rotation to prepare for and participate actively in mentoring conversations.',
    '4. Complete my Reflection Sheet for each rotation. The Reflection Sheet is for my own learning and does not need to be submitted to SMC.',
    '5. Acknowledge completion of each rotation in the GRMP system.',
    '6. Complete the Mid Programme Review when requested.',
    '7. Complete the GRMP Programme Feedback at the end of Rotation 3.',
    '8. Complete my Builder’s Commitment at the end of Rotation 3.',
    '9. Inform the GRMP Programme Lead promptly if I am unable to fulfil my programme commitments or if circumstances arise that may affect my participation.',
    '**2. Mentoring Conduct**',
    'As a GRMP mentee, I agree to:',
    '1. Come prepared, participate actively and take ownership of my learning and follow through.',
    '2. Treat my mentor and other GRMP participants with respect, fairness and inclusion.',
    '3. Maintain appropriate boundaries in the mentoring relationship.',
    '4. Respect the confidentiality of mentoring conversations, except where a safeguarding, misconduct or other serious concern should appropriately be raised with SMC.',
    '5. Use the mentoring relationship for its intended learning and development purpose and not to solicit personal favours, employment, internships, referrals, financial support or other personal opportunities from my mentor.',
    '6. Observe the principles and standards of conduct set out in the [SMC Charter].',
    '**3. Raising Concerns**',
    'Any concern, grievance, misconduct issue or safeguarding matter should be raised in good faith with the GRMP Programme Lead or SMC Leadership Committee, as appropriate, in accordance with SMC’s Volunteer Grievances and Misconduct Guidelines and Procedure. The applicable process will be shared where relevant or upon request.',
    '**4. After GRMP Ends**',
    'GRMP formally ends upon completion of the programme. If a mentor and mentee choose to remain in contact or continue the mentoring relationship after GRMP ends, this becomes a private arrangement between the mentor and mentee and falls outside SMC’s programme administration and oversight. SMC is not responsible for managing, monitoring or supervising any mentoring relationship that continues after GRMP has ended. Mentors and mentees are expected to continue observing appropriate boundaries, confidentiality and mutual respect in any ongoing relationship.',
  ],
  rulesTick: 'I have read and understood the GRMP Programme Rules and agree to follow them throughout my participation in GRMP. I also acknowledge the principles set out in the SMC Charter.',
  rulesTickErr: 'Please confirm you have read and agree to the Programme Rules.',

  coiTitleMentor: 'GRMP Conflict of Interest Declaration',
  coiMentor: [
    'A conflict of interest may arise where a personal, business, financial or other relationship or interest could affect, or reasonably appear to affect, your impartiality or the mentoring relationship.',
    'Please declare any actual or potential conflict that SMC should be aware of in arranging or continuing your GRMP mentoring relationship. This includes an existing personal, professional, business or financial relationship with your assigned mentee.',
    'You should also inform SMC promptly if a conflict arises during the programme.',
    'Mentors and mentees should not offer, give, solicit or accept gifts or favours in connection with the mentoring relationship where this may create, or reasonably appear to create, a conflict of interest.',
  ],
  coiTitleMentee: 'GRMP Conflict of Interest Declaration',
  coiMentee: [
    'A conflict of interest may arise where a personal, professional, business, financial or other relationship or interest could affect, or reasonably appear to affect, your mentoring relationship.',
    'Please declare any actual or potential conflict that SMC should be aware of in arranging or continuing your GRMP mentoring relationship. This includes an existing personal, professional or other relationship with your assigned mentor that could affect the independence of the mentoring relationship.',
    'You should also inform SMC promptly if a conflict arises during the programme.',
    'Mentors and mentees should not offer, give, solicit or accept gifts or favours in connection with the mentoring relationship where this may create, or reasonably appear to create, a conflict of interest.',
  ],
  coiNone: 'I have NO actual or potential conflict of interest to declare.',
  coiSome: 'I have an actual or potential conflict of interest to declare.',
  coiDetailsLabelMentor: 'Please provide brief details of the conflict of interest so that SMC can assess and appropriately manage the matter.',
  coiDetailsLabelMentee: 'Please provide brief details on the conflict of interest so that SMC can assess and appropriately manage the matter.',
  coiTick: 'I confirm that this declaration is accurate to the best of my knowledge and that I will inform SMC promptly if an actual or potential conflict of interest arises during my participation in GRMP.',
  coiSelectErr: 'Please select one option.',
  coiDetailsErr: 'Please provide brief details of the conflict of interest.',
  coiTickErr: 'Please confirm your declaration to proceed.',

  kickoffFraming: (CF, kind) => kind==='mentor'
    ? `**Attending the GRMP Kick-Off on ${CF.kickoffLong} is a requirement of the programme.** It is where mentors align on the mentoring approach and rotation expectations, so that every mentee receives a consistent experience. We ask all mentors to attend. If you have an exceptional and unavoidable reason you cannot, please request an exception below so we can discuss it with you.`
    : `**Attending the GRMP Kick-Off on ${CF.kickoffLong} is a requirement of the programme.** It is your first touchpoint with the mentoring community and where you align on how the programme and rotations work. We ask all mentees to attend. If you have an exceptional and unavoidable reason you cannot, please request an exception below so we can discuss it with you.`,
  kickoffAttend: CF => `I confirm I will attend the GRMP Kick-Off on ${CF.kickoffLong}.`,
  kickoffException: 'I am requesting an exception (I have an unavoidable reason, provided below).',
  kickoffReasonLabel: 'Please tell us why you are unable to attend, so we can discuss it with you.',
  kickoffSelectErr: 'Please select one option.',
  kickoffReasonErr: 'Please provide a reason so we can discuss an exception with you.',

  eligibilityTick: 'I confirm I am a current SMU undergraduate.',
  eligibilityErr: 'Please confirm your eligibility to proceed.',
  smuEmailSoftWarn: 'This does not look like an SMU student email. Please check before continuing.',
  smuEmailMicro: 'Please use your SMU student email.',
  menteePrompt1: 'Six months from now, what do you hope will have changed in you? Tell us what you would most like to grow, and share a moment when you took real ownership of your own development, at work, in your studies, or in life.',
  menteePrompt2: 'We are drawn to people who are curious about the world beyond their own field. What pulls your attention, and how would you want to show up for the people around you in this community?',

  mentorCommitAsk: CF => [
    `Attend the orientation / Kick-Off on ${CF.kickoffLong}`,
    `Participate in all three rotations across the six-month cycle (${CF.cycleSpanLong}), working with a new mentee in each rotation`,
    'Meet your assigned mentee at least twice during each rotation, virtually or in person',
    'Complete the Mid Programme Review and the end-of-programme feedback when requested',
  ],
  menteeCommitAsk: CF => [
    `Attend the orientation / Kick-Off on ${CF.kickoffLong}`,
    `Take part across all three rotations over the six-month cycle (${CF.cycleSpanLong}), working with a different mentor in each rotation`,
    'Meet your assigned mentor at least twice during each rotation, virtually or in person',
    'Complete onboarding, and take part in programme activities and feedback when requested',
  ],
  rotationsLine: CF => `Rotations: Rotation 1 (${CF.r1Span}), Rotation 2 (${CF.r2Span}), Rotation 3 (${CF.r3Span}).`,

  mentorIntro: CF => `**Welcome, and thank you for stepping forward to mentor with GRMP.**\nGRMP is an immersive six-month programme (${CF.cycleSpanDash}), and we match mentors to mentees with real care. To do that well, we will ask a little about your background, experience and what draws you to mentoring.\nThis will be a few short steps and will take about 6–8 minutes.`,
  menteeIntro: CF => `**Welcome, and thank you for your interest in GRMP.**\nGRMP is an immersive six-month programme (${CF.cycleSpanLong}), and places are limited. We match mentees to mentors with real care, so we will ask a little about you, your studies, and what you hope to grow.\nThis will be a few short steps and will take about 7–10 minutes. **We value focused thinking over length**, there is no need to write more than you mean.`,
  mentorConfirmScreen: CF => `**Thank you, your application is in.**\nWe have received your details and will be in touch by ${CF.outcomeByLong} with the next steps. If you have any questions in the meantime, please email us at ${CF.enquiries}.`,
  menteeConfirmScreen: CF => `**Thank you, your application is in.**\nWe have received your details and will be in touch by ${CF.outcomeByLong} with the next steps. Places are limited, and we read every application with care. If you have any questions in the meantime, please email us at ${CF.enquiries}.`,
};

/* ---------- R5 email templates (verbatim from the post-selection + application specs) ----
   Sender identity (all system emails): From "SMC GRMP Team", reply-to smu.smc@sa.smu.edu.sg
   (configure at the mail-platform level — carried in config.mail). Signatures: relationship-
   defining emails are dual-signed (Esther Koh + Wei Kiat Koh); operational chase-ups are
   Wei Kiat Koh only. Bodies are plain text; the UI linkifies #/me/... personal links. */
const MAILS = {
  mentor_invite: {sign:'dual', subject:(v,CF)=>`Shape a Global-Ready Leader as an ${CF.pairName} GRMP Mentor`,
    body:(v,CF)=>[`Dear ${v.name},`,'',
      'Your experience could help shape a global-ready leader.','',
      `We warmly invite you to join the ${CF.progFull} as a mentor for the upcoming programme cycle from ${CF.cycleSpanLong}.`,'',
      'The distance between your world and a student’s is precisely what makes your experience worth sharing. As a GRMP mentor, you will help young people discover who they are and where they want to go, drawing not only on your successes, but also on the setbacks, choices and lessons that have shaped your journey.','',
      '**What you will contribute:**',
      '- Mentor across three rotations over the six-month programme, working with a new mentee in each.',
      `- Attend the orientation and Kick-Off on ${CF.kickoffLong}.`,
      '- Meet your mentee at least twice during each rotation, virtually or in person.',
      '- Guide and challenge each mentee to navigate differences, frame problems and act with clarity.','',
      '**What you will gain:**',
      '- Strengthen your mentoring, coaching and leadership skills.',
      '- Gain fresh perspectives from the next generation.',
      '- Expand your network as part of a global community of 5,000+ SMC members across 35 countries.',
      `- Receive a Certificate of Appreciation jointly presented by ${CF.inst} and SMC upon fulfilling the programme requirements.`,'',
      `To learn more, please visit ${v.portal||'#/'} .`,'',
      `We would be delighted to have you join us on this meaningful journey. **To apply, please complete our mentor application at ${v.applyLink||'#/apply/mentor'} by ${CF.applyClosesLong}.**`,'',
      `Thank you, and we look forward to welcoming you as an ${CF.pairName} GRMP mentor.`,'',
      'Warm regards,'].join('\n')},
  mentee_invite: {sign:'dual', subject:(v,CF)=>`An Invitation to Grow: Join the ${CF.pairName} Global-Ready Mentoring Programme`,
    body:(v,CF)=>[`Dear ${v.name},`,'',
      'The people who shape us are often the ones who see the world differently from us.','',
      `We warmly invite you to apply to the ${CF.progFull} as a mentee for the upcoming programme cycle from ${CF.cycleSpanLong}.`,'',
      `GRMP pairs ${CF.inst} students with experienced mentors from SMC’s global community. Over six months, you will be guided by people whose journeys, industries and outlooks differ from your own, and you will be asked to bring something too: curiosity, openness, and a willingness to take ownership of your own growth.`,'',
      '**What you will gain:**',
      '- Learn from three different mentors across the six-month cycle, drawn from SMC’s community of 5,000+ members across 35 countries.',
      '- Understand yourself first: your interests, strengths and values, before turning to careers and choices.',
      '- Turn to the real world next: how industries, workplaces and cultures operate, beyond the classroom.',
      `- Conclude with a clearer direction, one practical next step, and a Certificate of Completion jointly presented by ${CF.inst} and SMC.`,'',
      '**What we will ask of you:**',
      `- Attend the orientation and Kick-Off on ${CF.kickoffLong}.`,
      '- Take part across all three rotations over the six-month cycle, working with a different mentor in each.',
      '- Meet your assigned mentor at least twice during each rotation, virtually or in person.',
      '- Bring openness, reflection and ownership of your own development throughout.','',
      `To learn more, please visit ${v.portal||'#/'} .`,'',
      `Places are limited, and we read every application with care. **To apply, please complete our mentee application at ${v.applyLink||'#/apply/mentee'} by ${CF.applyClosesLong}.**`,'',
      'We look forward to reading your application.','',
      'Warm regards,'].join('\n')},
  mentor_receipt: {sign:'wk', subject:()=> 'We have received your GRMP mentor application',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      'Thank you for applying to mentor with GRMP. We have received your application.','',
      `We will review applications from across the cohort and be in touch by ${CF.outcomeByLong} with the next steps. If you are confirmed as a mentor, that message will include your onboarding details.`,'',
      `For any information on GRMP, please visit ${v.portal||'#/'} .`,'',
      'Warm regards,'].join('\n')},
  mentee_receipt: {sign:'wk', subject:()=> 'We have received your GRMP mentee application',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      'Thank you for applying to join GRMP as a mentee. We have received your application.','',
      `Places are limited, and we read every application with care. We will review applications from across the cohort and be in touch by ${CF.outcomeByLong} with the next steps. If you are offered a place, that message will include your onboarding details.`,'',
      `For any information on GRMP, please visit ${v.portal||'#/'} .`,'',
      'Warm regards,'].join('\n')},
  mentor_accept: {sign:'dual', subject:(v,CF)=>`Welcome as an ${CF.pairName} GRMP mentor`,
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `We are delighted to let you know that your application to mentor with the ${CF.progFull} is successful. Thank you for the care you put into your application, and welcome.`,'',
      'To confirm your place, please complete a short acknowledgement in the GRMP portal:','',
      `1. Open your personalized link: ${v.link}`,
      '2. Enter the email address you used in your application.',
      '3. We will send a one-time verification code to that email. Enter the code to log in.',
      '4. On your first login, you will be asked to review and acknowledge the Programme Rules and complete a brief Conflict of Interest declaration. This confirms your place.','',
      `Please complete this by ${CF.acceptByLong}.`,'',
      'The GRMP portal is the one place to track your GRMP participation and your wider SMC journey, and you will use it throughout the programme.','',
      'We look forward to the contribution you will make, and to welcoming you into this year’s community of mentors.','',
      'Warm regards,'].join('\n')},
  mentee_accept: {sign:'dual', subject:(v,CF)=>`Welcome to the ${CF.pairName} Global-Ready Mentoring Programme`,
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `We are delighted to let you know that your application to join the ${CF.progFull} as a mentee is successful. Thank you for the care you put into your application, and welcome.`,'',
      'To confirm your place, please complete a short acknowledgement in the GRMP portal:','',
      `1. Open your personalized link: ${v.link}`,
      '2. Enter the email address you used in your application.',
      '3. We will send a one-time verification code to that email. Enter the code to log in.',
      '4. On your first login, you will be asked to review and acknowledge the Programme Rules and complete a brief Conflict of Interest declaration, and to confirm your attendance at the Kick-Off. This confirms your place.','',
      `Please complete this by ${CF.acceptByLong}.`,'',
      'The GRMP portal is the one place to track your GRMP participation and your wider SMC journey, and you will use it throughout the programme.','',
      'We look forward to the journey ahead, and to welcoming you into this year’s community of mentees.','',
      'Warm regards,'].join('\n')},
  mentor_accept_reminder: {sign:'wk', subject:()=> 'A reminder to confirm your place as a GRMP mentor',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `We are looking forward to welcoming you as a mentor with the ${CF.progFull}, and we noticed that your place is not yet confirmed.`,'',
      `To confirm, please complete the short acknowledgement in the GRMP portal by ${CF.acceptByLong}:`,'',
      `1. Open your personalized link: ${v.link}`,
      '2. Enter the email address you used in your application.',
      '3. We will send a one-time verification code to that email. Enter the code to log in.',
      '4. Review and acknowledge the Programme Rules and complete a brief Conflict of Interest declaration.','',
      `If you did not receive the verification code, please check your spam or junk folder, or email us at ${CF.enquiries} and we will help.`,'',
      'If your circumstances have changed and you are no longer able to take part this cycle, we would be grateful if you could let us know, so that we may offer your place to another mentor.','',
      'Warm regards,'].join('\n')},
  mentee_accept_reminder: {sign:'wk', subject:()=> 'A reminder to confirm your place in GRMP',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `We are looking forward to welcoming you as a mentee with the ${CF.progFull}, and we noticed that your place is not yet confirmed.`,'',
      `To confirm, please complete the short acknowledgement in the GRMP portal by ${CF.acceptByLong}:`,'',
      `1. Open your personalized link: ${v.link}`,
      '2. Enter the email address you used in your application.',
      '3. We will send a one-time verification code to that email. Enter the code to log in.',
      '4. Review and acknowledge the Programme Rules, complete a brief Conflict of Interest declaration, and confirm your attendance at the Kick-Off.','',
      `If you did not receive the verification code, please check your spam or junk folder, or email us at ${CF.enquiries} and we will help.`,'',
      'Places in this cycle are limited. If your circumstances have changed and you are no longer able to take part, we would be grateful if you could let us know, so that we may offer your place to another student.','',
      'Warm regards,'].join('\n')},
  mentor_reserve: {sign:'dual', subject:()=> 'Your GRMP mentor application: an update',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `Thank you for applying to mentor with the ${CF.progFull}, and for your willingness to give your time to our students.`,'',
      'We were genuinely heartened by the response to this cycle. The strength and number of applications were greater than the places we are able to offer, and yours stood out among them. We would like, with your agreement, to place you on our Reserve Mentor list for this cycle.','',
      'What this means: should a mentoring place open during the programme, we may invite you to step in. If we do, we will give you at least two weeks’ notice, along with the materials you need to begin well. We want to be candid that a place may not become available, and a place on the Reserve Mentor list is not a guarantee of participation this cycle.','',
      `Please let us know by ${CF.acceptByLong} whether you are happy to be placed on the Reserve Mentor list. A short reply to ${CF.enquiries} is all we need, and if we do not hear from you, we will assume you would prefer not to be included.`,'',
      'Your interest means a great deal to us, and we hope very much to have the opportunity to welcome you in.','',
      'Warm regards,'].join('\n')},
  mentee_reserve: {sign:'dual', subject:()=> 'Your GRMP mentee application: an update',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `Thank you for applying to join the ${CF.progFull} as a mentee, and for the thought you gave to your application.`,'',
      'We were genuinely heartened by the response to this cycle. The strength and number of applications were greater than the places we are able to offer, and yours stood out among them. We would like, with your agreement, to place you on our Reserve Mentee list for this cycle.','',
      'What this means: should a place open before or during the programme, we may invite you to join. If we do, we will give you as much notice as we can, along with the details you need to begin well. We want to be candid that a place may not become available, and a place on the Reserve Mentee list is not a guarantee of participation this cycle.','',
      `Please let us know by ${CF.acceptByLong} whether you are happy to be placed on the Reserve Mentee list. A short reply to ${CF.enquiries} is all we need, and if we do not hear from you, we will assume you would prefer not to be included.`,'',
      'Your interest means a great deal to us, and we hope very much to have the opportunity to welcome you in.','',
      'Warm regards,'].join('\n')},
  mentor_reserve_activation: {sign:'dual', subject:(v,CF)=>`A place has opened, welcome as an ${CF.pairName} GRMP mentor`,
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `Good news. A mentoring place has opened in this cycle of the ${CF.progFull}, and we would be delighted to welcome you in from our Reserve Mentor list. Thank you for your patience, and for your willingness to step in.`,'',
      'To confirm your place, please complete a short acknowledgement in the GRMP portal:','',
      `1. Open your personalized link: ${v.link}`,
      '2. Enter the email address you used in your application.',
      '3. We will send a one-time verification code to that email. Enter the code to log in.',
      '4. On your first login, you will be asked to review and acknowledge the Programme Rules and complete a brief Conflict of Interest declaration. This confirms your place.','',
      `As this is a later activation, please complete this by ${CF.reserveAcceptByLong} so that we can prepare you for the Kick-Off on ${CF.kickoffLong}.`,'',
      'The GRMP portal is the one place to track your GRMP participation and your wider SMC journey, and you will use it throughout the programme.','',
      'We look forward to the contribution you will make, and to welcoming you into this year’s community of mentors.','',
      'Warm regards,'].join('\n')},
  mentee_reserve_activation: {sign:'dual', subject:(v,CF)=>`A place has opened, welcome to the ${CF.pairName} GRMP`,
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `Good news. A place has opened in this cycle of the ${CF.progFull}, and we would be delighted to welcome you in from our Reserve Mentee list. Thank you for your patience, and for your continued interest.`,'',
      'To confirm your place, please complete a short acknowledgement in the GRMP portal:','',
      `1. Open your personalized link: ${v.link}`,
      '2. Enter the email address you used in your application.',
      '3. We will send a one-time verification code to that email. Enter the code to log in.',
      '4. On your first login, you will be asked to review and acknowledge the Programme Rules, complete a brief Conflict of Interest declaration, and confirm your attendance at the Kick-Off. This confirms your place.','',
      `Please complete this by ${CF.reserveAcceptByLong} so that we can prepare you for the Kick-Off on ${CF.kickoffLong}.`,'',
      'The GRMP portal is the one place to track your GRMP participation and your wider SMC journey, and you will use it throughout the programme.','',
      'We look forward to the journey ahead, and to welcoming you into this year’s community of mentees.','',
      'Warm regards,'].join('\n')},
  mentor_reserve_activation_reminder: {sign:'wk', subject:()=> 'A reminder to confirm your place as a GRMP mentor',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `We are looking forward to welcoming you as a mentor with the ${CF.progFull}, and we noticed that your place is not yet confirmed.`,'',
      `To confirm, please complete the short acknowledgement in the GRMP portal by ${CF.reserveAcceptByLong}:`,'',
      `1. Open your personalized link: ${v.link}`,
      '2. Enter the email address you used in your application.',
      '3. We will send a one-time verification code to that email. Enter the code to log in.',
      '4. Review and acknowledge the Programme Rules and complete a brief Conflict of Interest declaration.','',
      `If you did not receive the verification code, please check your spam or junk folder, or email us at ${CF.enquiries} and we will help.`,'',
      `As places are limited and the programme begins on ${CF.kickoffLong}, we would be grateful if you could confirm as soon as you are able. If your circumstances have changed and you are no longer able to take part, please let us know so that we may offer the place to another mentor.`,'',
      'Warm regards,'].join('\n')},
  mentee_reserve_activation_reminder: {sign:'wk', subject:()=> 'A reminder to confirm your place in GRMP',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `We are looking forward to welcoming you as a mentee with the ${CF.progFull}, and we noticed that your place is not yet confirmed.`,'',
      `To confirm, please complete the short acknowledgement in the GRMP portal by ${CF.reserveAcceptByLong}:`,'',
      `1. Open your personalized link: ${v.link}`,
      '2. Enter the email address you used in your application.',
      '3. We will send a one-time verification code to that email. Enter the code to log in.',
      '4. Review and acknowledge the Programme Rules, complete a brief Conflict of Interest declaration, and confirm your attendance at the Kick-Off.','',
      `If you did not receive the verification code, please check your spam or junk folder, or email us at ${CF.enquiries} and we will help.`,'',
      `As places are limited and the programme begins on ${CF.kickoffLong}, we would be grateful if you could confirm as soon as you are able. If your circumstances have changed and you are no longer able to take part, please let us know so that we may offer the place to another student.`,'',
      'Warm regards,'].join('\n')},
  mentor_decline: {sign:'dual', subject:()=> 'Your GRMP mentor application',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `Thank you for applying to mentor with the ${CF.progFull}, and for the time and thought you gave to your application.`,'',
      'The response to this cycle was exceptional, with many more applications than the places available. After careful consideration, we are not able to offer you a mentoring place this programme cycle.','',
      'This reflects the strength of the pool rather than any shortcoming in your application, and we hope you will stay connected to the SMC community. You are warmly welcome to continue engaging with our network and activities, and you can find out more at https://www.smcmentorship.org/.','',
      'With sincere thanks and warm regards,'].join('\n')},
  mentee_decline_not_selected: {sign:'dual', subject:()=> 'Your GRMP mentee application',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `Thank you for applying to join the ${CF.progFull} as a mentee, and for the time and thought you gave to your application.`,'',
      'The response to this cycle was exceptional, with many more applications than the places available. After careful consideration, we are not able to offer you a place this programme cycle.','',
      'This reflects the strength of the pool rather than any shortcoming in your application, and we hope you will stay connected to the SMC community. You are warmly welcome to continue engaging with our network and activities, and you can find out more at https://www.smcmentorship.org/.','',
      'With sincere thanks and warm regards,'].join('\n')},
  mentee_decline_ineligible: {sign:'dual', subject:()=> 'Your GRMP mentee application',
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `Thank you for your interest in the ${CF.progFull}.`,'',
      `The GRMP mentee programme this cycle is open to current ${CF.inst} undergraduates, and from your application we are not able to offer you a place on this occasion. We are sorry to pass on news that is not what you hoped for.`,'',
      'We would still be glad to have you connected to the SMC community, and you are welcome to explore our wider network and activities at https://www.smcmentorship.org/.','',
      'With warm regards,'].join('\n')},
  otp_code: {sign:null, subject:()=> 'Your GRMP portal verification code',
    body:(v)=>[`Dear ${v.name},`,'',
      `Your one-time verification code is: ${v.code}`,'',
      'Enter it on the portal sign-in screen to continue. If you did not request this code, you can ignore this email.'].join('\n')},
  onboarding: {sign:'wk', subject:(v,CF)=>`Your place in GRMP is confirmed, ${v.name}`,
    body:(v,CF)=>[`Dear ${v.name},`,'',
      'Thank you, your place in the programme is confirmed. Your acknowledgements have been recorded, and your personal page is now your home for the whole cycle: your rotations, your checkpoints and your certificate all live there.','',
      `Your personal link: ${v.link}`,'',
      `We will see you at the Kick-Off on ${CF.kickoffLong}, ${CF.kickoffTime}, ${CF.kickoffVenue}.`,'',
      '[Placeholder pending approved copy: the portal onboarding email is an outstanding content item, shared between mentor and mentee. This confirmation text will be replaced verbatim when the programme team supplies it.]','',
      'Warm regards,'].join('\n')},
};

/* ---------- seed content pools (fictional, varied — never all-same columns) ---------- */
const ORG_POOL = [
  ['DBS','Banking, Finance & Insurance'],['OCBC','Banking, Finance & Insurance'],['UOB','Banking, Finance & Insurance'],['AIA Singapore','Banking, Finance & Insurance'],['GIC','Banking, Finance & Insurance'],
  ['McKinsey','Consulting & Professional Services'],['PwC','Consulting & Professional Services'],['Deloitte','Consulting & Professional Services'],['Accenture','Consulting & Professional Services'],['EY','Consulting & Professional Services'],
  ['KPMG','Accounting, Audit & Tax'],['RSM Singapore','Accounting, Audit & Tax'],
  ['Rajah & Tann','Legal'],['Allen & Gledhill','Legal'],
  ['Grab','Technology, Media & Telecommunications (TMT)'],['Shopee','Technology, Media & Telecommunications (TMT)'],['Singtel','Technology, Media & Telecommunications (TMT)'],['Google','Technology, Media & Telecommunications (TMT)'],['Microsoft','Technology, Media & Telecommunications (TMT)'],['TikTok','Technology, Media & Telecommunications (TMT)'],['Sea Group','Technology, Media & Telecommunications (TMT)'],
  ['P&G','Consumer Goods & Retail (incl. FMCG)'],['Unilever','Consumer Goods & Retail (incl. FMCG)'],['NTUC FairPrice','Consumer Goods & Retail (incl. FMCG)'],
  ['ST Engineering','Manufacturing & Industrials'],['Dyson','Manufacturing & Industrials'],
  ['Keppel','Energy, Utilities & Resources'],['Sembcorp','Energy, Utilities & Resources'],
  ['CapitaLand','Real Estate, Construction & Infrastructure'],['JLL','Real Estate, Construction & Infrastructure'],
  ['Singapore Airlines','Transport, Logistics & Supply Chain'],['PSA International','Transport, Logistics & Supply Chain'],['DHL','Transport, Logistics & Supply Chain'],
  ['SingHealth','Healthcare, Pharmaceuticals & Life Sciences'],['NUHS','Healthcare, Pharmaceuticals & Life Sciences'],['MSD','Healthcare, Pharmaceuticals & Life Sciences'],
  ['MOE','Education & Research'],['NIE','Education & Research'],
  ['EDB','Government, Public Sector & Non-Profit'],['MAS','Government, Public Sector & Non-Profit'],['Temasek Foundation','Government, Public Sector & Non-Profit'],
  ['Mediacorp','Media, Arts, Creative & Entertainment'],['SPH Media','Media, Arts, Creative & Entertainment'],
  ['Marina Bay Sands','Hospitality, Travel & F&B'],['Shangri-La Group','Hospitality, Travel & F&B'],
  ['ERM','Sustainability & ESG'],['GreenLoop (founder)','Sustainability & ESG'],
];
const DESIGNATIONS = ['Vice President','Director','Senior Manager','Head of Department','Partner','Regional Lead','Principal Consultant','Co-founder','Head of Data Science','Senior Counsel','General Manager','Chief of Staff'];
const LEADERSHIP_POOL = [
  'Led a 12-person regional team through a re-organisation',
  'Founded and ran a venture for four years before returning to corporate',
  'Built a graduate hiring programme and mentored every intake',
  'Ran a cross-market product launch across three countries',
  'Managed a P&L and grew a team from 3 to 15',
  'Chaired a professional chapter and ran its mentoring circle',
];
const INTERESTS_POOL = [
  'Career switching, fintech, first-job negotiation',
  'Consulting careers and structured problem solving',
  'Product management and working with engineers',
  'Founding a company, early customers, resilience',
  'Public-sector careers and policy work',
  'Data careers and analytics leadership',
  'Regional careers across South-east Asia',
  'Branding, communications and storytelling',
  'Sustainability careers and ESG reporting',
  'Healthcare management and life sciences',
];
const NATIONALITIES = ['Singaporean','Singaporean','Singaporean','Singaporean','Singaporean','Malaysian','Indian','Chinese','Indonesian','Vietnamese'];
const DEGREES = {
  'Lee Kong Chian School of Business':['BBM, Finance','BBM, Marketing','BBM, Operations Management','BBM, Organisational Behaviour & HR'],
  'School of Accountancy':['BAcc','BAcc, second major in Finance'],
  'School of Computing and Information Systems':['BSc (Information Systems)','BSc (Computer Science)','BSc (Software Engineering)'],
  'School of Economics':['BSc (Economics)','BSc (Economics), second major in Data Science'],
  'School of Social Sciences':['BSocSc (Psychology)','BSocSc (Political Science)','BSocSc (Sociology)'],
  'Yong Pung How School of Law':['LLB'],
  'College of Integrative Studies':['Bachelor of Integrative Studies'],
};
const P1_GROW = ['sharper communication and presence','the confidence to reach out to people I admire','clarity on which industry actually fits me','structured thinking when problems are ambiguous','the discipline to turn reflection into action','comfort operating outside my faculty bubble'];
const P1_MOMENT = [
  'I took real ownership when I rebuilt our case-competition deck two days before finals after our team lead fell sick',
  'I organised a study exchange for juniors in my hall when nobody else stepped up',
  'I turned an internship rejection into a coffee chat that became an informal mentorship',
  'I led my project group through a full restart after our first idea failed validation',
  'I taught myself SQL over one summer to automate my internship reporting',
  'I ran my CCA’s recruitment end to end when our president went on exchange',
];
const P2_PULL = ['how supply chains quietly decide what we can buy','why some teams ship and others stall','how ageing societies will reshape work','how climate policy lands inside ordinary companies','what makes cross-cultural teams click','how technology changes who gets opportunities'];
const P2_SHOW = ['sharing every playbook I pick up with my juniors','organising peer circles so the learning compounds','showing up prepared and making introductions where I can','writing up what I learn so the next batch starts further ahead'];
const DIETARY = ['','','','','vegetarian','halal','no shellfish','no beef','vegan'];
const REVIEW_COMMENTS = ['Strong fit','Thoughtful application','Clear sense of direction','Good energy, some vagueness','Solid, keep an eye on commitment','Prompts read as genuine'];

/* ---------- seed builder ---------- */
function buildSeed(){
  const used = new Set();
  const people = [];
  let seq = 1;
  const slug = s => s.toLowerCase().replace(/[^a-z ]/g,'').trim().replace(/ +/g,'-');
  const isoAt = (date,h,m)=>`${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+08:00`;

  const mk = (kind, appStatus) => {
    const nm = uname(used);
    const id = (kind==='mentor'?'M':'E') + String(seq++).padStart(3,'0');
    const p = {id, kind, name:nm.full, firstName:nm.first, lastName:nm.last,
      email: nm.full.toLowerCase().replace(/[^a-z ]/g,'').replace(/ +/g,'.') + (kind==='mentor'?'@example.com':'@smu.example.edu'),
      mobile: '+65 9'+String(100+Math.floor(rnd()*900))+' '+String(1000+Math.floor(rnd()*9000)),
      nationality: pick(NATIONALITIES),
      linkedin: 'linkedin.com/in/'+slug(nm.full),
      appStatus, submittedAt:'2026-09-0'+(1+Math.floor(rnd()*9)),
      ack:null, source:'form'};
    p.pdpaAt = isoAt(p.submittedAt, 9+Math.floor(rnd()*11), Math.floor(rnd()*60));
    if(kind==='mentor'){
      const posting = pick(ORG_POOL);
      const returning = rnd()<0.22;
      Object.assign(p,{org:posting[0], designation:pick(DESIGNATIONS), industry:posting[1],
        heard: returning ? FORM_OPTS.heardMentor[0] : pick(FORM_OPTS.heardMentor.slice(1)),
        returning,
        interests: pick(INTERESTS_POOL),
        draws: pickN(FORM_OPTS.draws, 1+Math.floor(rnd()*3)),
        anythingElse:'',
        commit:'yes', whatsappConsent: rnd()<0.9?'Yes':'No'});
      if(p.whatsappConsent==='No') p.contactPref = pick(['Telegram','Email']);
      if(!returning){
        Object.assign(p,{yearsExp:pick(FORM_OPTS.yearsExp.slice(1)), ledTeam:'Yes',
          leadership:pick(LEADERSHIP_POOL), crossIndustry:pick(FORM_OPTS.crossIndustry),
          priorMentoring: rnd()<0.6?'Yes':'No'});
      }
      p.background = `${p.yearsExp||'previous-cycle mentor'}${p.yearsExp?' of experience':''} in ${p.industry===INDUSTRIES[16]?'their field':p.industry}`;
    }else{
      const fac = pick(FACULTIES);
      Object.assign(p,{university:'SMU', faculty:fac, faculty2:'Not applicable',
        degree:pick(DEGREES[fac]), year:pick(['Year 1','Year 2','Year 2','Year 3','Year 3','Year 4']),
        eligibilityConfirmed:true,
        heard:pick(FORM_OPTS.heardMentee),
        prompt1:`Six months from now I hope to have grown ${pick(P1_GROW)}. ${pick(P1_MOMENT)}, and I want to keep building that muscle with a mentor who will hold me to it.`,
        prompt2:`I keep getting pulled toward ${pick(P2_PULL)}. Beyond my own field I read widely and ask a lot of questions. In this community I would want to show up by ${pick(P2_SHOW)}.`,
        industryPrefs: pickN(INDUSTRIES.slice(0,16), 3),
        commit:'yes', telegramConsent: rnd()<0.92?'Yes':'No'});
      if(p.heard===FORM_OPTS.heardMentee[0]) p.referrer = uname(used).full;
      if(p.telegramConsent==='No') p.contactPref = pick(['Email','Phone']);
    }
    people.push(p); return p;
  };

  // Mentors: 60 accepted + 8 Reserve Mentor list + 3 declined + 2 fresh submitted
  const mentors = [];
  for(let i=0;i<60;i++) mentors.push(mk('mentor','accepted'));
  const mentorReserve = []; for(let i=0;i<8;i++) mentorReserve.push(mk('mentor','reserve_invited'));
  mentorReserve.forEach((m,i)=>{ m.reserveOptIn = i<6 ? true : null; if(m.reserveOptIn) m.reserveRepliedAt='2026-09-2'+(0+i%4); });
  for(let i=0;i<3;i++) mk('mentor','declined');
  for(let i=0;i<2;i++) mk('mentor','submitted');

  // Mentees: 60 accepted (cap) + 8 Reserve Mentee list + 3 declined-not-selected + 1 declined-ineligible + 2 fresh submitted
  const mentees = [];
  for(let i=0;i<60;i++) mentees.push(mk('mentee','accepted'));
  const menteeReserve = []; for(let i=0;i<8;i++) menteeReserve.push(mk('mentee','reserve_invited'));
  menteeReserve.forEach((m,i)=>{ m.reserveOptIn = i<4 ? true : (i<7 ? null : false); if(m.reserveOptIn!==null) m.reserveRepliedAt='2026-09-2'+(1+i%3); });
  for(let i=0;i<3;i++) mk('mentee','declined_not_selected');
  const inel = mk('mentee','declined_ineligible'); inel.eligibilityConfirmed=false; inel.email=inel.email.replace('@smu.example.edu','@example.com');
  for(let i=0;i<2;i++) mk('mentee','submitted');

  /* Acceptance gate (Rules + COI + Kick-Off, separately timestamped): everyone accepted
     has completed it EXCEPT 2 late mentees (blocked-at-the-gate demo + reminder target). */
  const lateAck = pickN(mentees.filter(e=>e.appStatus==='accepted'),2);
  const kickoffExceptions = [];
  people.filter(p=>p.appStatus==='accepted').forEach(p=>{
    if(lateAck.includes(p)) return;                          // gate untouched — place NOT confirmed
    const d = '2026-09-'+String(17+Math.floor(rnd()*8)).padStart(2,'0');
    const hh = 9+Math.floor(rnd()*12), mm = Math.floor(rnd()*60);
    p.ack = {rules:isoAt(d,hh,mm), coi:isoAt(d,hh,Math.min(59,mm+2)), kickoff:isoAt(d,hh,Math.min(59,mm+4))};
    p.coi = {declared:false, details:''};
    p.kickoff = {status:'confirmed'};
    p.placeConfirmedAt = d;
    if(rnd()<0.4) p.kickoffLogistics = {arrival: rnd()<0.15?'arriving around 7.45 pm from work':'', dietary: pick(DIETARY)};
  });
  // one declared conflict (visible to the Lead in matching), three Kick-Off exceptions
  const coiCase = mentors.find(m=>m.appStatus==='accepted'&&m.ack);
  coiCase.coi = {declared:true, details:'My niece is an SMU undergraduate who may apply as a mentee this cycle.'};
  const exc1 = mentors.filter(m=>m.appStatus==='accepted'&&m.ack)[3];
  exc1.kickoff = {status:'exception_requested', reason:'I am overseas for work that entire week; I can join the first mentoring session the week after.'};
  kickoffExceptions.push(exc1.id);
  const exc2 = mentees.filter(e=>e.appStatus==='accepted'&&e.ack)[5];
  exc2.kickoff = {status:'exception_requested', reason:'I have a family commitment that evening and cannot attend in person.'};
  exc2.kickoff.resolved = {outcome:'waived', by:'Wei Kiat', at:'2026-09-26'};
  kickoffExceptions.push(exc2.id);

  /* reviews: every non-fresh applicant has 2 reviewer scores against the criteria */
  const REVIEWERS = {mentor:['Esther','Wei Kiat','Kenzie','Yu Tong'], mentee:['Esther','Wei Kiat','Portia','Sapranshu']};
  const reviews = [];
  people.forEach(p=>{
    if(p.appStatus==='submitted') return;
    const crits = (p.kind==='mentor'?MENTOR_CRITERIA:MENTEE_CRITERIA).filter(c=>c.scored);
    pickN(REVIEWERS[p.kind],2).forEach(rv=>{
      const criteria = {}; crits.forEach(c=>{ criteria[c.key] = 3+Math.floor(rnd()*3); });
      const avg = Math.round(Object.values(criteria).reduce((s,x)=>s+x,0)/crits.length*10)/10;
      reviews.push({personId:p.id,reviewer:rv,score:avg,comment:pick(REVIEW_COMMENTS),criteria});
    });
  });

  /* pairs — R1 (closed) + R2 (running). ≤2 mentees/mentor, no repeat mentor; the seed
     prefers industry-preference fits the way the matching engine would. */
  const activeMentors = mentors.filter(m=>m.appStatus==='accepted');
  const activeMentees = mentees.filter(e=>e.appStatus==='accepted');
  const pairs=[]; let pid=1;
  const capUsed = {};                                          // rotation -> mentorId -> count
  const history = {};                                          // menteeId -> Set(mentorId)
  function pairUp(rotation, mentee, statusPlan){
    const cands = activeMentors.filter(m=>(capUsed[rotation]?.[m.id]||0) < 2
      && !(history[mentee.id]?.has(m.id)));
    if(!cands.length) return null;
    const pref = cands.filter(m=>(mentee.industryPrefs||[]).includes(m.industry));
    const mentor = (pref.length && rnd()<0.75) ? pick(pref) : pick(cands);
    capUsed[rotation]=capUsed[rotation]||{}; capUsed[rotation][mentor.id]=(capUsed[rotation][mentor.id]||0)+1;
    history[mentee.id]=history[mentee.id]||new Set(); history[mentee.id].add(mentor.id);
    const prefIx = (mentee.industryPrefs||[]).indexOf(mentor.industry);
    const pr={id:'P'+String(pid++).padStart(3,'0'), rotation, mentorId:mentor.id, menteeId:mentee.id,
      status:statusPlan,
      approvedAt: rotation===1 ? '2026-09-'+String(24+Math.floor(rnd()*5)).padStart(2,'0')
                               : '2026-11-'+String(26+Math.floor(rnd()*5)).padStart(2,'0'),
      rationale:[ prefIx>=0
          ? `${['First','Second','Third'][prefIx]}-preference industry: mentee chose ${mentor.industry}; mentor brings ${mentor.background} at ${mentor.org}`
          : `Mentor brings ${mentor.background} at ${mentor.org}; breadth and availability fit`,
        `Capacity and no-repeat checks passed`]};
    pairs.push(pr); return pr;
  }
  // R1: everyone paired EXCEPT the gate-blocked (place not confirmed → never matched)
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
  const r1MissingMentees = new Set(r1Missing.map(p=>p.menteeId));
  const preview = pickN(activeMentees.filter(e=>!unmatchedR2.includes(e) && !r1MissingMentees.has(e.id)),2);
  preview.forEach(e=>{
    const pr2 = pairs.find(p=>p.rotation===2 && p.menteeId===e.id);
    if(pr2){pr2.status='closed'; pr2.closeoff={metTwice:true,reflectionDone:true,at:'2026-12-14',comment:''};}
    const p3=pairUp(3,e,'closed'); if(p3){p3.approvedAt='2027-02-01';p3.closeoff={metTwice:true,reflectionDone:true,at:'2027-03-10',comment:''};p3.preview=true;}
    e.previewFastForward = true;
  });
  /* Their paperwork must exist too, or Submissions sits empty and the preview stops
     half-way. One preview mentee gets her Builder's Commitment (happy path on
     Certificates); the other stays without (the ✗ shows what the rule still demands). */
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

  /* events — Kick-Off details are spec-confirmed constants */
  const confirmedIds = people.filter(p=>p.appStatus==='accepted' && p.kickoff && p.kickoff.status==='confirmed').map(p=>p.id);
  const events = {
    kickoff:      {name:'Kick-Off Night', date:'2026-10-01', time:'7.30 p.m. to 9.00 p.m.', venue:'SMU ALCove, 80 Stamford Road, #B1-62, Singapore 178902', attendance:pickN(confirmedIds, Math.floor(confirmedIds.length*0.9))},
    appreciation: {name:'Appreciation Night', date:'2027-03-26', venue:'to be confirmed', attendance:[]},
  };

  /* concerns: 1 sample referral */
  const concerns = [{id:'C001', at:'2026-11-18', from:'(mentee — identity visible to Escalation Owner only)',
    summary:'Raised a concern about repeated last-minute cancellations', status:'referred to SMC Grievance process'}];

  /* email log (what the system sent, template-rendered — open any row to read the verbatim body) */
  const sampleAcceptM = mentors[0], sampleAcceptE = mentees[0];
  const sampleReserveM = mentorReserve[0], sampleReserveE = menteeReserve[0];
  const lateOne = lateAck[0];
  const emails = [
    {at:'2026-08-20', to:'mentor invitation list (mail-merge)', tpl:'mentor_invite', vars:{name:'[Name]'}, kind:'invite'},
    {at:'2026-08-20', to:'mentee invitation list (mail-merge)', tpl:'mentee_invite', vars:{name:'[Name]'}, kind:'invite'},
    {at:sampleAcceptM.submittedAt, to:sampleAcceptM.email, tpl:'mentor_receipt', vars:{name:sampleAcceptM.name}, kind:'receipt'},
    {at:sampleAcceptE.submittedAt, to:sampleAcceptE.email, tpl:'mentee_receipt', vars:{name:sampleAcceptE.name}, kind:'receipt'},
    {at:'2026-09-16', to:sampleAcceptM.email, tpl:'mentor_accept', vars:{name:sampleAcceptM.name, link:'#/me/'+sampleAcceptM.id}, kind:'decision'},
    {at:'2026-09-16', to:sampleAcceptE.email, tpl:'mentee_accept', vars:{name:sampleAcceptE.name, link:'#/me/'+sampleAcceptE.id}, kind:'decision'},
    {at:'2026-09-16', to:sampleReserveM.email, tpl:'mentor_reserve', vars:{name:sampleReserveM.name}, kind:'decision'},
    {at:'2026-09-16', to:sampleReserveE.email, tpl:'mentee_reserve', vars:{name:sampleReserveE.name}, kind:'decision'},
    {at:'2026-09-23', to:lateOne.email, tpl:'mentee_accept_reminder', vars:{name:lateOne.name, link:'#/me/'+lateOne.id}, kind:'reminder'},
    {at:'2026-09-28', to:'all matched pairs', subject:'Your Rotation 1 match — Know Yourself', kind:'match'},
    {at:'2026-11-25', to:'mentees', subject:'Rotation 1 close-off — two quick confirmations', kind:'closeoff'},
    {at:'2026-11-30', to:'all matched pairs', subject:'Your Rotation 2 match — Know Your World', kind:'match'},
  ];
  lateOne.acceptReminderAt = '2026-09-23';

  /* preset accounts: 6 admins + 5 participant personas (picked deterministically) */
  const acctGate = lateAck[1];
  const acctFF   = people.find(p=>p.previewFastForward);
  const acctMid  = (pairs.find(x=>x.rotation===2&&x.status==='approved'&&!people.find(pp=>pp.id===x.menteeId).previewFastForward)||{}).menteeId;
  const acctMentor = (pairs.find(x=>x.rotation===2&&x.status==='approved')||{}).mentorId;
  const acctReserve = mentorReserve.find(m=>m.reserveOptIn===true);
  const accounts = [
    {u:'esther',   pass:'grmp2026', kind:'admin', name:'Esther',    label:'Programme Owner'},
    {u:'weikiat',  pass:'grmp2026', kind:'admin', name:'Wei Kiat',  label:'Programme Lead'},
    {u:'kenzie',   pass:'grmp2026', kind:'admin', name:'Kenzie',    label:'Mentor Reviewer (SMU)'},
    {u:'yutong',   pass:'grmp2026', kind:'admin', name:'Yu Tong',   label:'Mentor Reviewer (SMU)'},
    {u:'portia',   pass:'grmp2026', kind:'admin', name:'Portia',    label:'Mentee Reviewer (SMU)'},
    {u:'sapranshu',pass:'grmp2026', kind:'admin', name:'Sapranshu', label:'Mentee Reviewer (SMU)'},
    {u:'mentee.new',  pass:'grmp2026', kind:'person', personId:acctGate.id,  label:'Mentee — accepted, place not yet confirmed (gate ahead)'},
    {u:'mentee.mid',  pass:'grmp2026', kind:'person', personId:acctMid,      label:'Mentee — mid-cycle (close-off due)'},
    {u:'mentee.done', pass:'grmp2026', kind:'person', personId:acctFF.id,    label:'Mentee — end of journey (certificate path)'},
    {u:'mentor.active',pass:'grmp2026',kind:'person', personId:acctMentor,   label:'Mentor — active with mentees'},
    {u:'mentor.bench', pass:'grmp2026', kind:'person', personId:acctReserve.id, label:'Mentor — Reserve Mentor list (opted in)'},
  ];

  return {
    version:1, today:TODAY,
    archives:[], aiCache:{}, sessions:{},
    config:{
      cohort:{id:'C2026', label:'GRMP 2026 (SMU pilot)'},
      // Briefing recordings (optional resource, NOT a gate — the binding Kick-Off
      // confirmation lives in the acceptance gate per the post-selection specs).
      orientationVideo:'', orientationVideoMentor:'',
      registration:{opens:'2026-09-01', closes:'2026-09-10'},
      /* R5 selection timeline — spec-confirmed constants (Standards note §1) */
      selection:{approvalsBy:'2026-09-16', outcomeBy:'2026-09-18', acceptBy:'2026-09-26',
                 reserveAcceptBy:'2026-09-29', reminderOn:'2026-09-23', menteeCap:60},
      mail:{from:'SMC GRMP Team', replyTo:'smu.smc@sa.smu.edu.sg'},
      signatories:[
        {name:'Esther Koh', titles:['Chief, SMC HR & Transformation']},
        {name:'Wei Kiat Koh', titles:['Vice President External, SMU–SMC','GRMP Programme Lead']},
      ],
      accounts,
      cycle:'GRMP 2026 (SMU pilot)',
      rotations:[{n:1,label:'Know Yourself',start:'2026-10-01',end:'2026-11-30'},
                 {n:2,label:'Know Your World',start:'2026-12-01',end:'2027-01-31'},
                 {n:3,label:'Know Your Path',start:'2027-02-01',end:'2027-03-31'}],
      ackLadder:[{date:'2026-09-23',what:'Acceptance reminder — sent once, no same-day nudge (confirmed)',who:'accepted, place not yet confirmed'},
                 {date:'2026-09-27',what:'Reserve-activation reminder — one to two days before the activation deadline',who:'activated reserves, place not yet confirmed'}],
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
        Q3:{title:'Matching signals now follow the application specs: three ranked industry preferences on the mentee form, matched against the mentor’s industry on the same 17-option list, plus breadth and diversity. The earlier three-track model (our addition) is removed. Scoring weights remain a first cut to tune with the team.', inferred:true, settled:{by:'Joanne (spec)', on:'2026-08-14', via:'Mentee Application Spec — industry preferences replace tracks'}},
        Q4:{title:'Application forms now follow Joanne’s specs verbatim: staged 4-step mentor and mentee applications, PDPA collected once at application, no save-and-resume (completed in one sitting).', inferred:true, settled:{by:'Joanne (spec)', on:'2026-08-14', via:'Mentor/Mentee Application Specs — built as specified'}},
        Q5:{title:'No acknowledgement after the final reminder → treated as withdrawn, seat freed', inferred:true, settled:{by:'Wei Kiat', on:'2026-08-04', via:'confirmed in-app'}},
        Q6:{title:'Concern link on every public page + the acknowledgement page. Primary recipient: Wei Kiat (Programme Lead, first point of contact); Esther as alternate escalation where further review is needed.', inferred:true, settled:{by:'Esther', on:'2026-08-06', via:'feedback F0806-174654'}},
        Q7:{title:'Lean scope: no pair/meeting/availability tracking, no kickoff-goals form, no reflection content stored', inferred:true, settled:{by:'Wei Kiat', on:'2026-08-04', via:'confirmed in-app'}},
        Q8:{title:'Registration 1–10 Sept 2026 · Kick-Off Night 1 Oct 2026, 7.30–9.00 pm at SMU ALCove · Appreciation Night 26 Mar 2027.', inferred:true, settled:{by:'Wei Kiat', on:'2026-08-04', via:'group message — dates entered into the system'}},
        Q9:{title:'Approval auto-issues the acceptance email (approval and invitation are one action, no separate send step) — the spec marks this [CONFIRM]; it is running as the default.', inferred:true},
        Q10:{title:'Draft-saving on the application forms is removed: the specs confirm no save-and-resume (no applicant login, so no identity to attach a partial record to). This supersedes the earlier draft behaviour built from feedback F0806-205424; a browser leave-site warning guards accidental loss instead.', inferred:true, settled:{by:'Joanne (spec)', on:'2026-08-14', via:'Portal Capability & Technical Assumptions §1 [CONFIRMED]'}},
        Q11:{title:'Orientation videos are an optional briefing resource, not a gate: the binding step is the acceptance gate (Rules + COI + Kick-Off attendance), per the post-selection specs. Kick-Off exceptions route to Esther Koh and Wei Kiat Koh.', inferred:true, settled:{by:'Joanne (spec)', on:'2026-08-14', via:'Post-Selection Specs §2.1 — gate defines confirmation'}},
        Q12:{title:'Visual styling deliberately stays as the current neutral theme: the specs say do not invent a brand theme, and SMC brand guidelines/assets are an outstanding input (owner: SMC comms lead). Restyle lands when the assets do.', inferred:true},
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
  /* R5: place confirmed = the acceptance gate is complete (Rules + COI + Kick-Off,
     each separately timestamped). This is the single definition the dashboard, the
     reminders, matching eligibility and the release rule all read. */
  ackComplete:p=>p.ack && ['rules','coi','kickoff'].every(d=>p.ack[d]),
  placeConfirmed:p=>D.ackComplete(p),
  gateBlocked:p=>['accepted'].includes(p.appStatus) && !D.ackComplete(p),
  currentRotation:db=>{const t=db.today;return db.config.rotations.find(r=>t>=r.start&&t<=r.end)||null},
  pairsFor:(db,personId)=>db.pairs.filter(p=>p.mentorId===personId||p.menteeId===personId),
  logAudit(db, at, actor, action, entity){
    db.audit.push({at, ts:new Date().toISOString(), actor, action, entity});
  },
  wordCount:s=>String(s||'').trim().split(/\s+/).filter(Boolean).length,
  /* ---- cohort facts: the single source for every user-visible cohort number, date,
     institution name and window. Views must read from here, never carry a literal. ---- */
  shiftDate:(iso,days)=>{const d=new Date(iso+'T00:00:00Z'); d.setUTCDate(d.getUTCDate()+days); return d.toISOString().slice(0,10)},
  monthName:iso=>['January','February','March','April','May','June','July','August','September','October','November','December'][Number(iso.slice(5,7))-1],
  monthShort:iso=>D.monthName(iso).slice(0,4)==='Sept'?'Sept':D.monthName(iso).slice(0,3),
  fmtDMY:iso=>`${Number(iso.slice(8,10))} ${D.monthShort(iso)} ${iso.slice(0,4)}`,
  fmtLong:iso=>`${Number(iso.slice(8,10))} ${D.monthName(iso)} ${iso.slice(0,4)}`,
  registrationOpen(db){
    const r=db.config.registration;
    return !r || (db.today>=r.opens && db.today<=r.closes);
  },
  cohortFacts(db){
    const c=db.config, r=c.rotations, label=c.cohort.label;
    const short=label.replace(/\s*\(.*\)\s*/,'').trim();
    const inst=(label.match(/\(([^)]*?)(?:\s+pilot)?\)/i)||[])[1]||'';
    const sel=c.selection||{};
    const kickoff=(db.events&&db.events.kickoff&&db.events.kickoff.date)||r[0].start;
    const appre = db.events && db.events.appreciation && db.events.appreciation.date;
    const span = (a,b)=>`${D.monthName(a)} ${a.slice(0,4)!==b.slice(0,4)?a.slice(0,4)+' ':''}to ${D.monthName(b)} ${b.slice(0,4)}`;
    return {label, short, inst,
      pairName: inst ? inst+'–SMC' : 'SMC',
      progFull: (inst ? inst+'–SMC' : 'SMC')+' Global-Ready Mentoring Programme (GRMP)',
      enquiries: (c.mail&&c.mail.replyTo)||'smu.smc@sa.smu.edu.sg',
      mailFrom: (c.mail&&c.mail.from)||'SMC GRMP Team',
      appreciationDate: appre ? `${D.monthName(appre)} ${appre.slice(8,10).replace(/^0/,'')}, ${appre.slice(0,4)}` : null,
      mentors: db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='accepted').length,
      mentees: db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted').length,
      reserveN: db.people.filter(p=>p.appStatus==='reserve_invited').length,
      menteeCap: sel.menteeCap||60,
      spanLong:`${D.monthName(r[0].start)} ${r[0].start.slice(0,4)} to ${D.monthName(r[2].end)} ${r[2].end.slice(0,4)}`,
      spanMonths:`${D.monthName(r[0].start)} to ${D.monthName(r[2].end)}`,
      cycleSpanLong:`${D.fmtLong(r[0].start)} to ${D.fmtLong(r[2].end)}`,
      cycleSpanDash:`${D.fmtLong(r[0].start)} – ${D.fmtLong(r[2].end)}`,
      r1Span:span(r[0].start,r[0].end), r2Span:span(r[1].start,r[1].end), r3Span:span(r[2].start,r[2].end),
      applyMonth:D.monthName((c.registration&&c.registration.opens)||r[0].start),
      applyShort:D.monthShort((c.registration&&c.registration.opens)||r[0].start),
      regWindow: c.registration ? `${Number(c.registration.opens.slice(8,10))}–${Number(c.registration.closes.slice(8,10))} ${D.monthShort(c.registration.opens)}` : '',
      regCloses: c.registration ? c.registration.closes : '',
      applyClosesLong: c.registration ? D.fmtLong(c.registration.closes) : '',
      approvalsByLong: sel.approvalsBy ? D.fmtLong(sel.approvalsBy) : '',
      outcomeByLong: sel.outcomeBy ? D.fmtLong(sel.outcomeBy) : '',
      acceptBy: sel.acceptBy||'', acceptByLong: sel.acceptBy ? D.fmtLong(sel.acceptBy) : '',
      reserveAcceptBy: sel.reserveAcceptBy||'', reserveAcceptByLong: sel.reserveAcceptBy ? D.fmtLong(sel.reserveAcceptBy) : '',
      kickoffShort:D.monthShort(kickoff), kickoffLong:D.fmtLong(kickoff),
      kickoffTime:(db.events&&db.events.kickoff&&db.events.kickoff.time)||'',
      kickoffVenue:(db.events&&db.events.kickoff&&db.events.kickoff.venue)||'',
      r1Short:D.monthShort(r[0].start), endShort:D.monthShort(r[2].end),
      midMonth:D.monthName(r[1].end), closingMonth:D.monthName(r[2].end),
      midR2:D.shiftDate(r[1].start,14), r3Start:r[2].start, closingWeek:D.shiftDate(r[2].end,-11),
      cycleEnd:r[2].end};
  },
  capacityLeft:(db,mentorId,rotation)=>2 - db.pairs.filter(p=>p.rotation===rotation&&p.mentorId===mentorId&&p.status!=='rejected').length,
  repeatMentor:(db,menteeId,mentorId)=>db.pairs.some(p=>p.menteeId===menteeId&&p.mentorId===mentorId&&p.status!=='rejected'),
  menteeCloseoffs:(db,menteeId)=>db.pairs.filter(p=>p.menteeId===menteeId&&p.status==='closed'&&p.closeoff),
  /* Owner-decided rule (F0806-172216). Certificates are presented physically at
     Appreciation Night; "issuing" here records qualification and readiness. */
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
  approveByException(db, personId, reason, actor){
    const p=D.person(db,personId);
    if(!p || db.certificates.some(c=>c.personId===personId)) return null;
    const missing=D.certMissing(db,p);
    if(!missing.length) return null;
    if(!reason || !String(reason).trim()) return null;
    db.certificates.push({personId, at:db.today,
      byException:{by:actor, reason:String(reason).trim().slice(0,300), missing}});
    db.emails.push({at:db.today,to:p.email,kind:'certificate',
      subject:`Your ${db.config.cohort.label.replace(/\s*\(.*\)\s*/,'')} certificate (approved by exception), ${p.name}`});
    D.logAudit(db, db.today, actor, 'certificate_by_exception:'+missing.join('+'), personId);
    return db.certificates[db.certificates.length-1];
  },
  aiSummary:p=>{                                   // simulated AI output, clearly labelled in UI
    if(p.kind==='mentor')
      return `${p.designation||''} at ${p.org} (${p.background}). Led a team: ${p.ledTeam||(p.returning?'returning mentor':'—')}. ${p.leadership||''} Offers: ${p.interests||''}. Draws: ${(p.draws||[]).join('; ')}. No flags.`;
    return `${p.university||''} ${p.faculty||''}, ${p.degree||''}, ${p.year||''}. Industry preferences: ${(p.industryPrefs||[]).join(' → ')}. Prompt 1: ${String(p.prompt1||'').slice(0,110)}… No flags.`;
  },
  /* ---- matching (R5): industry preference → breadth → diversity ----
     The mentee's three ranked industry preferences (same 17-option list the mentor
     self-classifies on) are the primary signal; each reason quoted in the rationale
     is the actual scoring reason, not a template written after the fact. */
  matchScore(db, mentor, mentee){
    const reasons=[]; let score=0;
    const prefs = mentee.industryPrefs||[];
    const ix = prefs.indexOf(mentor.industry);
    if(ix===0){ score+=10; reasons.push(`First-preference industry: mentee chose ${mentor.industry}; mentor brings ${mentor.background} at ${mentor.org}`); }
    else if(ix===1){ score+=6; reasons.push(`Second-preference industry: mentee chose ${mentor.industry}; mentor brings ${mentor.background} at ${mentor.org}`); }
    else if(ix===2){ score+=3; reasons.push(`Third-preference industry: mentee chose ${mentor.industry}; mentor brings ${mentor.background} at ${mentor.org}`); }
    if(mentor.crossIndustry==='Yes, significantly'){ score+=2;
      reasons.push('Breadth: mentor has worked significantly across industries, markets, cultures or communities'); }
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
    if(!lines.length) lines.push('No industry-preference signal separates this mentor from the rest of the pool — ranked on breadth, diversity and availability');
    lines.push(`Ranked 1st of ${poolSize} eligible mentors (industry preference → breadth → diversity); capacity, conflict and no-repeat checks passed`);
    return lines;
  },
  aiRationale:(db,mentor,mentee)=>{
    const s=D.matchScore(db,mentor,mentee);
    return s.reasons.length? s.reasons.slice(0,2)
      : [`Mentor brings ${mentor.background} at ${mentor.org}; breadth and availability fit`];
  },
  /* ---- R5 application intake (no drafts: the specs confirm no save-and-resume; an
     invalid submission returns its missing list and creates NOTHING) ---- */
  submitApplication(db, kind, fields){
    const f = fields||{};
    const missing = [];
    const need = (k,ok)=>{ if(!ok) missing.push(k); };
    need('email', f.email && /.+@.+\..+/.test(f.email));
    need('firstName', f.firstName && String(f.firstName).trim().length<=50);
    need('lastName', f.lastName && String(f.lastName).trim().length<=50);
    need('phone', f.phone && /^[+\d][\d\s+]{6,18}$/.test(String(f.phone).trim()));
    need('nationality', f.nationality);
    need('heard', f.heard);
    if(f.heard && /referred/.test(f.heard)) need('referrer', f.referrer);
    need('pdpa', !!f.pdpa);
    need('commit', f.commit);
    if(kind==='mentee'){
      need('linkedin', f.linkedin);
      need('year', f.year);
      need('faculty', f.faculty);
      need('degree', f.degree);
      need('eligibilityConfirmed', !!f.eligibilityConfirmed);
      need('prompt1', f.prompt1 && D.wordCount(f.prompt1)<=200);
      need('prompt2', f.prompt2 && D.wordCount(f.prompt2)<=200);
      const prefs=(f.industryPrefs||[]).filter(Boolean);
      need('industryPrefs', prefs.length===3 && new Set(prefs).size===3);
      need('telegramConsent', f.telegramConsent);
      if(f.telegramConsent==='No') need('contactPref', f.contactPref);
    } else {
      need('org', f.org);
      need('designation', f.designation);
      need('industry', f.industry);
      need('linkedin', f.linkedin);
      const returning = f.heard===FORM_OPTS.heardMentor[0];
      if(!returning){
        need('yearsExp', f.yearsExp);
        need('ledTeam', f.ledTeam);
        need('leadership', f.leadership);
        need('crossIndustry', f.crossIndustry);
        need('priorMentoring', f.priorMentoring);
      }
      need('draws', (f.draws||[]).length>=1);
      need('interests', f.interests);
      need('whatsappConsent', f.whatsappConsent);
      if(f.whatsappConsent==='No') need('contactPref', f.contactPref);
    }
    if(missing.length) return {person:null, missing};
    const id=(kind==='mentor'?'M':'E')+String(900+db.people.filter(p=>p.id[0]===(kind==='mentor'?'M':'E')).length);
    const name = `${String(f.firstName).trim()} ${String(f.lastName).trim()}`;
    const p={id,kind,name,appStatus:'submitted',submittedAt:db.today,ack:null,source:'form',
      pdpaAt:new Date().toISOString(), ...f, mobile:f.phone};
    // Conditional fields that never rendered arrive as undefined — strip them, or the
    // shared-database write for the whole people slice is rejected downstream.
    Object.keys(p).forEach(k=>{ if(p[k]===undefined) delete p[k]; });
    if(kind==='mentor'){
      p.returning = f.heard===FORM_OPTS.heardMentor[0];
      p.background = `${p.yearsExp||'previous-cycle mentor'}${p.yearsExp?' of experience':''} in ${p.industry===INDUSTRIES[16]?(p.industryOther||'their field'):p.industry}`;
    } else { p.university = D.cohortFacts(db).inst||'SMU'; }
    // A3: a second application on a known email flags BOTH records for a human —
    // never silently merged and never rejected.
    const clash = f.email ? db.people.filter(x=>x.email && x.email.toLowerCase()===String(f.email).toLowerCase()) : [];
    if(clash.length){
      p.duplicateOf = clash[0].id;
      clash.forEach(x=>{ x.duplicateFlag = true; });
      p.duplicateFlag = true;
      D.logAudit(db, db.today, 'system', 'duplicate_email_flagged', id);
    }
    db.people.push(p);
    db.emails.push({at:db.today,to:p.email,tpl:kind==='mentor'?'mentor_receipt':'mentee_receipt',
      vars:{name:p.name}, kind:'receipt'});
    D.logAudit(db, db.today, 'system', 'application_submitted', id);
    return {person:p,missing:[]};
  },
  score(db, personId, reviewer, score, comment, criteria){
    db.reviews.push({personId,reviewer,score,comment,criteria:criteria||null});
    D.logAudit(db, db.today, reviewer, 'scored', personId);
  },
  /* R5 decisions: approval auto-issues the outcome email (approval and invitation are a
     single action — spec flow stage 0, running as default Q9). Decline is per-variant. */
  decide(db, personId, decision, actor){
    const p=D.person(db,personId); if(!p) return null;
    const CF=D.cohortFacts(db);
    let tpl=null;
    if(decision==='accepted'){ tpl = p.kind+'_accept'; p.acceptedAt=db.today; }
    else if(decision==='reserve_invited'){ tpl = p.kind+'_reserve'; p.reserveOptIn=null; }
    else if(decision==='declined' && p.kind==='mentor'){ tpl='mentor_decline'; }
    else if(decision==='declined_not_selected' && p.kind==='mentee'){ tpl='mentee_decline_not_selected'; }
    else if(decision==='declined_ineligible' && p.kind==='mentee'){ tpl='mentee_decline_ineligible'; }
    else return null;                                        // wrong variant for this kind
    p.appStatus=decision;
    db.emails.push({at:db.today,to:p.email,tpl,vars:{name:p.name,link:'#/me/'+p.id},kind:'decision'});
    D.logAudit(db, db.today, actor, 'decision:'+decision, personId);
    return p;
  },
  /* Reserve list mechanics: the reply lands by email (spec: "a short reply is all we
     need") — the team records it here; activation issues the activation acceptance
     email with the later deadline. */
  recordReserveReply(db, personId, optIn, actor){
    const p=D.person(db,personId);
    if(!p || p.appStatus!=='reserve_invited') return null;
    p.reserveOptIn = !!optIn; p.reserveRepliedAt = db.today;
    D.logAudit(db, db.today, actor, 'reserve_reply:'+(optIn?'opted_in':'declined'), personId);
    return p;
  },
  activateReserve(db, personId, actor){
    const p=D.person(db,personId);
    if(!p || p.appStatus!=='reserve_invited') return null;
    p.appStatus='accepted'; p.activatedFromReserve=db.today;
    db.emails.push({at:db.today,to:p.email,tpl:p.kind+'_reserve_activation',
      vars:{name:p.name,link:'#/me/'+p.id},kind:'activation'});
    D.logAudit(db, db.today, actor, 'reserve_activated', personId);
    return p;
  },
  /* Acceptance reminders — sent ONCE per person (confirmed: no final same-day nudge),
     only to accepted people whose place is not yet confirmed. Activated reserves get
     the compressed activation-reminder variant. */
  reminderTargets(db){
    return db.people.filter(p=>p.appStatus==='accepted' && !D.ackComplete(p) && !p.acceptReminderAt);
  },
  sendAcceptanceReminders(db, actor){
    const out=[];
    D.reminderTargets(db).forEach(p=>{
      const tpl = p.activatedFromReserve ? p.kind+'_reserve_activation_reminder' : p.kind+'_accept_reminder';
      db.emails.push({at:db.today,to:p.email,tpl,vars:{name:p.name,link:'#/me/'+p.id},kind:'reminder'});
      p.acceptReminderAt=db.today; out.push(p);
    });
    D.logAudit(db, db.today, actor, `acceptance_reminders_sent:${out.length}`, 'reminders');
    return out;
  },
  /* ---- personalized-link login: emailed one-time verification code (spec §2).
     Staging note: the "email" lands in the in-product outbox, so the team can read the
     code there; production wires real email delivery. */
  requestOtp(db, personId, emailEntered){
    const p=D.person(db,personId);
    if(!p) return {error:'Unknown link.'};
    if(String(emailEntered||'').trim().toLowerCase()!==String(p.email||'').toLowerCase())
      return {error:'That does not match the email address on this application. Please use the email you applied with.'};
    p.otpSeq=(p.otpSeq||0)+1;
    let h=0; const s=personId+':'+p.otpSeq; for(let i=0;i<s.length;i++){ h=(h*31+s.charCodeAt(i))>>>0; }
    const code=String(100000+(h%900000));
    p.otp={code, at:db.today};
    db.emails.push({at:db.today,to:p.email,tpl:'otp_code',vars:{name:p.firstName||p.name,code},kind:'otp'});
    D.logAudit(db, db.today, 'system', 'otp_issued', personId);
    return {ok:true};
  },
  verifyOtp(db, personId, code){
    const p=D.person(db,personId);
    const ok = !!(p && p.otp && String(code).trim()===p.otp.code);
    if(ok) D.logAudit(db, db.today, personId, 'link_signin', personId);
    return ok;
  },
  /* ---- the acceptance gate: three items, separately actioned, separately timestamped.
     Completion = place confirmed → onboarding email + full portal access. ---- */
  ackRules(db, personId){
    const p=D.person(db,personId); if(!p) return null;
    p.ack=p.ack||{}; p.ack.rules=new Date().toISOString();
    D.logAudit(db, db.today, personId, 'acknowledged:rules', personId);
    D._maybeCompleteGate(db,p); return p;
  },
  submitCoi(db, personId, declared, details){
    const p=D.person(db,personId); if(!p) return null;
    if(declared && !(details&&String(details).trim())) return null;   // details required when declared
    p.coi={declared:!!declared, details:declared?String(details).trim().slice(0,600):''};
    p.ack=p.ack||{}; p.ack.coi=new Date().toISOString();
    D.logAudit(db, db.today, personId, 'acknowledged:coi'+(declared?' (conflict declared)':''), personId);
    D._maybeCompleteGate(db,p); return p;
  },
  submitKickoff(db, personId, attend, reason){
    const p=D.person(db,personId); if(!p) return null;
    if(!attend && !(reason&&String(reason).trim())) return null;      // reason required for an exception
    p.kickoff = attend ? {status:'confirmed'} : {status:'exception_requested', reason:String(reason).trim().slice(0,600)};
    p.ack=p.ack||{}; p.ack.kickoff=new Date().toISOString();
    D.logAudit(db, db.today, personId, 'acknowledged:kickoff:'+p.kickoff.status, personId);
    if(!attend){
      // Routed to the named owners (Esther Koh + Wei Kiat Koh) — in-portal queue plus an
      // email notification to both (the spec's fallback if routing is unavailable).
      db.emails.push({at:db.today,to:'Esther Koh, Wei Kiat Koh (programme owners)',kind:'kickoff_exception',
        subject:`Kick-Off exception requested by ${p.name}`});
    }
    D._maybeCompleteGate(db,p); return p;
  },
  _maybeCompleteGate(db,p){
    if(!D.ackComplete(p) || p.placeConfirmedAt) return;
    p.placeConfirmedAt=db.today;
    db.emails.push({at:db.today,to:p.email,tpl:'onboarding',vars:{name:p.firstName||p.name,link:'#/me/'+p.id},kind:'onboarding'});
    D.logAudit(db, db.today, p.id, 'place_confirmed', p.id);
  },
  demoCompleteGate(db, personId){                            // staging shortcut (labelled in UI)
    const p=D.person(db,personId); if(!p) return null;
    D.ackRules(db,personId); D.submitCoi(db,personId,false,''); D.submitKickoff(db,personId,true,'');
    return p;
  },
  saveKickoffLogistics(db, personId, arrival, dietary){
    const p=D.person(db,personId); if(!p) return null;
    p.kickoffLogistics={arrival:String(arrival||'').trim().slice(0,140), dietary:String(dietary||'').trim().slice(0,140)};
    D.logAudit(db, db.today, personId, 'kickoff_logistics_saved', personId);
    return p.kickoffLogistics;
  },
  kickoffExceptionsOpen(db){
    return db.people.filter(p=>p.appStatus==='accepted' && p.kickoff
      && p.kickoff.status==='exception_requested' && !p.kickoff.resolved);
  },
  resolveKickoffException(db, personId, outcome, actor){
    const p=D.person(db,personId);
    if(!p || !p.kickoff || p.kickoff.status!=='exception_requested' || p.kickoff.resolved) return null;
    p.kickoff.resolved={outcome, by:actor, at:db.today};      // 'waived' | 'attend'
    db.emails.push({at:db.today,to:p.email,kind:'kickoff_exception',
      subject: outcome==='waived' ? 'Your Kick-Off exception is approved' : 'About your Kick-Off exception request'});
    D.logAudit(db, db.today, actor, 'kickoff_exception_'+outcome, personId);
    return p;
  },
  setOrientationVideos(db, menteeUrl, mentorUrl, actor){
    db.config.orientationVideo = String(menteeUrl||'').trim().slice(0,300);
    db.config.orientationVideoMentor = String(mentorUrl||'').trim().slice(0,300);
    const any = db.config.orientationVideo || db.config.orientationVideoMentor;
    D.logAudit(db, db.today, actor, any?'orientation_videos_set':'orientation_videos_cleared', 'config');
    return {mentee: db.config.orientationVideo, mentor: db.config.orientationVideoMentor};
  },
  orientationVideoFor(db, person){
    if(person && person.kind==='mentor' && db.config.orientationVideoMentor) return db.config.orientationVideoMentor;
    return db.config.orientationVideo || '';
  },
  suggestMatches(db, rotation){
    const mentees=db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted'
      && !D.gateBlocked(p) && !db.pairs.some(x=>x.rotation===rotation&&x.menteeId===p.id&&['proposed','approved','closed'].includes(x.status)));
    const out=[];
    mentees.forEach(e=>{
      const cands=db.people.filter(m=>m.kind==='mentor'&&['accepted'].includes(m.appStatus)&&!m.droppedOut
        && D.capacityLeft(db,m.id,rotation)>0 && !D.repeatMentor(db,e.id,m.id));
      if(cands.length){
        const ranked=D.rankMentors(db,cands,e), best=ranked[0];
        const pr={id:'P'+String(db.pairs.length+1).padStart(3,'0'),rotation,mentorId:best.m.id,menteeId:e.id,
          status:'proposed', score:Math.round(best.score*10)/10, rankedOutOf:ranked.length,
          rationale:D.rationaleFor(best,e,ranked.length)};
        db.pairs.push(pr); out.push(pr);
      }
    });
    D.logAudit(db, db.today, 'matching engine', `suggested ${out.length} pairs (R${rotation})`, 'matching');
    return out;
  },
  alternativesFor(db, pairId, n){
    const pr=db.pairs.find(p=>p.id===pairId); if(!pr) return [];
    const e=D.person(db,pr.menteeId);
    const cands=db.people.filter(m=>m.kind==='mentor'&&m.appStatus==='accepted'&&!m.droppedOut
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
    if(!m || m.kind!=='mentor' || m.appStatus!=='accepted' || m.droppedOut) return null;
    if(D.capacityLeft(db,m.id,pr.rotation)<=0 || D.repeatMentor(db,e.id,m.id)) return null;
    const s=D.matchScore(db,m,e);
    pr.mentorId=m.id; pr.score=Math.round(s.score*10)/10; pr.adjustedBy=actor;
    pr.rationale=(s.reasons.length? s.reasons.slice(0,2)
      : [`Mentor brings ${m.background} at ${m.org}; breadth and availability fit`])
      .concat([`Chosen by ${actor} over the system's first pick; capacity, conflict and no-repeat checks passed`]);
    D.logAudit(db, db.today, actor, 'proposal_reassigned', pairId);
    return pr;
  },
  /* Release rule (Q5, Wei Kiat-confirmed): place not confirmed after the deadline →
     treated as withdrawn, seat freed for the Reserve list. Explicit action, not a cron —
     freeing a seat is a decision a human owns. Per-person deadline: 26 Sept, or 29 Sept
     for activated reserves. */
  deadlineFor(db,p){
    const sel=db.config.selection||{};
    return p.activatedFromReserve ? (sel.reserveAcceptBy||sel.acceptBy) : sel.acceptBy;
  },
  acceptDeadlinePassed(db){
    const sel=db.config.selection||{};
    return !!sel.acceptBy && db.today > sel.acceptBy;
  },
  pendingWithdrawal(db){
    return db.people.filter(p=>p.appStatus==='accepted' && !D.ackComplete(p)
      && D.deadlineFor(db,p) && db.today > D.deadlineFor(db,p));
  },
  withdrawUnacknowledged(db, actor){
    const out=[];
    D.pendingWithdrawal(db).forEach(p=>{
      p.appStatus='withdrawn'; p.withdrawnAt=db.today; out.push(p);
      db.emails.push({at:db.today,to:p.email,kind:'withdrawn',
        subject:`GRMP: your place has been released — ${p.name}`});
      D.logAudit(db, db.today, actor, 'withdrawn_place_not_confirmed', p.id);
    });
    return out;
  },
  approvePair(db, pairId, actor){
    const pr=db.pairs.find(p=>p.id===pairId); pr.status='approved'; pr.approvedAt=db.today;
    const m=D.person(db,pr.mentorId), e=D.person(db,pr.menteeId);
    db.emails.push({at:db.today,to:`${m.email}, ${e.email}`,kind:'match',subject:`Your Rotation ${pr.rotation} match: ${m.name} ↔ ${e.name}`});
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
    db.people.filter(p=>p.appStatus==='accepted').forEach(p=>{
      if(D.certEligible(db,p) && !db.certificates.some(c=>c.personId===p.id)){
        db.certificates.push({personId:p.id,at:db.today}); issued.push(p);
        db.emails.push({at:db.today,to:p.email,kind:'certificate',subject:`Your ${db.config.cohort.label.replace(/\s*\(.*\)\s*/,'')} completion certificate, ${p.name}`});
      }
    });
    D.logAudit(db, db.today, actor, `certificates_issued:${issued.length}`, 'certificates');
    return issued;
  },
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
  /* Dropout replacement now draws on the Reserve Mentor list (opted-in): activation
     issues the activation acceptance email, then the pair is re-made. */
  replaceMentor(db, pairId, reserveMentorId, actor){
    const old=db.pairs.find(p=>p.id===pairId);
    const res=D.person(db,reserveMentorId);
    if(!old || !res) return null;
    if(res.appStatus==='reserve_invited') D.activateReserve(db, reserveMentorId, actor);
    const pr={id:'P'+String(db.pairs.length+1).padStart(3,'0'),rotation:old.rotation,mentorId:reserveMentorId,menteeId:old.menteeId,
      status:'approved',approvedAt:db.today,rationale:['Reserve-list replacement after mentor dropout',...D.aiRationale(db,res,D.person(db,old.menteeId)).slice(0,1)]};
    old.status='replaced';
    db.pairs.push(pr);
    const e=D.person(db,old.menteeId);
    db.emails.push({at:db.today,to:e.email,kind:'match',subject:`Your new mentor for Rotation ${old.rotation}: ${res.name}`});
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
    const old = db.config.cohort;
    const closed = n=>db.pairs.filter(x=>x.rotation===n&&x.status==='closed').length;
    db.archives.push({id:old.id, label:old.label, archivedAt:db.today,
      stats:{mentors:db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='accepted').length,
             mentees:db.people.filter(p=>p.kind==='mentee'&&p.appStatus==='accepted').length,
             r1:closed(1), r2:closed(2), r3:closed(3),
             certificates:db.certificates.length,
             kickoff:db.events.kickoff.attendance.length}});
    const carry = opts.carryOverMentors!==false;
    const keep = carry ? db.people.filter(p=>p.kind==='mentor'&&p.appStatus==='accepted') : [];
    keep.forEach(m=>{ m.appStatus='invited'; m.ack=null; delete m.coi; delete m.kickoff;
      delete m.kickoffLogistics; delete m.placeConfirmedAt; delete m.acceptReminderAt;
      delete m.activatedFromReserve; delete m.otp; delete m.droppedOut; });
    db.people = keep;
    db.reviews=[]; db.pairs=[]; db.midreviews=[]; db.menteeMidReviews=[]; db.endEvaluations=[]; db.builderReflections=[]; db.certificates=[]; db.concerns=[];
    db.emails=[{at:opts.today,to:carry?keep.length+' returning mentors':'—',kind:'decision',
      subject:`${opts.label}: invitation to return as a mentor`}];
    const newId = 'C'+(opts.rotations[0].start||'').slice(0,4);
    db.events = {kickoff:{name:'Kick-Off Night', date:opts.kickoffDate||opts.rotations[0].start, attendance:[]},
                 appreciation:{name:'Appreciation Night', date:opts.appreciationDate||opts.rotations[2].end, attendance:[]}};
    db.config.cohort = {id:newId, label:opts.label};
    db.config.orientationVideo=''; db.config.orientationVideoMentor='';   // new cycle, new sessions
    db.config.cycle = opts.label;
    const oldR1Year = Number((db.config.rotations[0].start||'0000').slice(0,4));
    db.config.rotations = opts.rotations;
    const delta = Number(opts.rotations[0].start.slice(0,4)) - oldR1Year;
    const sh=iso=>iso?String(Number(iso.slice(0,4))+delta)+iso.slice(4):iso;
    if(opts.ackLadder) db.config.ackLadder = opts.ackLadder;
    else db.config.ackLadder = (db.config.ackLadder||[]).map(l=>({...l, date: sh(l.date)}));
    if(db.config.registration)
      db.config.registration={opens:sh(db.config.registration.opens), closes:sh(db.config.registration.closes)};
    if(db.config.selection){
      const s=db.config.selection;
      db.config.selection={...s, approvalsBy:sh(s.approvalsBy), outcomeBy:sh(s.outcomeBy),
        acceptBy:sh(s.acceptBy), reserveAcceptBy:sh(s.reserveAcceptBy), reminderOn:sh(s.reminderOn)};
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
  /* Render a logged email: template-driven entries get their verbatim body + the
     spec-mandated signature block; plain entries fall back to subject-only. */
  renderMail(db, e){
    const CF=D.cohortFacts(db);
    if(!e.tpl || !MAILS[e.tpl]) return {subject:e.subject||'', body:'', from:CF.mailFrom, replyTo:CF.enquiries};
    const t=MAILS[e.tpl];
    const sig = t.sign==='dual'
      ? db.config.signatories.map(s=>[s.name,...s.titles].join('\n')).join('\n\n')
      : t.sign==='wk'
      ? [db.config.signatories[1].name,...db.config.signatories[1].titles].join('\n')
      : '';
    return {subject:e.subject||t.subject(e.vars||{},CF),
      body:t.body(e.vars||{},CF)+(sig?'\n\n'+sig:''),
      from:CF.mailFrom, replyTo:CF.enquiries};
  },
};
const GRMP_EXPORT = {Store, D, DB_KEY, buildSeed, INDUSTRIES, FACULTIES,
  MENTEE_CRITERIA, MENTOR_CRITERIA, FORM_OPTS, COPY, MAILS};
if (typeof window !== 'undefined') window.GRMP = GRMP_EXPORT;
if (typeof module !== 'undefined' && module.exports) module.exports = GRMP_EXPORT;
