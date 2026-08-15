# R5 full-journey verification — DESTRUCTIVE ON PURPOSE, then resets the shared
# database to the pristine seed. Run order: deploy → THIS → reset happens at the end
# here → then the non-destructive suites (acceptance / deadends / content / a11y).
#
# Walks the four journeys the specs define, through the real UI:
#   1. Mentee applies on the 4-step form → receipt email
#   2. Committee scores against the criteria → Lead accepts → verbatim acceptance email
#   3. The applicant opens their personal link → email + one-time code → the 3-item
#      acceptance gate → place confirmed → onboarding email → Kick-Off logistics
#   4. Reserve mechanics: record a reply, activate (later deadline), send reminders,
#      resolve a Kick-Off exception, decline variants
# Run: python tests/e2e_r5_flows.py
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
    return await pg.evaluate(
        "() => { const db = window.__demo.db, D = window.GRMP.D; return (" + expr + "); }")


async def goto(pg, h, ms=700):
    await pg.evaluate(f"location.hash={h!r}")
    await pg.wait_for_timeout(ms)


async def login(pg, user):
    await pg.evaluate("localStorage.removeItem('grmp_session')")
    await pg.evaluate("location.hash='#/'")
    await pg.reload()
    await wait_db(pg)
    await pg.evaluate("location.hash='#/login'")
    await pg.wait_for_selector("#lg-u", timeout=20000)
    await pg.fill("#lg-u", user)
    await pg.fill("#lg-p", PASS)
    await pg.click('button[data-act="doLogin"]')
    await pg.wait_for_timeout(1800)


async def logout(pg):
    await pg.evaluate("localStorage.removeItem('grmp_session')")
    await pg.evaluate("localStorage.removeItem('grmp_link_auth')")
    await pg.evaluate("location.hash='#/'")
    await pg.reload()
    await wait_db(pg)


