# Constellate: complete discovery and navigation audit

**Date:** November 11, 2026. **Repository:** `jwilliamkennedy/abya-yala-film-atlas` (main and beta). **Methods:** source-code functional inventory and targeted implementation. The statements below describe verified source changes; successful live browser QA must be checked separately. No Queue, Published, Lists, filmmaker metadata or film metadata were edited.

**Design principle:** enable a reader to move from a question to a few films, discover a relation, explain that relation and return to the broader network. Preserve Build, Follow and Play, source provenance, user interpretation and the possibility of exploring the entire corpus without showing all of it at once.

## All user function areas and menu items

| Area | Controls and menus | Navigation and discovery role | Review finding |
|---|---|---|---|
| **Entry screen** | Start from theme (search, six popular chips, all-theme dropdown), film/maker search, example, Theme Web, saved collections | Choose a first object of inquiry before drawing a thread | Theme and film search are now parallel; a theme is a six-film starting sample. |
| **Primary toolbar** | Build, Follow, Play, Draw thread, Find/Add films, Theme Web, Undo/Redo, Clear, Options, Exit and thread stepper | Switch research modes and act on the active constellation | Modes remain top-level; secondary tools may relocate on narrow screens. |
| **Options menu** | Fit map, timeline, show atlas markers, show every card, disappear map, compare threads; Share and history on compact layouts | Access advanced views without cluttering main modes | Menu placement changes responsively; its names must remain consistent. |
| **Constellation library** | Collection picker, + New, optional week count, Details, title, author, intro, JSON import and Delete | Create, reopen, rename and preserve user-authored work | Delete collection is not the same as clearing one thread. |
| **Thread editor** | Thread/Add films tabs; + Thread; theme starter; name/description/color; edit/duplicate/delete; year/place order | Build a sequenced argument with a traceable authorial voice | The active target thread is not necessarily the only visible one. |
| **Legend and focus** | Thread visibility checkboxes, select active thread, focus selected thread / show all threads | Read and isolate one argument without changing membership | Focus is a temporary view filter, not saved data mutation. |
| **Film and filmmaker browser** | Search title, director, people, country and theme; sort; not-on-thread; sourced-image filter; A–Z; 48 results; show more; add or open; six-film bulk | Discover and compare source-backed credits with deliberate additions | Entire catalogs no longer have to be rendered at once. |
| **Selected film details** | Image, name, filmmaker, theme synopsis link, land reference, connect/view/remove, memberships, land pin choices, note and existing connections | Inspect evidence and decide whether/how a film joins a thread | Membership and authored connections are editorial choices. |
| **Draw and connect** | Draw/Done, thumbnail selection, drag handle, shift-click, named edges, source URL, note type, drop-to-insert, reorder list | Express relations between films beyond a shared map position | A shared theme is an index relation, not proof of collaboration. |
| **Map and relation lens** | Ribbons, thumbnail cards, numbered knots, crossing markers, land leaders, hover peek, zoom, fit, disappear map, order/year/circle layouts | Navigate geography and interpretive relations | Hidden thumbnails do not break thread geometry. |
| **Theme Web** | Family filters, theme/family search, nodes/bridges, mobile list, source-linked films, start six, three-thread example, show all bridges, reset | Find documented co-tag bridges and follow films across themes | Focused selection reduces lines; full network remains opt-in. |
| **Suggested next films** | Common-theme film recommendations with source-backed tags and Add next actions | Find a plausible next film to examine | Suggestion is a research lead, not a claim of Indigenous cultural sameness. |
| **Follow** | Previous/Next, progress, image, themes, notes, links, full-text disclosure, cite/print/download | Read the constructed path with scholarly context | A deliberate reading mode, not automated playback. |
| **Play** | Previous/Next, Play/Pause, pace, image fallback, title/filmmaker, exit | Present a film-by-film route on the map | A direct toolbar action, distinct from Follow. |
| **Timeline and comparison** | Year arcs/film points; compare two threads; shared films/themes/places; unique films; open cards | Test chronology and overlap after choosing purposeful threads | These are opt-in analytic views. |
| **Sharing and export** | Follow/Play link mode, URL/citation copy, HTML reading path, JSON/CSV exports, local saved library | Preserve and circulate user-authored scholarship | Does not auto-publish to research master. |
| **Keyboard and help** | Four-step Help, / search, Escape, Enter/Space, [ ] stepping, Ctrl/Cmd+Z/Y, live status | Use without pointer, maintain context and recover from errors | Mobile overlays should never obscure the object of discovery. |

