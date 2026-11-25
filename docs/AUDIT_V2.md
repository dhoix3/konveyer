# Самоаудит фаз 0–8 перед PR

База: `21cfec9cd4c4a66b8f79b77eaa016bee72699a52`. Ветка:
`arena/348fe030-konveyer`. Все фазы приняты заказчиком; это не снимает ограничений
проверки. Ниже «выполнено» относится к указанному контракту/тесту, не подразумевает
настоящий MP4. «Частично» = код есть, существенная проверка/полнота отсутствует.
Пробелы не скрыты: [KNOWN_GAPS](KNOWN_GAPS.md). Новых функций при закрытии не добавлено.

Пути `tools/`, `tests/`, `src/` ниже относительно `engine/`. Итоговая таблица запуска:
`handoff/final/evidence/COMMANDS.md`, точный проверенный HEAD — evidence/summary.json.

| Фаза / критерий | Статус | Доказательство и граница |
|---|---|---|
| 0: исходный аудит и план | выполнено | Этот файл; legacy baseline `projects/examples/demo-no-sleep/`; история checkpoint 12e3f3c сохраняет принятые 0–4 |
| 0: LF/Windows scripts, Linux CI | выполнено | `.gitattributes`, `.github/workflows/ci.yml`; чистые npm/test/typecheck/syntax в final/evidence |
| 0: удалённый CI | не выполнено | Push не разрешён; workflow только локально воспроизведён (G1) |
| 1: GUI loopback, внешняя авторизация, Host/Origin, byte limit | выполнено | tools/ui-security.mjs, tests/reliability.mjs; не публичный web-service |
| 1: schemaVersion/migrations, старые проекты | выполнено | tools/storage.mjs; tests/reliability.mjs; final old-project timeline/QA, исходный JSON неизменён |
| 1: atomic JSON/history/restore, locks/fingerprints | выполнено | tools/storage.mjs, project-lock.mjs; tests/reliability.mjs/runtime.mjs |
| 1: journal/recovery сезона и stale context | выполнено | tools/series.mjs; tests/reliability.mjs/production.mjs; не multi-directory ACID |
| 1: doctor --fix / Windows launchers | частично | engine/setup.ps1, start.bat, tools/environment.mjs; modeled Windows paths tested, Windows run нет (G2) |
| 2: офлайн lookup/research, schema/sources/status/confidence | выполнено | tools/knowledge.mjs, knowledge/rurikids.json; tests/documentary.mjs |
| 2: Рюриковичи, 120s, 25 claims, dispute/review markers | выполнено | final new→research→timeline→qa; all 25 needsReview=true; evidence/summary.json |
| 2: независимая проверка исторических фактов/библиографии | не выполнено | knowledge/rurikids.json: verification + needsReview; требуется историк/источники (G3) |
| 2: claimIds каждой реплики, era/costume/props, coverage | выполнено | tools/documentary.mjs qaDocumentary; tests/documentary.mjs; final все 25 реплик связаны с известными claims |
| 2: семантическая истинность и все legacy documentary ветви | частично | claim-fidelity.mjs — lexical QA; production.brief не исследовательский provider (G4) |
| 2: карты/таймлайн/генеалогия, ≥4 characters+narrator | частично | src/doc/DocumentaryGraphics.tsx, documentary.mjs, tests/documentary.mjs; структурно есть, графика не просмотрена (G5) |
| 2: длинная история → epoch splitting, без обрезки фактов | выполнено | render.mjs cmdResearch, documentary.mjs; tests/documentary.mjs |
| 3: RIFF/RMS, рот закрывается в паузах | выполнено | tools/speech-analysis.mjs, src/char/lipsync.ts; tests/speech.mjs/alignment.mjs synthetic PCM |
| 3: Whisper word timestamps aligned / energy-estimated | частично | word-alignment.mjs, whisper.mjs; injected aligned и actual missing-cache zero-fetch tests; real inference нет (G6) |
| 3: visemes/фонемы и естественная артикуляция | частично | optional provided timing в speech-analysis/lipsync; Piper phoneme extraction/визуальная проверка отсутствуют (G6) |
| 3: RU/EN textnorm, historical names/roman numerals, prosody cache | выполнено | tools/textnorm.py/voice-registry.mjs/voice.mjs; tests/speech.mjs; не полный морфоанализатор |
| 3: голоса/Denis и слышимый lip-sync | частично | voice registry реализован, реальный Piper/Denis не запускался (G6) |
| 3: SRT/VTT/ASS, readability/overflow QA | выполнено | tools/subtitles.mjs, tests/speech.mjs/formats.mjs; визуальная читаемость требует кадра |
| 4: viewport 16:9/9:16/1:1, isolated cache/export | выполнено | src/lib/viewport.ts, tools/timeline.mjs, tests/formats.mjs |
| 4: safe-zone/обложка/chapters/publishing | частично | tools/publishing.mjs, tests/formats.mjs; schematic vs real distinction, реальные aspect/cover кадры не проверены (G5) |
| 4: реальный contact sheet/preview film | частично | publish создаёт маркированные SVG-схемы; реальный кадр только при наличии видео; автоматический GIF не реализован (G5) |
| 5: ≥20 chars, body/age/hair/headwear/clothes, общий скелет | выполнено | src/lib/library.ts:27; src/char/Character.tsx/Crowd.tsx; tests/diversity.mjs bone checks |
| 5: массовка, deep parallax, переходы | частично | Crowd, envs, SceneRenderer; extended plan smoke, без визуального контроля движения/перекрытий (G5) |
| 5: дополнительные general environments | выполнено | src/bg/envs.tsx:19 general +20 historical; tests/phase78.mjs QA всех 8 добавленных общих сетов |
| 5: ≥8 styles, music moods/SFX | выполнено | script.mjs:10 styles/10 moods; Fx.tsx/mixer.py; diversity tests + handoff/phase5/evidence/ NumPy probes; не listening approval |
| 5: no static >4s / неизменная анатомия | частично | shots/bone tests PASS; реальный freezedetect/визуальное качество пока нет (G5) |
| 6: сцены, реплики/длительность/env/cast/camera, QA | выполнено | editor.mjs/editor-page.mjs; tests/editor.mjs live HTTP |
| 6: history undo/redo после restart, revision/lock conflicts | выполнено | tests/editor.mjs, persisted editor history; separate ordinary project snapshots |
| 6: frame preview | частично | schematic и Chrome job + metadata checks реализованы; real PNG нет (G5) |
| 6: documentary wizard topic→materials→claims→script→render | частично | live HTTP preview-no-write/commit/QA tests; браузерная usability не проверена (G7) |
| 6: RU/EN и preflight time/RAM | частично | editor-page.mjs/editor.mjs; controls tested; raw diagnostics не переводятся, оценки эвристические (G7/G8) |
| 7: стадии/сцены/кадры, peak memory, estimate, time report | частично | tools/profile.mjs/render.mjs; plan stage timings/failure tests; full-frame still mode, video only slowestFrames, sampled tree RSS (G8) |
| 7: статический предрендер с pixel equivalence | не выполнено | --prerender-static отклоняется; OFF, goldens не сравнивались; безопасно оставить OFF (G9) |
| 8: opt-in loopback Ollama/OpenAI, strict JSON/repair | выполнено | llm-local.mjs, schemas/llm-dialogue.schema.json, tests/phase78.mjs stub |
| 8: roles/topology/timing/claims, default rules без модели | выполнено | tests/phase78.mjs (включая CLI success/history и failure-no-overwrite); doc verbatim allowlist |
| 8: настоящее model inference/качество и широкий генератор | частично | adapter только редактирует существующие реплики; реальной модели нет (G10) |
| Selfcheck: версии/doctor/smoke/timings/ZIP | выполнено | selfcheck.mjs/zip.mjs; final/evidence/19-selfcheck.log, CRC/Unicode tests |
| Selfcheck: 6–8 реальных frames / successful Windows bundle | частично | код извлекает 8 PNG из успешного draft; здесь complete=false/frames=0 (G2/G5) |
| Сквозная чистая установка/регрессии/структура | выполнено | final/evidence/COMMANDS.md + summary.json; npm ci c ONNXRUNTIME_NODE_INSTALL=skip явно зафиксирован |
| Секреты/модели/media и portable delivery | выполнено | final/evidence/RISK_SCAN.json, .gitignore/.gitattributes, final/SHA256SUMS; ограничение сигнатурного скана оговорено |

