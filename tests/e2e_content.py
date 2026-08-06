# Content smell test — for things that are well-formed but WRONG.
#
# The structural suites ("does it render", "does it have rows", "is there a button")
# all passed on an audit log whose 120 rows carried the same date and no time of day.
# That is the class of bug a human spots in two seconds and an assertion never does,
# because the assertion only ever checked what I already thought to check.
#
# So this pass looks at rendered VALUES and flags the smells:
#   · a column where every row says the same thing
#   · undefined / NaN / [object Object] / null leaking into the page
#   · a heading that says (N) with a different number of rows under it
#   · empty cells, placeholder words, dates outside any sane window
# Run: python tests/e2e_content.py
import asyncio, re, sys
from playwright.async_api import async_playwright

URL = "https://grmp-platform.web.app"
PASS = "grmp2026"
ADMINS = {"esther": "Esther", "weikiat": "Wei Kiat", "kenzie": "Kenzie",
          "yutong": "Yu Tong", "portia": "Portia", "sapranshu": "Sapranshu"}
PUBLIC = ["#/", "#/guide/mentee", "#/guide/mentor", "#/reflection", "#/concern",
          "#/apply/mentee", "#/apply/mentor", "#/manual", "#/changelog", "#/decisions"]
JUNK = re.compile(r"\bundefined\b|\bNaN\b|\[object Object\]|\bnull\b|Lorem ipsum|TODO|FIXME|XXX|\$\{")
DATE = re.compile(r"\b(20\d\d)-(\d\d)-(\d\d)\b")
# The sample cohort lives entirely in the past — a date after the real-world today on
# any page reads as a bug to every first-time viewer ("November has not happened yet").
from datetime import date as _date
TODAY_REAL = _date.today().isoformat()

# Uniform columns that have been looked at and are genuinely correct. Each one carries
# the reason, so a future reader can re-judge it instead of trusting a silent ignore.
# Anything not on this list is a finding — the tool cries wolf on purpose.
UNIFORM_OK = {
    ("matching", "Track"):
        "a Suggest run covers one track at a time, so every proposal on the board shares it",
    ("certificates", "Status"):
        "nobody has finished three rotations in December — 'In progress' for all is the truth",
    ("audit", "Programme date"):
        "the cohort clock genuinely is one date; the real instant is the separate 'Happened' column",
    ("waitlist", ""):
        "unlabelled column of Promote buttons — an action column, not data",
    ("matching", "Approved"):
        "the table is sorted newest-first and only the head is shown, so one date at the top is expected",
    ("matching", "Status"):
        "same head-of-a-sorted-table effect: the newest approvals are all still Running",
}
findings = []


def flag(where, what):
    findings.append((where, what))
    print(f"    SMELL  {what}")


async def wait_db(pg, t=40):
    for _ in range(t * 2):
        if await pg.evaluate("!!(window.__demo && window.__demo.db)"):
            return True
        await pg.wait_for_timeout(500)
    return False


async def login(pg, user):
    await pg.evaluate("localStorage.removeItem('grmp_session')")
    await pg.evaluate("location.hash='#/'")
    await pg.reload()
    await wait_db(pg)
    await pg.evaluate("location.hash='#/login'")
    await pg.wait_for_selector("#lg-u", timeout=20000)
    await pg.fill("#lg-u", user); await pg.fill("#lg-p", PASS)
    await pg.click('button[data-act="doLogin"]')
    await pg.wait_for_timeout(1600)


async def inspect(pg, where):
    data = await pg.evaluate("""() => {
      const root = document.querySelector('.co-main') || document.querySelector('#app');
      const tables = [...root.querySelectorAll('table.tb')].map(t => {
        const rows = [...t.querySelectorAll('tr')];
        const head = [...(rows[0]?.cells||[])].map(c=>c.textContent.trim());
        const body = rows.slice(1).map(r=>[...r.cells].map(c=>c.textContent.trim()));
        return {head, body};
      });
      const headings = [...root.querySelectorAll('h1,h2,h3')].map(h=>h.textContent.trim());
      return {text: root.innerText, tables, headings};
    }""")

    junk = JUNK.findall(data["text"])
    if junk:
        flag(where, f"placeholder/undefined leaking into the page: {sorted(set(junk))[:4]}")

    future = sorted({m.group(0) for m in DATE.finditer(data["text"]) if m.group(0) > TODAY_REAL})
    if future:
        flag(where, f"future-dated content on screen (reads as a bug): {future[:4]}")

    for ti, t in enumerate(data["tables"]):
        body, head = t["body"], t["head"]
        if len(body) < 8:
            continue
        for ci, col in enumerate(head):
            vals = [r[ci] for r in body if ci < len(r)]
            if not vals:
                continue
            uniq = set(vals)
            # A column of 8+ rows carrying one single value is almost always a bug:
            # a clock that never advanced, an actor that never changed, a stuck status.
            if len(uniq) == 1 and vals[0] and not re.fullmatch(r"[—\-–]|", vals[0]):
                page = where.split("/")[-1]
                reason = UNIFORM_OK.get((page, col))
                if reason:
                    print(f"    known    “{col}” uniform — {reason}")
                    continue
                looks_temporal = any(k in col.lower() for k in ("when", "date", "time", "happened"))
                flag(where, f"table {ti} column “{col}”: all {len(vals)} rows say “{vals[0]}”"
                            + (" — a timestamp column that never changes is not a timestamp" if looks_temporal else ""))
            blanks = sum(1 for v in vals if v in ("", "—", "-"))
            if blanks > len(vals) * 0.6:
                flag(where, f"table {ti} column “{col}”: {blanks}/{len(vals)} cells empty")

    # "(N)" in a heading should match the rows that follow it
    for h in data["headings"]:
        m = re.search(r"\((\d+)\)", h)
        if not m:
            continue
        n = int(m.group(1))
        if n > 0 and not data["tables"]:
            continue
        for t in data["tables"]:
            if len(t["body"]) and abs(len(t["body"]) - n) > 0 and n <= 200 and len(t["body"]) <= 200:
                # only flag when the heading plainly labels that table
                if len(data["tables"]) == 1:
                    flag(where, f"heading “{h}” but the table under it has {len(t['body'])} rows")


async def main():
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page()
        await pg.goto(URL, wait_until="domcontentloaded")
        await wait_db(pg)

        print("— public pages —")
        for h in PUBLIC:
            await pg.evaluate(f"location.hash={h!r}")
            await pg.wait_for_timeout(800)
            print(f"  {h}")
            await inspect(pg, f"public {h}")

        for acct, name in ADMINS.items():
            await login(pg, acct)
            keys = await pg.evaluate(
                "[...document.querySelectorAll('.co-item')].map(b=>b.dataset.goto.split('/').pop())")
            print(f"— {acct} —")
            for k in keys:
                await pg.evaluate(f"location.hash='#/console/{name.replace(' ','%20')}/{k}'")
                await pg.wait_for_timeout(700)
                print(f"  {k}")
                await inspect(pg, f"{acct}/{k}")

        await br.close()

    print("\n" + "=" * 70)
    if findings:
        print(f"{len(findings)} content smell(s) — well-formed, but look wrong to a human:\n")
        for where, what in findings:
            print(f"  · {where}: {what}")
    else:
        print("No content smells: no stuck columns, no leaked placeholders, no count mismatches.")
    sys.exit(1 if findings else 0)


asyncio.run(main())
