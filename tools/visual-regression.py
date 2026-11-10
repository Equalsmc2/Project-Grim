"""Project Grim deterministic browser screenshot regression checks.

Uses real Chromium layout and real canvas card-painting code, without network,
Firebase or a live WebGL context. NOT a replacement for full live-browser QA.

  python tools/visual-regression.py                   # compare to approved baselines
  python tools/visual-regression.py --update-baselines # explicitly approve new screenshots
  python tools/visual-regression.py --smoke            # screenshot + geometry checks only

Optional dependencies: playwright, Pillow, Chromium. Exit 2 = unavailable.
All captures and diffs are written to qa-reports/visual/ (gitignored).
"""
from __future__ import annotations
import argparse
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE = ROOT / 'tests' / 'visual-baselines'
OUT = ROOT / 'qa-reports' / 'visual'
ACTIVE = 'grim-158'
CSS_PATH = ROOT / 'assets' / ACTIVE / 'styles.css'
CARDS_PATH = ROOT / 'assets' / ACTIVE / 'native-cards.js'

try:
    from PIL import Image, ImageChops
    from playwright.sync_api import sync_playwright
except ImportError as error:
    print(f'SKIP: optional visual QA dependency unavailable: {error}')
    sys.exit(2)

CASES = [
    ('dm-overview-desktop', 'dm.html', 1440, 900, 'overview'),
    ('dm-environment-tablet', 'dm.html', 768, 860, 'environment'),
    ('dm-combat-mobile', 'dm.html', 390, 844, 'combat'),
    ('dm-music-desktop', 'dm.html', 1440, 900, 'music'),
    ('dm-music-mobile', 'dm.html', 390, 844, 'music'),
    ('stage-scene-desktop', 'index.html', 1440, 900, 'scene'),
    ('stage-combat-mobile', 'index.html', 390, 844, 'combat'),
    ('card-finishes', 'cards', 1330, 530, 'cards'),
]

PILLOW_THRESHOLD = 12  # ignore tiny per-channel font/antialias differences
MAX_CHANGED_FRACTION = .008
MAX_MEAN_ERROR = 1.4


def static_html(name: str) -> str:
    source = (ROOT / name).read_text(encoding='utf-8')
    css = CSS_PATH.read_text(encoding='utf-8')
    source = re.sub(r'<link[^>]+href="assets/' + ACTIVE + r'/styles.css"[^>]*>',
                    '<style>' + css + '</style>', source)
    source = re.sub(r'<script\s+type="module"\s+src="assets/' + ACTIVE + r'/[^\"]+"\s*></script>',
                    '', source)
    if f'assets/{ACTIVE}/styles.css' in source:
        raise AssertionError('CSS was not inlined: visual fixture depends on network')
    source = re.sub(r'<script[^>]+type="module"[^>]*>.*?</script>', '', source, flags=re.DOTALL)
    return source


def card_script() -> str:
    code = CARDS_PATH.read_text(encoding='utf-8')
    code = re.sub(r'^import .*?;\s*$', '', code, flags=re.MULTILINE)
    code = re.sub(r'\bexport (?=(?:function|const|class)\s)', '', code)
    return code + '\nwindow.GRIM_QA_CARDS={cardVisualData,paintCard,CARD_WIDTH_PX,CARD_HEIGHT_PX,TEXTURE_WIDTH,TEXTURE_HEIGHT};'


def paint_js() -> str:
    return r'''(count) => {
      const host = document.getElementById('grimFixtureCards');
      const list = [
        ['Healthy',40,[],true], ['Burning',32,['Burning'],false],
        ['Frozen',28,['Frozen'],false], ['Worn',21,[],false],
        ['Critical',4,[],false], ['Shattered',0,[],false]
      ].slice(0,count);
      host.textContent='';
      for(let i=0;i<list.length;i++){
        const [label,hp,conditions,active]=list[i];
        const frame=document.createElement('div');frame.className='qa-finish';
        const canvas=document.createElement('canvas');
        canvas.width=GRIM_QA_CARDS.TEXTURE_WIDTH;canvas.height=GRIM_QA_CARDS.TEXTURE_HEIGHT;
        const data=GRIM_QA_CARDS.cardVisualData({id:'qa-card-'+i,name:label==='Shattered'?'Fallen Hero':'Seren Voss',className:'Champion',ancestry:'Human',level:5,hp,maxHp:40,ac:23,initiative:19,conditions,symbol:'✦'}, {side:i===5?'enemy':'player',active,rank:i+1}, true);
        const ctx=canvas.getContext('2d');
        ctx.setTransform(canvas.width/GRIM_QA_CARDS.CARD_WIDTH_PX,0,0,canvas.height/GRIM_QA_CARDS.CARD_HEIGHT_PX,0,0);
        GRIM_QA_CARDS.paintCard(ctx,data,null,650);
        const caption=document.createElement('span');caption.textContent=label;
        frame.append(canvas,caption);host.append(frame);
      }
      return host.children.length;
    }'''


