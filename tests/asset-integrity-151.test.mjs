import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync,statSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const active=path.join(root,'assets','grim-158');
const htmls=['index.html','dm.html'];
const importRe=/\b(?:from\s*|import\s*\()\s*['"](\.[^'"?]+)['"]/g;
const failures=[],visited=new Set();let links=0;
function check(file){
 if(!existsSync(file)){failures.push(`Missing: ${path.relative(root,file)}`);return;}
 if(visited.has(file))return;
 visited.add(file);
 const data=readFileSync(file,'utf8');
 if(file.endsWith('.js')||file.endsWith('.mjs')){
   for(const found of data.matchAll(importRe)){
     const relative=found[1];
     const candidate=path.resolve(path.dirname(file),relative);
     if(!candidate.startsWith(root+path.sep)){failures.push(`Import escapes site: ${relative}`);continue;}
     links++;
     check(candidate);
   }
 }
}
for(const name of htmls){
 const content=readFileSync(path.join(root,name),'utf8');
 for(const m of content.matchAll(/\b(?:src|href)="([^"]+)"/g)){
  if(m[1].startsWith('#')||m[1].startsWith('https:')||m[1].startsWith('data:'))continue;
  const dest=path.resolve(root,m[1].split('?')[0]);
  if(!dest.startsWith(root+path.sep)){failures.push(`Page link escapes site: ${m[1]}`);continue;}
  assert(existsSync(dest),`Missing link in ${name}: ${m[1]}`);
  if(dest.endsWith('.js'))check(dest);
 }
 assert(content.includes('grim-158/'),`${name} must use the cache-distinct active bundle`);
 assert(content.includes('DESIGN REFINEMENT 1.5.8'),`${name} must show the active release label`);
}
for(const f of ['state.js','world.js','native-cards.js','camera-frame.js','camera-guard.js','card-framing.js','graphics-quality.js','environment-editor.js','environment-history.js','scene-backup.js','cloud-outbox.js'])check(path.join(active,f));
for(const name of ['wind','storm','desert','blizzard','rain']){
 const file=path.join(root,'assets','audio',`${name}.mp3`);
 assert(existsSync(file)&&statSync(file).size>10000,`Missing or empty ambience audio: ${name}`);
}
assert(['audio','grim-158','music'].every(name=>readdirSync(path.join(root,'assets')).includes(name)),'Required current asset directories are present');
assert([...visited].every(file=>file.startsWith(active+path.sep)),'Active website imports must not depend on historical bundles');
for(const f of ['github.bat','GITHUB-UPLOAD.bat']){
 const bat=readFileSync(path.join(root,f),'utf8');
 assert(bat.includes('assets\\grim-158\\state.js') && bat.includes('set /p "REPO_INPUT='),`${f} must have path prompt and validate the active bundle`);
}
assert.equal(failures.length,0,failures.join('\n'));
console.log(`PASS: both pages, ${visited.size} linked JavaScript modules, ${links} relative imports, five MP3s and uploader path validation.`);
