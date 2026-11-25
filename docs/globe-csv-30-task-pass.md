# 30-task CSV concordance and discovery pass

Baseline 0190ddf (run 45539871139): 1,493 makers, 3,081 exact credits; 1,740 mapped and 1,341 unmapped; names/film export IDs and counts matched. Audit reported 9 theme, 180 form, 250 length, 6 language, 7 watch, 14 primary-theme mismatches, and 5 work-level facet discrepancies. Prior discovery test failed strict menu camera equality. Terrain/input and combined acceptance passed.

Implemented:
1. Load Published asynchronously after globe initialization.
2. Load derived facet CSV concurrently.
3. Reuse a single request for full-credit details.
4. Revalidate CSV cache.
5. Validate both CSV schemas.
6. Exact composite credit key.
7. Do not select ambiguous duplicate rows.
8. Preserve work-level facet export separately.
9. Retain facet source rows and conflicting scalar values.
10. Exact published themes in globe theme index.
11. Invalidate and rebuild lens index.
12. Exact language labels.
13. Exact form.
14. Exact length.
15. Exact primary theme.
16. Exact source metadata in preview.
17. Published viewing routes prioritized.
18. Exact recorded image prioritized.
19. Correct film profile anchor.
20. Language filter.
21. Form filter.
22. Length filter.
23. Combine all filters with periods/themes and geographic markers.
24. Cache matched land credits.
25. Apply filters to related-film discovery.
26. Include filters in share URL.
27. Clear filters for explicit search selection.
28. Search language and theme labels as well as aliases.
29. Catalogue status and retry, no blank map if fetch fails.
30. Strict effective CSV audit and menu-camera diagnostics/filter test.

No catalogue, geographic reference or private workbook changes. Published credit fields take precedence when populated; work-level facet export retained as separate evidence. Baked catalogue remains fallback. Distinguish corrected effective display from underlying generated baked discrepancies; this does not rebuild the underlying static exports. Browser QA pending; actual physical Safari gesture still unverified.