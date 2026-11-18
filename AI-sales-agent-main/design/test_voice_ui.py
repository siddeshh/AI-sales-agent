"""Browser test of the Voice call page with simulated speech (real speech cannot run headless).

Needs backend on :8000 and the frontend dev server (default http://localhost:5174).
    backend/venv/Scripts/python design/test_voice_ui.py [base_url]
"""
import pathlib
import sys

from playwright.sync_api import expect, sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:5174"
SHOTS = pathlib.Path(__file__).parent / "screenshots"

FAKE_SPEECH = """
window.__spoken = []; window.__cancels = 0;
class FakeRec {
  constructor() { window.__rec = this; this.onresult = this.onerror = this.onend = null; }
  start() {} stop() {} abort() {}
}
window.webkitSpeechRecognition = FakeRec; window.SpeechRecognition = FakeRec;
const res = (text, isFinal) => ({ resultIndex: 0, results: [Object.assign({ 0: { transcript: text } }, { isFinal })] });
window.__interim = (t) => window.__rec.onresult(res(t, false));
window.__final = (t) => window.__rec.onresult(res(t, true));
const synth = { speaking: false, getVoices: () => [],
  speak(u) { this.speaking = true; window.__spoken.push(u.text); u.onstart && u.onstart(); },
  cancel() { if (this.speaking) window.__cancels++; this.speaking = false; } };
Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
"""
NO_SPEECH = "delete window.webkitSpeechRecognition; delete window.SpeechRecognition;"

errors = []
with sync_playwright() as p:
    browser = p.chromium.launch(channel="msedge")

    # 1. Simulated speech
    page = browser.new_page(viewport={"width": 1366, "height": 768})
    page.add_init_script(FAKE_SPEECH)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.goto(f"{BASE}/app/voice", wait_until="networkidle")
    expect(page.get_by_text("Uses browser speech recognition (Chrome)")).to_be_visible()
    page.locator("select").select_option(label="Karan Malhotra")
    page.get_by_role("button", name="Start call").click()
    expect(page.get_by_text("Listening…")).to_be_visible()
    page.wait_for_function("window.__spoken.length >= 1")
    assert "I'm an AI" in page.evaluate("window.__spoken[0]"), "intro must say it is an AI"

    page.evaluate("window.__final('What is the bulk price for 200 oversized tees?')")
    page.wait_for_function("window.__spoken.length >= 2", timeout=60000)
    expect(page.get_by_text("Knowledge Agent").last).to_be_visible()

    # Barge-in: an echo of our own words does not interrupt; new words do
    before = page.evaluate("window.__cancels")
    page.evaluate("window.__interim(window.__spoken[1].split(' ').slice(0, 4).join(' '))")
    assert page.evaluate("window.__cancels") == before, "echo of the assistant's own voice must not interrupt"
    page.evaluate("window.__interim('wait wait stop')")
    assert page.evaluate("window.__cancels") == before + 1, "new speech must stop playback"
    expect(page.get_by_text("Interrupted")).to_be_visible()

    page.evaluate("window.__final('That is too expensive')")
    page.wait_for_function("window.__spoken.length >= 3", timeout=60000)
    expect(page.get_by_text("Objection Agent").last).to_be_visible()
    page.screenshot(path=str(SHOTS / "1366x768" / "04-voice-call.png"))

    page.get_by_role("button", name="End call").click()
    expect(page.get_by_text("Summary by:")).to_be_visible(timeout=60000)
    assert page.locator("ol li").count() == 4, "summary must have 4 lines"
    page.screenshot(path=str(SHOTS / "1366x768" / "04b-voice-summary.png"))
    page.close()

    # 2. No speech recognition: text fallback
    page = browser.new_page(viewport={"width": 1366, "height": 768})
    page.add_init_script(NO_SPEECH)
    page.goto(f"{BASE}/app/voice", wait_until="networkidle")
    expect(page.get_by_text("This browser has no speech recognition")).to_be_visible()
    page.get_by_role("button", name="Start call").click()
    box = page.get_by_placeholder("Speech recognition is not available in this browser. Type what the customer says…")
    box.fill("Can we do a sample review call on Friday?")
    page.get_by_role("button", name="Send", exact=True).click()
    expect(page.get_by_text("Scheduling Agent").last).to_be_visible(timeout=60000)
    page.get_by_role("button", name="End call").click()
    expect(page.get_by_text("Summary by:")).to_be_visible(timeout=60000)
    page.close()
    browser.close()

print("page errors:", errors or "none")
print("PASS voice UI: intro, listening state, orchestrator replies, barge-in with echo guard, summary, text fallback")
