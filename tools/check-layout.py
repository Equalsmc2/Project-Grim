"""Optional Chromium static-layout check for Grim, no server or Firebase needed.

    python -m pip install playwright
    python -m playwright install chromium
    python tools/check-layout.py

Checks the shipped HTML/CSS at phone, tablet, and desktop widths, including
horizontal overflow and collisions between the stage's camera and audio UI.
This does not replace the full live WebGL browser smoke test.
"""
from pathlib import Path
import os
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent
CSS = (ROOT / 'assets/grim-156/styles.css').read_text(encoding='utf-8')

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print('SKIP: Install Playwright to run optional layout checks.')
    sys.exit(2)

EXE = (os.environ.get('GRIM_CHROMIUM_PATH') or shutil.which('chromium')
       or shutil.which('google-chrome') or shutil.which('chromium-browser'))

def static_html(page):
    html = (ROOT / page).read_text(encoding='utf-8')
    html = html.replace('<link rel="stylesheet" href="assets/grim-156/styles.css">',
                        '<style>' + CSS + '</style>')
    html = html.replace('<script type="module" src="assets/grim-156/dm.js"></script>', '')
    html = html.replace('<script type="module" src="assets/grim-156/stage.js"></script>', '')
    return html

with sync_playwright() as pw:
    try:
        options = {'headless': True, 'args': ['--no-sandbox']}
        if EXE:
            options['executable_path'] = EXE
        browser = pw.chromium.launch(**options)
    except Exception as error:
        print('SKIP: Chromium unavailable:', str(error).splitlines()[0])
        sys.exit(2)
    errors = []
    for name in ('dm.html', 'index.html'):
        markup = static_html(name)
        for width, height in ((360, 700), (390, 844), (560, 800), (768, 860),
                              (900, 760), (1024, 768), (1366, 768)):
            page = browser.new_page(viewport={'width': width, 'height': height})
            page.set_content(markup, wait_until='domcontentloaded')
            measured = page.evaluate('''() => {
              const box = selector => {
                const e=document.querySelector(selector);
                if(!e) return null;
                const r=e.getBoundingClientRect();
                return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width};
              };
              return {scrollWidth:document.documentElement.scrollWidth,
                controls:box('.view-controls'),sound:box('.grim-stage-audio'),
                sidebar:box('.dm-sidebar'),topbar:box('.dm-topbar')};
            }''')
            if measured['scrollWidth'] > width + 1:
                errors.append(f'{name} {width}: horizontal document overflow {measured["scrollWidth"]} > {width}')
            for label in ('controls', 'topbar'):
                item = measured[label]
                if item and (item['left'] < -1 or item['right'] > width + 1 or item['width'] < 30):
                    errors.append(f'{name} {width}: {label} outside viewport: {item}')
            if measured['controls'] and measured['sound']:
                a, b = measured['controls'], measured['sound']
                overlap = min(a['right'],b['right']) > max(a['left'],b['left']) + 2 and min(a['bottom'],b['bottom']) > max(a['top'],b['top']) + 2
                if overlap:errors.append(f'{name} {width}: sound and view controls overlap')
            if name == 'dm.html' and width <= 780 and measured['topbar'] and measured['sidebar']:
                if measured['topbar']['left'] > 1 or measured['topbar']['top'] < measured['sidebar']['bottom']-1:
                    errors.append(f'{name} {width}: DM editor is beside/under sidebar incorrectly')
            print('PASS' if not errors else 'CHECK', name, f'{width}×{height}',
                  'document width', measured['scrollWidth'])
            page.close()
    browser.close()
    if errors:
        for error in errors:print('FAIL:', error)
        sys.exit(1)
    print('PASS: 14 static CSS/HTML viewport checks (no browser-server navigation required).')
