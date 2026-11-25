# Универсальный конвейер: журнал реализации

Работа по promt2, строго по фазам. База main6ef9288 (PR6 merged).
Текущая ветка Arena фиксирована: arena/348fe030-konveyer. Не создаётся новая ветка,
не удаляются проекты/outputs/модели и stash. Push/PR/merge нового прохода не выполнены.

## Исходное состояние и план

Фаза0 нужна: handoff/fixes-2 в main отсутствует. Найдено до изменения кода:
- graphic mode выбирается modulo index (map/timeline/tree), даже без смысловой связи;
- timeline подписывает место вместо события, source footer показывает IDs;
- source status не различает «по источнику» и ручную проверку;
- дерево2×2 соединяет узлы диагоналями через соседние карточки;
- шапка и footer обрезают строки фиксированной высотой;
- фон живёт только в маленьком actor viewport, остальное закрыто плоскими панелями;
- вписывается только один skeleton, supporting actors могут оказаться за кадром.

План фазы0: общий semantic selector с reason; phase0 evidence fallback вместо
фиктивной временной шкалы; полные события/читаемые ссылки на source metadata;
честные review badges; чистая layout-геометрия дерева/многострочного текста;
полноэкранное окружение + групповой establishing actor fit; тесты данных/геометрии.
Legacy projects не переписывать автоматически. Не менять skeleton/IK/anatomy.

## Статус фаз

| Фаза | Статус | Доказательство |
|---|---|---|
| 0: документальная композиция | выполнено на уровне данных/геометрии; visual review нет | handoff/universal/phase0/ |
| 1: make + безопасное web research | частично: offline make/review; web нет | handoff/universal/phase1/ |
| 2: универсальный сценарист | нет | legacy providers пока сохранены |
| 3: универсальный визуальный словарь | нет | counts предыдущих библиотек не выдаются за новые |
| 4: режиссура/стили/бренд | нет | не заявлено |
| 5: универсальный readiness QA | нет | existing QA сохранён |
| 6: универсальный GUI/review/network permission | нет | GUI предыдущего прохода, не новый wizard |
| 7: corpus | нет | corpus/live-check пока не реализованы |

Сеть будущего web subsystem default OFF, WHATIF_OFFLINE=1 безусловно запрещает её.
Интернет-тексты только данные, не инструкции; независимость/цитаты/review должны
проверяться вне LLM. verified не означает автоматически установленную истину.
Фазы1–7 нельзя считать выполненными только по этому design contract.

## Восстановление Git-метаданных сессии

Сессия восстановилась с shallow HEAD21cfec9, но рабочими файлами merged PR6.
Fetch unshallow и hash сверка всех243 tracked файлов origin/main показали0 отличий.
После проверки ancestor выполнен fast-forward ref/index до6ef9288 **без изменения
рабочих файлов**, без reset/clean/stash/delete; сторонние handoff сохранены.

## Фаза1: офлайн-вход и доверие (частично)

Реализованы `make`, объяснимый словарный topic profile, режимы достоверности,
сохранение networkAllowed=false, GUI opt-in к make и revision+lock review.
Никакой автосети не добавлено. `--auto-research` возвращает ошибку до создания
проекта — это не имитация поиска. --allow-network один сам по себе не включает сеть.

```powershell
cd engine
node render.mjs make 'Физика гравитации' --id universal-gravity --format explainer --voice none
node render.mjs timeline universal-gravity
node render.mjs qa universal-gravity --plan-only
# Это исследовательская заявка, не фактическое видео. Final/publish заблокированы.
node render.mjs make 'Сказка о лесе' --id universal-tale --format story --voice none
node render.mjs make 'Моя тема' --id universal-sourced --mode verified --format documentary --materials 'C:\path\knowledge.json'
```

25–180сек, ru/en, форматы explainer/documentary/story/tutorial/top/promo/kids/skit/review
сохраняются как **намерение**, не как готовые9 структур сценария (это фаза2).
Без материалов factual default→unverified-draft с тремя редакционными сценами-заявками,
а не утверждениями о реальном мире. Creative использует существующий fiction provider.
verified без материалов отвергается до публикации project.json. Подготовленные
материалы с needsReview всё ещё ждут редакторского подтверждения.

GUI: «Новый проект → Замысел → Универсальный вход». Сеть явно не используется.
«Сценарий и материалы → Проверка universal утверждений» загружает quote/title/url/
status и кнопки подтверждения/отклонения. POST review revision-bound и lock-protected,
ошибка не пишет частичное решение; existing history/atomicJson сохраняет pre-image.
Отклонение не удаляет claim/scene: проект нужно отредактировать перед публикацией.

Final/publish (и GUI all/final) проверяют review; --draft допускает предпросмотр.
CLI --accept-unverified — явный bypass factual review, но не повреждённых ссылок/цитат
и не обязательного disclaimer. Старые проекты без universal не получают новых
блокировок. Для здоровья/права/финансов/политики профиль сохраняет neutral disclaimer;
без его дословного текста в репликах финальная публикация блокируется даже с bypass.
Автоматическое безопасное написание/встраивание этих дисклеймеров пока не сделано.
Профиль лексический: не экспертная классификация/модерация, geography=null если неизвестна.

Не реализовано в фазе1: web providers/fetch/SSRF/robots/cache/replay/BM25/independence/
disputes/licensing, URL/TXT/PDF/DOCX ingestion, real live-check, per-project network
permission workflow. Нет network module — нет обещания его безопасности. Corpus
также пока не реализован. Реальная сеть и Chrome/Windows не проверялись.

## Следующий проход A/B: fixes-3 и fixes-4

A: selectionVersion=documentary-selection-4, timeline заново выбирает scene.doc по
claims/герою/relations; QA отвергает старую версию, циклы и повторы содержимого.
Встроенная родословная теперь в knowledge.relations и только из существующего
moscow-line (needsReview=true), не глобальная московская панель для любой сцены.
Полный14-сценный отчёт: handoff/fixes-3/REPORT.md. Frames добавляет actual Chrome bbox
textBounds, но ветка реальных измерений ещё не запускалась. Это не visual approval.

B: topic profile v2: bilingual stems, all matchedDomains, sensitivity health/law/
finance/politics/dangerous, явный general fallback.84 эталонные RU/EN темы + отдельные
creative/multidomain fixtures. Профиль лексический, не семантический эксперт.
Для sensitive universal и новых canonical documentary материалов автоматические
editorial safety scenes произносят и показывают дисклеймер; точные whitelist тексты
не считаются фактами. Подмена editorial текста ловится QA. В verified только declared
reliabilityClass official/scientific/clinical-guideline; метка класса сама требует
редакторской проверки и не доказывает авторитетность. Блоги/неизвестный класс запрещены.
Прямые персональные инструкции/дозы/гарантии отклоняются консервативным валидатором;
полная semantic medical/legal moderation не заявлена. Sensitive export повторно
проверяет source class/disclaimer, даже --accept-unverified не обходит их.

C (полное безопасное web research, затем фазы2–7) в этом checkpoint НЕ реализовано.
Сеть не включена, --auto-research по-прежнему явно отклоняется. Не было локальных
HTTP SSRF/robots/provider tests, поэтому безопасности web subsystem не заявляем.
