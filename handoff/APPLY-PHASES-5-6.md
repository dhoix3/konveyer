# Applying the portable phases 5–6 result

No push was performed. Current branch remains arena/348fe030-konveyer.

On a clean copy containing the accepted phase-4 files:

```sh
git am /path/to/handoff/phase5/patches/*.patch
git am /path/to/handoff/phase6/patches/*.patch
cd engine
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm test
npm run typecheck
```

PowerShell npm setup: `$env:ONNXRUNTIME_NODE_INSTALL='skip'` before npm ci.
On a completely clean original 21cfec9 tree ONLY, first apply
bootstrap/accepted-phases-0-4.patch. Do NOT bootstrap an already accepted/modified
working tree. That optional checkpoint exists because Arena restored file changes
but did not retain earlier local commit objects; no resets/deletions were used.

Each phase has REPORT.md, CHANGED_FILES.txt, patches/ and SHA256SUMS. The full
patch sequence was applied in a temporary Git index and its resulting tracked tree
was compared with HEAD: identical. Use a clean comparison copy; never blindly
apply over user edits. Dependency caches/models/media are not part of the patchset.

Windows extended draft (new id): `node .\render.mjs smoke win-ensemble-01 --extended`.
Without dependencies append --plan-only. GUI: `node .\render.mjs ui --port 7788`.
See docs/SCENE_EDITOR.md. Phase reports distinguish executed tests from unverified
Chrome/Piper/Whisper-model/Windows/visual or listening results. Phases 7–8 untouched.
