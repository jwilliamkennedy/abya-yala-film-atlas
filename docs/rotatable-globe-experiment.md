# Rotatable cinema globe — experimental beta
Open `beta/?constellate=1&globe=1`. MapLibre's local module renders a globe using the existing Natural Earth country geometry (no country labels or boundary strokes) and mapped land-reference coordinates from the Atlas. The existing theme and film discovery panels are reused. Drag, zoom, select a light, use the keyboard-accessible land selector, or use the existing theme filter. No automatic camera focus on theme or film discovery. The Americas reset and Find land are deliberate navigation.

Radio Garden credits MapLibre as its 3D globe engine: https://radio.garden/settings/radio-garden
MapLibre globe example: https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/
Native Land Digital's current policy moves toward language-centered mapping and removes territories from its API: https://native-land.ca/about/what-we-map
Do not re-fetch or republish withdrawn territory polygons. Existing Atlas land references are educational reference points, not official boundaries or filmmaking locations. Review provenance and community preferences before expanding coverage.

This is opt-in discovery, not a full migration. Existing drawing, personal nodes and saved workspace rendering remain on the flat map; the globe hides their creation controls. Flat workspace exits the prototype without reloading the page. No new data, no saved collection changes, no production edits. MapLibre may transition toward Mercator at high zoom. Validate on desktop and mobile before any default switch; improve keyboard focus, overlapping point selection, accessible non-geographic film search, curated editorial tours, and integrate drawing/graph projections before retiring the flat map.
