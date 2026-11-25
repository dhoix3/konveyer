# Universal phase1 — ЧАСТИЧНО: offline make / доверие / GUI review

Parent: phase0 (16a9d71 + corrective type metadata commit53758f1).
Сетевая часть фазы1 и все фазы2–7 НЕ реализованы. Не переходили к фиктивным
ассетам/сценариям/корпусу вместо завершения строгой последовательности фаз.

## Проверяемая реализация
- `make TOPIC`: id generation/no overwrite,9 format intents,ru/en,25–180sec,
  explicit JSON materials, profile с объяснением, sensitivity/era/null geography.
- Factual without materials → unverified-draft outline, **не выдуманные факты**.
  Creative → existing fiction rules. Verified without materials fails before project write.
- networkAllowed=false; auto-research явно отказан без сети. --allow-network не
  притворяется действующим переключателем. Нет загрузок, источников или web результата.
- Existing final/publish gate + GUI all/final422; draft preview allowed. Factual
  требует manual review+quote+source. Explicit --accept-unverified не меняет claims
  на verified и не обходит invalid quote links/обязательный disclaimer.
- Sensitivity profile health/law/finance/politics с русским/английским disclaimer;
  final блокируется до наличия disclaimer в репликах. Не заявляется экспертная
  диагностика, advice moderation или полноценный safety classifier.
- GUI opt-in universal input использует текущую форму topic/duration/lang/materials;
  отдельный read/review panel показывает quote/title/url/status и confirm/reject.
- Review требует current revision+lock, exact quote из referenced source excerpt;
  rejected claims не удаляются, остаются заблокированными до правки.
- Legacy projects без production.universal не получают новых export блокировок;
  schemaVersion/CLI/cache/locks/голоса/модели/anatomy не переписываются.
- QA выводит mode и warnings о pending materials/disclaimer.

## Проверено запуском
- npm test (16 entrypoints): PASS, evidence/npm-test.log.
- npm run typecheck: PASS, evidence/typecheck.log.
- node --check render/tools/tests и py_compile: PASS, evidence/syntax.log.
- optional JSDOM реальный HTTP: PASS, evidence/studio-dom.log. Existing form → make
  endpoint → load exact quotes → confirm → persisted reviewed; не screenshot test.
- CLI isolated make/outline/timeline/plan QA; creative; verified/no materials rejection;
  no overwrite; unsupported-auto rejection; final/publish blocking; explicit bypass;
  mandatory disclaimer not bypassed; stale revision rejection; confirm/reject state.
- Live HTTP tests: make canonical package + review, GUI final returns422 before spawn.

## Не проверено / не сделано
- Нет web fetch/provider и поэтому нет тестов SSRF/DNS/redirect/robots/cache/replay/
  MIME/rate limits. Не выдавать отсутствие вызовов сети за проверку этих механизмов.
- Нет реального live-check, providers, BM25,2-domain independent support/disputed,
  licenses/short-quote selection, URL/TXT/PDF/DOCX parsing. Только explicit JSON package.
-9 formats пока intent metadata, не9 новых сценаристов; creative качество унаследовано.
- Нет автоматического disclaimer writing/вставки, поэтому sensitive final требует
  ручной правки сценария. Полная universal safety/readiness/GUI — будущие фазы.
- Нет Chrome/PNG/MP4/прослушивания/Piper/Whisper inference/Windows11/RAM benchmark.
- Mode gate затрагивает final/publish и GUI launch, но не обещает durable job scheduler.
- Source quotation source data никогда не исполняются; новых LLM prompts нет.

Сеть по умолчанию OFF, WHATIF_OFFLINE сохранён; web implementation отложен, а не
добавлен с опасным private-IP обходом ради «работающего» демо.

Команды/точный статус: docs/UNIVERSAL.md. Изменения небольшими коммитами, phase
patches + filelist. Новых push/PR/merge не выполнялось.
