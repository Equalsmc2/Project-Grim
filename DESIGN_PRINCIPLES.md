# Project Grim — Design Contract

A practical reference for all future updates. **Every visible element should help someone use the site or make the world feel materially coherent.** Do not add filler copy, decorative metrics, fake technical labels, huge arbitrary numerals, or ornamental accents that do not serve the user's actual campaign workflow.

## Permanent constraints

1. **Dark, monochrome foundation** until the DM chooses the final visual theme. Use high-contrast black, charcoal, and restrained white. No unrelated gold, color splashes, or artificial visual noise.
2. **Even use of space.** Distribute functional panels evenly and give the important stage, cards, and controls the most room. Avoid empty 3D margins and unused giant dashboard regions. Remove placeholder panels instead of inventing content to fill them.
3. **Minimize scrolling** on a normal desktop viewport. Prefer an app-height workspace with scroll confined to long lists (tracks, roster, editor fields). On mobile/short screens, allow natural page scroll to preserve access—never hide required actions just to claim the page does not scroll.
4. **Stage and DM are separate experiences.** Keep a simple Scene mode and Combat mode, with an independently navigable DM page. No terminal window or email/password login. Existing anonymous Firebase sync and local fallback must remain intact.
5. **Camera grounded in the world.** Ground is the default; Tactical and Top remain available. Enemy cards above player cards, globally initiative sorted from left to right. Every visible card must fit the viewport; no extreme pullback or cut-off cards. World anchors and 3D depth occlusion must remain correct.
6. **Cards are physical 3D objects**, preserving readable HP, AC, initiative, portraits, enemy/player distinction and status conditions. Burning/Frozen are visible, damage progression is deterministic, and zero HP shatter has sane animation/memory cost. Normal cards should be clean, restrained and matte; avoid hazy full-face glossy overlays.
7. **3D environments are systemic rather than decorative.** Terrain, weather, time, clouds, fog, wind, props and ambient audio should relate coherently. Do not fabricate visuals or loading/sync states.
8. **Music is a separate DM-organized library** grouped by game and practical scene use. Audio library controls should remain searchable, compact and readable. Commercial soundtrack recordings are not put in public hosting by default.
9. **All changes should be safe for a campaign.** Preserve save compatibility, prepared scenes, Undo/Redo, no-login sync, sound gating, keyboard controls, reduced-motion support, and the GitHub path-prompt BAT uploader.
10. **Proof before claims.** Automated tests may prove code, calculations and static layouts; do not represent them as verified live WebGL FPS or Firebase connectivity. Re-run real layout screenshots when styling changes and review the results before updating reference images.

## Implementation hierarchy

Before adding a section: identify the actual user decision it supports. Before adding text: remove it if the adjacent control/heading already communicates the same thing. Before adding animation: test whether it remains necessary during a long session. Before adding graphics: confirm they do not hide combat stats or harm performance.

These are project requirements, not text to display as decorative UI.
