"""Fetch pages as text for review (runs on a GitHub runner, which can reach the web).
usage: python3 tools/atlas/fetch_pages.py <url list file> <out dir>
Writes <out>/<n>.txt for each URL (HTML reduced to text, PDFs extracted) and <out>/index.tsv (n, status, chars, url)."""
import sys, os, re, io, html as H
import requests
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 IndigenousCinemaAtlas/1.0 (research check)'}
def text(r, url):
    if 'pdf' in r.headers.get('content-type', '') or url.lower().split('?')[0].endswith('.pdf'):
        from pypdf import PdfReader
        return '\n'.join((p.extract_text() or '') for p in PdfReader(io.BytesIO(r.content)).pages[:400])
    t = re.sub(r'(?is)<(script|style|noscript)[^>]*>.*?</\1>', ' ', r.text)
    t = re.sub(r'(?i)<br\s*/?>|</(p|div|li|h\d|tr)>', '\n', t)
    t = H.unescape(re.sub(r'<[^>]+>', ' ', t))
    return re.sub(r'[ \t]+', ' ', re.sub(r'\n\s*\n+', '\n', t)).strip()
def main(lst, out):
    os.makedirs(out, exist_ok=True)
    urls = [u.strip() for u in open(lst, encoding='utf-8') if u.strip().startswith('http')]
    with open(f'{out}/index.tsv', 'w', encoding='utf-8') as idx:
        for n, u in enumerate(urls, 1):
            try:
                r = requests.get(u, headers=UA, timeout=40)
                t = text(r, u) if r.status_code < 400 else ''
                st = r.status_code
            except Exception as e:
                t, st = '', type(e).__name__
            open(f'{out}/{n}.txt', 'w', encoding='utf-8').write(t)
            idx.write(f'{n}\t{st}\t{len(t)}\t{u}\n'); print(n, st, len(t), u, flush=True)
if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
