# Accessibility pass with axe-core — the industry suite, not assertions I invented.
#
# Everything I had written so far only tested what I already thought to check. axe
# encodes ~90 rules the whole field agreed on: unlabelled inputs, contrast, heading
# order, missing lang, buttons with no accessible name. For a Singapore NGO putting a
# public application form in front of students, this is not polish — an unlabelled
# field is unusable with a screen reader, and SMC is a committee that will be asked.
#
# Run: python tests/e2e_a11y.py
import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

URL = "https://grmp-platform.web.app"
PASS = "grmp2026"
AXE = Path(__file__).resolve().parent.parent / "node_modules" / "axe-core" / "axe.min.js"
PAGES = ["#/", "#/guide/mentee", "#/guide/mentor", "#/reflection", "#/concern",
         "#/apply/mentee", "#/apply/mentor", "#/changelog", "#/decisions", "#/login"]
CONSOLE = ["dashboard", "review-mentees", "decisions", "matching", "certificates", "audit", "config"]
# WCAG A/AA only — the level a public service page is actually held to.
TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]


async def wait_db(pg, t=40):
    for _ in range(t * 2):
        if await pg.evaluate("!!(window.__demo && window.__demo.db)"):
            return True
        await pg.wait_for_timeout(500)
    return False


async def scan(pg, where, seen):
    await pg.add_script_tag(path=str(AXE))
    res = await pg.evaluate(
        "async (tags) => await axe.run(document, {runOnly:{type:'tag', values:tags}})", TAGS)
    hits = []
    for v in res["violations"]:
        n = len(v["nodes"])
        hits.append((v["impact"] or "minor", v["id"], v["help"], n,
                     v["nodes"][0]["html"][:90] if v["nodes"] else ""))
        seen.setdefault(v["id"], {"help": v["help"], "impact": v["impact"], "pages": [], "n": 0})
        seen[v["id"]]["pages"].append(where)
        seen[v["id"]]["n"] += n
    order = {"critical": 0, "serious": 1, "moderate": 2, "minor": 3}
    hits.sort(key=lambda h: order.get(h[0], 9))
    print(f"  {where:34} {len(hits)} rule(s) failing"
          + (f"  ← {hits[0][1]} ({hits[0][0]})" if hits else ""))
    return hits


async def main():
    if not AXE.exists():
        print("axe-core missing — run: npm i -D axe-core"); sys.exit(2)
    seen = {}
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page()
        await pg.goto(URL, wait_until="domcontentloaded")
        await wait_db(pg)

        print("— public pages —")
        for h in PAGES:
            await pg.evaluate(f"location.hash={h!r}")
            await pg.wait_for_timeout(800)
            await scan(pg, h, seen)

        print("— console (as Esther) —")
        await pg.evaluate("location.hash='#/login'")
        await pg.wait_for_selector("#lg-u", timeout=20000)
        await pg.fill("#lg-u", "esther"); await pg.fill("#lg-p", PASS)
        await pg.click('button[data-act="doLogin"]')
        await pg.wait_for_timeout(1800)
        for k in CONSOLE:
            await pg.evaluate(f"location.hash='#/console/Esther/{k}'")
            await pg.wait_for_timeout(700)
            await scan(pg, k, seen)

        await br.close()

    print("\n" + "=" * 74)
    if not seen:
        print("No WCAG A/AA violations.")
        sys.exit(0)
    order = {"critical": 0, "serious": 1, "moderate": 2, "minor": 3}
    print(f"{len(seen)} distinct rule(s) failing, worst first:\n")
    for rid, d in sorted(seen.items(), key=lambda kv: order.get(kv[1]["impact"], 9)):
        print(f"  [{(d['impact'] or 'minor').upper():8}] {rid}")
        print(f"             {d['help']}")
        print(f"             {d['n']} element(s) across {len(set(d['pages']))} page(s): "
              f"{', '.join(sorted(set(d['pages']))[:5])}")
    sys.exit(1)


asyncio.run(main())
