# Koveyer Dhoix'a

Локальная студия сценарного и серийного производства: художественные проекты,
учебные документальные разборы и стилизованные реконструкции. Новый режим
сосуществует с прежними проектами «что если». Текущий сценарист — **правиловый**,
визуал — **SVG-анимация**, не универсальная нейросетевая киногенерация.

Существующий экспорт: **1920×1080 / 24 fps / H.264 + AAC MP4**, либо draft 960×540.
Подробности нового производственного процесса — в разделе ниже.

```
IDEA → SCRIPT → VOICE → TIMELINE → SCENES → SOUND → RENDER → FINAL.mp4
```

No paid APIs, no image/video generators. Everything is code:

| Part | Technology |
|---|---|
| Animation, backgrounds, camera, HUD | React 18 + TypeScript + **Remotion 4** + SVG |
| Video / audio processing, loudness | **FFmpeg** (the binary bundled with Remotion is used if no system ffmpeg) |
| Voices | **Piper TTS** (ONNX, offline) or your own recordings |
| Speech recognition | **Whisper ONNX** (`@huggingface/transformers`, `Xenova/whisper-tiny`), with silence-detection fallback |
| Sound design + music + mixing | **Python/numpy** procedural synthesis (no samples) |
| Orchestration | Node.js CLI (`engine/render.mjs`) + a local **web UI** (`render.mjs ui`, zero dependencies) |

## Layout

```
whatif-cine-studio/
  engine/
    render.mjs            pipeline CLI (one command per stage)
    package.json          Remotion 4 / React 18 dependencies
    src/
      char/               skeleton (FK + ground solver), action library, track compiler, faces, props, SVG character
      cine/               virtual camera (shots, pushes, pans, crane, handheld, dutch)
      bg/                 10 parallax environments + shared helpers (envs.tsx, helpers.tsx)
      fx/                 rain, snow, fog, dust, embers, grain, vignette, colour grading, key-light glow
      hud/                counters, subtitles, title card, final question, letterbox
      lib/                types, math, character + voice library
      project/            Remotion Root, compositions (Scene, Film, PoseSheet)
      v2/                 SceneRenderer – assembles one scene
    public/{backgrounds,fx,audio}
    tools/                script/story/voice/timeline/sound/qa stages, textnorm.py, local web UI (ui.mjs) + Python (tts.py, mixer.py, gen_assets.py)
    templates/            example project JSON
    models/piper/         downloaded voice models (auto)
  projects/<id>/          project.json, plan.json, timeline.json, voice/, audio/, logs/, state.json, qa_report.json
  projects/examples/      ready-made example project (demo)
  output/<id>/            scenes/*.mp4, video.mp4, FINAL.mp4, frames/*.png
  docs/                   ARCHITECTURE.md
  SKILL.md                instructions for an AI agent
```

## Requirements

