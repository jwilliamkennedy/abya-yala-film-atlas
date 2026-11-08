# Film facets

One store for what the atlas records about each film: languages, themes, form and length, each value with its source and how it was recorded.

- `languages_authority.csv`: the atlas's language names, every Glottolog code checked against Glottolog's open data (glottolog-cldf), ISO 639-3 where Glottolog gives one, and a match level (exact, group, probable, unresolved). Add a language here before it can be coded.
- `build.py`: reads the public records (`tools/pages/public.json`), the theme tagging (`beta/themes-1103-data.js`), this authority and any filled language sheets (`tools/languages/filled/*.csv`), and writes `beta/data/film-facets.csv` (long form), `film-facets.json`, `languages.csv`, the map's `beta/facets-data.js`, `beta/languages.html` and `beta/themes.html`.

Run the whole sequence with `tools/rebuild_pages.sh`.
