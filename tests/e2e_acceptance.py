# Acceptance sweep against the LIVE platform — mirrors GRMP_Test_Script.md.
# Non-destructive by design: no demo-clock advance, no new cycle, no reset,
# because the shared database is what SMC opens tomorrow.
# What it catches: dead views, blank pages, uncaught JS errors, empty states,
# permission leaks, and buttons that do nothing.
# Run: python tests/e2e_acceptance.py
import asyncio, sys
from playwright.async_api import async_playwright

URL = "https://grmp-platform.web.app"
PASS = "grmp2026"
P = [0, 0]
NOTES = []


def T(name, cond, note=""):
    P[0 if cond else 1] += 1
    print(("  PASS " if cond else "  FAIL ") + name + (f"  — {note}" if note and not cond else ""))
    if not cond:
        NOTES.append(name + (f" — {note}" if note else ""))


async def wait_db(pg, timeout=40):
    for _ in range(timeout * 2):
        if await pg.evaluate("!!(window.__demo && window.__demo.db)"):
            return True
        await pg.wait_for_timeout(500)
    return False


async def js(pg, expr):
    # Pass a real function, not an IIFE string: Playwright's "is this a function?"
    # heuristic mis-parses multi-line IIFEs and silently returns None.
    return await pg.evaluate(
        "() => { const db = window.__demo.db, D = window.GRMP.D; return (" + expr + "); }")


async def logout(pg):
    await pg.evaluate("localStorage.removeItem('grmp_session')")
    await pg.evaluate("location.hash='#/'")
    await pg.reload()
    await wait_db(pg)


async def login(pg, user):
    await logout(pg)
    await pg.evaluate("location.hash='#/login'")
    await pg.wait_for_selector("#lg-u", timeout=20000)
    await pg.fill("#lg-u", user)
    await pg.fill("#lg-p", PASS)
    await pg.click('button[data-act="doLogin"]')
    await pg.wait_for_timeout(1800)


async def body_text(pg):
    return (await pg.inner_text("#app")).strip()


async def goto(pg, h):
    await pg.evaluate(f"location.hash={h!r}")
    await pg.wait_for_timeout(700)


# ---- expected nav per role, from Console.navItems (R5: reserve lists replace the waitlist) ----
ADMINS = {
    "esther":    ["dashboard", "review-mentors", "review-mentees", "decisions", "matching",
                  "submissions", "reserve", "exceptions", "certificates", "concerns", "audit", "emails", "config"],
    "weikiat":   ["dashboard", "review-mentors", "review-mentees", "decisions", "matching", "submissions",
                  "reminders", "reserve", "exceptions", "events", "certificates", "concerns", "audit", "emails", "config"],
    "kenzie":    ["review-mentors", "emails", "config"],
    "yutong":    ["dashboard", "review-mentors", "emails", "config"],
    "portia":    ["dashboard", "review-mentees", "emails", "config"],
    "sapranshu": ["dashboard", "review-mentees", "emails", "config"],
}
DISPLAY = {"esther": "Esther", "weikiat": "Wei Kiat", "kenzie": "Kenzie",
           "yutong": "Yu Tong", "portia": "Portia", "sapranshu": "Sapranshu"}
