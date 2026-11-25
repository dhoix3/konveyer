# PR draft: offline-first authoring, documentary pipeline, editor and diagnostics

## Summary

Backward-compatible extension of the existing Node/Remotion/Python pipeline. No
rewrite, model/media payloads or user-data cleanup. Rules remain default; local
LLM explicitly opt-in. This PR description is a **draft**: no PR/push was performed.

## Changes by phase

- **0:** source audit, EOL policy, Linux CI configuration and baseline checks.
- **1:** loopback GUI security, bounded byte input, additive schema migration,
  atomic/history storage, locks/fingerprints, season journal/recovery, path doctor.
- **2:** offline knowledge/research, claim/source/era QA, epoch splitting,
  stylized historical map/timeline/genealogy. Rurikids25 claims: ALL needsReview.
- **3:** RMS speech envelope/word alignment statuses/local-only Whisper, authored
  captions, voice registry/prosody/textnorm and SRT/VTT/ASS.
- **4:** isolated 16:9/9:16/1:1 viewport/export and publishing/safe-zone artifacts.
- **5:**27 shared-skeleton characters/4 body-age presets/crowd;39 environments
  (19 general+20 historical),10 styles/10 music moods, transitions/SFX; anatomy unchanged.
- **6:** revision/lock-safe GUI scene editing, persisted undo/redo, QA, documentary
  claims wizard, RU/EN controls and heuristic preflight estimates.
- **7:** actual measurement tooling (stages/scenes/still samples/slow video frames,
  sampled RSS/estimate/time report). **No static-layer prerender enabled.**
- **8:** optional loopback Ollama/OpenAI dialogue JSON, schema/repair/timing/role/
  claim constraints; documentary per-line verbatim materials boundary.
- **Selfcheck:** versions/doctor/smoke/profile and8 real draft PNGs when available,
  or an honest incomplete ZIP without substitute images.
- **Closure:** current documentation, full phase0–8 audit/KNOWN_GAPS, clean-checkout
  evidence, hygiene checks, Windows APPLY, snapshot/checksums and ordered patch stack.

## Verification

Exact HEAD: FINAL_HEAD.txt; environment/results: evidence/summary.json, COMMANDS.md.
A clean clone of that HEAD runs npm ci (ONNXRUNTIME_NODE_INSTALL=skip), npm test,
typecheck, each Node syntax check and Python py_compile. CLI in order: unchanged
old what-if fixture; fiction; two series episodes; Rurikids120s new→research→
timeline→qa; extended smoke --plan-only; selfcheck. Expected selfcheck exit1:
Chrome/Piper missing, complete=false, ZIP generated, no PNGs. The initial harness
override mistake and failed test are retained in preliminary-evidence, not hidden.

Signature/path audit: evidence/RISK_SCAN.json, including nested tracked ZIPs;
no models/piper-env/MP4/credential signatures found in delivered tree. This is not
proof against all possible secret encodings; review diffs manually too.

## Explicitly not verified / limitations

- **No visual results claimed:** no real render/frame/MP4/media QA/visual GUI review
  from this environment. No Piper/Denis listening, Whisper inference or real LLM.
- No execution on Windows11/Node26/i3/8GB; CI remote run not performed without push.
- **Sources need human review:** every bundled claim needsReview=true, including
  supported-attributed claims. Bibliography/editions/pages not independently checked.
- Research lines have known claim IDs, but lexical QA is not semantic entailment.
  Legacy documentary brief has weaker evidence/claim guarantees; see G4.
- Profile still wall-time ≠ full video capture; only slowest video frames reported.
  Process-tree RSS is sampled, not guaranteed exact peak; ETA unknown without render.
- **Static prerender OFF/unimplemented:** no golden pixel-equivalence evidence.
- Local model provider is dialogue-only, not arbitrary topology/role generation.
- SVG storyboard/cover is schematic unless a genuine matching video frame exists.

Full per-criterion statuses and recommendations: docs/AUDIT_V2.md, KNOWN_GAPS.md.

## Review checklist

- [ ] Review base→HEAD diff and CI configuration; run remote checks after authorization.
- [ ] Confirm legacy JSON migration/no changed project/output/model/voice payloads.
- [ ] Review GUI token/Host/Origin/body/path security and local endpoint restrictions.
- [ ] Check history/lock/recovery behavior and explicit failures; no global ACID claims.
- [ ] Verify documentary sources/disputes/needsReview and legacy parity limitation.
- [ ] Run Windows selfcheck; inspect8 real frames, captions, map/tree/aspect layouts.
- [ ] Listen to Denis/Piper, test Whisper/local model only with existing local assets.
- [ ] Review measured speed/RAM on target i3, not guessed throughput.
- [ ] Keep static prerender disabled until tolerance-based reference tests exist.
- [ ] Inspect snapshot/patch SHA256 and secret scan; do not publish private logs blindly.

## History

No history rewrite. Suggested descriptive groups: checkpoint0–4; Whisper safeguards;
phase5 diversity/correction; phase6 editor; phase7/8+selfcheck; documentation closure.
Preserve commits for review; any eventual merge squash is a separate maintainer decision.
