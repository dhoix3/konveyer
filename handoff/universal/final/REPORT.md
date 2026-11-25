# Universal — промежуточная передача после фазы0 и части фазы1

**Не финал всего ТЗ.** Реализованы и проверены изменения фазы0 и offline доверие/
make/review части фазы1. Сетевая часть фазы1 и фазы2–7 отсутствуют. Не следует
принимать этот checkpoint за универсальный автономный видеоконвейер.

## Самоаудит

| Фаза | Статус | Файл-доказательство |
|---|---|---|
| 0: смысл графики/события/источники/композиция | выполнено на уровне данных/геометрии; visual review нет | ../phase0/REPORT.md, tests/universal-phase0.mjs |
| 1: make/profile/trust/manual review | частично | ../phase1/REPORT.md, tests/universal-input.mjs, tests/editor.mjs |
| 1: web providers/secure fetch/robots/SSRF/cache/replay | нет | --auto-research отказывает до сети; нет фиктивных providers |
| 2:9 полноценных сценарных структур/LLM expansion | нет | format пока metadata, creative использует existing provider |
| 3: ≥25 новых сред/≥80 props/≥40 персонажей/general infographics | нет | не выдаём старые каталоги за новые |
| 4: ≥12styles/≥15music/brand kit | нет | existing catalog не переписан |
| 5: comprehensive universal readiness | нет | добавлены только trust/disclaimer QA warnings/gates |
| 6: полный universal wizard/research/replanning | частично лишь make/review controls | tests/studio-dom.mjs; research/replanning нет |
| 7: corpus/master-sheet | нет | corpus не реализован |

## Проверено запуском
- npm test:16 entrypoints PASS, все старые suites + phase0 + universal-input.
- TypeScript typecheck PASS. Исходная найденная ошибка optional source typing в
  фазе0 исправлена отдельным коммитом; повторный результат сохранён.
- node --check всех render/tools/tests, py_compile Python PASS.
- JSDOM + реальный локальный HTTP: существующая форма → offline make → таблица
  дословных цитат → confirm → сохранённый reviewed; это не screenshot/layout review.
- Factual без материалов: outline, не факты; verified/no materials отвергнут;
  финальный final/publish блокируются, draft/legacy compatibility сохранены.
- Explicit CLI override не обходит неверную evidence link/quote или disclaimer.
- Sensitive final требует disclaimer **в репликах**, не только в metadata.
- Corrupt JSON/API validation/locks/history/voices/cache/offline regressions PASS.

Логи: ../phase0/evidence и ../phase1/evidence. Никаких заявлений о прошедшем remote CI:
новые коммиты не отправлены. Структурная QA не доказывает семантическую истинность.

## Не проверено
- Реальная сеть/Wikipedia APIs: новых запросов к провайдерам не было. Нет ни одного
  завершённого web adapter или обещания SSRF защиты. Зависимости получены из npm;
  это не тест исследовательской сети.
- Chrome, реальные кадры/MP4/скриншот GUI, Piper/Denis, Whisper inference,
  Windows11/i3/8GB/Node26, visual overlap/font metrics/peak memory/listening.
- Получение полноценных роликов по произвольным темам не заявлено.

## Что обязательно продолжить

Сначала завершить фазу1: opt-in/project permission → audited SSRF/DNS-pinned fetch,
robots/limits/MIME/retries/cache/privacy → official providers/extract/BM25 → exact
quotes/independence/disputed/license/asOf → replay/live-check tests. Не включать
непроверенную сеть из GUI. Затем фазы2–7 строго по порядку. В docs/UNIVERSAL.md
сохранены решения и границы; не требуется повторно выяснять, что уже реализовано.

## Артефакты

- База main6ef9288 (PR6 merged), фиксированная ветка arena/348fe030-konveyer.
- Коммиты:16a9d71 phase0,53758f1 corrective typing,2a39f9d phase1 partial.
- Патчи в patches/, порядок PATCH_ORDER.txt; filelists/reports в phase0/phase1.
- full-snapshot.zip: tracked source/docs/evidence без .git/node_modules/piper-env/
  моделей/MP4, плюс phase patches. Zip CRC/SHA и последовательное применение
  patch к temporary index проверяются отдельно (PACKAGE_VERIFY.txt).
- APPLY.md — Windows. PR_DESCRIPTION.md — честное описание текущего частичного scope.
- Новых push/PR/merge нет; старые handoff/проекты/готовые outputs сохранены.
