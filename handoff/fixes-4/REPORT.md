# B / fixes-4 — topic profile и чувствительные темы

База90ec07f (A); текущая ветка; push не выполнялся. Порядок A→B соблюдён.

## Выполнено
- Profile v2: ru/en stems/синонимы/лексические формы health, law, finance, politics,
  dangerous substances; physics/chemistry/biology/science/technology/history/geography/
  cooking/sport/psychology/business/nature. «Как работает вакцина»→health, biology,
  science; sensitivity health; есть disclaimer. «Что такое инфляция»→finance;
  «Можно ли оспорить штраф»→law; «Почему небо голубое»→physics; борщ→cooking.
- Многодоменная тема сохраняет все совпадения, primary domain по приоритету. General
  explanation прямо говорит, что словари не совпали и контекста недостаточно.
- Выявлен/исправлен false positive «Химические реакции»→finance («акции» внутри
  «реакции»): Unicode boundary у акций. БАД работает с кириллическими окончаниями.
- Profile собирает sensitivity также из всех claim texts, не только заголовка.
  В исторической теме с явно заданной era<=1700 описательные treaty/inheritance
  claims не превращают фильм о Рюриковичах в современную правовую консультацию;
  явные sensitive темы/медицина/финансы не обходятся этим исключением.
- В universal make И новых canonical documentary материалах автоматически добавлены
  отдельные editorial safety scenes: полный disclaimer в lines для Piper/субтитров
  и doc.events для on-screen evidence card. Кадр/озвучка не отрендерены, но реальные
  поля сцен и timeline проверены. Обычная дата/claim fidelity не обходится произвольной
  editorial меткой: whitelist точных известных текстов и QA подмены.
- Source class gate verified health/law/finance: official/scientific/clinical-guideline.
  Класс сохраняется при подготовке пользовательских выдержек. Blog/unknown запрещены.
  Это declared metadata, НЕ independent publisher verification. Редактор должен
  проверить источник/цитату; автоматическое подтверждение не включено.
- Нейтральный информационный authoring contract; валидатор отклоняет прямые указания,
  персональные лечебные дозы, «вам следует», «you should», обещания прибыли и советы
  вместо врача/юриста. Это консервативная лексическая защита, не доказательство
  отсутствия любого завуалированного совета/вреда. Семантическая модерация частична.
- Final/publication заново проверяет классы и наличие disclaimer в репликах;
  --accept-unverified их не обходит. GUI documentary wizard при пересохранении
  пересчитывает профиль/сохраняет safety scenes. Старые проекты без новой metadata
  не переписываются автоматически. Скелет, models, voices/cache/lock не менялись.

## Проверено запуском
- fixes4:84 темы ru/en + дополнительные unknown/creative/multidomain. По каждой
  fixture заданы expected primary domain/type/sensitivity/disclaimer count.
  Подробные фактические profiles в evidence/topics.json (не research sources).
- Изолированный make: blog отказ, official-class package принят, safety scene
  одновременно в spoken lines и on-screen data, timeline и qaPlan/qaDocumentary PASS,
  подмена safety текста→ошибка, удаление disclaimer→final block даже с override,
  прямой медицинский совет отклоняется.
- Все legacy suites + fixes3/fixes4, typecheck, syntax/Python compile: evidence/.

## Частично / не проверено
- Классификатор НЕ полноценная морфология/LLM и не экспертная оценка. Омонимы,
  эвфемизмы, сложная семантика/исторические исключения требуют редактора. Advice
  guard лексический, не обещает распознавания всех форм инструкций.
- Нет независимой проверки классов, URL или статуса источника — веб-части ещё нет.
- Настоящие Chrome кадры/речь/disclaimer readability и Windows не проверены. Safety
  scenes могут увеличить длительность относительно requested budget; речь не режется.
  Universal phase2 должна перераспределить бюджет без потери disclaimer/facts.
- C: web/providers/SSRF/robots/cache/replay/live-check и фазы2–7 НЕ реализованы.
  Web не включён: недоделанная защита не выдаётся за безопасную.

Windows: из engine `npm test`; `npm run typecheck`; `node render.mjs make "Как работает
вакцина" --id vaccine-draft-001 --voice none`; `node render.mjs timeline vaccine-draft-001`;
`node render.mjs frames vaccine-draft-001 --per-scene 3` при имеющемся Chrome. Без
материалов это unverified outline, НЕ факт-фильм. Для verified пакета задайте реальный
проверенный источник с reliabilityClass и точными excerpt/quote; затем review в GUI.
