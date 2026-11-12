# Constellate: one module, and the browser suite (12 Nov 2026)

## Where Constellate lives now

| File | What it is |
|---|---|
| `assets/constellate.js` | All Constellate behaviour, in seven sections in their original order: embedded view; engine (state, map drawing, panel, Follow, Play, share); published constellations (`?c=slug`); the featured constellation; the toolbar's Options menu; Theme web; stages, start card, guide box, suggestions and legend. |
| `assets/constellate.css` | All Constellate styling, in six sections in their original order: film images and cards; Theme web; stages and start card; map polish; night map, threads, stars and Night Loom; controls, filters and the Off the map rail. |
| `collections-store.js` | The saved-constellations store. Separate because the Saved lists on the Map page use it too. |
| `theme-tags62.js` | Theme data. |
| `weave-route62.js` | One line that records the incoming address before the atlas rewrites it; it has to run first. |
| `constellations/` | Published constellations. |

These files replaced, and no longer exist: `constellation-embed.js`, `atlas-constellate62.js`, `constellations.js`,
`featured82.js`, `assets/constellate-bar.js`, `assets/constellate-theme-web.js`, `assets/weave-20261109.js`, and the
stylesheets `constellate-thumbnails-20261108`, `constellate-theme-web`, `weave-20261109`,
`constellate-map-polish-20261109`, `constellate-map-50fix-20261109`, `constellate-controls-20261110`.
Git history keeps them.

Rules for editing:

- Change a thing where it is defined. Do not add another script or stylesheet that relabels or restyles Constellate from outside.
- Work in `beta/`, then promote with `tools/promote_beta.py`. The beta and the main site are the same files.
- After a change to `beta/index.html`'s `?v=` numbers, raise the number on the file you changed.

What the consolidation did not do: the stylesheet still has 365 `!important` declarations (397 before), because the
sections still override one another and `atlas.css`. Removing them safely is a separate job; the suite below is
what makes it possible.

## The browser suite

`tools/qa/atlas-suite.py` drives the site through 23 states in a real browser: the Map page (day, night, Map key,
Layers, search, a filmmaker, the time dial), Constellate (start card, Follow, Build, a selected film, Add films,
Share, Play, Theme web, three threads, no map, night) and four phone states.

In each state it checks behaviour, and it records a fingerprint: every visible element's position, size, text and
computed style (about 10,000 elements in all).

    python3 -m http.server 8983 &
    python3 tools/qa/atlas-suite.py capture http://127.0.0.1:8983/beta/ /tmp/after --shots
    python3 tools/qa/atlas-suite.py compare /tmp/before /tmp/after

`compare` lists what moved, restyled, appeared or disappeared, element by element. Two runs of the same site are
identical, so any difference comes from the change being tested.

Left out of the fingerprint on purpose: map tiles and their fallback land shapes (outside hosts are blocked in
tests) and the small film stills beside land names (they rotate on a timer).

On GitHub, the workflow **Atlas browser suite** runs on every push that touches the site. It fails when a state is
broken. It also compares the push with the one before it and puts the list of changes in the run summary; that
comparison fails the run only when the commit message contains `[no-visual-change]`.
