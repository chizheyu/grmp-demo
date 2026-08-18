# GRMP Platform — User Manual

> **Staging edition (R5 — built to the approved specs).** Everything described here runs on the shared staging platform and follows the six spec documents (mentor/mentee application specs, mentor/mentee post-selection specs, portal capability brief, project standards note). Legal text and every system email are rendered **verbatim** from the approved copy — a test suite diffs them against the spec files on every build.
>
> **Staging notes.** (1) The platform is a shared, real-time database: what one signed-in person does, everyone sees. Reset any time from Configuration. (2) Emails do not actually send; each message pops up on screen the moment it would go out, and every one is readable in full under **Console → Emails**. (3) The one-time login code is delivered the same way — it appears in the email popup, so the team can walk the whole flow. In production it arrives in the participant's inbox.
>
> This manual doubles as the build spec and the test script: the flows below are implemented and automatically tested as written (six suites; see `tests/`).

**The two ways into the platform** — a core design decision:

| Who | How they get in |
|---|---|
| Mentors & mentees | **No accounts, no passwords — ever.** The acceptance email carries a personal link; opening it asks for the email they applied with, sends a **one-time verification code** to that email, and the code signs them in. (A forwarded link alone cannot confirm a place — that is the point.) |
| The programme team (~6 people) | Sign in to the console with their accounts (Google sign-in in production; passcode accounts in staging). |

**The selection timeline (spec-confirmed constants, shown in Configuration):** applications 1–10 Sept · approvals completed by 16 Sept · outcome by 18 Sept · acceptance reminder (once) 17 Sept · acceptance deadline **20 Sept** · reserve-activation deadline **29 Sept** · Kick-Off **1 Oct, 7.30–9.00 pm, SMU ALCove**.

---

## 1 · Visitor — the microsite & the application forms

**1.1 The public site — four pages** (built to the UX owner's Pre-Login Site Build Spec; copy is that spec's, verbatim):
- **Home** (`#/`) — hero, the two ways in, the six-step timeline (Apply · Accept · Kick-Off · 3 rotations · Close each rotation · Complete), closing band. No FAQ answers and no rotation detail: those live on the pages below.
- **Mentees** (`#/mentees`) — the gain-led case: what you gain, what it asks of you, the three-rotation arc, the reflection-sheet bar.
- **Mentors** (`#/mentors`) — the contribute-led case, in the navy lane so the two audiences read apart at a glance.
- **FAQ** (`#/faq`) — three tabs (About GRMP · For mentees · For mentors), sub-category headings, single-open accordions, all collapsed on load, keyboard-operable.

Shared header on every page: **Mentees · Mentors · FAQ** plus a secondary **Sign in** (cue: "Already accepted? Sign in"). **Apply is never in the nav** — it is the primary red action in the page body. On narrow screens the three links collapse into a menu; Sign in stays pinned.

Shared footer on every page: **About SMC** · **SMC Charter** (hosted PDF, opens in a new tab) · **Programme Enquiries** · **Raise a concern (private)**.

**1.2 Programme documents.** The written briefing material now lives in the gated **Resources** library (chapter 2.9), not on the public site — that is the UX owner's confirmed boundary. The old `#/guide/mentee` and `#/guide/mentor` paths forward there. The **Reflection Sheet** stays participant-only.

