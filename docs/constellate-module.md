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

## The toolbar (13 Nov 2026)

One row in four groups: the constellation's name; **Build | Follow** as one switch with **Play** as the one filled
button; the building tools (**Add films · Link films · Draw a line · Theme web**, Build only); and **Undo · Redo ·
Share · Options · Exit**. Clear sits beside Undo, in the accent colour; it asks first and Undo restores. The bar measures itself and
steps down only while it overflows: full labels, then short tool labels, then Share/Undo/Redo into Options, then the
tools on a second row (phones). The structure is set by `place()` in the "Constellate toolbar" section of
`constellate.js`; every style for `#constellate-mode` is the "Constellate toolbar" block at the end of
`constellate.css`. The 175 older toolbar rules in `atlas.css`, `ui-20261109.css` and `constellate.css` were removed.

## How the tools divide the work

Gather (Add films, Draw a line, Theme web, a theme or film on the start screen), Connect (Link films: click cards in
the order the thread runs; Say why two films connect: a note on one pair), Present (Follow, Play, Share). Add films
is a toggle: it shows the search, and a second press returns to the thread.

## Draw a line (13 Nov 2026; first called Trace a line)

In Build, **Draw a line** (toolbar, and the first row of the start screen; `?constellate=1&trace=1` opens it
directly) lets a visitor drag a line across the map. Every land the line passes through that has films in the atlas
joins the line in the order it is crossed, its territory brightening as the line enters it. On release a card lists
the lands in order with their film counts; lands can be unticked; one button threads one film from each kept land
(its most recent dated film), another threads all of them when there are 80 or fewer.

- A land is "crossed" when the line passes inside its territory shape in the atlas's own territory layer
  (`#atlas .nation-wash[data-land]`), or within 14 px of its marker. Only mapped land references already attached
  to a film are used; nothing is inferred from names, languages or countries.
- Each film in the thread is pinned to the land it was gathered from, so it sits on that land even when the film has
  other mapped references.
- The thread's name is `first land → last land`; its description says how it was made.
- Code: the `Trace a line` block in the core section of `constellate.js` (`startTrace`, `traceSample`, `lineThread`)
  and the block of the same name in `constellate.css`. API: `AtlasConstellate.trace()`, `.stopTrace()`, `.tracing`.
- While drawing, the scroll wheel still zooms the map, and a **Draw / Move map** switch at the bottom lets the map be dragged; land names stop catching the pointer so a drag on them moves the map.
- Not built yet: a keyboard way to draw (choose a first and last land), translations, and an entry on the Map page.

## The browser suite

`tools/qa/atlas-suite.py` drives the site through 25 states in a real browser: the Map page (day, night, Map key,
Layers, search, a filmmaker, the time dial), Constellate (start card, Follow, Build, a selected film, Add films,
Share, Play, Theme web, three threads, no map, night, a traced line) and five phone states.

In each state it checks behaviour, and it records a fingerprint: every visible element's position, size, text and
computed style (about 10,000 elements in all).

    python3 -m http.server 8983 &
    python3 tools/qa/atlas-suite.py capture http://127.0.0.1:8983/beta/ /tmp/after --shots
    python3 tools/qa/atlas-suite.py compare /tmp/before /tmp/after

`compare` lists what moved, restyled, appeared or disappeared, element by element. Two runs of the same site are
identical, so any difference comes from the change being tested.

Left out of the fingerprint on purpose: map tiles and their fallback land shapes (outside hosts are blocked in
tests), the small film stills beside land names (they rotate on a timer) and the status notice (it times out on its own).

On GitHub, the workflow **Atlas browser suite** runs on every push that touches the site. It fails when a state is
broken. It also compares the push with the one before it and puts the list of changes in the run summary; that
comparison fails the run only when the commit message contains `[no-visual-change]`.
