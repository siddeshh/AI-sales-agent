"""Open every page at 1366x768 (projector) and 1920x1080, save screenshots, report console errors.

Needs the backend on :8000 and the frontend dev server running (default http://localhost:5174).
    backend\\venv\\Scripts\\python design\\take_screenshots.py [base_url]
Uses Playwright with the Microsoft Edge that ships with Windows (no browser download).
"""
import pathlib
import shutil
import sys

from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5174"
OUT = pathlib.Path(__file__).parent / "screenshots"
VIEWS = ["dashboard", "leads", "conversations", "voice", "meetings", "knowledge", "followups", "crm",
         "analytics", "agents", "settings"]
SIZES = [(1366, 768), (1920, 1080)]

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge")
    for w, h in SIZES:
        folder = OUT / f"{w}x{h}"
        folder.mkdir(parents=True, exist_ok=True)
        page = browser.new_page(viewport={"width": w, "height": h})
        page.on("console", lambda m, w=w: m.type == "error" and errors.append(f"[{w}] console: {m.text}"))
        page.on("pageerror", lambda e, w=w: errors.append(f"[{w}] pageerror: {e}"))

        page.goto(f"{BASE}/", wait_until="networkidle")
        page.wait_for_timeout(1500)  # spotlight / gradient fade-in
        page.screenshot(path=str(folder / "00-landing.png"), full_page=True)

        for i, v in enumerate(VIEWS, 1):
            page.goto(f"{BASE}/app/{v}", wait_until="networkidle")
            page.wait_for_timeout(700)
            page.screenshot(path=str(folder / f"{i:02d}-{v}.png"))

        # Lead detail: overview and timeline
        page.goto(f"{BASE}/app/leads", wait_until="networkidle")
        page.get_by_text("Sneha Kulkarni", exact=True).first.click()
        page.wait_for_timeout(600)
        page.screenshot(path=str(folder / "12-lead-detail.png"))
        page.get_by_role("button", name="Timeline", exact=True).click()
        page.wait_for_timeout(900)
        page.screenshot(path=str(folder / "13-lead-timeline.png"))

        # Dark mode
        page.goto(f"{BASE}/app/dashboard", wait_until="networkidle")
        page.get_by_role("button", name="Switch to dark mode").click()
        page.wait_for_timeout(500)
        page.screenshot(path=str(folder / "14-dashboard-dark.png"))
        page.get_by_role("button", name="Switch to light mode").click()
        page.close()
    browser.close()

# The landing page shows a real dashboard screenshot
public = pathlib.Path(__file__).parent.parent / "frontend" / "public" / "screenshots"
public.mkdir(parents=True, exist_ok=True)
shutil.copy(OUT / "1920x1080" / "01-dashboard.png", public / "dashboard.png")

print(f"saved {len(list(OUT.rglob('*.png')))} screenshots to {OUT}")
print("console errors:", *(errors or ["none"]), sep="\n  ")
