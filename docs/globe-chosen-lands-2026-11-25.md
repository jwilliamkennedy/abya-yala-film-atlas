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
