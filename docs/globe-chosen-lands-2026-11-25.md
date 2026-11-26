# Globe: chosen lands, local land, no satellite (25 November 2026)

John's decision (25 Nov): keep the sphere, drop what made it a surveillance view.

- **No satellite imagery, no elevation.** NASA GIBS, EOxCloudless and Mapterhorn are removed from the globe. Land is the Natural Earth 1:50m coastline (`assets/world-50m.json`, already local) filled in the flat map's stone `#d9dbdd`; the sea is the flat map's blue-grey `#8093a1`; rivers and lakes from OpenFreeMap at zoom 6+, in the same colour. Basemap place, water and peak names stay off, as on the flat map. The Terrain (tilted) button is gone; `syncTerrain` does nothing.
- **Territories at full strength.** Ambient fill 0.30–0.40, edges 0.35–0.70 (Soft/Strong still multiply these). Lands are always on: the Lands switch is hidden and an old `territories=off` link opens with lands shown.
- **No reticle, no tuning.** `#globe-aperture` is hidden (kept in the page because hit-testing measures it). Moving the globe never chooses a land. A land opens when it is chosen: click or tap it, pick it in Find, follow a link, or press Enter (the land at the centre of the view). It stays open while the globe moves, until another is chosen (`heldLand` in `settle()`); Home clears it. With nothing chosen the panel is hidden (`#globe-encounter.is-empty`). Hovering shows the land's name (`#globe-hover-name`).
- **Globe, then flat.** Projection `['interpolate',['linear'],['zoom'],5,'vertical-perspective',7,'mercator']`: a sphere at the scale of the continent, a flat map at the scale of a land.
- **Antimeridian.** The native land fill uses the unmerged countries, with rings made continuous past ±180 and polar rings closed along the pole (`planarRings`). Without this Chukotka and Antarctica drew bands round the globe (previously hidden under the satellite layer).
- **Fallback canvas** uses the same stone, blue-grey and ink; the colour relief raster is no longer drawn.
- `assets/globe-experiment.js` (unused) is deleted.

Checks changed to the new contract: `tools/qa/globe-independent.py` (terrain mode: no remote imagery or mesh, reticle hidden, chosen land held across camera moves; lands always on), `tools/qa/globe-discovery.py`, `tools/qa/globe-share.py`. Local runs (Chromium, SwiftShader, external hosts blocked): terrain, input, discovery-page and share suites passed; the independent discovery mode stops on an artwork-frame check locally (images blocked), as the unedited code also fails locally.

Still to do: Constellate on the globe (night sky, threads as arcs), the theme web as arcs, then retire `flat.html`.

## Later the same evening: NASA Blue Marble
John asked to get as close to NASA as possible. The globe now layers NASA Blue Marble Next Generation, live from GIBS (`GoogleMapsCompatible_Level8`, up to zoom 8), unaltered, with NASA's ocean (`#1e3b73` underneath while tiles load). This is the 500 m cloud-free composite, not the 10 m EOxCloudless satellite layer, which stays out, as does Mapterhorn and the terrain mesh. Territories are washes over the imagery (fill 0.20–0.28) with firmer edges (0.50–0.85); film points and counts are light with a dark outline; land names light on a dark halo. Natural Earth 1:50m rivers (`assets/rivers-ne-50m.geojson`, 0.5 MB, local) show between zoom 3.5 and 7.5; OpenFreeMap rivers and lakes from zoom 6. Checks allow GIBS and still forbid EOX and Mapterhorn.

## Constellate on the globe (25 Nov, night)
- The top-bar button is **Constellate** (was "My films"); **Linking** while linking. Opening it turns the globe to night (`applyNight`, `NIGHT` table): Blue Marble dimmed and desaturated, sea near-black, lands faint, film points dim; collected films become gold-haloed stars and links solid gold great-circle arcs. Closing restores the day values read from the style.
- One verb, **Link**: "Link films" in the panel, "Link" / "Link here" / "Chosen" on the film card. Reasons are one click (answers, echoes, counterpoint, and shares land when both films have the same land reference); or type your own and press Enter. Type and note sit behind "Add a note". Counts read "2 films · 1 link".
- The old Connect button (thematic links to other lands) is **Theme web**.
- Film cards: films without artwork show their title's initials on a dark card (was "No artwork"); the pager reads "2 of 10"; the "with artwork · to watch" line is gone; Hide/Show replace Hide details/Show details.
- Film points: a smaller core; the chosen land's point is larger with a gold ring; the chosen land's fill and outline are stronger.
- Tests: "Linking (1)"; the note test opens "Add a note" first.

