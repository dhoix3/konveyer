# Фаза 2 — переносимый результат

## Проверено запуском

- Node 22.22.3/Linux; npm ci с ONNXRUNTIME_NODE_INSTALL=skip.
- npm test: PASS — documentary + reliability + production + runtime + regressions + topics.
- npm run typecheck: PASS; node --check: PASS; git diff --check: PASS.
- `new → research → timeline → qa --plan-only`, проект phase2-rurikids-accepted:
  **120.000 секунд, 2880 кадров @24fps, 14 сцен по 8.54–8.58 секунды**.
- **10 исторических окружений, 0 современных**, 19 записей cast:
  рассказчик и 18 стилизованных ролей (включая коллективные княжеские роли).
  Показаны, в частности, Рюрик, Олег, Игорь, Ольга, Святослав, Владимир,
  Ярослав, Мономах, Долгорукий, Бату, Невский, Калита, Иван III/IV и Фёдор.
- **25 claims**, у каждого источники/статус/confidence/date precision/needsReview.
  Каждый из 25 покрыт репликой; у сцен с древом есть также genealogy claim.
- Схематичная карта, таймлайн, ретроспективная родословная, главы и source/status badges
  присутствуют в данных сцен и подключены к существующему React renderer.
- Негативные тесты: неизвестный источник/status/claim, потеря связи реплики,
  современная среда/предмет, неверный костюм/эра; пустой offline research;
  короткий запрос с длинным охватом → отдельные проекты по эпохам и их plan QA.
- Итог QA: **0 ошибок, 2 явных предупреждения** — factual manual review и estimated timing.

## Не проверено

- Источники не сверялись по сети/страницам; **все 25 needsReview=true**.
  confidence — оценка автора пакета. supported не является сертификатом истинности.
- Doctor exit 1: здесь нет numpy/Piper/Denis/Chrome. Существующая пользовательская
  Windows-установка не затронута. MP4, настоящий WAV timing, читаемость графики,
  анимация и лист реальных кадров не проверены.
- CONTACT_SHEET.svg — явно подписанный **схематичный сториборд**, не рендер кадров.
  Графика/костюмы — условная визуализация, не научная портретная реконструкция.
- Windows и удалённый GitHub Actions не запускались; push не выполнялся.
- Фазы 3–8 не выполнялись.

## Файлы доказательств

`evidence/project.json`, `plan.json`, `knowledge.json`, `qa_report.json`,
`SOURCES.md`, `CONTACT_SHEET.svg`; реальные логи commands/tests/typecheck/doctor.
План воспроизводим без аудиофайлов: voiceSource=estimated. Секретов/моделей/MP4 нет.

## Перенос кода

В `patches/` — git format-patch --binary от базы
`21cfec9cd4c4a66b8f79b77eaa016bee72699a52` до итогового коммита фазы 2.
На чистом checkout этой базы применить все патчи **по порядку**:

```sh
git am /path/to/handoff/phase2/patches/*.patch
cd engine
ONNXRUNTIME_NODE_INSTALL=skip npm ci
npm test
npm run typecheck
```

На Windows перед npm ci: `$env:ONNXRUNTIME_NODE_INSTALL='skip'` в PowerShell.
Если локальные файлы уже содержат изменения фаз 0–2, не применять патчи поверх
них автоматически: использовать отдельную чистую рабочую копию для сравнения.
Архив кумулятивный: включает принятые фазы 0–1. Их прошлые commit objects не были
доступны после восстановления sandbox, поэтому сохранён checkpoint без удаления
сохранившихся файлов. `CHANGED_FILES.txt` перечисляет файлы переноса;
`PHASE2_FILES.txt` — область текущей фазы.
