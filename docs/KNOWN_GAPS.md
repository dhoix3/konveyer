# KNOWN GAPS — явные частичные / невыполненные критерии

Фазы приняты, но следующие пункты не превращаются от этого в проверенный результат.
Новых функций для закрытия этих пунктов в финальном проходе не добавляется.

| ID | Статус / пробел | Как закрыть / доказательство |
|---|---|---|
| G1 | Не выполнено: удалённый GitHub CI | После отдельного разрешения push/PR дождаться checks Node22/24; `.github/workflows/ci.yml`. Локальные логи не доказывают remote CI. |
| G2 | Частично: Windows11/i3/8GB/Node26, launchers, CIM peak sampling, successful selfcheck | На пользовательской системе с существующими Chrome/Piper/Denis выполнить npm/test/typecheck, selfcheck, draft; прислать ZIP. Проверялись Linux и модели Windows-путей, не Windows runtime. |
| G3 | Не выполнено: независимая верификация knowledge | Историку сверить все25 claims с указанными изданиями/страницами/датами/генеалогией; сохранить disputed, редактировать статус/review только по результату. Сейчас ВСЕ needsReview=true. `knowledge/rurikids.json`. |
| G4 | Частично: семантическая factual QA и legacy documentary parity | Research реплики имеют claims, но claimFidelity ловит имена/числа, не логическое следование. Legacy `production.brief` использует evidence у factual beats и не имеет обязательных claimIds у каждой реплики (вступления/дисклеймеры тоже без claim). Произвольные ручные правки legacy нельзя считать доказанными QA. До публикации проверить вручную либо использовать research/wizard; будущую унификацию валидатора делать отдельной задачей, не silently migrate. |
| G5 | Частично: реальный рендер/визуальная приёмка, safe-zones/динамика/crowd/anatomy, cover/contact | Нужны Chrome, draft и review 16:9/9:16/1:1, читаемость map/timeline/tree, freezer/blackdetect, 6–8 frames + MP4/listening. Схемы не кадры. Автоматический GIF и полный photographic contact sheet не реализованы; если необходимы, отдельная задача после реального draft. |
| G6 | Частично: Piper/Denis, ASR inference и visemes | На имеющихся локальных моделях проверить реальную русскую речь, паузы, aligned report и subtitle sync; протестировать ONNX runtime после выбранного install mode. Тут only injected timestamps/missing-cache zero-fetch/RMS synthetic PCM. Фонемы можно передать, автоматическое Piper phoneme timing не реализовано. |
| G7 | Частично: visual GUI, RU/EN полнота, wizard usability | Пройти браузером edit→undo/restart→redo→QA→wizard→save→render; raw logs/enum IDs/источники/сценарий не переводятся. HTTP/JS syntax tests не usability review. Jobs сериализованы ограничениями, не полноценная многопользовательская очередь. |
| G8 | Частично: end-to-end profiling и точность ETA/пика памяти | Измерить cold/warm draft на i3 concurrency1; отдельно sample/all-frame still и video pipeline. Still wall-time ≠ video capture, video сообщает only slowestFrames. Tree RSS sampled (750ms), не точный OS peak; sync stages/short processes можно пропустить, shared pages/CIM overhead завышают. Для точного Windows peak применить OS profiler, результаты приложить. Без реального рендера estimate=null; editor estimate эвристика. |
| G9 | Не выполнено и намеренно OFF: предрендер статичных слоёв | Не включать. Только отдельный эксперимент за флагом после реальных эталонов/сравнения кадров с заранее заданным допуском и замера пользы. Сейчас флаг отклоняется; goldens/equivalence отсутствуют. |
| G10 | Частично: реальная local LLM и генеративная полнота | Запустить установленную offline Ollama/OpenAI-compatible модель, проверить JSON/repair/смысл/тайминг; endpoint stub не подтверждает качество. Текущий provider dialogue-only, не строит новый cast/topology; для doc только verbatim assigned claims/unchanged lines. Более свободный пересказ потребует отдельной доказуемой evidence-проверки. |

Дополнительные риски (не скрытые «успехи»): HTTP bearer требует доверенной сети/TLS;
source hash/locks/history — не multi-file ACID; bounded project history хранит20
снимков на тип, не бессрочный backup; автоматический secret scan сигнатурный и не
заменяет ручной review. Полные fixture/tests и reports доступны в handoff/final/.

## Универсальный проход

Новая нумерация фаз/статусы — docs/UNIVERSAL.md. Фаза0: проверены выбор графики по
смыслу, source/event/review metadata, bbox/orthogonal edges и общий actor fit. Реальные
шрифтовые metrics/overlap/camera/background ещё требуют Chrome и Windows review.
Произвольно длинные подписи могут сокращаться с многоточием; полные материалы
остаются в knowledge/SOURCES. Make/web/corpus из нового ТЗ пока не заявлены.
