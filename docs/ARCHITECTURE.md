# Architecture

## Data flow

```
idea.json ──► project.json ──► voice/manifest.json ──► plan.json + timeline.json
 (script.mjs)    (editable)       (voice.mjs)             (timeline.mjs)
                                                              │
                         ┌────────────────────────────────────┤
                         ▼                                    ▼
        Remotion `Scene` composition                 audio_plan.json (sound.mjs)
        (src/v2/SceneRenderer.tsx)                   → mixer.py → mix.wav → loudnorm −14 LUFS
        → output/<id>/scenes/sNN.mp4                          │
                         └────────── concat (copy) ───────────┤
                                                              ▼
                                         ffmpeg mux (H.264 + AAC) → FINAL.mp4 → qa
```

* `project.json` is the single editable source (script, cast, voices, shots hints, anchors).
* `plan.json` is the fully resolved artefact: numeric times, generated shots, scene frame ranges. Remotion, the sound planner and QA all read the same plan, and Node imports the very same TypeScript animation code (`src/char/track.ts`) that Remotion renders, so footsteps and QA match the picture exactly.

## Character system (`src/char`)

* `skeleton.ts` — `Pose` (rot, torso, head, 2 arms × (shoulder, elbow), 2 legs × (hip, knee, ankle), seat, lift, air). `solve()` does forward kinematics with fixed bone lengths and then the **ground-contact solver** (lowest point touches the support, or the hip is pinned to a seat height; `air` lifts for jumps/float). `fx ∈ [-1,1]` mirrors and *turns* the skeleton by scaling joint x-coordinates (front view in the middle of a turn).
* `track.ts` — action library (30 actions), locomotion driven by travelled distance (so feet never slide, steps are in phase), trapezoid velocity profile, pose blending with ease + overshoot, anticipation/settle in jumps, falls, drinks. `compileTrack(scene, charId)` returns `at(t)` → state, plus `footsteps()`.
* `emotions.ts` — expressions (eye openness, lid slant, squint, pupils, mouth), deterministic blinking.
* `Character.tsx` — SVG: black silhouette + coloured clothes, accessories, rim (contra) light, contact shadow, talking mouth.
* `props.tsx` — props with surface heights and hand grips.

## Camera (`src/cine/camera.ts`)

Shots → continuous state (centre, zoom, rotation). Focus follows the subject with a 0.5 s low-pass, clamps to the drawn world, supports push/pull/pan/dolly/crane/handheld (smooth value-noise, no jitter), low/high angle, dutch tilt, dip/fade cuts. Parallax: each environment layer has a depth; layer offset = `(cam − centre) × (1 − depth)`.

## Environments (`src/bg`)

10 reusable SVG environments with 3–6 parallax layers each; every one lists its living details (`live`) which QA verifies.

## Pipeline tooling (`engine/tools`)

`lib.mjs` (paths, state, logging, ffmpeg/ffprobe discovery, atomic JSON), `script.mjs` (ideas, templates, duration fitting), `story.mjs` (freeform topic → domain → story scenes; supports arbitrary topics alongside the classic templates), `voice.mjs` (Piper TTS, Whisper alignment, VAD fallback, clip cutting), `timeline.mjs`, `sound.mjs` + `mixer.py`, `qa.mjs`, `tts.py` + `textnorm.py` (RU/EN text normalisation for TTS), `gen_assets.py`, `ui.mjs` (local web UI).

## Web UI (`engine/tools/ui.mjs`)

Zero-dependency `node:http` server started with `node render.mjs ui [--port 7788]`. It serves one HTML page and a tiny JSON API (`/api/state`, `/api/create`, `/api/run`, `/api/stop`, `/api/log`, `/file`). Every run spawns the existing `render.mjs` CLI as a detached job writing into `projects/<id>/logs/` — project data stays on disk, so CLI and UI are interchangeable; the UI owns no pipeline logic.

## Known limits

* Story generation: freeform topics are handled by `tools/story.mjs` (12 detected domains with dedicated scene pools) and the 3 classic templates remain available via `--template`; `idea` output is still template-based. Add domains/pools in `story.mjs`, full templates in `tools/script.mjs`.
* Piper voices are synthetic; use `--audio` for human narration.
* 1080p SVG rendering is CPU-heavy (≈ 2–8 min per minute of video on 4 cores).