* Node.js ≥ 22 (TypeScript files are executed natively by Node's type stripping), npm
* Python ≥ 3.9 with `numpy` and `piper-tts` (`pip install numpy piper-tts`)
* Linux/macOS/Windows. On Linux, headless Chrome needs system libraries (`sudo apt-get install -y libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libasound2 libpango-1.0-0 libcairo2`)
* ~4 GB RAM and 4 cores are enough. Rendering 1080p runs at roughly 4–6 frames/s on 4 cores.

## Install

```bash
cd whatif-cine-studio/engine
npm install
pip install numpy piper-tts
node render.mjs doctor          # checks everything, generates the film-grain asset
```
Piper voice models (~60 MB each) and the Whisper model are downloaded automatically on first use and then work offline.

## Quick start

```bash
cd whatif-cine-studio/engine
node render.mjs idea --lang ru                       # list ideas
node render.mjs new my-film --lang ru --duration 50 --characters 2 --music tense --topic "что если динозавры вернутся?"
node render.mjs all my-film                          # whole pipeline → ../output/my-film/FINAL.mp4
```

Or open the local web UI — no extra dependencies, no server framework:

```bash
node render.mjs ui                                   # → http://localhost:7788
```

Enter a topic (any free-text idea — the story is generated around it, templates stay optional), pick duration/language/voice/style/music, press **Создать** → **Запустить всё**, watch stage progress and the live log, then download `FINAL.mp4`.

## Commands

| Command | What it does |
|---|---|
| `doctor` | environment check |
| `ui [--port 7788]` | local web UI: create/run/monitor projects, live log, MP4 download |
| `idea [--lang] [--theme] [--count]` | generate What If concepts (template-based) |
| `new <id> [--lang ru\|en] [--duration 25-180] [--topic "…"] [--theme t] [--characters 1-3] [--voice tts\|upload\|files\|none] [--music dark_ambient\|tense\|mystery\|epic\|emotional\|lofi] [--style s] [--template auto\|freeform\|no_sleep\|gravity\|no_internet] [--force]` | build the script around the topic → `projects/<id>/project.json`; no `--topic` = template story |
| `voice <id> [--audio file] [--no-whisper] [--force]` | TTS per line, **or** analyse an uploaded recording |
| `timeline <id>` | resolve everything to numeric times → `plan.json`, `timeline.json`; runs plan QA |
| `scenes <id> [--only s01,s03] [--force] [--draft]` | render scenes (skips finished, verified ones) |
| `sound <id> [--force]` | build audio plan, synthesise, mix, duck, normalise to **−14 LUFS** |
| `render <id> [--draft]` | scenes + lossless concat → `video.mp4` |
| `final <id> [--draft]` | mux AAC audio → `FINAL.mp4` |
| `qa <id> [--plan-only] [--draft]` | full quality report → `qa_report.json` |
| `frame <id> --scene s01 --t 2.5 [--out file.png]` | render a single frame for review |
| `all <id> [--draft]` | everything, in order (per-stage log also aggregated in `logs/all.log`) |
| `list` | projects and stage status |

`--draft` renders at half resolution with a fast preset for quick iteration (outputs `DRAFT.mp4`).

### Resume, re-render, integrity

* Each stage writes status to `projects/<id>/state.json` and a log to `projects/<id>/logs/<stage>.log`.
* Each scene gets a content hash (scene JSON + cast + engine version). A scene is skipped when its hash matches, the file exists, its SHA-1 matches and its duration is right. Interrupt the render at any time and run the same command again — finished scenes are not redone; the interrupted one restarts (it is written as `*.part.mp4` and renamed atomically).
* Edit the script, run `timeline`, then `scenes <id> --only s03` to re-render just that scene (the hash changes automatically; `--force` forces it).

## Voices and sync

* Voices (`engine/src/lib/library.ts`) have gender, age range, timbre, speed, intonation, mood, accent, delivery style and a **ready-made prompt** for external voice generators. RU and EN supported. Alternative Piper narrator models can be chosen in the web UI or via `project.json → settings.voiceModels`.
* **TTS**: Piper models per language, pitch-shifted per voice so narrator/hero/friend sound different.
* **Your recording** (`voice <id> --audio narration.mp3`): FFmpeg converts it → Whisper ONNX recognises words with timestamps → script tokens are aligned with the recognised words (Needleman–Wunsch) → phrases get time intervals → the audio is cut into per-line clips → `timeline` builds scene durations around them. If Whisper cannot run, silence detection splits the recording into phrases instead. Outputs: `voice/manifest.json`, `transcript.json`, `timeline.json`.
* **Per-line files**: drop `voice/<lineId>.wav|mp3` into the project and use `--voice files`.
* Animation is anchored to speech: beats/shots/sfx use `{line, off}` so the action moves with the words.

## Sound

Music (6 moods) and ambience beds are synthesised in `tools/mixer.py`; SFX include footsteps (derived from the real walk cycle, per surface), doors, knocks, impacts, whooshes, notifications, alarms, thunder, heartbeat, risers, stings, static, power-down, etc. Music ducks −12 dB and ambience −6 dB under speech; scenes marked `silence: true` cut music and ambience (silence as a device). The final mix is loudness-normalised with two-pass `loudnorm` to −14 LUFS and verified by QA.

## Art rules enforced in code

* One skeleton for every character: fixed bone lengths, 2 arms/2 legs, joint limits → no extra limbs, detached arms or bad anatomy.
* **Ground-contact solver**: the lowest body point always touches the support surface (floor, bed, seat height); airborne only for jump/float/run/fall.
* Props rest on a named surface (`on: floor | <propId>`); `on: "air"` requires a `why`. Held props follow the hand; released props fall to a declared surface.
* Poses are blended with ease and overshoot, jumps have anticipation/landing, turns are animated.
* Camera: shots alternate wide/medium/close (auto-planned ≤ ~3.4 s), every shot moves (push, pull, pan, dolly, crane, handheld), parallax layers, letterbox bars, teal/orange or scene-specific grade, animated light, rim (contra) lighting.
* Each environment has ≥ 2 living details (listed in `bg/envs.tsx`, verified by QA) plus dust.

## Quality checks (`qa`)

Plan level: anatomy/joint limits, bone-length drift, ground contact, teleport (px/frame), jitter (acceleration), impossible speeds, prop surfaces and holds, unknown environments/props, ≥ 2 live details, shot variety & duration, line overlap, audio files present, frame sums, requested-duration drift.
Media level: resolution, FPS, codec, scene duration, **blackdetect** (empty frames), **freezedetect** (static > 4 s), final duration, audio track, loudness.

## Web UI (`node render.mjs ui`)

A single dependency-free page (`engine/tools/ui.mjs`, `node:http` only) at `http://localhost:7788`:

* **Проекты** — project list with stage status and MP4 readiness (from `state.json`).
* **Новое видео** — form: topic (free text), duration, language, characters, narrator voice, style, music, template (`auto` / freeform / classic), voice mode, project id, overwrite flag.
* **Этапы** — one button per stage plus *Запустить всё* / *Остановить* (a stage job runs as a detached `render.mjs` process — the same code path as the CLI), `draft` toggle, progress indicator.
* **Журнал** — live tail of `projects/<id>/logs/*.log`; download links for `FINAL.mp4` / `DRAFT.mp4` (HTTP Range supported).

Project data stays on disk, so CLI and UI are fully interchangeable: `node render.mjs all <id>` in a terminal does exactly what the button does.

## Troubleshooting

| Symptom | Fix |
|---|---|
| `error while loading shared libraries: libnspr4.so` | install the Chrome libraries listed above |
| `ffmpeg not found` | `npm install` in `engine/` (Remotion ships ffmpeg) or install system ffmpeg |
| `No module named piper` / `numpy` | `pip install numpy piper-tts` |
| Voice model download fails | check network; models go to `engine/models/piper/`; or use `--voice none` / your own audio |
| Whisper unavailable | falls back to silence detection automatically; or `--no-whisper` |
| Rendering is slow / out of memory | `--concurrency 1`, `--draft`; close other apps |
| `Unknown line anchor` in timeline | a beat refers to a removed line — fix the script |
| QA says *not touching the ground* | the pose needs a `seatH` that matches the furniture (bed 62, chair 80) |
| Scene does not update | run `timeline` after editing `project.json`, then `scenes --only <id>` |

## Обновление: Windows 11 / PowerShell

Работайте из `engine`. GUI остаётся основным рабочим пространством.
Перед обновлением сохраните резервную копию пользовательских `projects/`, `output/`
и настроек. Обновляйте рабочую ветку обычным fast-forward после публикации обновления;
не используйте `reset --hard` или очистку пользовательских каталогов.

```powershell
Set-Location .\engine
npm ci
npm test
npm run typecheck
node .\render.mjs doctor
node .\render.mjs ui --port 7788
Start-Process 'http://localhost:7788'
```

Если Piper уже установлен, **не устанавливайте Python, Piper или Denis повторно**.
Диспетчер ищет `piper-env\Scripts\python.exe`, `.venv\Scripts\python.exe`,
затем POSIX-окружения и системный Python. Существующие модели должны находиться в
`engine\models\piper\`, например `ru_RU-denis-medium.onnx` и
`ru_RU-denis-medium.onnx.json`. Проверка без синтеза:

```powershell
.\piper-env\Scripts\python.exe .\tools\tts.py --version
Test-Path .\models\piper\ru_RU-denis-medium.onnx
Test-Path .\models\piper\ru_RU-denis-medium.onnx.json
```

Для **новой**, ещё не настроенной установки (не существующего Piper) создайте
виртуальное окружение и установите `numpy piper-tts`; `npm ci` устанавливает только
Node-зависимости. Первый запуск отсутствующей модели по-прежнему требует сети.
Не добавляйте модели в Git.

### Chrome: без обязательного скачивания Headless Shell

Стандартные установки Chrome в Program Files, Program Files (x86) и LocalAppData
на Windows определяются автоматически. Явное указание имеет наивысший приоритет:

```powershell
$env:REMOTION_BROWSER_EXECUTABLE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
Test-Path $env:REMOTION_BROWSER_EXECUTABLE
node .\render.mjs doctor
node .\render.mjs ui --port 7788
```

Переменная должна быть задана **до запуска GUI**, так как дочерние процессы наследуют
окружение сервера. Этот путь передаётся `ensureBrowser`, `selectComposition`,
`renderMedia` и `renderStill`. Если задан несуществующий файл, приложение не пытается
незаметно скачать другой браузер. При отсутствии системного браузера используется
существующий кеш Remotion. Новая загрузка по умолчанию запрещена и разрешается явно:

```powershell
$env:REMOTION_ALLOW_BROWSER_DOWNLOAD = '1'
# Только если действительно хотите скачать браузер и сеть это позволяет.
```

### Работа через GUI

1. Введите конкретную тему (например, «динозавры вернулись в современный мир»),
   язык, 25–180 секунд, 1–3 персонажа, голос и стиль. Оставьте шаблон `авто`,
   чтобы категория не заменяла вашу тему; явный шаблон — осознанный ручной выбор.
2. Нажмите **Создать проект**, затем **Предпросмотр сценария**.
3. Нажмите **Проверить компоненты**; диагностика выводится в журнал.
4. Запустите генерацию. Статусы и журнал — фактические; искусственного процента нет.
   Одновременные задачи одного проекта блокируются и между GUI и CLI.
5. MP4 доступен во встроенном проигрывателе, по ссылке скачивания и в
   `output\<id>\FINAL.mp4` (черновик — `DRAFT.mp4`). Кнопки папок открывают
   Explorer на компьютере, где запущен сервер, а не на удалённом клиенте.

Файл MP4, сохранившийся от прежнего запуска, не доказывает успешность нового:
проверяйте статусы `final` и `qa`, время файла и журнал. GUI намеренно не удаляет
старые результаты при ошибках. Сервер предназначен для доверенной локальной сети;
не публикуйте порт в открытый интернет.

### Повторный запуск и диагностика

```powershell
node .\render.mjs voice my-film --force
node .\render.mjs timeline my-film
node .\render.mjs scenes my-film --only s03 --force --concurrency 1
node .\render.mjs sound my-film
node .\render.mjs render my-film
node .\render.mjs final my-film
node .\render.mjs qa my-film
```

После изменения текста или голоса сначала выполните `voice`, затем `timeline`.
Устаревший TTS-манифест вызывает понятную ошибку, а не подстановку прежней речи.
Изменение `project.json` также делает новый план неактуальным. Старые планы без
поля fingerprint читаются для совместимости; рекомендуется перестроить их.
Пересэмплированный звук кешируется по содержимому WAV, не по дате файла.
При изменении аудио пересоберите `sound` и `final`.

Блокировка `.pipeline.lock` снимается при нормальном выходе; после аварии lock
завершившегося процесса восстанавливается при следующем запуске. Если lock повреждён,
сначала убедитесь в Диспетчере задач, что генерация не идёт, и лишь затем удалите
**только `.pipeline.lock`**, не проект. Кнопка остановки на Windows использует
`taskkill /T /F`, чтобы завершить также Python/FFmpeg/Chrome; готовые файлы остаются.

Логи: `projects\<id>\logs\`; состояния: `state.json`; QA: `qa_report.json`.
На 8 ГБ RAM сохранён один render worker по умолчанию. Увеличение `--concurrency`
может привести к нехватке памяти. Не запускайте много разных проектов одновременно.

### Что проверяют тесты

`npm test` запускает `runtime.mjs`, прежние 30 планов/28 видов реквизита/CRLF и
матрицу тем. Runtime-тесты проверяют поиск Chrome (Windows-пути моделируются),
реальный `ensureBrowser` без загрузки и запуска фиктивного тестового файла,
инвалидацию TTS-кеша, ошибки подготовки Piper, настоящее пересэмплирование FFmpeg,
блокировку CLI, GUI API, JSON, защиту запуска, предпросмотр и Range-запросы.
Тестовые файлы изолированы и удаляются только из созданных тестом каталогов.

**Это не замена локальному end-to-end тесту:** требуется установленный Chrome,
Piper/Denis и numpy. Создайте отдельный проект с темой про динозавров, выберите
25 секунд и TTS, запустите всё, прослушайте реплики, проверьте губы/субтитры,
длительность и QA. В среде агента этих бинарных компонентов нет.

## Koveyer Dhoix'a: производственные проекты

Новый режим — универсальный производственный **каркас**, а не универсальный LLM.
GUI предлагает название, подробную идею, формат, жанр, язык, длительность,
персонажей, стиль и тип повествования в трёх группах. Существующие CLI-команды
без `--format` остаются совместимым legacy-режимом «что если».

Новый provider `local-rules-v1` строит редактируемый драматический план. Он не
понимает произвольный замысел как языковая модель: ввод сохраняется, но развитие
по умолчанию обобщённое. Перед рендером используйте предпросмотр и, при
необходимости, отредактируйте `project.json`. Речь не сокращается молча:
слишком длинный сценарий вызывает сообщение с необходимой длительностью.
В этой версии диапазон — 25–180 секунд **на фильм/эпизод**.

```powershell
Set-Location .\engine
npm ci
npm test
npm run typecheck
node .\render.mjs doctor
node .\render.mjs ui --port 7788
```

### Фильм и продолжение

```powershell
node .\render.mjs new terra --format fiction --name 'Terra' --topic 'Возвращение динозавров' --genre fantasy --duration 90 --characters 3
node .\render.mjs new terra-next --format fiction --name 'После Terra' --topic 'Новая экспедиция' --continue-from terra --duration 90
node .\render.mjs all terra --draft --concurrency 1
```

Продолжение сохраняет состав и внешность персонажей исходного проекта, переносит
его финальную реплику/исход как контекст и не изменяет исходный проект.
Персонажи — стабильные стилизованные SVG-модели, **не** фотореалистичные актёры.
В новых фильмах все выбранные персонажи участвуют в сценах и имеют реплики.
Жанры: `drama`, `science`, `history`, `disaster`, `fantasy`, `post-apocalyptic`.
Типы повествования: `chronological`, `investigation`, `character`.

### Документальный разбор и учебная реконструкция

Форматы `documentary` и `reconstruction` не генерируют даты, места и цитаты из
знаний модели. Без материалов получится явно обозначенная исследовательская
заявка, не фильм с установленными фактами. Вымышленный и документальный режимы
разделены; графика реконструкции обозначается как условная.

Создайте UTF-8 `materials.json`:

```json
{
  "sources": [{"id":"s1","title":"Название источника","url":"https://example.org/report"}],
  "claims": [
    {"text":"Утверждение, внесённое автором","date":"Дата из источника","place":"Место из источника","status":"supported","sources":["s1"]},
    {"text":"Предположение автора","status":"hypothesis","sources":[]}
  ]
}
```

`example.org` — пример формата, не реальный источник события. `supported`
означает ссылку, предоставленную пользователем, **не независимую проверку**.
`hypothesis` и `unknown` получают отдельные словесные обозначения.
Порядок `claims` задаёт хронологию автора; даты не угадываются и не сортируются
эвристикой. Режим investigation сначала показывает подкреплённые утверждения.
Причины, последствия и географию нужно внести в материалы самостоятельно.

```powershell
node .\render.mjs new archive --format documentary --name 'Архив' --topic 'Разбор события' --materials .\materials.json --duration 180
```

GUI принимает тот же JSON в разделе материалов. Источники сохраняются в
`project.json → references`, утверждения/ссылки и их статус — в брифе и репликах.
Ссылки автоматически не загружаются. Обязательно проверьте материалы перед
публикацией; графическая реконструкция не является историческим свидетельством.

### Сезоны и эпизоды

```powershell
node .\render.mjs new expedition --format series --name 'Экспедиция' --topic 'Возвращение динозавров' --episodes 3 --season 1 --duration 90 --characters 3
node .\render.mjs all expedition-e01 --draft --concurrency 1
node .\render.mjs all expedition-e02 --draft --concurrency 1
node .\render.mjs episode expedition --episode 2 --force
```

`projects/expedition/` — контейнер сезона (`project.json`, `series.json`),
`projects/expedition-e01/` … — самостоятельные проекты с отдельными WAV, планами,
кешем и экспортами `output/expedition-e01/DRAFT.mp4` или `FINAL.mp4`.
Контейнер не рендерится как эпизод. В GUI выберите отдельный проект серии.
Кнопка «Пересоздать эпизод сезона» применима к выбранному контейнеру и требует
подтверждения. Она сбрасывает сценарий/статусы только этой серии, а не соседей.

Состав персонажей одинаков во всех эпизодах. Сохраняются сюжет сезона, номер,
снимок предыдущих событий и история персонажей. Это детерминированная схема
арки, а не полноценная автоматическая драматургия. Если вы вручную изменили
исход серии, последующие context snapshots **автоматически не переписываются**.
Для другого сезона задайте новый id и `--season 2`. Сезон не перезаписывается
целиком через `new --force`; максимальное число серий — 12.

### Архитектура расширения

- `production.mjs`: нормализация брифа, источники, provider contract, сцены,
  обязательное участие cast, жанровые профили и бюджет речи.
- `series.mjs`: хранение контейнера, независимые эпизоды и регенерация с lock.
- `script.mjs`: совместимый адаптер нового provider и прежний генератор.
- Старые timeline/voice/sound/Remotion/FFmpeg продолжают работать с тем же
  проектным форматом. Дополнительное поле `production` не ломает старые JSON.

Будущий LLM должен реализовать `generate(brief) → {beats, notes}`; каждый beat
содержит `text`, индекс роли `role` и, при необходимости, `evidence`.
Результат проходит те же проверки структуры/тайминга. Подключения LLM сейчас нет.
Жанровые профили меняют локации/камеру/цвет/музыку, но не создают буквальные
изображения динозавров или исторических объектов.

### Реальная проверка этой итерации

Создан тестовый `output/transform-render/DRAFT.mp4`: 960×540, 24 fps,
25.083 с, H.264/AAC, 602 кадра; полное декодирование FFmpeg прошло.
Режим — **без речи**, с процедурной музыкой и атмосферой; финальная громкость
измерена около −14.01 LUFS. Использован временный Linux Chromium и отдельный
numpy; пользовательский Piper/Denis не переустанавливался.
Это не подтверждает TTS-синхронизацию, реальный Windows Chrome или финальный
1080p-рендер. Первая попытка браузера показала отсутствие libnspr4/libnss3;
для проверки использованы временные библиотеки из npm-пакета Chromium.
В Windows эта Linux-настройка не нужна: используйте существующий Google Chrome.

Дополнительно экспортированы два настоящих отдельных эпизода:
`output/transform-season-e01/DRAFT.mp4` и `output/transform-season-e02/DRAFT.mp4`.
Оба — 25.125 секунды, 603 кадра, 960×540 H.264/AAC, без речи, около −14.01 LUFS;
QA и полное декодирование FFmpeg прошли. Подробный отчёт — `DIAGNOSTICS.md`.

### Офлайн-документалистика V2

`new <id> --format documentary --genre history --topic "Рюриковичи" --duration 120`,
затем `research <id> --topic "Рюриковичи"`, `timeline <id>`, `qa <id> --plan-only`
(из `engine/`). Пакет: 25 claims, источники и обязательная ручная проверка.
Без подходящего пакета research создаёт честный пустой офлайн-шаблон.
Подробности, формат знаний и ограничения: [DOCUMENTARY](docs/DOCUMENTARY.md).
Переносимые результаты фазы 2: `handoff/phase2/`.

### Sound-driven speech and multi-format export

- `voices` / `voices --download ru-narrator` / `voices --preview ru-narrator`:
  local Piper role registry; downloads only on a synthesis/download request.
- `timeline` analyses actual voice audio into a 20ms mouth envelope; supplied word
  times/phonemes are optional. Without alignment, word times are **energy-estimated**.
- `subtitles <id> --strict`: SRT/VTT/ASS and overflow/reading-speed checks.
- `export <id> --aspect 9:16` (also 16:9, 1:1): isolated plan/publication package;
  add `--render --draft` only when dependencies and voice are ready.
- Windows: `node .\render.mjs smoke win-smoke-01` from engine produces an 18s draft
  with map/timeline/tree (estimated until local audio is measured), concurrency 1.

See [formats and smoke](docs/EXPORTS.md), [phase 3 report](handoff/phase3/REPORT.md).

### Ensemble and scene editor (phases 5–6)

- Library: 27 common-skeleton characters, body/age/hair/headwear presets, 20
  historical environments total, background crowd, new transitions and audio moods.
- Windows extended draft: `node .\render.mjs smoke win-ensemble-01 --extended`
  (new id; add `--plan-only` to inspect without Chrome/Piper).
- GUI: `node render.mjs ui --port 7788` → select project → Scene editor; edit
  dialogue/duration/environment/cast/camera, undo/redo, see scene QA and estimates.
- Documentary wizard: topic/materials → editable claims table → script preview →
  save → render. See [scene editor](docs/SCENE_EDITOR.md).
- Local Whisper word times use status **aligned**; unavailable/mismatched output
  falls back to **energy-estimated**. No ASR model network download is implicit.

Verified API/structure and synthetic audio tests are not visual approval of a film.
Portable patches, changed-file lists and limitations are in `handoff/phase5/` and
`handoff/phase6/`.

### Measurements / local model / Windows diagnostic (phases 7–8)

`node render.mjs --profile <id>` measures real still samples; add
`--profile-all-frames` for every frame, or use `all <id> --profile` for pipeline
stage/scene wall time and slow video frames. No static prerender is enabled.
`llm <id> --provider llm-local --llm-model <name>` opts into a loopback-only
Ollama/OpenAI adapter with strict JSON and repair/QA; default remains rules.
`node render.mjs selfcheck` creates a diagnostic directory + ZIP under output/;
missing dependencies produce an explicitly incomplete bundle, not fake frames.
Details: [profiling, local LLM and selfcheck](docs/PROFILE_LOCAL_LLM_SELFCHECK.md).
Final catalog: **19 general + 20 historical environments, 10 styles, 10 moods**.