def create_card_fixture(page, count: int, stage: bool = False):
    page.add_script_tag(content=card_script())
    if stage:
        page.evaluate(r'''() => {
          const main=document.querySelector('.stage-main');
          const root=document.createElement('div');root.id='grimFixtureCards';
          root.className='qa-stage-cards';main.append(root);
          const css=document.createElement('style');css.textContent=`
            .qa-stage-cards {position:absolute;inset:25% 8% 23%;display:flex;align-items:center;justify-content:space-evenly;z-index:11;pointer-events:none;gap:5px}
            .qa-stage-cards .qa-finish{width:min(22%,125px);display:flex;flex-direction:column;align-items:center;gap:4px;color:#c2c8c8;font:9px monospace}
            .qa-stage-cards canvas{display:block;width:100%;height:auto;filter:drop-shadow(0 8px 10px #0008)}
            .qa-stage-cards span{display:none}
          `;document.head.append(css);
        }''')
    else:
        page.set_content('''<!doctype html><html><head><style>
          *{box-sizing:border-box}html,body{margin:0;background:#090c0e;color:#d4dcde;font-family:system-ui,sans-serif}
          h1{font-size:19px;font-weight:650;margin:28px 30px 6px}p{font-size:12px;color:#8b999e;margin:0 30px 16px}
          #grimFixtureCards{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;padding:8px 24px}
          .qa-finish{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;font:12px monospace;color:#afbbbc}
          canvas{width:100%;max-width:154px;height:auto;filter:drop-shadow(0 12px 12px #000b)}
        </style></head><body><h1>Grim / Card materials</h1><p>Deterministic artwork sample — not a WebGL lighting or shader test</p><div id="grimFixtureCards"></div></body></html>''')
        page.add_script_tag(content=card_script())
    result=page.evaluate(paint_js(), count)
    if result != count:
        raise AssertionError(f'Card painter output wrong count: {result} != {count}')


