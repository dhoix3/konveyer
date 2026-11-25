# Фазы 7–8 и selfcheck

## Фаза 7: реализованные измерения и пределы проверки

`node render.mjs --profile <id>`: реальный single-frame renderer, три точки каждой
сцены; `--profile-all-frames` — все кадры. Масштаб .5, estimated speech, не TTS/MP4.
`all <id> --draft --concurrency 1 --profile`: времена стадий и сцен render+encode,
Remotion slowestFrames с точными frame/time. Полная покадровая таблица — отдельный
all-frame still run, не выдуманные значения из progress. JSON + WHERE-TIME-GOES.md.

Память: Node process maxRSS и sampled tree RSS через ps/Windows CIM, каждые 750 ms.
Это не точный системный пик: короткие процессы/синхронные операции могут быть
пропущены; shared pages/monitor дают двойной счёт. Ошибки sampling видны в JSON.
Оценка render-времени фильма появляется только из успешных измерений и содержит
basis. Неизмеренные стадии не подменяются эвристикой. Кэши не меняются; cached
сцены не считаются как измеренный быстрый рендер. Вложенные стадии нельзя суммировать.

**Фактический sandbox-прогон**: plan-only extended smoke успешен; таблица стадий в
`evidence/WHERE-TIME-GOES.md` (timeline ~55 ms, QA ~34 ms в этом конкретном запуске).
Это НЕ скорость фильма на Windows/i3. Отдельная profile-команда реально завершилась
ошибкой отсутствующего Chrome; failed-render-profile.json сохраняет failure и
пустые frames/scenes. Render estimate=null. Реальных per-frame/scene render timings
в sandbox получить нельзя. Эти части кода ждут Windows selfcheck/profile.

**Предрендер статических слоёв не реализован/не включён.** Флаг
--prerender-static явно отклоняется: сравнения эталонных кадров в допуске нет.
Оптимизации по CPU-логам plan-only не делались.

## Фаза 8: что работает

Отключённый по умолчанию llm-local: Ollama /api/chat или OpenAI /chat/completions
на loopback HTTP. Без флага --provider llm-local — прежние rules, без запроса модели.
Явно выбранная недоступная модель даёт видимую ошибку, не скрытый ложный успех.

Выход — строго dialogue-schema JSON; JSON Schema сохранена в engine/schemas/.
Валидатор + до двух исправлений (всего 3 попытки), лимиты timeout/response; отклонение
redirects/не-loopback/credentials. Модель правит только текст существующих реплик:
порядок/число сцен и реплик, id/voice/roles/metadata не меняются. buildPlan + qaPlan
проверяют структуру/анатомию/claims; дополнительный timing upper bound; speech
не режется. Успешный CLI edit создаёт history/pre-llm-*.json; отказ сохраняет проект.

Для документалистики/реконструкций обязателен materials.json с совпадающими
claims/sources. Только неизменённый авторский текст или verbatim текст/narration
назначенного **этой реплике** claim. Новые факты и вольный пересказ не принимаются.
Legacy brief без line claimIds может только сохранить текст; обхода через старый
production.format нет. Это сознательно строгий начальный провайдер, не свободный
генератор фактов/топологии. needsReview=true; семантическое качество fiction требует
человека. Лексическая QA не объявляется проверкой истинности.

Тесты на реальном loopback HTTP stub: Ollama/OpenAI formats, malformed JSON→repair,
role/topology/timing/materials rejection (modern+legacy), HTTP/redirect failures,
CLI successful history и failure-no-overwrite. Никакой внешней сети/реальной модели.

## Windows selfcheck

Из engine: `node .\render.mjs selfcheck`.
Создаёт output/selfcheck-<date>-<suffix>/ и соседний ZIP. Версии Node/Chrome/Piper/
FFmpeg (либо ошибки), doctor.log, smoke.log, profile, plan/QA и 8 PNG из успешного
реального DRAFT.mp4. Дефолт offline, никаких установок/моделей/MP4/секретов в ZIP,
никакой автоматической отправки. Новый project id, данные пользователя не удаляются.
При ошибке doctor — честный plan-only smoke, complete=false, exit 1, PNG не рисуются.

**Проверен Linux incomplete run**: ZIP CRC/Unicode валиден, smoke exit 0,
doctor exit 1, frames=0, complete=false. Сам ZIP: evidence/selfcheck-incomplete.zip.
Сценарий успешного Windows draft + извлечения 8 реальных PNG, Chrome timings,
Piper/Denis, Whisper/LLM inference, визуальная/слуховая приёмка не проверены.

## Регрессии и передача

npm test, typecheck, node --check: PASS. Новые environment QA checks PASS.
Общий отчёт/инструкции: docs/PROFILE_LOCAL_LLM_SELFCHECK.md. Ветка та же, push нет.
Применение после phase5-corrections, полный порядок с фазы 2 — ../APPLY-ALL-FROM-PHASE2.md.
