# Records role walkthrough videos against the LIVE demo, with a visible cursor and human pacing.
# Run: python tests/record_videos.py   → .webm in tests/videos/, converted to .mp4 alongside.
import asyncio, os, subprocess, sys, glob
from playwright.async_api import async_playwright

BASE = "https://chizheyu.github.io/grmp-demo/index.html"
OUT  = os.path.join(os.path.dirname(os.path.abspath(__file__)), "videos")
os.makedirs(OUT, exist_ok=True)

CURSOR_JS = """
window.addEventListener('DOMContentLoaded',()=>{
  const c=document.createElement('div');
  c.id='__cursor';
  c.style.cssText='position:fixed;width:22px;height:22px;border-radius:50%;background:rgba(200,16,46,.85);border:2.5px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.4);z-index:99999;pointer-events:none;left:-40px;top:-40px;transition:transform .12s';
  document.body.appendChild(c);
  window.addEventListener('mousemove',e=>{c.style.left=(e.clientX-11)+'px';c.style.top=(e.clientY-11)+'px'});
  window.addEventListener('mousedown',()=>{c.style.transform='scale(.7)'});
  window.addEventListener('mouseup',()=>{c.style.transform='scale(1)'});
});
"""

async def make_page(ctx):
    pg = await ctx.new_page()
    return pg

async def click_el(pg, selector, pause=0.7):
    el = pg.locator(selector).first
    await el.scroll_into_view_if_needed()
    await pg.wait_for_timeout(350)
    box = await el.bounding_box()
    if not box: raise RuntimeError("no bbox for "+selector)
    await pg.mouse.move(box["x"]+box["width"]/2, box["y"]+box["height"]/2, steps=28)
    await pg.wait_for_timeout(220)
    await pg.mouse.down(); await pg.wait_for_timeout(90); await pg.mouse.up()
    await pg.wait_for_timeout(int(pause*1000))

async def type_into(pg, selector, text):
    await click_el(pg, selector, pause=0.2)
    await pg.keyboard.type(text, delay=22)
    await pg.wait_for_timeout(300)

async def record(pw, name, fn, size={"width":1280,"height":800}):
    browser = await pw.chromium.launch()
    ctx = await browser.new_context(viewport=size, record_video_dir=OUT, record_video_size=size)
    pg = await ctx.new_page()
    await pg.add_init_script(CURSOR_JS)
    await pg.goto(BASE + "#/")
    await pg.evaluate("localStorage.clear()")
    await pg.reload(); await pg.wait_for_timeout(900)
    try:
        await fn(pg)
    finally:
        await pg.wait_for_timeout(1500)
        await ctx.close(); await browser.close()
    vids = sorted(glob.glob(os.path.join(OUT,"*.webm")), key=os.path.getmtime)
    latest = vids[-1]
    target = os.path.join(OUT, name+".webm")
    if os.path.abspath(latest)!=os.path.abspath(target):
        os.replace(latest, target)
    print("recorded", target)

# ---------- Clip 1: applicant journey ----------
async def clip_applicant(pg):
    await pg.wait_for_timeout(1800)                                   # hero
    await pg.mouse.wheel(0, 700); await pg.wait_for_timeout(1400)     # tracks
    await pg.mouse.wheel(0, 500); await pg.wait_for_timeout(1400)     # timeline
    await pg.mouse.wheel(0,-1400); await pg.wait_for_timeout(700)
    await click_el(pg, '.ms-hero a[href="#/apply/mentee"]', pause=1.0)
    await type_into(pg, '#f-name', 'Sarah Lim')
    await type_into(pg, '#f-email', 'sarah.lim@smu.example.edu')
    await type_into(pg, '#f-course', 'Information Systems')
    await type_into(pg, '#f-goals', 'Understand how AI is reshaping careers — and find my place in it.')
    await click_el(pg, '.track-opt[data-track="ai"]', pause=0.6)
    await click_el(pg, '#f-consent', pause=0.5)
    await click_el(pg, 'button[data-act="submitApply"]', pause=1.2)
    await pg.wait_for_timeout(2600)                                   # confirmation + email popup