def activate_dm(page, section: str):
    page.evaluate('''(section) => {
      for(const el of document.querySelectorAll('.dm-section')){
        el.classList.toggle('active',el.dataset.section===section);
      }
      for(const el of document.querySelectorAll('.nav-button[data-section]')){
        el.classList.toggle('active',el.dataset.section===section);
      }
      const title={overview:'Overview',environment:'Environment',combat:'Combat control',music:'Music library'};
      const header=document.querySelector('#pageTitle');if(header)header.textContent=title[section]||section;
      // Populate sections whose rows are normally rendered by DM JavaScript.
      // These are deterministic visual fixtures, NOT a simulated Firebase session.
      if(section==='overview'){
        document.querySelector('#metrics').innerHTML=[['STAGE','SCENE','Scene or combat'],['COMBATANTS','6','4 players · 2 enemies'],['COMBAT ROUND','3','Active: Seren Voss'],['WOUNDED','2','Below maximum HP']].map(([label,value,detail])=>`<div class="metric"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`).join('');
        document.querySelector('#overviewSceneTitle').textContent='Training Grid';
        document.querySelector('#overviewSceneDesc').textContent='Neutral environment for checking your layout and camera.';
        document.querySelector('#overviewEnvironment').innerHTML=[['GROUND','Stone / Flat'],['WEATHER','Rain'],['TIME','18:00'],['MUSIC','Playing']].map(([label,value])=>`<div class="overview-environment-item"><small>${label}</small><strong>${value}</strong></div>`).join('');
        document.querySelector('#activityLog').innerHTML='<div class="activity"><time>19:06</time><span>Environment changed</span></div><div class="activity"><time>19:03</time><span>Turn advanced</span></div>';
      }
      if(section==='environment'){
        document.querySelector('#environmentEditor').innerHTML=`
          <div class="grim-scene-snapshots"><div class="grim-snap-head"><div><strong>Prepared scenes</strong><p class="helper">Save terrain, weather, lighting, ambience and scene labels.</p></div><span>2 / 12</span></div>
            <div class="grim-snap-save"><input aria-label="Scene name" placeholder="Scene name"><button class="button button-secondary">Save scene</button><button class="button button-secondary">Export</button><button class="button button-secondary">Import</button></div>
            <div class="grim-snap-list"><div class="grim-snap-row"><strong>Forest / Dusk</strong><button class="button button-secondary">Apply</button></div><div class="grim-snap-row"><strong>Ruins / Blizzard</strong><button class="button button-secondary">Apply</button></div></div>
            <div class="grim-env-history"><button class="button button-secondary">Undo</button><button class="button button-secondary">Redo</button></div>
          </div>
          <div class="environment-toolbar"><label class="field"><span>Environment preset</span><select><option>Forest</option></select></label><button class="button button-secondary">Regenerate seed</button><button class="button button-secondary">Clear props</button></div>
          <div class="grim-atmosphere-panel"><div class="panel-header"><div><span class="eyebrow">LIVE LIGHTING / SKY</span><h3>Living atmosphere</h3></div><span class="atmosphere-clock">18:00</span></div>
            <div class="atmosphere-presets"><button class="button button-secondary">Clear Day</button><button class="button button-secondary">Golden Dusk</button><button class="button button-secondary">Moonlit Night</button><button class="button button-secondary">Overcast</button></div>
            <div class="environment-grid atmosphere-controls"><label class="field"><span>Time of day</span><input type="range" value="75"></label><label class="field"><span>Cloud coverage</span><input type="range" value="45"></label><label class="field"><span>Weather</span><select><option>Rain</option></select></label><label class="field"><span>Fog</span><input type="range" value="25"></label></div>
          </div>
          <div class="grim-ambience-panel"><div class="grim-ambience-heading"><div><span class="eyebrow">STAGE AUDIO</span><h3>Ambience</h3></div></div><div class="grim-ambience-controls"><label class="field"><span>Stage ambience</span><select><option>Gentle rain</option></select></label><label class="field"><span>Volume</span><input type="range" value="55"></label><button class="button button-secondary">Preview</button></div></div>`;
      }
      if(section==='music'){
        const labels=[['All tracks','230'],['Dark Souls','23'],['Elden Ring','67'],['Ocarina of Time','86'],["Majora's Mask",'54'],['Exploration','31'],['Sanctuaries & Towns','23'],['Combat','14'],['Boss Encounters','57'],['Tension & Horror','24'],['Favorites','0']];
        const folderHost=document.querySelector('#musicFolders');
        labels.forEach(([name,count],i)=>{
          if([0,5,10].includes(i)){const h=document.createElement('div');h.className='music-group-label';h.textContent=i===0?'LIBRARY':i===5?'BY SCENE':'PERSONAL';folderHost.append(h);}
          const b=document.createElement('button');b.className='music-folder'+(i===1?' selected':'');b.innerHTML='<span></span><small></small>';b.querySelector('span').textContent=name;b.querySelector('small').textContent=count;folderHost.append(b);
        });
        const trackList=document.querySelector('#musicTracks');
        const titles=['Prologue','Firelink Shrine','Taurus Demon','Bell Gargoyle','Pinwheel','Gaping Dragon','Chaos Witch Quelaag','Daughters of Chaos','Iron Golem','Ornstein & Smough'];
        titles.forEach((title,i)=>{
           const row=document.createElement('div');row.className='music-track'+(i===1?' now':'');
           const play=document.createElement('button');play.className='music-track-play';
           const num=document.createElement('span');num.className='music-track-no';num.textContent=String(i+1).padStart(2,'0');
           const info=document.createElement('span');info.className='music-track-info';
           const strong=document.createElement('strong');strong.textContent=title;
           const small=document.createElement('small');small.textContent='Dark Souls · '+(i<2?'sanctuary':'bosses');
           info.append(strong,small);play.append(num,info);row.append(play);
           const time=document.createElement('span');time.className='music-track-time';time.textContent=(2+i%5)+':36';row.append(time);
           const preview=document.createElement('button');preview.className='music-track-action';preview.textContent='▶';row.append(preview);
           const fav=document.createElement('button');fav.className='music-track-action';fav.textContent='☆';row.append(fav);
           trackList.append(row);
        });
        document.querySelector('#musicFolderTitle').textContent='Dark Souls';
        document.querySelector('#musicCount').textContent='23 tracks';
        document.querySelector('#musicNowTitle').textContent='Firelink Shrine';
        document.querySelector('#musicNowAlbum').textContent='Dark Souls';
        document.querySelector('#musicNowTime').textContent='1:16 / 2:56';
        document.querySelector('#musicProgress').value=422;
      }
      if(section==='combat'){
        document.querySelector('#dmRound').textContent='3';
        document.querySelector('#dmTurn').textContent='Seren Voss';
        document.querySelector('#rosterCounts').textContent='2 players · 2 enemies';
        document.querySelector('#combatRows').innerHTML=['Seren Voss','Grave Knight','Mara','Frost Ghoul'].map((name,i)=>`
          <div class="combat-row ${i===0?'active':''}"><div class="initiative-number">${21-i*4}</div><div class="character-caption"><strong>${name}</strong><small>${i%2?'◆ ENEMY':'● PLAYER'}</small></div><div class="tiny-stat">AC <b>${18+i}</b></div><div><div class="hp-meta"><span>HP</span><span>${32-i*7}/40</span></div><div class="hp-progress"><i style="width:${80-i*17}%"></i></div></div><div class="condition-tags"><span class="cond-tag">${i===1?'Burning':i===3?'Frozen':'—'}</span></div><button class="select-button">Select</button></div>`).join('');
      }
    }''', section)


