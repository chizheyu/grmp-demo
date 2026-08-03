# Live E2E against the Firestore platform (grmp-platform.web.app).
# The headline check: REAL-TIME sync — browser B acts, browser A sees it WITHOUT refresh.
# Run: python tests/e2e_firestore.py
import asyncio, sys, time
from playwright.async_api import async_playwright

URL = "https://grmp-platform.web.app"
P=[0,0]
def T(name,cond):
    P[0 if cond else 1]+=1
    print(('  PASS ' if cond else '  FAIL ')+name)

async def js(pg, expr):
    return await pg.evaluate(f"(()=>{{const db=window.__demo.db; return {expr};}})()")

async def wait_db(pg, timeout=30):
    for _ in range(timeout*2):
        ok = await pg.evaluate("!!(window.__demo && window.__demo.db)")
        if ok: return True
        await pg.wait_for_timeout(500)
    return False

async def login(pg, u, p):
    await pg.evaluate("location.hash='#/login'")
    await pg.wait_for_selector('#lg-u', timeout=15000)
    await pg.fill('#lg-u', u); await pg.fill('#lg-p', p)
    await pg.click('button[data-act="doLogin"]')
    await pg.wait_for_timeout(1500)

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        A = await (await b.new_context()).new_page()
        errsA=[]; A.on("pageerror", lambda e:errsA.append(str(e)[:150]))

        print('— boot (public microsite, live db) —')
        t0=time.time()
        await A.goto(URL, wait_until='domcontentloaded')
        T('db streams in (first snapshot)', await wait_db(A))
        print(f'    boot-to-data: {time.time()-t0:.1f}s')
        c = await A.content()
        T('public microsite renders without login', 'Six months. Three mentors.' in c)

        print('— login as esther —')
        await login(A, 'esther', 'grmp2026')
        T('esther console renders', 'Programme Lead' in await A.content())

        print('— action latency (local render + async persist) —')
        gid = await js(A, "(db.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&!(p.ack&&['rules','charter','governance','pdpa','coi'].every(k=>p.ack[k])))||{}).id")
        t0=time.time()
        await A.evaluate(f"window.__demo.Actions.ackAll({{person:'{gid}'}})")
        applied = await js(A, f"['rules','charter','governance','pdpa','coi'].every(k=>db.people.find(p=>p.id==='{gid}').ack&&db.people.find(p=>p.id==='{gid}').ack[k])")
        dt=time.time()-t0
        T(f'mutation applies instantly (local-first, {dt*1000:.0f}ms)', applied and dt<1.5)
        await A.wait_for_timeout(2500)   # let persist land

        print('— REAL-TIME: browser B acts, A sees it WITHOUT refresh —')
        B = await (await b.new_context()).new_page()
        await B.goto(URL, wait_until='domcontentloaded')
        T('B boots', await wait_db(B))
        await login(B, 'weikiat', 'grmp2026')
        marker=f"probe-{int(time.time())}@live.dev"
        await B.evaluate(f"window.__demo.Actions.remindCloseoff({{email:'{marker}'}})")
        seen=False; t0=time.time()
        for _ in range(30):                      # up to 15s, NO reload of A
            if await js(A, f"db.emails.some(e=>e.to==='{marker}')"): seen=True; break
            await A.wait_for_timeout(500)
        T(f"A sees B's action live, no refresh ({time.time()-t0:.1f}s)", seen)

        print('— persistence across reload —')
        await A.reload(wait_until='domcontentloaded')
        T('A still signed in after reload', await wait_db(A) and (await A.locator('#lg-u').count())==0)
        T('data persisted in Firestore', await js(A, f"db.emails.some(e=>e.to==='{marker}')"))

        print('— participant persona —')
        C = await (await b.new_context()).new_page()
        await C.goto(URL, wait_until='domcontentloaded')
        await wait_db(C)
        await login(C, 'mentee.mid', 'grmp2026')
        T('participant lands on personal page', 'personal link' in (await C.content()))

        print('— reset shared DB to seed (leave clean) —')
        okr = await A.evaluate("""new Promise(res=>{ const _c=window.confirm; window.confirm=()=>true;
            try{ window.__demo.Actions.reset(); }finally{ window.confirm=_c; }
            setTimeout(()=>res(true), 6000); })""")
        await A.wait_for_timeout(1000)
        clean = await js(A, "db.emails.length<=10 && !db.emails.some(e=>String(e.to||'').includes('probe-'))")
        T('shared DB reset to seed', bool(okr) and clean)

        errs=[e for e in errsA if 'missing ) after argument list' not in e]
        print(f"page errors: {errs if errs else 'none'}")
        T('zero page errors from our app', len(errs)==0)
        await b.close()
    print(f"\n{P[0]} passed, {P[1]} failed")
    sys.exit(1 if P[1] else 0)

asyncio.run(main())
