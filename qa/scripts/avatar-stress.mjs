import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {DEFAULT_AVATAR,renderAvatarSvg} from '../../assets/grim-158/avatar-art.js';

// Deliberately awkward combinations drawn from the reported visual problems.
// Fixed recipes, so future revisions can be reviewed against the same cases.
const recipes=[
 ['Copper curls / eyepatch',{hairBack:6,bangs:1,sides:3,hairColor:4,skin:6,eyeColor:2,extras:5,outfit:3,outfitColor:3}],
 ['Brown curtain / scar',{hairBack:6,bangs:3,sides:5,hairColor:2,skin:3,eyeColor:2,extras:3,outfit:1,outfitColor:7}],
 ['Lilac choppy / slate',{hairBack:6,bangs:5,sides:3,hairColor:11,skin:7,eyeColor:3,extras:1,outfit:3,outfitColor:5}],
 ['Gold short / gray',{hairBack:6,bangs:9,sides:6,hairColor:5,skin:7,eyeColor:6,extras:4,outfit:0,outfitColor:5}],
 ['Blond braid / glasses',{hairBack:7,bangs:7,sides:2,hairColor:6,skin:1,eyeColor:0,extras:6,outfit:4,outfitColor:4}],
 ['White hair / slate face',{hairBack:6,bangs:6,sides:4,hairColor:7,skin:7,eyeColor:2,extras:4,outfit:3,outfitColor:7}],
 ['Plum braid / deep skin',{hairBack:7,bangs:3,sides:2,hairColor:11,skin:6,eyeColor:4,extras:3,outfit:1,outfitColor:0}],
 ['Brown long / dark skin',{hairBack:2,bangs:2,sides:2,hairColor:3,skin:4,eyeColor:2,extras:1,outfit:5,outfitColor:6}],
 ['Copper sweep / glasses',{hairBack:5,bangs:1,sides:1,hairColor:4,skin:0,eyeColor:5,extras:6,outfit:2,outfitColor:4}],
 ['Rose curtains / sleep',{hairBack:3,bangs:3,sides:3,hairColor:9,skin:2,eyes:4,iris:4,brows:4,outfit:6,outfitColor:3}],
 ['Bald / none',{hairBack:0,bangs:0,sides:0,skin:5,outfit:7,outfitColor:0}],
 ['Asymmetric navy',{hairBack:4,bangs:9,sides:4,hairColor:10,skin:3,eyes:3,iris:2,outfit:1,outfitColor:6}]
];
const cards=recipes.map(([name,recipe])=>'<figure><div class="picture">'+renderAvatarSvg({...DEFAULT_AVATAR,...recipe})+'</div><figcaption>'+name+'</figcaption></figure>').join('');
const styles='*{box-sizing:border-box}body{background:#111;color:#eee;margin:0;padding:18px;font-family:system-ui,sans-serif}h1{font-size:20px}p{color:#aaa;font-size:13px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;max-width:1450px}figure{margin:0;background:#212121;padding:10px;border:1px solid #555}.picture{background:#eee}.picture svg{width:100%;height:auto;display:block}figcaption{text-align:center;font-size:12px;margin-top:8px}';
const browser=await chromium.launch({headless:true});
const dir=resolve('artifacts');
mkdirSync(dir,{recursive:true});
try {
 for(const [device,width] of [['desktop',1440],['phone',390]]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+styles+'</style></head><body><h1>Project Grim / difficult portrait combinations</h1><p>12 original shape-only designs, including skin tones, eye accessories, bangs, and clothing.</p><main class="grid">'+cards+'</main></body></html>');
  const mismatch=await page.evaluate(()=>{
   const hair=[...document.querySelectorAll('[id="avatar-fringe"]')].map(n=>n.getBBox()).filter(b=>b.height>0&&b.y+b.height>167);
   return {badFringes:hair.length,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  if(mismatch.badFringes||mismatch.overflow)throw Error('Geometry mismatch '+device+': '+JSON.stringify(mismatch));
  await page.screenshot({path:resolve(dir,'avatar-stress-'+device+'.png'),fullPage:true});
  console.log('Passed 12 varied portrait checks:',device);
  await page.close();
 }
}finally{await browser.close();}
