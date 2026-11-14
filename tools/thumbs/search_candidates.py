"""Search the web for each film and keep the first page whose share image passes the checks in candidates.py.

usage: python3 tools/thumbs/search_candidates.py <films.csv> <out dir>
films.csv needs n, film_id, title, year, filmmaker (and optionally film_source, tried first).
For each film it asks a search engine for "<title>" <filmmaker> and tries the top results in order
(skipping social media and shops). A page counts only if it names the film and the filmmaker and its
share image loads, is at least 320 px wide and is not a logo; an image that turns up for two films is a
banner and is dropped. Output is the same as candidates.py (candidates.csv plus contact sheets), for review
by eye. Nothing is entered in the atlas from here."""
import csv, html, os, re, sys, time, urllib.parse
from concurrent.futures import ThreadPoolExecutor
import requests
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import candidates as C

SKIP = re.compile(r'facebook\.|instagram\.|twitter\.|x\.com|tiktok\.|linkedin\.|pinterest\.|amazon\.|ebay\.|imdb\.com|'
                  r'reddit\.|spotify\.|apple\.com|google\.|bing\.|duckduckgo\.|yahoo\.|wikidata\.|\.pdf($|\?)|filmfreeway\.', re.I)

def bing(q):
    r = requests.get('https://www.bing.com/search', params={'q': q, 'setlang': 'en'}, headers=C.UA, timeout=20)
    return [html.unescape(u) for u in re.findall(r'<li class="b_algo"[^>]*>.*?<a[^>]+href="(https?://[^"]+)"', r.text, re.S)]

def ddg(q):
    r = requests.post('https://html.duckduckgo.com/html/', data={'q': q}, headers=C.UA, timeout=20)
    out = []
    for u in re.findall(r'class="result__a"[^>]+href="([^"]+)"', r.text):
        u = html.unescape(u)
        if 'uddg=' in u:
            u = urllib.parse.unquote(urllib.parse.parse_qs(urllib.parse.urlparse(u).query).get('uddg', [''])[0])
        if u.startswith('http'): out.append(u)
    return out

def search(q):
    for f in (bing, ddg):
        try:
            res = [u for u in f(q) if not SKIP.search(u)]
            if res: return res
        except Exception:
            pass
        time.sleep(1)
    return []

def one(row):
    tried = []
    urls = ([row['film_source']] if (row.get('film_source') or '').startswith('http') else [])
    first = (row['filmmaker'] or '').split(';')[0].strip()
    title = re.split(r'\s[/=]\s|\s\(', row['title'])[0].strip()
    urls += search(f'"{title}" {first} film')[:6]
    last = None
    for u in dict.fromkeys(urls):
        o, im = C.one(dict(row, film_source=u))
        tried.append(f"{o['check'][:20]} {u[:60]}")
        if o['check'] == 'ok':
            o['tried'] = ' | '.join(tried); return o, im
        last = o
    o = last or dict(row, image_url='', image_page='', check='no results', w='', h='', sha='')
    o['tried'] = ' | '.join(tried); return o, None

def main(src, outdir):
    rows = list(csv.DictReader(open(src, encoding='utf-8')))
    os.makedirs(outdir, exist_ok=True)
    with ThreadPoolExecutor(6) as ex:
        res = list(ex.map(one, rows))
    count = {}
    for o, _ in res:
        if o['check'] == 'ok': count[o['sha']] = count.get(o['sha'], 0) + 1
    for o, _ in res:
        if o['check'] == 'ok' and count[o['sha']] > 1: o['check'] = 'same image as another film (banner)'
    C.write(rows, res, outdir, extra=['tried'])

if __name__ == '__main__':
    main(*sys.argv[1:3])
