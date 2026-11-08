"""Check Queue proposals against their own sources (runs on a GitHub runner, which can reach the web).

usage: python3 tools/atlas/verify_queue.py <atlas.xlsx> <out dir>
For every Queue row with queue_status "new" and an action other than "lead":
  identity  (add filmmaker): the source_1_url page contains the source_1_quote and the filmmaker's name
  credit    (add filmmaker / add film): the film_source page names the film and the filmmaker
  evidence  (correct): the evidence_url page contains what the row adds (language, year, title words)
Pages are read as text (HTML or PDF). Nothing is changed in the workbook: the report (verify.md, verify.json)
is what Claude reads before accepting a row."""
import sys, os, re, io, json, unicodedata, collections
import requests
from openpyxl import load_workbook
sys.path.insert(0, os.path.dirname(__file__))
from schema import *
import build

UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 IndigenousCinemaAtlas/1.0 (research check)'}
CACHE = {}

def norm(t):
    t = unicodedata.normalize('NFD', str(t or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', t).strip()

def text_of(url):
    if url in CACHE:
        return CACHE[url]
    out = ''
    try:
        r = requests.get(url, headers=UA, timeout=25, allow_redirects=True)
        ct = r.headers.get('content-type', '')
        if r.status_code < 400:
            if 'pdf' in ct or url.lower().split('?')[0].endswith('.pdf'):
                from pypdf import PdfReader
                pdf = PdfReader(io.BytesIO(r.content))
                out = ' '.join((p.extract_text() or '') for p in pdf.pages[:400])
            else:
                html = r.text
                html = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', html)
                meta = ' '.join(re.findall(r'<meta[^>]+content="([^"]+)"', html))
                out = meta + ' ' + re.sub(r'<[^>]+>', ' ', html)
        else:
            out = f'__HTTP_{r.status_code}__'
    except Exception as e:
        out = f'__ERROR_{type(e).__name__}__'
    import html as H
    out = H.unescape(out)
    CACHE[url] = out
    return out

def has(text, phrase, min_words=None):
    """phrase found in text: exact (normalised), or most of its longer words in one window."""
    t, p = norm(text), norm(phrase)
    if not p:
        return False, ''
    i = t.find(p)
    if i >= 0:
        return True, t[max(0, i - 80): i + len(p) + 80]
    words = [w for w in p.split() if len(w) > 3]
    if not words:
        return False, ''
    need = max(1, round(len(words) * 0.8)) if min_words is None else min_words
    for m in re.finditer(re.escape(words[0]), t):
        win = t[max(0, m.start() - 200): m.start() + 400]
        if sum(1 for w in words if w in win) >= need:
            return True, win[:300]
    return False, ''

def surname_hit(text, name):
    parts = [w for w in norm(name).split() if len(w) > 2]
    t = norm(text)
    return bool(parts) and (parts[-1] in t.split() or all(p in t for p in parts[:2]))

def main(path, out):
    os.makedirs(out, exist_ok=True)
    wb = load_workbook(path, data_only=True)
    rows = build.read_sheet(wb['Queue'], QUEUE_COLS)
    v = build.cellnorm
    todo = [r for r in rows if v(r.get('queue_status')) == 'new' and v(r.get('queue_action')) not in ('lead', '')]
    report = []
    for r in todo:
        a, name, title = v(r.get('queue_action')), v(r.get('name')), v(r.get('title'))
        res = {'row': r['_row'], 'action': a, 'filmmaker_id': v(r.get('filmmaker_id')), 'name': name, 'film_id': v(r.get('film_id')), 'title': title, 'checks': {}}
        if a == 'add filmmaker':
            src, quote = v(r.get('source_1_url')), v(r.get('source_1_quote'))
            t = text_of(src) if src else ''
            ok, ctx = has(t, quote) if quote else (False, '')
            res['checks']['identity'] = {'url': src, 'quote_found': ok, 'name_found': surname_hit(t, name), 'context': ctx, 'fetch': t[:20] if t.startswith('__') else 'ok'}
        if a in ('add filmmaker', 'add film') and title:
            src = v(r.get('film_source')) or v(r.get('evidence_url'))
            t = text_of(src) if src else ''
            main_title = re.split(r'\s[/=(]|\s[–-]\s|:\s', title)[0]
            ok, ctx = has(t, main_title)
            res['checks']['credit'] = {'url': src, 'title_found': ok, 'name_found': surname_hit(t, name), 'context': ctx, 'fetch': t[:20] if t.startswith('__') else 'ok'}
        if a == 'correct':
            src = v(r.get('evidence_url'))
            t = text_of(src) if src else ''
            checks = {}
            for c in ('languages', 'year', 'title'):
                val = v(r.get(c))
                if val:
                    found = all(has(t, x)[0] for x in split_list(val)) if c == 'languages' else has(t, val)[0]
                    checks[c] = found
            res['checks']['evidence'] = {'url': src, **checks, 'fetch': t[:20] if t.startswith('__') else 'ok'}
        report.append(res)
        print(res['row'], a, name, '|', title, '|', {k: {kk: vv for kk, vv in c.items() if kk not in ('context', 'url')} for k, c in res['checks'].items()}, flush=True)
    json.dump(report, open(f'{out}/verify.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    with open(f'{out}/verify.md', 'w', encoding='utf-8') as fh:
        fh.write(f'# Queue check · {len(report)} rows\n\n')
        for res in report:
            fh.write(f"## Row {res['row']} · {res['action']} · {res['name']} · {res['title']}\n")
            for k, c in res['checks'].items():
                fh.write(f"- **{k}** {c.get('url','')}\n  - " + ', '.join(f'{kk}: {vv}' for kk, vv in c.items() if kk not in ('url', 'context')) + '\n')
                if c.get('context'):
                    fh.write(f"  - context: …{c['context']}…\n")
            fh.write('\n')

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
