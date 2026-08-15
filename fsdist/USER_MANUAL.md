# GRMP Platform — User Manual

> **Demo edition.** Everything described here runs in the requirements demo. Boxes marked **⚠ Inferred** are decisions we reasoned out from your documents and implemented as the default — they run now, and you confirm or change them (each points to its Round-2 item).
>
> **Demo notes.** (1) The demo is a personal sandbox: it opens pre-loaded with a sample cohort, and everything you do stays in your browser — reset any time with *Reset demo data*. (2) Emails don't actually send; the demo shows each message on screen at the moment it would go out. (3) Admin sign-in is simulated — in production this is Google sign-in.
>
> This manual doubles as the build spec and the test script: every numbered step below is implemented and automatically tested exactly as written.

**The two ways into the platform** — this is a core design decision:

| Who | How they get in |
|---|---|
| Mentors & mentees (120 people) | **No accounts, no passwords — ever.** Every email they receive carries a personal link that opens their own page directly. |
| The admin team (~10 people) | Sign in to the console (Google sign-in in production; simulated in the demo). |

---

## 1 · Visitor — the microsite

*The public doorway. Anyone on the internet.*

**1.1 Landing page.** Open the demo link → the GRMP microsite. You see: what GRMP is, the Oct–Mar cycle with three rotations, the **three mentor tracks** (General / Entrepreneurship / AI), and two buttons: **Apply as Mentee** · **Register as Mentor**.

**1.2 Programme documents.** From the top navigation, open **For Mentees** (the mentee guide) and **For Mentors** (the mentor brief). These pages hold the briefing content. *(Content shown is placeholder structure — final text comes from the programme team.)* The **Reflection Sheet** is participant-only by the Programme Owner's decision: it opens from a participant's personal link, not from the public menu.

**1.3 Reflection Sheet page (participant-only).** Visiting `#/reflection` without a personal link shows a "for programme participants" notice. Opened from a personal page, the sheet shows the badge **"This reflection is yours. The platform never stores what you write here — it records only your end-of-rotation close-off"** and the three rotation templates (Know Yourself / Know Your World / Know Your Path) for private use.
> **⚠ Inferred (R2-Q1):** Reflection content lives here on the microsite, outside the system. Confirm or move it in-system.

**1.4 Concern link.** In the page footer: **"Raise a concern (private)"** — see chapter 8.

