# Architecture — final PR state

## Pipeline / boundaries

```text
script/story/production → project.json → voice manifest → timeline/plan.json
                                    ↘ research/knowledge/documentary ↗
plan → Remotion SceneRenderer → scene MP4 → concat → mux FINAL/DRAFT → media QA
plan → sound.mjs/mixer.py → mix.wav + loudnorm ────────────────────────↗
plan → subtitles/export/publishing
```

Project is editable truth; plan resolves numeric anchors, camera shots, frame
ranges, speech envelope/words and hashes. React/Remotion and Node QA share track/
skeleton/math code. Sharing code validates consistency, not visual quality.
Existing v1 project/plan JSON is read additively as schemaVersion2 (storage.mjs);
unknown future versions fail. Atomic per-file fsync/rename, 20 project/plan preimages,
locks/fingerprints/audio hashes. No blanket cache invalidation/data deletion.
Series uses staging+journal+recover and stale episode context guards, not global ACID.

## Drawing

src/char/skeleton.ts uses fixed bones/contact/seat handling; track.ts compiles
anchored action tracks, locomotion, blends and footstep events. Character.tsx draws
clothes/hair/headwear/emotions and audio-driven mouth. src/lib/library.ts: 27
shared-skeleton characters, 4 body-age presets. Crowd reuses the same renderer.

src/bg/envs.tsx: **39 sets (19 general including void, 20 historical)**, layered
parallax/deterministic live details; QA checks registered live-detail count, not the
actual perceptual motion in every rendered frame. camera.ts follows subjects and
supports dynamic shots/angles. No anatomical changes in diversity work.
src/fx/Fx.tsx: 10 grade implementations; script.mjs: 10 selectable styles (default
retains authored grading), 10 music moods. mixer.py supplies procedural music/SFX.

WORLD coordinates remain independent of viewport (viewport.ts). 16:9 / 9:16 / 1:1
exports have isolated plans/output and safe zones. Cover selection is deterministic;
publishing embeds a real frame only from available video, otherwise marked SVG
schematics. No proof of composition quality from SVG/JSON alone.

## Documentary and speech

knowledge/*.json → knowledge.mjs validatePack/research → documentary.mjs scenes and
SOURCES/storyboard → timeline → qaDocumentary. Map/timeline/tree graphics are
stylized, not photographic reconstruction. Research line claimIds, era/costume/
props, coverage, source/name/date checks are structural/lexical. All 25 bundled
claims need review; independent historical verification is outside this code.
Legacy production.brief materials are not automatically converted and have weaker
claims QA: see KNOWN_GAPS.md.

speech-analysis.mjs parses RIFF chunks and computes RMS/energy envelope. Validated
local Whisper timestamps retain aligned status; missing/invalid results use explicit
energy-estimated fallback. whisper.mjs globally disables remote model lookup.
Optional provided phoneme timing feeds visemes; no verified Piper phoneme extraction.
Subtitles retain authored text. Voice registry/prosody and audio/source hashes
participate in caching; no model files in Git.

## GUI / security

ui.mjs is a node:http server defaulting to **127.0.0.1**. Explicit external binding
requires token and Host/Origin validation; JSON has a bounded byte body. HTTP is not
TLS. Jobs invoke the same CLI, write ordinary logs, and block conflicting edits.
editor.mjs uses revisions/locks/history for scenes and undo/redo after restart.
editor-page.mjs is vanilla UI with RU/EN controls, QA, documentary claims wizard,
heuristic resource confirmation. Raw logs/source text are not translated. Preview
SVG is schematic; actual Chrome still jobs must match project/source metadata.

## Measurement / optional model / selfcheck

profile.mjs: stage wall times, scene render+encode times, slowest video capture
frames, separate sampled/all-frame still wall times; process maxRSS + sampled tree
RSS via ps/Windows CIM. Reports disclose missed short processes/shared pages/overhead.
No renderer optimization or static-layer prerender enabled; no equivalence goldens.

llm-local.mjs: opt-in Ollama/OpenAI loopback HTTP, JSON schema/validator, ≤2 repairs,
bounded response/timeout, preserved topology/roles/claims and QA/timing checks.
Documentary allowlist is verbatim per-line materials, not semantic trust in a model.
Rules remain the default. selfcheck.mjs packages versions/doctor/smoke/profile and
8 extracted real draft frames only if rendering succeeds; otherwise incomplete
ZIP/exit1. No automatic upload, install or synthetic substitute PNGs.

## Verification and limitations

Tests: engine/tests/; CI config: .github/workflows/ci.yml (actual
workflow filename). Final clean-checkout commands/logs: handoff/final/evidence/.
No fixed fps/RAM promises. Chrome/Piper/Whisper-model/LLM-model/Windows/GUI visuals
remain unverified here; authoritative gap list: KNOWN_GAPS.md.
