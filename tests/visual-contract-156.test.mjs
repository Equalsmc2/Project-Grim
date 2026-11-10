// Always-on, dependency-free verification for optional Chromium visual QA.
// Real screenshot comparisons live in tools/visual-regression.py (needs Playwright/Pillow).
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=path.join(root,'tests/visual-baselines');
const manifest=JSON.parse(readFileSync(path.join(baseline,'manifest.json'),'utf8'));
const cases=[
 ['dm-overview-desktop',1440,900],['dm-environment-tablet',768,860],
 ['dm-combat-mobile',390,844],['dm-music-desktop',1440,900],['dm-music-mobile',390,844],['stage-scene-desktop',1440,900],
 ['stage-combat-mobile',390,844],['card-finishes',1330,530]
];
assert.equal(manifest.release,'1.5.8');
assert.equal(Object.keys(manifest.cases).length,cases.length);
for(const [name,w,h] of cases){
 const record=manifest.cases[name];assert(record,`Missing visual fixture ${name}`);
 assert.equal(record.width,w);assert.equal(record.height,h);
 const bytes=readFileSync(path.join(baseline,record.file));
 assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a',`${name} baseline is PNG`);
 assert.equal(bytes.readUInt32BE(16),w,`${name} baseline width`);
 assert.equal(bytes.readUInt32BE(20),h,`${name} baseline height`);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,`${name} baseline unchanged`);
}
const visual=readFileSync(path.join(root,'tools/visual-regression.py'),'utf8');
for(const required of ['--update-baselines','--smoke','--self-test','compare_images','ImageChops.difference','ERR_BLOCKED_BY_ADMINISTRATOR']){
 // The last term should not be in the offline visual runner; it must be independent of navigation.
 if(required==='ERR_BLOCKED_BY_ADMINISTRATOR'){assert(!visual.includes(required));continue;}
 assert(visual.includes(required),`Missing visual check feature: ${required}`);
}
for(const entry of ['index.html','dm.html']){
 const html=readFileSync(path.join(root,entry),'utf8');
 assert(html.includes('DESIGN REFINEMENT 1.5.8'),`${entry} release badge`);
 assert(html.includes('assets/grim-158/'),`${entry} uses cache-safe assets`);
}
for(const file of ['github.bat','GITHUB-UPLOAD.bat']){
 const uploader=readFileSync(path.join(root,file),'utf8');
 for(const required of ['RUN-VISUAL-TESTS.bat','RELEASE_NOTES_1.5.8.md','TEST_REPORT_1.5.8.md','grim-158'])assert(uploader.includes(required),`${file} missing ${required}`);
}
const pkg=JSON.parse(readFileSync(path.join(root,'package.json'),'utf8'));
assert.equal(pkg.version,'1.5.8');assert(pkg.scripts['test:visual']);
assert(existsSync(path.join(root,'RUN-VISUAL-TESTS.bat')));
console.log('PASS: 8 pinned visual baselines, sizes, hashes, cache-safe entry points, comparison tool and distributable Windows runner.');
