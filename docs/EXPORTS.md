# Formats, publishing and Windows smoke

## Output formats

From `engine/`, with an existing authored project and voice manifest:

```sh
node render.mjs timeline my-film
node render.mjs export my-film --aspect 16:9
node render.mjs export my-film --aspect 9:16
node render.mjs export my-film --aspect 1:1
```

Without `--render`, export produces a separate plan, schematic SVG scene previews,
THUMBNAIL.svg, subtitles and PUBLISH.md. It does not claim to render video.
Plans live in projects/<id>/exports/{16x9,9x16,1x1}; publication packages in
output/<id>/<aspect>/publish. Root project/plan are not rewritten by export.

Add `--render --draft` for a real render, using existing prepared audio, Chrome,
Python/assets and FFmpeg. Run `voice <id>` first if needed. It does not implicitly
synthesise new speech. The ordinary `all <id> --aspect 9:16 --draft --concurrency 1`
pipeline can prepare audio as well; pass the same --aspect to subsequent
frame/scenes/render/final/qa/publish commands. Outputs of different formats do not
replace each other. Default commands without --aspect retain old paths.

`publish <id> [--aspect 9:16] [--draft]` rebuilds the publication package. If a
matching FINAL.mp4 (or DRAFT.mp4 with --draft) exists, FFmpeg extracts a real frame.
The cover selection is a deterministic scene heuristic (map/actors, not title),
not an AI judgement of visual quality. THUMBNAIL.svg embeds the frame and title.
Without video it is **explicitly schematic**. All *-SCHEMATIC.svg previews are
plan diagrams, not Chrome frames, and are labelled accordingly.

## Geometry contract

WORLD in types.ts is the legacy authoring coordinate space, not output size.
viewport.ts centralizes 16:9 (1920×1080), portrait (1080×1920), square (1080×1080).
Draft halves these sizes. Scene SVG uses aspect-derived view width; portrait
fallback focus follows the primary actor instead of the centre of the old world.
FX canvases scale to composition size; Film and Scene metadata take plan dimensions.
PoseSheet scales its design grid via viewBox. Documentary HUD reflows for portrait;
subtitles use composition-based font size and percentage bottom reserve. Safe zone:
8% sides/top, bottom 16% reserved. This is automatic primary-subject framing, not
multi-person intelligent reframing; visual inspection of all three formats remains
required. Changing dimensions invalidates scene cache. Changing WAV bytes invalidates
new audio-linked plans; rerun timeline rather than render stale lip envelopes.

## Windows: actual 18-second smoke

PowerShell, from engine (existing local Piper/Denis/Chrome are preserved):

```powershell
node .\render.mjs doctor --fix
node .\render.mjs smoke win-smoke-01
```

Creates a **new**, non-overwriting project, map + timeline + genealogical tree,
nominal 18 seconds, draft, CPU concurrency=1. Default uses local TTS. Measured
Piper duration can extend the estimate; inspect plan/QA after synthesis.
Expected file: `..\output\win-smoke-01\DRAFT.mp4`.

```powershell
# Portrait; unique id, separate outputs:
node .\render.mjs smoke win-smoke-vertical-01 --aspect 9:16
# Chrome available, but deliberately test without speech:
node .\render.mjs smoke win-smoke-silent-01 --voice none
# No rendering dependencies required; creates plan/publication/SRT only:
node .\render.mjs smoke win-smoke-plan-01 --plan-only
```

For portrait the MP4 is under output/<id>/9x16/DRAFT.mp4. Reusing an existing smoke
id is an error to preserve data. `--plan-only` reports estimated timing and does not
exercise Piper or Chrome. A missing dependency fails visibly; no substitute MP4
or false success is generated. Python/assets may still require numpy even in the
silent render mode. No models or preview WAVs belong in Git.