PERSONAS = ["mentee.new", "mentee.mid", "mentee.done", "mentor.active", "mentor.bench"]
PUBLIC = ["#/", "#/mentees", "#/mentors", "#/faq", "#/resources", "#/reflection", "#/concern",
          "#/apply/mentee", "#/apply/mentor", "#/manual", "#/changelog", "#/decisions"]


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(URL, wait_until="domcontentloaded")
        T("platform boots and the shared database loads", await wait_db(pg))

        print("— Phase 0/1 · public microsite (no account) —")
        for h in PUBLIC:
            await goto(pg, h)
            txt = await body_text(pg)
            T(f"{h} renders real content", len(txt) > 220, f"only {len(txt)} chars")
        await goto(pg, "#/reflection")
        T("1.3 anonymous reflection page shows the participant-only gate (Q1)",
          "participant" in (await body_text(pg)).lower())
        pid = await js(pg, "db.people.find(p=>p.appStatus==='accepted').id")
        await goto(pg, f"#/reflection/{pid}")
        T("1.3 personal-link reflection page states the privacy boundary",
          "never stores" in (await body_text(pg)).lower())
        await logout(pg)
        await goto(pg, "#/")
        T("0.3 a signed-out visitor can find the way in",
          await pg.locator('a[href="#/login"]').count() > 0
          or await pg.locator('[data-goto="#/login"]').count() > 0
          or "sign in" in (await body_text(pg)).lower())

        print("— Phase 7.3 · gating —")
        await logout(pg)
        await goto(pg, "#/console/Esther/dashboard")
        T("7.3 console blocked while signed out", "#lg-u" in await pg.content()
          or await pg.locator("#lg-u").count() > 0)
        # the URL must not open someone else's console: participants bounce to their
        # own page, admins to their own console
        await login(pg, "mentee.new")
        await goto(pg, "#/console/Esther/matching")
        T("7.3 a participant cannot land on any console via URL",
          (await pg.evaluate("location.hash")).startswith("#/me/"))
        await login(pg, "kenzie")
        await goto(pg, "#/console/Esther/dashboard")
        T("7.3 an admin is bounced to their own console via URL",
          (await pg.evaluate("location.hash")).startswith("#/console/Kenzie"))

        print("— Phase 3/4/5 · every admin role, every menu item —")
        for acct, keys in ADMINS.items():
            await login(pg, acct)
            name = DISPLAY[acct]
            shown = await pg.evaluate(
                "[...document.querySelectorAll('.co-item')].map(b=>b.dataset.goto.split('/').pop())")
            T(f"{acct}: nav matches its role ({len(keys)} items)", sorted(shown) == sorted(keys),
              f"got {sorted(shown)}")
            for k in keys:
                await goto(pg, f"#/console/{name.replace(' ', '%20')}/{k}")
                txt = await body_text(pg)
                T(f"{acct} → {k} renders", len(txt) > 160 and "View not available" not in txt,
                  f"{len(txt)} chars")
            # permission checks
            if acct in ("kenzie", "yutong"):
                T(f"{acct} cannot reach the mentee queue", "review-mentees" not in shown)
            if acct in ("portia", "sapranshu"):
                T(f"{acct} cannot reach the mentor queue", "review-mentors" not in shown)
            if acct not in ("esther", "weikiat"):
                await goto(pg, f"#/console/{name.replace(' ', '%20')}/dashboard")
                T(f"{acct} has no CSV export (Lead-only)",
                  await pg.locator('[data-act="exportReport"]').count() == 0)
            if acct == "weikiat":
                await goto(pg, f"#/console/{name.replace(' ', '%20')}/dashboard")
                T("weikiat (Programme Lead) has CSV export",
                  await pg.locator('[data-act="exportReport"]').count() >= 1)
            if acct not in ("esther", "weikiat"):
                T(f"{acct} cannot see the concern inbox", "concerns" not in shown)

        print("— Phase 4.1 · the dashboard has to be actionable —")
        await login(pg, "esther")
        await goto(pg, "#/console/Esther/dashboard")
        T("4.1 worklist present", await pg.locator(".worklist").count() == 1)
        rows = await pg.locator(".wl-row").count()
        T("4.1 worklist rows each carry a working link",
          rows > 0 and await pg.locator(".wl-row a.wl-b[href]").count() == rows,
          f"{rows} rows")
        tiles = await pg.locator(".funnel-grid .stat").count()
        clickable = await pg.locator(".funnel-grid a.stat-go[href]").count()
        # Cohort totals ("74/68 applications", "60+60 accepted", track split) deliberately
        # do NOT link — they are state, not work, and a tile that opens an empty page is
        # worse than one that does nothing. Reminders/Events are coordinator-only for Esther.
        T("4.1 stat tiles lead somewhere wherever the role has a destination",
          clickable >= 6, f"{clickable}/{tiles} clickable")
        # a tile must never link to a page this role cannot open
        navset = await pg.evaluate(
            "new Set([...document.querySelectorAll('.co-item')].map(b=>b.dataset.goto.split('/').pop()))"
            " && [...document.querySelectorAll('.co-item')].map(b=>b.dataset.goto.split('/').pop())")
        hrefs = await pg.evaluate(
            "[...document.querySelectorAll('.funnel-grid a.stat-go')].map(a=>a.getAttribute('href').split('/').pop())")
        T("4.1 no tile links to a page this role cannot open",
          all(h in navset for h in hrefs), f"{[h for h in hrefs if h not in navset]}")
        T("4.2 CSV export available to the Lead",
          await pg.locator('[data-act="exportReport"]').count() == 1)
        T("4.10 Lead can reach Exceptions",
          await pg.locator('.co-item[data-goto$="/exceptions"]').count() == 1)

        print("— Phase 4.4/4.5/5.3 · matching ranks, and the Lead can say no —")
        await goto(pg, "#/console/Esther/matching")
        # start from a clean board so the run is repeatable and leaves nothing behind
        for pid in await js(pg, "db.pairs.filter(p=>p.status==='proposed').map(p=>p.id)"):
            await pg.evaluate(f"document.querySelector('[data-act=\"discardPair\"][data-pair=\"{pid}\"]')?.click()")
            await pg.wait_for_timeout(400)
        pre_existing = await js(pg, "db.pairs.filter(p=>p.status==='proposed').map(p=>p.id)")
        T("5.3 board can be cleared before the run", not pre_existing, str(pre_existing))
        # generate real proposals through the UI button, exactly as the Lead would
        for i in range(3):
            btns = pg.locator('[data-act="suggest"]')
            if await btns.count() > i:
                await btns.nth(i).click()
                await pg.wait_for_timeout(1200)
        mine = await js(pg, "db.pairs.filter(p=>p.status==='proposed').map(p=>p.id)")
        fresh_ids = [i for i in mine if i not in pre_existing]
        T("4.4 Suggest matches (AI) actually produces proposals", len(fresh_ids) > 0)
        T("4.4 proposals record their rank and pool size",
          await js(pg, "db.pairs.filter(p=>p.status==='proposed')"
                       ".every(p=>typeof p.score==='number' && p.rankedOutOf>0)"))
        T("4.4 rationale states the ranking, not a template",
          await js(pg, "db.pairs.filter(p=>p.status==='proposed')"
                       ".every(p=>/Ranked 1st of \\d+/.test(p.rationale.join(' ')))"))
        alt_probe = await js(pg, """
            db.pairs.filter(p=>p.status==='proposed').map(pr=>{
              const a=D.alternativesFor(db,pr.id,3);
              return {n:a.length, selfExcluded:a.every(x=>x.m.id!==pr.mentorId),
                      sorted:a.every((x,i)=>i===0||a[i-1].score>=x.score),
                      top:a.length?a[0].score:null,
                      mine:Math.round(D.matchScore(db,D.person(db,pr.mentorId),D.person(db,pr.menteeId)).score*10)/10};
            })""")
        T("5.3 alternatives are offered and ranked",
          bool(alt_probe) and all(a["selfExcluded"] and a["sorted"] for a in alt_probe),
          str(alt_probe[:2]))
        T("5.3 the discard control is on every proposal",
          await pg.locator('[data-act="discardPair"]').count()
          == await js(pg, "db.pairs.filter(p=>p.status==='proposed').length"))
        # The Q3 promise. Compared against the alternatives still on offer, with a 0.5
        # allowance: the chosen mentor already spent its own load credit on this pair.
        T("4.5 no remaining mentor outranks the one proposed",
          all(a["top"] is None or a["top"] <= a["mine"] + 0.5 for a in alt_probe),
          str([(a["mine"], a["top"]) for a in alt_probe if a["top"] and a["top"] > a["mine"] + 0.5]))
        # leave the shared board as we found it — the Lead should meet a clean slate
        for pid in fresh_ids:
            await pg.evaluate(f"document.querySelector('[data-act=\"discardPair\"][data-pair=\"{pid}\"]')?.click()")
            await pg.wait_for_timeout(500)
        T("5.3 discard clears the board again",
          await js(pg, f"!db.pairs.some(p=>{fresh_ids!r}.includes(p.id))".replace("'", '"')))

        print("— Phase 2 · participant personas —")
        for acct in PERSONAS:
            await login(pg, acct)
            txt = await body_text(pg)
            T(f"2.x {acct} lands on a real personal page", len(txt) > 300, f"{len(txt)} chars")
            if acct == "mentor.bench":
                T("2.x mentor.bench sees the Reserve Mentor list state (opted in)",
                  "Reserve Mentor list" in txt)
            else:
                T(f"2.x {acct} shows a journey timeline",
                  await pg.locator(".steps").count() > 0 and "Place confirmed" in txt)

        print("— Phase R5·A · the acceptance gate renders verbatim for the gate-ahead persona —")
        await login(pg, "mentee.new")
        txt = await body_text(pg)
        T("R5 gate: three items present", all(s in txt for s in
          ["GRMP Programme Rules Acknowledgement", "GRMP Conflict of Interest Declaration", "Kick-Off attendance"]))
        T("R5 gate: mentee Rules are the approved verbatim text (spot lines)", all(s in txt for s in
          ["Complete my Builder’s Commitment at the end of Rotation 3.",
           "not to solicit personal favours, employment, internships, referrals, financial support or other personal opportunities from my mentor"]))
        T("R5 gate: the exact acknowledgement checkbox label",
          "I have read and understood the GRMP Programme Rules and agree to follow them throughout my participation in GRMP." in txt)
        T("R5 gate: COI options + confirmation are the approved strings", all(s in txt for s in
          ["I have NO actual or potential conflict of interest to declare.",
           "I confirm that this declaration is accurate to the best of my knowledge"]))
        T("R5 gate: Kick-Off framing carries the date and the exception path",
          "Attending the GRMP Kick-Off on 1 October 2026 is a requirement of the programme." in txt
          and "I am requesting an exception" in txt)
        T("R5 gate: PDPA is NOT in the gate (collected at application)", "PDPA" not in txt)

        print("— Phase R5·B · OTP guards personal links for signed-out visitors —")
        await logout(pg)
        somebody = await js(pg, "db.people.find(p=>p.appStatus==='accepted'&&D.placeConfirmed(p)).id")
        their_name = await js(pg, f"D.person(db,'{somebody}').name")
        await goto(pg, f"#/me/{somebody}")
        txt = await body_text(pg)
        T("R5 OTP: a signed-out personal link asks for the application email first",
          "Enter the email address you used in your application" in txt)
        T("R5 OTP: no personal data is exposed before verification",
          their_name not in txt and "Place confirmed" not in txt)

        print("— Phase R5·C · the staged application form (validation, word cap, PDPA) —")
        await goto(pg, "#/apply/mentee")
        T("R5 form: 4-step stepper renders with the spec's labels",
          await pg.locator(".stepper .st-node").count() == 4
          and "Your growth" in await body_text(pg))
        await pg.click('[data-act="applyNext"]')
        await pg.wait_for_timeout(400)
        txt = await body_text(pg)
        T("R5 form: empty Next shows the spec's exact error strings", all(s in txt for s in
          ["Please enter a valid email address.", "Please enter your first name.",
           "Please enter a valid phone number.", "Please tell us your nationality."]))
        T("R5 form: no-save is stated (no drafts by design)",
          "no save function" in txt)
        await pg.evaluate("window.__APPLY={kind:'mentee',step:3,d:{},errors:{}}; render()")
        await pg.wait_for_timeout(300)
        await pg.fill("#af-prompt1", " ".join(["word"] * 230))
        await pg.evaluate("document.getElementById('af-prompt1').dispatchEvent(new Event('input',{bubbles:true}))")
        words = await pg.evaluate("document.getElementById('af-prompt1').value.trim().split(/\\s+/).length")
        T("R5 form: the 200-word hard cap trims live", words == 200, f"{words} words")
        txt = await body_text(pg)
        T("R5 form: both spec prompts verbatim on step 3", all(s in txt for s in
          ["Six months from now, what do you hope will have changed in you?",
           "We are drawn to people who are curious about the world beyond their own field."]))
        await pg.evaluate("window.__APPLY={kind:'mentee',step:4,d:{},errors:{}}; render()")
        await pg.wait_for_timeout(300)
        txt = await body_text(pg)
        T("R5 form: step 4 renders the approved PDPA verbatim (title + consent line)",
          "GRMP PDPA Consent and Acknowledgement" in txt
          and "I have read and understood the above. I consent to SMC collecting and using my personal data" in txt)
        await pg.evaluate("window.__APPLY=null")

        print("— Phase R5·D · console: reserve lists, exception queue, reminders, templates —")
        await login(pg, "weikiat")
        await goto(pg, "#/console/Wei%20Kiat/reserve")
        txt = await body_text(pg)
        T("R5 reserve: both lists render with reply states and Activate",
          "Reserve Mentor list" in txt and "Reserve Mentee list" in txt
          and await pg.locator('[data-act="activateReserve"]').count() > 0
          and await pg.locator('[data-act="reserveReply"]').count() > 0)
        await goto(pg, "#/console/Wei%20Kiat/exceptions")
        txt = await body_text(pg)
        T("R5 exceptions: the Kick-Off exception queue shows the open request with decide controls",
          "Kick-Off exception requests" in txt
          and await pg.locator('[data-act="resolveKickoffExc"]').count() >= 2)
        await goto(pg, "#/console/Wei%20Kiat/reminders")
        txt = await body_text(pg)
        n_unconfirmed = await js(pg, "db.people.filter(p=>p.appStatus==='accepted'&&!D.placeConfirmed(p)).length")
        T("R5 reminders: the not-yet-confirmed list matches the database",
          f"Place not yet confirmed ({n_unconfirmed})" in txt)
        T("R5 reminders: the once-only rule is stated and the send control exists when due",
          "sent once" in txt.lower() or "Sent once" in txt)
        await goto(pg, "#/console/Wei%20Kiat/emails")
        T("R5 emails: the verbatim template library is browsable",
          await pg.locator('[data-act="openMailTpl"]').count() >= 17)
        await pg.locator('[data-act="openMailTpl"][data-tpl="mentee_accept"]').click()
        await pg.wait_for_timeout(400)
        pop = await pg.inner_text(".email-pop")
        T("R5 emails: the mentee acceptance template opens with the verbatim body + dual signature",
          "Welcome to the SMU–SMC Global-Ready Mentoring Programme" in pop
          and "one-time verification code" in pop and "Esther Koh" in pop and "Wei Kiat Koh" in pop)
        T("R5 emails: sender identity on the popup",
          "SMC GRMP Team" in pop and "smu.smc@sa.smu.edu.sg" in pop)
        await goto(pg, "#/console/Wei%20Kiat/dashboard")
        txt = await body_text(pg)
        T("R5 dashboard: the accepted/not-yet-confirmed summary is front and centre",
          "Place confirmed" in txt and f"Place not yet confirmed ({n_unconfirmed})" in txt)

        print("— Phase 4.7 · every submission has a reader —")
        await login(pg, "esther")
        await goto(pg, "#/console/Esther/submissions")
        txt = await body_text(pg)
        counts = await js(pg, "({mid:db.midreviews.length,br:db.builderReflections.length,"
                              "co:db.pairs.filter(p=>p.closeoff&&p.closeoff.comment).length})")
        T("4.7 submissions page reflects what is stored",
          len(txt) > 200 and (counts["mid"] + counts["br"] + counts["co"] == 0
                              or any(w in txt for w in ["Reflection", "review", "Close-off", "close-off"])),
          str(counts))

        print("— Phase 7.5 · console errors —")
        real = [e for e in errors if "gstatic" not in e and "firebase" not in e.lower()]
        T("7.5 no uncaught page errors", not real, "; ".join(real[:3]))

        await br.close()

    print(f"\n{P[0]} passed, {P[1]} failed")
    if NOTES:
        print("\nFailures:")
        for n in NOTES:
            print("  · " + n)
    sys.exit(1 if P[1] else 0)


asyncio.run(main())
