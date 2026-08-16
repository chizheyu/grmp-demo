# GRMP Platform — Architecture & Developer Guide

> One codebase, three runtimes. The domain layer is the single source of truth; everything else is an adapter.

## The three runtimes

| Mode | Where | Storage | Who uses it |
|---|---|---|---|
| **Sandbox** | GitHub Pages / local file | `localStorage` (per browser) | Public demo, all automated tests |
| **Platform (CURRENT)** | Firebase Hosting + **Firestore** — https://grmp-platform.web.app | `state` collection, one doc per db slice; generic JSON differ writes only changed slices; onSnapshot live sync | SMC staging — real database, real-time, local-first mutations (~ms) |
| Platform (fallback) | Google Apps Script Web App | Drive JSON + Cache + Lock | Superseded; kept as backup |

The frontend detects its runtime: `google.script.run` present → Apps Script RPC; Firebase config present → Firestore adapter; otherwise localStorage sandbox.

## File map

```
data.js            ← THE DOMAIN LAYER. Pure JS, runs in browser, Node and Apps Script.
                     Seed (deterministic PRNG), entities, all mutations (GRMP.D.*),
                     gates/constraints/certificate rules, cohort model, accounts.
                     If you change behaviour, you change it HERE and only here.
app.js             ← Shell: router, render loop, session, Actions registry (thin — every
                     mutation funnels through call() → GRMP.D.* locally or via RPC),
                     login page, feedback + decision modals, email popups.
views_public.js    ← Microsite + participant personal pages (manual ch.1–3).
views_console.js   ← Role-scoped admin console (manual ch.4–8) incl. Start-new-cycle.
ai.js              ← Gemini layer: progressive upgrade, cache, graceful fallback.
                     Sandbox: client key (accepted risk). Platform: server-side key via aiGen.
styles.css         ← Design system (SMC red; INFERRED yellow cards; console dark sidebar).
index.html         ← Plain shell that loads the above (sandbox mode).

platform/
  server.gs        ← Apps Script server: Drive/Cache store, sessions, permission map
                     (PERMS), action dispatcher (applyAction), AI proxy, doGet.
  build_platform.js← Assembles platform/dist/ (Code.gs = server.gs + data.js;
                     index.html = shell + inlined css/js). Single source, fan-out at build.
  dist/            ← Generated. Never hand-edit. clasp pushes from here.

tests/
  backend_test.js  ← L1 domain tests (Node, 50 checks) — seed integrity, gates,
                     matching constraints, certificates, dropout, cohort/new-cycle.
  e2e_test.py      ← L2 sandbox E2E (Playwright, 35) — real clicks per manual chapter.
  e2e_full_cycle.py← L2 cohort lifecycle (43) — branches: dropout→bench, waitlist,
                     R2→R3 via demo clock, multi-reviewer comments, certificates.
  e2e_platform.py  ← L3 live platform E2E (13) — login, roundtrip persistence,
                     cross-browser shared state, server-side permission guards, reset.
  record_videos.py ← Role walkthrough videos (Playwright capture + ffmpeg).

USER_MANUAL.md     ← Written FIRST. Simultaneously: requirements spec, build target,
                     test script, and the manual that ships. Yellow ⚠ items = the 8
                     inferred defaults (Round-2 decisions, confirmable in-product).
```

## Data flow (platform mode)

```
click → Actions[x] → call('fnName', args)
  └→ google.script.run.applyAction(token, fn, args)
       └→ LockService → loadDb_ (Cache→Drive) → permission check (PERMS + self-check)
          → GRMP.D[fn](db, ...args)   ← same function the sandbox and tests run
          → audit row → saveDb_ → returns {ok, out, db}
  └→ client sets db = resp.db → render()
```

