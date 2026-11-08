"""Thumbnails from a filled list. Step 1 (list) is out/missing-images.csv from the nightly health check.
Step 2: someone fills image_url and image_page for each film (by hand or ChatGPT's mirror work) and commits it to tools/thumbs/filled/.
Step 3 (this script, on a runner): load-test every image, reject small or shared images, write a contact sheet for review,
and stage a layer. Rows listed in tools/thumbs/filled/rejected.txt (film_id per line) are left out after review.
usage: from_csv.py filled.csv out_dir"""
import csv, json, io, os, sys
from urllib.parse import urlparse
import requests
from PIL import Image, ImageDraw, ImageFont
S = requests.Session(); S.headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36 IndigenousCinemaAtlas/1.0'
rows = [r for r in csv.DictReader(open(sys.argv[1], encoding='utf-8-sig')) if r.get('image_url', '').startswith('http')]
out = sys.argv[2]; os.makedirs(out, exist_ok=True)
rej = set()
rp = os.path.join(os.path.dirname(sys.argv[1]), 'rejected.txt')
if os.path.exists(rp): rej = {l.strip() for l in open(rp) if l.strip()}
ok, bad, imgs, hashes = [], [], {}, {}
for r in rows:
    if r['film_id'] in rej: continue
    try:
        x = S.get(r['image_url'], timeout=20); im = Image.open(io.BytesIO(x.content)); im.load()
        assert x.status_code == 200 and im.width >= 280 and im.height >= 150
        g = im.convert('L').resize((12, 12)); px = list(g.getdata()); a = sum(px) / len(px); h = ''.join('1' if p > a else '0' for p in px)
        hashes.setdefault(h, []).append(r['film_id']); imgs[r['film_id']] = im.convert('RGB'); ok.append(r)
    except Exception as e:
        bad.append((r, str(e)[:80]))
shared = {f for ids in hashes.values() if len(ids) > 1 for f in ids}
keep = [r for r in ok if r['film_id'] not in shared]
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except Exception: font = ImageFont.load_default()
for s in range(0, len(keep), 40):
    chunk = keep[s:s + 40]; sheet = Image.new('RGB', (5 * 260, ((len(chunk) + 4) // 5) * 210), 'white'); d = ImageDraw.Draw(sheet)
    for i, r in enumerate(chunk):
        x, y = (i % 5) * 260, (i // 5) * 210; im = imgs[r['film_id']].copy(); im.thumbnail((250, 158)); sheet.paste(im, (x + 5, y + 5))
        d.text((x + 5, y + 164), f"{r['film_id'][-14:]} {r['title'][:24]}", fill='black', font=font)
        d.text((x + 5, y + 180), f"{r['filmmaker'][:22]} {r['year']}", fill='#444', font=font)
        d.text((x + 5, y + 195), urlparse(r['image_page'] or r['image_url']).netloc[:34], fill='#777', font=font)
    sheet.save(os.path.join(out, f'sheet_{s // 40 + 1:02d}.jpg'), quality=82)
add = {r['film_id']: {'title': r['title'], 'image': r['image_url'], 'originalImage': r['image_url'], 'sourceURL': r['image_page'] or r['image_url'],
                      'publisher': urlparse(r['image_page'] or r['image_url']).netloc, 'kind': 'Film image (filled list)', 'checkedOn': os.environ.get('CHECKED_ON', ''),
                      'rightsStatus': 'hotlinked; image remains with its rights holder', 'matchBasis': 'Listed for this film, load-tested and checked by eye on a contact sheet.' + (' ' + r['notes'] if r.get('notes') else '')} for r in keep}
json.dump(add, open(os.path.join(out, 'layer.json'), 'w'), ensure_ascii=False, indent=0)
with open(os.path.join(out, 'failed.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['film_id', 'title', 'image_url', 'reason'])
    for r, e in bad: w.writerow([r['film_id'], r['title'], r['image_url'], e])
    for r in ok:
        if r['film_id'] in shared: w.writerow([r['film_id'], r['title'], r['image_url'], 'same image as another film (banner or logo?)'])
print('rows', len(rows), 'kept', len(keep), 'failed', len(bad), 'shared', len(shared))
