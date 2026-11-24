# Constellate architecture consolidation — 24 November 2026

Beta only. The map is a discovery surface, not a collection manager. A land reference opens a film gallery; a film opens its artwork, recorded metadata, sources and related films. Back returns through the temporary discovery trail. Add is explicit; Save is explicit. Watch remains deferred.

## Ownership

- Published catalog / relationship index: read-only, one index by theme, land, recorded people and language, maker, decade and form. Per-land theme sets and film counts are derived once. Theme intersections include only films carrying both published terms; no fabricated connection. Existing title/year work grouping is unchanged and must be audited separately.
- View state: theme lens, selected land(s), preview and a bounded preview trail. Map selector, theme chips and Theme web feed the same lens. Second term is optional, counts refer to the current catalog, zero matches are valid. Changes do not write to collections or rebuild the map.
- Workspace: AtlasCollections in-memory draft; explicit persist/delete only. Existing saved collections and authored thread colors are preserved.
- Map lifecycle: dock changes measure dimensions and resize only when necessary. Enter without opening and closing an empty dock. Exit clears transient state and restores the main map. No map data edits.
- Rendering: camera frames and final graph layouts coalesce into a single scheduled update, search facets are cached, search renders when opened, related rankings bounded, graph collision passes bounded with spatial buckets. Stage observer watches body class and named controls instead of all descendants. Knot visibility is synchronized with graph generation.

## Acceptance and remaining risks

- Desktop and mobile real browser checks: repeated Map return and zoom, first-paint geometry, successive stars, previews and Back, direct theme selectors with exact intersection and unchanged camera scale, explicit Add/Save.
- Prior CI had failures including the mobile first-paint shift, return zoom assertion and obsolete welcome-screen selectors. Do not treat these as passed until a new run succeeds. The retained hidden welcome component and older QA contracts need separate migration; production remains untouched.
- No stable-ID migration, wholesale rewrite, Watch integration or data-schema changes. Further work should be driven by actual browser traces and user observations, not additional menu features.
