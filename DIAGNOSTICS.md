# Диагностика Koveyer Dhoix'a

Ниже сохранена история диагностики прежнего движка; актуальный отчёт трансформации — в конце файла.

## Исправления

- `engine/tools/qa.mjs`: извлечение видов из блока PROPS устойчиво к CRLF, не зависит от первого поля `top`; пустой/отсутствующий блок вызывает явную ошибку. Неизвестные виды по-прежнему отклоняются.
- `engine/tools/script.mjs`: общий с timeline расчёт lead/tail/pause; бюджет 105%, сокращение необязательных сцен и полных предложений, уменьшение minDur; дополнительные сцены больше не возвращают переполнение после подгонки. Недостающая длительность распределяется и при остатке менее 3 секунд. Автовыбор шаблона различает предмет и намерение; категория UI не подменяет пользовательский запрос. Явный выбор шаблона сохранён.
- `engine/tools/story.mjs`: тема без «что если» сохраняется без добавления выдуманного действия из доменного шаблона. Содержательные доменные реплики перенесены в обязательные сцены; короткая версия использует законченные реплики. Для возвращения динозавров добавлены причинно связанные события: перекрытие движения и создание заповедников. Эти события не применяются к остальным животным.
- `engine/tools/timeline.mjs`: использует общие константы пауз и отступов.
- `engine/tools/voice.mjs`: исправлен URL Piper (`ru/ru_RU`, а не `ru/ru`); при ошибках подготовки озвучки больше не выводится ложное «all lines up to date».
- `engine/render.mjs`: doctor больше не отмечает отсутствие моделей Piper зелёной проверкой.
- `engine/tests/regressions.mjs`, `engine/package.json`: добавлены регрессии и команда `npm test`.

## Запущенные проверки

- `node tests/regressions.mjs`: PASS. 30 планов: шесть тем × 25/30/45/90/180 секунд, QA без ошибок, отклонение длительности не более 5.5%. Проверены 28 видов реквизита, LF/CRLF, отклонение неизвестного вида и отсутствие подмены темы категорией.
- `node tests/topics.mjs --cleanup`: ALL TOPIC TESTS PASSED.
- `npm run typecheck`: PASS.
- `git diff --check`: PASS.
- «динозавры вернулись в современный мир», запрос 25 секунд: 626 кадров при 24 fps = 26.083 секунды (+4.33%). `projects/chk-dino/project.json`, `plan.json`, `qa_report.json`. QA PASS с предупреждением об отсутствии крупного плана. Тайминг оценочный, не измеренный по Piper.

## Что НЕ подтверждено

Полноценный MP4 НЕ создан. Команда `node render.mjs all chk-dino` реально запускалась, завершилась ошибкой на voice. В песочнице отсутствуют `engine/piper-env`, Piper и модель Denis; Python не содержит numpy. Автозагрузка модели была вызвана конвейером и завершилась сетевой ошибкой; модель/Piper/Python не установлены и не скачаны. Пользовательская Windows-установка недоступна из этого checkout.

Отдельный запуск `node render.mjs scenes chk-dino --only s01 --draft` также завершился ошибкой: Chrome Headless Shell отсутствует, загрузка с remotion.media блокируется сетевой средой. Это независимый блокер рендера.

Поэтому не проверены: настоящий синтез Denis, измеренная длительность WAV, слышимая синхронизация, микс/LUFS, визуальная анимация, финальное кодирование и воспроизведение MP4. Статические тесты не заменяют эти проверки. UI-код изучен, но интерактивный браузерный smoke-test в рамках этой диагностики не выполнен.

## Ограничения результата

- Генератор остаётся локальным правиловым генератором, а не универсальным семантическим планировщиком. Для произвольной темы за пределами доменных правил возможен обобщённый сюжет. Полное требование «любая тема → содержательно точный сюжет» не доказано и не считается выполненным.
- Допуск длительности относится к оценочному плану. После реального Piper длительность может отличаться: таймлайн использует длину настоящих WAV, чтобы не обрезать речь. Жёсткая подгонка озвученного MP4 под запрос пока не реализована.
- Реквизит динозавра не добавлен: тематические события передаются наррацией и имеющимися локациями, визуальное качество такого ролика не подтверждено.
- Существующие проекты не переписаны автоматически. Для применения сценарных исправлений требуется регенерация с осознанным использованием `new --force`; имеющиеся пользовательские проекты не нужно перезаписывать без резервной копии.

