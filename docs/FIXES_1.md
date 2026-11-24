# Fixes 1 — качество документальных кадров после Windows selfcheck

Основа: main после PR #4, commit42a25b7. Текущая ветка сохранена; новых больших
подсистем/оптимизаций нет. Здесь не заявляется визуальный результат: Chrome в sandbox
нет. Ваш успешный Windows Chrome/Piper не переустанавливать.

## Что изменено / что проверить глазами

- Единая pixel-layout (`src/doc/layout.ts`) используется графикой, actor viewport,
  плашкой и субтитрами. Header3–11%, body13–73%, footer76–84%, subtitles86–97% высоты.
  В landscape графика слева, персонажи справа; в portrait/square — друг под другом.
  Documentary letterbox выключен: прежде он мог перекрывать нижние строки.
  Проверены bbox-пересечения всех пяти зон 16:9/9:16/1:1 и uniform full-body fit.
  Close/medium намеренно кадрируют тело внутри actor viewport, но footer не
  перекрывает этот viewport. Wide — полный рост главного героя. Элементы secondary
  cast у края могут кадрироваться: проверить композицию на кадрах.
- Плашка берёт имя/дату/status/sources **текущей реплики из claim**, не список cast.
  Нет подтверждённых дат жизни в materials — не изобретаем: badge показывает дату
  утверждения, дерево — даты соответствующих claims, **не жизни/правления**.
  «Участник N»/Ensemble N и legacy cast-списки на экран не выводятся.
- В новом research named cast — только персоны claims сцены; поддержка — анонимные
  дружинник/летописец/горожанин с era сцены. QA ловит постороннюю персону и смешение
  epoch без явной маркировки ретроспективы. Отдельный тест treaty911 + ИванIV.
  Ретроспективная родословная — графика, не причина населять раннюю сцену ИваномIV.
- Карта: Балтика/Ладога/Днепр/Чёрное море,5 городов, анимированный **условный** путь.
  Он не выдаётся за маршрут конкретного похода; границы не геодезические.
  Timeline:9 засечек, движение маркера к событию и выделение текущей даты.
  Tree:4 узла/3 parent→child связи, dates только из пакета, highlight героя ветви.
  Имена/даты для schematic genealogy остаются под needsReview пакета. Hero вне
  московской линии может не иметь выделенного узла (это не подмена героя).
- Локальный Noto Sans с кириллицей, SIL OFL1.1, без runtime-сети; ожидание font.load
  перед кадром. Все graphic fonts масштабируются к min28 native px в1080 output.
  На draft960×540 это соответственно min14 px, не28. Плотность подписей/переносы
  всё ещё требуют реального review: bbox-зоны не доказывают readable typography.
- Костюмы шире/отличимее по силуэту (tunic/cloak/chainmail/robe), волосам, шапке,
  бороде. Масштаб равномерный, кости/solver/limits неизменны. PoseSheet умеет режим
  четырёх костюмов в полный рост; он пока не отрендерен в этой среде.
- Действия по graphic mode: point (map), type как условное письмо (timeline), wave
  (tree), supporting think; не строй из idle. Это стилизация действий, не буквальная
  реконструкция письма пером/поклона; контентную режиссуру надо просмотреть вручную.
- Shot plan начинается wide/medium/close циклически; даже короткие сцены получают
  крупность. QA требует medium/close минимум раз на3 сцены; «no close shots» в новом
  120s/18s smoke не появляется. Старые ошибочные касты QA теперь отвергает, не прячет.

## Windows: быстрые кадры

Из engine, используйте новый id, чтобы не перезаписать старые пользовательские данные:

```powershell
node .\render.mjs new quality-rurik --format documentary --genre history --topic 'Рюриковичи' --duration 120 --voice none
node .\render.mjs research quality-rurik --topic 'Рюриковичи'
node .\render.mjs timeline quality-rurik
node .\render.mjs qa quality-rurik --plan-only
node .\render.mjs frames quality-rurik --per-scene 3
```

`frames` использует сохранённый актуальный plan, без TTS. Выбирает first/middle/last
кадр, .5 scale (обычно960×540), сохраняет PNG и **настоящий PNG contact sheet** с
scene/frame/time в output/<id>/frames/<run-timestamp>/. Не путать со SVG storyboard.
Не изменяет project/voice/plan и не подставляет старую contact sheet после failure.
Для существующего нового плана после правок выполните timeline; старый bad cast
исправить в editor/сценарии или создать новый research project, не удаляя старый.
После выбора композиции — TTS/real timeline, затем снова frames и draft.

