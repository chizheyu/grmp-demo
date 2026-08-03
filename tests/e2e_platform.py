# Live E2E against the deployed Apps Script platform (shared DB).
# Verifies: login, permission guard, action roundtrip + persistence, SHARED state across two
# independent browsers, participant self-action, and reset. Run: python tests/e2e_platform.py
import asyncio, sys, os
from playwright.async_api import async_playwright

URL = open('/Users/ciwang/Desktop/nuwa-project/AISMC/.platform_url').read().strip()
P=[0,0]
def T(name,cond):
    P[0 if cond else 1]+=1
    print(('  PASS ' if cond else '  FAIL ')+name)

async def app_frame(pg):
    # Apps Script serves the app inside a sandboxed iframe
    for _ in range(60):
        for f in pg.frames:
            try:
                if await f.locator('#app').count(): return f
            except Exception: pass
        await pg.wait_for_timeout(500)
    raise RuntimeError('app frame not found')

async def login(pg, u, p):
    f = await app_frame(pg)
    await f.wait_for_selector('#lg-u', timeout=30000)
    await f.fill('#lg-u', u); await f.fill('#lg-p', p)
    await f.click('button[data-act="doLogin"]')
    await f.wait_for_selector('#lg-u', state='detached', timeout=30000)
    return f

async def js(f, expr):
    return await f.evaluate(f"(()=>{{const db=window.__demo.db; return {expr};}})()")

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        ctxA = await b.new_context(viewport={"width":1360,"height":900})
        pgA = await ctxA.new_page()
        errors=[]; pgA.on("pageerror", lambda e:errors.append(str(e)))

        print('— boot & login —')
        await pgA.goto(URL, wait_until='domcontentloaded')
        fA = await app_frame(pgA)
        await fA.wait_for_selector('#lg-u', timeout=45000)
        T('login page renders (no session)', True)
        # wrong passcode rejected
        await fA.fill('#lg-u','esther'); await fA.fill('#lg-p','wrong')
        await fA.click('button[data-act="doLogin"]'); await pgA.wait_for_timeout(3500)
        T('wrong passcode rejected', await fA.locator('#lg-u').count()==1)
        fA = await login(pgA, 'esther', 'grmp2026')
        await pgA.wait_for_timeout(1500)
        T('esther lands on her console', 'Programme Lead' in await fA.content())

        print('— action roundtrip + persistence —')
        n0 = await js(fA, "db.emails.length")
        # esther marks one gate-blocked mentee acknowledged (admin may act on participants)
        gid = await js(fA, "(db.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&!(p.ack&&['rules','charter','governance','pdpa','coi'].every(k=>p.ack[k])))||{}).id")
        if gid:
            await fA.evaluate(f"window.__demo.Actions.ackAll({{person:'{gid}'}})")
            await pgA.wait_for_timeout(6000)
            T('ackAll roundtrip applies on server', await js(fA, f"['rules','charter','governance','pdpa','coi'].every(k=>db.people.find(p=>p.id==='{gid}').ack&&db.people.find(p=>p.id==='{gid}').ack[k])"))
        else:
            T('ackAll roundtrip applies on server', False)
        # persistence across reload
        await pgA.reload(wait_until='domcontentloaded')
        fA = await app_frame(pgA)
        await pgA.wait_for_timeout(4000)
        T('session survives reload (no login page)', await fA.locator('#lg-u').count()==0)
        T('mutation persisted in shared DB', await js(fA, f"'{gid}' && ['rules','charter','governance','pdpa','coi'].every(k=>db.people.find(p=>p.id==='{gid}').ack&&db.people.find(p=>p.id==='{gid}').ack[k])"))

        print('— SHARED state across two independent browsers —')
        ctxB = await b.new_context(viewport={"width":1360,"height":900})
        pgB = await ctxB.new_page()
        await pgB.goto(URL, wait_until='domcontentloaded')
        fB = await login(pgB, 'weikiat', 'grmp2026')
        await pgB.wait_for_timeout(1500)
        T('wei kiat logs in from a second browser', 'Programme Coordinator' in await fB.content())
        marker = 'SHARED-STATE-PROBE'
        await fB.evaluate(f"window.__demo.Actions.remindCloseoff({{email:'{marker}@test.dev'}})")
        await pgB.wait_for_timeout(6000)
        await pgA.reload(wait_until='domcontentloaded')
        fA = await app_frame(pgA); await pgA.wait_for_timeout(4000)
        T("B's action visible to A after refresh (one shared database)",
          await js(fA, f"db.emails.some(e=>e.to==='{marker}@test.dev')"))

        print('— permission guard —')
        denied = await fB.evaluate("""(async()=>{ try{
            await new Promise((res,rej)=>google.script.run.withSuccessHandler(r=>res(r)).withFailureHandler(rej)
              .applyAction((window.SESSION_TOKEN_FN&&window.SESSION_TOKEN_FN())||null,'decide',['E001','accepted','WeiKiat']));
          }catch(e){}
          return new Promise((res)=>google.script.run.withSuccessHandler(r=>res(r.ok===false)).withFailureHandler(()=>res(false))
            .applyAction((window.SESSION_TOKEN_FN&&window.SESSION_TOKEN_FN())||null,'decide',['E001','accepted','WeiKiat'])); })()""")
        T('coordinator cannot make Lead decisions (server-side guard)', denied is True)

        print('— participant account: self-service —')
        ctxC = await b.new_context(viewport={"width":1360,"height":900})
        pgC = await ctxC.new_page()
        await pgC.goto(URL, wait_until='domcontentloaded')
        fC = await login(pgC, 'mentee.mid', 'grmp2026')
        await pgC.wait_for_timeout(2000)
        T('participant lands on their personal page', 'personal link' in (await fC.content()) or 'Hi ' in (await fC.content()))
        selfid = await js(fC, "(window.SESSION_TOKEN_FN, (db.config.accounts.find(a=>a.u==='mentee.mid')||{}).personId)")
        other = await js(fC, f"(db.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&p.id!=='{selfid}')||{{}}).id")
        denied2 = await fC.evaluate(f"new Promise((res)=>google.script.run.withSuccessHandler(r=>res(r.ok===false)).withFailureHandler(()=>res(false)).applyAction((window.SESSION_TOKEN_FN&&window.SESSION_TOKEN_FN())||null,'completeOrientation',['{other}','recorded']))")
        T('participant cannot act on someone else (server-side guard)', denied2 is True)

        print('— reset shared DB to seed (leave it clean) —')
        await pgA.reload(wait_until='domcontentloaded')
        fA = await app_frame(pgA); await pgA.wait_for_timeout(4000)
        ok = await fA.evaluate("""new Promise((res)=>google.script.run.withSuccessHandler(r=>res(r.ok===true)).withFailureHandler(()=>res(false))
            .applyAction((window.SESSION_TOKEN_FN&&window.SESSION_TOKEN_FN())||null,'adminReset',[]))""")
        T('esther resets the shared DB', ok is True)

        # Google's own sandbox wrapper throws a benign document.write "missing )" error in ITS frames
        # (verified: our app frame is clean — see frame probe). Count only non-wrapper errors.
        ours = [e for e in errors if 'missing ) after argument list' not in e]
        print(f"page errors (excluding known Google-wrapper noise): {ours if ours else 'none'}")
        T('zero page errors from our app', len(ours)==0)
        await b.close()
    print(f"\n{P[0]} passed, {P[1]} failed")
    sys.exit(1 if P[1] else 0)

asyncio.run(main())