GitHub-действия, коммиты, push, смена ветки и изменение истории не выполнялись.

---

# BIG UPDATE: дополнительный аудит (2026-11-23)

Предыдущие разделы описывают прошлую итерацию. После неё коммит `46b1f41` был
опубликован по отдельному запросу пользователя. Текущее обновление пока локальное:
коммит/push/merge не выполнялись.

## Подтверждённые ошибки и исправления

- Неявный `ensureBrowser()` игнорировал системный Chrome. Новый `tools/browser.mjs`
  выбирает env → стандартные Windows/macOS/Linux пути → кеш Remotion. Неверный
  явный путь не замалчивается. Скачивание требует `REMOTION_ALLOW_BROWSER_DOWNLOAD=1`.
  Выбранный путь передаётся всем четырём API рендера. Сигнатуры сверены с
  установленными типами и реализацией Remotion 4.0.545.
- Timeline принимал устаревший TTS WAV после редактирования текста. Общая функция
  `ttsLineHash` проверяет текст, язык, модель, pitch/speed и версию синтеза.
  Неверный путь/длительность также отклоняются. CLI voice-model теперь действительно
  передаётся TTS и сохраняется в настройках проекта для последующей проверки.
- Новые планы содержат fingerprint проекта; CLI отклоняет такой план, если
  project.json уже изменился. Старые планы без fingerprint сохраняют совместимость.
- Sound кешировал ресэмплинг только по mtime, а микс — по именам входных файлов.
  Теперь имя конвертированного WAV содержит хеш содержимого; ключ микса учитывает
  также исходники движка. Удалено лишнее различие ключа первого/второго запуска.
- GUI/CLI могли одновременно писать один проект. Добавлен межпроцессный lock,
  проверка PID и восстановление lock завершившегося процесса. Остановка Windows
  использует taskkill /T /F; статусы running помечаются failed с причиной.
- GUI: устранён обход каталога через stage в API логов, проверяется Origin POST,
  JSON должен быть объектом; narrator валидируется до создания проекта. Логи
  читаются ограниченным хвостом (128 КиБ), а не целиком. Неверный HTTP Range
  возвращает 416, suffix-range корректно обслуживается.
- Doctor использовал `/dev/null` и считал почти любую ошибку Piper признаком успеха.
  Теперь вызывается поддерживаемый `tts.py --version`; ошибки зависимостей видимы.
- GUI получил текстовый индикатор реальной работы вместо движущейся полосы,
  предпросмотр сценария, встроенное видео, проверку компонентов, кнопки папок
  Windows и отключение этапных кнопок во время задачи. Старый MP4 не называется
  доказанно готовым результатом нового запуска.
- Для гипотезы кипящего океана добавлены причинные события и явное предупреждение
  о фантастическом допущении; объяснение возвращения динозавров не выдаёт
  телеологическое утверждение про природу за научный факт.

## Проверки текущей итерации

- `npm test`: PASS. Runtime-тесты + прежние 30 планов/28 props/CRLF + 89 проверок
  матрицы тем. Runtime использует реальный Remotion ensureBrowser с существующим
  тестовым файлом, но **не запускает этот файл как браузер**. Windows-поиск
  проверен инъекцией платформы/файловой системы, не Windows-машиной.
- Настоящий FFmpeg: PASS, конверсия двух разных сигналов с одинаковым mtime даёт
  разные кеш-файлы; неизменённый сигнал повторно использует кеш.
- Настоящий HTTP GUI: PASS, создание, сценарий, JSON, ошибки, запрет дубликата,
  реальный voice-none child process и статус done, Range 206/416.
- `npm run typecheck`, `node --check` для render/tools/tests, `py_compile`: PASS.
- Remotion webpack bundle `src/index.ts` → временный `/tmp/cine-audit-bundle`: PASS.
  GUI не имеет отдельной сборки: встроенный JS извлечён из HTTP-ответа и проверен
  компилятором JS. Визуального браузерного теста нет.
- Сервер GUI запущен на 0.0.0.0:7788; проверка HTTP выполнялась также на этом порту.
- Изолированный `all audit-dino --draft` с явно выбранным режимом none: voice и
  timeline PASS (26.083 с на запрос 25 с), scenes корректно FAILED с сообщением
  «Chrome не найден», без попытки загрузки и без зависшего running. Это проверка
  обработки отказа, **не полноценного видео и не русской озвучки**.
