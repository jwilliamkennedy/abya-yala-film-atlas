# Globe tight artwork frames — 24 November 2026

Baseline 8e58f64 passed both dedicated workflows and deployment. Browser logs show actual images 500×750, 1920×1080 and 480×360 rendered proportionately. Desktop floating preview present; phone floating preview absent due to available space. Thematic journey/return passed both devices.

This change makes decoded artwork determine the exact exterior frame (no forced full-width box or minimum height). Featured and strip frames have independent max budgets. Floating card width is image width plus its actual padding/border; height follows wrapped title and byline. It is measured before collision placement and omitted for tiny/very narrow artwork or when space is insufficient. Added diagonal placement options and reevaluation when settings or provenance expands. No catalog/artwork URLs changed.

Tests now require decoded image samples, matching frame/image dimensions, preserved ratio and natural-size ceiling, clean opacity/filter, and actual floating-card width when visible. Previous terrain/input/discovery tests are retained. Physical Safari pinch and broad legacy-interface tests remain outstanding.