Accounts: 11 preset (6 admins + 5 participant personas), passcode `grmp2026`, defined in
`data.js` `config.accounts`. Sessions live in `db.sessions`, token in `localStorage`.
Public microsite + application forms need no session (tokenless actions whitelisted `*` in PERMS).
In production, real participants never get accounts — personal email links (design decision, SMC-confirmed);
preset accounts exist so the team can experience every role.

## Multi-cycle (run it again next year — no redevelopment)

`D.startNewCycle(db, {label, rotations, today, carryOverMentors})`:
archives current cycle (stats snapshot in `db.archives`), carries accepted/bench mentors
over as `invited` (ack + orientation reset — the existing gates automatically enforce
re-onboarding), clears cycle-scoped entities, swaps `config.cohort/rotations`.
UI: Console → Configuration → "Start a new cycle" (Lead only). Returning mentor sees a
welcome-back card → `confirmReturn` → normal gate flow.

## Deploy (Firestore platform — the CURRENT production path)

```bash
# 1. Sync sources into the hosting dir (fsdist/ is a hand-copied mirror, no build step)
cp data.js app.js views_public.js views_console.js styles.css fire.js ai.js USER_MANUAL.md fsdist/
# 2. Deploy hosting
firebase deploy --only hosting
# 3. ONLY if data.js bumped DB_KEY (schema change): reset the shared seed, or every
#    client hangs on "Connecting…" against old-shape slices. Run FIRE.resetAll() from a
#    clean Playwright browser (the owner's local Chrome proxies firestore.googleapis.com
#    into a black hole — never use it for Firestore work).
# 4. Sandbox (GitHub Pages) — git push, done
```

Firestore write safety: the adapter writes JSON round-trips (`JSON.parse(JSON.stringify(...))`) —
a single `undefined` field anywhere in a slice makes Firestore reject the WHOLE batch and the
change silently never lands. Guarded in L1 (`no mutation ever leaves undefined field values`).

## Deploy (Apps Script fallback — superseded, kept for reference)

```bash
node platform/build_platform.js
cd platform && clasp push -f && \
  clasp deploy -i AKfycbytCwgGEzhgvaWu5ADK9ml594o6PUTLf4suantAWHMKKEQtinaz6xnJBWdZDusk8zdkkA -d "update"
```

Known quirks: CLI-created web-app deployments 404 (create the first deployment in the
Apps Script UI once, then `clasp deploy -i` updates it in place); Google's sandbox wrapper
frames throw a benign `missing )` pageerror (our frame is clean — the L3 suite filters it);
never reference `db` at top level in app.js (null until boot in remote mode).

## Feedback & decisions loop

💬 Feedback button (every screen) + INFERRED-card Confirm/Change → POST to a separate
Apps Script endpoint → Google Sheet ("GRMP Feedback") → `AISMC/feedback_admin.sh new|set`
→ status shown on #/changelog and #/decisions. Credentials/endpoints: `AISMC/凭据与端点_内部.md`.

## Tests (R5 set — run in this order after any change)

```bash
node tests/backend_test.js        # 181 — domain + VERBATIM guard (diffs legal text against
                                  #       ../specs_joanne/*.md; email subjects/signatures/sender)
node tests/render_smoke.js        # 120 — every role × view + form steps + gate/OTP states
python tests/e2e_r5_flows.py      # 34  — DESTRUCTIVE full journeys on the live platform
                                  #       (apply→score→accept→OTP→gate→reserve→reminders);
                                  #       resets the shared seed at the end — run FIRST
python tests/e2e_acceptance.py    # 127 — non-destructive live sweep (roles, permissions, R5 phases)
python tests/e2e_deadends.py      # every page actionable; regenerates ../GRMP_Role_Report.md
python tests/e2e_content.py       # content smells (stuck columns, leaks, count mismatches)
python tests/e2e_a11y.py          # axe-core WCAG A/AA
```
All green = safe to deploy. The manual's numbered steps are the test cases.
(Older suites e2e_test.py / e2e_full_cycle.py / e2e_platform.py / e2e_firestore.py predate the
R5 model and are superseded by the set above.)
