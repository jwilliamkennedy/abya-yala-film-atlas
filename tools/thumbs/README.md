# Film images for films that have none

- `lists/` — the films on the public map that still have no image (A–G, 14 Nov 2026: 373 films).
- `missing_*.csv` — a round of pages to try; pushing one runs **Film image candidates** (`candidates.py`), which keeps a page's share image only when the page names the film and the filmmaker, the image loads, is at least 320 px wide, is not a logo and is not shared with another film. Results and contact sheets go to the `ci-thumbs` branch.
- `filled/` — images checked by eye (portraits of people, banners and stills from other films left out; reasons in `rejected.txt`). These are ready to enter in atlas.xlsx (image_url, image_page, image_credit, image_kind); nothing here changes the site by itself.
