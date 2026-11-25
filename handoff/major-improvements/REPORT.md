# Major improvements — отчёт

## Статус и границы результата

Внесены реальные изменения, а не только план: проектная документальная графика,
подготовка материалов с доказуемым происхождением, новая компоновка GUI, исправления
контрактов и защиты результатов. Автоматические проверки PASS.
**Это не подтверждение полностью готового видеопроизводства:** реальный Chrome
render/MP4, визуальная оценка, прослушивание и Windows11 здесь не проверены.
Некоторые требования полного большого ТЗ ещё не закрыты — перечислены ниже.

База: main `4e9ddcb8ccee9ae52a79e148103b38700fbe5509` (после PR5).
Работа только в `arena/348fe030-konveyer`: отдельную ветку нельзя создать по
ограничению сессии. Новых commit/push/PR/merge не выполнялось. Подготовлен текст
`PR_DESCRIPTION.md`; для публикации нужно разрешение.

До изменений сохранены `AUDIT-AND-PLAN.md` и карта75 модулей/9664 строк с импортами,
подпроцессами/сетевыми точками (`evidence/module-inventory.json`). Это инвентаризация,
не заявление о построчном полном аудите всех зависимостей. Приоритетная проверка:
GUI/API, documentary/knowledge/editor, scene camera, voice/models/Whisper,
render/QA/storage/ETA; остальные подсистемы покрыты существующими регрессиями.

## Обнаружено → исправлено

| Ошибка/риск | Реальное изменение |
|---|---|
| GUI `/api/check`: нет JSON Content-Type | Отправляет JSON `{}`; строгая security проверка сохранена. Live API regression PASS |
| Doctor блокирует HTTP event loop | Child process асинхронный, timeout и ограниченный вывод |
| Новая тема получает карту Руси/московское дерево/862 | Generic profile: данные из knowledge.graphics, даты из claim; Rus profile только для пакета rurikids; legacy сцены совместимы |
| Без genealogy/map всё равно обязательны3 режима | Generic выбирает timeline + только имеющиеся данные; отсутствие численных дат подписано явно |
| Дерево связывает соседей, а не parent | Стрелки по заданным parent; ссылки и циклы валидируются; до4 узлов на фрагмент, предупреждение о непоказанных узлах |
| Нет реальной подготовки материалов новой темы | Offline API/UI из реальных выдержек → точные quote/source IDs → кандидаты unknown/needsReview. Никаких invented sources/загрузок/ложного «проверено» |
| Полный knowledge-пакет не принимается формой создания | CLI new + GUI create принимают schemaVersion1 для documentary; старый production brief API сохранён |
| claim без person создаёт ложного named героя | Нейтральная роль anonymous; QA совместим и со старым placeholder без namedPerson |
| Generic навязывает древнерусские костюмы/эпоху/props | Нейтральная сцена/роли, без Rus props/costume требований; неизвестная era не превращается в800–1600 |
| docTransform заменяет camera motion синусом | Композиция вписывания с cam.zoom/rot и сдвигами относительно начала shot; учитывается авторский zoom; декоративный синус удалён |
| Corrupt state/parent JSON рушит /api/state; corrupt project скрывается | Локальный warning, остальные проекты доступны; повреждённый проект виден и доступна история |
| Piper offline config20 vs download200bytes | Одинаковый порог200; offline error содержит реальные абсолютные model/config пути, не требует reinstall |
| Whisper «ready» по двум байтам; corrupt skip | JSON parse/object check, минимальный размер ONNX, повторная подготовка повреждённого файла только по explicit consent; temp validate до rename, cleanup при ошибке |
| Явный неполный Whisper path поздно падает в inference | Ранняя диагностика missing files с каталогом и честным fallback; remote runtime остаётся запрещён |
| FFmpeg visual filter может упасть, QA пропускает | Ненулевой status теперь ошибка QA, не ложный PASS |
| Новый scene MP4 заменяет старый до probe | Probe staged .part, duration/codec/resolution до rename; аналогично concat и final checks |
| ETA берёт старые samples от другой машины/исходников | Новые samples сохраняют source hash/dimensions/CPU/Node; cmdAll использует только совместимые, legacy samples без context игнорируются в этом режиме |

Уточнение предварительного аудита: final mux **уже** писал `.part.mp4`; проблемой
была публикация до probe, а не отсутствие временного файла. Это исправлено без
переписывания FFmpeg цепочки. Все старые модели/результаты/проекты сохранены.

