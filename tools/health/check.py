"""Nightly: export the public beta, test every image, watch and source link, and list films still without an image.
Outputs (in out/): report.md, broken.csv, missing-images.csv."""
import json, csv, sys, requests, re
from urllib.parse import urljoin
BASE = sys.argv[2] if len(sys.argv) > 2 else "http://127.0.0.1:8772/beta/"
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlparse
d = json.load(open(sys.argv[1]))
S = requests.Session(); S.headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36 IndigenousCinemaAtlas-linkcheck/1.0'
def test(u):
    u = urljoin(BASE, u)
    try:
        r = S.head(u, timeout=15, allow_redirects=True)
        if r.status_code in (403, 405) or r.status_code >= 400: r = S.get(u, timeout=20, allow_redirects=True, stream=True)
        return r.status_code
    except Exception as e:
        return 'error'
jobs = []
for r in d:
    for f in r['films']:
        if f['image']: jobs.append(('image', r, f, f['image']))
        for w in f['watch']: jobs.append(('watch', r, f, w))
    for s in r['sources'][:3]: jobs.append(('source', r, None, s['url']))
urls = sorted({j[3] for j in jobs})
with ThreadPoolExecutor(16) as ex: status = dict(zip(urls, ex.map(test, urls)))
BOT = {401, 403, 405, 406, 429, 999}
bad = [j for j in jobs if status[j[3]] == 'error' or (isinstance(status[j[3]], int) and status[j[3]] >= 400 and status[j[3]] not in BOT)]
walled = [j for j in jobs if status[j[3]] in BOT]
with open('out/broken.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['kind', 'status', 'record_id', 'filmmaker', 'film_id', 'film', 'url'])
    for k, r, f, u in bad: w.writerow([k, status[u], r['id'], r['name'], f and f['id'], f and f['title'], u])
missing = [(r, f) for r in d for f in r['films'] if not f['image']]
with open('out/missing-images.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['film_id', 'title', 'year', 'filmmaker', 'record_id', 'credit_source', 'image_url', 'image_page', 'notes'])
    for r, f in sorted(missing, key=lambda x: x[1]['title'].lower()): w.writerow([f['id'], f['title'], f['year'] or '', r['name'], r['id'], f['source'], '', '', ''])
by = lambda k: sum(1 for j in bad if j[0] == k)
tot = lambda k: sum(1 for j in jobs if j[0] == k)
rep = (f"# Atlas health\n\nBroken means not found, gone, server error or unreachable. Sites that refuse automated checks ({len(walled)} links) are not counted as broken.\n\n- Images: {by('image')} broken of {tot('image')}\n- Watch links: {by('watch')} broken of {tot('watch')}\n"
       f"- Source links: {by('source')} broken of {tot('source')}\n- Films without an image: {len(missing)} of {sum(len(r['films']) for r in d)}\n\n"
       "Details: broken.csv. Films to find images for: missing-images.csv (fill image_url and image_page, then run tools/thumbs/from_csv.py).\n")
open('out/report.md', 'w').write(rep); print(rep)