## Ошибка предварительного запуска (не скрыта)

Первая проверка экспортировала WHATIF_PROJECTS/OUTPUT и для npm test. Старый topics
suite читает fixtures из checkout/projects, тогда как CLI унаследовал другой путь:
ENOENT. Это ошибка изоляции final verify harness, не объявлена успешной. Для npm
test внешние overrides сняты; последовательные CLI-пробы используют отдельный
verification-data/. Предварительный лог сохранён отдельно в final/preliminary-evidence/.
Финальная проверка выполняется в новом чистом клоне финального HEAD.

## История без переписывания

Никаких rebase/squash/reset/force push/branch switch. Можно **описательно** сгруппировать:
1. 12e3f3c — accepted-state checkpoint фаз0–4 (в этой Git-истории это один коммит;
   оригинальные phase2/3/4 patchsets сохранены отдельно, не применять вдобавок к нему).
2. 6161273 + 9ccad73 + d6f2382 — Whisper/alignment/offline/caption safeguards.
3. ca186d1 + 0d2fab0 — phase5 ensemble и закрытие general environments.
4. 7c2067e — phase6 editor/wizard.
5. 1a23127 — phase7/8 + selfcheck.
6. Финальный closing commit — только актуализация документов/ignore/передача.

Рекомендация PR: сохранить стек как есть; если maintainers захотят squash при
merge — отдельное решение после review, здесь не выполнять. База единого нового
format-patch: 21cfec9; не смешивать его со старыми архивами по фазам.