# ---------- Clip 2: review → decide → match ----------
async def clip_admin(pg):
    await pg.goto(BASE + "#/console"); await pg.wait_for_timeout(1600)
    await click_el(pg, '.login-row:has-text("Portia")', pause=1.2)     # reviewer signs in
    await pg.wait_for_timeout(900)
    cid = await pg.evaluate("__demo.db.people.find(p=>p.appStatus==='submitted'&&p.kind==='mentee').id")
    await type_into(pg, f'#cm-{cid}', 'Thoughtful goals, ready to commit')
    await click_el(pg, f'button[data-act="score"][data-person="{cid}"]', pause=1.2)
    await pg.goto(BASE + "#/console"); await pg.wait_for_timeout(900)
    await click_el(pg, '.login-row:has-text("Esther")', pause=1.0)     # lead signs in
    await click_el(pg, 'button.co-item:has-text("Decisions")', pause=1.2)
    await click_el(pg, f'button[data-act="decide"][data-person="{cid}"][data-decision="accepted"]', pause=1.6)
    await click_el(pg, 'button.co-item:has-text("Matching")', pause=1.4)
    await click_el(pg, 'button[data-act="suggest"][data-track="general"]', pause=1.6)
    await pg.mouse.wheel(0, 300); await pg.wait_for_timeout(1600)      # read rationale
    await click_el(pg, 'button[data-act="approvePair"]', pause=1.4)
    await pg.wait_for_timeout(2200)

# ---------- Clip 3: mentee gates + close-off ----------
async def clip_mentee(pg):
    gid = await pg.evaluate("__demo.db.people.find(p=>p.kind==='mentee'&&p.appStatus==='accepted'&&!(p.ack&&['rules','charter','governance','pdpa','coi'].every(d=>p.ack[d]))).id")
    await pg.goto(BASE + f"#/me/{gid}"); await pg.wait_for_timeout(2000)
    await pg.mouse.wheel(0, 250); await pg.wait_for_timeout(1200)      # see the 5 docs
    await click_el(pg, 'button[data-act="ack"]', pause=1.0)            # acknowledge one properly
    await click_el(pg, 'button[data-act="ackAll"]', pause=1.4)         # then the demo shortcut
    await click_el(pg, 'button[data-act="orient"]', pause=1.6)         # recorded module
    coid = await pg.evaluate("__demo.db.pairs.find(p=>p.rotation===2&&p.status==='approved'&&!__demo.db.people.find(x=>x.id===p.menteeId).previewFastForward).menteeId")
    await pg.goto(BASE + f"#/me/{coid}"); await pg.wait_for_timeout(1800)
    await click_el(pg, '#co-met', pause=0.5)
    await click_el(pg, '#co-ref', pause=0.5)
    await type_into(pg, '#co-comment', 'Great rotation — learned a lot.')
    await click_el(pg, 'button[data-act="closeoff"]', pause=1.5)
    await pg.wait_for_timeout(2200)

# ---------- Clip 4: completion & certificates ----------
async def clip_completion(pg):
    pvid = await pg.evaluate("__demo.db.people.find(p=>p.previewFastForward).id")
    await pg.goto(BASE + f"#/me/{pvid}"); await pg.wait_for_timeout(2000)
    await type_into(pg, '#br-text', 'I will mentor two juniors in my CCA and help run next cycle as a student volunteer.')
    await click_el(pg, f'button[data-act="builder"]', pause=1.6)
    await pg.goto(BASE + "#/console"); await pg.wait_for_timeout(900)
    await click_el(pg, '.login-row:has-text("Esther")', pause=1.0)
    await click_el(pg, 'button.co-item:has-text("Certificates")', pause=1.4)
    await click_el(pg, 'button[data-act="issueCerts"]', pause=1.8)
    await pg.goto(BASE + f"#/me/{pvid}"); await pg.wait_for_timeout(1200)
    await pg.mouse.wheel(0, 200); await pg.wait_for_timeout(2600)      # certificate on screen