Для aspect: `export quality-rurik --aspect 9:16`, затем
`frames quality-rurik --aspect 9:16`; аналогично1:1. Не путать источники разных aspect.
Для костюмов (используйте тот же установленный Chrome):

```powershell
npx remotion still src/index.ts PoseSheet ..\output\quality-costumes.png --props='{"t":1,"costumes":true}' --browser-executable "$env:REMOTION_BROWSER_EXECUTABLE"
```

Если переменная не задана, передать полный существующий Chrome executable.
Chrome missing => frames завершается ненулевым exit с явным диагнозом. PNG не создан.

## Whisper: только явно разрешённая подготовка

```powershell
node .\render.mjs models fetch whisper-tiny
# Первая команда НИЧЕГО не скачивает; требует разрешение. Если согласны:
node .\render.mjs models fetch whisper-tiny --allow-download
node .\render.mjs doctor quality-rurik
```

Network к huggingface.co/CDN, примерно75–150MB; реальные размеры зависят от модели.
WHATIF_OFFLINE=1 запрещает даже явный fetch: для подготовки убрать эту переменную
в своём терминале осознанно. По умолчанию никакого download в doctor/render/Whisper.
Fetch сохраняет только в ignored engine/models/whisper-tiny/, не коммитит модели и
не заменяет существующие файлы. Если partial/corrupt — вручную проверить прежде чем
заменять. Local-assets-ready не равно aligned: нужен действительный inference/report.

Ручной путь без сети на рендер-машине: на подготовительном компьютере получить
Xenova/whisper-tiny (OFL шрифта НЕ является лицензией модели; проверить model card),
скопировать в engine/models/whisper-tiny/ (или WHISPER_MODEL_PATH):

```text
config.json, generation_config.json, preprocessor_config.json,
tokenizer.json, tokenizer_config.json, vocab.json, merges.txt,
normalizer.json, added_tokens.json, special_tokens_map.json (если есть upstream)
onnx/encoder_model_quantized.onnx
onnx/decoder_model_merged_quantized.onnx
```

Сохранить структуру и связанные tokenizer/config одного revision. Не переименовывать
fp32/другие decoder модели в q8 файлы. Новый путь выбирается автоматически при
наличии config либо явно `$env:WHISPER_MODEL_PATH='C:\offline\whisper-tiny'`.
WHISPER_CACHE_DIR поддерживается распознавателем; doctor проверяет файловый путь,
не гарантирует осмотр всех внешних Transformers cache layouts.
`doctor <id>` печатает assets/fallback и существующий alignment-report. После
подготовки выполнить voice/timeline на нужном project: только валидные timestamps
дают aligned; иначе остаётся energy-estimated с причиной. Native ONNX/runtime
может потребовать локальной настройки; в sandbox inference/download не проверены.

## Время без оптимизаций

`all` пишет output/<id>/render-estimate.json и лог. Приоритет: исторические локальные
seconds/frames из state.scenes отдельно draft/final. При отсутствии — ваше наблюдение
**~0.35s/frame draft960×540**, явно не наш замер. Final без своего sample — только
UNMEASURED x4 pixel-area extrapolation, не обещание скорости.

Для120s×24fps=2880 кадров: draft≈1008s (16m48s); final≈4032s (67m12s) — последний
только гипотеза. Для18s/432frames draft≈151s. Вне оценки TTS/bundle/mix/mux/QA;
старые timings могут относиться к другому source/разрешению/машине. Перемерить после
визуальной приёмки; не включать оптимизации без сравнения эталонов. Static prerender OFF.

## Лицензия шрифта

`engine/public/fonts/NotoSans.ttf` — Noto Sans variable, официальный google/fonts,
каталог ofl/notosans; copyright из OFL.txt сохранён полностью рядом со шрифтом.
SIL Open Font License1.1 позволяет встраивание/распространение с сохранением лицензии.
Файл не модифицирован; название Koveyer Sans — CSS family alias, не новое имя файла
шрифта. Binary SHA256 и URL в public/fonts/README.md. Сети во время render нет.
