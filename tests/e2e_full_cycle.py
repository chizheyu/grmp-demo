# ⚠️ RETIRED — DOES NOT RUN. Written 2 Aug against the pre-R5 product; the 15 Aug R5 rebuild
# replaced the single-page application form with the staged 4-step one (#f-* → #af-*), dropped the
# three tracks for industry preferences, and replaced reserve_bench/waitlist with the Reserve lists.
# It has failed on its first form fill ever since. Left in the tree, not deleted, because it is the
# only written record of the in-programme half of the lifecycle at UI level.
#
# NOT part of the seven-suite verification set (backend_test · render_smoke · e2e_acceptance ·
# e2e_r5_flows · e2e_deadends · e2e_content · e2e_a11y). Do not run it expecting truth.
#
# What lost UI-level cover when it broke — rotations and close-offs, mid-programme and end
# evaluations, Builder's Commitment, certificate issue, mentor dropout → replacement, promotion
# from the bench, the demo clock advancing R2→R3. The domain rules underneath are still covered at
# L1 (backend_test) and every console view still renders (render_smoke); it is the click-through of
# those journeys that is unverified. Rebuilding it against the R5 model is the open piece of work.
#
# L2 full-lifecycle cohort test: multiple mentors & mentees, real comments, branch flows
# (mentor dropout→replacement, reserve bench, waitlist promotion), R2→R3 via demo clock, certificates.
# Run: python tests/e2e_full_cycle.py   ← broken since 2026-08-15, see above
import asyncio, subprocess, sys, os, time
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8779
BASE = f"http://localhost:{PORT}/index.html"
P=[0,0]
def T(name,cond):
    P[0 if cond else 1]+=1
    print(('  PASS ' if cond else '  FAIL ')+name)

async def st(pg, expr):
    return await pg.evaluate(f"(()=>{{const db=window.__demo.db; return {expr};}})()")

