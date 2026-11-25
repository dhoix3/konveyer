# Полный порядок применения архивов начиная с фазы 2

**Не применять повторно уже принятые патчи и не применять поверх своих правок.**
Работать в чистой копии для сравнения; при конфликте остановиться, не force/reset.
Оригинальные архивы не переписаны. Архивы лишь контейнеры: применять `.patch`
внутри в указанном порядке, не git apply ZIP.

| Порядок | Архив | Патчи внутри |
|---|---|---|
| 1 | phase2-handoff.zip | handoff/phase2/patches/0001…0003 |
| 2 | phases-3-4-handoff.zip | handoff/phase3/patches/0001…0002 |
| 3 | тот же phases-3-4-handoff.zip | handoff/phase4/patches/0001…0002 |
| 4 | phases-5-6-handoff.zip | handoff/phase5/patches/0001…0004 |
| 5 | тот же phases-5-6-handoff.zip | handoff/phase6/patches/0001 |
| 6 | phase5-corrections-and-phases-7-8-handoff.zip | handoff/phase5-corrections/patches/0001 |
| 7 | тот же новый архив | handoff/phase7-8/patches/0001 |

На исходном чистом 21cfec9 применять все строки. Первый patch фазы 2 — checkpoint
уже принятых фаз 0–1; если эти изменения уже есть в вашей рабочей копии, НЕ применять
их второй раз. Если фазы 2–6 уже приняты/применены — нужны только строки 6–7.

**bootstrap/accepted-phases-0-4.patch из архива 5–6 НЕ нужен** в последовательном
маршруте 2→3→4: это альтернативный checkpoint для голой базы, НЕ дополнительный
этап. Нельзя применять и старые этапы, и тот bootstrap. Отдельный phase2-fidelity/
не содержит дополнительных обязательных git-патчей: исправление входит в phase3/0001.

Пример из одной распакованной handoff/ (Git Bash):

```sh
git am /path/handoff/phase2/patches/*.patch
git am /path/handoff/phase3/patches/*.patch
git am /path/handoff/phase4/patches/*.patch
git am /path/handoff/phase5/patches/*.patch
git am /path/handoff/phase6/patches/*.patch
git am /path/handoff/phase5-corrections/patches/*.patch
git am /path/handoff/phase7-8/patches/*.patch
```

PowerShell: выполнять по одному этапу через
`Get-ChildItem C:\handoff\phase7-8\patches\*.patch | Sort-Object Name | ForEach-Object { git am $_.FullName; if ($LASTEXITCODE -ne 0) { throw 'Patch failed; stop' } }`.
После каждой команды проверять exit code, не скрывать ошибки. Это инструкция для
вашей копии; агент не переключал ветку, не делал push и не создавал новые ветки.

После патчей: engine/ → npm test, npm run typecheck. Новых npm-зависимостей в этом
обновлении нет. Свои models/Piper/voices не переустанавливать. Для Windows smoke и
самопроверки: `node .\render.mjs selfcheck`; отправлять полученный output/selfcheck-*.zip
после просмотра его логов на приватные данные. Отсутствие Chrome/Piper в sandbox
не говорит об их отсутствии у вас.

Для каждого нового набора есть CHANGED_FILES.txt и SHA256SUMS. Проверена полная
последовательность патчей 2→3→4→5→6→corrections→7–8 во временном Git index,
без изменения рабочего дерева/ветки; финальное дерево совпало с итоговым HEAD.
