# SKILL: Koveyer Dhoix'a

Use this when asked to create a cinematic stickman "What If" video (idea → MP4) or to modify one.
Working directory for commands: `whatif-cine-studio/engine`. Outputs: `../output/<id>/FINAL.mp4`.

## Workflow

0. Optional: `node render.mjs ui` — local web form (topic, duration, language, voice, style, music) with stage buttons, live log and MP4 download; everything below works identically from the UI.
1. `node render.mjs doctor` — must be all ✔.
2. `node render.mjs idea --lang ru` — pick or invent a topic.
3. `node render.mjs new <id> --lang ru --duration 50 --characters 2 --music tense [--topic "…"]` — with `--topic` the story is generated around that topic (freeform, domain-aware); without it a template story is built. `--template auto|freeform|no_sleep|gravity|no_internet`.
4. Review/edit `projects/<id>/project.json` (see *Script format*). Keep the dramaturgy intact.
5. `node render.mjs voice <id>` (Piper TTS) or `voice <id> --audio narration.mp3` (user recording → Whisper → alignment).
6. `node render.mjs timeline <id>` — runs plan QA; fix every error it prints.
7. `node render.mjs scenes <id> --draft`, look at frames (`frame <id> --scene s03 --t 2`), then full quality `scenes <id>`.
8. `node render.mjs sound <id>` → `render <id>` → `final <id>` → `qa <id>`. Or `all <id>`.
9. Fix problems from `projects/<id>/qa_report.json` / `logs/*.log`, re-render only what changed: `scenes <id> --only s04`.

Never claim a result without running QA and looking at at least a few frames.

## Script format (project.json)

`scenes[]` — each scene: `env {id,time,weather}`, `light {key,x,y,color,rim,intensity,grade,flicker,pulse}`, `actors[] {char,x,facing,start,seatH}`, `beats[]`, `props[]`, `pstates[]`, `shotPlan[]` (or explicit `shots[]`), `lines[]`, `sfx[]`, `counter`, `ambience`, `musicLevel`, `silence`, `overlay`, `transition`, `minDur`.

* Times are seconds in the scene **or anchors** `{line:"s03_a", off:1.2}` (preferred — keeps action synced with speech).
* Environments: bedroom, kitchen, street, city, stadium, hospital, office, school, station, nature (+ void for titles).
* Actions (`beat.do`): idle walk run sit sit_up lie sleep stand_up wave point shrug facepalm cross_arms hands_up cower jump fall knock type drink look_phone think cheer reach clap stretch turn float carry slump.
  `walk/run/carry` need `to` (x) and optionally `dur`/`speed` (walk ≈ 270 px/s, run ≈ 650 px/s; QA rejects > 900 px/s).
  Sitting/lying on furniture needs `seatH` = surface height: bed 62, chair 80, sofa 72.
* Emotions: neutral happy sad angry surprised scared tired thinking smug panic. Looks: forward up down back camera `{x,y}` `{char}` `{prop}`.
* Props: bed chair desk table sofa door window phone cup laptop box suitcase lamp clock tv sign book flashlight ball letter trophy plant radio bat remote mic crate tablet.
  A prop rests `on` `"floor"` or another prop's id (e.g. cup `on: "table1"`). `on:"air"` needs `y` and `why` (e.g. zero gravity).
  Pick up: beat `{hold:{prop,hand:'r'}}`; release: `{hold:null, drop:{x,on}}`. Prop state animation: `pstates {t,prop,key:'open'|'on'|'ring',to,dur}` (doors open, screens switch off).
* Counters (`counter {label,from,to,format:int|time|percent|money|decimal,unit,danger}`) show progress.
* Voice ids: narrator, hero, friend, doc, boss, kid (see `src/lib/library.ts`). Text is `{ru,en}`.

## Art rules (do not break)

