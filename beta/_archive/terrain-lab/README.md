# Terrain comparison laboratory (isolated from the Atlas)

Live candidate page: `/beta/terrain-lab/`. The ordinary `/beta/` and production `/` routes are unchanged.

**Candidate A:** Open-source MapLibre with the hosted VersaTiles Natural style and Mapterhorn's Terrarium-encoded DEM tiles (hillshade + optional 3D terrain).

**Candidate B:** Genuine Natural Earth II with shaded relief (version 3.2.0, public domain) cropped from the official 1:10m global raster; the same Mapterhorn elevation tiles enhance local hillshade. The images are *not* claimed to represent new topography beyond the 1:10m source. Relative to live DEM terrain, Natural Earth will be softer at close zoom.

Natural Earth original: `https://naturalearth.s3.amazonaws.com/10m_raster/NE2_LR_LC_SR.zip`. The workflow `.github/workflows/terrain-lab-assets.yml` generates only the three region-specific WebP images and a provenance manifest within this folder. It cannot write to the root atlas files.

MapLibre GL JS source is pinned to version 5.6.0. VersaTiles demo tiles are free to try but have **no availability guarantee**; a funded permanent public atlas should self-host or choose a supported provider. Mapterhorn metadata and elevation tiles are open data but need provider/source attribution.

Attribution: Natural Earth (public domain); © Mapterhorn (see `https://mapterhorn.com/attribution`); © OpenStreetMap contributors (data used by VersaTiles).

**Read-only Indigenous layer:** an optional user-triggered load of `../territories-data.js` from the existing atlas, rendered as low-opacity polygon references only. These polygons are *not* authoritative boundaries, filmmaker residences, or new verified associations. There is no connection to the Excel master or to the filmmaker catalog.

### Acceptance checks

- `.github/workflows/terrain-lab-check.yml` validates the images against their SHA-256 manifest, syntax checks the JS, and opens both maps in headless Chrome.
- Before promotion, additionally inspect all three regions, drag/zoom synchronization, the 3D and hillshade settings, read-only overlay state, WebGL support, mobile display, and the actual on-screen terrain aesthetic.
- To delete the experiment, remove `beta/terrain-lab/` and the two terrain-lab workflows. Nothing outside those paths was edited during creation.

**No beta or production promotion is authorized by building this lab.**
