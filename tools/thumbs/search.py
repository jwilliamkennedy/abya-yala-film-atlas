"""Find one film-specific image per film (A–F batch). Runs on a GitHub runner.

For each film: (1) its own source page's preview image, if the page is about that film;
(2) otherwise one web search (title + director + year), taking film pages (Vimeo, YouTube,
NFB, Wikipedia, festival/distributor film pages) whose title matches the film.
A candidate needs the title to match and the director's name or the year nearby.
Images must load, be at least 280 x 150, and not be reused across different films (banners/logos).
Output: candidates.json and contact sheets for human review. Nothing is published from here.
"""
import json, re, time, unicodedata, io, hashlib, sys
from urllib.parse import urlparse, quote_plus, parse_qs, urljoin
import requests
from PIL import Image, ImageDraw, ImageFont

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 IndigenousCinemaAtlas/1.0',
      'Accept-Language': 'en,es;q=0.8,pt;q=0.6,fr;q=0.5'}
S = requests.Session(); S.headers.update(UA)

def n(s):
    return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().lower()).strip()

STOP = {'the', 'a', 'an', 'el', 'la', 'los', 'las', 'o', 'os', 'de', 'do', 'da', 'le', 'les'}
def main_title(t):
    t = re.split(r'\s[/|]\s|:\s|\s\(|\s–\s|\s-\s', t)[0]
    return n(t)

def title_ok(film, text):
    mt, tx = main_title(film), n(text)
    if not mt or not tx:
        return False
    if len(mt) >= 4 and mt in tx:
        return True
    words = [w for w in mt.split() if w not in STOP]
    return bool(words) and len(words) >= 2 and all(w in tx.split() for w in words)

def maker_ok(g, text):
    tx = n(text)
    for m in g['makers']:
        parts = [p for p in n(m).split() if len(p) > 2]
        if parts and (parts[-1] in tx.split() or (len(parts) > 1 and parts[0] in tx.split() and parts[1] in tx.split())):
            return True
    return bool(g.get('year')) and str(g['year']) in text

def get(url, **kw):
    try:
        r = S.get(url, timeout=20, allow_redirects=True, **kw)
        return r
    except Exception:
        return None

META = re.compile(r'<meta[^>]+(?:property|name)=["\'](og:image(?::secure_url)?|twitter:image(?::src)?|og:title|twitter:title|og:description|description)["\'][^>]*>', re.I)
def page_meta(url):
    r = get(url)
    if not r or r.status_code >= 400 or 'html' not in r.headers.get('content-type', ''):
        return None
    html = r.text[:400000]
    meta = {}
    for m in META.finditer(html):
        tag = m.group(0); key = m.group(1).lower()
        c = re.search(r'content=["\']([^"\']+)["\']', tag, re.I)
        if c and key not in meta:
            meta[key] = c.group(1).strip()
    t = re.search(r'<title[^>]*>(.*?)</title>', html, re.I | re.S)
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', html, re.I | re.S)
    img = meta.get('og:image') or meta.get('og:image:secure_url') or meta.get('twitter:image') or meta.get('twitter:image:src')
    return {'url': r.url, 'image': urljoin(r.url, img) if img else None,
            'title': ' '.join(x for x in [meta.get('og:title'), t and re.sub('<[^>]+>', '', t.group(1)), h1 and re.sub('<[^>]+>', '', h1.group(1))] if x),
            'text': ' '.join(x for x in [meta.get('og:description'), meta.get('description')] if x) + ' ' + re.sub('<[^>]+>', ' ', html[:60000])}

def oembed(url):
    if re.search(r'vimeo\.com/(\d+)', url):
        r = get('https://vimeo.com/api/oembed.json?url=' + quote_plus(url))
    elif re.search(r'(youtube\.com/watch|youtu\.be/)', url):
        r = get('https://www.youtube.com/oembed?format=json&url=' + quote_plus(url))
    else:
        return None
    try:
        j = r.json()
    except Exception:
        return None
    img = j.get('thumbnail_url')
    if img and 'vimeocdn' in img:
        img = re.sub(r'_\d+x\d+', '_960', img)
    if img and 'ytimg.com' in img:
        img = img.replace('hqdefault', 'hqdefault')
    return {'url': url, 'image': img, 'title': j.get('title', ''), 'text': (j.get('author_name') or '') + ' ' + (j.get('description') or '')}

def search(q):
    out = []
    r = get('https://html.duckduckgo.com/html/?q=' + quote_plus(q))
    if r is not None and r.status_code == 200:
        for m in re.finditer(r'class="result__a"[^>]+href="([^"]+)"', r.text):
            h = m.group(1)
            if 'uddg=' in h:
                h = parse_qs(urlparse(h).query).get('uddg', [h])[0]
            out.append(h)
    if not out:
        r = get('https://www.bing.com/search?q=' + quote_plus(q) + '&setlang=en')
        if r is not None and r.status_code == 200:
            out = re.findall(r'<li class="b_algo"[^>]*>.*?<a[^>]+href="(https?://[^"]+)"', r.text, re.S)
    return [u for u in out if u.startswith('http')][:10]

