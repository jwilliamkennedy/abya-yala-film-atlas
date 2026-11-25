# Globe evening integration audit — 24 November 2026

## Scope and baseline
The chronological and reverse-chronological GitHub inventories yielded 175 distinct commits through the catalogue rebuild at 876c37d. The comparison from 10a3331e to a9cf6fed contains 173 commits after the baseline. These are inventories and cumulative-file comparisons, not a certification of each individual diff or generated filmmaker page. The public beta is the target; the private Queue and production assets are out of scope.

## Integration findings and repairs
- f72378f: one geographic containment/selection path for both renderers, one wheel easing calculation, atomic filter invalidation, moving fallback during native handoff, smooth count/name opacity, removal of unused controller state.
- 288dd80: 50 obsolete CSS selector branches removed; bottom-left panel uses measured available space and explicit short-landscape constraints.
- 32d7351 / 0678b4e: territory visibility and terrain pitch preserved in globe share URLs and the Watch return allowlist; no arbitrary external return URL.
- 27deb89 / bec2ae8: clean-profile territory visibility, atomic filter change and terrain share assertions.
- dc77e72 / 5fcd6e6 / 44ef025: matched Watch template and beta cache versions, globe JS/CSS cache bump.

## Verification
The fetched final globe and Watch JavaScript both parsed successfully. The actual shared easing helper passed nine pure-function cases (positive and negative targets at four frame rates, plus reduced motion). The actual bounding-box prefilter passed six cases including both sides of the antimeridian. The removed selector classes are absent from the stylesheet. Watch template and beta use v9; globe JS v61 and CSS v46. These checks do not replace Playwright/WebKit or physical device tests.

## Acceptance gates still open
1. Confirm current-head independent terrain, discovery, input, CSV and artwork runs and browser compatibility. Inspect screenshots, not merely workflow conclusion.
2. Repeat Salish & Kootenai explicit land selection, polar and antimeridian edge cases, including a conflicting overlap and no-film territory. Check selected land, exact film credit and reticle coordinates.
3. Verify fallback-to-native transition with delayed imagery, actual pan/zoom during the handoff, and native context loss at high zoom. Check physical Safari pinch/trackpad separately from synthetic gestures.
4. Confirm new terrain pitch and territory visibility restoration across shared views, clean profiles, and external Watch round trips. Verify embedded playback against actual allowed media hosts.
5. Inspect desktop, portrait and landscape film-card behavior with long names, no artwork, portrait artwork, and open sources; verify keyboard focus and reading-thread continuity.
6. Review full artwork decode audit results and send actionable research targets to the private Queue process. The research dataset and image sources are not modified by this pass.
7. Recheck exact published-credit concordance after fresh catalogue bakes; do not conflate the effective runtime CSV reconciliation with the underlying generated export.
8. After acceptance, divide the controller into camera/renderer, geographic selection, catalogue/encounter, and authored collection modules. Consolidate remaining cascade layers against screenshot baselines, and evaluate moving acceptance jobs into one workflow without dropping distinct tests.

## Constraints
No live browser or direct git network access was available during this audit. The connector did not expose push-triggered workflow results, and the public Actions page could not be fetched. Do not mark browser acceptance or deployment as complete on the basis of this file. Keep the globe beta opt-in until the remaining acceptance gates pass. Avoid concurrent data edits; catalogue rebuilds are proceeding independently.
