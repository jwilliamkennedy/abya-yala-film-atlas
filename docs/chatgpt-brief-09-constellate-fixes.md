# Brief 09 — Constellate: fixes from a browser run (11 Nov 2026)

Claude ran the beta's Constellate in a real browser (desktop 1440×900 and phone 390×844) at commit `aa9a445`. The jobs below are for ChatGPT. Work in `beta/` only. Do them in order; Job 1 first, and push it before starting Job 2.

**Ground rules**
- Edit `beta/atlas-constellate62.js`, `beta/assets/constellate-theme-web.js`, `beta/assets/constellate-controls-20261110.css` and `beta/i18n-20261107.js`. Do not edit `assets/weave-20261109.js`, `assets/weave-20261109.css`, `assets/constellate-bar.js` or the `constellate-map-*` stylesheets; Claude is changing those.
- Do not add a new overlay script or stylesheet. Fix each thing where it is defined. No new `!important`.
- Leave thread colours, thread opacity, the night map, the start screen, the guide box, the phone layout and the share-link format alone. Claude has those.
- Pull before each push. Claude is pushing to the same repository; if your push is rejected, fetch, rebase and push again. Never force-push.
- Before you report, open the beta in a browser and check each item by eye. A syntax check is not a test.

## Job 1 — Bugs a first-time visitor sees

1. **Threads break when a film is off-screen.** In `point()`, an anchor outside the viewport returns `null`, and `threadPointsRaw()` then cuts the thread. The example opens with two cards and no line.
   - Keep off-screen films in the path: clamp the point to the map edge and draw the thread to it, with a small arrow at the edge.
   - Make `fit()` include every film on a visible thread, including films placed by `countryAnchor()`.
2. **Play leaves map controls on screen.** `.zoom` and `.map-toolbar` (Countries / Layers / Map key) stay visible, half-cut by the letterbox. `atlas.css` hides `.zoom` under `body.weave-playing`, but a later rule sets it back to `display:flex`. Find that rule and fix it there; hide `.map-toolbar` too.
3. **Play shows no position.** `#weave-play-progress` is clipped to 1×1 px. Show it in `#weave-play-thread` as an eyebrow: `THREAD NAME · 2 OF 4`, counting within the thread. Keep a screen-reader status.
4. **Play stops on the last film.** After the last stop, fit the map to the whole constellation and show a closing card: constellation name, author, and the citation. “Replay” stays.
5. **Add-films filters wrap badly.** In `#weave-discovery-tools`, each checkbox sits on one line and its label on the next at a 327 px panel. Keep each checkbox and label together on one line.
6. **Follow clips the constellation title.** The `h3` in `#weave-read-panel` is cut off under `.constellate-heading`.
7. **Status messages cover film cards.** `#weave-notice` sits over the map for 6.5 s and stays when the mode changes. Move it to a fixed strip at the bottom edge of the map, 4 s, and clear it on any mode change.
8. **Theme Web labels are hidden by neighbouring circles** (“Land Defense”, “Elders and Knowledge”, “Women and Gender” at 1440 px). Increase row spacing in `drawGraph()` so each label clears the next node's halo.

## Job 2 — Films without a mapped land

9. **Stop drawing unplaced films at a country's centre.** 436 of 1,555 films have no mapped land reference. `countryAnchor()` puts them at the country's centre point, which is another nation's land (Canada's point is 57°N 106°W; *Yintah* is drawn there).
   - Remove the map pin for these films. Show them in an “Off the map” rail along the bottom edge of the map, in thread order, with the caption “Land not yet mapped”.
   - The thread runs to the rail and back, so order is still readable.
   - In “Disappear map” they behave like any other film.
10. **List first: filmmakers with a people recorded but no mapped land.** There are 247. Save `mirror_work/land/unmapped_lands_2026-11-11.csv` with: `filmmaker_id`, `name`, `nation_or_community` as published, `land_reference_name` if one exists unmapped (e.g. Wet'suwet'en), `proposed_native_land_territory`, `proposed_source_url`, `notes`. Do not map anything yet; Claude checks the list. Never propose a land from a surname, a language, a film's subject or a festival section. Leave the proposal blank when the published text names only “Inuit” or “First Nations” and say so in `notes`.

## Job 3 — Evidence in Follow, exports and citations

11. **Name both films in a connection.** Follow, the reading path and the CSV show only the label (“echoes”). Show `label → other film's title`, and mark each one “sourced” (with its link) or “interpretation”.
12. **Check factual quick labels against the atlas.** In `connectionForm()`, “shares land”, “shares language” and “same collective” save as interpretation in one click.
    - Add a connection kind, `atlas-record`, shown as “confirmed by atlas record” and drawn like a sourced connection.
    - “shares land” saves as `atlas-record` only when both films have the same mapped land reference. “shares language” and “same collective” follow the same rule against the published language and collective fields.
    - When the atlas can't confirm the claim, the label opens the note-and-source form instead of saving at once.