## Nodes and theme weaving (25 Nov, late)
- Film nodes are larger (2.8–5.6 px plus up to 1.6 px with zoom), near-white with a 1.2 px dark ring and a soft halo; the chosen land's node grows and takes a gold ring; nodes of a chosen theme are a step larger and warmer.
- **Theme weaving:** choosing a theme joins its lands with gold great-circle arcs, each land to its nearest neighbour in the theme (a minimum spanning tree, `updateWeave`), so a theme reads as one web; `AtlasGlobe.weave` reports lands and arcs (Water: 39 lands, 38 arcs).

## Gather on the globe (25 Nov, late)
- Top bar: Find · Themes · Discover · **Gather** · Map · Constellate. Gather turns the pointer into a pen (map panning off); the drawn line follows the curve of the earth (`gather-line`). On release the lands with films within 20 px of the line (26 px on phones) are listed in the order the line meets them, with film counts; a land opens on click; **Collect all** (first 60) adds them to the current thread in that order; Draw again, Clear, Escape. The click that follows a release is swallowed so the camera does not jump.
- Test: `.globe-primary button` count is 6.

## Constellate: clusters and the thread journey (25 Nov, late)
- Films collected in one land spread into a ring of stars about 14 px apart at any zoom (`updateClusters`, `globe-cluster`), so links between them draw as short gold lines (`globe-inner-links`); the grouped star shrinks to a 2 px centre when its land holds more than one film (hit-testing and the star counts are unchanged).
- Read this thread keeps the night sky; each step lights the arc just travelled from the previous film's land (`journey-arc`); End clears it and returns to the day unless Constellate is open.

## Lands unfold, Draw in Constellate, panels (25 Nov, night)
- Lands are feathered washes in their own colour (blurred lines under a light fill); the polygon outlines are gone, and the chosen land is a soft glow.
- Film names appear from zoom 3.4 (fully at 3.7), the land with most films first; at zoom 5.8 and closer, film thumbnails sit on the map (22 at most, 8 on phones); a thumbnail opens its land. Neither shows at night or while gathering.
- **Draw in Constellate:** the Constellate panel has Draw (also offered when the constellation is empty). It keeps the night sky and draws the line in gold; on release the films along the line are listed, and **Add in order** or **Add and link in order** puts the first 60 into the thread in the order the line meets them, the second linking each film to the next. Clear or Escape returns to Constellate.
- Clusters spread up to 8 films in a land; a land with more keeps one larger star.
- Loading: a drawn globe turns while the atlas opens; missing artwork shows the title's initials; loading artwork shimmers.
- Menu panels (Find, Themes, Map, Gather, Constellate) share one style: dark frosted panel, serif headings, small capitals for labels, 38 px fields, rounded buttons, chevrons on folded sections.
- The fallback canvas (no WebGL) uses NASA-like sea and land colours with light points.

## Draw lights lands as it goes; Constellate settings; thumbnails (25 Nov, night)
- **Draw (Gather and Constellate)** works as the flat map's did: as the line crosses a land's territory (or passes within 14 px of its films) the land lights in gold, its node takes a gold ring, and the panel counts it live ("Nasa · 6 lands · 31 films"). The line no longer has to touch a node. On release every land in the list can be switched off; ↗ opens it. In Constellate: **Keep this thread** adds one film per land, linked in the order the line meets them; **All N films** adds every film in order. In Gather: Collect N films (first 80).
- **Constellate settings:** the constellation and thread names are edited in place in the panel heading; "Other constellations and threads" holds the two pickers, New thread, New constellation and Download a copy.
- **Thumbnails** appear only from zoom 7, once the map has flattened, so they do not drift over the sea during the globe-to-map transition; they are larger (84 × 60, 64 × 46 on phones), stand on a short stem over their land, at most 16 (6 on phones), and never overlap.