**1.5 Apply as Mentee.** Click **Apply as Mentee** → the application form. Fields follow the Working Design registration list *(swap-in pending Joanne's final form — R2-Q4)*. You must pick **exactly one track**, and tick the PDPA consent. Submit → a confirmation screen, and the demo shows the confirmation email that would be sent. If you leave required fields empty, the form saves as **incomplete** and shows the reminder email that would chase it.
> **⚠ Inferred (R2-Q3):** one track per mentee, chosen at application. Confirm.

**1.6 Register as Mentor.** Mentors arrive via an invitation link (the demo landing page includes a sample invitation). The registration form mirrors the mentee one (no availability question, no "how many mentees" question — capacity is fixed at 2 by rule). Submit → confirmation.

---

## 2 · Mentee — my personal page

*Reached only via personal links. The demo's* **Open as…** *switcher lists sample mentees — picking one is the same as clicking the link in their email.*

**2.1 My page.** You see your status timeline — Applied → Under review → Accepted → Acknowledged → Orientation → Matched (R1/R2/R3) → Completed — with your current step highlighted, and a card for what to do next.

**2.2 Acknowledgement.** Once accepted, your page shows **five documents to acknowledge** (Programme Rules, SMC Charter, Governance Guidelines, PDPA Consent, Conflict-of-Interest Declaration). Open each, tick, confirm — each records a timestamp and document version. Until all five are done, a banner reminds you that **you can't be matched yet**.
> **⚠ Inferred (R2-Q5):** reminders go out Sept W1 / W2 / W3; still nothing after the final reminder → treated as withdrawn, seat freed. Confirm.

**2.3 Orientation.** Your page offers the orientation: **live session** (the coordinator marks attendance) or **recorded module** — opening it records completion. Until orientation is complete you cannot enter Rotation 1.

**2.4 Matched.** When the Programme Lead approves your pairing you see the match notification exactly as it would arrive by email: your mentor's name and background, the rotation window, the rotation guide link, and a suggested first step.

**2.5 During the rotation.** Your page shows the current rotation guide and your mentor card. Nothing to fill in — meetings are yours to arrange; the reflection is written privately on the microsite page (1.3).

**2.6 Close-off (one minute).** When the rotation window ends, your page (and a reminder email) asks for your **close-off**: two ticks — *"We met at least twice" · "I completed my reflection"* — plus an optional comment. Submit → rotation marked complete. This is the only per-rotation record the system keeps.

**2.7 The close-off carries the checkpoints.** The Rotation 2 close-off includes your **mid-programme review** (required), and the Rotation 3 close-off includes your **end-of-programme evaluation** (required) — one form each, no separate chase. After Rotation 3, your page asks for your closing **Builder's Commitment** — a free-text reflection on how you'll contribute back.

**2.8 Certificate.** Rule (decided by the Programme Owner): **3 close-offs + mid-programme review + end-of-programme evaluation + Builder's Commitment**. Certificates are printed and presented at the Appreciation Night; the email you receive is a heads-up, not the certificate.

---

## 3 · Mentor — my personal page

**3.1 My page.** Same personal-link model, mentor timeline: Registered → Acknowledged → Orientation → Rotations → Mid-programme review → Completed.

**3.2 Acknowledgement & orientation.** Identical to 2.2 / 2.3 (mentor-role wording where relevant).

**3.3 Matched.** Per rotation you see your mentee card(s) — at most two — with their goals and development needs, the rotation guide, and a suggested first step.

**3.4 Two checkpoints, nothing else.** Mentors submit a **mid-programme review** (January — how the pairing is going, any support needed) and an **end-of-programme evaluation** (March — how it went end-to-end). Both are short free-text forms on the personal page; there are no other mentor duties in the system.

**3.5 Certificate.** Rule (decided by the Programme Owner): **mid-programme review + end-of-programme evaluation**. Presented physically at the Appreciation Night.

---

## 4 · Reviewer — screening console

*Sign in as Kenzie or Yu Tong (mentor reviewers), Portia or Sapranshu (mentee reviewers), or Esther / Wei Kiat (both).*

**4.1 My queue.** You see only your side's applications (mentor reviewers see mentors; mentee reviewers see mentees), each as a card: the full application answers, and an **AI summary** (3–5 lines, labelled "AI-generated") to speed reading. The AI never recommends accept or reject.

**4.2 Score.** Give a light-touch score (1–5) and an optional comment. Multiple reviewers can score the same application; all scores stay visible side by side.

---

## 5 · Programme Lead — decisions & matching (Esther)

**5.1 Decision queue.** Every scored application appears with its reviewer scores, comments and AI summary. For each: **Accept / Reserve bench / Waitlist / Decline**. The matching decision is yours alone — reviewers recommend, you decide. Each decision immediately shows the outcome email that would be sent. Reserve bench targets 10% of accepted mentors.

**5.2 Matching board (per rotation).** Three columns per track — the pool is strictly within-track. Click **Suggest matches (AI)** → ranked pairings appear, each with a plain-language rationale (why this pair: goals-fit, industry, background) and constraint checks (≤2 mentees per mentor · no conflict · no repeat mentor — violations are impossible to approve).
> **⚠ Inferred (R2-Q3):** within-track matching, priority = development-need fit → industry → diversity; no fixed track quotas. Confirm.

**5.3 Approve.** Approve pairs one by one (or adjust: swap a suggestion before approving). On approval, both sides' notification emails are shown, and the pair appears in every relevant view. Nothing is matched until you approve it.

**5.4 Certificates.** Lists everyone against the completion criteria with exactly which criteria are still missing, plus an **Exception report** — participants who miss a criterion, with an **Approve by exception** control for the Programme Lead (reason mandatory; recorded on the certificate and in the audit log). Certificates are printed and presented at the Appreciation Night.

---

## 6 · Coordinator — operations console (Wei Kiat)

**6.1 Dashboard.** One screen: the cohort funnel (Applied → Screened → Accepted → Acknowledged → Orientated → Matched → per-rotation Closed-off → Certified), per-track counts, the two gates' blocked lists, open exceptions, and checkpoint counters (mid-programme reviews, Builder Reflections, certificates, event attendance). The Programme Lead can **export the cohort report (CSV)** — export stays restricted to Lead + System Administrator.

**6.2 Reminder schedule.** The September acknowledgement ladder (W1 notify / W2 remind / W3 final) shown against today's date; each reminder that would fire lists its recipients and message. In the demo you can press **Advance demo clock** to watch the ladder fire.

**6.3 Waitlist.** Waitlisted applicants in reviewer-score order. When capacity opens, **Promote** moves the top applicant into the accepted flow (acknowledgement etc.) — one click.

**6.4 Close-off exceptions.** After a rotation ends, pairs with missing close-offs appear here with days-overdue and one-click **Remind again**.

**6.5 Events check-in.** Kickoff Night and Appreciation Night attendance: a search-and-tick list built for a phone at the door.

**6.6 Mentor dropout.** Mark a mentor dropped → their mentees enter a re-match queue restricted to **same-track reserve-bench mentors**; the Lead approves the replacement; the mentee's hand-over notification is shown. Target: within 7 days.

---

## 7 · Escalation Owner — concern inbox (Esther)

**7.1** The **Raise a concern** link (microsite footer + acknowledgement page) opens a private form. Submissions appear **only** in this inbox — no other role, including IT support, can see them; the system stores the referral record and routes the case to SMC's Grievance & Misconduct process.
> **⚠ Inferred (R2-Q6):** link appears on both the microsite and the acknowledgement page; Esther is the sole recipient. Confirm.

---

## 8 · Admin — cohort configuration

**8.1** Dates and windows: cycle dates, three rotation windows, the reminder ladder, event dates — all editable configuration, no code. **Demo clock:** advance the simulated date (15 Dec · R2 → 1 Feb · R3 → 20 Mar · closing week) to walk the full cycle to the end — Rotation 3 matching, final close-offs, Builder Reflections and certificates.
> **⚠ Inferred (R2-Q8):** demo runs on placeholder dates (registration opens early Sept · Kickoff early Oct · microsite live before registration). Replace with real dates.

**8.2** Role assignments per cohort (the SMU pilot names are pre-loaded), document versions for acknowledgement, and **Reset demo data**.

---

## Appendix — what the system deliberately does *not* do

No pair/meeting tracking during rotations · no availability collection · no kickoff-goals form · no reflection content stored · no participant accounts or passwords · no concern-case handling (referral only) · SMC Hikes not included (separate programme). **⚠ (R2-Q7):** please confirm this lean scope on the record.
