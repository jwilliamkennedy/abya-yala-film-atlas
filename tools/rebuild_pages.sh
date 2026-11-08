#!/usr/bin/env bash
# Rebuild everything generated from the beta's public records, in order:
# public.json -> filmmaker pages + sitemap -> timeline + screening list -> film facets (store, Languages, Themes) -> data page and CSVs -> data bundle.
# usage: tools/rebuild_pages.sh <beta url served locally, e.g. http://127.0.0.1:8765/beta/index.html> [chrome path]
set -euo pipefail
cd "$(dirname "$0")/.."
BASE=https://jwilliamkennedy.github.io/abya-yala-film-atlas/beta
python3 tools/pages/dump.py "$1" tools/pages/public.json ${2:-}
python3 tools/pages/build.py tools/pages/public.json beta "$BASE"
python3 tools/pages/extra.py tools/pages/public.json beta
python3 tools/facets/build.py tools/pages/public.json beta
python3 tools/pages/data.py tools/pages/public.json beta "$BASE"
python3 tools/build_bundle.py