## GUI

- Тёмная бирюзовая studio оболочка: закреплённая навигация, список проектов,
  отдельные рабочие страницы «Новый проект», «Производство», «Сценарий и материалы».
- Три работающих шага формы вместо общей простыни, назад/далее/прямой переход;
  существующие поля/handlers/API не заменены декоративными элементами.
- Соотношение сторон16:9/9:16/1:1 сохраняется как additive settings.aspect;
  explicit CLI export aspect имеет приоритет, старые проекты остаются16:9.
- Явное подтверждение создания/force/stop; отключение голоса диктора при voice none.
- Черновик формы сохраняется в браузере, восстанавливается **по кнопке**, не
  перезаписывая файлы пользователя. В черновике могут быть материалы — локальный
  браузер должен считаться доверенным. В другом браузере черновика нет.
- Production показывает реальные stage states, elapsed из job.started, реальные
  сообщения ошибок/журнал, кнопку повтора failed stage. Никаких fake процентов/ETA.
- Русские подписи navigation/stages/states/камера/переходы/music/environments,
  Undo/Redo и columns claims, сообщения материалов. Технические значения API не меняются.
- Подготовка выдержек с реальным API и переносом в таблицу проверки или создание
  нового документального проекта; сохранение existing проекта по revision/lock.
- Responsive CSS для узкого экрана; DOM поведение проверено, реальный layout — нет.

## Проверки и доказательства

| Проверка | Результат |
|---|---|
| `npm test` —14 test entrypoints | PASS, `evidence/npm-test.log` |
| `npm run typecheck` | PASS, `evidence/typecheck.log` |
| Node syntax render/tools/tests; Python py_compile | PASS, `evidence/syntax.log` |
| Optional JSDOM + настоящий HTTP сервер | PASS, `evidence/studio-dom.log` |
| `git diff --check` | PASS |
| Изолированный new → all --draft, voice none, offline | new/voice/timeline PASS; scenes честно FAILED: Chrome отсутствует |
| Повтор отдельного scenes этапа | Честный FAILED с тем же объяснением; не success |
| frames --per-scene3 | FAILED без Chrome; ни PNG, ни contact sheet не объявлены готовыми |
| doctor | exit1: в sandbox нет Chrome/Piper model pair/Python numpy; FFmpeg/Node/Remotion обнаружены |

Новые major тесты: отсутствие источников/выдержек, exact source quote, неизвестные
даты/эпохи, no-person, no-genealogy во всех3 аспектах, Rus compatibility, bad route,
graph cycle, stale ETA sample, corrupt model JSON + temp cleanup.
Расширенный live GUI test: check endpoint, materials prepare+canonical create,
vertical settings, bad input400, corrupt state и видимый corrupt project.
JSDOM: navigation, только активный шаг формы, восстановление draft, реальный
prepare API → claims table с установленным needsReview. Это **не screenshot test**.

Существующие suite продолжают проверять: старые schema/migration/history/restore,
crash recovery сезона, конфликты и locks, разные голоса/модели и audio fingerprints,
voice none, offline/missing Whisper, PCM/word timing, 3 аспекта и original preservation,
fiction/documentary, media error paths/retry, unsafe API inputs/auth/origin,
костюмные bone invariants, general/historical environments и local LLM contracts.
Local LLM остаётся off по умолчанию; static prerender не включался.

Изолированный pipeline:5 сцен,30.125сек,723 кадра; voiceSource=estimated при
voice none, scenes.status=failed. Логи `pipeline-create/all/retry.log`, `frames.log`.
TTS/Whisper inference не выполнялись; modelos/Chrome автоматически не скачивались.
Результаты Linux не выдаются за Windows проверку.

## Совместимость и изменённые файлы

Полный перечень: `CHANGED_FILES.txt`. Основные новые модули:
`project-graphics.mjs`, `research-materials.mjs`, `studio-page.mjs`; тесты
`major.mjs`, optional `studio-dom.mjs`; схема/поток в `docs/PROJECT_MATERIALS.md`.
Новых production npm dependencies нет; JSDOM установлен только в ignored .cache
для optional теста. Добавлен root .cache ignore. Python/Piper не переустанавливались.

Не менялись skeleton/anatomy, topology, модельные файлы, voice IDs, CLI names,
state scene keys, lock path, прежний cache fingerprint алгоритм. Добавлены metadata
context samples и settings.aspect; sourceHash закономерно инвалидирует старые
scene cache после изменения renderer, но не удаляет готовые файлы.

