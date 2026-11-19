import {test,expect} from '../qa/fixtures.mjs';

test('DM makes a layered shape portrait and it syncs to the player sheet',async({page,context})=>{
 await page.goto('/dm.html');
 await page.locator('#dmNav [data-section="cast"]').click();
 await page.getByRole('button',{name:'+ Add player'}).click();
 await page.locator('#castEditor [data-edit="name"]').fill('Kestrel Vale');
 await page.locator('#openShapeCreator').click();
 const maker=page.getByRole('dialog',{name:'Make Kestrel Vale'});
 await expect(maker).toBeVisible();
 await expect(maker.locator('#grimMakerPortrait svg')).toBeVisible();
 await expect(maker.getByRole('button',{name:'Back hair',exact:true})).toBeVisible();
 await maker.getByRole('button',{name:'Back hair',exact:true}).click();
 await expect(maker.locator('[data-choice]')).toHaveCount(10);
 await expect(maker.locator('.grim-maker-thumb svg').first()).toHaveAttribute('viewBox','25 54 190 253');
 await maker.getByRole('button',{name:'Back hair: Long waves'}).click();
 await maker.getByRole('button',{name:'Fringe / bangs',exact:true}).click();
 await maker.getByRole('button',{name:'Fringe / bangs: Choppy'}).click();
 await maker.getByRole('tab',{name:'Eyes',exact:true}).click();
 await maker.getByRole('button',{name:'Eye shape',exact:true}).click();
 await expect(maker.locator('[data-choice]')).toHaveCount(8);
 await expect(maker.locator('.grim-maker-thumb svg').first()).toHaveAttribute('viewBox','48 105 144 192');
 await maker.getByRole('button',{name:'Eye shape: Sharp'}).click();
 await maker.getByRole('button',{name:'Iris style',exact:true}).click();
 await maker.getByRole('button',{name:'Iris style: Shimmer'}).click();
 await test.info().attach('avatar-studio-desktop',{body:await page.screenshot(),contentType:'image/png'});
 await maker.getByRole('button',{name:'Save portrait'}).click();
 await expect(maker).toHaveCount(0);
 // Stage-compatible PNG portraits are saved to the shared campaign state.
 const picture=page.locator('#castLiveArt img');
 await expect(picture).toBeVisible();
 await expect(picture).toHaveAttribute('src',/^data:image\/png;base64,/);
 const player=await context.newPage();
 await player.goto('/player.html');
 await player.getByRole('button',{name:'Select Kestrel Vale'}).click();
 await expect(player.locator('.player-hero-art img')).toHaveAttribute('src',/^data:image\/png;base64,/);
 await player.close();
});

test('saved portraits refresh to the improved shapes without a new upload',async({page})=>{
 await page.goto('/player.html');
 await page.evaluate(async()=>{
  const {updateState}=await import('/assets/grim-158/state.js');
  const {encodeAvatar,DEFAULT_AVATAR}=await import('/assets/grim-158/avatar-art.js');
  updateState(state=>{
   const c=state.characters[0];
   c.avatar=encodeAvatar(DEFAULT_AVATAR);
   c.portraitAvatar=c.avatar;
   c.portraitArtVersion=1;
   c.portrait='data:image/png;base64,OLDSTYLE';
  },'Legacy portrait style fixture');
 });
 await page.reload();
 await expect.poll(()=>page.evaluate(async()=>{
  const {getState}=await import('/assets/grim-158/state.js');
  const c=getState().characters[0];
  return {version:c.portraitArtVersion,redrawn:c.portrait.startsWith('data:image/png;base64,')&&!c.portrait.includes('OLDSTYLE'),recipeKept:c.portraitAvatar===c.avatar};
 })).toEqual({version:6,redrawn:true,recipeKept:true});
});

test('player can make and revise portraits on a narrow touch screen',async({page,context})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('/player.html');
 const make=page.getByRole('button',{name:'Make a portrait for this character'});
 await expect(make).toBeVisible();
 await make.click();
 const maker=page.getByRole('dialog');
 await expect(maker).toBeVisible();
 await expect(maker.locator('#grimMakerPortrait svg')).toBeVisible();
 await maker.getByRole('tab',{name:'Hair',exact:true}).click();
 await maker.getByRole('button',{name:'Side strands',exact:true}).click();
 await maker.getByRole('button',{name:'Side strands: Braided'}).click();
 await maker.getByRole('tab',{name:'Eyes',exact:true}).click();
 await maker.getByRole('button',{name:'Eyebrows',exact:true}).click();
 await maker.getByRole('button',{name:'Eyebrows: Arched'}).click();
 const sizes=await page.evaluate(()=>{
  const dialog=document.querySelector('.grim-maker-dialog');
  const save=dialog.querySelector('[data-action="save"]');
  return {viewport:innerWidth,scroll:document.documentElement.scrollWidth,dialog:dialog.getBoundingClientRect().width,save:save.getBoundingClientRect().height,thumbs:dialog.querySelectorAll('.grim-maker-option').length};
 });
 expect(sizes.scroll).toBeLessThanOrEqual(sizes.viewport);
 expect(sizes.dialog).toBeLessThanOrEqual(sizes.viewport);
 expect(sizes.save).toBeGreaterThanOrEqual(44);
 expect(sizes.thumbs).toBeGreaterThanOrEqual(8);
 await test.info().attach('avatar-studio-mobile',{body:await page.screenshot(),contentType:'image/png'});
 await maker.getByRole('button',{name:'Save portrait'}).click();
 await expect(maker).toHaveCount(0);
 await expect(page.locator('.player-hero-art img')).toHaveAttribute('src',/^data:image\/png;base64,/);
 await page.reload();
 await expect(page.locator('.player-hero-art img')).toHaveAttribute('src',/^data:image\/png;base64,/);
 await page.setViewportSize({width:320,height:720});
 await page.getByRole('button',{name:'Make a portrait for this character'}).click();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
