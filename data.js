/* GRMP Demo — state engine + seeded cohort.
   Single source of truth in localStorage. Deterministic seed (mulberry32) so tests are stable.
   Demo date is fixed at 2026-12-15 (mid-cycle: R1 closed, R2 running) so every view has life.
   R5 (Aug 2026): built to Joanne's six specs — staged application forms, gated acceptance
   (Rules + COI + Kick-Off, separately timestamped), OTP link login, Reserve lists, decline
   variants, industry-preference matching (tracks removed), 17 verbatim email templates.
   ALL participant-facing legal text and email copy lives HERE (COPY / MAILS), verbatim from
   the specs — views interpolate, never rewrite. */

const DB_KEY = 'grmp_demo_v7';   // bumped: Cycle 1 date amendments (batch outcome send, reminder rule)
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
  'Artificial Intelligence (AI)',                 // added on Wei Kiat's request (F0818-001327 /
                                                  // F0817-235816) — the spec list had no AI entry.
                                                  // Added to BOTH sides at once: the specs require
                                                  // mentor self-classification and mentee preference
                                                  // to stay one identical list.
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
/* Referenced by value, never by position — the list grows (AI was added mid-cycle) and a
   hard-coded offset into it silently starts meaning a different industry the day it does.
   Guarded in L1: no file may index this array with a number literal. */
const IND_OTHER = 'Other';
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
/* Post-login Resources library (Resources Area spec §A). Everyone signed in sees everything;
   the two sections are labels, not filters, and the order here is the order on the page.
   Filenames are deliberately version-free: the spec's versioning rule is "override in place",
   so a revised deck replaces the file at the same path and every existing link still works. */
