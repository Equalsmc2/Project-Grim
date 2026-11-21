"""Optional REAL browser smoke test for a computer with Playwright installed.

Run: python -m pip install playwright; python -m playwright install chromium
Then: npm run test:browser

Browser screenshots are written to qa-reports/browser locally. The tester starts a
local isolated website instance; it does not require Firebase or production logins.
"""
import os
import shutil
import socket
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'qa-reports' / 'browser'

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print('SKIP: Playwright is not installed. See instructions in tests/browser-smoke-151.py')
    sys.exit(2)

with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    PORT = sock.getsockname()[1]

server = subprocess.Popen(['node', 'server.js'], cwd=ROOT,
                          env={**os.environ, 'PORT': str(PORT)},
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
try:
    import urllib.request
    origin = f'http://127.0.0.1:{PORT}'
    for i in range(60):
        try:
            urllib.request.urlopen(origin+'/', timeout=1).close()
            break
        except Exception:
            time.sleep(.1)
    else:
        raise RuntimeError('Local test server did not respond')
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, executable_path=shutil.which('chromium') or shutil.which('google-chrome'), args=['--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        context = browser.new_context(viewport={'width': 1440, 'height': 900}, reduced_motion='reduce')
        stage = context.new_page()
        dm = context.new_page()
        errors = []
        for page in (stage,dm):
            page.on('pageerror', lambda err: errors.append(str(err)))
        try:
            stage.goto(origin+'/index.html', wait_until='domcontentloaded', timeout=20000)
        except Exception as error:
            if 'ERR_BLOCKED_BY_ADMINISTRATOR' in str(error):
                print('SKIP: browser policy blocks local website navigation; visual WebGL QA was not performed.')
                sys.exit(2)
            raise
        dm.goto(origin+'/dm.html', wait_until='domcontentloaded', timeout=20000)
        assert 'DESIGN REFINEMENT 1.5.8' in stage.locator('.build-chip').inner_text()
        assert 'DESIGN REFINEMENT 1.5.8' in dm.locator('.build-chip').inner_text()
        dm.locator('#liveCombatButton').click()
        stage.wait_for_function("document.getElementById('stageModeLabel')?.textContent==='COMBAT MODE'", timeout=10000)
        stage.screenshot(path=str(OUT/'stage-combat.png'))
        dm.locator('.nav-button[data-section="environment"]').click()
        dm.locator('select[data-env="preset"]').select_option(label='Blank test stage')
        dm.locator('select[data-env="preset"]').select_option(label='Forest')
        stage.wait_for_timeout(600)
        stage.screenshot(path=str(OUT/'stage-after-preset-switch.png'))
        dm.screenshot(path=str(OUT/'dm-environment.png'))
        assert not errors, f'Browser JS errors: {errors}'
        print('PASS: real browser stage + DM pages, cross-tab combat sync, repeated environment preset switching, screenshots.')
        print('Screenshots:', OUT)
        browser.close()
finally:
    server.terminate()
    try:
        server.wait(timeout=3)
    except subprocess.TimeoutExpired:
        server.kill()
