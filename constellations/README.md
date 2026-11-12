# Published constellations

Each file here is one constellation with a short, stable address:

    https://jwilliamkennedy.github.io/abya-yala-film-atlas/?c=<slug>          (opens in Follow)
    https://jwilliamkennedy.github.io/abya-yala-film-atlas/?c=<slug>&play=1   (opens in Play)

- A file stores film and filmmaker IDs only. Titles, names and years are read from the atlas when the
  constellation opens, so a correction to a record reaches every constellation that uses it.
- To publish one: export its JSON from Constellate (Share › JSON), keep `name`, `author`, `note`, `threads`,
  `links`, and reduce each item to `type`, `record`, `film`. Save as `<slug>.json` (lowercase letters,
  digits and hyphens), add a row to `index.json`, and set `updated` to the date of the change.
- Only John publishes here. A reader who opens a published constellation gets a copy in their own
  browser; their edits never change this file.
- `index.json` › `example` names the constellation that "Open the example" loads.
