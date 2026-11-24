# Capital V2 — аудит, решения и журнал фаз

Дата: 2026-11-23. Исходный HEAD: 21cfec9. Рабочая ветка сессии:
`arena/348fe030-konveyer`; создание запрошенной `arena/capital-v2` запрещено
ограничением платформы. Push не выполняется.

## Правило приёмки

План не является реализацией. Завершённость каждой фазы отмечается отдельно.
Критерии исторического фильма, липсинка, новых форматов и LLM не считаются
выполненными от наличия документации, JSON или старого пробного MP4.

## Фаза 0: исходные наблюдения (строки до исправлений V2)

| Наблюдение | Проверка по коду | Вывод |
|---|---|---|
| Рот не связан с WAV | Character.tsx:147, SceneRenderer.tsx:133–136 | Подтверждено: бинарный talk и sin(t*22); фонем/огибающей нет. |
| Размер кадра фиксирован | Fx.tsx:9,24,34,46,57; SceneRenderer.tsx:229; Root.tsx:34–58; PoseSheet.tsx:28 | Подтверждено частично: Scene composition уже читает plan.width/height, но world/camera/FX фиксированы, Film metadata размер не меняет. |
| Нет publishing package | render.mjs:411 и timeline.mjs:122–133 | Нет команд SRT/VTT/ASS, обложки, PUBLISH.md, GIF/contact sheet. Встроенные субтитры есть в Hud.tsx. |
| Мало пресетов | library.ts; script.mjs:10–19; envs.tsx:19–435; props.tsx:33–355 | 7 characters, 6 voice roles, 4 selectable styles, 6 moods, 28 props; 10 story environments + void. Grade в Fx.tsx уже содержит 8 вариантов: не путать с четырьмя GUI styles. Модель Denis/ryan зависит от языка, а не ровно одна на все языки. |
| Документалистика | production.mjs:10,41–51,66–80,120–145 | Без claims фактов нет (это правильно); исторический профиль использует office/street/city, нет era/claim id QA, knowledge/, src/doc/. Всегда четыре группы сцен; cast ограничен тремя. |
| Провайдер | production.mjs:61–108; script/story.mjs | Только local-rules-v1, без LLM. Уже есть точка внедрения provider. |
| Редактор/версии | ui.mjs:524–530, lib.mjs:69–74 | Есть preview, нет редактирования/undo/history. JSON через один .tmp + rename, без снимка и fsync. |
| GUI security | ui.mjs:199–205,546–551,632 | 0.0.0.0, нет аутентификации; Origin только POST и только при наличии; body.length считает UTF-16, не байты, split UTF-8 chunks повреждаются. |
| CI/EOL | git ls-files и скан текстовых файлов | CI/.gitattributes отсутствовали. В этом checkout CRLF/голых CR не найдено: смешение не воспроизведено, массово менять файлы незачем. Добавлена политика EOL отдельным коммитом 58b8713. |
| Производительность | render.mjs:157–160; mixer.py:194–234,259–296 | Есть worker=1 при RAM<12GB, время отдельных сцен и кеш, но нет --profile/ETA/background cache. 4–6 fps не измерялось здесь: это не гарантированная скорость. Mixer держит полные массивы, 180s повышает RAM. |
| Сезоны | series.mjs:10–24,31–41 | Поочерёдная запись в конечные каталоги, нет транзакции/recovery/stale-context. |
| Установка | render.mjs:349–364; browser.mjs; lib.mjs:221–250 | Doctor только диагностика; браузер уже выбирается без обязательной загрузки. Piper окружения сохраняются. setup.ps1/start.bat отсутствуют. |

Все пути в таблице, кроме Git/EOL, относительно engine/. Это аудит архитектуры
и конкретных проверяемых мест, не обещание визуальной проверки каждой ветви SVG.

## Дополнительно найдено