## 150 proposed refinements

### 1. Starting and entering

1. Keep Build, Follow and Play distinct, each with a clear verb.
2. Align theme search and film search at equal prominence.
3. Show theme search above popular-theme chips.
4. Display popular-theme film counts without implying a quality ranking.
5. Describe a theme launch explicitly as a six-film starting selection. **★ Selected**
6. Preview six proposed films before they are added.
7. Offer a sourced random-film discovery entry.
8. Resume the last local constellation before showing an empty starter.
9. Remember the user's most recent theme search.
10. Separate starting from a film, theme and relation web conceptually.
11. Distinguish Add film from Open an existing film.
12. Give each sample an obvious non-destructive way to revise it.
13. Show a first-use instruction only once per collection.
14. Clarify that co-tags are not proof of cultural affiliation.
15. Keep onboarding instructions collapsible and short.

### 2. Finding films and filmmakers

16. Search titles, directors, peoples, country references and verified themes together.
17. Rank exact/title matches above director, community and theme-only matches. **★ Selected**
18. Render a finite results page rather than every indexed row. **★ Selected**
19. Let readers reveal additional results deliberately. **★ Selected**
20. Make A–Z jumps load the requested segment without rendering the full catalog. **★ Selected**
21. Announce displayed count and total count in an accessible status. **★ Selected**
22. Give a recovery action when search/filter combinations return no results. **★ Selected**
23. Offer relevance, title, oldest and newest sort orders. **★ Selected**
24. Preserve the search query when toggling Films and Filmmakers. **★ Selected**
25. Filter to films not yet included in the active thread. **★ Selected**
26. Offer a filter for films with sourced images. **★ Selected**
27. Provide a clearly labeled Clear search action. **★ Selected**
28. Let Escape clear film search before closing the editor. **★ Selected**
29. Advertise the slash keyboard shortcut near film search.
30. Cap bulk addition from search matches at six films. **★ Selected**

### 3. Theme Web discovery

31. Keep five attested theme families available as filters.
32. Accept a theme-family name in the Theme Web search. **★ Selected**
33. Display the number of matching themes after each search. **★ Selected**
34. Limit the default overview to strongest documented co-tag bridges.
35. When a theme is selected, draw only its immediate incident bridges. **★ Selected**
36. When a bridge is selected, isolate that exact co-tag bridge. **★ Selected**
37. Show a useful no-results explanation and reset action. **★ Selected**
38. Label theme creation as a six-film starter. **★ Selected**
39. Page thematic film results by eight.
40. Keep synopsis-source links beside relevant film results.
41. Offer All bridges only as an explicit expansion.
42. Explain that co-tag frequency does not establish cultural equivalence.
43. Explain shared film tags in the detail panel before suggesting interpretation.
44. Sort neighboring themes by documented number of shared films. **★ Selected**
45. Offer a path from focused exploration back to all families.

### 4. Browsing and adding works

46. Keep Films and Filmmakers as separate, discoverable tabs.
47. Open already-added film cards rather than creating duplicates.
48. Announce the title and destination thread in each Add button's accessible name. **★ Selected**
49. Show which thread is receiving new film cards.
50. Cap filmmaker bulk-add actions at six titles. **★ Selected**
51. Label larger filmmaker batches as First six.
52. Preserve browser scroll position after adding a work. **★ Selected**
53. Disable letter jumps when sorting by non-alphabetical order.
54. Use a title tile when no sourced film image is available.
55. Say that the image filter applies to sourced images, not visual quality.
56. Keep filmmaker and year beside each matching film.
57. Expose the published synopsis source on the selected film card.
58. Support alternate spellings and original-language titles as searchable aliases.
59. Show language metadata only where source-backed.
60. Keep sort preference within a single exploration session.

### 5. Constructing scholarly threads

