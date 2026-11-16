import {chromium} from '@playwright/test';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {AVATAR_GROUPS,DEFAULT_AVATAR,renderAvatarSvg} from '../../assets/grim-158/avatar-art.js';

// Repeatable visual check: every layered part against the same facial anchors.
// These are real SVG shapes drawn by Project Grim, not mockup or generated images.
const parts=['hairBack','bangs','sides','eyes','iris','brows','face'];
const examples=parts.flatMap(part=>{
 const detail=AVATAR_GROUPS.flatMap(g=>g.parts).find(p=>p.key===part);
 return detail.choices.map((name,index)=>{
  const values={...DEFAULT_AVATAR,[part]:index};
  if(part==='hairBack')values.bangs=4;
  if(part==='sides')values.hairBack=2;
  if(part==='eyes'||part==='iris'||part==='brows')values.bangs=2;
  return {label:part+' / '+name,svg:renderAvatarSvg(values)};
 });
});
const cards=examples.map(x=>'<figure><div class="art">'+x.svg+'</div><figcaption>'+x.label+'</figcaption></figure>').join('');
const css='*{box-sizing:border-box}body{margin:0;background:#141414;color:#eee;font:13px system-ui,sans-serif;padding:18px}h1{font-size:20px;font-weight:700}p{color:#aaa;margin-top:0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px;max-width:1400px}figure{margin:0;background:#212121;border:1px solid #555;padding:7px;min-width:0}.art{background:#eee}.art svg{display:block;width:100%;height:auto}figcaption{font-size:12px;padding:7px 2px 2px;text-align:center;overflow-wrap:anywhere}';
const browser=await chromium.launch({headless:true});
const dir=resolve('artifacts');
mkdirSync(dir,{recursive:true});
try{
 for(const [name,width,height] of [['desktop',1440,900],['phone',390,844]]){
  const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  await page.setContent('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+css+'</style></head><body><h1>Project Grim / portrait geometry inspection</h1><p>Back hair, bangs, sides, eye shapes, irises, eyebrows, and face shapes.</p><div class="grid">'+cards+'</div></body></html>');
  const count=await page.locator('figure').count();
  const mismatch=await page.evaluate(()=>{
   const eyes=[...document.querySelectorAll('[id^="avatar-eye-"]')];
   const bad=eyes.filter(node=>!Number.isFinite(node.getBBox().width)||node.getBBox().width>60);
   return {bad:bad.length,width:document.documentElement.scrollWidth};
  });
  if(mismatch.bad||mismatch.width>width)throw new Error(name+' atlas geometry/overflow mismatch: '+JSON.stringify(mismatch));
  const outfile=resolve(dir,'avatar-atlas-'+name+'.png');
  await page.screenshot({path:outfile,fullPage:true});
  console.log(name+': '+count+' shape combinations, screenshot '+outfile);
  await page.close();
 }
}finally{await browser.close();}
