# Windows: финальный snapshot или единый patch stack

Точный итоговый commit: `FINAL_HEAD.txt`. База единого стека:
`21cfec9cd4c4a66b8f79b77eaa016bee72699a52`. Текущая ветка сохранена, push/PR не выполнены.
Ничего не reset/rebase/squash/force, не удалять свои проекты/output/models/Piper.

## Выберите ОДИН путь

### A. Git am — на чистой исходной базе

Использовать отдельную чистую копию на указанной базе, не рабочую копию со своими
правками. Применять все файлы patches/ по имени, по одному, останавливаясь при ошибке:

```powershell
Get-ChildItem C:\handoff\final\patches\*.patch | Sort-Object Name | ForEach-Object {
  git am $_.FullName
  if ($LASTEXITCODE -ne 0) { throw 'Patch failed. Stop and inspect; do not force.' }
}
```

Это **один полный стек**, уже включающий checkpoint принятых фаз0–4 и фазы5–8.
Не применять одновременно со старыми phase2/3/4/5/6/7–8 архивами или bootstrap.
Для уже принятого дерева final HEAD применять ничего не нужно. История patch stack
сохранена без переписывания; хеши коммитов после git am могут отличаться, дерево — нет.
Старый пошаговый маршрут архивов описан в `handoff/APPLY-ALL-FROM-PHASE2.md` старой
передачи; он альтернативен полному стеку, не дополнение к нему.

### B. Копирование snapshot — без истории

Проверить SHA256 и распаковать full-snapshot.zip **в отдельную пустую папку**.
Снимок — tracked tree итогового HEAD (включая документацию), не инсталлятор и не backup
ваших данных; не содержит .git/node_modules/piper-env/models/MP4/private credentials.
Сравнить с локальными правками вручную перед переносом исходников. Не распаковывать
вслепую поверх существующих пользовательских данных и не удалять их ради чистоты.

```powershell
Get-FileHash .\full-snapshot.zip -Algorithm SHA256
# Сверить с SHA256SUMS, затем Expand-Archive в новую пустую папку.
```

## Что установить / сохранить

- Node≥22 (целевой Node26 отдельно проверить), npm; `engine/package-lock.json`.
- Python3/NumPy, Chrome, FFmpeg/FFprobe; для речи — работающий Piper и локальные модели.
- Не переустанавливать уже работающий Piper/Denis; указать существующие пути.
- Whisper/LLM необязательны, не включены. Rules и plan-only работают без моделей.

```powershell
cd engine
$env:ONNXRUNTIME_NODE_INSTALL = 'skip'
npm ci
npm test
npm run typecheck
Get-ChildItem render.mjs,tools\*.mjs,tests\*.mjs | ForEach-Object {
  node --check $_.FullName
  if ($LASTEXITCODE -ne 0) { throw 'Node syntax failed' }
}
# PowerShell не обязан разворачивать wildcard для Python:
Get-ChildItem tools\*.py | ForEach-Object {
  python -m py_compile $_.FullName
  if ($LASTEXITCODE -ne 0) { throw 'Python syntax failed' }
}
node .\render.mjs doctor
node .\render.mjs selfcheck
```

ONNXRUNTIME_NODE_INSTALL=skip использован и в чистой Linux-проверке: не скачивается
optional native runtime. Это не доказательство реального ONNX inference. Не менять
существующее локальное model/runtime окружение без необходимости.
`selfcheck` возвращает exit1/complete=false при missing dependencies, но формирует
ZIP с диагнозом. Он не устанавливает компоненты и не создаёт поддельные PNG.
После готовности зависимостей ожидаются8 реальных кадров из draft. Отправлять ZIP
только после просмотра логов на приватные пути/текст. Автоотправки нет.

Запуск GUI: `node .\render.mjs ui --port 7788`, http://127.0.0.1:7788.
CLI-порядок сценариев и фактические результаты Linux: evidence/COMMANDS.md.
Источники ВСЕ needsReview; рендер/речь/Windows/GUI visual/real LLM не подтверждены.
KNOWN_GAPS и PR_DESCRIPTION обязательны к чтению перед публикацией фильма.