- `doctor`: ожидаемо FAIL — нет numpy, Piper, Denis и Chrome в песочнице. Установка
  пользователя не доступна. Не переустанавливались Python/Piper и не загружались модели.

## Остаточные ограничения

Полноценный MP4 в этой итерации не создан. Не подтверждены реальный Denis, слуховое
качество/синхронизация, финальный LUFS, Chrome launch, потребление RAM и работа
Explorer/taskkill на настоящей Windows 11/Node 26.13.0 (агент работает на Linux
Node 22.22.3). Системный Chrome найден/прокинут по коду и тестам, но его полноценный
запуск требует локальной проверки по README.

Универсального семантического генератора для любой темы по-прежнему нет: за пределами
точных правил используются доменные сюжеты. Длительность после настоящей TTS не
насилуется обрезкой речи: возможен дрейф относительно оценочного бюджета. Нет
доказательства «стабильной версии» для всех входов. Также не добавлены редактор
сценария, GUI-перегенерация одной сцены и постоянные пользовательские настройки;
для отдельных сцен/озвучки сохранены CLI-команды.

Lock основан на PID: при повторном использовании PID ОС возможен консервативный
отказ до ручной проверки. Старые проекты и результаты не удаляются. Кеш с разными
хешами сохраняется, автоматическая сборка мусора не добавлена. Сохранённый старый
MP4 доступен даже при сбое нового запуска, поэтому проверяйте final/qa и дату файла.

Изменённые/новые файлы: `.gitignore`, `README.md`, `DIAGNOSTICS.md`,
`engine/package.json`, `engine/render.mjs`, `engine/tools/browser.mjs`,
`engine/tools/project-lock.mjs`, `engine/tools/{timeline,voice,sound,story,ui}.mjs`,
`engine/tests/runtime.mjs`. Пользовательские проекты, модели и результаты не удалены.

---

# FULL TRANSFORMATION — Koveyer Dhoix'a (2026-11-23)

## Этапы и архитектура

Проверены clean git status и текущая ветка `arena/6921c34e-konveyer`, история
merge PR #2, прежний CLI/GUI, schema, сценарии и regression/runtime/topics.
План сохранён в `docs/TRANSFORMATION.md`. Новая архитектура аддитивная:
`production.mjs` (бриф/provider/материалы/cast/жанровые сцены), `series.mjs`
(контейнер/эпизоды/контекст/выборочная регенерация), существующие
voice/timeline/sound/Remotion/FFmpeg/locks/browser discovery сохранены.

Реализованы:
- Новый бренд GUI и действующей документации, тёмная тема с бирюзовым акцентом,
  три смысловые группы формы, название/формат/жанр/язык/продолжительность/
  количество эпизодов/персонажи/визуальный стиль/повествование.
- Явно обозначенный `local-rules-v1`, контракт provider.generate для будущего
  LLM, начало/развитие/выбор/развязка. Слишком длинный текст отклоняется с
  оценкой времени, не обрезается. Legacy CLI без --format сохранён.
- Форматы fiction/documentary/reconstruction/series. Документальный режим
  принимает sources/claims, проверяет ссылки и статусы supported/hypothesis/
  unknown. Нет независимого фактчекинга. Без материалов получается только
  исследовательская заявка; даты/география/цитаты не придумываются.
- Все выбранные персонажи новых production проектов появляются в сценах и
  имеют реплики; новые QA-проверки контролируют это. Для legacy-коротких
  проектов отсутствовавший персонаж добавляется в финальную сцену.
- Genre visual profiles используют разные существующие локации, цвет,
  музыкальные настроения и планы камеры. Это стилизованная SVG-постановка,
  не буквальная визуализация динозавров, географии или исторических событий.
- Season container, 1–12 независимых episode projects, season number, арка,
  snapshot событий, стабильный cast и его история, отдельный экспорт.
  CLI episode --episode N --force и GUI-кнопка пересоздают только выбранную серию.
- --continue-from / поле GUI создают новый проект с прежним составом и
  финальным исходом в контексте; исходный файл не перезаписывается.

## Реальные рендеры, не только JSON

Временные тестовые зависимости: Linux Chromium из npm-пакета @sparticuz/chromium,
его библиотеки NSS/NSPR и numpy в engine/.cache. Они не добавлены в package.json,
package-lock или Git. После подготовки Chromium выполнен npm ci; реальные
рендеры выполнялись на Remotion **4.0.545**, concurrency=1. Пользовательские
Python/Piper/Denis не переустанавливались и не скачивались.