61. Open a theme with six films sampled across its available chronology.
62. Offer Unfold six more instead of importing the whole theme.
63. Preserve map viewport when another theme batch is unfolded.
64. Provide temporary focus on the active thread without editing the collection. **★ Selected**
65. Restore all visible threads with one action.
66. Apply focus to drawing only, never to stored thread membership.
67. Keep button-based Up and Down reordering alongside dragging.
68. Keep visible threads separate from the active target thread.
69. Prompt for a clear name when creating a new thread.
70. Warn before unusually large bulk imports.
71. Let a theme inspire rather than constrain user-authored connections.
72. Preserve notes on each film in an ordered thread.
73. Ask why a film follows its predecessor.
74. Distinguish sourced connections from interpretive notes.
75. Expose the active thread count above the browsing results.

### 6. Map, images and conceptual connections

76. Keep lines continuous when cards are hidden for legibility.
77. Quiet secondary ribbons without removing those relationships.
78. Keep the active film thumbnail visible in dense layouts.
79. Preview film titles and lands on knot hover.
80. Support keyboard selection of accessible knots.
81. Keep user note marks on the correct path segment.
82. Keep land-reference leaders visually separate from authored film links.
83. Use different styling for sourced and speculative relations.
84. State that affiliation markers are not filmmaker residences.
85. Improve collisions between film labels and Indigenous place names.
86. Offer a single-thread emphasis mode without moving the map.
87. Preserve relation layouts by thread order, year and circle.
88. Offer Fit current thread as distinct from Fit all visible threads.
89. Keep zoom controls discoverable in Constellate.
90. Prevent duplicate map layers from flashing during load.

### 7. Following and playing a sequence

91. Retain Build, Follow and Play as meaningful top-level modes.
92. Explain Follow as close reading and Play as automated presentation.
93. Keep Play on the toolbar, not inside a film's detail.
94. Show notes and source evidence during Follow.
95. Keep Previous and Next in both Follow and Play.
96. Preserve Play pacing choices for four, six and ten seconds.
97. Respect reduced-motion preferences by starting playback paused.
98. Return to the Follow position after presentation.
99. Support keyboard stepping within the sequence.
100. Show film number and total progress.
101. Fold the complete written trail until requested.
102. Make share links capable of opening Follow or Play.
103. Keep citations and notes in reading-path exports.
104. Keep Play controls legible on mobile.
105. Consider short source captions in presentation frames.

### 8. Navigability, state and keyboard

106. Give selected cards an obvious route back to the film list.
107. Separate Close dock from Exit Constellate.
108. Keep Thread and Add films tabs in predictable places.
109. Make slash reliably focus Constellate search.
110. Close Help on Escape before dismissing the editor.
111. Clear search on Escape before invoking global close.
112. Make A–Z navigation keyboard operable.
113. Mark the active film within the thread order list.
114. Announce changes to counts and filters in a polite live region.
115. Describe action outcomes in button tooltips.
116. Avoid automatic map-fit when simply expanding a thread.
117. Keep collection and active thread visible through navigation.
118. Support Enter and Space on map nodes.
119. Preserve zoom while opening a related film.
120. Avoid unexpected mobile page scrolling on focus.

### 9. Help, accessibility and mobile

121. Keep Help to four short actionable steps.
122. Anchor Help beside its button rather than over the whole editor.
123. Let Escape close Help and return focus to its summary.
124. Reduce the duplicate three-step guide to a compact contextual cue.
125. Favor plain-language status text over specialized terminology.
126. Make Help operable without hover.
127. Verify contrast for secondary links in day and night themes.
128. Keep touch controls comfortable on small screens.
129. Give action buttons descriptive accessibility labels.
130. Maintain visible keyboard focus in scrollable results.
131. Honor reduced-motion preferences for transitions.
132. Explain no-results states as recoverable filtering, not absence of cinema.
133. Describe the image-only filter's evidentiary limits.
134. Avoid horizontal overflow in the mobile mode bar.
135. Preserve autonyms and keep interface text ready for translation.

### 10. Provenance, sharing and preservation

136. Show generated share URLs before copying.
137. Prefer compressed share URLs for large authored constellations.
138. Retain portable JSON collection exports.
139. Retain spreadsheet-readable CSV exports.
140. Provide a copyable citation for each authored thread.
141. Make author and introduction optional.
142. Offer printable reading paths with source links.
143. Preserve source URLs for sourced user-authored connections.
144. Never turn co-tagging into a claim of cultural equivalence.
145. Never infer Indigenous identity or country from a film's setting.
146. Preserve image provenance where supplied by source pages.
147. Mark placeholder image tiles as placeholders.
148. Keep saved local constellations accessible from the collection selector.
149. Retain Undo and Redo for editable actions.
150. Never confuse a user-authored constellation with a Published Atlas record.

