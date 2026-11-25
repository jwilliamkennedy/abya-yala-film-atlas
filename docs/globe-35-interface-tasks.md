# 35-task interface iteration — 24 November 2026

Baseline dc3aba9 independent terrain/discovery/input tests passed. Combined run was still executing at audit. This beta-only iteration leaves geometry, catalog and image records intact.

## Implemented changes
1. Four primary navigation actions.
2. Find land in one disclosure.
3. Theme control in one disclosure.
4. Map utilities in one disclosure.
5. Exclusive disclosure state.
6. Closed-by-default panels.
7. Visible active theme count.
8. Period indicator on Map.
9. Reuse original theme lens and index.
10. Preserve intersection selector and result count.
11. Remove redundant globe theme key (focus explanation remains).
12. Recent lands inside Find.
13. Close Find on selection.
14. Discover closes panels.
15. Home closes panels.
16. Terrain closes panels.
17. Opacity under Land visibility.
18. Period under Map.
19. Share under Map.
20. Flat workspace under Map.
21. Separate compact zoom.
22. Larger mobile touch targets.
23. Mobile select font avoids browser autozoom.
24. Bounded scrollable popovers.
25. Landscape viewport sizing.
26. Outside pointer closes panel without blocking drag.
27. Escape restores trigger focus.
28. Accessible labels, expanded states and control associations.
29. Restore original theme lens on exit.
30. Floating art hides when panels open and avoids zoom controls.
31. Overlapping land choices use disclosure.
32. Additional films and sources use disclosure.
33. Shorter empty encounter.
34. Compact encounter sizing.
35. Real menu interaction, exclusivity, camera stability and existing regression assertions in QA.

Verification: JS parse passed. New browser runs needed. This is an implementation checklist, not 35 independently certified outcomes. Physical Mac trackpad and full legacy-site QA remain outstanding.