Первая попытка рендера обнаружила отсутствие системной libnspr4.so. С временными
библиотеками из того же npm-архива рендер прошёл. Это Linux-подготовка агента,
не требование к Windows-приложению.

| Реальный файл | Длительность | Кадров | Видео/аудио | Loudness | Полное декодирование |
|---|---:|---:|---|---:|---|
| output/transform-render/DRAFT.mp4 | 25.083333 с | 602 | 960×540, H.264/AAC, 24fps | −14.01 LUFS | exit 0 |
| output/transform-season-e01/DRAFT.mp4 | 25.125 с | 603 | 960×540, H.264/AAC, 24fps | −14.01 LUFS | exit 0 |
| output/transform-season-e02/DRAFT.mp4 | 25.125 с | 603 | 960×540, H.264/AAC, 24fps | −14.01 LUFS | exit 0 |

У всех запрос 25 секунд (отклонение 0.33–0.5%). Полное декодирование проверено
FFmpeg с rawvideo/pcm_s16le в null sink, не одним ffprobe. Разные SHA файлов
эпизодов: `d57172976ef3fe9cde631e5ec091a163b43b0514` и
`9d0e40e06f27c59bfce02c1db27c16e8e0757568`.

ВНИМАНИЕ: все три файла — **voiceMode=none**, процедурная музыка/атмосфера без
речи. Это не подмена TTS: режим явно указан в проектах. Русский Denis отсутствует
в рабочей копии; синтез/синхронизация/слышимость реплик не проверены.
Визуально просмотрен извлечённый кадр: три стабильных SVG-персонажа в локации.
Полноценный просмотр человеком всего фильма и прослушивание не выполнялись.

Рендер выявил две реальные ошибки, исправленные в этой итерации:
1. all --draft проверял наличие FINAL.mp4 вместо DRAFT.mp4 и выдавал ложное
   предупреждение. Теперь выбирается правильное имя.
2. loudnorm MP4 не исключал видеопоток, а bundled FFmpeg не имеет null-video
   encoder по умолчанию. Добавлен -vn; измерение готового MP4 стало успешным.

## Автотесты и проверки

- npm test: PASS. Новые production tests (30 RU/EN × cast1–3 × 25/30/45/90/180),
  QA фактического cast, evidence validation, контекст/перегенерация/изоляция
  эпизодов и продолжение; прежние runtime/regressions/topics также PASS.
- Runtime HTTP: новое создание season, выбор эпизода, preview, отказ рендера
  контейнера, неверный genre/episode; прежние JSON/cache/lock/Chrome/FFmpeg PASS.
- npm run typecheck: PASS; node --check render/tools/tests: PASS;
  Python py_compile: PASS; git diff --check: PASS.
- node render.mjs doctor без тестового окружения: FAIL (нет системного Chrome,
  numpy, Piper и Denis). Это корректный результат для базовой песочницы.
  С тестовыми env numpy и Chromium доступны, Piper/Denis всё равно отсутствуют.
- GUI доступен на 7788, HTTP и встроенный JS проверены. Попытка получить screenshot
  через Chromium CLI зависла на динамической странице и была остановлена;
  полный интерактивный браузерный UX-тест не считается пройденным.
- В реальных all-запусках render повторно пропускает уже готовые сцены по кешу;
  тесты подтверждают, что регенерация эпизода не меняет JSON соседних серий.

## Ограничения и следующий этап

Это работающий производственный каркас, не завершённая универсальная киностудия.
Правиловый provider не создаёт глубокую причинную историю для произвольной идеи,
большая часть драматического развития обобщённая. Нужны редактор beat/scene,
более богатые предметно-событийные правила или LLM adapter с валидацией.
Фактчекинг, автоматический поиск источников, исторические карты, реалистичные
катастрофы и стабильные фотореалистичные актёры не реализованы.

Сезонные события — authored rule-based ledger, не интеллектуальная модель мира.
Изменение ручного исхода серии не обновляет автоматически snapshots следующих.
При дисковом сбое посреди создания сезона возможны частично сохранённые эпизоды;
автоматический recovery такой операции ещё не реализован (повтор не перезаписывает
существующие эпизоды). Несколько сезонов создаются отдельными id.

