# Perspective 1.1 verification — November 1, 2026

Built from the completed Environment 1.0 source. Original ARENA 0.9 provenance
and previous test history remain in docs/TEST_REPORT-1.0.md.

Passed:
- Syntax checks for all active JavaScript modules.
- Campaign regression suite: backward compatibility, saved fields, initiative,
  HP/conditions, storage/broadcast, cloud snapshot ingestion and reload.
- Active HTML/module references and uploader version-path checks.
- Visual inspection of green Forest and orange/red/gold Autumn presets.
- Live DM preset changes and adding enemies synchronized to the stage.
- No error-level messages observed in the stage browser console.
- 24 responsive card-bound checks: five and seven combatants, each at 1536x960,
  1366x768, 1024x768 and 390x844, at center and both horizontal orbit limits.
  No card rectangles overlapped or left the viewport; no stage page scrolling.
  Raw results are in tests/layout-results-1.1.json. Tests used real-sized
  same-origin frames inside the browser, not physical mobile devices.
- Final perspective framing inspected at default and an oblique camera angle.

The dark UI remains; 3D environment materials now retain their colors. The
camera is perspective, not an orthographic view or CSS floor simulation.
Cards retain world anchors with screen-space clearance corrections for readability.
Terrain/particle/prop caps from 1.0 remain. FPS and GPU timing were not benchmarked.

Live Firebase service, Git push, Hosting deployment, physical WebGL context loss,
and very large encounters were not tested. No production files or cloud state
were changed. Optional deploy and Windows folder-prompt uploader are included.