- qa.mjs:151–154: blackdetect/freezedetect через allowFail без проверки exit status.
  При отсутствии null video encoder FFmpeg проверка может молча не выполниться.
- whisper.mjs:14: WAV data ищется через indexOf('data'), а не разбор RIFF chunks;
  ложный маркер/неполный WAV не отклоняется надёжно.
- lib.mjs:60–66: readJson с fallback скрывает повреждение JSON так же, как отсутствие.
- lib.mjs:91: ошибка записи журнала проглатывается.
- project-lock.mjs:15–25: stale-lock recovery имеет TOCTOU и основан только на PID;
  PID reuse может вызвать консервативную блокировку. Не считать это транзакцией.
- ui.mjs:565: синхронный doctor на HTTP-потоке блокирует другие запросы до 30 секунд.
- production.mjs:45–47: ошибки claims не содержат индекс; отсутствующий sources
  путается с неизвестным id. Нужны человекочитаемые сообщения мастера материалов.
- Большой scope: >=4 characters исторического фильма против нынешнего max=3;
  нужно отдельное правило historical cast, не ломая legacy UI 1–3.
- Смена выходного размера требует менять и qaMedia, и camera world-to-screen,
  а не просто поля width/height.

## План и зависимости

0. EOL и Linux CI; baseline tests. (Завершено локально.)
1. Secure GUI, bounded byte body; snapshots/migrations/restore; journaled season
   publication/recovery, stale context; неразрушающий doctor --fix и Windows launchers.
2. Knowledge schema, evidence/source QA и проверенный исторический пакет;
   historical asset vocabulary + documentary graphics; research/epoch splitting.
3. WAV amplitude envelope, mouth closure, real-audio tests; textnorm coverage;
   voice registry; SRT/VTT/ASS.
4. Resolution-independent viewport + safe zones; publishing package.
5. Art expansion на прежнем скелете и movement QA.
6. Scene editor/history UI, materials wizard, RU/EN, очередь и preflight estimates.
7. Профиль и визуальные goldens до/после оптимизации.
8. Выключенный по умолчанию локальный LLM adapter, строгий evidence boundary.

## Риски/допущения

- Офлайн-база обязательна; doctor --fix не скачивает модели и не переустанавливает
  окружения. Недостающие бинарные зависимости — конкретный внешний блокер
  проверки рендера/TTS, а не основание отключать проверки.
- Сезон из нескольких sibling directories не может появиться целиком одним rename:
  нужна staging area + журнал + идемпотентное завершение после сбоя. Нельзя обещать
  multi-directory ACID. До финальной parent publication эпизоды не должны запускаться.
- Снимки ограничиваются по количеству, не удаляют пользовательские проекты/экспорты.
- Для LAN нужен TLS reverse proxy/доверенная сеть: bearer-token поверх HTTP
  не шифрует трафик. GUI не является публичным multi-user сервисом.
- Исторические данные, подготовленные ИИ, требуют needsReview=true и ручной проверки
  источников, особенно спорные ранние даты/родословные. Пока пакет не создан.

## Проверки фазы 0

- npm ci --ignore-scripts: PASS (295 packages); npm test: PASS;
  npm run typecheck: PASS на Node 22.22.3/Linux.
- В CI используется обычный npm ci с ONNXRUNTIME_NODE_INSTALL=skip — это штатная
  опция bundled CPU runtime, исключающая скачивание CUDA из NuGet. Локальная
  репетиция этого режима будет записана отдельно.
- GitHub Actions добавлен, но удалённый запуск не выполнен: push отсутствует.
- Скан git-tracked текстов: CRLF не найдено, renormalize не изменил исходники.
- Реальных новых рендеров в фазе 0 нет. Старые результаты из DIAGNOSTICS.md
  исторические и не считаются проверкой Capital V2.

## Фаза 1 — реализовано и проверено локально

