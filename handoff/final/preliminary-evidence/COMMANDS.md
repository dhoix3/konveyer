# Чистый checkout: команда → результат

HEAD: `1a231276d92ab73f85859b6fecc6d2c98feb9254`

Установка: ONNXRUNTIME_NODE_INSTALL=skip (без скачивания optional native runtime; inference не проверялся).

| Команда | Exit | Результат |
|---|---:|---|
| `/usr/local/bin/npm ci` | 0 | PASS |
| `/usr/local/bin/npm test` | 1 | FAIL |
| `/usr/local/bin/npm run typecheck` | 0 | PASS |
| `node --check render.mjs tools/*.mjs tests/*.mjs (each file)` | 0 | PASS |
| `/usr/bin/python3 -m py_compile /home/user/konveyer/engine/.cache/pr-closure-checkout/engine/tools/gen_assets.py /home/user/konveyer/engine/.cache/pr-closure-checkout/engine/tools/mixer.py /home/user/konveyer/engine/.cache/pr-closure-checkout/engine/tools/textnorm.py /home/user/konveyer/engine/.cache/pr-closure-checkout/engine/tools/tts.py` | 0 | PASS |
| `node render.mjs timeline demo` | 0 | PASS |
| `node render.mjs qa demo --plan-only` | 0 | PASS |
| `node render.mjs new closure-fiction --format fiction --topic Возвращение динозавров --duration 90 --characters 3 --voice none` | 0 | PASS |
| `node render.mjs timeline closure-fiction` | 0 | PASS |
| `node render.mjs qa closure-fiction --plan-only` | 0 | PASS |
| `node render.mjs new closure-series --format series --topic Экспедиция --name Экспедиция --duration 90 --characters 3 --episodes 2 --voice none` | 0 | PASS |
| `node render.mjs timeline closure-series-e01` | 0 | PASS |
| `node render.mjs qa closure-series-e01 --plan-only` | 0 | PASS |
| `node render.mjs timeline closure-series-e02` | 0 | PASS |
| `node render.mjs qa closure-series-e02 --plan-only` | 0 | PASS |
| `node render.mjs new closure-rurik --format documentary --genre history --topic Рюриковичи --duration 120 --voice none` | 0 | PASS |
| `node render.mjs research closure-rurik --topic Рюриковичи` | 0 | PASS |
| `node render.mjs timeline closure-rurik` | 0 | PASS |
| `node render.mjs qa closure-rurik --plan-only` | 0 | PASS |
| `node render.mjs smoke closure-smoke --extended --plan-only` | 0 | PASS |
| `node render.mjs selfcheck` | 1 | Ожидаемо неполный: нет компонентов, ZIP создан |