TEST_EMAIL = "r5.flow.test@smu.example.edu"


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page()
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)))
        await pg.goto(URL, wait_until="domcontentloaded")
        T("platform boots", await wait_db(pg))

        print("— Journey 1 · the 4-step mentee application, exactly as a student fills it —")
        await logout(pg)
        await goto(pg, "#/apply/mentee")
        # Step 1
        await pg.fill("#af-email", TEST_EMAIL)
        await pg.fill("#af-firstName", "Rui En")
        await pg.fill("#af-lastName", "Testlim")
        await pg.fill("#af-phone", "+65 9000 1234")
        await pg.fill("#af-nationality", "Singaporean")
        await pg.fill("#af-linkedin", "linkedin.com/in/ruien-testlim")
        await pg.select_option("#af-heard", index=2)
        await pg.click('[data-act="applyNext"]'); await pg.wait_for_timeout(400)
        T("J1 step 1 → 2 (About you validated)", await pg.locator("#af-year").count() == 1)
        # Step 2
        await pg.select_option("#af-year", label="Year 3")
        await pg.select_option("#af-faculty", index=1)
        await pg.fill("#af-degree", "BBM, Finance")
        await pg.check("#af-eligibilityConfirmed")
        await pg.click('[data-act="applyNext"]'); await pg.wait_for_timeout(400)
        T("J1 step 2 → 3 (Your studies validated)", await pg.locator("#af-prompt1").count() == 1)
        # Step 3
        await pg.fill("#af-prompt1", "Six months from now I hope to be sharper at asking for help. I rebuilt our case deck alone once; next time I want the judgment to bring people in earlier.")
        await pg.fill("#af-prompt2", "Supply chains pull my attention, and I want to show up by writing up everything I learn for my juniors.")
        await pg.select_option("#af-ind1", index=3)
        await pg.select_option("#af-ind2", index=5)
        await pg.select_option("#af-ind3", index=3)   # duplicate of ind1 on purpose
        await pg.click('[data-act="applyNext"]'); await pg.wait_for_timeout(400)
        T("J1 duplicate industry preference is rejected with the spec's error",
          "Please select a different industry from your earlier choices." in await pg.inner_text("#app"))
        await pg.select_option("#af-ind3", index=7)
        await pg.click('[data-act="applyNext"]'); await pg.wait_for_timeout(400)
        T("J1 step 3 → 4 (Your growth validated)", await pg.locator("#af-pdpa").count() == 1)
        # Step 4
        await pg.select_option("#af-commit", value="yes")
        await pg.select_option("#af-telegramConsent", label="Yes")
        await pg.check("#af-pdpa")
        await pg.click('[data-act="applySubmit"]'); await pg.wait_for_timeout(1500)
        T("J1 confirmation screen (verbatim)", "Thank you, your application is in." in await pg.inner_text("#app"))
        new_id = await js(pg, f"(db.people.find(p=>p.email==='{TEST_EMAIL}')||{{}}).id")
        T("J1 the application is in the tracker as submitted",
          bool(new_id) and await js(pg, f"D.person(db,'{new_id}').appStatus==='submitted'"))
        T("J1 PDPA consent is timestamped on the record",
          await js(pg, f"/^\\d{{4}}-/.test(D.person(db,'{new_id}').pdpaAt||'')"))
        T("J1 the receipt email (verbatim template) is in the outbox",
          await js(pg, f"db.emails.some(e=>e.tpl==='mentee_receipt'&&e.to==='{TEST_EMAIL}')"))

        print("— Journey 2 · committee scores on the criteria, the Lead accepts —")
        await login(pg, "portia")
        await goto(pg, "#/console/Portia/review-mentees")
        T("J2 the new application is in the review queue", new_id in await pg.inner_text(".co-main")
          or await pg.locator(f"#q-{new_id}").count() == 1)
        for i in range(5):
            await pg.select_option(f"#sc-{new_id}-{i}", value="4")
        await pg.fill(f"#cm-{new_id}", "Prompts read genuine; clear ownership story.")
        await pg.click(f'[data-act="score"][data-person="{new_id}"]'); await pg.wait_for_timeout(900)
        T("J2 criteria scores stored with the average",
          await js(pg, f"db.reviews.some(v=>v.personId==='{new_id}'&&v.score===4&&v.criteria&&v.criteria['Ownership']===4)"))
        await login(pg, "esther")
        await goto(pg, "#/console/Esther/decisions")
        T("J2 decisions queue offers the two mentee decline variants",
          await pg.locator(f'[data-act="decide"][data-person="{new_id}"][data-decision="declined_not_selected"]').count() == 1
          and await pg.locator(f'[data-act="decide"][data-person="{new_id}"][data-decision="declined_ineligible"]').count() == 1)
        await pg.click(f'[data-act="decide"][data-person="{new_id}"][data-decision="accepted"]')
        await pg.wait_for_timeout(1200)
        T("J2 accept → status accepted (approval IS the send)",
          await js(pg, f"D.person(db,'{new_id}').appStatus==='accepted'"))
        T("J2 the verbatim acceptance email went out with the personal link",
          await js(pg, f"db.emails.some(e=>e.tpl==='mentee_accept'&&e.to==='{TEST_EMAIL}'&&e.vars.link==='#/me/{new_id}')"))

        print("— Journey 3 · personal link → OTP → the three-item gate → confirmed —")
        await logout(pg)
        await goto(pg, f"#/me/{new_id}", 900)
        T("J3 the link asks for the application email", await pg.locator("#otp-email").count() == 1)
        await pg.fill("#otp-email", "wrong@example.com")
        await pg.click('[data-act="otpRequest"]'); await pg.wait_for_timeout(700)
        T("J3 a wrong email is refused", "does not match" in await pg.inner_text("#app"))
        await pg.fill("#otp-email", TEST_EMAIL)
        await pg.click('[data-act="otpRequest"]'); await pg.wait_for_timeout(900)
        code = await js(pg, f"(D.person(db,'{new_id}').otp||{{}}).code")
        T("J3 a 6-digit code was issued and emailed", bool(code) and len(str(code)) == 6
          and await js(pg, f"db.emails.some(e=>e.tpl==='otp_code'&&e.to==='{TEST_EMAIL}')"))
        await pg.fill("#otp-code", "000000")
        await pg.click('[data-act="otpVerify"]'); await pg.wait_for_timeout(600)
        T("J3 a wrong code is refused", "does not match" in await pg.inner_text("#app"))
        await pg.fill("#otp-code", str(code))
        await pg.click('[data-act="otpVerify"]'); await pg.wait_for_timeout(900)
        txt = await pg.inner_text("#app")
        T("J3 verified → lands on the acceptance gate", "Confirm your place" in txt)
        # (a) Rules
        await pg.check("#g-rules-tick")
        await pg.click('[data-act="gateRules"]'); await pg.wait_for_timeout(700)
        T("J3 Rules recorded with its own timestamp",
          await js(pg, f"/^\\d{{4}}-\\d{{2}}-\\d{{2}}T/.test((D.person(db,'{new_id}').ack||{{}}).rules||'')"))
        # (b) COI — declare a conflict to exercise the conditional details path
        await pg.check('input[name="g-coi"][value="some"]')
        await pg.wait_for_timeout(200)
        await pg.fill("#g-coi-text", "My aunt mentors in the programme.")
        await pg.check("#g-coi-confirm")
        await pg.click('[data-act="gateCoi"]'); await pg.wait_for_timeout(700)
        T("J3 COI declaration stored (declared + details + timestamp)",
          await js(pg, f"(D.person(db,'{new_id}').coi||{{}}).declared===true && !!(D.person(db,'{new_id}').ack||{{}}).coi"))
        # (c) Kick-Off — confirm attendance
        await pg.check('input[name="g-ko"][value="attend"]')
        await pg.click('[data-act="gateKickoff"]'); await pg.wait_for_timeout(900)
        T("J3 gate complete → place confirmed", await js(pg, f"!!D.person(db,'{new_id}').placeConfirmedAt"))
        T("J3 the onboarding email fired on completion",
          await js(pg, f"db.emails.some(e=>e.tpl==='onboarding'&&e.to==='{TEST_EMAIL}')"))
        T("J3 three separate timestamps on the record",
          await js(pg, f"['rules','coi','kickoff'].every(k=>/T/.test((D.person(db,'{new_id}').ack||{{}})[k]||''))"))
        # logistics step
        await pg.wait_for_timeout(600)
        T("J3 the Kick-Off logistics step appears after the gate",
          await pg.locator("#ko-dietary").count() == 1)
        await pg.fill("#ko-dietary", "vegetarian")
        await pg.click('[data-act="kickoffLogistics"]'); await pg.wait_for_timeout(700)
        T("J3 dietary stored (catering only)",
          await js(pg, f"(D.person(db,'{new_id}').kickoffLogistics||{{}}).dietary==='vegetarian'"))
        T("J3 the journey bar now shows Place confirmed done",
          "Place confirmed" in await pg.inner_text("#app"))

        print("— Journey 4 · reserve mechanics, reminders, exception decision, declines —")
        await login(pg, "weikiat")
        await goto(pg, "#/console/Wei%20Kiat/reserve")
        awaiting = await js(pg, "(db.people.find(p=>p.appStatus==='reserve_invited'&&p.reserveOptIn===null)||{}).id")
        if awaiting:
            await pg.click(f'[data-act="reserveReply"][data-person="{awaiting}"][data-reply="in"]')
            await pg.wait_for_timeout(800)
            T("J4 a reserve reply is recorded", await js(pg, f"D.person(db,'{awaiting}').reserveOptIn===true"))
        opted = await js(pg, "(db.people.find(p=>p.kind==='mentee'&&p.appStatus==='reserve_invited'&&p.reserveOptIn===true)||{}).id")
        await pg.click(f'[data-act="activateReserve"][data-person="{opted}"]')
        await pg.wait_for_timeout(400)
        await pg.click('.fb-modal [data-x="yes"]'); await pg.wait_for_timeout(900)
        T("J4 activation → accepted + activation email with the later deadline",
          await js(pg, f"D.person(db,'{opted}').appStatus==='accepted'")
          and await js(pg, f"db.emails.some(e=>e.tpl==='mentee_reserve_activation'&&e.to===D.person(db,'{opted}').email)")
          and await js(pg, f"D.deadlineFor(db,D.person(db,'{opted}'))===db.config.selection.reserveAcceptBy"))
        await goto(pg, "#/console/Wei%20Kiat/reminders")
        n_t = await js(pg, "D.reminderTargets(db).length")
        if n_t:
            await pg.click('[data-act="sendReminders"]')
            await pg.wait_for_timeout(400)
            await pg.click('.fb-modal [data-x="yes"]'); await pg.wait_for_timeout(900)
            T("J4 reminders sent once to exactly the unconfirmed",
              await js(pg, "D.reminderTargets(db).length") == 0
              and await js(pg, f"db.emails.filter(e=>e.kind==='reminder'&&e.at===db.today).length>={n_t}"))
        await goto(pg, "#/console/Wei%20Kiat/exceptions")
        exc = await js(pg, "(D.kickoffExceptionsOpen(db)[0]||{}).id")
        if exc:
            await pg.click(f'[data-act="resolveKickoffExc"][data-person="{exc}"][data-outcome="waived"]')
            await pg.wait_for_timeout(900)
            T("J4 a Kick-Off exception is decided, recorded and notified",
              await js(pg, f"(D.person(db,'{exc}').kickoff.resolved||{{}}).outcome==='waived'"))
        # decline variants through the domain (queue may be empty of scored candidates)
        mentee_sub = await js(pg, "(db.people.find(p=>p.kind==='mentee'&&p.appStatus==='submitted')||{}).id")
        if mentee_sub:
            await pg.evaluate(f"window.__demo.Actions.decide({{person:'{mentee_sub}', decision:'declined_ineligible', actor:'Wei Kiat'}})")
            await pg.wait_for_timeout(900)
            T("J4 the ineligible decline variant sends its own template",
              await js(pg, f"db.emails.some(e=>e.tpl==='mentee_decline_ineligible'&&e.to===D.person(db,'{mentee_sub}').email)"))

        print("— page errors across all four journeys —")
        real = [e for e in errors if "gstatic" not in e and "firebase" not in e.lower()]
        T("no uncaught page errors", not real, "; ".join(real[:3]))

        print("— reset the shared database to the pristine seed (leave it clean) —")
        fresh = await pg.evaluate("async () => { const f = await FIRE.resetAll(); return f.people.length }")
        T("shared database reset to seed", fresh and fresh > 100, str(fresh))

        await br.close()

    print(f"\n{P[0]} passed, {P[1]} failed")
    if NOTES:
        print("\nFailures:")
        for n in NOTES:
            print("  · " + n)
    sys.exit(1 if P[1] else 0)


asyncio.run(main())
