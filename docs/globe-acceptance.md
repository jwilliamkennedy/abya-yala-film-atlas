# Globe acceptance contract — 24 November 2026

**Superseded on 25 November 2026:** the globe no longer uses satellite imagery or elevation; see [globe-chosen-lands-2026-11-25.md](globe-chosen-lands-2026-11-25.md).

## Architecture
- MapLibre globe and one camera; same projection for all imagery, elevation, reference polygons and film anchors. Offline vector canvas is explicitly an overview only.
- NASA GIBS Blue Marble for overview, 2016–17 EOxCloudless for regional/local imagery (CC BY 4.0), Mapterhorn Terrarium DEM for genuine elevation displacement at 1x, with restrained hillshade. OpenFreeMap vector place context (no political boundaries) from regional zoom. Tile source credits displayed on map.
- The fixed aperture is the zoom focus. Separate DEM sources for geometry and hillshade avoid renderer conflicts; no dual camera. Wheel/pinch events accumulate in log zoom coordinates on one animation frame loop; native touch pinch is centered and rotation disabled. No automatic pitch or orbit. Terrain view is explicit, optional, and reversible.
- Show tile availability in the interface and retain original geographic references, including overlaps. Do not infer film locations from these references.

## Acceptance checks
- Native terrain is configured via style terrain, and real successful DEM and imagery responses are observed. A real sampled elevation near Acatenango must exceed 1500 m; no mocked height passes this requirement.
- Ctrl-wheel and ordinary wheel produce actual camera movement while retaining focal longitude, and the map center and return control are physically hit-testable.
- Capture planetary, overhead regional, and tilted terrain views at desktop and phone sizes. The workflow publishes screenshots even if a subsequent check fails. Existing geographic join checks remain independent.
- Browser automation cannot certify human trackpad feel. This needs a physical Mac/Safari or Chromium check. Do not call fallback imagery detailed topography. Satellite tiles are 10 m source imagery, not global street-level aerial photography.

Source specifications:
https://maplibre.org/maplibre-gl-js/docs/examples/display-a-hybrid-satellite-map-with-terrain-elevation/
https://mapterhorn.com/data-access/
https://cloudless.eox.at/license-non-commercial
https://nasa-gibs.github.io/gibs-api-docs/map-library-usage/
https://openmaptiles.org/docs/schema/

Dedicated workflow: `.github/workflows/globe-acceptance.yml`. Its browser test is independent of the broad site-check concurrency group and uploads screenshots from the actual site.