BAD_HOST = ('facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'tiktok.com', 'pinterest.', 'linkedin.com', 'amazon.', 'ebay.')
def candidate_from(url, g, how):
    host = urlparse(url).netloc.lower()
    if any(b in host for b in BAD_HOST) or url.lower().endswith('.pdf'):
        return None
    info = oembed(url) or page_meta(url)
    if not info or not info.get('image'):
        return None
    if not title_ok(g['title'], info['title']):
        return None
    film_page = any(k in host for k in ('vimeo.com', 'youtube.com', 'youtu.be', 'nfb.ca', 'onf.ca', 'wikipedia.org', 'moreliafilmfest', 'wapikoni', 'imaginenative', 'themoviedb', 'mubi.com', 'letterboxd', 'vtape', 'retinalatina', 'filmfreeway', 'isuma', 'visionmaker', 'sundance', 'cinematropical', 'pragda', 'wmm.com', 'festival', 'ficwallmapu', 'daupara'))
    if not maker_ok(g, info['title'] + ' ' + info['text']):
        if not (film_page and g.get('year') and str(g['year']) in info['text']):
            return None
    return {'n': g['n'], 'how': how, 'page': info['url'], 'image': info['image'], 'pageTitle': info['title'][:160]}

def check_image(url):
    r = get(url, headers={**UA, 'Referer': ''})
    if not r or r.status_code != 200 or not r.headers.get('content-type', '').startswith('image') or len(r.content) < 8000:
        return None
    try:
        im = Image.open(io.BytesIO(r.content)); im.load()
    except Exception:
        return None
    if im.width < 280 or im.height < 150:
        return None
    small = im.convert('L').resize((12, 12))
    px = list(small.getdata()); avg = sum(px) / len(px)
    h = ''.join('1' if p > avg else '0' for p in px)
    return {'w': im.width, 'h': im.height, 'hash': h, 'img': im.convert('RGB')}

def main():
    films = json.load(open('tools/thumbs/af_missing.json'))
    found, imgs = [], {}
    for g in films:
        cand = None
        for src in g['sources']:
            if src and not src.lower().endswith('.pdf'):
                cand = candidate_from(src, g, 'own source page')
                if cand: break
        if not cand:
            surname = (n(g['makers'][0]).split() or [''])[-1] if g['makers'] else ''
            q = f'"{g["title"]}" {surname} {g["year"] or ""} film'.strip()
            for url in search(q):
                cand = candidate_from(url, g, 'search: ' + q)
                if cand: break
                time.sleep(0.4)
            time.sleep(1.2)
        if cand:
            chk = check_image(cand['image'])
            if chk:
                cand.update({'w': chk['w'], 'h': chk['h'], 'hash': chk['hash']})
                imgs[g['n']] = chk['img']; found.append(cand)
        print(g['n'], g['title'][:40], '->', cand and cand['page'][:80], flush=True)
    # reject images (by perceptual hash) that recur across different films: banners, logos
    counts = {}
    for c in found:
        counts[c['hash']] = counts.get(c['hash'], 0) + 1
    kept = [c for c in found if counts[c['hash']] == 1]
    json.dump({'kept': kept, 'rejectedAsShared': [c for c in found if counts[c['hash']] > 1]}, open('out/candidates.json', 'w'), ensure_ascii=False, indent=1)
    # contact sheets
    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
    except Exception:
        font = ImageFont.load_default()
    byn = {g['n']: g for g in films}
    per, cols, cw, ch = 40, 5, 260, 210
    for s in range(0, len(kept), per):
        chunk = kept[s:s + per]
        sheet = Image.new('RGB', (cols * cw, ((len(chunk) + cols - 1) // cols) * ch), 'white')
        d = ImageDraw.Draw(sheet)
        for i, c in enumerate(chunk):
            x, y = (i % cols) * cw, (i // cols) * ch
            im = imgs[c['n']].copy(); im.thumbnail((cw - 10, ch - 52))
            sheet.paste(im, (x + 5, y + 5))
            g = byn[c['n']]
            d.text((x + 5, y + ch - 46), f"#{c['n']} {g['title'][:30]}", fill='black', font=font)
            d.text((x + 5, y + ch - 30), f"{(g['makers'] or [''])[0][:22]} {g['year'] or ''}", fill='#444', font=font)
            d.text((x + 5, y + ch - 15), urlparse(c['page']).netloc[:34], fill='#777', font=font)
        sheet.save(f'out/sheet_{s // per + 1:02d}.jpg', quality=82)
    print('FOUND', len(found), 'KEPT', len(kept), 'OF', len(films))

if __name__ == '__main__':
    main()
