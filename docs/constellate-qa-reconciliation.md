# Legacy Constellate QA reconciliation

The main site still has the theme search input. The simplified beta deliberately uses popular theme chips and the full 30-theme dropdown instead. Three previous failing jobs were testing the old input on beta.

The first-visit test now exercises the actual Water dropdown entry when the search input is absent; the two broader workflow checks retain main's original search alignment and ordering checks, verify visible beta entry controls and all 30 theme terms, and exercise a real dropdown transition into Build. Existing downstream assertions are preserved; neither workflow failures nor assertions are disabled. Main and beta site assets untouched in this commit. Browser suite capture failures remain separately tracked.