# Windows11 — применение и проверка checkpoint

Это частичная реализация (phase0 + offline частьphase1), НЕ готовый universal web generator.
Сохраните рабочую копию/данные обычным backup. Не удалять projects/output/models/piper-env.
Перед применением `git status` должен быть чистым; иначе остановиться и сохранить свою
работу отдельно. Не reset --hard, не force push, не применять патчи второй раз.

## Git patches

В копии репозитория с базой main6ef9288:

```powershell
git status
git rev-parse HEAD
# Ожидаем 6ef9288bff377de24dcd7f0fd4440e47306d7415
git am 'PATH\patches\001-phase0.patch'
git am 'PATH\patches\002-phase0-types.patch'
git am 'PATH\patches\003-phase1-partial.patch'
```

При конфликте остановиться, не force/reset/clean; проверить исходную базу и изменения.
Snapshot — альтернативная новая отдельная папка исходников; не распаковывать поверх
своих проектов/моделей. Existing Piper/Denis переустанавливать не нужно.

## Установка/проверки

```powershell
cd engine
$env:ONNXRUNTIME_NODE_INSTALL='skip'
npm ci
npm test
npm run typecheck
node render.mjs doctor
node render.mjs ui --port 7788
```

http://localhost:7788 → Новый проект → Универсальный вход (experimental offline).
Материалы — canonical knowledge JSON, не произвольный TXT/PDF/URL. Для готового
пакета: Сценарий и материалы → Проверка universal утверждений → confirm/reject.
Verified mode без материалов недопустим. Factual outline не готовый сценарий.

```powershell
node render.mjs make 'Физика гравитации' --id universal-check-001 --voice none
node render.mjs timeline universal-check-001
node render.mjs qa universal-check-001 --plan-only
# final/publish такого outline намеренно заблокированы!
node render.mjs make 'Сказка о лесе' --id universal-tale-001 --format story --voice none
```

Для реальной проверки фазы0 с уже установленным Chrome:

```powershell
$env:REMOTION_BROWSER_EXECUTABLE='C:\Program Files\Google\Chrome\Application\chrome.exe'
node render.mjs smoke universal-visual-001 --extended --plan-only --voice none
node render.mjs frames universal-visual-001 --per-scene 3
node render.mjs export universal-visual-001 --aspect 9:16
node render.mjs frames universal-visual-001 --aspect 9:16 --per-scene 3
node render.mjs export universal-visual-001 --aspect 1:1
node render.mjs frames universal-visual-001 --aspect 1:1 --per-scene 3
```

Просмотреть настоящие PNG/contact sheet: background,2–3 actors wide, источник/status,
header/event text/tree lines; не считать SVG/план visual success.

`corpus`, `research --live-check` и web auto **пока отсутствуют**. Не запускать их как
будто они готовы; --auto-research у make выдаёт явный отказ без сети. Отсутствие
реальной сети не подменено фикстурным «исследованием». WHATIF_OFFLINE не ослаблен.

Optional DOM-тест (не production dependency):

```powershell
npm install --prefix ../.cache/major-dom --no-audit --no-fund jsdom@22
node tests/studio-dom.mjs
```
