# Scene editor / documentary wizard (phase 6)

Start from engine: `node render.mjs ui --port 7788`, open http://127.0.0.1:7788.
The existing localhost/token/Host/Origin/byte-limit boundary covers all new routes.
Create/select a project, then use the Scene editor panel below the existing UI.

## Editing

Select a scene; edit dialogue (one entry per existing line), minimum duration,
environment, cast (Ctrl multi-select), camera shot/movement/zoom and transition.
Save writes project.json atomically and stores an editor snapshot under history/.
Speech is never cut to fit a shorter scene. Regenerate voice and timeline after
editing. Derived/cached plans are not silently treated as current.

Revision hashes prevent stale browser writes (409). Active UI jobs or external
project locks prevent editing. Undo/redo uses editor-history.json plus history/
editor-UUID.json snapshots and survives server restart. Up to 50 steps each are
referenced. Normal project/plan history and CLI restore remain separate and work
as before. After an external/manual change, reload; divergent undo is rejected,
not forced over that change. Snapshot files are not automatically destroyed.

Structural errors (unknown environment/actor, invalid camera/range) are rejected.
A structurally valid draft with documentary QA errors may be saved for correction:
red/amber marks appear in the scene list, details beside the selected scene.
The GUI refuses a render with QA errors. needsReview warnings do not claim source
verification. Normal legacy projects, modes and CLI remain available.

## Frame preview

- SVG schematic: immediate plan diagram, **not a rendered frame**.
- Chrome frame: saves no guessed MP4. Launches a separate `preview` job for the
  saved scene (estimated timings, no synthesis); inspect the ordinary job log,
  then click Open completed frame. Metadata must match current project revision.
- Missing Chrome/assets/numpy fails visibly in that job. A stale or nonexistent
  PNG is never substituted for a current frame.
- CLI: `node render.mjs preview <id> --scene s01 --t 1`.

## Documentary wizard

1. Create/select the target project. Enter topic and film duration (25–180 s).
2. Paste a full knowledge JSON package, or leave empty and load the bundled offline
   topic (Рюриковичи / Rurikids). No network lookup or fabricated fallback facts.
3. Load claims table; edit full text, narration, date+precision, place, status,
   source IDs, confidence and needsReview. Claim IDs stay stable. Add/remove claims
   and edit bibliographic entries via package JSON, then reload the table.
4. Preview script and QA **without changing the saved project**.
5. Save documentary script; this is undoable and regenerates SOURCES/storyboard.
6. Render after review/explicit save. Editing topic/materials requires reloading
   the table; changing content/duration requires saving again before wizard render.

Long material sets may require epoch episodes: existing `research` CLI performs
that split. The wizard does not silently discard facts or shorten speech to force
an oversized pack into 25 seconds; use a longer target or an epoch package.

## Language and estimates

RU/EN switch localizes editor/wizard and core legacy form/stage labels. Authored
script text, canonical bibliography, enum IDs and raw technical QA/log diagnostics
are not machine-translated or rewritten. Language of interface is independent of
language of the film. No automatic translation of historical facts is attempted.

Before launch, the GUI asks confirmation with estimated time/memory. Values are
broad CPU/concurrency=1 heuristics, **not measurements on the user's i3**. Available
server memory is included in the estimate API. No automatic concurrency increase.

## HTTP contract

GET /api/editor/catalog, /api/editor?id=, /api/editor/estimate?id=,
/api/editor/knowledge?topic=, /api/editor/frame?id=&scene= (schematic; actual=1 for PNG).
POST /api/editor/edit, /api/editor/history, /api/editor/documentary and
/api/editor/frame accept JSON; mutating edits require id+revision. All paths are
server-selected, no arbitrary output paths/commands in request bodies.

Validated in tests/editor.mjs using a real HTTP server, including restart/undo,
lock and revision conflicts, malicious field/path inputs and render rejection.
**No browser visual/usability approval is claimed without Chrome.**
