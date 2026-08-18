# ⚠️ RETIRED — DOES NOT RUN. Same story as e2e_full_cycle.py: written 2 Aug against the pre-R5
# product (single-page form, three tracks, five-tick acknowledgement, orientation as a gate), all of
# which the 15 Aug R5 rebuild replaced. Fails on its first assertion. Kept as the record of the
# in-programme journeys it used to walk; not part of the seven-suite verification set.
#
# L2 end-to-end tests — real page clicks + state assertions via window.__demo.
# Run: python tests/e2e_test.py   ← broken since 2026-08-15, see above
import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8777
BASE = f"http://localhost:{PORT}"
P=[0,0]
def T(name, cond):
    P[0 if cond else 1]+=1
    print(('  PASS ' if cond else '  FAIL ')+name)

async def state(pg, expr):
    return await pg.evaluate(f"(()=>{{const db=window.__demo.db; return {expr};}})()")

async def main():
    srv = subprocess.Popen([sys.executable,"-m","http.server",str(PORT)],cwd=ROOT,
                           stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
        async with async_playwright() as pw:
            b = await pw.chromium.launch()
            pg = await b.new_page(viewport={"width":1360,"height":900})
            errors=[]; pg.on("pageerror", lambda e:errors.append(str(e)))
            async def goto(h):
                await pg.goto(f"{BASE}/index.html{h}"); await pg.wait_for_timeout(250)
            async def freshgoto(h):
                await pg.goto(f"{BASE}/index.html#/");
                await pg.evaluate("localStorage.clear()")
                await pg.goto(f"{BASE}/index.html{h}"); await pg.reload(); await pg.wait_for_timeout(300)

            # ---------- 1.1–1.3 microsite ----------
            print('— microsite (manual ch.1) —')
            await freshgoto('#/')
            T('1.1 landing renders hero + 3 tracks', await pg.locator('.ms-hero h1').count()==1 and await pg.locator('.tcard').count()==3)
            await goto('#/guide/mentee');  T('1.2 mentee guide', 'Mentee Guide' in await pg.inner_text('h1'))
            await goto('#/reflection')
            T('1.3 reflection privacy badge', 'never stores what you write' in await pg.inner_text('.privacy-note'))
            T('1.3 yellow card Q1 present', await pg.locator('[data-inferred="Q1"]').count()==1)

            # ---------- 1.5 apply: incomplete then complete ----------
            print('— apply flow (1.5) —')
            await goto('#/apply/mentee')
            await pg.fill('#f-name','E2E Tester'); await pg.click('button[data-act="submitApply"]')
            await pg.wait_for_timeout(300)
            T('incomplete saved + reminder email', await state(pg,"db.people.some(p=>p.name==='E2E Tester'&&p.appStatus==='incomplete') && db.emails.some(e=>e.kind==='missing_info')"))
            await goto('#/apply/mentee')
            await pg.fill('#f-name','Complete Tester'); await pg.fill('#f-email','ct@x.com')
            await pg.fill('#f-course','Economics'); await pg.fill('#f-goals','learn from a mentor')
            await pg.click('.track-opt[data-track="ai"]'); await pg.check('#f-consent')
            await pg.click('button[data-act="submitApply"]'); await pg.wait_for_timeout(300)
            T('complete → submitted + confirmation', await state(pg,"db.people.some(p=>p.name==='Complete Tester'&&p.appStatus==='submitted'&&p.track==='ai') && db.emails.some(e=>e.kind==='confirm'&&e.to==='ct@x.com')"))
            T('confirmation page shown', 'Application received' in await pg.inner_text('h1'))

            # ---------- 4 review → 5.1 decide (pipeline continues on same data) ----------
            print('— screening pipeline (4 → 5.1) —')
            await goto('#/console/Portia/review-mentees')
            T('4.1 reviewer sees the new application + AI summary', 'Complete Tester' in await pg.content() and await pg.locator('.ai-block').count()>0)
            cid = await state(pg,"db.people.find(p=>p.name==='Complete Tester').id")
            await pg.fill(f'#cm-{cid}','solid'); await pg.click(f'button[data-act="score"][data-person="{cid}"]')
            await pg.wait_for_timeout(250)
            T('4.2 score recorded', await state(pg,f"db.reviews.some(v=>v.personId==='{cid}'&&v.reviewer==='Portia')"))
            await goto('#/console/Esther/decisions')
            T('5.1 lead sees scored application', 'Complete Tester' in await pg.content())
            await pg.click(f'button[data-act="decide"][data-person="{cid}"][data-decision="accepted"]')
            await pg.wait_for_timeout(250)
            T('5.1 accept applied + outcome email', await state(pg,f"db.people.find(p=>p.id==='{cid}').appStatus==='accepted' && db.emails.some(e=>e.kind==='decision'&&e.to==='ct@x.com')"))

            # ---------- 2.2/2.3 gates on personal page ----------
            print('— gates (2.2/2.3) —')
            await freshgoto('#/')
            gid = await state(pg,"db.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&!(p.ack&&['rules','charter','governance','pdpa','coi'].every(d=>p.ack[d]))).id")
            await goto(f'#/me/{gid}')
            T('2.2 ack card shows for gate-blocked mentee', "Acknowledge the programme documents" in await pg.content())
            await pg.click(f'button[data-act="ackAll"][data-person="{gid}"]'); await pg.wait_for_timeout(250)
            T('2.2 all five acknowledged', await state(pg,f"['rules','charter','governance','pdpa','coi'].every(d=>db.people.find(p=>p.id==='{gid}').ack[d])"))
            T('2.3 orientation card now shows', 'Complete your orientation' in await pg.content())
            await pg.click(f'button[data-act="orient"][data-person="{gid}"]'); await pg.wait_for_timeout(250)
            T('2.3 orientation recorded, gate cleared', await state(pg,f"(()=>{{const p=db.people.find(x=>x.id==='{gid}');return !!p.orientation && !window.GRMP.D.gateBlocked(p)}})()"))

            # ---------- 5.2/5.3 matching ----------
            print('— matching (5.2/5.3) —')
            await goto('#/console/Esther/matching')
            n0 = await state(pg,"db.pairs.filter(p=>p.status==='proposed').length")
            await pg.click('button[data-act="suggest"][data-track="general"]'); await pg.wait_for_timeout(350)
            n1 = await state(pg,"db.pairs.filter(p=>p.status==='proposed').length")
            T('5.2 AI suggestions created (proposed)', n1>n0)
            T('5.2 rationale visible on cards', await pg.locator('.why').count()>0)
            pidfirst = await state(pg,"db.pairs.find(p=>p.status==='proposed').id")
            await pg.click(f'button[data-act="approvePair"][data-pair="{pidfirst}"]'); await pg.wait_for_timeout(250)
            T('5.3 approval flips to approved + match email', await state(pg,f"db.pairs.find(p=>p.id==='{pidfirst}').status==='approved' && db.emails.some(e=>e.kind==='match'&&e.at===db.today)"))

            # ---------- 2.6 close-off ----------
            print('— close-off (2.6) —')
            await freshgoto('#/')
            row = await state(pg,"(()=>{const pr=db.pairs.find(p=>p.rotation===2&&p.status==='approved'&&!db.people.find(x=>x.id===p.menteeId).previewFastForward);return {pair:pr.id,mentee:pr.menteeId}})()")
            await goto(f"#/me/{row['mentee']}")
            T('2.6 close-off card shows', 'Close off Rotation 2' in await pg.content())
            await pg.click('button[data-act="closeoff"]')     # without ticks → blocked
            pg.on('dialog', lambda d: asyncio.ensure_future(d.accept()))
            await pg.wait_for_timeout(200)
            T('2.6 both ticks required (still approved)', await state(pg,f"db.pairs.find(p=>p.id==='{row['pair']}').status==='approved'"))
            # regression: clicking the LABEL TEXT must toggle (real-user behaviour, caught in live Chrome)
            await pg.click('label.f-check:has(#co-met) span'); await pg.click('label.f-check:has(#co-ref) span')
            T('2.6 label-text click toggles checkboxes', await state(pg,"document.getElementById('co-met').checked && document.getElementById('co-ref').checked"))
            await pg.click('button[data-act="closeoff"]'); await pg.wait_for_timeout(250)
            T('2.6 close-off recorded', await state(pg,f"(()=>{{const p=db.pairs.find(x=>x.id==='{row['pair']}');return p.status==='closed'&&p.closeoff.metTwice&&p.closeoff.reflectionDone}})()"))

            # ---------- 2.7/2.8/5.4 builder reflection + certificates ----------
            print('— builder reflection & certificates (2.7/2.8/5.4) —')
            pvid = await state(pg,"db.people.find(p=>p.previewFastForward).id")
            await goto(f'#/me/{pvid}')
            T('2.7 builder reflection card shows for fast-forward mentee', 'Builder Reflection' in await pg.content())
            await pg.fill('#br-text','I will mentor two juniors next cycle.')
            await pg.click(f'button[data-act="builder"][data-person="{pvid}"]'); await pg.wait_for_timeout(250)
            T('2.7 reflection stored', await state(pg,f"db.builderReflections.some(b=>b.menteeId==='{pvid}')"))
            await goto('#/console/Esther/certificates')
            T('5.4 shows ready-to-issue', 'Ready to issue' in await pg.content())
            await pg.click('button[data-act="issueCerts"]'); await pg.wait_for_timeout(300)
            T('5.4 certificate issued + email', await state(pg,f"db.certificates.some(c=>c.personId==='{pvid}') && db.emails.some(e=>e.kind==='certificate')"))
            await goto(f'#/me/{pvid}')
            T('2.8 certificate renders on personal page', 'Certificate of Completion' in await pg.content())

            # ---------- 6.6 dropout replacement ----------
            print('— dropout replacement (6.6) —')
            await freshgoto('#/')
            await goto('#/console/Wei%20Kiat/exceptions')
            T('6.6 rematch case listed', await state(pg,"db.pairs.some(p=>p.status==='rematch_needed')") and 'replacement needed' in (await pg.content()).lower())
            brokenid = await state(pg,"db.pairs.find(p=>p.status==='rematch_needed').id")
            if await pg.locator(f'#bench-{brokenid}').count():
                await pg.click(f'button[data-act="replaceMentorSel"][data-pair="{brokenid}"]'); await pg.wait_for_timeout(300)
                T('6.6 replacement pair approved from bench', await state(pg,f"db.pairs.find(p=>p.id==='{brokenid}').status==='replaced' && db.pairs.some(p=>p.menteeId===db.pairs.find(x=>x.id==='{brokenid}').menteeId && p.status==='approved' && p.rotation===db.pairs.find(x=>x.id==='{brokenid}').rotation)"))
            else:
                T('6.6 replacement pair approved from bench', False)

            # ---------- 6.3 waitlist ----------
            print('— waitlist (6.3) —')
            await goto('#/console/Wei%20Kiat/waitlist')
            wlid = await state(pg,"db.people.find(p=>p.appStatus==='waitlisted').id")
            await pg.click(f'button[data-act="promote"][data-person="{wlid}"]'); await pg.wait_for_timeout(250)
            T('6.3 promotion → accepted + email', await state(pg,f"db.people.find(p=>p.id==='{wlid}').appStatus==='accepted' && db.emails.some(e=>e.subject.includes('place has opened'))"))

            # ---------- 7.1 concern ----------
            print('— concern (7.1) —')
            n_c = await state(pg,"db.concerns.length")
            await goto('#/concern')
            await pg.fill('#cn-text','demo concern for testing')
            await pg.click('button[data-act="raiseConcern"]'); await pg.wait_for_timeout(350)
            T('7.1 referral recorded', await state(pg,f"db.concerns.length==={n_c}+1"))
            await goto('#/console/Esther/concerns')
            T('7.1 visible in escalation inbox', 'demo concern for testing' in await pg.content())

            # ---------- 6.5 events ----------
            print('— events (6.5) —')
            await goto('#/console/Wei%20Kiat/events')
            first_btn = pg.locator('button[data-act="checkin"][data-event="appreciation"]').first
            person_id = await first_btn.get_attribute('data-person')
            await first_btn.click(); await pg.wait_for_timeout(250)
            T('6.5 check-in toggles attendance', await state(pg,f"db.events.appreciation.attendance.includes('{person_id}')"))

            # ---------- console access scoping ----------
            print('— role scoping —')
            await goto('#/console/Kenzie')
            body = await pg.content()
            T('reviewer (Kenzie) has no decisions/matching/concerns nav', ('Decisions' not in body) and ('Matching' not in body) and ('Concern inbox' not in body))

            print(f"\npage errors: {errors if errors else 'none'}")
            T('zero page errors across all flows', len(errors)==0)
            await b.close()
    finally:
        srv.terminate()
    print(f"\n{P[0]} passed, {P[1]} failed")
    sys.exit(1 if P[1] else 0)

asyncio.run(main())