13. **Keep building instructions out of the curator's voice.** `themeThread()` and `createExample()` write “Start with a small selection… Reorder, compare and annotate freely” into the thread description, and it then shows on every Follow step and in print. Leave the description as “Films tagged <theme> from their published synopses.” and move the rest to the `#weave-theme-more` box. `themeTermFor()` matches on that sentence; keep it working.
14. **Rename “Shared themes” in Follow to “Themes”.** It lists one film's own tags.
15. **Expose the per-film question.** `renderOrder()` has a handler for `[data-note-edit]` that asks “Why does this film follow <previous film>?” but no button renders. Add a small “Why here?” button on each row of `#weave-order-list` that opens it.
16. **Citation date.** `updatedAt` is set by `save()`, which runs when a constellation is merely opened or a thread is selected. Add `editedAt`, set only inside `transaction()` when content changes, and cite that date in the reader's local time, not UTC.
17. **Citation author.** When `author` is empty, “Copy citation” and “Cite” first ask for a name. If it stays empty, cite without an author, not “Anonymous curator”. Wrap the citation text so it never overflows the panel.
18. **Export filenames.** Use `<constellation-name>-<yyyy-mm-dd>.json` and `.csv`.

## Job 4 — Finding films

19. **Apostrophes.** In `norm()`, map ’ ‘ ʼ ꞌ ` and ' to one character before matching. Today “Wet'suwet'en” typed on a keyboard returns 0 and the curly form returns 1; “K’iche’” curly returns 0.
20. **Punctuation-free and near matches.** Also match with apostrophes and hyphens removed (“wetsuweten”, “kiche”), and allow one transposed or missing letter for words of six letters or more (“hopnika” → Hopinka). Exact matches rank first.
21. **Search the names on the map.** Add each film's mapped land-reference names and autonyms to the searched text in `renderResults()`. “Hoocąk” returns 0 today; “Ho-Chunk” returns 25.
22. **More filters.** Beside “Not on thread”, add country, decade, form and length. Form and length are already loaded as `weaveForm` and `weaveLength`. Each filter shows its count and clears with the existing Clear button.
23. **More bases for “could come next”.** `renderSuggest()` uses theme tags only, and 548 of 1,555 films have tags. Add: same mapped land, same people as published, same filmmaker, same published language, same decade. Each suggestion states its basis (“Same land: Wallmapu”). Never suggest from a surname or from an unmapped place. Leave the ranking of films already on the thread to Claude.

## Job 5 — Keyboard and screen readers

24. **Tab order.** It takes 103 Tab presses to reach the first film card. Add a “Skip to the constellation” link as the first stop in `#constellate-mode`, and place `#constellate-graph` in the tab order right after the toolbar.
25. **Focus is lost when the map moves.** `renderGraph()` replaces the whole SVG on every `atlas-camera-frame`. On camera frames, update the existing elements' transforms and path data in place; rebuild only when the constellation changes. A focused card must stay focused through a pan.
26. **Focus ring.** A focused card has a 2 px ring of `rgb(24,32,40)` on a navy card. Use a light ring (the card's thread colour, 2.5 px) in both themes.
27. **Roles.** Move the connect handle out of the card's `role="button"` group (10 nested-interactive failures in axe). Give `[role=tab]` buttons `aria-controls` and matching `role="tabpanel"` regions.
28. **Translations.** In ES, PT and FR the start-screen lede, “Theme web”, “Options”, the Help steps and the Play controls stay in English. Add them to `i18n-20261107.js`. Keep film titles, peoples' names and land names untranslated.

## Job 6 — Saving and images

29. **Backup prompt.** Constellations live only in this browser. After 20 saved changes without an export, and whenever `S.failed` is true, show one line in the panel: “Saved in this browser only. Download a backup.” with the JSON button. Dismissible; shown again after another 20.
30. **Image links in the nightly check.** 547 of 633 film images load from 127 outside hosts. Add image URLs to the health check and write failures to `broken_images_<date>.csv`. Replacement links go through the usual images list.

## Report back

For each item: done, or not done and why. Then screenshots from the beta at 1440×900:
- the example straight after “Open the example”, with its thread visible;
- a Play frame showing the eyebrow and no map controls, and the closing card;
- a thread with an unplaced film on the “Off the map” rail;
- Follow with a connection that names both films;
- a search for “Wet'suwet'en” and one for “Hoocąk”.

And one at 390×844 of the Add-films filters.