def activate_stage(page, section: str):
    if section == 'combat':
        page.evaluate('''() => {
          document.querySelector('.stage-app').classList.remove('scene-mode');
          document.querySelector('#sceneInfo').hidden=true;
          document.querySelector('#combatInfo').hidden=false;
          document.querySelector('#stageModeLabel').textContent='COMBAT MODE';
          document.querySelector('#roundDisplay').textContent='3';
          document.querySelector('#turnDisplay').textContent="Seren Voss's turn";
        }''')
        create_card_fixture(page, 3, stage=True)


def geometry_checks(page, name, width, section):
    measured = page.evaluate('''() => {
      const bounds=sel=>{const x=document.querySelector(sel);if(!x)return null;
        const c=x.getBoundingClientRect();return {x:c.x,y:c.y,width:c.width,height:c.height,right:c.right,bottom:c.bottom};};
      return {viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
        sidebar:bounds('.dm-sidebar'),topbar:bounds('.dm-topbar'),
        camera:bounds('.view-controls'),audio:bounds('.grim-stage-audio'),
        cardHost:bounds('#grimFixtureCards'), main:bounds('.stage-main')};
    }''')
    if measured['scrollWidth'] > width + 1:
        raise AssertionError(f'{name}: unexpected horizontal page overflow ({measured["scrollWidth"]} > {width})')
    for k in ('camera','audio','topbar'):
        b=measured[k]
        if b and (b['x'] < -1 or b['right'] > width + 1):
            raise AssertionError(f'{name}: {k} outside viewport: {b}')
    if section == 'combat' and name.startswith('stage'):
        if not measured['cardHost'] or measured['cardHost']['width'] < 30:
            raise AssertionError('Stage card painter missing card fixture')
    a,b=measured['camera'],measured['audio']
    if a and b:
        if min(a['right'],b['right'])>max(a['x'],b['x'])+2 and min(a['bottom'],b['bottom'])>max(a['y'],b['y'])+2:
            raise AssertionError(f'{name}: camera and audio controls overlap')
    return measured


def compare_images(a: Path, b: Path, diff: Path):
    with Image.open(a) as actual0, Image.open(b) as baseline0:
        actual=actual0.convert('RGB'); baseline=baseline0.convert('RGB')
    if actual.size != baseline.size:
        return False, f'image dimensions changed: {actual.size} vs {baseline.size}'
    difference=ImageChops.difference(actual,baseline)
    pixels=list(difference.get_flattened_data() if hasattr(difference, "get_flattened_data") else difference.getdata());n=len(pixels)
    changed=sum(max(px)>PILLOW_THRESHOLD for px in pixels)
    absolute=sum(sum(px) for px in pixels)
    fraction=changed/n;mean=absolute/(n*3)
    if fraction>MAX_CHANGED_FRACTION or mean>MAX_MEAN_ERROR:
        diff.parent.mkdir(parents=True,exist_ok=True)
        difference.point(lambda v:min(255,v*4)).save(diff)
        return False, f'changed-pixel share {fraction:.2%}, mean-channel error {mean:.2f}; diff {diff}'
    return True, f'changed-pixel share {fraction:.2%}, mean-channel error {mean:.2f}'


