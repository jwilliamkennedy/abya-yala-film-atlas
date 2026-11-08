"""Watch links for the atlas (runs on a GitHub runner).
1. Re-check the viewing links already in the atlas (status, page title).
2. For films by Canadian filmmakers and Sky Hopinka, try the predictable film-page address on the
   National Film Board (nfb.ca/film/<slug>/) and on skyhopinka.com/<slug>. Keep a page only when its
   title matches the film and the director's name appears on it, and (Hopinka) it embeds a player.
Writes out/watch.json for review; nothing is published from here."""
import json, re, time, unicodedata
import requests
S = requests.Session()
S.headers.update({'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36 IndigenousCinemaAtlas/1.0', 'Accept-Language': 'en-CA,en;q=0.9,fr;q=0.6'})

def ascii_(s): return unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode()
def n(s): return re.sub(r'[^a-z0-9]+', ' ', ascii_(s).lower()).strip()
def slug(s):
    s = ascii_(s).lower().replace('&', 'and')
    s = re.sub(r"[’'`]", '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')
def main_title(t): return re.split(r'\s[/|]\s|:\s|\s\(|\s–\s', t)[0]

def fetch(url):
    try:
        r = S.get(url, timeout=20, allow_redirects=True)
        return r
    except Exception as e:
        return None

def title_of(html):
    m = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)', html, re.I) or re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.S)
    return re.sub(r'\s+', ' ', m.group(1)).strip() if m else ''

def maker_on(maker, html):
    parts = [p for p in n(maker).split() if len(p) > 2]
    tx = n(re.sub('<[^>]+>', ' ', html[:300000]))
    return bool(parts) and parts[-1] in tx.split()

def main():
    data = json.load(open('tools/watch/input.json'))
    out = {'existing': [], 'found': []}
    for w in data['existing']:
        for r in w['routes']:
            resp = fetch(r['url'])
            out['existing'].append({**{k: w[k] for k in ('fid', 'title', 'maker', 'rid', 'year')}, 'url': r['url'], 'routeTitle': r['title'],
                                    'status': resp.status_code if resp is not None else None, 'final': resp.url if resp is not None else None,
                                    'pageTitle': title_of(resp.text) if resp is not None and resp.status_code < 400 else ''})
            time.sleep(0.3)
    seen = set()
    for f in data['candidates']:
        key = (n(f['title']), f['maker'])
        if key in seen: continue
        seen.add(key)
        tries = []
        if 'Hopinka' in f['maker']:
            tries.append(('Filmmaker’s site', f'https://www.skyhopinka.com/{slug(main_title(f["title"]))}'))
        else:
            for t in {f['title'], main_title(f['title'])}:
                tries.append(('National Film Board of Canada', f'https://www.nfb.ca/film/{slug(t)}/'))
        for src, url in tries:
            resp = fetch(url); time.sleep(0.5)
            if resp is None or resp.status_code != 200: continue
            html = resp.text; pt = title_of(html)
            if n(main_title(f['title'])) not in n(pt): continue
            if not maker_on(f['maker'], html): continue
            if src.startswith('Filmmaker') and not re.search(r'player\.vimeo\.com|youtube\.com/embed|<video', html): continue
            mins = None
            m = re.search(r'(\d{1,3})\s*min', re.sub('<[^>]+>', ' ', html[:200000]))
            if m: mins = int(m.group(1))
            canada_only = bool(re.search(r'available only in Canada|disponible uniquement au Canada|not available in your (country|region)', html, re.I))
            out['found'].append({**{k: f[k] for k in ('fid', 'title', 'maker', 'rid', 'year')}, 'source': src, 'url': resp.url, 'pageTitle': pt, 'mins': mins, 'canadaOnly': canada_only})
            print('FOUND', f['title'], '->', resp.url, flush=True)
            break
    json.dump(out, open('out/watch.json', 'w'), ensure_ascii=False, indent=1)
    print('EXISTING OK', sum(1 for e in out['existing'] if e['status'] and e['status'] < 400), 'of', len(out['existing']), '| FOUND', len(out['found']))

main()