## The selected 25, refined and deployed

Selection criteria: (1) findability; (2) lower cognitive and DOM load; (3) reversibility and active-context clarity; (4) source fidelity; (5) mobile and keyboard viability. These changes are committed to both main and beta. Some controls were retained rather than replaced, as a deliberate refinement.

| Idea # | Deployable change |
|---:|---|
| **5** | Theme Web now labels the starter as six films |
| **17** | Query relevance prioritizes title and filmmaker matches |
| **18** | Browse renders 48 film or filmmaker rows at first |
| **19** | Show 48 more is explicit and repeatable |
| **20** | A–Z buttons render the requested segment on demand |
| **21** | Showing/total status is screen-reader announced |
| **22** | No-match state offers a single clear action |
| **23** | Sorting offers relevance, title, oldest and newest |
| **24** | Film/Filmmaker tab changes keep the query |
| **25** | Not on thread filter excludes current memberships |
| **26** | With sourced image limits to known images |
| **27** | Clear resets search and refinements |
| **28** | Escape clears search before any global exit |
| **30** | Matching batch addition capped at six |
| **32** | Theme Web search includes families |
| **33** | Theme Web shows matching theme totals |
| **35** | Selected theme shows only adjacent connections |
| **36** | Selected co-tag bridge is isolated |
| **37** | Theme Web no-results has reset |
| **38** | Theme starter action states Start with 6 films |
| **44** | Neighboring theme choices sorted by shared films |
| **48** | Result Add/Open labels identify film and target thread |
| **50** | Filmmaker batch capped at six |
| **52** | Scroll position persists during member updates |
| **64** | Focus selected thread is temporary and can be restored |

## Navigation contract

1. **Start.** Search a theme or film or open the Theme Web. A theme creates a six-film *sample*; a large corpus is never automatically added.
2. **Find.** Search multiple film metadata fields; sort and filter; see 48 credits at a time; use on-demand A–Z or Show more.
3. **Choose.** An Add action targets the active thread. An already-added film opens instead of duplicating. Bulk actions add at most six.
4. **Relate.** Threads and named links are authored interpretations; published co-tags are catalog relationships and not evidence of shared Indigenous identity, collaboration, residence or affinity.
5. **Focus.** Single-thread focus hides other paths *visually* without changing saved thread visibility or memberships.
6. **Follow and Play.** Follow emphasizes notes and citations; Play is a visible presentation control. Neither substitutes for the other.
7. **Preserve.** Local collections, Undo, sharing and exports preserve user work without publishing to Atlas data.

## Deployment files and testing notes

- Core behavior: `atlas-constellate62.js`, `beta/atlas-constellate62.js`.
- Theme Web discovery: `assets/constellate-theme-web.js` and its beta mirror.
- Visual presentation: `assets/constellate-controls-20261110.css` and its beta mirror.
- Deployment URLs: main `index.html` and `beta/index.html` cache-busted to the updated assets.
- Browser regression: `.github/workflows/constellate-discovery-smoke.yml` (desktop and 390px mobile); existing interface regression also runs on entrypoint changes.
- JS syntax validation alone is insufficient to claim visual correctness. Inspect GitHub Actions results and manually verify layout, focus and line visibility.

## Deliberately deferred

No inferred identity or language, automatic similarity clustering, AI-authored relations, autoplay on choosing a theme, or sweeping reorganization of Build/Follow/Play. Future improvements should be measured against clarity and source fidelity rather than feature count.

### Verification executed in this session

- JavaScript syntax parsing passed for both core Constellate files and both Theme Web files after deployment.
- An isolated test of the actual core film-results renderer passed for **48 initial results**, **96 after Show more**, **48 starting at M after an A–Z jump**, **258 results after excluding two on-thread titles**, **129 results with the sourced-image filter**, and **zero results with a recovery action**. This test uses a 260-title synthetic catalog and checks function behavior, not real browser layout.
- A separate browser smoke-test workflow was added for desktop and mobile. Its execution result was not available for confirmation in this session; do **not** interpret its presence as a passing browser test.
