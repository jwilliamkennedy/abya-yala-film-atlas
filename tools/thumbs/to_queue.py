"""Add the checked film images in tools/thumbs/filled/ to the Queue of atlas.xlsx as "correct" rows.

usage: python3 tools/thumbs/to_queue.py <atlas.xlsx> [--write]
Without --write it only reports. Each row targets one film (one row per filmmaker of a co-directed film)
and fills only the image cells, so merge.py leaves every other cell of that film as it is. Rows go in as "new": mark the ones you accept "accepted",
then run tools/atlas/merge.py as usual. Films that already have an image in Published, or already have a
Queue row for the same image, are skipped. Also writes tools/thumbs/queue_images.csv (the same rows)."""
import csv, glob, os, sys
from openpyxl import load_workbook
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'atlas'))
from schema import QUEUE_COLS

KIND = {'still': 'Film still', 'poster': 'Film poster', 'key art': 'Film publicity image'}

def makers():
    out = {}
    for f in glob.glob(os.path.join(HERE, 'lists', '*.csv')):
        for r in csv.DictReader(open(f, encoding='utf-8')):
            out.setdefault(r['film_id'], []).append(r['filmmaker_id'])
    return out

def rows():
    ids = makers()
    seen = {}
    for f in sorted(glob.glob(os.path.join(HERE, 'filled', 'images_*.csv'))):
        for r in csv.DictReader(open(f, encoding='utf-8')):
            seen.setdefault(r['film_id'], r)
    for fid, r in seen.items():
      for mid in dict.fromkeys(ids.get(fid, [''])):   # one row per filmmaker of a co-directed film
        yield {
            'queue_action': 'correct', 'queue_target': fid, 'queue_status': 'new',
            'proposed_by': 'Claude', 'proposed_on': '2026-11-14', 'evidence_url': r['image_page'],
            'review_note': f'Image for “{r["title"]}” ({r["filmmaker"]}): share image of a page that names the film and the filmmaker; checked by eye.',
            'filmmaker_id': mid, 'film_id': fid, 'image_url': r['image_url'], 'image_page': r['image_page'],
            'image_credit': r['image_credit'], 'image_kind': KIND.get(r['image_kind'], 'Film still'),
            'image_basis': 'page names the film and the filmmaker; checked by eye',
            'image_rights': 'hotlinked; image remains with its rights holder', 'image_checked': '2026-11-14',
        }

def main():
    new = list(rows())
    with open(os.path.join(HERE, 'queue_images.csv'), 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=QUEUE_COLS, extrasaction='ignore'); w.writeheader(); w.writerows(new)
    if len(sys.argv) < 2:
        print(f'{len(new)} rows written to queue_images.csv'); return
    wb = load_workbook(sys.argv[1])
    wp, wq = wb['Published'], wb['Queue']
    ph = {c.value: i + 1 for i, c in enumerate(wp[2])}; qh = {c.value: i + 1 for i, c in enumerate(wq[2])}
    has_image = {wp.cell(r, ph['film_id']).value for r in range(3, wp.max_row + 1) if wp.cell(r, ph['image_url']).value}
    queued = {(wq.cell(r, qh['queue_target']).value, wq.cell(r, qh['filmmaker_id']).value, wq.cell(r, qh['image_url']).value) for r in range(3, wq.max_row + 1)}
    add = [r for r in new if r['film_id'] not in has_image and (r['film_id'], r['filmmaker_id'], r['image_url']) not in queued]
    print(f'{len(new)} rows for the checked images; {len(new) - len(add)} skipped (image already in Published or already queued); {len(add)} to add')
    if '--write' not in sys.argv:
        print('dry run: add --write to change the workbook'); return
    for r in add:
        n = wq.max_row + 1
        for c, v in r.items():
            if c in qh: wq.cell(n, qh[c]).value = v
    wb.save(sys.argv[1])
    print(f'added {len(add)} Queue rows (status "new")')

main()