def run(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    group=p.add_mutually_exclusive_group()
    group.add_argument('--update-baselines',action='store_true',help='explicitly accept current screenshots as reference')
    group.add_argument('--smoke',action='store_true',help='capture/check geometry without comparing approved screenshots')
    group.add_argument('--self-test',action='store_true',help='verify that the image comparison detects a deliberately modified fixture')
    args=p.parse_args(argv)
    OUT.mkdir(parents=True,exist_ok=True)
    if args.self_test:
        source=Image.new('RGB',(64,64),'#111111');changed=source.copy()
        from PIL import ImageDraw
        ImageDraw.Draw(changed).rectangle((10,10,53,53),fill='#ffffff')
        test_dir=OUT/'self-test';test_dir.mkdir(parents=True,exist_ok=True)
        source.save(test_dir/'approved.png');changed.save(test_dir/'changed.png')
        ok,reason=compare_images(test_dir/'changed.png',test_dir/'approved.png',test_dir/'diff.png')
        if ok or not (test_dir/'diff.png').exists():
            print('FAIL: comparison did not detect an obvious visual regression');return 1
        print('PASS: pixel comparator rejects changed output and produces an inspection diff: '+reason)
        return 0
    if args.update_baselines:BASE.mkdir(parents=True,exist_ok=True)
    exe = shutil.which('chromium') or shutil.which('google-chrome') or shutil.which('chromium-browser')
    errors=[];manifest={'release':'1.5.8','cases':{}}
    with sync_playwright() as pw:
        options={'headless':True,'args':['--no-sandbox','--disable-gpu','--force-device-scale-factor=1']}
        if exe:options['executable_path']=exe
        try:browser=pw.chromium.launch(**options)
        except Exception as err:
            print('SKIP: browser unavailable:',str(err).splitlines()[0]);return 2
        manifest['chromium']=browser.version
        for name,document,width,height,section in CASES:
            page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1,reduced_motion='reduce',locale='en-US')
            try:
                if document!='cards':
                    page.set_content(static_html(document),wait_until='domcontentloaded')
                    if document=='dm.html':activate_dm(page,section)
                    else:activate_stage(page,section)
                else:create_card_fixture(page,6)
                page.evaluate('''() => {document.documentElement.style.scrollBehavior='auto';
                  const s=document.createElement('style');s.textContent='*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important}';document.head.append(s)}''')
                page.evaluate('document.fonts.ready')
                # fixed explicit viewport screenshot; avoids huge long-scroll output
                shot=OUT/(name+'.png');page.screenshot(path=str(shot),full_page=False,animations='disabled')
                geometry=geometry_checks(page,name,width,section)
                manifest['cases'][name]={'width':width,'height':height,'file':name+'.png','sha256':hashlib.sha256(shot.read_bytes()).hexdigest(),'scrollWidth':geometry['scrollWidth']}
                approved=BASE/(name+'.png')
                if args.update_baselines:
                    shutil.copy2(shot,approved)
                    print('BASELINE',name, f'{width}x{height}')
                elif args.smoke:
                    print('PASS',name,'geometry and captured screenshot')
                elif not approved.exists():
                    errors.append(f'{name}: baseline missing; use --update-baselines after review')
                    print('FAIL',name,'baseline missing')
                else:
                    ok,reason=compare_images(shot,approved,OUT/'diffs'/(name+'-diff.png'))
                    print('PASS' if ok else 'FAIL',name,reason)
                    if not ok:errors.append(f'{name}: {reason}')
            except Exception as err:
                errors.append(f'{name}: {err}')
                print('FAIL',name,str(err).splitlines()[0])
            finally:page.close()
        browser.close()
    if args.update_baselines:
        (BASE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (OUT/'last-run.json').write_text(json.dumps({**manifest,'mode':'update' if args.update_baselines else 'smoke' if args.smoke else 'compare','errors':errors},indent=2)+'\n')
    if errors:
        print(f'FAIL: {len(errors)} visual issues; results in {OUT}')
        return 1
    print(f'PASS: {len(CASES)} visual fixture screenshots and viewport contract checks (static/layout; not full 3D WebGL)')
    return 0

if __name__=='__main__':sys.exit(run())
