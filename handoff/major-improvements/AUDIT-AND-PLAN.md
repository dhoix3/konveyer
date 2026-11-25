# Предварительный аудит и план (до изменения кода)

Base main4e9ddcb, PR5 merged; текущая branch arena/348fe030-konveyer фиксирована
платформой. FF main выполнен без удаления handoff/user data. Никакого push/merge.
Инвентаризация всех src/tools/tests модулей и импортов: evidence/module-inventory.json.

## Найдено
1. ui checkReady POST без JSON Content-Type, security требует JSON: doctor недостижим.
2. sync spawnSync doctor/create блокирует HTTP; listProjects refresh пишет season
   contexts при чтении; corrupt state/parent JSON способен обрушить список проектов.
3. Documentary mode всегда исторический: Rurik hook/names/map/tree/862–1598,
   русские env/costume checks и missing tree errors даже для новой темы без genealogy.
4. claim.person отсутствует → создаётся named «Исторический участник», а QA ищет
   undefined person и даёт ложную anachronistic cast ошибку.
5. docTransform игнорирует cam.zoom/cx/cy/rot, заменяя движение синусом.
6. Claims schema не проверяет project graphic references/relations/source excerpts;
   research lookup либо готовый пакет, либо пустая заявка. Это не новое исследование.
7. GUI три перегруженных колонки, RU/EN смешан, raw IDs/statuses, Undo/Redo, скрытый
   wizard; нет wizard navigation, draft recovery, ясного production status/retry.
8. ETA усредняет stale state без source/resolution привязки; пользовательское0.35
   слишком легко принять за замер. UI estimates и CLI используют разные основания.
9. Piper offline проверяет config>=20bytes, последующая ветка>=200bytes может
   скачивать даже в offline. URL ошибок не даёт полного model+config manual pair.
10. Whisper config existence выбирает неполный каталог; нет JSON/размера проверки,
    existing corrupt files silently skipped, temp failures need actionable report.
11. qaMedia игнорирует ненулевой exit black/freezedetect (allowFail): ложный QA PASS.
12. Scenes.rename part→ready ДО проверки video duration; плохой повторный рендер
    может заменить исправный результат. Final mux тоже пишет прямо в final output.
13. Editor UI raw diagnostics/transport errors; no saved creation draft on refresh.

## Реализация по порядку
- Сохранить compatibility. Разделить generic graphics из project materials от
  optional Rurik profile; validate references/coordinates/cycles/no unknown dates.
- Добавить локальную подготовку материалов: sources + excerpts → candidate claims,
  source quotes/review ledger/research gaps, сохранение с revision/lock и явное
  применение через existing wizard. Никакого fabricated web research/источников.
- Исправить camera composition, no-person QA, check contract, Piper/Whisper, ETA,
  filter QA and staged render publication; tests на взаимодействия.
- Перестроить GUI в RU studio shell с реальными навигацией/мастером/подсказками,
  статусом этапов/журналом/retry, drafts restoration, materials preparation/editor.
  Не делать пустых кнопок или fake percent/ETA.
- Полный npm tests/typecheck/syntax + isolated new generic docs/legacy/unknown era/
  no genealogy/corrupt JSON/API scenarios. Попытка реального all и честный блокер.
- REPORT/KNOWN LIMITS/Windows commands + patch/file list/PR draft в handoff.

Не обещать automatic independent fact-check, MP4/Windows/visual GUI без запуска.
