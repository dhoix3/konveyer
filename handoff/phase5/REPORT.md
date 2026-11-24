# Mini-task + Phase 5

## Verified by execution

- New word alignment contract: local Whisper ONNX word timestamps are preserved,
  clip offsets rebased, manifest/plan/subtitle status `aligned`. Silence between
  aligned words gates the RMS mouth envelope. Missing/invalid/mismatched ASR gives
  explicit `energy-estimated` with an alignment-report.json. No invented end times.
- Tests inject deterministic Whisper results and verify exact timestamps, mismatch,
  missing-model fallback, offsets and mouth closure. **Not a real Whisper model run**:
  model cache is absent. Default transcription is local_files_only; no model download.
  A recognised ASR timestamp is not proof of factual/script correctness.
- 27 ready characters total, including 20 new ensemble presets; four body/age presets
  (child/elder/tall/compact), hair/headwear and historical clothing metadata. Same
  solver/bones/limits; sampled bone-length checks for all presets/actions pass.
- 10 additional historical environments (20 total), three depth layers with moving
  details; six-person shared-skeleton crowd in extended smoke. Wipe/iris transitions.
- 10 selectable colour styles (8 pre-existing FX grades plus two new grades), four
  new musical moods and three effects in mixer.py. NumPy **only in ignored sandbox
  test target**, no changes to user's Piper environment. Real synthesis probes:
  all three effects + 0.2s of each of four moods are finite (mixer.log).
- `smoke phase5-ensemble --extended --plan-only`: 18s, new environments, ages/crowd,
  grades/transitions; plan QA clean with explicit factual/audio/close-shot warnings.
- npm test and typecheck PASS; old production/GUI/FFmpeg regressions pass.

## Not verified

Chrome/Piper/Denis unavailable: no engine MP4, no human-viewed crowd, clothing,
parallax, transitions, composition or real TTS/Whisper inference. Short mixer probes
are not a mixed film or listening test. Background breathing/camera/environment
motion prevents authored freeze holds; rendered-frame freeze detection still
requires a real render. General AI factual verification is not supplied.

Windows (new id): `node .\render.mjs smoke win-ensemble-01 --extended`.
Without render dependencies: append `--plan-only`.
