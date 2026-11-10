// Project Grim 1.5.8 design contract — no invented decoration or wasted UI.
// These assertions protect the user's stable UX rules without modifying gameplay.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(path.join(root,p),'utf8');
const dm=read('dm.html'),stage=read('index.html'),css=read('assets/grim-158/styles.css');
const src=read('assets/grim-158/dm.js');
for(const entry of [dm,stage]){
 assert(entry.includes('DESIGN REFINEMENT 1.5.8'),'Active release should be identifiable');
 assert(entry.includes('assets/grim-158/'),'Uses cache-distinct latest source');
 assert(!/UI TEST|UI PROTOTYPE|TEST PREVIEW|MISSION CONTROL AT A GLANCE|DARK UI TEST/i.test(entry),'Reject decorative placeholder/prototype copy');
 assert(!/type=["']password["']|Sign in with email|Create account/i.test(entry),'No DM login screen');
}
assert(dm.includes('id="overviewEnvironment"')&&src.includes('overviewEnvironment'),'Overview presents real environment state');
assert(!dm.includes('4 monochrome layouts'),'Remove redundant count from scene selection');
assert(!dm.includes('230 TRACKS · 4 GAMES'),'Track count is already available in music library');
assert(!dm.includes('Perspective 1.1'),'No outdated sidebar build filler');
assert(dm.includes('data-goto="environment"'),'Environment can be reached directly from Overview');
assert(dm.includes('id="musicTracks"')&&dm.includes('id="musicFolders"')&&dm.includes('id="musicSearch"'),'Music library remains navigable');
assert(dm.includes('id="forcePublish"')&&dm.includes('id="copyFirebaseRules"'),'No-login secure cloud controls preserved');
assert(stage.includes('data-camera-view="ground"')&&stage.includes('id="autoPanToggle"'),'Ground-first camera and manual pan maintained');
for(const id of ['cardPositions','worldCanvas','stageQuality','stageMotion','stageSoundToggle'])assert(stage.includes(`id="${id}"`),`Preserve ${id}`);
assert(css.includes('background:#050505')&&css.includes('--panel:#0e0e0e'),'Keep dark monochrome testing theme');
assert(css.includes('overflow-y:auto')&&css.includes('.dm-section[data-section=music] .music-workspace'),'Track list gets useful height with internal scroll');
assert(css.includes('.overview-environment-grid')&&css.includes('.overview-environment-item'),'Functional environmental status replaces fake preview');
assert(css.includes('@media (max-width:780px), (max-height:620px)'),'Small/short screens must scroll rather than clip important controls');
console.log('PASS: no redundant prototype labels, meaningful overview data, low-scroll layout, dark canvas, no-login workflow and stage controls.');
