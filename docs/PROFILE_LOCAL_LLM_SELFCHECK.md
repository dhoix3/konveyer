# Measurements, local provider, Windows selfcheck

## Phase 7: no speculative optimization

From engine (use a disposable project or a comparison copy):

```powershell
node .\render.mjs --profile my-film
node .\render.mjs --profile my-film --profile-all-frames
node .\render.mjs all my-film --draft --concurrency 1 --profile
node .\render.mjs scenes my-film --draft --concurrency 1 --force --profile
```

The first two commands build a temporary estimated-speech plan without saving the
project/timeline or synthesizing voice. They measure 3 stratified **real PNG stills
per scene** (first/middle/last), or every frame with --profile-all-frames. Half-size
(draft) scale, one renderer; the report identifies this context. This is wall time
including still setup/capture/IO, **not** the per-frame cost inside renderMedia.
All-frame still profiling is slow and stores PNGs; opt in deliberately.

The pipeline --profile flag leaves cache decisions and rendering quality unchanged.
Per-stage elapsed wall time and scene render+encode wall time are recorded; cached
scenes are not invented as zero-cost measurements. For actual video capture, the
installed renderer exposes only **slowestFrames** (frame/time in ms), which are
retained as a separate timing basis. Full per-frame records are available via the
all-frame still command, not falsely reconstructed from progress callbacks.

Reports: output/<id>/profile/<timestamp>/profile.json and WHERE-TIME-GOES.md. Rows
include failed stages/frames. Node peak RSS comes from resourceUsage (process
lifetime); process-tree RSS is sampled every 750 ms via ps / PowerShell CIM. It is
NOT a guaranteed OS peak: short-lived processes can be missed, synchronous child
work blocks timer callbacks, shared pages/monitor process can inflate the sum.
Permissions/CIM failures appear as samplingError, never as zero RAM consumption.
This adds measurement overhead, especially Windows CIM; compare like with like.

Render time for the film is extrapolated only from successful measured frames or
actual scene renders. Context includes scale, hardware, source hash and timing
basis. An absent measurement -> null estimate, not a hardware promise. The sample
estimate excludes unmeasured TTS/mixing/encoding; the all pipeline records those
actual stages separately. Nested wall stages overlap: do not add root all/smoke
and their children. A cached run is not a cold-render benchmark.

**No static-layer prerender exists or is enabled.** --prerender-static is rejected
rather than silently accepted. Chrome is unavailable here; no reference-frame
pixel-tolerance comparison has passed. No optimization was made from these data.

## Phase 8: llm-local, explicitly off by default

Without --provider llm-local the existing rules operate exactly as before. Merely
setting an endpoint/model does not enable AI. No model/library installation, cloud
provider, paid API, auto discovery, API key or fallback network call is used.

```powershell
# Ollama already installed/running locally; model must already exist locally
node .\render.mjs new ai-draft --topic "Робот помогает человеку" --duration 90 --provider llm-local --llm-model my-local-model
# OpenAI-compatible local server; endpoint is the BASE URL including /v1
node .\render.mjs llm my-film --provider llm-local --llm-model my-local-model --llm-api openai --llm-endpoint http://127.0.0.1:8080/v1
# Researched documentary: explicit canonical materials file matching its project
node .\render.mjs llm historical-film --provider llm-local --llm-model my-local-model --materials C:\materials\materials.json
```

Only HTTP loopback hosts (127.0.0.1 / localhost / ::1) are accepted; redirects,
credentials, query strings and nonlocal URLs rejected. No auth headers are sent.
Each request has a 60s timeout and a 1 MiB response cap. Ollama /api/chat and OpenAI
/chat/completions with strict json_schema are supported. An existing local server
may itself have network features; configure it offline separately.

Schema: engine/schemas/llm-dialogue.schema.json. Validator enforces its supported
contract, rejects extra properties, and then applies stricter project checks.
The adapter is intentionally a **dialogue-only provider over a rule-generated
skeleton**, not a free-form topology/camera/role/fact generator. Ordered scenes,
line count, IDs, voices/roles and all non-dialogue metadata remain immutable.
Structural/anatomical/claims QA runs on a temporary buildPlan, plus an upper timing
bound. The pipeline still never cuts speech to force duration.

A maximum of 2 repair requests (3 attempts total) includes validator errors. Invalid
JSON, role changes, oversized timing and QA errors fail visibly without replacing
an existing project. Successful existing-project edits save history/pre-llm-*.json
as an additional archival copy; atomic writing also saves ordinary project-*.json
preimages. The history/restore CLI lists/restores those ordinary snapshots (not
the separately named pre-llm files); editor undo is separate. New output carries
needsReview=true. Meaning/style cannot be proved by a schema: human review remains
required, especially fiction dialogue edits.

Documentary/reconstruction (including the older production.brief format) requires
an explicit materials file whose claims/sources match the saved project. Models
cannot change those arrays. To rule out new facts without pretending lexical QA
proves entailment, text is limited to unchanged authored lines or **verbatim text/
narration from that line's assigned materials claims**. Unsupported paraphrases are
rejected. All claim IDs/status/source/date metadata remains immutable; existing
claims QA runs as well. Legacy brief scenes without per-line claim IDs can only
retain their authored text. Use research/editor to revise evidence first. No facts
are obtained from model knowledge, and no facts are silently truncated.

Tests use an in-process loopback HTTP stub; there is no real local model test or
model-quality claim. Tests cover Ollama/OpenAI schema, repair, malformed JSON,
HTTP/redirect failures, immutable roles/topology, duration, modern+legacy materials,
CLI successful history write and failure preserving saved content. Default rules
creation is tested with no endpoint.

## Windows selfcheck

```powershell
cd engine
node .\render.mjs selfcheck
# diagnostic/plan-only run when dependencies are not yet available:
node .\render.mjs selfcheck --plan-only
```

Creates a unique output/selfcheck-<date>-<suffix>/ folder and an adjacent ZIP.
Includes Node/Chrome/Piper/FFmpeg versions or exact failures, doctor.log, smoke.log,
profile timing reports, QA/plan if available and **8 PNGs extracted from a successful
real DRAFT.mp4**. Does not bundle all user projects, models, voices, MP4s, environment
variables, credentials or install anything. ZIP is standard UTF-8 STORE with CRC32,
no external archiver needed (128 MiB safety limit). No automatic upload. Review logs
for private paths/text before sharing the ZIP.

The diagnostic uses new project IDs, retains output, forces offline model/browser
resolution for children. If doctor fails, it runs an explicit plan-only smoke and
sets complete=false, exit 1, frames=[]; it does not generate substitute visual PNGs.
A successful selfcheck returns exit 0 only with healthy doctor, successful draft and
8 extracted frames. Errors do not prevent bundling the available diagnostics.
Windows execution/Chrome still timings/Piper speech/real-model generation and
visual/listening review are not verified by the Linux sandbox run.