# ---------- Clip 5: full cycle to certificate (R2 close → clock → R3 → cert) ----------
async def clip_full_cycle(pg):
    mid=await pg.evaluate("(()=>{const db=__demo.db;return db.pairs.find(p=>p.rotation===2&&p.status==='approved'&&!db.people.find(x=>x.id===p.menteeId).previewFastForward).menteeId})()")
    await pg.goto(BASE+f"#/me/{mid}"); await pg.wait_for_timeout(1600)
    await click_el(pg,'label.f-check:has(#co-met) span',pause=0.5)
    await click_el(pg,'label.f-check:has(#co-ref) span',pause=0.5)
    await type_into(pg,'#co-comment','Two great meetups — rethought my shortlist.')
    await click_el(pg,'button[data-act="closeoff"]',pause=1.3)
    await pg.goto(BASE+"#/console/Esther/config"); await pg.wait_for_timeout(1200)
    await click_el(pg,'button[data-act="setToday"][data-date="2027-02-01"]',pause=1.3)
    await click_el(pg,'button.co-item:has-text("Matching")',pause=1.3)
    tr=await pg.evaluate(f"__demo.db.people.find(p=>p.id==='{mid}').track")
    await click_el(pg,f'button[data-act="suggest"][data-track="{tr}"]',pause=1.5)
    pid=await pg.evaluate(f"(()=>{{const x=__demo.db.pairs.find(p=>p.rotation===3&&p.status==='proposed'&&p.menteeId==='{mid}');return x?x.id:null}})()")
    await click_el(pg,f'button[data-act="approvePair"][data-pair="{pid}"]',pause=1.5)
    await pg.goto(BASE+f"#/me/{mid}"); await pg.wait_for_timeout(1500)
    await click_el(pg,'label.f-check:has(#co-met) span',pause=0.4)
    await click_el(pg,'label.f-check:has(#co-ref) span',pause=0.4)
    await click_el(pg,'button[data-act="closeoff"]',pause=1.3)
    await type_into(pg,'#br-text','I will mentor juniors in my CCA and volunteer next cycle.')
    await click_el(pg,f'button[data-act="builder"]',pause=1.4)
    m3=await pg.evaluate(f"__demo.db.pairs.find(p=>p.rotation===3&&p.menteeId==='{mid}').mentorId")
    await pg.goto(BASE+f"#/me/{m3}"); await pg.wait_for_timeout(1300)
    if await pg.locator('#mr-text').count():
        await type_into(pg,'#mr-text','Pairing went well — proactive mentee.')
        await click_el(pg,'button[data-act="midreview"]',pause=1.2)
    await pg.goto(BASE+"#/console"); await pg.wait_for_timeout(800)
    await click_el(pg,'.login-row:has-text("Esther")',pause=1.0)
    await click_el(pg,'button.co-item:has-text("Certificates")',pause=1.4)
    await click_el(pg,'button[data-act="issueCerts"]',pause=1.6)
    await pg.goto(BASE+f"#/me/{mid}"); await pg.wait_for_timeout(1200)
    await pg.mouse.wheel(0,120); await pg.wait_for_timeout(2600)

async def main():
    import sys as _s
    only=_s.argv[1] if len(_s.argv)>1 else None
    async with async_playwright() as pw:
        if only=="5":
            await record(pw, "5_full_cycle_to_certificate", clip_full_cycle)
        else:
            await record(pw, "1_applicant_journey", clip_applicant)
        await record(pw, "2_review_decide_match", clip_admin)
        await record(pw, "3_mentee_gates_closeoff", clip_mentee)
        await record(pw, "4_completion_certificate", clip_completion)
    # convert to mp4
    for w in sorted(glob.glob(os.path.join(OUT,"*.webm"))):
        m = w[:-5]+".mp4"
        subprocess.run(["ffmpeg","-y","-loglevel","error","-i",w,"-c:v","libx264","-pix_fmt","yuv420p","-movflags","+faststart",m],check=True)
        print("mp4:", m, f"{os.path.getsize(m)//1024} KB")

asyncio.run(main())
