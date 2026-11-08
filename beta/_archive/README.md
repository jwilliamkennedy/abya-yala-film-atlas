# Archived beta experiments (restorable)

Moved here on 7 November 2026. Nothing was deleted; each folder still works at its new address, `/beta/_archive/<folder>/`.

| Folder | What it was | Why archived |
|---|---|---|
| `basemap-compare/` | OpenFreeMap vs Maptoolkit, side by side (ChatGPT, 6 Nov) | Superseded by the open basemap now in the beta |
| `terrain-lab/` | VersaTiles + Mapterhorn vs Natural Earth II (ChatGPT) | Superseded by the open basemap now in the beta |
| `option-b-summer/` | Maptoolkit Summer with territories and film circles (ChatGPT, 6 Nov) | Country circles and colonial place names replace the land-name design; partial data |
| `terrain-territories-test/` | Full copy of the beta (117 files) on Maptoolkit Summer (ChatGPT, 6 Nov) | A second, frozen copy of every data file (6 Nov counts) |
| `workflows/` | Their GitHub Actions workflows, and Claude's one-off test-page screenshot run | Parked so they no longer run; move back to `.github/workflows/` to use |

To restore one: `git mv beta/_archive/<folder> beta/<folder>`. The globe lab (`beta/globe-lab/`) was kept in place.