1. Hook in the first ≤ 15 s (scene 1 states the premise), then a cinematic title scene (`kind:"title"`).
2. Order: development → rising stakes → unexpected consequence → climax → emotional finale → question to the viewer (`overlay.type:"question"`).
3. Narration in second person ("Ты просыпаешься…"). No filler; every line must show/advance something.
4. Cast stays visually constant: reuse ids from the library; never invent limbs, never edit skeleton constants for one scene.
5. Alternate wide / medium / close shots; every shot moves; never hold a static frame > 4 s; vary angles (`angle: low|high`, `dutch`).
6. Every action in the script must be visible: the person who is "reaching for a cup" must have a cup prop and `hold`.
7. Nothing floats: props rest on surfaces, characters touch the ground (the solver does it — give correct `seatH`), no teleporting (use `walk/run` with a believable `dur`).
8. Each scene needs ≥ 2 live environment details (built into every environment) and light that changes (flicker/pulse/moving shaft).
9. Use silence deliberately (`silence:true`) before the twist or the finale.
10. Keep text within ~15 chars/s; 25–60 s total is the sweet spot for a 1080p test render on a small machine.

## Adding things

* **New action**: add a case in `src/char/track.ts` (`actionPose`) + name in `ActionName` (`lib/types.ts`) + `SHEET_ACTIONS` in `project/PoseSheet.tsx`. Render the pose sheet: `npx remotion still src/index.ts PoseSheet out.png --props='{"t":1.1}'` and verify anatomy.
* **New environment**: `reg({id,name,interior,live:[…≥2…],layers})` in `src/bg/envs.tsx`; add surfaces via props, ground is y = 800.
* **New prop**: entry in `PROPS` (`src/char/props.tsx`) with `top` (surface height) and `grip`.
* **New story template**: `TEMPLATES` in `tools/script.mjs` (use `opt` to mark droppable scenes, `needs` for required cast). Freeform topic stories come from `tools/story.mjs` (domain detection + scene pools) — extend `DOMAINS`/`EXTRAS` there for richer topics.
* **New SFX / music mood**: `tools/mixer.py` (`SFX`, `MOODS`).

## Failure handling

* `timeline` prints plan-QA errors (anatomy, contact, props, anchors). Fix the JSON and rerun.
* Render interrupted → rerun the same command; verified scenes are skipped.
* `qa` freeze/black warnings → add motion (camera move, actions) or shorten the scene.
* Check logs in `projects/<id>/logs/`. Use `DEBUG=1` for stack traces.

## Documentary rules v2

Для офлайн-истории сначала `new ... --format documentary --genre history`, затем
`research <id> --topic "Рюриковичи"`, timeline и qa --plan-only. Не выдавать
needsReview=true за фактологическую проверку, estimated за реальный WAV или
CONTACT_SHEET.svg за отрендеренные кадры. Описание: docs/DOCUMENTARY.md.

## Phases 3–4

Audio-linked timeline lines have speech envelope/wordTiming/optional timed visemes.
Do not call energy-estimated words ASR/forced alignment. WAV analysis fallback
is explicitly logged in plan.speechWarnings. Claims narration must not introduce
names/dates/numbers absent from full claim. `subtitles --strict` checks presentation.
`export --aspect` isolates derivatives; `smoke` is a non-overwriting Windows draft
check. Instructions and remaining visual checks: docs/EXPORTS.md.

## Phases 5–6

Keep skeleton.ts and anatomical rules unchanged. New ensemble styles/crowds and
layered environments are optional/additive. `smoke --extended` exercises new art.
Whisper uses local assets only; preserve timestamps as aligned, never label an
energy estimate aligned. Authored captions remain the source of documentary text.
Scene editor writes use project locks + revision checks + history snapshots; do
not bypass stale-edit errors or render documentary QA failures. UI RU/EN does not
translate claims. Resource estimates are heuristics, not hardware benchmarks.
See docs/SCENE_EDITOR.md and handoff/phase5/REPORT.md, phase6/REPORT.md.

## Phases 7–8

Profiling is measurement-only: distinguish still wall times, scene encode time,
slowest capture frames and sampled RSS. Never call sampled RSS an exact OS peak,
or extrapolate a measured final-video speed from estimated audio/still samples.
Do not enable static-layer prerender without real pixel-equivalence evidence.
llm-local defaults off; loopback HTTP only, strict JSON, bounded repairs, immutable
scene/voice roles and metadata. Documentary text must be verbatim assigned materials
or unchanged authored lines; lexical QA alone is not factual entailment. Preserve
rules mode without a model. selfcheck must zip incomplete diagnostics on missing
dependencies; no fake PNGs, auto-downloads/uploads or bundled private projects.