Не проверены настоящий Windows Chrome/Node 26, taskkill/Explorer, реальный Denis,
1080p export, озвученные MP4 и память на i3/8GB. Жёсткий target после TTS пока не
обеспечивается: сохраняется речь, а не обрезается ради цифры. Следующий этап —
локальная Windows-проверка с существующей моделью, редактор сцен, доказательный
fact-check workflow и семантическое развитие сериальной арки.

Изменены: .gitignore, README.md, SKILL.md, DIAGNOSTICS.md, docs/TRANSFORMATION.md,
engine/package.json, engine/render.mjs, engine/tests/{production,runtime}.mjs,
engine/tools/{production,series,script,ui,timeline,qa,sound}.mjs.
Пользовательские файлы не удалены; модели, тестовые библиотеки и MP4 не в Git.
Commit, push, merge, смена ветки и операции stash не выполнялись.

## Capital V2 — надёжность и безопасный GUI

Локальные Linux regression/typecheck проходят, включая tests/reliability.mjs:
проверки сети, истории/GUI restore, отказа дисковой замены, recovery сезона и stale
контекста. Подробности и ограничения: docs/AUDIT_V2.md. Windows пока не проверен.

Windows (из engine): `powershell -File .\setup.ps1`, затем `.\start.bat`.
Повторная диагностика: `node render.mjs doctor --fix` (без установок).
История: `node render.mjs history <id>`;
восстановление: `node render.mjs restore <id> --snapshot <имя-из-history>`.
Незавершённый сезон: `node render.mjs recover <season-id>`.
Сетевой GUI: задать KOVEYER_GUI_TOKEN и явно передать `--host 0.0.0.0`;
не использовать публичный HTTP, токен не передавать в URL и не коммитить.
В этом sandbox doctor сообщает отсутствие numpy/Piper/Denis/Chrome: это не
свидетельство отсутствия этих компонентов на пользовательском Windows.

## Фаза 2: документалистика

Проверено: 120-секундный estimated план «Рюриковичи», 14 сцен, 10 исторических
сред, 19 cast records (рассказчик + исторические/коллективные роли), 25 claims.
new/research/timeline/qa --plan-only: 0 ошибок, 2 предупреждения (needsReview,
estimated audio). npm test и typecheck PASS. Негативные anachronism/evidence
тесты включены. Полные доказательства: handoff/phase2/evidence, отчёт REPORT.md.
Не проверено: реальные кадры/MP4/Piper/Chrome, независимая сверка библиографии.
CONTACT_SHEET.svg — storyboard, не отрендеренные кадры. Все claims needsReview=true.

## Phases 3–4

Claim fidelity: 25/25 Rurikids short narrations pass names/numbers/dates check;
added-name/date/number negative cases fail. New Rurikids plan QA: 0 errors, 2
explicit needsReview/estimated warnings. One short Kalita narration corrected.

Verified locally: synthetic PCM envelope and pause mouth closure, chunked WAV,
optional timed visemes, subtitle limits and exports; three aspect plans/packages,
18-second plan-only smoke, FFmpeg cover extraction from a synthetic PNG test video.
This FFmpeg test signal is NOT engine-rendered footage. npm test/typecheck and
textnorm self-test (14/14) pass. Windows and real Chrome/Piper not executed.
Doctor still reports missing numpy/Piper/models/Chrome. Full logs and limitations:
handoff/phase3/REPORT.md, handoff/phase4/REPORT.md; Windows: docs/EXPORTS.md.

## Phases 5–6

Verified: 27 shared-skeleton characters, sampled bone-length checks, 20 historical
environments, extended 18s plan-only smoke with crowd/age presets/new transitions;
NumPy synthesis of three new SFX and four 0.2s mood probes (isolated ignored test
path, not the user's Piper environment). No rendered visual claims.

Whisper: injected exact word-time tests -> aligned; actual missing-cache test ->
energy-estimated with ZERO network calls. A Transformers v4 preflight ignored the
per-call offline option; global allowRemoteModels=false now closes that path.
No ASR model inference/accuracy was verified. Authored captions, not ASR text, are
published. Machine status evidence: handoff/phase5/evidence/alignment-status.json.

Real HTTP tests: editor/cast/camera/duration/environment edits, conflict rejection,
history undo/redo across server restart, per-scene QA and render blocking, safe
schematic/no stale real PNG, wizard preview-no-write/commit and estimates. npm test
and typecheck PASS. Missing Chrome/Piper/Denis/numpy remains doctor exit 1; GUI
visual usability and real frame rendering/Windows execution remain unverified.
