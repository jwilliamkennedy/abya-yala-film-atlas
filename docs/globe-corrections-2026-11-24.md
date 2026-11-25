# Final correction pass: public catalogue and discovery

Confirmed a801efc audit (run 45540948261, job 138959033181): no effective CSV discrepancies, exact 3,081 credits and 1,493 makers, no name-export differences. Upstream disagreements remain: baked / derived facet exports respectively themes 27/27, form 180/180, length 250/250, primary theme 14/14, languages 6/3. These are field-level counts, not unique films. No source files were rewritten. Need upstream publication rebuild review rather than assuming older values are wrong.

This patch fixes the remaining globe filter mismatch: native and fallback hit-testing, aperture lights and territory highlights now use the same combined filter as film encounters. Clear filters explicitly redraws; shared URL restoration no longer reintroduces cleared filters after refresh; exit removes facet parameters. Preview exposes length/runtime/credit. Same-origin HTTP profile and CSV links work on local QA. Added actual all-anchor form-filter assertions and clear/share tests, bidirectional CSV ID comparisons. Syntax passed, fresh browser verification pending.

Broader site checks still fail because beta intentionally opens directly in Build, yet tests assume visible retired welcome card; other failures are map-return timing and browser-suite capture. Do not restore obsolete welcome UI just to pass tests. Physical Safari pinch not verified.
