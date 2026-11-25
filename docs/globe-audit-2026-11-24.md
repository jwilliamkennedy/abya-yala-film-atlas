# Globe implementation and regression audit — 24 Nov 2026

Prior commit c683751: independent input and discovery jobs passed desktop and phone. Both devices loaded all 2,065 reference features. Geography audit passed 3,081 film credit joins and 219 anchors. Desktop terrain verified at 3901.59 m, native DEM, satellite tiles, and 42-degree pitch. Phone terrain test asserted before satellite tile response; later response list includes satellite URLs. Combined desktop suite passed, phone timed out after drag before settled. Physical Mac trackpad is still unverified.

This change: recover encounter settlement after release, idle and stable camera even if engine moving flag persists; log motion state; retain encounter DOM when unchanged; cache film ranks; land visibility setting (subtle, balanced, stronger); preserve setting in shared URL; follow the actual related film rather than just its land; await imagery separately from DEM. Mobile controls scroll within their bounds. No catalog or coordinate edits.

Broader checks: legacy first-visit and interface tests expect removed ws-theme-q/ws-film-q; old discovery test assumes legacy markup. Map-return scale did change (240.9233 to 325.2465) but timed out; possible runner polling/performance issue. Browser suite missing /tmp/suite/now-beta after earlier failure. These are outstanding, not certified fixed or merely dismissed.
