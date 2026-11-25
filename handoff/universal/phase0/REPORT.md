# Universal phase0 — документальная композиция

Base: main6ef9288. Ветка Arena сохранена. Skeleton/IK/anatomy/voice models не менялись.

## Сделано
- Semantic selector без входа scene index: родство→tree, пространственное событие
  с данными→map, датированное событие→timeline; иначе evidence с честной пометкой.
  selectionReason записывается в проект. QA больше не требует неподходящие режимы.
- Timeline события содержат текст claim, а не только place; даты не придумываются.
- Source titles/shortTitle и needsReview передаются через builder, timeline и active
  subject в renderer; старые plans с knowledge тоже разрешают IDs в названия.
- Badge «по источнику · не проверено» по умолчанию; ручной needsReview=false явно
  отличается. Это не независимый фактчекинг.
- Полноэкранный слой окружения под полупрозрачной графикой; групповой fit всех
  актёров на общих планах;1–2 anonymous supporting роли (при нескольких named claims
  сохраняются нужные персоны, всего до3 актёров). Close планы всё ещё focus portrait.
- Дерево4 узла: topological order, ортогональные линии в отдельном gutter, не через
  карточки/текст. Общие ветви могут разделять junction/проекцию; произвольные большие
  DAG не заявлены. Материалы хранятся полностью, показывается fragment≤4.
- Переносы шапки, три строки footer в disjoint safe zone. Длинные подписи могут
  сокращаться с многоточием; нельзя считать это проверкой реальных font metrics.
- Smoke теперь использует spatial claim Олега вместо договора, чтобы map/timeline/tree
  выбирались семантически, а не насильно ради теста.

## Проверено запуском
- npm test: PASS (все legacy suites + новый phase0).
- npm run typecheck: initial active-subject source metadata type error found; fixed
  by additive optional knowledge sources/needsReview typing. Re-run PASS.
- node --check / Python compile: см. evidence/syntax.log.
- Новый universal-phase0: смысл/причина выбора, событие/название источника/review,
  cast/support, orthogonal tree segments вне карточек, heading/group fit в3 аспектах.
- New generic unknown-date fixture теперь ожидает evidence вместо фиктивного timeline.

## Не проверено
Chrome/MP4/Windows/Piper/визуальная читаемость/настоящее фоновое окружение/динамическая
камера. Никакой сети в фазе0 не добавлено. Не заявляется фактическая верификация.

## Windows
Из engine после установки зависимостей и с существующими Chrome/Piper:
`npm test`; `npm run typecheck`; `node render.mjs smoke universal-p0-001 --extended --plan-only`;
`node render.mjs frames universal-p0-001 --per-scene 3`.
Для9:16/1:1 сначала export ID --aspect VALUE, затем frames ID --aspect VALUE.
Новый уникальный ID, не удалять working projects/output/models. Сеть не требуется.

Новый большой ТЗ пока не завершён: фазы1–7 отдельно в docs/UNIVERSAL.md.
