# DIAGNOSTICS — текущее состояние перед PR

Это актуальный итог, не журнал прежних пробных MP4. Точная версия и полная таблица:
`handoff/final/evidence/summary.json` и `COMMANDS.md`. Фазы приняты, но структурная
проверка не означает проверку фильма. Пробелы: `docs/KNOWN_GAPS.md`.

## Проверено запуском

- Чистый отдельный clone текущей ветки итогового HEAD; `git status` чист до установки,
  tracked diff пуст после проверки. Никаких изменений пользовательских проектов.
- Node22/Linux; `npm ci` с явно указанным **ONNXRUNTIME_NODE_INSTALL=skip**, без
  скачивания optional native runtime. Это не тест ONNX inference. npm test,
  npm run typecheck, node --check CLI/tools/tests, Python py_compile tools.
- По порядку: точная копия старого demo-no-sleep project.json → timeline → qa
  --plan-only (исходные bytes не изменены); fiction new→timeline→qa; series new и оба
  эпизода timeline→qa; Рюриковичи120s new→research→timeline→qa; extended smoke --plan-only.
- Рюриковичи:25 claims, все needsReview=true,25 реплик с известными claimIds,
  schemaVersion2. Независимая истинность фактов этим не подтверждается.
- selfcheck запущен без --plan-only: doctor обнаруживает отсутствие компонентов,
  fallback явно plan-only, ZIP создан, complete=false, frames=0, exit1. Это ожидаемая
  **неполнота**, не успешный реальный smoke. Детали в 19-selfcheck.log и ZIP.
- Тесты: migrated v1 JSON/future-version rejection, atomic bounded history,
  locks/revisions/recovery, byte/Host/Origin security; GUI live HTTP/served JS,
  persisted undo/redo; knowledge/era/claim lexical QA; RMS/synthetic WAV, injected
  aligned timestamps и real-library missing-cache без сетевых fetch; subtitle,
  aspect/export, roles/timing, stub Ollama/OpenAI JSON/repair/no-overwrite.
- 27 common-skeleton characters,4 body presets,39 environments (19 general+20
  historical),10 styles/10 moods; bone/shot cadence и QA всех8 добавленных general
  сетов. Короткие NumPy mixer probes прежних этапов — не прослушанный фильм.
- Profile: CPU-side plan timings и failure report отсутствующего Chrome, не скорость
  MP4. Native peak RSS + sampled tree RSS имеют описанные ограничения.
- Сканы tracked tree/секретов/knowledge и финального snapshot manifest:
  `handoff/final/evidence/RISK_SCAN.json`. Сигнатуры не гарантируют отсутствия любого
  мыслимого секрета. .gitignore/.gitattributes reviewed; модели/окружения/MP4 исключены.

Предварительный npm test завершился ENOENT из-за ошибочно навязанного test harness
WHATIF_PROJECTS: старый topics suite использует checkout/projects. Это не скрыто:
preliminary-evidence сохранён; в финальном прогоне npm test без внешних path overrides.

## Не проверено

- **Реальный рендер**, MP4/media QA, PNG stop-frames, cover/аспекты, графика/массовка/
  визуальная анатомия/нет неподвижных кадров>4s. Chrome недоступен. SVG — схема.
- **Piper/Denis**, настоящая речь/прослушивание/viseme quality; отсутствие в sandbox
  не означает отсутствия на пользовательском Windows. Работающий Piper не менять.
- **Whisper inference** на настоящей локальной модели и его точность; injected
  timestamps/energy-estimated fallback не распознавание речи. Native ONNX skipped.
- **Локальная LLM** на настоящей модели: stub проверяет протокол/ограничения, не смысл.
  Default rules работает без модели, explicit provider может завершиться ошибкой.
- **Windows** (Node26/i3/8GB), launchers/Chrome paths/CIM в реальной ОС; успешный ZIP
  selfcheck с8 кадрами и финальные тайминги/ETA/RAM на целевом ПК.
- **Визуальный GUI**, usability/localization/реальные Chrome preview; HTTP-тесты
  не визуальная приёмка. Raw diagnostics/источники не машинно переводятся.
- **Предрендер статичных слоёв — выключен**, не реализован; эталоны/pixel equivalence
  не сравнивались. Не включать по умолчанию и не заявлять ускорение.
- Независимая проверка источников/семантической истинности, все legacy documentary
  ручные изменения, удалённый GitHub CI/PR (push не выполнялся).

Fixes1 follow-up: shared bbox/layout/font/claim/epoch/camera/data tests are run
separately in handoff/fixes-1/evidence/. This does not change the unverified visual
status above. Actual Windows Chrome/Piper working is user-reported; do not reinstall.

## Universal phase0

`cd engine; node tests/universal-phase0.mjs` checks data/geometry, not rendered text.
After rebuilding timeline, `frames ID --per-scene 3` is still the Chrome-based visual
review path. No screenshot/MP4 is produced by geometry tests. See docs/UNIVERSAL.md.

Universal phase1: `node tests/universal-input.mjs`. Final export rejection is intentional
for unreviewed universal material; use GUI confirm/reject with exact quotations.
Sensitive topics require the disclaimer in actual script lines. --accept-unverified
does not bypass evidence integrity/disclaimer checks. Network is not implemented.
