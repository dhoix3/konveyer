# Koveyer Dhoix’a

Офлайн-first конвейер стилизованной SVG-анимации на **Node.js + Remotion + Python +
FFmpeg**: «что если», fiction, documentary/reconstruction, сезоны. Это не система
фотореалистичных актёров и не универсальный генератор визуальных объектов.

**Статус перед PR:** фазы 0–8 реализованы с ограничениями проверки. Тесты/планы/API
проверяются отдельно от настоящего MP4. В текущей среде нет Chrome/Piper/Denis и
моделей Whisper/LLM: реальный рендер, качество речи и визуальная приёмка **не
подтверждены**. [Диагностика](DIAGNOSTICS.md), [самоаудит](docs/AUDIT_V2.md),
[известные пробелы](docs/KNOWN_GAPS.md), итоговая передача: `handoff/final/`.

## Требования и установка

- Node **≥22**; CI-конфигурация — Node 22/24. Целевой Windows Node 26 требует
  отдельной локальной проверки. Зависимости фиксируются package-lock.json.
- Python 3 с NumPy для mixer/assets; Piper и существующие голосовые модели для TTS.
- Google Chrome (или явно выбранный executable), FFmpeg + FFprobe.
- На Windows 11 / i3 / 8 ГБ начать с draft и `--concurrency 1`. Скорость и достаточность
  RAM не гарантируются: используйте измерения, а не прежние оценки fps.

```powershell
cd engine
# Не скачивать optional native ONNX runtime при установке зависимостей:
$env:ONNXRUNTIME_NODE_INSTALL = 'skip'
npm ci
npm test
npm run typecheck
node .\render.mjs doctor
node .\render.mjs ui --port 7788
```

Не переустанавливать работающий пользовательский Piper/Denis. `setup.ps1`, `start.bat`
и `doctor --fix` — вспомогательные инструменты поиска/запуска, не обещание успешной
установки всего окружения. `doctor --fix` сохраняет local-environment.json, не модели.
Python ищется в существующих окружениях и PATH; пути видны при DEBUG=1.
На Linux Chrome дополнительно требует системные библиотеки (NSS/NSPR/GTK/GBM и др.).
При пропущенном ONNX native runtime реальный inference нужно проверять отдельно.

Chrome: `$env:REMOTION_BROWSER_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'`.
Неявное скачивание Chrome запрещено; `REMOTION_ALLOW_BROWSER_DOWNLOAD=1` разрешает
его явно. Piper может загрузить недостающую модель при явном запросе синтеза или
`voices --download`; `WHATIF_OFFLINE=1` запрещает такую загрузку. Whisper всегда
local-only. Никогда не коммитить модели, окружения, пользовательские фильмы/секреты.

## Конвейер

```text
idea → project.json → voice/manifest.json → timeline/plan.json
                                      → scenes → sound → render → final → qa
```

Из `engine/`, с новым project id:

```powershell
node .\render.mjs new my-film --topic 'что если динозавры вернутся?' --duration 45 --characters 2
node .\render.mjs timeline my-film
node .\render.mjs qa my-film --plan-only
# Только при готовых компонентах, после редакторской проверки:
node .\render.mjs all my-film --draft --concurrency 1
```

Без `--format` сохраняется legacy «что если»; template auto/freeform/no_sleep/gravity/
no_internet. На фильм/эпизод **25–180 с**, production cast **1–3**; отдельный
исторический research-provider строит расширенный cast, не ограниченный этой формой.
Слишком длинная речь не обрезается: увеличить бюджет или отредактировать материалы.
`--voice none` позволяет проверять оценочные планы, но не подтверждает липсинк/TTS.

| Команда | Назначение |
|---|---|
| `idea`, `new <id>` | Идеи, шаблон/редактируемый сценарий |
| `voice <id>` | Piper; `--audio file` — импорт записи; `--no-whisper` — без ASR |
| `timeline <id>`, `qa <id> --plan-only` | Числовой план и структурная QA |
| `scenes <id> --draft --concurrency 1` | Сцены; `--only s03`, `--force` |
| `sound`, `render`, `final`, `qa` | Микс, сборка, mux и media QA |
| `frame <id> --scene s01 --t 1` | Кадр готового плана через Chrome |
| `preview <id> --scene s01 --t 1` | Кадр временного estimated плана |
| `history <id>`, `restore <id> --snapshot project-…json` | История JSON |
| `voices`, `subtitles <id> --strict` | Реестр голосов, SRT/VTT/ASS и QA чтения |
| `export <id> --aspect 9:16`, `publish <id>` | Отдельные 16:9/9:16/1:1 планы/публикация |
| `smoke <new-id> --extended --plan-only` | Расширенный 18-секундный smoke без рендера |
| `selfcheck` | Диагностика + ZIP, неполный результат явно отмечается |

