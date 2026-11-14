# Film images for films that have none

- `lists/` — the films on the public map that still have no image (14 Nov 2026: A–G 373 films, H–Z 690).
- `missing_*.csv` — a round of pages to try; pushing one runs **Film image candidates** (`candidates.py`), which keeps a page's share image only when the page names the film and the filmmaker, the image loads, is at least 320 px wide, is not a logo and is not shared with another film. Results and contact sheets go to the `ci-thumbs` branch.
- `filled/` — images checked by eye (portraits of people, banners and stills from other films left out; reasons in `rejected.txt`). These are ready to enter in atlas.xlsx (image_url, image_page, image_credit, image_kind); nothing here changes the site by itself.
- `to_queue.py` — puts the checked images into the Queue of atlas.xlsx as “correct” rows (status “new”; one row per filmmaker of a co-directed film; only image cells are filled). Run `python3 tools/thumbs/to_queue.py atlas.xlsx` to see the count, add `--write` to change the workbook, mark the rows you accept “accepted”, then run `tools/atlas/merge.py` as usual. `queue_images.csv` holds the same rows.
