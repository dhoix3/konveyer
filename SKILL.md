# SKILL: Koveyer Dhoix’a — current contract

Run commands from repository `engine/`. Projects: `../projects/<id>/`; exports:
`../output/<id>/`. Node ≥22. Preserve working models/voices/Piper environments.
Do not reset user work, remove projects/outputs or claim a film from plan-only QA.

## Workflow

1. `node render.mjs doctor` — record missing components; --fix only detects/saves paths.
2. `new <id> --topic "…" --duration 45` (legacy), or --format fiction/documentary/
   reconstruction/series. 25–180s per film/episode; production form cast1–3.
3. Review project.json in editor (`ui`, default 127.0.0.1:7788) or as text. Historical
   research expands cast separately: new → research → timeline → qa --plan-only.
4. `voice <id>` / `voice <id> --audio file`; then `timeline <id>`. Never cut speech to
   force a target duration. Missing model/alignment is not successful inference.
5. Only when dependencies are ready: `all <id> --draft --concurrency 1`; inspect/listen
   to actual outputs, media QA and a range of frames before approving a video.
6. `subtitles`, `export --aspect 9:16`, `publish`; derivative plans/cache stay isolated.
7. `selfcheck` gathers evidence/ZIP. Incomplete environment -> exit1, complete=false,
   no fake PNGs. No automatic upload/install. Review private paths in logs before sharing.

No push/PR/merge unless separately authorized. Closing delivery: handoff/final/.

## Authoring / anatomy rules

- Reuse library IDs and solver; do not alter skeleton/bone lengths for a character.
  27 library characters share the skeleton, including child/elder/tall/stocky presets.
- Times are seconds or anchors `{line:"s03_a",off:1.2}`. Keep voice/text/claim semantics.
- Actors touch ground; seated props need seatH, held items need a prop/grip. Walk/run
  with physically plausible speed; no teleporting. World ground is y=800.
- Alternate wide/medium/close, vary movement/angles; no static shot >4s. Environment
  has ≥2 live details. Plan cadence is not a substitute for rendered freezedetect.
- Legacy «what if»: hook ≤15s, title, development/stakes/twist/climax/finale/question,
  second-person narration. Documentary/fiction formats use their own structure; do
  not force invented dramatic facts into a historical account.
- 39 environments: 19 general + 20 rus_*. New general mountain/sea/desert/space/lab/
  cave/medieval-town/forest sets are distinct, not aliases. 10 selectable styles,
  10 music moods; none is a switch, not an extra mood.
- Keep text readable (subtitle exporter checks speed/overflow); no claim of visual
  legibility without rendered review in all required aspect ratios.

## Storage, security, history

schemaVersion=2 migrates v1/missing-version additively; unknown future versions fail.
Atomic replacement + fsync, bounded project/plan preimage history (20 per type).
Editor has separate persisted undo/redo snapshots/revision checks; external locks
and stale writes must be respected. Seasonal journal/recover is not global ACID.

GUI default loopback; external bind requires configured bearer token, Host/Origin
checks. HTTP alone does not encrypt the token. Never put secrets into URLs/logs.
GUI history/QA/preview is not a multi-user cloud service; active jobs block edits.

## Knowledge and speech trust boundary

Rurikids knowledge: 25 claims, ALL needsReview=true. supported means attributed, not
independently verified. Review sources/editions/pages/dates; retain disputed status.
Research mode attaches scene/line claimIds, source register, era and graphical map/
timeline/tree. Claims QA is lexical/structural, not proof of truth/entailment.
Legacy brief materials remain compatible but are weaker; see docs/KNOWN_GAPS.md.

Whisper local ONNX word times -> aligned only when validated. No cache/mismatch ->
energy-estimated with warning. env.allowRemoteModels=false; no implicit ASR download.
RMS gates mouth amplitude; optional phonemes/visemes are not Piper phoneme inference.
ASR words must never replace authored documentary subtitle facts.

## Measurement and local LLM

`--profile <id>` samples real stills; --profile-all-frames is expensive. Video
pipeline profiles stage/scene wall time and slowestFrames, not every video capture.
Sampled process-tree RSS is not exact OS peak; don't sum nested stages. No measured
render -> estimate=null. Static-layer prerender is OFF (no golden equivalence).

llm-local is explicitly opt-in; default rules require no model. Loopback HTTP only,
strict dialogue JSON, bounded repair, immutable scene topology/voices/claims and QA.
Documentary: exact materials match and per-line verbatim allowlist; no novel facts.
Quality/meaning requires human review. No real model quality claim from stub tests.

References: docs/ARCHITECTURE.md, DOCUMENTARY.md, SCENE_EDITOR.md,
PROFILE_LOCAL_LLM_SELFCHECK.md, AUDIT_V2.md, KNOWN_GAPS.md and DIAGNOSTICS.md.

## Universal follow-up

See docs/UNIVERSAL.md for the new phase-by-phase status (separate from prior phases).
Phase0 uses semantic documentary selection, readable source/review captions and
geometry-tested composition. Do not claim network research, corpus or visual sign-off
from phase0. Keep anatomy, voice IDs, legacy CLI and cache/lock contracts intact.

Universal phase1 partial: `make "TOPIC" --id NEW_ID --voice none` creates an offline
outline (factual) or existing fiction draft (creative). Canonical --materials is JSON.
verified requires materials plus manual review; final/publish gate unreviewed claims.
Network research/live-check/corpus are not implemented. See docs/UNIVERSAL.md.