const RESOURCES = [
  {section:'mentees', file:'mentee-preparation-note.docx',
   title:'Mentee Preparation Note (Rotations 1–3)',
   desc:'How to prepare for each rotation, with questions to ask.'},
  {section:'mentees', file:'mentee-briefing-deck.pptx',
   title:'Mentee Briefing Deck',
   desc:'The full guide to the mentee role across the arc.'},
  {section:'mentees', file:'personal-reflection-sheet.docx',
   title:'Personal Reflection Sheet (template)',
   desc:'The blank reflection template. It belongs to you and is never submitted.'},
  {section:'mentors', file:'mentor-rotation-briefing-and-conversation-guide.docx',
   title:'Mentor Rotation Briefing & Conversation Guide',
   desc:'The mentor’s role and conversation prompts for each rotation.'},
  {section:'mentors', file:'mentor-briefing-deck.pptx',
   title:'Mentor Briefing Deck',
   desc:'The full guide to mentoring across the arc.'},
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
  /* PDPA revised 2026-08-18 (Joanne, "Revised GRMP PDPA Consent" doc): adds the AI/technology-provider
     paragraph and "will not otherwise share". Source of truth is now specs_joanne_r7/, which the
     verbatim guard diffs against — it supersedes the PDPA block in the R5 application specs. */
  pdpaTitle: 'GRMP PDPA Consent and Acknowledgement',
  pdpaBody: [
    'SMC takes privacy seriously. In line with Singapore’s Personal Data Protection Act, SMC and GRMP participants are expected to handle personal information with care.',
    '**SMC’s Use of Your Personal Data**',
    'You consent to SMC collecting and using your personal data, including your name, contact details and relevant programme information, to manage your application and participation in GRMP, communicate with you, facilitate mentor and mentee matching, administer and evaluate the programme, and take photos or videos at SMC events for documentation.',
    'SMC may use technology service providers, including AI assisted tools, to support application review, matching and programme administration. Where such tools are used, SMC will take reasonable steps to minimise the personal data shared and protect it in accordance with applicable data protection requirements.',
    'Where necessary for GRMP, relevant personal information may be shared with your matched mentor or mentee.',
    'SMC will not otherwise share your personal data with third parties without your consent unless required by law. You may access or correct your data, or withdraw your consent, by contacting SMC’s designated Data Protection Officer, subject to operational requirements.',
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
  /* DRAFT — ours, not the programme's. Every other template in this file is verbatim from
     an approved spec; this one had no spec, because nobody had noticed that a matched pair
     were never given a way to reach each other. The pair card showed a name and a
     background, this email was a subject line with an empty body, and the FAQ told them the
     conversations are "arranged directly between the two of you".
     Written to be corrected: sent to Joanne on 20 Aug for her wording. Marked `draft` so
     the console says so out loud rather than letting it pass for approved copy. */
  pair_match: {sign:'wk', draft:'awaiting the UX owner’s wording (sent 20 Aug 2026)',
    subject:(v)=>`Your Rotation ${v.rotation} match: ${v.rotLabel}`,
    /* One copy each, not one email to both: the message carries a personal portal link,
       and a shared copy would have walked the mentor onto the mentee's page. The other
       person's address is written into the body instead, which is the thing the pair
       actually needs and the thing the system was not giving them. */
    body:(v,CF)=>[`Dear ${v.name},`,'',
      `You have been matched for Rotation ${v.rotation} of the ${CF.progFull}, ${v.rotLabel}, which runs from ${v.rotStart} to ${v.rotEnd}.`,'',
      (v.mentee ? `Your mentor for this rotation is ${v.otherName}` : `You will be mentoring ${v.otherName}`)
        + (v.otherLine ? `, ${v.otherLine}.` : '.'),'',
      'The first move is yours to make together. Please make contact in the first week and agree when you will meet. The programme asks for at least two conversations during the rotation, virtually or in person, at whatever times suit you both. There is nothing to book through us.','',
      `You can reach ${v.otherName} at ${v.otherEmail}${v.otherLinkedin?`, and their LinkedIn profile is ${v.otherLinkedin}`:''}. Their details are also on your GRMP page, along with the reflection prompts for ${v.rotLabel} if you would like a shape for the first conversation:`,'',
      `${v.link}`,'',
      'At the end of the rotation we ask the mentee to confirm that the two conversations took place and to write a short private reflection. What you discuss is yours: the programme records that the conversations happened, never what was said.','',
      `If anything changes, or the pairing is not working, please write to us at ${CF.enquiries} and we will help.`,'',
      'Warm regards,'].join('\n')},
  onboarding: {sign:'wk', subject:(v,CF)=>`Your place in GRMP is confirmed, ${v.name}`,
    body:(v,CF)=>[`Dear ${v.name},`,'',
      'Thank you, your place in the programme is confirmed. Your acknowledgements have been recorded, and your personal page is now your home for the whole cycle: your rotations, your checkpoints and your certificate all live there.','',
      `Your personal link: ${v.link}`,'',
      `We will see you at the Kick-Off on ${CF.kickoffLong}, ${CF.kickoffTime}, ${CF.kickoffVenue}.`,'',
      '[Placeholder pending approved copy: the portal onboarding email is an outstanding content item, shared between mentor and mentee. This confirmation text will be replaced verbatim when the programme team supplies it.]','',
      'Warm regards,'].join('\n')},
};

/* Placeholder data for reading a template with nobody real in it. It sits beside the
   templates deliberately: the preview used to pass one fixed bag of three variables, so
   any template needing a fourth previewed as "undefined" the first time somebody opened
   it. A template arrives with its own sample now, or it does not preview. */
const MAIL_PREVIEW = (db, tpl) => {
  const r1 = ((db.config.rotations||[])[0])||{};
  const base = {name:'[Name]', link:'[personalized link]', code:'123456'};
  const per = {
    pair_match: {mentee:true, otherName:'[Mentor name]', otherEmail:'[mentor email]',
      otherLinkedin:'linkedin.com/in/[profile]', otherLine:'[job title] at [organisation]',
      rotation:r1.n||1, rotLabel:r1.label||'[rotation theme]',
      rotStart:r1.start?D.fmtLong(r1.start):'[start]', rotEnd:r1.end?D.fmtLong(r1.end):'[end]'},
  };
  return {...base, ...(per[tpl]||{})};
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
      if(p.whatsappConsent==='No') p.contactPref = pick(['Phone call','Email']);
      if(!returning){
        Object.assign(p,{yearsExp:pick(FORM_OPTS.yearsExp.slice(1)), ledTeam:'Yes',
          leadership:pick(LEADERSHIP_POOL), crossIndustry:pick(FORM_OPTS.crossIndustry),
          priorMentoring: rnd()<0.6?'Yes':'No'});
      }
      p.background = `${p.yearsExp||'previous-cycle mentor'}${p.yearsExp?' of experience':''} in ${p.industry===IND_OTHER?'their field':p.industry}`;
    }else{
      const fac = pick(FACULTIES);
      Object.assign(p,{university:'SMU', faculty:fac, faculty2:'Not applicable',
        degree:pick(DEGREES[fac]), year:pick(['Year 1','Year 2','Year 2','Year 3','Year 3','Year 4']),
        eligibilityConfirmed:true,
        heard:pick(FORM_OPTS.heardMentee),
        prompt1:`Six months from now I hope to have grown ${pick(P1_GROW)}. ${pick(P1_MOMENT)}, and I want to keep building that muscle with a mentor who will hold me to it.`,
        prompt2:`I keep getting pulled toward ${pick(P2_PULL)}. Beyond my own field I read widely and ask a lot of questions. In this community I would want to show up by ${pick(P2_SHOW)}.`,
        industryPrefs: pickN(INDUSTRIES.filter(i=>i!==IND_OTHER), 3),
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
    /* Between the outcome batch (14 Sept) and the acceptance deadline (20 Sept). It used
       to run 17–24 Sept, which put a quarter of the cohort through the gate after the
       deadline that is supposed to close it — invisible in the UI, wrong in the data. */
    const d = '2026-09-'+String(15+Math.floor(rnd()*6)).padStart(2,'0');
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

  /* The outcome batch already went out in this cohort's timeline: one send on 14 Sept
     carrying every decision made during the 10–13 Sept review window. Decisions taken
     after a batch has been released send individually — see D.decide. */
  people.filter(p=>['accepted','reserve_invited','declined','declined_not_selected','declined_ineligible'].includes(p.appStatus))
        .forEach(p=>{ p.decisionAt='2026-09-14'; p.outcomeSentAt='2026-09-14'; });
  const outcomeBatch = {at:'2026-09-14', by:'Wei Kiat', count:people.filter(p=>p.outcomeSentAt).length};

  /* events — Kick-Off details are spec-confirmed constants */
  const confirmedIds = people.filter(p=>p.appStatus==='accepted' && p.kickoff && p.kickoff.status==='confirmed').map(p=>p.id);
  const events = {
    kickoff:      {name:'Kick-Off Night', date:'2026-10-01', time:'7.30 p.m. to 9.00 p.m.', venue:'SMU ALCove, 80 Stamford Road, #B1-62, Singapore 178902', attendance:pickN(confirmedIds, Math.floor(confirmedIds.length*0.9))},
    /* Moved off 26 Mar 2027 on Esther's 18 Aug note: that Friday is Good Friday, a gazetted
       Singapore public holiday. Nothing in the build had ever checked a programme date against
       the calendar people actually live in — see the non-working-day sweep in backend_test.js. */
    appreciation: {name:'Appreciation Night', date:'2027-04-02', venue:'to be confirmed', attendance:[]},
  };

  /* concerns: 1 sample referral */
  const concerns = [{id:'C001', at:'2026-11-18', from:'(mentee — identity visible to Escalation Owner only)',
    summary:'Raised a concern about repeated last-minute cancellations', status:'referred to SMC Grievance process'}];

  /* email log (what the system sent, template-rendered — open any row to read the verbatim body) */
  const sampleAcceptM = mentors[0], sampleAcceptE = mentees[0];
  const sampleReserveM = mentorReserve[0], sampleReserveE = menteeReserve[0];
  const lateOne = lateAck[0];
  const emails = [
    {at:'2026-08-31', to:'mentor invitation list (mail-merge)', tpl:'mentor_invite', vars:{name:'[Name]'}, kind:'invite', by:'Esther Koh'},
    {at:'2026-08-31', to:'mentee invitation list (mail-merge)', tpl:'mentee_invite', vars:{name:'[Name]'}, kind:'invite', by:'Wei Kiat Koh'},
    {at:sampleAcceptM.submittedAt, to:sampleAcceptM.email, tpl:'mentor_receipt', vars:{name:sampleAcceptM.name}, kind:'receipt'},
    {at:sampleAcceptE.submittedAt, to:sampleAcceptE.email, tpl:'mentee_receipt', vars:{name:sampleAcceptE.name}, kind:'receipt'},
    {at:'2026-09-14', to:sampleAcceptM.email, tpl:'mentor_accept', vars:{name:sampleAcceptM.name, link:'#/me/'+sampleAcceptM.id}, kind:'decision'},
    {at:'2026-09-14', to:sampleAcceptE.email, tpl:'mentee_accept', vars:{name:sampleAcceptE.name, link:'#/me/'+sampleAcceptE.id}, kind:'decision'},
    {at:'2026-09-14', to:sampleReserveM.email, tpl:'mentor_reserve', vars:{name:sampleReserveM.name}, kind:'decision'},
    {at:'2026-09-14', to:sampleReserveE.email, tpl:'mentee_reserve', vars:{name:sampleReserveE.name}, kind:'decision'},
    {at:'2026-09-18', to:lateOne.email, tpl:'mentee_accept_reminder', vars:{name:lateOne.name, link:'#/me/'+lateOne.id}, kind:'reminder'},
    {at:'2026-09-28', to:'all matched pairs', subject:'Your Rotation 1 match: Know Yourself', kind:'match'},
    {at:'2026-11-25', to:'mentees', subject:'Rotation 1 close-off — two quick confirmations', kind:'closeoff'},
    {at:'2026-11-30', to:'all matched pairs', subject:'Your Rotation 2 match: Know Your World', kind:'match'},
  ];
  lateOne.acceptReminderAt = '2026-09-18';

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

  /* Decision cards quote dates back to the team. Typing them out is how a card ends up
     announcing 26 Mar while the system runs 2 Apr, so the prose is composed from the same
     fields the build uses. (Pinned by 'the decision card quotes the dates the system runs'.) */
  const MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sept','Oct','Nov','Dec'];
  const dLong = iso => `${+iso.slice(8,10)} ${MON[+iso.slice(5,7)-1]} ${iso.slice(0,4)}`;

  /* `opens` is the day the forms start accepting submissions: 31 Aug, when the
     invitations go out (mentee list from Wei Kiat, mentor list from Esther). It is
     deliberately not published — the site states a closing date, never an opening one. */
  const registration = {opens:'2026-08-31', closes:'2026-09-09'};
  /* Selection timeline — "GRMP 2.0 Cycle 1: Date Amendments" (Joanne, 20 Aug 2026,
     reviewed and confirmed by Esther and Wei Kiat). This closes Q13, which had been
     held open since 18 Aug because Esther's 14 Sept and the Pre-Login spec's 18 Sept
     disagreed. Every date below is diffed against specs_joanne_r11/confirmed_dates.json
     in backend_test.js, which also re-checks the weekday Joanne wrote in brackets
     against the real calendar.
     Two mechanism changes ride in with the dates, which is why this was never a
     one-line config edit:
       · outcomeBy is a SINGLE BATCH SEND on the day, not a rolling send fired by each
         approval. It reverses the behaviour recorded in Q9 — see D.sendOutcomeBatch.
       · the acceptance reminder is no longer a typed date. It is a rule, and one rule
         for both the main and the reserve flow — see D.reminderDueDate. */
  const selection = {reviewFrom:'2026-09-10', approvalsBy:'2026-09-13',
             outcomeBy:'2026-09-14', outcomeSend:'batch', acceptBy:'2026-09-20',
             reserveActivateFrom:'2026-09-21', reserveAcceptBy:'2026-09-26',
             reminderRule:{afterEmailDays:2, beforeDeadlineDays:2}, menteeCap:60};

  return {
    version:1, today:TODAY,
    archives:[], aiCache:{}, sessions:{},
    config:{
      cohort:{id:'C2026', label:'GRMP 2026 (SMU pilot)'},
      // Briefing recordings (optional resource, NOT a gate — the binding Kick-Off
      // confirmation lives in the acceptance gate per the post-selection specs).
      orientationVideo:'', orientationVideoMentor:'',
      registration, selection,
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
      /* ackLadder used to sit here as two typed dates (17 and 27 Sept). It is now computed
         from the reminder rule — see D.ackLadder. A typed date next to a rule that resolves
         to a different day is exactly how a system ends up publishing one promise and
         keeping another. */
      /* `role` is the seat inside GRMP; `title` is the job title the organisation knows the
         holder by. Participant-facing copy says the title, never the name — Esther, 18 Aug:
         "to be sustainable as people change, Job title R&R remains". Titles are only filled in
         where the programme has actually published one (they are diffed against the signature
         block in backend_test.js); nobody's title is invented to fill a column. */
      admins:[{name:'Esther', role:'Programme Owner', title:'Chief, SMC HR & Transformation', roles:['lead','mentor_reviewer','mentee_reviewer','escalation']},
              {name:'Wei Kiat', role:'Programme Lead', title:'GRMP Programme Lead', roles:['lead','coordinator','mentor_reviewer','mentee_reviewer','escalation']},
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
        Q6:{title:'Concern link on every public page + the acknowledgement page. Primary recipient: Wei Kiat (Programme Lead, first point of contact); Esther as alternate escalation where further review is needed. Amended 18 Aug: the page states the escalation route by job title rather than by name — "to be sustainable as people change, Job title R&R remains" (Esther). The same two people hold it; the sentence is generated from whoever holds the escalation role, so it cannot outlive a handover.', inferred:true, settled:{by:'Esther', on:'2026-08-18', via:'feedback F0806-174654 (route) + 18 Aug group message (named by title, not by person)'}},
        Q7:{title:'Lean scope: no pair/meeting/availability tracking, no kickoff-goals form, no reflection content stored', inferred:true, settled:{by:'Wei Kiat', on:'2026-08-04', via:'confirmed in-app'}},
        Q8:{title:`Registration ${dLong(registration.opens)} to ${dLong(registration.closes)} (the forms open the day the invitations go out; no opening date is published) · Kick-Off Night ${dLong(events.kickoff.date)}, 7.30–9.00 pm at SMU ALCove · Appreciation Night ${dLong(events.appreciation.date)}. Appreciation Night moved from 26 Mar 2027, which is Good Friday — a gazetted public holiday — leaving the other two dates as Wei Kiat confirmed them. Registration closes ${dLong(registration.closes)}, one day earlier than Wei Kiat's original 10 Sept, per the 20 Aug Cycle 1 amendments. Every programme date is now checked against Singapore public holidays and non-working days as part of the test suite.`, inferred:true, settled:{by:'Wei Kiat, amended by Esther and the Cycle 1 date amendments', on:'2026-08-20', via:'group message 4 Aug (all three dates) → Esther 18 Aug (public-holiday clash on 26 Mar) → Joanne 20 Aug amendments doc (registration closes 9 Sept)'}},
        Q9:{title:'Superseded on 20 August. It used to read: approval auto-issues the acceptance email, approval and invitation being one action. The Cycle 1 date amendments replace that with a single batch send on the outcome date — the cohort hears on one day, and a decision revised during the review window never reaches an inbox in its earlier form. Approvals taken after the batch has gone out still send immediately, so nobody decided late waits for a batch that has already left.', inferred:true, settled:{by:'Esther and Wei Kiat, via Joanne', on:'2026-08-20', via:'F0817-145316 / F0818-131700 confirmed the rolling send; the 20 Aug Cycle 1 amendments replaced it with a batch send'}},
        Q10:{title:'Draft-saving on the application forms is removed: the specs confirm no save-and-resume (no applicant login, so no identity to attach a partial record to). This supersedes the earlier draft behaviour built from feedback F0806-205424; a browser leave-site warning guards accidental loss instead.', inferred:true, settled:{by:'Joanne (spec)', on:'2026-08-14', via:'Portal Capability & Technical Assumptions §1 [CONFIRMED]'}},
        Q11:{title:'Orientation videos are an optional briefing resource, not a gate: the binding step is the acceptance gate (Rules + COI + Kick-Off attendance), per the post-selection specs. Kick-Off exceptions route to Esther Koh and Wei Kiat Koh.', inferred:true, settled:{by:'Joanne (spec)', on:'2026-08-14', via:'Post-Selection Specs §2.1 — gate defines confirmation'}},
        Q12:{title:'Visual styling deliberately stays as the current neutral theme: the specs say do not invent a brand theme, and SMC brand guidelines/assets are an outstanding input (owner: SMC comms lead). Restyle lands when the assets do.', inferred:true},
        Q13:{title:`Selection dates, settled. The full calendar came back from Joanne on 20 August, reviewed by Esther and Wei Kiat, and it resolves the 14-vs-18 September disagreement in favour of Esther's 14th. As now built: applications close ${dLong(registration.closes)} (one day earlier), review and selection ${dLong(selection.reviewFrom)} to ${dLong(selection.approvalsBy)}, outcome notifications ${dLong(selection.outcomeBy)}, acceptance deadline ${dLong(selection.acceptBy)} (unchanged), Reserve activation rolling from ${dLong(selection.reserveActivateFrom)} with a ${dLong(selection.reserveAcceptBy)} deadline (three days earlier). Two of these are mechanism changes, not dates: outcomes are a single batch send on the day rather than an email fired by each approval — which supersedes Q9 — and the acceptance reminder is now a rule (48h after the person's own email, or two days before their own deadline, whichever is later; no automated reminder at all if that lands on or after the deadline, and the team is given the names to contact instead). One rule, both flows.`, inferred:true, settled:{by:'Esther and Wei Kiat, via Joanne', on:'2026-08-20', via:'GRMP 2.0 Cycle 1: Date Amendments and Site Changes — specs_joanne_r11/'}},
        Q15:{title:`For Joanne (UX owner) — the match email and what a pair card shows. Neither existed as a decision until 20 August, because nobody had noticed the gap: the pair card gave a name and a background with no way to reach anyone, the match email was a subject line with an empty body, and the FAQ answer says the conversations are "arranged directly between the two of you". Built as proposed and agreed on 20 Aug: the card shows the other person's email address and LinkedIn, deliberately not their phone number, which is a different order of thing to hand over automatically and least of all a student's; the email goes out at approval, one copy each rather than one shared copy, carrying the other person's address, the rotation dates and a nudge to make contact in the first week. The consent already covers it in the wording of 18 Aug ("relevant personal information may be shared with your matched mentor or mentee"). The copy itself is OURS, not the programme's: it is the only template in the system with no approved spec behind it, it is marked draft in the Emails library, and it was sent to Joanne on 20 Aug for her wording. Replace it verbatim when hers comes back.`, inferred:true},
        Q14:{title:'For Joanne (UX owner) — three things the Pre-Login Site spec left to you, which we filled in rather than invented, all reversible: (a) the two [CONTENT] FAQ answers are drafted from what the build actually does (no account or password to apply; two conversations per rotation plus a short close-off) and are labelled "awaiting owner confirmation" on the page itself; (b) the FAQ mentee-eligibility answer now says "current SMU undergraduate", the inconsistency your own spec flagged, so it matches the Mentees page and the application gate; (c) the private "Raise a concern" link stays as a fourth footer item — it is not in your footer spec, but Esther required a private concern route on every public page in August, and we would rather show you the clash than quietly drop a safeguarding channel. Confirmed: both answers stand (the line "Accounts exist only for the programme team" is removed and the confirmation badges are gone), eligibility wording stands, concern link stays.', inferred:true, settled:{by:'Joanne', on:'2026-08-18', via:'feedback F0818-131510 / F0818-131600 / F0818-131630 — all three confirmed, account line removed'}},
      },
    },
    people, reviews, pairs, events, concerns, emails, outcomeBatch,
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
  /* Strict three-letter month. The pre-login spec pins the Home timeline to "Sep" and body
     prose to "September", and says in as many words not to normalise one into the other. */
  mon3:iso=>D.monthName(iso).slice(0,3),
  fmtDayMon3:iso=>`${Number(iso.slice(8,10))} ${D.mon3(iso)}`,
  fmtLongNoYear:iso=>`${Number(iso.slice(8,10))} ${D.monthName(iso)}`,
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
      appreciationDate: appre ? D.fmtLong(appre) : null,   // "2 April 2027", like every other date in the build
      /* The move off Good Friday pushed it past the last rotation, so the copy can no
         longer imply it happens inside the six months. Derived, not asserted: if a future
         cycle lands it back inside the cycle the sentence disappears by itself. */
      appreciationAfterCycle: !!(appre && appre > r[2].end),
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
      /* "1–10 Sept" was fine while both ends shared a month. The amendments moved the
         opening to 31 Aug and this rendered "31–9 Aug" — caught by tests/date_sweep.js,
         which is the whole argument for sweeping rendered text rather than source. */
      regWindow: c.registration ? (c.registration.opens.slice(0,7)===c.registration.closes.slice(0,7)
        ? `${Number(c.registration.opens.slice(8,10))}–${Number(c.registration.closes.slice(8,10))} ${D.monthShort(c.registration.opens)}`
        : `${Number(c.registration.opens.slice(8,10))} ${D.monthShort(c.registration.opens)} – ${Number(c.registration.closes.slice(8,10))} ${D.monthShort(c.registration.closes)}`) : '',
      regCloses: c.registration ? c.registration.closes : '',
      applyClosesLong: c.registration ? D.fmtLong(c.registration.closes) : '',
      approvalsByLong: sel.approvalsBy ? D.fmtLong(sel.approvalsBy) : '',
      outcomeByLong: sel.outcomeBy ? D.fmtLong(sel.outcomeBy) : '',
      outcomeByNoYear: sel.outcomeBy ? D.fmtLongNoYear(sel.outcomeBy) : '',
      acceptBy: sel.acceptBy||'', acceptByLong: sel.acceptBy ? D.fmtLong(sel.acceptBy) : '',
      /* Pre-login site: programme name in full, and the Home timeline's short dates. */
      progName: 'Global-Ready Mentoring Programme',
      closesDayShort: c.registration ? D.fmtDayMon3(c.registration.closes) : '',
      acceptByDayShort: sel.acceptBy ? D.fmtDayMon3(sel.acceptBy) : '',
      kickoffDayShort: D.fmtDayMon3(kickoff),
      rotSpanShort: `${D.mon3(r[0].start)}–${D.mon3(r[2].end)}`,
      endMon3: D.mon3(r[2].end),
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
  /* ---- proposed criterion scores (Wei Kiat, F0818-004720 / F0818-004811) ----------------
     "AI should propose a score and not require for us to manually do this" — keying 5 or 6
     numbers per applicant × 120 applicants was the objection. So the platform proposes every
     scored criterion and the reviewer checks, adjusts and submits.

     This function is the rule-based first cut: deterministic, offline, auditable, and it always
     answers. Where the live model is reachable the console upgrades these numbers in place and
     relabels the block as an AI proposal (ai.js `scoreProposal`); when it is not, this stands.
     Either way the score is a PROPOSAL: the reviewer owns the submitted number and the
     Programme Lead still owns the accept / reserve / decline outcome.

     `why` is rendered next to each row, so a reviewer can see what was read, not just a digit. */
  proposeScores(db, p){
    const clamp = n => Math.max(1, Math.min(5, n));
    const wc = t => D.wordCount(t||'');
    const hits = (t, words) => { const s=String(t||'').toLowerCase();
      return words.filter(w=>s.includes(w)).length; };
    const items = [];
    if(p.kind==='mentor'){
      const add=(key,score,why)=>items.push({key, score:clamp(score), why});
      if(p.returning){
        /* Returning mentors skip the screening block by design (the form branches), so there
           is nothing new to read. Carry the prior cycle forward and say so. */
        MENTOR_CRITERIA.filter(c=>c.scored)
          .forEach(c=>add(c.key, 4, 'Returning mentor: the screening block is not asked again, so this carries the previous cycle forward. Adjust if you know otherwise.'));
      } else {
        const yrs = {'Under 5 years':2,'5–10 years':3,'11–15 years':4,'More than 15 years':5}[p.yearsExp];
        let cred = yrs || 3;
        if(p.ledTeam==='Yes') cred += 1;
        if(String(p.leadership||'').trim().length < 40) cred -= 1;
        add('Professional Credibility', cred,
          `${p.yearsExp||'experience not stated'}; led a team: ${p.ledTeam||'not stated'}; ${String(p.leadership||'').trim().length} characters of leadership detail.`);
        const br = {'Yes, significantly':5,'Somewhat':3,'Not really':2}[p.crossIndustry] || 3;
        add('Breadth of Perspective', br,
          `Cross industry / market / culture exposure: ${p.crossIndustry||'not stated'}.`);
        const nd = (p.draws||[]).length;
        add('Values Alignment', 2 + nd,
          `${nd} of ${FORM_OPTS.draws.length} motivations selected${String(p.anythingElse||'').trim()?', plus an added note':''}.`);
        let mind = p.priorMentoring==='Yes' ? 4 : 3;
        if(String(p.interests||'').trim().length >= 60) mind += 1;
        add('Mentoring Mindset', mind,
          `Prior mentoring: ${p.priorMentoring||'not stated'}; ${String(p.interests||'').trim().length} characters on what they offer.`);
      }
    } else {
      /* Mentee criteria are read out of the two 200-word prompts. Signal words are a first cut,
         disclosed in the UI as such — the live model reads the prose properly when available. */
      const SIG = {
        'Readiness to Learn': ['prompt1', ['learn','grow','improve','develop','better','feedback','challenge','stretch']],
        'Values Awareness':   ['prompt1', ['value','honest','weak','struggl','mistake','believ','matter','fail']],
        'Ownership':          ['prompt1', ['i led','i started','i took','i built','i organis','i decided','initiativ','responsib','ownership']],
        'Global Curiosity':   ['prompt2', ['world','global','culture','different','industry','abroad','perspectiv','curious','outside']],
        'Community Mindset':  ['prompt2', ['other','peer','communit','help','give back','support','team','share','together']],
      };
      /* Walk the criteria list itself, so a criterion can never silently go unproposed. */
      MENTEE_CRITERIA.filter(c=>c.scored).forEach(c=>{
        const rule = SIG[c.key];
        if(!rule){ items.push({key:c.key, score:3, why:'No reading rule for this criterion yet — please score it yourself.'}); return; }
        const [field, words] = rule;
        const n = hits(p[field], words), w = wc(p[field]);
        let s = 3;
        if(n >= 2) s += 1;
        if(w >= 80) s += 1;
        if(w < 30) s -= 1;
        items.push({key:c.key, score:clamp(s),
          why:`Prompt ${field==='prompt1'?'1':'2'}: ${w} words, ${n} signal${n===1?'':'s'} for this criterion.`});
      });
    }
    /* Safety net: a renamed or newly added criterion must still arrive with a row, or the
       console would render an empty select and the reviewer would be back to keying it in. */
    const crits = (p.kind==='mentor'?MENTOR_CRITERIA:MENTEE_CRITERIA).filter(c=>c.scored);
    crits.forEach(c=>{ if(!items.some(i=>i.key===c.key))
      items.push({key:c.key, score:3, why:'No reading rule for this criterion yet — please score it yourself.'}); });
    const ordered = crits.map(c=>items.find(i=>i.key===c.key));
    const avg = ordered.length ? Math.round(ordered.reduce((a,b)=>a+b.score,0)/ordered.length*10)/10 : null;
    return {items:ordered, avg, basis:'rules'};
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
    /* "Other" must always come with the free text behind it (Wei Kiat, F0817-235816). */
    if(f.heard===IND_OTHER) need('heardOther', f.heardOther);
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
      if(prefs.includes(IND_OTHER)) need('industryPrefOther', f.industryPrefOther);
      need('telegramConsent', f.telegramConsent);
      if(f.telegramConsent==='No') need('contactPref', f.contactPref);
    } else {
      need('org', f.org);
      need('designation', f.designation);
      need('industry', f.industry);
      if(f.industry===IND_OTHER) need('industryOther', f.industryOther);
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
      p.background = `${p.yearsExp||'previous-cycle mentor'}${p.yearsExp?' of experience':''} in ${p.industry===IND_OTHER?(p.industryOther||'their field'):p.industry}`;
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
  /* `proposed` = what the platform put in front of the reviewer. Kept alongside the submitted
     numbers so the override rate is measurable: if reviewers rewrite most proposals, the rubric
     is wrong and we should know that from the data, not from a hunch. */
  score(db, personId, reviewer, score, comment, criteria, proposed){
    db.reviews.push({personId,reviewer,score,comment,criteria:criteria||null,
                     proposed:proposed||null, proposedBasis:(proposed&&proposed.basis)||null});
    D.logAudit(db, db.today, reviewer, 'scored', personId);
  },
  /* Outcome notifications — Cycle 1 amendments (Joanne, 20 Aug, confirmed by Esther and
     Wei Kiat): ONE batch send on the outcome date, not a send fired by each approval.
     This reverses Q9 ("approving is the send"), so it is recorded rather than slipped in.
     Two things follow from batching that are worth more than the plumbing:
       · a decision revised during the review window leaves no trace in anyone's inbox,
         because the template is resolved from the person's FINAL status at send time,
         not from the click that first set it;
       · the cohort hears on one day, which is the promise the confirmation screen makes.
     Decisions taken after the batch has gone out send immediately: a straggler decided on
     the 16th must not sit waiting for a batch that already left. */
  outcomeTplFor(p){
    switch(p.appStatus){
      case 'accepted':              return p.kind+'_accept';
      case 'reserve_invited':       return p.kind+'_reserve';
      case 'declined':              return p.kind==='mentor' ? 'mentor_decline' : null;
      case 'declined_not_selected': return p.kind==='mentee' ? 'mentee_decline_not_selected' : null;
      case 'declined_ineligible':   return p.kind==='mentee' ? 'mentee_decline_ineligible' : null;
      default: return null;
    }
  },
  outcomeReleased: db => !!(db.outcomeBatch && db.outcomeBatch.at),
  outcomeQueue:    db => db.people.filter(p=>p.decisionAt && !p.outcomeSentAt),
  outcomeDue:      db => !!(db.config.selection||{}).outcomeBy && db.today >= db.config.selection.outcomeBy,
  sendOutcomeMail(db, p){
    const tpl=D.outcomeTplFor(p); if(!tpl) return false;
    db.emails.push({at:db.today,to:p.email,tpl,vars:{name:p.name,link:'#/me/'+p.id},kind:'decision'});
    p.outcomeSentAt=db.today;
    return true;
  },
  sendOutcomeBatch(db, actor){
    if(D.outcomeReleased(db)) return null;                   // one batch, once
    const sent=D.outcomeQueue(db).filter(p=>D.sendOutcomeMail(db,p));
    db.outcomeBatch={at:db.today, by:actor, count:sent.length};
    D.logAudit(db, db.today, actor, 'outcome_batch_sent:'+sent.length, 'decisions');
    return sent;
  },
  decide(db, personId, decision, actor){
    const p=D.person(db,personId); if(!p) return null;
    const prev=p.appStatus;
    p.appStatus=decision;
    if(!D.outcomeTplFor(p)){ p.appStatus=prev; return null; }  // wrong variant for this kind
    if(decision==='accepted') p.acceptedAt=db.today;
    if(decision==='reserve_invited') p.reserveOptIn=null;
    p.decisionAt=db.today;
    if(D.outcomeReleased(db)) D.sendOutcomeMail(db,p);         // batch has gone: send now
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
     only to accepted people whose place is not yet confirmed. Activated reserves get the
     compressed activation-reminder variant.
     WHEN is now a rule rather than a date, and one rule for both flows (Cycle 1
     amendments): "on the later of (a) 48 hours after their acceptance or activation
     email, and (b) two days before their deadline. If that date falls on or after the
     deadline itself, no automated reminder is sent and the team contacts the person
     directly."
     That last sentence is the half a build quietly drops. Somebody activated three days
     before the deadline gets NO automated chase — so the system has to hand them to a
     human by name (D.reminderManual) instead of letting them vanish from the list.
     Both halves are checked against the doc's own worked examples in backend_test.js. */
  reminderRule: db => (db.config.selection&&db.config.selection.reminderRule)||{afterEmailDays:2,beforeDeadlineDays:2},
  reminderDueOn(db, base, deadline){
    if(!base||!deadline) return null;
    const r=D.reminderRule(db);
    const after=D.shiftDate(base, r.afterEmailDays), before=D.shiftDate(deadline, -r.beforeDeadlineDays);
    const due = after>before ? after : before;
    return due>=deadline ? null : due;
  },
  /* The date their acceptance or activation email actually went out — the batch date for
     the main cohort, the activation day for a reserve. Falls back to the planned outcome
     date so the ladder can be drawn before anything has been sent. */
  reminderBaseDate(db, p){
    return p.activatedFromReserve || p.outcomeSentAt
        || (db.outcomeBatch&&db.outcomeBatch.at) || (db.config.selection||{}).outcomeBy || null;
  },
  reminderDueDate: (db,p) => D.reminderDueOn(db, D.reminderBaseDate(db,p), D.deadlineFor(db,p)),
  reminderPending: db => db.people.filter(p=>p.appStatus==='accepted' && !D.ackComplete(p) && !p.acceptReminderAt),
  reminderTargets(db){
    return D.reminderPending(db).filter(p=>{const d=D.reminderDueDate(db,p); return d && d<=db.today;});
  },
  reminderManual(db){                       // the machine will never chase these — a human must
    return D.reminderPending(db).filter(p=>!D.reminderDueDate(db,p));
  },
  /* The ladder the console prints, computed from the same rule the sender uses. */
  ackLadder(db){
    const sel=db.config.selection||{}, r=D.reminderRule(db), out=[];
    const main=D.reminderDueOn(db, sel.outcomeBy, sel.acceptBy);
    out.push({date: main||'—', who:'accepted in the outcome batch, place not yet confirmed',
      what:`Acceptance reminder — once, ${r.afterEmailDays*24}h after the outcome email or ${r.beforeDeadlineDays} days before the deadline, whichever is later`});
    if(sel.reserveActivateFrom && sel.reserveAcceptBy){
      const first=D.reminderDueOn(db, sel.reserveActivateFrom, sel.reserveAcceptBy);
      const lastAuto=D.shiftDate(sel.reserveAcceptBy, -(r.afterEmailDays+1));
      out.push({date:(first?first+' onwards':'—')+', per person', who:'activated reserves, place not yet confirmed',
        what:'Reserve acceptance reminder — the same rule, counted from each activation'});
      out.push({date:'no automated send', who:`anyone activated after ${D.fmtDMY(lastAuto)}`,
        what:'Too close to the deadline for a reminder to be worth sending — the team contacts them directly'});
    }
    return out;
  },
  /* Who is inside the programme group channel and who is not — mentors use WhatsApp,
     mentees use Telegram. Asking someone how they would rather be reached and then making
     the team open twenty individual pages to find out is only half an answer: the question
     is asked once per person but used once per cohort, so it has to be readable as a list.
     Each person outside the group carries the detail their own preference points at, so
     nobody has to go looking it up separately. */
  channelRoster(db){
    const side = (kind, consentKey, channel) => {
      const acc = db.people.filter(p=>p.kind===kind && p.appStatus==='accepted');
      const out = acc.filter(p=>p[consentKey]==='No').map(p=>{
        const pref = p.contactPref || '';
        const detail = /phone|call/i.test(pref) ? (p.phone || p.mobile || '') : (p.email || '');
        return {id:p.id, name:p.name, pref: pref || 'not stated', detail};
      });
      return {channel, total:acc.length, joined:acc.length-out.length, out};
    };
    return {
      mentors: side('mentor','whatsappConsent','WhatsApp'),
      mentees: side('mentee','telegramConsent','Telegram'),
    };
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
     freeing a seat is a decision a human owns. The deadline is per person: the cohort
     acceptance date, or the later reserve date for an activated reserve — read from
     config, never named here, because a date typed into a comment is a date that rots. */
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
    const rot=db.config.rotations.find(r=>r.n===pr.rotation);
    const common={rotation:pr.rotation, rotLabel:(rot&&rot.label)||'',
                  rotStart:rot?D.fmtLong(rot.start):'', rotEnd:rot?D.fmtLong(rot.end):''};
    [[e,m,true],[m,e,false]].forEach(([to,other,isMentee])=>{
      db.emails.push({at:db.today, to:to.email, kind:'match', tpl:'pair_match',
        vars:{...common, name:to.name, mentee:isMentee, link:'#/me/'+to.id,
              otherName:other.name, otherEmail:other.email, otherLinkedin:other.linkedin||'',
              otherLine: isMentee
                ? [other.designation, other.org].filter(Boolean).join(' at ')
                : (other.degree && other.university ? `who is reading ${other.degree} at ${other.university}`
                   : [other.degree, other.university].filter(Boolean).join(' at '))}});
    });
    if(rot && db.today>=rot.start){
      db.emails.push({at:db.today,to:`${m.email}, ${e.email}`,kind:'guide',
        subject:`Rotation ${pr.rotation} guide: ${rot.label}`});
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
    if(db.config.registration)
      db.config.registration={opens:sh(db.config.registration.opens), closes:sh(db.config.registration.closes)};
    if(db.config.selection){
      const s=db.config.selection;
      db.config.selection={...s, reviewFrom:sh(s.reviewFrom), approvalsBy:sh(s.approvalsBy),
        outcomeBy:sh(s.outcomeBy), acceptBy:sh(s.acceptBy),
        reserveActivateFrom:sh(s.reserveActivateFrom), reserveAcceptBy:sh(s.reserveAcceptBy)};
    }
    /* A new cycle has not sent its outcomes yet. Carrying the old batch record over would
       make the first approval of the new cohort send on the spot, which is the behaviour
       the amendments removed. */
    db.outcomeBatch = null;
    db.people.forEach(p=>{ delete p.decisionAt; delete p.outcomeSentAt; });
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
const GRMP_EXPORT = {Store, D, DB_KEY, buildSeed, MAIL_PREVIEW, INDUSTRIES, IND_OTHER, FACULTIES,
  MENTEE_CRITERIA, MENTOR_CRITERIA, FORM_OPTS, COPY, MAILS, RESOURCES};
if (typeof window !== 'undefined') window.GRMP = GRMP_EXPORT;
if (typeof module !== 'undefined' && module.exports) module.exports = GRMP_EXPORT;
