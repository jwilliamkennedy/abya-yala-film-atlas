#!/usr/bin/env bash
# Rebuild everything the beta serves from atlas.xlsx, in order:
#   atlas.xlsx (Published) -> beta/atlas-data.js + film tags + Languages / Themes pages   (tools/atlas/build.py)
#   -> public.json from the loaded beta -> filmmaker pages + sitemap -> timeline + screening list -> data page and CSVs
# usage: tools/rebuild_pages.sh <atlas.xlsx> <snapshot.json> <beta url served locally, e.g. http://127.0.0.1:8765/beta/index.html> [chrome path]
# (atlas.xlsx and the snapshot live in the private research repository, under atlas/)
set -euo pipefail
cd "$(dirname "$0")/.."
BASE=https://jwilliamkennedy.github.io/abya-yala-film-atlas/beta
python3 tools/atlas/build.py "$1" "$2"
python3 tools/pages/dump.py "$3" tools/pages/public.json ${4:-}
python3 tools/pages/build.py tools/pages/public.json beta "$BASE"
python3 tools/pages/extra.py tools/pages/public.json beta
python3 tools/pages/data.py tools/pages/public.json beta "$BASE"
python3 tools/pages/counter_tag.py beta
python3 tools/pages/nav.py beta