- GUI по умолчанию 127.0.0.1. Внешний bind требует KOVEYER_GUI_TOKEN
  (32–256 URL-safe символов); Host/Origin/Sec-Fetch-Site проверяются также для GET.
  POST принимает application/json; предел 1 MiB считается в байтах. Токен нельзя
  помещать в URL; LAN HTTP не шифрует его, необходима доверенная сеть/TLS proxy.
- project/plan schemaVersion=2: additive migration старых документов, временный
  файл + fsync + rename, до 20 pre-image snapshots каждого типа. CLI history/restore
  и GUI «История»; восстановление само сохраняет предыдущую версию.
- Сезоны: staging + журнал, parent публикуется последним; повтор recover идемпотентен,
  конфликт с изменённым эпизодом не перезаписывается. Это не multi-directory ACID.
  Изменение исхода помечает последующие контексты stale; нужна явная episode --force.
- Внешние project locks учитывают legacy lock. Короткая mkdir-guard сериализует
  захват/очистку stale PID, устраняя гонку удаления нового lock двумя reclaimers.
  При аварии именно внутри захвата guard остаётся: fail-closed, а не небезопасное
  автоматическое удаление. После остановки всех процессов оператор может удалить
  только пустой projects/.locks/<id>.acquiring. Проекты/экспорты не удалять.
- setup.ps1/start.bat и doctor --fix не переустанавливают существующий Piper/Denis;
  сохраняются только найденные пути в ignored local-environment.json.

Проверки Linux: npm test (включая tests/reliability.mjs), typecheck, node --check,
Python py_compile, git diff --check PASS. Новые тесты: UTF-8 split/byte overflow,
Host/Origin/auth/cookie/content-type, реальный GUI restore subprocess, история и
ошибка rename, повреждённый JSON, прерванный сезон/повтор/conflict/stale regeneration.
Windows launchers только прочитаны, не исполнены на Windows. Реальный doctor --fix
вернул exit 1: numpy/Piper/Denis/Chrome здесь отсутствуют; ничего не скачано.
Удалённый CI не запускался. Фазы 2–8 и новые реальные видео ещё не выполнены.

## Фаза 2 — статическая приёмка

Реализованы offline knowledge validator/research, пакет Рюриковичей (25 claims,
все needsReview=true, спорные ранние сведения disputed), documentary-rules-v2,
эпохальные главы/связанные с claims реплики, 10 исторических сред, предметы и
костюмы с era, SVG документальная графика, anachronism/evidence QA, SOURCES.md,
схематичный сториборд и отдельные эпохальные episode projects для длинного охвата.
Условие supported не означает online verification. Библиография не проверена по
сети; прочтение конкретных страниц не заявляется. Ручная проверка обязательна.

Проверено запуском: new → research → timeline → qa --plan-only на 120 секунд;
npm test (новые и старые suites), typecheck, node --check. Полные артефакты и
логи в handoff/phase2/evidence. QA содержит явные предупреждения needsReview и
estimated voice. Контактный лист — storyboard, не фотографии кадров.
Не проверено: Chrome render, Piper audio timing, MP4, визуальная читаемость,
историческая точность костюмов/архитектуры и независимая сверка источников.
Doctor в этом sandbox вернул exit 1 из-за отсутствия numpy/Piper/Denis/Chrome.
Фазы 3–8 не начаты.

Переносимость: при восстановлении сессии файлы принятых фаз сохранились, но прежние
локальные commit objects отсутствовали (HEAD был 21cfec9). Они сохранены новым
checkpoint-коммитом без удаления/отката файлов. Bundle включает этот checkpoint
и фазу 2, чтобы не зависеть от отсутствующих 62b4aea/5d9c5a9. Push отсутствует.

## Phases 3–4 — local implementation boundary

