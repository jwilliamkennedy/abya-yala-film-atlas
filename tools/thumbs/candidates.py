"""Find a still or poster for each film in a missing-images list, from the film's own credit page.

usage: python3 tools/thumbs/candidates.py <missing.csv> <out dir>
Runs on a GitHub runner (which can reach the web). For each row it reads film_source, keeps the page's
share image (og:image / twitter:image / image_src) only when the page names the film (title words) and
the filmmaker (surname), the image loads, is at least 320 px wide and is not a logo, and no other film in
the list got the same image (that is a site banner). Writes <out>/candidates.csv and numbered contact
sheets <out>/sheet-<n>.jpg for review by eye. Nothing is entered in the atlas from here."""
import csv, hashlib, html, io, os, re, sys, unicodedata, urllib.parse
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image, ImageDraw, ImageFont

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 IndigenousCinemaAtlas/1.0 (research check)'}
STOP = {'the', 'and', 'for', 'with', 'from', 'los', 'las', 'del', 'una', 'des', 'les', 'que', 'por', 'een'}
BAD = re.compile(r'logo|favicon|icon|placeholder|default|sprite|blank|avatar', re.I)

def fold(s):
    return unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()

def words(title):
    t = re.split(r'\s[/–-]\s|\(|:', title)[0]
    return [w for w in re.findall(r'[a-z0-9]{3,}', fold(t)) if w not in STOP][:3] or re.findall(r'[a-z0-9]+', fold(title))[:1]

def page(url):
    r = requests.get(url, headers=UA, timeout=25, allow_redirects=True)
    r.raise_for_status()
    if 'html' not in r.headers.get('content-type', 'text/html') and not r.text.lstrip()[:200].lower().startswith(('<!doctype html', '<html')):
        raise ValueError('not html')
    return r.url, r.text

def share_image(base, text):
    for pat in (r'<meta[^>]+property=["\']og:image(?::secure_url)?["\'][^>]+content=["\']([^"\']+)',
                r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image',
                r'<meta[^>]+name=["\']twitter:image(?::src)?["\'][^>]+content=["\']([^"\']+)',
                r'<link[^>]+rel=["\']image_src["\'][^>]+href=["\']([^"\']+)'):
        m = re.search(pat, text, re.I)
        if m:
            return urllib.parse.urljoin(base, html.unescape(m.group(1).strip()))
    return None

def one(row):
    out = dict(row, image_url='', image_page='', check='', w='', h='', sha='')
    src = (row.get('film_source') or '').strip()
    if not src.startswith('http'):
        out['check'] = 'no credit page'; return out, None
    try:
        base, text = page(src)
    except Exception as e:
        out['check'] = f'page failed: {str(e)[:60]}'; return out, None
    plain = fold(re.sub(r'<[^>]+>', ' ', text))
    surname = fold(row['filmmaker']).split()[-1] if row['filmmaker'].split() else ''
    ws = words(row['title'])
    missing = [w for w in ws if w not in plain]
    if len(missing) == len(ws) or (len(ws) == 3 and len(missing) > 1):   # spellings vary; every image is checked by eye
        out['check'] = 'page does not name the film'; return out, None
    if surname and surname not in plain:
        out['check'] = 'page does not name the filmmaker'; return out, None
    img = share_image(base, text)
    if not img:
        out['check'] = 'no share image'; return out, None
    if BAD.search(urllib.parse.urlparse(img).path):
        out['check'] = 'logo-like image'; return out, None
    try:
        r = requests.get(img, headers=UA, timeout=25); r.raise_for_status()
        im = Image.open(io.BytesIO(r.content)); im.load()
    except Exception as e:
        out['check'] = f'image failed: {str(e)[:50]}'; return out, None
    if im.width < 320:
        out['check'] = f'too small ({im.width}px)'; return out, None
    out.update(image_url=img, image_page=base, w=im.width, h=im.height, sha=hashlib.sha1(r.content).hexdigest()[:12], check='ok')
    return out, im.convert('RGB')

def main(src, outdir):
    os.makedirs(outdir, exist_ok=True)
    rows = list(csv.DictReader(open(src, encoding='utf-8')))
    with ThreadPoolExecutor(8) as ex:
        res = list(ex.map(one, rows))
    # an image shared by two or more films is a site banner, not a still
    count = {}
    for o, _ in res:
        if o['check'] == 'ok':
            count[o['sha']] = count.get(o['sha'], 0) + 1
    for o, _ in res:
        if o['check'] == 'ok' and count[o['sha']] > 1:
            o['check'] = 'same image as another film (banner)'
    write(rows, res, outdir)

def write(rows, res, outdir, extra=()):
    cols = list(rows[0].keys()) + ['image_url', 'image_page', 'check', 'w', 'h', 'sha'] + list(extra)
    with open(os.path.join(outdir, 'candidates.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols, extrasaction='ignore'); w.writeheader()
        for o, _ in res: w.writerow(o)
    ok = [(o, im) for o, im in res if o['check'] == 'ok']
    font = ImageFont.load_default()
    tw, th, per, cols_n = 200, 125, 60, 6
    for s in range(0, len(ok), per):
        chunk = ok[s:s + per]
        sheet = Image.new('RGB', (cols_n * (tw + 8) + 8, ((len(chunk) + cols_n - 1) // cols_n) * (th + 34) + 8), 'white')
        d = ImageDraw.Draw(sheet)
        for i, (o, im) in enumerate(chunk):
            x, y = 8 + (i % cols_n) * (tw + 8), 8 + (i // cols_n) * (th + 34)
            t = im.copy(); t.thumbnail((tw, th)); sheet.paste(t, (x, y))
            d.text((x, y + th + 2), f"#{o['n']} {o['title'][:28]}", fill='black', font=font)
            d.text((x, y + th + 16), o['filmmaker'][:32], fill='#555', font=font)
        sheet.save(os.path.join(outdir, f'sheet-{s // per + 1}.jpg'), quality=82)
    from collections import Counter
    print('CANDIDATES', dict(Counter(o['check'].split(':')[0].split(' (')[0] for o, _ in res)))

if __name__ == '__main__':
    main(*sys.argv[1:3])
