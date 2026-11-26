"""Look for a still or poster of each film by searching YouTube and TMDB.

usage: python3 tools/thumbs/search_candidates.py <search.csv> <out dir>
<search.csv> has film_id, title, year, makers (names joined by ' | ').
A YouTube result is kept only when its title carries the film's title words and also the
filmmaker's surname, the year, or a channel named after the filmmaker. A TMDB result is kept only when
the title matches, the year agrees (when both are known) and the film's TMDB page names the filmmaker.
Writes <out>/candidates.csv and numbered contact sheets for review by eye. Nothing enters the atlas from here."""
import csv, io, json, os, re, sys, time, unicodedata, urllib.parse
from concurrent.futures import ThreadPoolExecutor
import requests
from PIL import Image, ImageDraw

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.8,es;q=0.6'}
YT_COOKIES = {'CONSENT': 'YES+cb', 'SOCS': 'CAI'}
STOP = set('a an the and or of in de del la el los las une un le les des du que y e o da do das dos em na no por para con sin film documentary short corto cortometraje documental'.split())

def fold(s):
    return unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()

def words(s):
    return [w for w in re.findall(r'[a-z0-9]+', fold(s)) if w not in STOP and len(w) > 1]

def primary(title):
    return re.split(r'\s[/–-]\s|:|\(|\|', title)[0]

def title_match(film, other):
    want = words(primary(film)) or words(film)
    have = set(words(other))
    if not want:
        return False
    hit = sum(w in have for w in want)
    return hit == len(want) if len(want) <= 3 else hit >= max(3, round(.75 * len(want)))

def surnames(makers):
    out = []
    for m in makers.split(' | '):
        toks = [t for t in words(m) if len(t) >= 3]
        if toks:
            out.append(toks[-1])
            if len(toks) > 2:
                out.append(toks[-2])
    return out

def yt_search(row):
    q = primary(row['title']) + ' ' + (row['makers'].split(' | ')[0] if row['makers'] else '')
    r = requests.get('https://www.youtube.com/results', params={'search_query': q, 'hl': 'en'}, headers=UA, cookies=YT_COOKIES, timeout=25)
    r.raise_for_status()
    m = re.search(r'var ytInitialData = (\{.*?\});</script>', r.text, re.S)
    if not m:
        raise ValueError('no results data')
    data = json.loads(m.group(1))
    found = []
    def walk(x):
        if isinstance(x, dict):
            if 'videoRenderer' in x:
                found.append(x['videoRenderer'])
            for v in x.values():
                walk(v)
        elif isinstance(x, list):
            for v in x:
                walk(v)
    walk(data)
    sn = surnames(row['makers'])
    for v in found[:12]:
        vt = ''.join(t.get('text', '') for t in v.get('title', {}).get('runs', []))
        ch = ''.join(t.get('text', '') for t in v.get('ownerText', {}).get('runs', []))
        snip = ' '.join(''.join(t.get('text', '') for t in s.get('snippetText', {}).get('runs', [])) for s in v.get('detailedMetadataSnippets', []))
        if not title_match(row['title'], vt):
            continue
        blob = set(words(vt + ' ' + ch + ' ' + snip))
        why = [s for s in sn if s in blob]
        if row['year'] and row['year'] in (vt + snip):
            why.append(row['year'])
        if why:
            vid = v['videoId']
            return dict(source='YouTube', image_url=f'https://i.ytimg.com/vi/{vid}/hqdefault.jpg', image_page=f'https://www.youtube.com/watch?v={vid}',
                        found_title=vt, found_by=ch, why=' '.join(why))
    return None

def tmdb_search(row):
    r = requests.get('https://www.themoviedb.org/search/movie', params={'query': primary(row['title'])}, headers=UA, timeout=25)
    r.raise_for_status()
    sn = surnames(row['makers'])
    for card in re.findall(r'<div class="card v4 tight"(.*?)</div>\s*</div>\s*</div>', r.text, re.S)[:6]:
        link = re.search(r'href="(/movie/\d+[^"]*)"', card)
        name = re.search(r'<h2[^>]*>(.*?)</h2>', card, re.S)
        date = re.search(r'class="release_date">([^<]*)<', card)
        img = re.search(r'<img[^>]+src="([^"]+)"', card)
        if not (link and name and img):
            continue
        t = re.sub('<[^>]+>', '', name.group(1)).strip()
        if not title_match(row['title'], t):
            continue
        y = re.search(r'(\d{4})', date.group(1)) if date else None
        if row['year'] and y and abs(int(y.group(1)) - int(row['year'])) > 1:
            continue
        page = 'https://www.themoviedb.org' + link.group(1).split('?')[0]
        p = requests.get(page, headers=UA, timeout=25).text
        if not any(s in set(words(re.sub('<[^>]+>', ' ', p))) for s in sn):
            continue
        poster = re.sub(r'/t/p/[^/]+/', '/t/p/w500/', img.group(1))
        return dict(source='TMDB', image_url=urllib.parse.urljoin(page, poster), image_page=page, found_title=t, found_by='', why='maker on page')
    return None

def one(row):
    res = dict(row, source='', image_url='', image_page='', found_title='', found_by='', why='', check='', w='', h='')
    for fn in (tmdb_search, yt_search):
        try:
            hit = fn(row)
        except Exception as e:
            res['check'] = (res['check'] + f' {fn.__name__}: {str(e)[:60]}').strip()
            continue
        if hit:
            res.update(hit)
            try:
                im = requests.get(hit['image_url'], headers=UA, timeout=25)
                im.raise_for_status()
                img = Image.open(io.BytesIO(im.content))
                res['w'], res['h'] = img.size
                res['check'] = 'candidate' if img.size[0] >= 300 else 'too small'
                res['_img'] = img.convert('RGB')
            except Exception as e:
                res['check'] = f'image failed: {str(e)[:60]}'
            return res
    res['check'] = res['check'] or 'nothing matched'
    return res

def sheets(rows, out):
    good = [r for r in rows if r['check'] == 'candidate']
    W, H, cols, per = 200, 150, 6, 48
    for s in range(0, len(good), per):
        chunk = good[s:s + per]
        rows_n = (len(chunk) + cols - 1) // cols
        sheet = Image.new('RGB', (cols * (W + 8), rows_n * (H + 40)), 'white')
        d = ImageDraw.Draw(sheet)
        for i, r in enumerate(chunk):
            x, y = (i % cols) * (W + 8), (i // cols) * (H + 40)
            im = r['_img'].copy(); im.thumbnail((W, H)); sheet.paste(im, (x, y))
            d.text((x, y + H + 2), f"#{r['n']} {r['title'][:30]}", fill='black')
            d.text((x, y + H + 16), f"{r['source']}: {r['found_title'][:30]}", fill='gray')
        sheet.save(os.path.join(out, f'sheet-{s // per + 1}.jpg'), quality=82)

def main():
    src, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    rows = list(csv.DictReader(open(src, encoding='utf-8')))
    with ThreadPoolExecutor(6) as ex:
        res = list(ex.map(one, rows))
    sheets(res, out)
    keys = [k for k in res[0] if k != '_img']
    w = csv.DictWriter(open(os.path.join(out, 'candidates.csv'), 'w', encoding='utf-8', newline=''), fieldnames=keys, extrasaction='ignore')
    w.writeheader(); w.writerows(res)
    from collections import Counter
    print(Counter(r['check'].split(':')[0] for r in res), Counter(r['source'] for r in res if r['check'] == 'candidate'))

if __name__ == '__main__':
    main()