Claim fidelity QA now rejects unsupported lexical dates/numbers/capitalized names
in short claims and lines; Rurikids passes after a narrower Kalita narration.
Conservative lexical QA is not semantic/factual verification. Real audio RMS
lip envelopes, pause closure, optional timed phoneme visemes, role voice registry,
prosody/cache, historical textnorm, SRT/VTT/ASS + reading/overflow QA implemented.
Without provided alignment, word times are explicitly energy-estimated.

Output sizing is centralized; Film/Scene/FX/PoseSheet are output-size independent
while legacy WORLD remains the design space. Portrait primary-actor framing and
HUD safe zones, isolated three-format derivatives, publishing/cover package and
18-second Windows smoke command implemented. No phase 5–8 work performed.

Verified: npm test/typecheck, 14 textnorm cases, synthetic PCM and FFmpeg test-video
extraction, plan-only smoke, 120s Rurikids plans in all three aspects. Not verified:
real Piper synthesis, supplied live phoneme alignment, downloaded voices, Chrome
visuals/MP4, voice quality, portrait multi-person composition, Windows execution.
Publication SVGs without matching video are labelled schematic, not rendered frames.

## Phases 5–6

Mini-task: local Whisper word timestamps preserved as aligned; actual unavailable
cache path falls back energy-estimated, no remote request. Tests inject timestamps
and validate crop offsets/gaps/mismatch. Transformers v4 preflight requires global
offline enforcement as well as local_files_only. No real-model inference claimed.

Phase 5: additive 27-character common-skeleton library, body/age/headwear/hair,
crowd; +10 historical environments (20 total), depth layers/motion, transitions,
selectable grades, +4 music moods/+3 SFX. Bone rules unchanged. Extended smoke
has <=4s shot intervals; actual rendered freeze detection awaits Chrome. NumPy
was installed only under ignored engine/.cache/phase5-python for sound probes,
not into Piper/user runtime. Real audio probes are not a film or listening review.

Phase 6: vanilla GUI scene editor, revision locks, history-based undo/redo across
restart, QA indicators/render gate, schematic plus separate Chrome still job,
claim-table wizard with unsaved preview and explicit commit, CPU/memory estimates,
RU/EN editor/core form labels. Raw logs/canonical sources are not auto-translated.
HTTP, schema, regression, JS/Python syntax and type checks verified. Browser visual
review, Windows, Piper/Chrome/Whisper model accuracy remain unverified. Phases 7–8
not started. Details in docs/SCENE_EDITOR.md and handoff/phase6/REPORT.md.

Session restoration again preserved accepted files but not their local Git commit
objects. Commit 12e3f3c is an additive accepted-state checkpoint; phase5 patches
apply on its equivalent accepted phase4 tree, phase6 follows the phase5 set.
No resets, branch switches, data removal, push or GitHub changes were performed.

## Phases 7–8 / phase5 discrepancy closure

General environment catalog was only 11 (historical additions did not satisfy the
requested general scenery). Added 8 distinct multi-plane general sets: now 19
nonhistorical + 20 historical, including all named requested settings. Catalog,
QA on all 8 new scene environments and typecheck pass; no visual approval.

Profile CLI captures stage/scene wall time, slow video capture frames, optional
full-frame still timings and sampled process-tree RSS; all timing bases and limits
are explicit. No static prerender/optimization enabled or claimed equivalent.
llm-local is opt-in loopback Ollama/OpenAI, schema+bounded repair, immutable topology/
roles/claims and QA/timing checks. Documentary new paraphrases/facts rejected using
verbatim per-line materials allowlist, including legacy brief guard. Stub tests
and CLI history/no-overwrite pass. No real model inference verified.

selfcheck assembles versions/doctor/smoke/timings/8 actual extracted draft PNGs when
available into output/selfcheck-<date>/ + ZIP. Linux incomplete path verified (doctor
fails, plan-only smoke succeeds, frames=[]); Windows/Chrome/Piper/real film review
not verified. No push/branch switch/data deletion. All old phase2→3→4 patches were
applied to a temporary index and exactly matched accepted checkpoint 12e3f3c.
