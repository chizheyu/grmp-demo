# GRMP Platform — Requirements Demo

A **fully working demo** of the GRMP digital platform, built to align requirements by using the real thing instead of reading documents.

**Live demo:** https://chizheyu.github.io/grmp-demo/

- The complete journey runs for every role: microsite → apply → screening (AI summaries) → decisions → acknowledgement gate → orientation gate → AI-suggested matching (human-approved) → rotations → close-off → mid-programme review → Builder Reflection → certificates → dashboard.
- **Yellow "INFERRED" cards** mark the 8 open decisions: we inferred the most sensible default from SMC's own documents, implemented it, and the programme team confirms or changes it (Round 2 sheet).
- Sample data only (seeded 60+60 cohort, simulated today = 15 Dec 2026). Each visitor gets their own sandbox — nothing you click affects anyone else. No real emails are sent; the demo shows each message on screen instead.
- Participants have **no accounts by design** (personal links); admin sign-in is simulated (Google SSO in production).

## How this was built (AI-driven)

`USER_MANUAL.md` was written **first** — it is simultaneously the requirements spec, the build target, the test script and the manual that ships. The system was then implemented to match it, by an AI agent, in a day.

- **L1 backend tests** (domain rules, CLI): `node tests/backend_test.js` — 38 assertions
- **L2 end-to-end tests** (real page clicks + state assertions): `python tests/e2e_test.py` — 34 scenarios

This repo is also the **machine-readable context pack**: feed it to your AI agent and ask it anything about the product.

*Prototype for the SMC GRMP digitisation project · sample data · not a production system.*
