# Fixes 1 — проверено / не проверено

Основа: актуальный origin/main **42a25b78517a4c1b2f5fee091cbe35f5b3f422fc** (PR4 merged).
Текущая ветка arena/348fe030-konveyer сохранена. Восстановленные файлы побайтно
сверены с main; после углубления shallow history выполнен fast-forward, без reset,
ветвления, удаления пользовательских данных, push или переписывания истории.

## Проверено запуском

| Запрос | Исправление / проверка |
|---|---|
| A: слои | Общий documentaryLayout для header/graphics/actors/footer/subtitles; попарный bbox test16:9,9:16,1:1. Full-height fit главного героя, uniform scale, ноги не под footer. В close/medium тело намеренно кадрируется отдельным viewport, а не закрывается плашкой. Documentary letterbox отключён. |
| B: плашка | Current line claim → person/date/status/source; нет cast list/УчастникN. Dates — даты claim, не выдуманные годы жизни. Для старых plans с knowledge renderer тоже выбирает claim, timeline обновляет subjects без изменения project. |
| C: эпоха | Только именованные персоны из scene line claims + anonymous roles с era сцены. Тест911+ИванIV отклонён, даже если обе персоны добавлены в claims. Явно маркированная retrospective допускает сравнение. |
| D: графика | Данные5 городов, Балтика/Ладога/Днепр/Чёрное море, условный animated route;9 timeline ticks/current marker;4 tree nodes/3 parent-child edges, dates из материалов, highlight при наличии героя в московской ветви. Данные/типизация проверены, не визуальное качество. |
| E: font | NotoSans variable кириллица2049096bytes, OFL.txt, SHA/source; local FontFace load awaited. cmap тест А/я/Ё/ё; никаких network fonts. Min28 native px в1080, в draft960×540 соответственно14px. |
| F: костюмы/действия | Торс costumes шире, tunic/cloak/chainmail/robe, борода/волосы/шапка; full-body Costume PoseSheet option. Bone/feet fit tests27library+research cast,4actions×4times×3aspects. Mode-directed point/type-with-held-scroll/wave/think вместо idle line-up. Скелет/лимиты не изменены. |
| G: камера | Medium/close в генерации коротких сцен и QA на каждые3; targeted focus текущего героя, uniform doc viewport. Новый smoke QA без no-close warning. |
| H: Whisper | models fetch whisper-tiny без --allow-download: exit1,0network calls; explicit consent required. Doctor assets/fallback+project alignment report; локальный fetch path автоматически выбирается. Docs manual copy layout. Реальный download/inference НЕ запускался. |
| I: frames | per-scene1–8, default3 first/middle/last, Chrome PNG + labelled PNG contact sheet, isolated timestamp output. Тест missing Chrome даёт exit1 и не создаёт output frames. |
| J: время | all пишет render-estimate.json и лог; local historical scene timings при наличии. Иначе user-observed draft0.35s/frame; final только явно UNMEASURED x4 extrapolation. Проверена арифметика и реальный all failure path. Оптимизаций не включали. |

- npm ci с ONNXRUNTIME_NODE_INSTALL=skip: PASS (не тест native ONNX).
- **npm test, npm run typecheck, node --check, py_compile: PASS**.
- Полный прежний набор включает legacy/fiction/series/120s research/editor/ASR fallback.
- Extended smoke --plan-only: PASS,18s/432frames, no-close warning отсутствует.
- Doctor: exit1 из-за отсутствующих Chrome/Piper/NumPy основного sandbox окружения.
- Frames: exit1, явно Chrome not found; PNG/contact sheet здесь не созданы.
- Models fetch без согласия: exit1 с инструкцией; ничего не загружено.
- Isolated all --draft: estimate записана, затем exit1 на принудительно отсутствующем
  Chrome. Это НЕ успешный all/render. Пользовательский Piper/проекты не менялись.
- quality-data.json — числовые layouts/cast/actions/shots/QA для120s, rendered=false.

Для120s/2880frames draft на предоставленном вами0.35≈1008s (16m48s). Final без
собственного замера≈4032s (67m12s) ТОЛЬКО pixel-area гипотеза; не результат sandbox.
Реальная скорость после новых кадров/источника может отличаться; TTS/mix/mux/QA вне
оценки. Static prerender по-прежнему OFF, pixel-equivalence не выполнялась.

При тестировании найден elbow overshoot на переходе think→point; правила анатомии
не ослабляли: в этих коротких сценах оставлено одно содержательное gesture действие
на актёра, без проблемного перехода. Все прежние bone/pose QA после этого PASS.

## Не проверено (нужен Chrome / локальные компоненты)

- Фактическая читаемость typography/размещение текстовых подписей внутри SVG,
  карт/маршрута/таймлайна/древа/источников/субтитров, portrait/square. Непересечение
  зон не является доказательством отсутствия всех текстовых пересечений внутри панели.
- Реальный full-body Costume PoseSheet, впечатление пропорций/силуэтов/жестов,
  видимость secondary cast/бумаги, смена планов и естественность крупных кадров.
  Это стилизованное письмо/жесты, не отдельная новая анимация пера/поклона.
- Рендер PNG и contact-sheet positive path на Windows Chrome; здесь проверен
  отказ, metadata/композиция типизированы, но не создавался фиктивный PNG.
- Реальная загрузка/состав upstream моделей/native ONNX и Whisper inference:
  local-assets-ready не aligned. ASR статус проверяется после voice на вашей машине.
- Денис/TTS/прослушивание, Windows install/Chrome, точность ETA/пиков памяти наi3.
- Исторические claims всё ещё needsReview=true; карта/люди условны. Даты дерева
  получены из claims, не добавлены новые даты жизни/правления в обход материалов.

## Применение и проверка Windows

Патчи patches/*.patch применять по имени поверх main42a25b7, не поверх своих правок;
сначала сравнить в отдельной копии. CHANGED_FILES.txt/SHA256SUMS рядом. Старые пакеты
фаз0–8 заново НЕ применять. Никакого push в этом проходе.

Полные команды и OFL/ручная модель: docs/FIXES_1.md. Главный цикл на новом id:
new quality-rurik --format documentary --topic Рюриковичи --duration120 --voice none
→ research → timeline → qa --plan-only → frames quality-rurik --per-scene3.
Флаги в реальных командах пишутся с пробелами (см. точные команды docs).
После ваших PNG можно оценить художественный результат; здесь он не одобрен.
