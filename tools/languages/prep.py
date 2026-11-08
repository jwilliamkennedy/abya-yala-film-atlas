"""Build tools/languages/targets.json: one entry per film still without a language, with every
film-specific page the atlas already knows for it (list first, then links, then build).

Pages come from: the film's own source on the map; the research master's film-specific catalogue
page (matched on filmmaker + title + year); Watch links on the beta (by film ID); the Wapikoni
viewing index (matched on title + creator).
usage: python3 tools/languages/prep.py ../indigenous-cinema-atlas-research/mirror_work/mirror_work_master.xlsx"""
import csv, json, re, sys, unicodedata, warnings
warnings.filterwarnings('ignore')

def n(s):
    return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().lower()).strip()

rows = list(csv.DictReader(open('tools/languages/films_language_missing_2026-11-07.csv', encoding='utf-8')))
targets = []
for i, r in enumerate(rows):
    targets.append({'n': i, 'id': r['film_id'], 'title': r['title'], 'year': r['year'], 'makers': [r['filmmaker']],
                    'nations': [r['people_on_card']], 'sources': [r['source_url']] if r['source_url'] else [], 'pages': []})
by_key = {}
for t in targets:
    by_key.setdefault((n(t['makers'][0]), n(t['title'])), []).append(t)

def add(t, url, how):
    if url and url.startswith('http') and url not in [p['url'] for p in t['pages']] and url not in t['sources']:
        t['pages'].append({'url': url, 'how': how})

# research master film pages
if len(sys.argv) > 1:
    import openpyxl
    ws = openpyxl.load_workbook(sys.argv[1], read_only=True)['MASTER']
    it = ws.iter_rows(values_only=True); h = list(next(it)); I = {k: j for j, k in enumerate(h)}
    for r in it:
        page = r[I['Film-specific catalogue / watch page']]
        if not page:
            continue
        for t in by_key.get((n(r[I['Filmmaker']]), n(r[I['Film / project']])), []):
            add(t, str(page).strip(), 'research master film page')
# beta Watch links by film id
src = open('beta/watch-20261107-data.js', encoding='utf-8').read()
m = re.search(r'const add=(\{.*?\});', src, re.S)
watch = json.loads(m.group(1)) if m else {}
byid = {t['id']: t for t in targets}
for fid, links in watch.items():
    if fid in byid:
        for l in links:
            add(byid[fid], l['url'], 'Watch link')
# Wapikoni viewing index
src = open('beta/watch-library-20261107-data.js', encoding='utf-8').read()
lib = json.loads(re.search(r'ATLAS_WATCH_RESEARCH=(\{.*\});?', src, re.S).group(1))
for f in lib['films']:
    for p in f.get('p', []):
        for t in by_key.get((n(p), n(f['t'])), []):
            add(t, f.get('u'), 'Wapikoni film page')
            add(t, (f.get('s') or '').replace('player.vimeo.com/video/', 'vimeo.com/'), 'Wapikoni player')
json.dump(targets, open('tools/languages/targets.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print(len(targets), 'films;', sum(1 for t in targets if t['pages']), 'with a known film page')