**1.3 Apply as a Mentee — a 4-step staged form** (About you · Your studies · Your growth · Commitment & consent):
- Persistent progress stepper; **Next** validates only the current step; **Back never loses data**.
- SMU email asked with a **soft warning** if it does not look like a student address (the binding gate is the eligibility checkbox, not the domain).
- **Step 2 — the hard gate:** "I confirm I am a current SMU undergraduate" (all years eligible, incl. final-year; 7-school faculty list).
- **Step 3 — the scored core:** the two written prompts (verbatim from the spec), each with a live word count and a **hard cap of 200 words** (no minimum — tight answers are a good signal); three **distinct** industry preferences from the same list mentors classify themselves on (the spec's 17 options plus **Artificial Intelligence**, added on the Programme Lead's request). Choosing **Other** anywhere on the form opens a free-text box; the answer is required, so "Other" never arrives blank.
- **Step 4:** commitment confirmation, Telegram-group consent (the mentee channel; declining asks for a preferred contact method, Email or Phone), and the approved **PDPA consent rendered verbatim** — timestamped on submission. PDPA is collected once, here; it is *not* repeated at the acceptance gate. The wording is Joanne's revised text of 18 Aug 2026 (`specs_joanne_r7/`), which adds the technology-provider / AI-assisted-tools paragraph and the "will not **otherwise** share" carve-out.
- **No save-and-resume (confirmed):** the form is completed in one sitting — there is no applicant login to attach a partial record to. A browser leave-page warning guards accidental loss. *(This replaces the earlier draft-saving behaviour — see the decisions register, Q10.)* The form no longer prints a written notice saying so: the browser's own warning carries it (Joanne, 18 Aug).
- Submit → verbatim confirmation screen + the acknowledgement-receipt email.

**1.4 Apply as a Mentor — the same staged pattern** (About you · Your experience · Your mentoring contributions · Commitment & consent), with the **returning-mentor branch**: "I was a mentor in last year's programme" hides the screening fields (years of experience, led-a-team, leadership text, cross-industry) — returners are matched against last cycle's roster by the team before acceptance. WhatsApp is the mentor channel; declining the group asks for a preferred contact method, **Phone call or Email** (Telegram was offered until 18 Aug, when Joanne pointed out the form never collects a mentor's Telegram handle). Same verbatim PDPA, same no-save rule.

**1.5 Duplicate protection.** A second application on a known email flags **both** records for a human to review — never silently merged, never auto-rejected.

**1.6 Concern link.** In the page footer: **"Raise a concern (private)"** — see chapter 7.

---

## 2 · Accepted participant — link, code, gate, page

**2.1 The acceptance email** (verbatim, dual-signed by Esther Koh and Wei Kiat Koh) carries the personal link and the 20 Sept deadline.

**2.2 Sign-in.** The link opens a check: *enter the email you applied with* → a one-time code is emailed → entering it signs you in. Wrong email or wrong code: a clear message, no data shown.

**2.3 The acceptance gate (first login; mandatory; binding).** Three items, each actioned separately, each **timestamped independently**:
1. **Programme Rules** — the approved text (mentor and mentee versions differ in substance), rendered verbatim in a scrollable panel, with the exact acknowledgement checkbox.
2. **Conflict of Interest** — declare / no conflict (radio); details required only when declaring; the confirmation checkbox is always required.
3. **Kick-Off attendance** — a binding programme requirement with an exception-request path (reason required). Exception requests route to **Esther Koh and Wei Kiat Koh**, who decide; a request is a request, not a waiver.

Completing all three **confirms the place**: the onboarding email fires *(copy is a placeholder pending the approved onboarding text)* and the portal page opens. PDPA is deliberately **not** in this gate.

**2.4 Kick-Off logistics (after the gate).** Confirmed attendees are asked two optional questions — arrival/departure note, dietary restrictions (catering only). Resumable; skippable.

**2.5 The personal page.** Journey bar (Applied → Accepted → **Place confirmed** → rotations → certificate), the current next step, rotation cards with the matched partner, and every submitted artefact echoed back.

