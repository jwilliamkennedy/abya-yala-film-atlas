# Film languages: list first, then fill, then build

`films_language_missing_2026-11-07.csv` lists the 1,206 films on the public map with no language recorded (one row per film; co-directed films appear once).

**To fill (ChatGPT or a student):** for each row, add

- `languages`: the languages spoken in the film, separated by `;`, Indigenous languages first, named as the film's own credits or synopsis name them (for example `Nehiyawewin (Plains Cree); English`). Leave out subtitle languages.
- `language_source_url`: the page that states it: festival film page, distributor, NFB, or the filmmaker's site.
- `notes` (optional), for example "no dialogue".

Rules: only what a page states, never inferred from the filmmaker's people or the film's setting. Leave a row blank rather than guess. Save as you go in `tools/languages/filled/languages_<date>_part<N>.csv`; partial files are welcome.

**Next (Claude):** each filled part is checked against its source and loaded into the beta, where the Films list's language filter picks it up.
