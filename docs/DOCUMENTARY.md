# Documentary rules v2 (offline)

## Запуск

Из `engine/`:

```sh
node render.mjs new rurik-demo --format documentary --genre history --topic "Рюриковичи" --duration 120
node render.mjs research rurik-demo --topic "Рюриковичи"
node render.mjs timeline rurik-demo
node render.mjs qa rurik-demo --plan-only
```

`research` ищет точное название/alias/id пакета в `engine/knowledge/*.json`.
Research не использует сеть/LLM; отдельный llm-local opt-in описан ниже. Если пакет не найден, создаётся **пустой** knowledge.json,
пишется сообщение, исходный проект не превращается в факт-фильм. Повторный research
не перезаписывает имеющийся knowledge.json. Сохраните/переименуйте его вручную,
если действительно хотите новый поиск. Старые documentary/reconstruction проекты
и пользовательские materials не конвертируются автоматически.

Пакет имеет schemaVersion=1, sources с библиографией и claims с id, полным text,
date.value/precision (day/year/century/range/unknown), place,
status (supported/disputed/hypothesis/unknown), sources (IDs), confidence 0–1,
needsReview. Дополнительно: era [от,до], epoch, person, краткая narration,
causalLinks с существующими claim IDs. Narration — редакционный конспект claim,
полный текст сохраняется, не обрезается. Валидатор: tools/knowledge.mjs.

Рюриковичи: 25 claims, от летописного призвания до 1598, включая источник
родословной прямой московской линии. **Все needsReview=true**: составлено по
справочным знаниям без проверки сети, страниц и редакций. confidence — авторская
оценка, не вероятность доказанности. supported означает наличие указанного
источника, не современную независимую верификацию. Ранние спорные даты отмечены
как disputed; точных неизвестных дат и цитат не добавлено. Нужен историк-редактор.

## Сценарий и изображение

После research проект получает provider=documentary-rules-v2. Каждый текстовый
фрагмент привязан к claim ID; главы группируются по epoch, без перехода к другой
эпохе внутри сцены. Хук-вопрос и итог видимы в графике. Причинные утверждения
берутся из claims, не придумываются провайдером; causalLinks сохраняют основания.
Вместо ускорения/обрезки речи QA отклоняет сцену длиннее 12 секунд. Планировщик
выделяет сцены не реже одного раза в 8–12 секунд; длительность речи пока оценочная.

Для слишком большой темы research создаёт отдельные episode projects по эпохам
и documentary-episodes.json. Это не fiction-season: автоматическая перезапись,
выдуманная фабула и продолжение из современных шаблонов не применяются.

Исторический словарь: tools/historical.mjs — 20 схематичных исторических окружений,
шесть видов предметов, четыре костюма и семантические действия, отображённые на
существующие motion actions. Скелет, IK и анатомические лимиты не менялись.
Костюмы — добавочные SVG-детали. Эры ограничивают допустимость предметов/костюмов;
это не исчерпывающая научная экспертиза быта и архитектуры.

src/doc/DocumentaryGraphics.tsx: карта с маркировкой «схема» без точных границ,
таймлайн, ретроспективная прямая родословная Иван III → Василий III → Иван IV →
Фёдор Иванович, плашка участника/дат событий, бейдж источника/статуса, главы.
Годы событий на плашке не выдаются за годы жизни. Персонажи стилизованы, не
портретные реконструкции; генеалогическая схема не охватывает все ветви рода.

## QA и результаты

Проверяются claim IDs каждой сцены и реплики, покрытие claims, современные среды,
неизвестные/неподходящие по эре предметы и костюмы, действия, видимые персонажи,
разнообразие окружений, графические режимы и темп сцен. При needsReview и
estimated voice выдаются предупреждения; они не скрываются и не означают factual QA.

SOURCES.md содержит каждый claim, статус, confidence, needsReview и библиографию.
CONTACT_SHEET.svg — **схематичный сториборд**, не настоящие кадры. Лист реальных
кадров, MP4, Piper timing и визуальная читаемость требуют Chrome/Piper. Их отсутствие
не заменяется фиктивным рендером. Переносимая проверка: handoff/phase2/evidence/.

## Claim fidelity и звуковая разметка

QA сравнивает краткую narration и каждую реплику с полным text claim: новые
цифры/даты, числительные и имена с заглавной буквы отклоняются. Учтены явные
формы имён/падежей и номера Иван III/Третий. Это консервативная лексическая
проверка, не доказательство семантической эквивалентности; омонимы, намеренное
написание имён строчными и сложная морфология требуют редактора.
Звуковой и subtitle контракт описан в handoff/phase3/REPORT.md.

## Whisper timestamps

When local Whisper ONNX assets are available, voice preparation stores actual ASR
word times in manifest lines with wordTiming=aligned and alignment-report.json.
Upload clip times are rebased. Invalid/missing/mismatched ASR remains explicitly
energy-estimated. No timestamp end is invented. Transformers v4 preflight is also
globally forced offline (local_files_only alone is insufficient in that version).
`--no-whisper` opts out; `--model` or WHISPER_MODEL_PATH/WHISPER_MODEL selects local
assets, WHISPER_CACHE_DIR selects their cache. Models are not installed/committed.
Whisper times gate the mouth plus actual RMS amplitude. ASR is not factual evidence:
subtitles retain authored script text, never add ASR-recognised names/numbers.
Real-model inference remains unverified here; deterministic timestamp tests and
actual missing-cache/no-network fallback are verified.

## Legacy materials и локальная модель

Legacy `new --format documentary|reconstruction --materials …` использует старый
production.brief с источниками/evidence у factual beats. Вступления/дисклеймеры
могут не иметь claimIds, а произвольные ручные правки не проходят всю research QA.
Не выдавать это за одинаковую гарантию во всех режимах: для публикации фактов
использовать research/wizard и ручную проверку; G4 в KNOWN_GAPS.md.

llm-local включается только явно и требует совпадающий materials.json. Scene/line
IDs, voices и knowledge metadata неизменны; допустимы только неизменённый текст или
дословный text/narration назначенного этой реплике claim. Legacy без line claimIds
может только сохранить текст. Default rules работает без модели. Тест на stub не
проверяет настоящую LLM, новые факты вне материалов запрещены валидатором.

Итоговая проверка: handoff/final/evidence/COMMANDS.md (120s pipeline) и summary.json
(all25 needsReview, every research line has known claim). Реальный рендер, TTS/ASR,
историческая верификация и браузерный GUI остаются непроверенными.