## Что ещё не закрыто / не проверено

1. Нет Chrome/MP4/реальных кадров/скриншота, визуальной экспертизы графики и
   костюмов, длительного memory benchmark и реального прослушивания. Новые
   staged validation happy paths не проверены реальным Remotion renderer.
2. Нет запуска на Windows11 i3/8GB/UHD с Denis/Piper и локальным Whisper. Отсутствие
   компонентов в sandbox ничего не говорит о пользовательской Windows.
3. Подготовка материалов — локальная трассируемая обработка выдержек, а не
   автоматический веб-поиск или независимый фактчекинг. Пустая CLI research заявка
   по-прежнему явно EMPTY, не готовое исследование.
4. В legacy editor advanced prompts, технических QA и subprocess logs остаются
   английские диагностические строки. Поэтому **полную русификацию всех ошибок
   по всему приложению не объявляю завершённой**. Основные новые GUI controls RU.
5. Три шага формы, не отдельный экран для каждого из девяти пунктов ТЗ; каст
   редактируется existing scene editor. Не заявляю новый полноценный timeline NLE.
6. /api/create пока синхронно ждёт legacy CLI; season context refresh на GET пока
   сохранён ради существующего stale-context поведения. HTTP doctor уже async.
7. Process jobs UI остаются in-memory: persisted stage/cache/history восстановимы,
   но нет нового durable job scheduler/PID recovery после SIGKILL сервера.
8. Проверка model assets — структурная/минимального размера, не SHA authenticity и
   не подтверждение загрузки ONNX в inference. Huge malformed payload limits,
   large genealogies и переполнение надписей требуют дополнительных проверок.
9. GUI heuristic resource range остаётся отдельным от CLI measured render estimate;
   обе оценки помечены не замером, но их унификация ещё не сделана.

Эти ограничения означают, что весь масштаб исходного ТЗ пока закрыт **частично**,
несмотря на завершённый проверяемый набор исправлений. PR следует рассматривать
как набор функциональных улучшений с явными границами, не как visual sign-off.

## Windows11: запуск и проверка (PowerShell)

Из корня существующей рабочей копии, не удаляя projects/output/models/piper-env:

```powershell
cd engine
node --version
npm ci
npm test
npm run typecheck
node render.mjs doctor
node render.mjs ui --port 7788
# В браузере http://localhost:7788 — проверить навигацию/форму/материалы/повтор.
```

Не переустанавливать рабочий Piper/Denis только из-за sandbox doctor. Для ручной
модели нужны `engine/models/piper/<model>.onnx` и `<model>.onnx.json`; конкретные
ожидаемые имена/пути показывает приложение. Для уже установленного Chrome:

```powershell
$env:REMOTION_BROWSER_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
# Если у вас Chrome в другом месте — укажите реальный путь.
node render.mjs timeline YOUR_PROJECT
node render.mjs frames YOUR_PROJECT --per-scene 3
node render.mjs all YOUR_PROJECT --draft --concurrency 1
node render.mjs qa YOUR_PROJECT --draft
# При сбое: исправить причину, повторить конкретный этап; не удалять output.
node render.mjs scenes YOUR_PROJECT --draft --concurrency 1
```

Для самостоятельного тестового проекта с новым уникальным ID:

```powershell
node render.mjs smoke major-review-001 --extended --voice none
# Либо сначала --plan-only, затем frames/all для полученного проекта.
# С TTS отдельный уникальный проект и существующая рабочая voice configuration.
node render.mjs new major-materials-001 --format documentary --topic 'МОЯ ТЕМА' --duration 60 --voice none --materials 'C:\path\package.json'
node render.mjs all major-materials-001 --draft --concurrency 1
```

Whisper **только если хотите явно скачать** модель и сеть разрешена:

```powershell
node render.mjs models fetch whisper-tiny --allow-download
node render.mjs doctor
# Или WHISPER_MODEL_PATH на полный существующий каталог. Без модели — не aligned.
```

Optional DOM проверка (не нужна пользователю для работы приложения):

```powershell
# из engine
npm install --prefix ../.cache/major-dom --no-audit --no-fund jsdom@22
node tests/studio-dom.mjs
```

Реальные PNG/contact sheet из output/ID/frames нужно просмотреть на трёх аспектах:
лица/ступни/подписи/субтитры/дерево/карта, движения камеры и непрерывность; MP4
прослушать. Только после этого можно подтверждать визуальное качество.
