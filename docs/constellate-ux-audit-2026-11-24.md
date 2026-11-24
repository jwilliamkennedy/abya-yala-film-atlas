# Constellate UX audit — 24 November 2026

Design rule: fewer visible controls, meaningful objects, deeper contextual interactions. High-school visitors and professors use the same workspace. No automatic saving. Watch integration remains deferred. Beta only.

## First 50 (selected for implementation)

This is an implementation tracker, not a certification that every acceptance criterion passed. Previous beta work, the explicit-save change, and the film-first pass contribute to these items. **In place** means corresponding code exists; **partial** means an additional acceptance criterion, integration, or accessibility check remains. All require browser verification. No production promotion until checks pass.

| Audit # | Item | State |
|---:|---|---|
| 3 | Toolbar hierarchy | In place / verify |
| 6 | Theme map lens | In place / verify |
| 8 | Map return | In place / verify |
| 9 | Contextual help | Partial / verify and refine |
| 10 | Intrinsic stars | In place / verify |
| 11 | Distinct node shapes | In place / verify |
| 14 | Persistent selected labels | In place / verify |
| 15 | Restrained glow | In place / verify |
| 17 | Temporary film preview | Partial / verify and refine |
| 18 | Full selected title | In place / verify |
| 19 | Balanced geography | Partial / verify and refine |
| 21 | Midnight palette | Partial / verify and refine |
| 22 | Shared semantic tokens | Partial / verify and refine |
| 23 | Thread contrast | Partial / verify and refine |
| 25 | Neutral archive stars | In place / verify |
| 26 | Selection ring | In place / verify |
| 28 | Readable metadata | In place / verify |
| 29 | Typography hierarchy | Partial / verify and refine |
| 31 | Artwork-led land gallery | In place / verify |
| 32 | Shared artwork component | In place / verify |
| 33 | Larger posters | In place / verify |
| 34 | Neutral title placeholder | Partial / verify and refine |
| 35 | Preview before Add | In place / verify |
| 36 | Documented suggestions | In place / verify |
| 37 | Contextual comparison | Partial / verify and refine |
| 39 | Viewing link consistency | Partial / verify and refine |
| 40 | Artwork-independent discovery | In place / verify |
| 41 | Visual themes | In place / verify |
| 42 | Film junctions | Partial / verify and refine |
| 43 | Clickable theme tags | In place / verify |
| 46 | Catalog coverage caveat | In place / verify |
| 48 | Sources | Partial / verify and refine |
| 49 | Film form | Partial / verify and refine |
| 50 | Personal concepts | In place / verify |
| 55 | Shared route themes | Partial / verify and refine |
| 57 | Exact selection preview | Partial / verify and refine |
| 60 | Evidence line patterns | Partial / verify and refine |
| 70 | Archive/user separation | In place / verify |
| 76 | Land evidence | Partial / verify and refine |
| 81 | Explicit Save | In place / verify |
| 82 | Fresh workspace | Partial / verify and refine |
| 83 | Local persistence explanation | In place / verify |
| 84 | Draft distinction | Partial / verify and refine |
| 85 | Temporary share snapshots | In place / verify |
| 91 | Mobile primary controls | Partial / verify and refine |
| 93 | Keyboard access | Partial / verify and refine |
| 94 | Reduced motion | In place / verify |
| 95 | Translations | Partial / verify and refine |
| 96 | Shared index | In place / verify |
| 100 | Regression coverage | Partial / verify and refine |

## Reserved 50 — do not implement as part of the first pass

| Audit # | Item |
|---:|---|
| 1 | Cinematic night sky |
| 2 | Legible archive clusters |
| 4 | Archive entry |
| 5 | Drawing discoverability |
| 7 | Read versus Play |
| 12 | Neutral star density |
| 13 | Expandable clusters |
| 16 | Direct concept placement |
| 20 | Unmapped film dignity |
| 24 | Contextual theme-family colors |
| 27 | Concept default color |
| 30 | CSS consolidation |
| 38 | Synopsis comparison |
| 44 | Rare intersections |
| 45 | Optional theme families |
| 47 | Preview themed selection |
| 51 | Draw versus move |
| 52 | Route preview |
| 53 | Live counts |
| 54 | Sampling controls |
| 56 | Deselect intersections |
| 58 | Branching |
| 59 | Inspect link annotations |
| 61 | Direct personal stars |
| 62 | Flexible concepts |
| 63 | Thread junctions |
| 64 | Optional descriptions |
| 65 | Cluster notes |
| 66 | Inspectable citations |
| 67 | Compare threads |
| 68 | Undo feedback |
| 69 | Rich exports |
| 71 | Contextual timeline |
| 72 | Historical depth |
| 73 | Manual order |
| 74 | Reversible geography |
| 75 | Stable layouts |
| 77 | Multiple references |
| 78 | Undated films |
| 79 | Decade comparisons |
| 80 | Catalog gaps |
| 86 | Curated examples |
| 87 | Evidence exports |
| 88 | Clean presentation |
| 89 | Read by intersection |
| 90 | Watch itinerary |
| 92 | Mobile thematic exploration |
| 97 | Targeted rendering |
| 98 | Verified work IDs |
| 99 | Observer removal |

## Acceptance gates

- Map–Constellate return restores interaction and clears preview, drawing, theme and playback state. Repeated desktop and mobile transitions.
- Clicking land or film only previews; adding and saving are independently explicit. Save persists only the active constellation snapshot. Previously saved data remains intact.
- The archive appears intrinsically as neutral land stars. Film selection is indicated by a ring; added films by a solid circular node; personal stars by an outlined diamond. Land markers are not film locations.
- Gallery and recommendations do not exclude films lacking imagery. Artwork comes from the published catalog. Sources and catalog metadata are accessible; no implied cultural affinity or causal historical influence.
- Theme chips select up to two published terms; intersection is exact and does not modify user work.
- Keep comparison, annotations, presentation, chronology and exports available without another permanent toolbar group. Do not expand Watch yet.
- Browser tests must pass before calling the work complete. Translation coverage, semantic palette consolidation, and mobile/keyboard behavior require additional verification. Stable work-ID migration and wholesale render refactoring remain reserved.
