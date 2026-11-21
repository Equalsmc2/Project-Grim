# Project Grim 1.5.4 — DM Workflow Reliability

Built on 1.5.3; preserved the existing 3D battlefield, environment rendering, character cards, condition effects, initiative, audio, camera, no-login Firebase authentication and existing saved-campaign schema.

## DM prepared scenes

Environment → Prepared scenes now has **Export** and **Import** controls next to Save scene. Export downloads a JSON file of prepared environments and their scene labels. Import validates the format, asks for confirmation and merges the scenes, keeping the most recent 12. Combatants, HP, conditions, active turn, and current combat round are not imported or altered. This is **scene-only backup**, not a full campaign export.

Import rejects invalid JSON, mismatched schema, duplicate IDs, overlong files and more than 12 entries. Scene data passes through existing environment and scene normalization. Scene IDs are de-duplicated on ordinary saved-state loading as well, and malformed entries are excluded before the 12-scene limit is applied.

## Environment history

- Every **Apply prepared scene** action is a separate Undo step, even when several are clicked quickly.
- Continuous sliders are combined into a single Undo entry during a drag.
- Ambience track and volume edits participate in environment Undo/Redo.
- Snapshot Undo restores the scene ID and labels along with the environment, while preserving combat state and saved-snapshot collection.
- History is local to the DM tab and clears when a remote tab/cloud edit is applied, preventing stale Undo operations against remote changes.

## Cloud recovery

- The DM's Firebase writes are serialized, coalesced and retained after temporary write failures, with bounded exponential retry and automatic retry on browser online events. Permission denials pause automatic retries rather than hammering the server; click Publish after correcting rules.
- New DM edits made while an older write is in flight supersede the old queued revision.
- The DM does not apply incoming older cloud echoes over newer unsent local edits.
- A tiny per-room marker in browser localStorage records unsent DM revisions without duplicating the campaign. If the page reloads before a successful write, the DM keeps the local state and is prompted to **Publish** manually before applying the cloud room. This avoids accidental automatic overwrites after reconnection.
- The viewer remains read-only and continues using anonymous Firebase authentication. There is still **no login form**.

### Limitations

- Local recovery depends on the **same browser profile** retaining its localStorage campaign and pending marker. Clearing browsing data, switching browsers, or losing the device can remove it. Export prepared scenes periodically for an independent file backup.
- A manual Publish intentionally replaces the remote room with the local DM state. Check whether another DM browser published different changes before overriding the cloud room. Automatic multi-device conflict merging is not included.
- A failed write is retried while the tab is running; a refreshed tab with a pending marker pauses rather than publishing automatically.
- Automated tests include mocked Firebase and local HTTP checks, not live Firebase billing/rules/account connectivity. Real browser WebGL and FPS remain unverified in this environment.

## Running

Extract the ZIP; run `github.bat` and select the Project Grim Git repository. Confirm the DM and stage headers read **DM RELIABILITY 1.5.4**. `RUN-TESTS.bat` or `npm test` runs the Node regression suite and saves reports to `qa-reports/`.
