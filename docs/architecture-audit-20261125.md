# Atlas architecture audit — 25 November 2026 (UTC)

## Scope and verified snapshots
- Public site `b9fa5294329dfe58cbbd971680065edd3cdf7681` is the successful milestone catalogue bake; private master `8b96b3a1ced852e698e7c1ba6e60556877724ab8`, fingerprint `32921ee6579ef60f6b3ebd93c187b8a8fdcc19d0971e2801d9822c25a98e8935`.
- 1,500 distinct makers on each side; 3,089 master rows and detailed public rows, of which 3,088 have a film ID. Exactly 2,831 distinct nonempty film IDs. No missing, extra or duplicate maker/credit keys; no orphan film credits. One maker-only placeholder (DIR-0112).
- 343 Watch works, 318 with embeds; every Watch filmmaker/film pair resolves to a public credit. Provider availability was not checked. 57 Watch works without themes, 150 without indexed artwork.
- 6,852 long facet rows, 2,044 works represented, no orphan work IDs. 53 repeated film/field/value combinations; 26 rows without a source URL. Facet JSON reports 2,789 mapped works and 2,803 facet entries; its counts are not the exact all-credit catalogue count and merit a separate work-level audit.
- 110 language-note redactions and 4 normalized credit labels between the master and detailed public CSV. Inspect publisher redaction/normalization rules rather than treating these as lost rows.
- Work-level coverage (at least one credit with a value): themes 1,577; languages 180; images 1,205; film source 2,652; form 1,514; length 1,472. Six themed master credit rows lack a theme-source field; no primary-theme membership mismatches. No source or identity claims were inferred.

## Repository and publishing
- Public main deploys the root and beta; the private main holds the authoritative CSV master/Queue. Workbook branch is a generated copy, not an editing destination. 22 public branches, 20 private branches; no branch deletions or merges performed.
- The previous two failed private publishes encountered concurrent proposals.csv rebase conflicts, not master validation errors. Latest publish 45567458212 completed successfully, including the workbook and the public bake.
- One oversized history file (1,011,363 bytes) contained 1,756 nameless sparse corrections all assigned to the same two-letter key. Stable Queue-ID bucketing of nameless archived rows resolves this partition defect on the next publisher save without changing any row fields. No manual history/master edits.
- Existing workflow commits the master before rebuilding the public beta: if the rebuild fails after commit, a later run with zero merges can skip rebuilding. Track fingerprint concordance and use explicit rebuild on failure; avoid overlapping changes in proposals.csv.

## Runtime and route
- The public globe uses its own viewport and canonical directory route. Legacy URL markers are synthetic compatibility inputs to the catalogue runtime, not public state. Older film/profile links can resolve exact IDs. Legacy flat page is unlisted, not access-controlled; older explicit legacy query routes remain compatible. Public navigation generator omits Constellate.
- Node route tests cover the exact stale compound URL, old aliases, explicit shares, film and maker IDs, and legacy routes. Browser suite asserts no public address mutation and separate stage ownership.
- Known regression: external-only Watch player failed repeated browser runs; permanent external provider markup and hash navigation tests address this. Existing old UI tests must target the explicit legacy page/route, not removed globe controls.
- Latest successful browser compatibility prior to the canonical route change: 41bfc27. Independent input, CSV and discovery checks also passed on later baked snapshot. Current full acceptance, artwork and deployment checks still must complete; do not describe syntax or build success as full visual validation.
- Direct browser access unavailable in the audit environment; hosted Actions results are the browser evidence. No production promotion or private data edit performed.

## Browser regression correction
The first canonical-route implementation (80f82d7) failed all four browser compatibility profiles before rendering; the archived Chromium screenshot showed the initialization error screen. Keep the known bootstrap query through legacy catalogue initialization, suppress legacy history writers, and canonicalize only when a usable globe is visible. This is a transitional compatibility bridge, not an independent catalogue module. Added caught-exception diagnostics; verify the new revision before certifying visual behavior.
