"""Find an embeddable player for each checked Watch link (runs on a GitHub runner).
NFB: <film page>/embed/player/ must return 200 and allow framing. Vimeo: player.vimeo.com/video/<id> must return 200
and not be private. skyhopinka.com pages: the Vimeo player inside the page. Writes out/embeds.json."""
import json, re, requests
S = requests.Session(); S.headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/124 Safari/537.36 IndigenousCinemaAtlas/1.0'
def get(u):
    try: return S.get(u, timeout=15, allow_redirects=True)
    except Exception: return None
def frameable(r):
    xfo = r.headers.get('x-frame-options', '').lower(); csp = r.headers.get('content-security-policy', '').lower()
    if 'deny' in xfo or 'sameorigin' in xfo: return False
    m = re.search(r'frame-ancestors([^;]*)', csp)
    return not m or '*' in m.group(1) or 'https:' in m.group(1)
def vimeo(id_, h=None):
    u = f'https://player.vimeo.com/video/{id_}' + (f'?h={h}' if h else '')
    r = get(u)
    if r is None or r.status_code != 200 or re.search(r'privacy settings|Sorry|not available', r.text[:4000], re.I): return None
    return u
d = json.load(open('tools/watch/watch-checked.json'))
urls = {e['url'] for e in d['existing'] if e['status'] and e['status'] < 400} | {f['url'] for f in d['found']}
out = {}
for url in sorted(urls):
    emb = None
    if 'nfb.ca/film/' in url:
        u = url.rstrip('/') + '/embed/player/'
        r = get(u)
        if r is not None and r.status_code == 200 and frameable(r): emb = u
    m = re.search(r'vimeo\.com/(\d+)(?:/(\w+))?', url)
    if m: emb = vimeo(m.group(1), m.group(2))
    if 'skyhopinka.com' in url:
        r = get(url)
        if r is not None:
            m = re.search(r'player\.vimeo\.com/video/(\d+)(?:\?h=(\w+))?', r.text)
            if m: emb = vimeo(m.group(1), m.group(2))
    out[url] = emb
    print(('EMBED ' if emb else 'link  ') + url, '->', emb, flush=True)
json.dump(out, open('out/embeds.json', 'w'), indent=1)
print('EMBEDDABLE', sum(1 for v in out.values() if v), 'OF', len(out))
