# C — не выполнено, безопасный останов

A: commit90ec07f. Код/тесты выполнены; реальная визуальная приёмка не выполнена.
B: следующий commit (см. fixes-4 patch). Код/84 fixtures/полный npm test/typecheck
выполнены. Семантическая модерация и независимая authority verification частичны.

C: реализация opt-in web research из promt2.txt и следующие фазы2–7 НЕ выполнены.
Provider/robots/rate/cache/SSRF/DNS/redirect/extraction/BM25/exact quotes/
2 independent domains/disputes/reliability/licenses/query logs/offline/replay/
live-check/research-auto/make-auto — нет новой реализации или проверок.
Локальные HTTP fixture tests не запускались. Нельзя включать сеть до их реализации.
Существующий --auto-research явно отказывает и сеть не использует; networkAllowed
остаётся false. Никаких неподтверждённых live/Chrome/Windows результатов нет.

План продолжения: сначала записать threat model и контракт provider/research cache;
затем закрытый fetch gateway и локальные HTTP/DNS fixtures (private addresses,
redirect chains, IPv4/IPv6, DNS rebinding, WHATIF_OFFLINE, robots/rate/cache), только
потом opt-in CLI; дальше extraction/ranking/exact quote independent-domain fixtures,
review/replay/GUI, и лишь после этого живой check в разрешённой среде. Неполные
модули оставить выключенными. Дальнейшие production-фазы не считать выполненными.

Изменён только этот статусный документ; исходный код C не менялся. Push отсутствует.
