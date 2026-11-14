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
    return [html.unescape(u) for u in re.findall(r'<li class="b_algo[^"]*"[^>]*>.*?<a[^>]+href="(https?://[^"]+)"', r.text, re.S)]

def ddg(q):
    r = requests.post('https://html.duckduckgo.com/html/', data={'q': q}, headers=C.UA, timeout=20)
    out = []
    for u in re.findall(r'class="result__a"[^>]+href="([^"]+)"', r.text):
        u = html.unescape(u)
        if 'uddg=' in u:
            u = urllib.parse.unquote(urllib.parse.parse_qs(urllib.parse.urlparse(u).query).get('uddg', [''])[0])
        if u.startswith('http'): out.append(u)
    return out

def mojeek(q):
    r = requests.get('https://www.mojeek.com/search', params={'q': q}, headers=C.UA, timeout=20)
    return [html.unescape(u) for u in re.findall(r'<a[^>]+class="ob"[^>]+href="(https?://[^"]+)"', r.text)]

STATS = {}
def search(q):
    res = []
    for f in (bing, ddg, mojeek):
        try:
            got = f(q)
        except Exception as e:
            got = []
        STATS.setdefault(f.__name__, []).append(len(got))
        res += [u for u in got if not SKIP.search(u)]
    return list(dict.fromkeys(res))

def head_names_title(url, title):
    # the page's own title (or og:title) must carry the film's title: a filmmaker's biography or a
    # filmography page names many films in its text, but its title is the person's name
    try:
        r = requests.get(url, headers=C.UA, timeout=20)
        heads = re.findall(r'<title[^>]*>(.*?)</title>|property=["\']og:title["\'][^>]+content=["\']([^"\']+)', r.text, re.S | re.I)
        head = C.fold(' '.join(a + b for a, b in heads))
        ws = C.words(title)
        return sum(w in head for w in ws) >= max(1, len(ws) - 1)
    except Exception:
        return False

import hashlib, io
from PIL import Image
VIDEO = re.compile(r'(youtube\.com/watch|youtu\.be/|vimeo\.com/\d)')

def video(row, url):
    # a video page is the film itself: use the platform's own title and thumbnail (oEmbed)
    api = ('https://www.youtube.com/oembed?format=json&url=' if 'youtu' in url else 'https://vimeo.com/api/oembed.json?width=1280&url=')
    out = dict(row, image_url='', image_page='', check='', w='', h='', sha='')
    try:
        j = requests.get(api + urllib.parse.quote(url, safe=''), headers=C.UA, timeout=20).json()
    except Exception:
        out['check'] = 'video lookup failed'; return out, None
    head = C.fold(j.get('title', '') + ' ' + j.get('author_name', ''))
    ws = C.words(row['title'])
    if sum(w in head for w in ws) < max(1, len(ws) - 1):
        out['check'] = 'video is not the film'; return out, None
    img = j.get('thumbnail_url', '')
    if 'ytimg' in img: img = re.sub(r'/[a-z]*default\.jpg', '/hqdefault.jpg', img)
    try:
        r = requests.get(img, headers=C.UA, timeout=20); r.raise_for_status()
        im = Image.open(io.BytesIO(r.content)); im.load()
    except Exception:
        out['check'] = 'image failed'; return out, None
    if im.width < 320:
        out['check'] = f'too small ({im.width}px)'; return out, None
    out.update(image_url=img, image_page=url, w=im.width, h=im.height, sha=hashlib.sha1(r.content).hexdigest()[:12], check='ok')
    return out, im.convert('RGB')

def one(row):
    tried = []
    urls = ([row['film_source']] if (row.get('film_source') or '').startswith('http') else [])
    first = (row['filmmaker'] or '').split(';')[0].strip()
    title = re.split(r'\s[/=]\s|\s\(', row['title'])[0].strip()
    urls += search(f'"{title}" {first}')[:8]
    urls += [u for u in search(f'"{title}" {first} vimeo OR youtube') if VIDEO.search(u)][:4]
    last = None
    for u in dict.fromkeys(urls):
        if VIDEO.search(u):
            o, im = video(row, u)
        else:
            o, im = C.one(dict(row, film_source=u))
        if o['check'] == 'ok' and not VIDEO.search(u) and not head_names_title(o['image_page'], row['title']):
            o['check'], im = 'page title is not the film', None
        tried.append(f"{o['check'][:20]} {u[:60]}")
        if o['check'] == 'ok':
            o['tried'] = ' | '.join(tried); return o, im
        last = o
    o = last or dict(row, image_url='', image_page='', check='no results', w='', h='', sha='')
    o['tried'] = ' | '.join(tried); return o, None

def main(src, outdir):
    rows = list(csv.DictReader(open(src, encoding='utf-8')))
    os.makedirs(outdir, exist_ok=True)
    with ThreadPoolExecutor(4) as ex:
        res = list(ex.map(one, rows))
    count = {}
    for o, _ in res:
        if o['check'] == 'ok': count[o['sha']] = count.get(o['sha'], 0) + 1
    for o, _ in res:
        if o['check'] == 'ok' and count[o['sha']] > 1: o['check'] = 'same image as another film (banner)'
    C.write(rows, res, outdir, extra=['tried'])
    print('SEARCH RESULTS PER ENGINE (mean):', {k: round(sum(v) / max(1, len(v)), 1) for k, v in STATS.items()})

if __name__ == '__main__':
    main(*sys.argv[1:3])
