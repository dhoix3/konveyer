| Команда | Результат |
|---|---|
| ONNXRUNTIME_NODE_INSTALL=skip npm ci | PASS |
| npm test | PASS; прежние + fixes1 |
| npm run typecheck | PASS |
| node --check render.mjs tools/*.mjs tests/*.mjs (по каждому) | PASS |
| python3 -m py_compile tools/*.py | PASS |
| node render.mjs smoke fixes1-plan --extended --plan-only | PASS |
| node render.mjs doctor | exit1: missing sandbox dependencies |
| node render.mjs models fetch whisper-tiny | exit1: permission required, no download |
| node render.mjs frames fixes1-plan --per-scene 3 | exit1: Chrome missing, no PNG |
| isolated all eta-check --draft --concurrency 1 | estimate written; exit1 missing Chrome, not rendered |