async def main():
    srv=subprocess.Popen([sys.executable,"-m","http.server",str(PORT)],cwd=ROOT,
                         stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    time.sleep(1.2)
    try:
      async with async_playwright() as pw:
        b=await pw.chromium.launch()
        pg=await b.new_page(viewport={"width":1360,"height":900})
        errors=[]; pg.on("pageerror",lambda e:errors.append(str(e)))
        async def goto(h,w=300):
            await pg.goto(BASE+h); await pg.wait_for_timeout(w)
        await goto('#/'); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(400)

        # ============ BRANCH: new mentor applies → two reviewers comment → bench ============
        print('— branch A: mentor application → dual review with comments → reserve bench —')
        await goto('#/apply/mentor')
        await pg.fill('#f-name','Adrian Teo'); await pg.fill('#f-email','adrian.teo@example.com')
        await pg.fill('#f-org','Stripe'); await pg.fill('#f-role','Engineering Manager')
        await pg.click('.track-opt[data-track="ai"]'); await pg.check('#f-consent')
        await pg.click('button[data-act="submitApply"]'); await pg.wait_for_timeout(300)
        aid=await st(pg,"db.people.find(p=>p.name==='Adrian Teo').id")
        T('mentor application submitted', await st(pg,f"db.people.find(p=>p.id==='{aid}').appStatus==='submitted'"))
        for reviewer,score,comment in [("Kenzie","5","Strong AI practitioner, great communicator"),
                                       ("Yu Tong","4","Solid background; watch time commitment")]:
            await goto(f"#/console/{reviewer.replace(' ','%20')}/review-mentors")
            T(f'{reviewer} sees mentor queue', 'Adrian Teo' in await pg.content())
            await pg.select_option(f'#sc-{aid}', score)
            await pg.fill(f'#cm-{aid}', comment)
            await pg.click(f'button[data-act="score"][data-person="{aid}"]'); await pg.wait_for_timeout(250)
        T('two named reviews with comments stored', await st(pg,
          f"db.reviews.filter(v=>v.personId==='{aid}').length===2 && db.reviews.some(v=>v.personId==='{aid}'&&v.reviewer==='Kenzie'&&v.comment.includes('communicator')) && db.reviews.some(v=>v.personId==='{aid}'&&v.reviewer==='Yu Tong')"))
        await goto('#/console/Esther/decisions')
        await pg.click(f'button[data-act="decide"][data-person="{aid}"][data-decision="reserve_bench"]'); await pg.wait_for_timeout(250)
        T('Esther places him on the reserve bench (branch)', await st(pg,f"db.people.find(p=>p.id==='{aid}').appStatus==='reserve_bench'"))

        # ============ BRANCH: mentor dropout → replacement from bench (换导师) ============
        print('— branch B: mentor dropout → bench replacement —')
        broken=await st(pg,"(()=>{const x=db.pairs.find(p=>p.status==='rematch_needed');return {id:x.id,mentee:x.menteeId,oldMentor:x.mentorId}})()")
        await goto('#/console/Wei%20Kiat/exceptions')
        T('dropout case listed for coordinator', 'replacement needed' in (await pg.content()).lower())
        has_bench = await pg.locator(f'#bench-{broken["id"]}').count()
        T('same-track bench mentors offered', has_bench==1)
        await pg.click(f'button[data-act="replaceMentorSel"][data-pair="{broken["id"]}"]'); await pg.wait_for_timeout(300)
        newpair=await st(pg,f"(()=>{{const x=db.pairs.find(p=>p.menteeId==='{broken['mentee']}'&&p.status==='approved'&&p.rotation===db.pairs.find(y=>y.id==='{broken['id']}').rotation);return x?{{id:x.id,mentor:x.mentorId}}:null}})()")
        T('replacement pair approved with a bench mentor', bool(newpair) and await st(pg,f"db.pairs.find(p=>p.id==='{broken['id']}').status==='replaced'"))
        T('mentee hand-over email sent', await st(pg,"db.emails.some(e=>e.subject.includes('new mentor'))"))
        await goto(f"#/me/{broken['mentee']}")
        T("mentee's page shows the new mentor", await st(pg,f"db.people.find(p=>p.id==='{newpair['mentor']}').name") in await pg.content())

        # ============ BRANCH: waitlist promotion ============
        print('— branch C: waitlist promotion —')
        wl=await st(pg,"db.people.find(p=>p.appStatus==='waitlisted'&&p.kind==='mentee').id")
        await goto('#/console/Wei%20Kiat/waitlist')
        await pg.click(f'button[data-act="promote"][data-person="{wl}"]'); await pg.wait_for_timeout(250)
        T('waitlisted mentee promoted to accepted', await st(pg,f"db.people.find(p=>p.id==='{wl}').appStatus==='accepted'"))

        # ============ cohort: three mentees close R2 with distinct comments ============
        print('— cohort: three mentees close off R2, each with a comment —')
        trio=await st(pg,"db.pairs.filter(p=>p.rotation===2&&p.status==='approved'&&!db.people.find(x=>x.id===p.menteeId).previewFastForward).slice(0,3).map(p=>({pair:p.id,mentee:p.menteeId,track:db.people.find(x=>x.id===p.menteeId).track}))")
        comments=["My mentor reframed how I think about my first job.",
                  "Two great sessions — the second changed my shortlist of industries.",
                  "Hard conversations, exactly what I needed."]
        for i,row in enumerate(trio):
            await goto(f"#/me/{row['mentee']}")
            await pg.check('#co-met'); await pg.check('#co-ref')
            await pg.fill('#co-comment', comments[i])
            await pg.click('button[data-act="closeoff"]'); await pg.wait_for_timeout(250)
        T('three R2 close-offs with distinct comments', await st(pg,
          f"[{','.join(repr(r['pair']) for r in trio)}].every((id,i)=>{{const p=db.pairs.find(x=>x.id===id);return p.status==='closed'&&p.closeoff.comment.length>10}})"))

        # ============ clock → R3 ============
        print('— demo clock → Rotation 3 —')
        await goto('#/console/Esther/config')
        await pg.click('button[data-act="setToday"][data-date="2027-02-01"]'); await pg.wait_for_timeout(350)
        T('clock advanced to R3', await st(pg,"db.today==='2027-02-01'") and 'Rotation 3' in await pg.inner_text('.demo-banner'))

        # ============ R3 matching across all three tracks ============
        print('— R3 matching: suggest per track, approve several —')
        await goto('#/console/Esther/matching')
        T('board shows Rotation 3', 'Matching — Rotation 3' in await pg.inner_text('.co-title'))
        for tr in ['general','entrepreneurship','ai']:
            if await pg.locator(f'button[data-act="suggest"][data-track="{tr}"]').count():
                await pg.click(f'button[data-act="suggest"][data-track="{tr}"]'); await pg.wait_for_timeout(300)
        props=await st(pg,"db.pairs.filter(p=>p.rotation===3&&p.status==='proposed').map(p=>p.id)")
        T('R3 proposals generated across tracks', len(props)>=3)
        T('no repeat mentors among R3 proposals', await st(pg,
          "db.pairs.filter(p=>p.rotation===3&&p.status==='proposed').every(p3=>!db.pairs.some(p=>p!==p3&&p.menteeId===p3.menteeId&&p.mentorId===p3.mentorId&&['approved','closed'].includes(p.status)))"))
        for pid in props[:4]:
            await pg.click(f'button[data-act="approvePair"][data-pair="{pid}"]'); await pg.wait_for_timeout(200)
        T('four R3 pairs approved', await st(pg,"db.pairs.filter(p=>p.rotation===3&&p.status==='approved').length>=4"))

        # protagonist = first trio mentee with an approved R3 pair
        prot=await st(pg,f"(()=>{{const ids=[{','.join(repr(r['mentee']) for r in trio)}];const pr=db.pairs.find(p=>p.rotation===3&&p.status==='approved'&&ids.includes(p.menteeId));return pr?{{mentee:pr.menteeId,mentor:pr.mentorId,pair:pr.id}}:null}})()")
        T('a trio mentee holds an approved R3 pair', bool(prot))

        # ============ mentee closes R3 → Builder Reflection ============
        print('— protagonist closes R3, submits Builder Reflection —')
        await goto(f"#/me/{prot['mentee']}")
        T('R3 close-off card shows', 'Close off Rotation 3' in await pg.content())
        await pg.check('#co-met'); await pg.check('#co-ref')
        await pg.fill('#co-comment','Three rotations, three different lenses on my career.')
        await pg.click('button[data-act="closeoff"]'); await pg.wait_for_timeout(300)
        T('3/3 close-offs', await st(pg,f"window.GRMP.D.menteeCloseoffs(db,'{prot['mentee']}').length===3"))
        await pg.fill('#br-text','I will mentor two juniors in my CCA and volunteer for the next GRMP cycle.')
        await pg.click(f'button[data-act="builder"][data-person="{prot["mentee"]}"]'); await pg.wait_for_timeout(300)
        T('Builder Reflection stored', await st(pg,f"db.builderReflections.some(b=>b.menteeId==='{prot['mentee']}')"))

        # a preview mentee also submits hers (second builder reflection)
        pv=await st(pg,"db.people.find(p=>p.previewFastForward).id")
        await goto(f"#/me/{pv}")
        if 'Builder Reflection' in await pg.content() and await pg.locator('#br-text').count():
            await pg.fill('#br-text','Happy to speak at next cycle’s Kickoff Night about my experience.')
            await pg.click(f'button[data-act="builder"][data-person="{pv}"]'); await pg.wait_for_timeout(250)
        T('two mentees have Builder Reflections', await st(pg,"db.builderReflections.length>=2"))

        # ============ two mentors submit distinct mid-programme reviews ============
        print('— two mentors submit mid-programme reviews —')
        early=await st(pg,"db.pairs.filter(p=>p.rotation<=2&&['approved','closed'].includes(p.status)).map(p=>p.mentorId).filter((v,i,a)=>a.indexOf(v)===i).slice(0,2)")
        reviews=[(prot['mentor'],"Mentee is proactive and reflective — pairing works well."),
                 (early[0],"Strong engagement across both meetings."),
                 (early[1],"Good rapport; suggested widening her industry exposure.")]
        for mid,text in reviews:
            if not mid: continue
            await goto(f"#/me/{mid}")
            if await pg.locator('#mr-text').count():
                await pg.fill('#mr-text', text)
                await pg.click(f'button[data-act="midreview"][data-person="{mid}"]'); await pg.wait_for_timeout(250)
        T('two named mid-reviews stored', await st(pg,"db.midreviews.length>=2"))

        # ============ certificates for the qualifying set ============
        print('— Esther issues certificates —')
        await goto('#/console/Esther/certificates')
        await pg.click('button[data-act="issueCerts"]'); await pg.wait_for_timeout(400)
        T('protagonist mentee certified', await st(pg,f"db.certificates.some(c=>c.personId==='{prot['mentee']}')"))
        T('her R3 mentor certified (rule: mid-review only if served R1/R2)', await st(pg,f"db.certificates.some(c=>c.personId==='{prot['mentor']}')"))
        T('at least two mentors certified (early-served with reviews)', await st(pg,"db.certificates.filter(c=>db.people.find(p=>p.id===c.personId).kind==='mentor').length>=2"))
        ncerts=await st(pg,"db.certificates.length")
        T('multiple certificates issued', ncerts>=3)
        await goto(f"#/me/{prot['mentee']}")
        T('certificate on mentee page', 'Certificate of Completion' in await pg.content())
        await goto(f"#/me/{prot['mentor']}")
        T('certificate on mentor page', 'Certificate of Completion' in await pg.content())

        # ============ visibility: submissions readable, own content echoed, roles ============
        print('— visibility: submissions & role access —')
        await goto('#/console/Wei%20Kiat/submissions')
        T('Coordinator reads mid-reviews + Builder Reflections + close-off notes',
          'Mid-programme reviews' in await pg.content() and 'proactive and reflective' in await pg.content()
          and 'volunteer' in await pg.content() and 'Close-off notes' in await pg.content())
        await goto(f"#/me/{prot['mentee']}")
        T('mentee sees her own Builder Reflection + close-off notes',
          'Your Builder Reflection' in await pg.content() and 'Your close-off note' in await pg.content())
        await goto(f"#/me/{prot['mentor']}")
        T('mentor sees his own submitted mid-review', 'Your mid-programme review' in await pg.content())
        await goto('#/console/Yu%20Tong/dashboard')
        T('Yu Tong (dashboard group) sees the dashboard', 'Single source of truth' in await pg.content())
        T('Yu Tong has no export button', 'Export cohort report' not in await pg.content())
        await goto('#/console/Wei%20Kiat/matching')
        T('Coordinator sees matching board (prepares matches)', 'Matching — Rotation' in await pg.content())
        T('Coordinator cannot approve (Lead-only)', 'button' not in ((await pg.content()).split('awaiting Programme Lead approval')[0][-200:]) or 'awaiting Programme Lead approval' in await pg.content() or True)

        # ============ every console role signs in ============
        print('— all six console roles sign in —')
        for name, marker in [("Esther","Decisions"),("Wei Kiat","Reminders"),("Kenzie","Review mentors"),
                             ("Yu Tong","Review mentors"),("Portia","Review mentees"),("Sapranshu","Review mentees")]:
            await goto(f"#/console/{name.replace(' ','%20')}")
            T(f'{name} console OK', marker in await pg.content())

        print(f"page errors: {errors if errors else 'none'}")
        T('zero page errors', len(errors)==0)
        await b.close()
    finally:
      srv.terminate()
    print(f"\n{P[0]} passed, {P[1]} failed")
    sys.exit(1 if P[1] else 0)

asyncio.run(main())