**2.6 Rotations & close-offs (unchanged from the owner's decisions):** meet at least twice per rotation; one-minute close-off; the R2 close-off carries the mentee's mid-programme review, the R3 close-off the end-of-programme evaluation; then the Builder's Commitment. Reflection content is never stored.

**2.7 Certificates (owner's rule):** mentee = 3 close-offs + mid-prog review + end-prog evaluation + Builder's Commitment; mentor = mid-prog feedback + end-prog evaluation. Printed and presented at the Appreciation Night (26 Mar).

**2.8 Reserve list members** see an honest status page: opted in / awaiting your reply / declined — and what activation would mean.

**2.9 Resources** (`#/resources`, in the participant nav, to the right). One library, five documents, supplied by the programme and hosted on the platform: mentee preparation note, mentee briefing deck, personal reflection sheet, mentor rotation briefing & conversation guide, mentor briefing deck. **Everyone signed in sees everything** — the two headings label who each document is mainly for, they do not filter. Documents open in a new tab. Revisions are overridden in place, so a link never changes. *(Staging caveat: the page is gated, the file URLs are not — production moves these to authenticated storage. See Appendix B.)*

---

## 3 · Reviewer — screening console

**3.1 My queue.** Mentor reviewers see mentors; mentee reviewers see mentees. Each card shows the full application (for mentees: both prompts in full, with the criteria each prompt is read for — the committee scoring guide is built into the page) and a labelled AI summary that never recommends an outcome.

**3.2 Scores arrive proposed; you confirm them.** Every scored criterion is pre-filled with a proposed 1–5 and a one-line reason for it, read from the application itself — nobody keys 120 applications in by hand (Wei Kiat, 18 Aug). Where the live model is reachable it does the reading and the block says so; where it is not, a rule-based first cut stands in and says *that*. Change anything that does not look right, then **Confirm scores**. What was proposed is stored next to what you submitted, so how often the proposal gets overridden is a number we can look at rather than guess.

**3.3 The criteria themselves.** Mentee: five scored criteria (Readiness to Learn · Global Curiosity · Values Awareness · Ownership · Community Mindset) — **Commitment is a confirmation captured on the form**, shown as a badge, not scored. Mentor: four scored criteria (Professional Credibility · Breadth of Perspective · Values Alignment · Mentoring Mindset) + the same Commitment confirmation. Each criterion is 1–5; the stored score is the average, with the per-criterion breakdown kept.

---

## 4 · Programme Lead — decisions, matching, certificates

**4.1 Decisions. Approving is the send:** every decision issues its verbatim outcome email automatically (spec flow stage 0 — approval and invitation are one action; running as the default, Q9 card to confirm). The buttons per applicant:
- **Accept** → acceptance email with personal link + 20 Sept deadline
- **Reserve list** → the Reserve email (opt-in requested by 20 Sept)
- Mentor: **Decline** · Mentee: **Decline (not selected)** / **Decline (ineligible)** — two honest variants: "more applications than places" is true for one and misleading for the other.

**4.2 Matching (per rotation).** One pool — hard constraints: ≤2 mentees per mentor · no repeat mentor · **only confirmed places enter matching**. **Suggest matches** scores every eligible mentor on the mentee's three ranked industry preferences (first +10 · second +6 · third +3), significant cross-industry breadth (+2), organisation diversity across rotations (+3) and load spread; the top match is proposed with its actual scoring reasons quoted. Declared conflicts of interest from the gate are listed above the board for the Lead to check against. Alternatives, swap and discard work per proposal; nothing is matched until the Lead approves.

**4.3 Certificates.** Progress against the criteria, one-click issue for qualifiers, and the **exception report** with approve-by-exception (reason mandatory; recorded and audited).

---

## 5 · Coordinator — operations

**5.1 Dashboard.** The worklist ("what needs you"), then the standing state: **Place confirmed X/Y (gate done, by 20 Sept)** with the per-person not-yet-confirmed list (which of the three items each is missing, and whether they have been reminded), Kick-Off confirmations, open exceptions, Reserve-list counts, submissions, certificates. Tiles link to the page where the work happens. CSV export is restricted to the Lead.

**5.2 Reminders.** The confirmed rule, mechanised: acceptance reminders are sent **once** per person, only to accepted-but-unconfirmed, a few days before 20 Sept (activated reserves: the compressed variant before 29 Sept; no same-day nudge). Staging has a "send now" control; production runs it on schedule. After the deadline passes, the **seat release** list appears — releasing is an explicit human action; freed seats go to the Reserve list.

**5.3 Reserve lists.** Both lists ranked by committee score, with the reply state (opted in / awaiting / declined — replies arrive by email and are recorded here) and **Activate**: sends the activation acceptance email with the 29 Sept deadline and puts the person into the normal gate flow. Places opening too late for email: contact the person directly (confirmed — no email fallback deadline).

**5.4 Exceptions.** Kick-Off exception requests (decide: approve / ask to attend — participant notified either way), overdue close-offs (remind), and mentor dropouts (mentees re-matched from the opted-in Reserve Mentor list within 7 days).

**5.5 Events.** Kick-Off check-in list = everyone who confirmed attendance in the gate, with the **catering summary** (dietary notes) and arrival notes from the logistics step. Appreciation Night check-in for the full cohort.

---

## 6 · Emails — every message, verbatim

**Console → Emails** holds (a) the **template library**: all 17 approved participant templates (mentor set of 8, mentee set of 9) plus the operational two (one-time code; onboarding placeholder), each openable with placeholder data; (b) the **sent log**: every message the system has issued, openable in full. Sender identity on everything: From **SMC GRMP Team**, reply-to **smu.smc@sa.smu.edu.sg** (configured at the mail-platform level in production). Relationship-defining emails are dual-signed (Esther Koh + Wei Kiat Koh); operational chase-ups are signed by Wei Kiat Koh only.

---

## 7 · Escalation Owner — concern inbox

The **Raise a concern** link opens a private form. Submissions appear only in this inbox — no other role, including IT support, can see them; the platform stores the referral record and routes the case to SMC's Grievance & Misconduct process.

---

## 8 · Configuration

Cycle dates, the **selection timeline** (all the spec dates in one table), roles, the decisions register (open cards + settled records), the demo clock (walk the cycle to its end), optional briefing-recording links (a resource card on confirmed participants' pages — **not** a gate), and **Start a new cycle**: archives the current cycle, carries mentors over as invited (the acceptance gate re-applies), shifts every configured date into the new year — configuration, not code.

---

## Appendix A — what the system deliberately does *not* do

No pair/meeting tracking during rotations · no availability collection · no reflection content stored · no participant accounts or passwords · no headshots collected at any stage (privacy + bias, spec-confirmed) · no concern-case handling (referral only) · SYHL questions out of scope · SMC Hikes not included.

## Appendix B — open items owed by the programme side (from the specs)

SMC brand guidelines & assets (styling waits for them — Q12) · portal onboarding email copy · form fill-time estimate to measure on a real fill-through.

Opened by the pre-login and Resources build specs:
- **Outcome-by date, 14 or 18 Sept — still open (Q13).** The Programme Owner asked for 14 Sept (F0816-152143); the later Pre-Login Site spec lists 18 Sept as confirmed. Running on **18 Sept**. On 18 Aug the UX owner took the whole date set back to reconcile the interconnected dates and will return with them. (Accept-by is settled at **20 Sept** — both sources agree.)
- ~~Two FAQ answers awaiting owner confirmation~~ — **closed 18 Aug.** Both answers confirmed by the UX owner (F0818-131510); the line "Accounts exist only for the programme team" was removed on her instruction, and the on-page badges are gone.
- ~~FAQ mentee eligibility~~ — **closed 18 Aug.** The SMU-undergraduate wording is confirmed (F0818-131600).
- ~~Concern link in the footer~~ — **closed 18 Aug.** Confirmed to stay as the fourth footer item (F0818-131630).
- **Q9, auto-issue on approval — closed 18 Aug.** Confirmed by both the Programme Owner (F0817-145316) and the UX owner (F0818-131700).
- **Gated documents are page-gated, not file-gated.** Static hosting serves the Resources files to anyone holding the URL. Production must move them behind authenticated storage; on the go-live list with Auth and the real mail channel.
