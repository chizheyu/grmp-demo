# Dead-end audit: for every role × every menu item, does the page give the user
# anything to DO? "It rendered without an error" is not the bar — a page that says
# "nothing here" passes that check and still wastes the visit.
#
# Classifies each view as:
#   ACTIONABLE  — has buttons/links that act, or rows of real content
#   EMPTY       — renders, but nothing to act on and no way onward   <-- the bug class
#   READ-ONLY   — legitimately just information (email log, config text)
# Run: python tests/e2e_deadends.py
import asyncio, sys
from playwright.async_api import async_playwright

URL = "https://grmp-platform.web.app"
PASS = "grmp2026"

ADMINS = ["esther", "weikiat", "kenzie", "yutong", "portia", "sapranshu"]
DISPLAY = {"esther": "Esther", "weikiat": "Wei Kiat", "kenzie": "Kenzie",
           "yutong": "Yu Tong", "portia": "Portia", "sapranshu": "Sapranshu"}
# Views whose whole job is to inform — an empty one is fine, but it must say why.
INFORMATIONAL = {"emails", "config", "reminders"}


async def wait_db(pg, timeout=40):
    for _ in range(timeout * 2):
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
    await pg.fill("#lg-u", user)
    await pg.fill("#lg-p", PASS)
    await pg.click('button[data-act="doLogin"]')
    await pg.wait_for_timeout(1600)


async def main():
    findings, rows = [], []
    async with async_playwright() as p:
        br = await p.chromium.launch()
        pg = await br.new_page()
        await pg.goto(URL, wait_until="domcontentloaded")
        await wait_db(pg)

        for acct in ADMINS:
            await login(pg, acct)
            name = DISPLAY[acct].replace(" ", "%20")
            keys = await pg.evaluate(
                "[...document.querySelectorAll('.co-item')].map(b=>b.dataset.goto.split('/').pop())")
            print(f"\n— {acct} ({len(keys)} views) —")
            for k in keys:
                await pg.evaluate(f"location.hash='#/console/{name}/{k}'")
                await pg.wait_for_timeout(700)
                m = await pg.evaluate("""() => {
                  const main = document.querySelector('.co-main'); if(!main) return null;
                  // The yellow INFERRED cards sit on nearly every page. They are the
                  // Round-2 confirmations, not this page's own work — exclude them.
                  const isCardCtl = el => !!el.closest('.inferred, .infcard, [class*="inferred"]');
                  const acts = [...main.querySelectorAll('[data-act]')]
                    .filter(el => el.dataset.act !== 'openFeedback' && !isCardCtl(el));
                  const inputs = [...main.querySelectorAll('input,select,textarea')].filter(el => !isCardCtl(el));
                  const bodyRows = main.querySelectorAll('table.tb tr:not(:first-child)').length;
                  // A card of prose IS content — a submitted reflection or a logged concern
                  // is worth reading even with nothing to click. What is NOT content is a card
                  // the view itself marks as an empty state.
                  const cards = [...main.querySelectorAll('.qcard, .pair-row')].filter(c => !isCardCtl(c));
                  const realCards = cards.filter(c => !c.classList.contains('empty-state')).length;
                  const emptyStates = [...main.querySelectorAll('.empty-state')];
                  // An empty state is acceptable only if it offers a way onward.
                  const emptyWithoutExit = emptyStates.filter(c => !c.querySelector('a[href], [data-act]')).length;
                  return {acts: acts.map(el => el.dataset.act), inputs: inputs.length,
                          bodyRows, realCards, emptyStates: emptyStates.length, emptyWithoutExit,
                          text: main.innerText.trim().replace(/\\s+/g, ' ').slice(0, 200)};
                }""")
                doable = len(m["acts"]) + m["inputs"] + m["bodyRows"] + m["realCards"]
                if m["emptyWithoutExit"]:
                    verdict = "DEAD END"          # nothing here, and no way onward
                    findings.append((acct, k, m["text"][:150]))
                elif doable > 0:
                    verdict = "ACTIONABLE"
                elif m["emptyStates"]:
                    verdict = "EMPTY+EXIT"        # nothing here, but it points you somewhere
                elif k in INFORMATIONAL:
                    verdict = "READ-ONLY"
                else:
                    verdict = "DEAD END"
                    findings.append((acct, k, m["text"][:150]))
                rows.append((acct, k, verdict, m))
                print(f"  {verdict:11} {k:16} actions={len(m['acts']):3} rows={m['bodyRows']:3} "
                      f"cards={m['realCards']:2} empty={m['emptyStates']}")

        await br.close()

    # per-role report the programme team can read without running anything
    with open("../GRMP_Role_Report.md", "w") as f:
        f.write("# GRMP 每个角色能看到什么、能做什么\n\n")
        f.write("自动生成 · `tests/e2e_deadends.py` · 逐角色登录线上平台，逐页统计真实可操作元素。\n")
        f.write("判定标准不是「页面渲染出来了」，而是**这一页有没有东西可做**——纯文字的说明框不算内容。\n\n")
        for acct in ADMINS:
            mine = [r for r in rows if r[0] == acct]
            f.write(f"## `{acct}` — {DISPLAY[acct]}（{len(mine)} 个页面）\n\n")
            f.write("| 页面 | 判定 | 可点操作 | 数据行 | 内容卡 | 这一页能做什么 |\n|---|---|---|---|---|---|\n")
            for _, k, verdict, m in mine:
                acts = ", ".join(sorted(set(m["acts"]))[:5]) or "—"
                f.write(f"| {k} | {verdict} | {len(m['acts'])} | {m['bodyRows']} | "
                        f"{m['realCards']} | {acts} |\n")
            f.write("\n")
        if findings:
            f.write("## 空页面（进去没事可做）\n\n")
            for acct, k, text in findings:
                f.write(f"- `{acct}` → **{k}**：{text}\n")
        else:
            f.write("## 空页面\n\n无。每个角色的每个页面都有可操作元素或真实内容。\n")
    print("\nwrote ../GRMP_Role_Report.md")

    print("\n" + "=" * 70)
    if findings:
        print(f"{len(findings)} dead end(s) — a user lands here and has nothing to do:\n")
        for acct, k, text in findings:
            print(f"  · {acct} → {k}\n      \"{text}\"")
    else:
        print("No dead ends: every view offers an action, content, or an onward step.")
    sys.exit(1 if findings else 0)


asyncio.run(main())
