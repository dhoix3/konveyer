# Фаза 4 — форматы и публикация

## Проверено запуском

- npm test: PASS, включая новые tests/formats.mjs и tests/speech.mjs и все старые suites.
- typecheck, node --check, textnorm --self-test (14/14), git diff --check: PASS.
- «Рюриковичи»: новый проект, research → timeline → QA: **120 s, 14 сцен, 25 claims**,
  все краткие реплики прошли новую fidelity-проверку; 0 ошибок, 2 явных предупреждения.
- Экспорт 16:9 / 9:16 / 1:1 в раздельные пути; размеры/metadata/safe-zone проверены,
  исходный project.json не изменяется. В evidence — планы каждого формата.
- Обложка, главы/таймкоды PUBLISH.md, SVG превью и субтитры создаются без Chrome.
- Настоящее извлечение кадра FFmpeg и embedding в cover протестированы **на тестовом
  видео из синтетического PNG**, а не на фильме движка.
- `smoke --plan-only`: 3 сцены, 18 секунд/432 кадра, map/timeline/tree; 0 ошибок,
  предупреждения об оценочном timing, factual review и отсутствии close shot.

## Windows smoke

Из engine, при уже работающих локальных Python/numpy/Piper/Denis/Chrome:

```powershell
node .\render.mjs smoke win-smoke-01
```

Готовый драфт: `..\output\win-smoke-01\DRAFT.mp4`, concurrency=1. Имя должно быть
новым; существующий проект не перезаписывается. 18 секунд — плановый бюджет,
измеренная речь Piper может увеличить длительность. Ещё варианты:

```powershell
node .\render.mjs smoke win-smoke-vertical-01 --aspect 9:16
node .\render.mjs smoke win-smoke-silent-01 --voice none
node .\render.mjs smoke win-smoke-plan-01 --plan-only
```

Документация форматов/путей: docs/EXPORTS.md.

## Не проверено

Doctor exit 1: в sandbox отсутствуют numpy, Piper/Denis, Chrome. **Не созданы и
не заявлены** настоящий двигательский MP4, Piper WAV, визуальный lip sync, читаемость
портретных кадров и подтверждение работы Windows. Нет сетевой проверки источников
или загрузки моделей. Слова без предоставленной разметки energy-estimated, не ASR.

Все SVG в этой evidence-папке — **SCHEMATIC**, не реальные кадры. Реальная обложка
будет создана publish-командой после появления соответствующего FINAL/DRAFT.mp4.
Автокадрирование следует основному актёру; многоперсонажный художественный монтаж
не обещан. Исходный WORLD сохранён как пространство рисования, не выходной размер.
Фазы 5–8 не начаты; push не выполнялся.

## Перенос

phase3/patches применяются к 8420179 (принятая фаза 2), затем phase4/patches к
результату фазы 3. Это git format-patch --binary; `git am .../*.patch` по порядку.
Списки файлов: CHANGED_FILES.txt каждого этапа. Не применять поверх локальных
изменений автоматически — использовать чистую рабочую копию для сверки.