`project.json` — источник правды. После правок пересоздать voice/timeline;
проверки fingerprint/audioHash/revision отвергают устаревшее состояние. Готовые сцены
кэшируются только при совпадении fingerprint/SHA/длительности. Прерванные `.part.mp4`
не считаются готовыми. Проекты/экспорты не удаляются для «исправления» ошибок.

## Fiction и сезоны

```powershell
node .\render.mjs new terra --format fiction --topic 'Возвращение динозавров' --duration 90 --characters 3
node .\render.mjs new terra-next --format fiction --topic 'Новая экспедиция' --continue-from terra --duration 90
node .\render.mjs new saga --format series --name 'Экспедиция' --topic 'Экспедиция' --episodes 2 --duration 90 --characters 3
node .\render.mjs timeline saga-e01
node .\render.mjs episode saga --episode 2 --force
```

Rules — редактируемый драматический каркас, не понимание замысла как LLM. Сезон —
контейнер; рендерить эпизоды. Journal/recover защищают публикацию после сбоя, но это
не multi-directory ACID. `recover <season-id>` завершает незавершённую публикацию.

## Документалистика

```powershell
node .\render.mjs new rurik --format documentary --genre history --topic 'Рюриковичи' --duration 120
node .\render.mjs research rurik --topic 'Рюриковичи'
node .\render.mjs timeline rurik
node .\render.mjs qa rurik --plan-only
```

Пакет содержит **25 claims, все needsReview=true**. Библиография и disputed flags не
заменяют проверку историком. Даты/места/родословная — условная графика, люди
стилизованные. Research связывает каждую реплику с claim; неизвестная тема создаёт
пустую заявку, не выдуманные факты. Legacy materials/brief остаются совместимыми,
но не имеют всей строгости research QA: см. [DOCUMENTARY](docs/DOCUMENTARY.md).

Whisper: реальные локальные word timestamps → `aligned`, иначе явно
`energy-estimated`. RMS управляет амплитудой рта; ASR не заменяет авторский текст
субтитров и не служит источником фактов. Реальный inference пока не подтверждён.

## GUI и графическая библиотека

GUI по умолчанию **127.0.0.1:7788**. Внешний `--host` требует KOVEYER_GUI_TOKEN и
правильных Host/Origin; HTTP bearer не шифруется, LAN только в доверенной сети/TLS.
Никогда не передавать токен в URL и не открывать GUI в интернет.

Редактор сцен: реплики/минимальная длительность/локации/cast/камера/переходы,
revision+locks, history undo/redo, QA рядом со сценой. Мастер: тема → materials →
claims → preview без записи → сохранить → render. RU/EN локализует интерфейс, не
авторские факты/сырые логи. SVG preview — схема, реальный PNG требует Chrome.
[Редактор](docs/SCENE_EDITOR.md), [форматы](docs/EXPORTS.md).

**27 персонажей** на общем скелете; четыре body/age presets; волосы/головные уборы/
костюмы/массовка. **39 окружений: 19 общих + 20 исторических**. Среди общих — горы,
море, пустыня, космос, лаборатория, пещера, средневековый город, лес.
**10 выбираемых стилей** (9 явных non-default grades; renderer знает 10 grades),
**10 музыкальных настроений**. Не держать статичный план >4 с, анатомию не менять.

## Измерения и необязательная локальная модель

`--profile <id>` — 3 still-кадра на сцену; `--profile-all-frames` — все кадры.
`all <id> --profile` — стадии/сцены/slowest video frames. Wall-time, capture-time и
sampled RSS разделены. Без успешных замеров оценка рендера null. Статический
предрендер **выключен**, эталонное pixel-сравнение не выполнено.

`llm <id> --provider llm-local --llm-model <name>` — opt-in Ollama/OpenAI loopback.
По умолчанию rules. Строгий JSON + repair + структура/роли/timing/claims QA;
документальные тексты только verbatim из назначенных материалов либо неизменённые.
[Подробности профиля, LLM и selfcheck](docs/PROFILE_LOCAL_LLM_SELFCHECK.md).

## Проверка перед PR

`handoff/final/evidence/COMMANDS.md` — таблица запуска из чистого checkout итогового
HEAD; `handoff/final/APPLY.md` — Windows и применение; `PR_DESCRIPTION.md` — описание
для PR. Наличие структурной QA/тестов не означает проверку реального фильма.

## Windows quality fixes 1

After real Windows selfcheck: shared documentary safe-zones/claim footer/epoch-safe
cast, richer schematic graphics/local OFL Cyrillic font, distinct silhouettes and
medium/close coverage. `frames <id> --per-scene 3` produces real PNG stills + contact
sheet through your Chrome; `models fetch whisper-tiny` requires explicit download
permission. `all` logs measured/historical draft/final timing estimates. **No new
visual results claimed in the sandbox**. Commands/licensing/limits: [FIXES_1](docs/FIXES_1.md).
