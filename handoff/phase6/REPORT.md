# Фаза 6 — GUI редактор сцен

## Проверено запуском

- Живой HTTP GUI: два script-блока синтаксически корректны, RU/EN controls присутствуют.
- Правка реплик/минимальной длительности/окружения/персонажей/камеры/перехода.
- Устаревшая revision -> 409; активный внешний project lock -> 409; неизвестные
  окружения/камеры/пути отклоняются. Данные пользователя не перезаписываются молча.
- Undo/redo хранит snapshots в history/, проверен **после перезапуска сервера**.
- Ошибочная документальная реплика сохраняется как draft, ошибка показана у сцены;
  попытка рендера с QA errors отклоняется (422). Это не фактическая экспертиза.
- Мастер: встроенный/пользовательский пакет, таблица claims, preview без записи,
  явный commit с источниками, затем render с подтверждением оценочных ресурсов.
- Эвристики времени/памяти, concurrency=1; не замер на i3 и не profiling phase 7.
- SVG schematic preview получен по HTTP; actual PNG отсутствует -> 409, не фальшивка.
  Реальная Chrome-задача реализована отдельно через CLI preview и проверку revision
  метаданных. Неверные frame/preview параметры проверены до запуска Chrome.
- npm test/typecheck, JS/Python syntax, textnorm self-test: PASS; старые suites PASS.
- Реальная локальная попытка Whisper без модели: energy-estimated, удалённые модели
  запрещены. Тест actual missing-cache подтверждает ноль fetch-вызовов. Injected
  timestamps -> aligned. ASR никогда не становится источником новых subtitle facts.

## Не проверено

Нет Chrome/Piper/Denis/Whisper model cache: нет двигателя MP4/PNG, реального TTS,
распознавания речи или визуально/на слух одобренного результата. NumPy изолирован
только для коротких mixer probes; doctor основного окружения остаётся exit 1.
GUI не просматривался в браузере: HTTP/AST-тесты не равны usability/визуальным тестам.
RU/EN переключает редактор/мастер и основные формы; канонические источники, enum IDs,
авторский сценарий и сырые технические диагностики не переводятся автоматически.
Точность resource estimates и portrait/crowd composition требует проверки на Windows.
Фазы 7–8 не начаты. Push не выполнялся.

## Windows

Из engine:

```powershell
node .\render.mjs ui --port 7788
# http://127.0.0.1:7788 → выбрать проект → Редактор сцен
node .\render.mjs smoke win-ensemble-01 --extended
# Новый id, драфт, concurrency=1; если зависимостей нет:
node .\render.mjs smoke win-ensemble-plan-01 --extended --plan-only
```

Реальный smoke использует сохранённые локальные модели, может явно запросить
недостающий Piper при синтезе (как прежде); Whisper не скачивает модели. Для своих
готовых Whisper assets: WHISPER_MODEL_PATH/WHISPER_CACHE_DIR или --model. Для
отключения ASR на voice-стадии: --no-whisper.

## Экспорт

phase5/patches — mini-task + разнообразие; phase6/patches применяются после них.
Основа — принятое дерево фазы 4 (здесь checkpoint 12e3f3c). Git am не требует того
же commit id при совпадающих исходных файлах. Не применять поверх своих изменений
вслепую; сначала чистая рабочая копия. В корне архива есть необязательный bootstrap
checkpoint для совершенно чистой базы 21cfec9; для уже принятых фаз его пропустить.
CHANGED_FILES.txt каждого этапа + SHA256SUMS сопровождают patchsets.
