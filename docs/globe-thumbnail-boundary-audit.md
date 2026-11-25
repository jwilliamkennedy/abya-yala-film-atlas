# Thumbnail and boundary audit — 24 Nov 2026

Baseline da1ed9d passed dedicated globe acceptance and terrain/discovery/input/CSV; site check remains failing. This pass separates actual source artwork from UI suppression, checks every runtime credit and land for source coverage, samples actual browser decodes by host, and tests geographically spread land encounters including no-art lands. Report artifact distinguishes absent URL, load failure, timeout, and decoded images; image URL presence alone is not proof of load. No replacements with unrelated artwork.

The primary encounter now favors nearby matching cinema over an empty territory unless explicitly selected. Overlap choices show matching counts. Floating previews search additional positions and smaller intrinsic image sizes; panel retains the film when no safe placement exists. Diagnostic reason is exposed. Mobile transparent navigation wrapper no longer intercepts gestures.

The reported odd lines may be polygon clipping/tile boundaries, overlapping references, or genuine source edges. MapLibre now draws line geometry from original rings separately from fill polygons, splitting antimeridian-crossing line segments only for display and softening outline contrast. Original polygons and anchor coordinates are untouched. This does not prove the particular screenshot artifact is fixed; verify visually against source, toggle territory layer to isolate, and compare at multiple zooms.

Outstanding: physical Mac trackpad and visual screenshot review, full legacy-site regression reconciliation, user-directed constellations after discovery validation. 
