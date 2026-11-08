"""Build the atlas's film facets: one documented store for languages, themes, form and length, with a source per value.

usage: python3 tools/facets/build.py <public.json from tools/pages/dump.py> <beta dir>
Inputs  : public.json (films by filmmakers on the public map), beta/themes-1103-data.js (themes from published synopses),
          tools/facets/languages_authority.csv (checked against Glottolog), tools/languages/filled/*.csv (new language fills).
Outputs : beta/data/film-facets.csv   one row per film, field and value, with code, source and basis (long form)
          beta/data/film-facets.json  the same as one document, with vocabularies and the language authority
          beta/data/languages.csv     the language authority with film counts
          beta/facets-data.js         compact copy the map loads (filters and search)
          beta/languages.html, beta/themes.html   browse pages
"""
import csv, json, re, sys, glob, html, datetime, os, unicodedata, collections
PUB, BETA = sys.argv[1], sys.argv[2].rstrip('/')
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today().isoformat()
BASE = 'https://jwilliamkennedy.github.io/abya-yala-film-atlas/beta'
esc = lambda s: html.escape(str(s or ''), quote=True)
def key(s): return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', str(s or '')).encode('ascii', 'ignore').decode().lower()).strip()

P = json.load(open(PUB, encoding='utf-8'))
s = open(f'{BETA}/themes-1103-data.js', encoding='utf-8').read()
i = s.index('window.ATLAS_THEMES_1103=') + len('window.ATLAS_THEMES_1103='); T, _ = json.JSONDecoder().raw_decode(s[i:])
FAMILY = {t: fam for fam, ts in T['families'].items() for t in ts}

AUTH = list(csv.DictReader(open(f'{ROOT}/facets/languages_authority.csv', encoding='utf-8')))
ALIAS = {}
for a in AUTH:
    for name in [a['label']] + [x for x in a['also_credited_as'].split(';') if x.strip()]:
        ALIAS[key(name)] = a
SKIP = re.compile(r'^(english subtitles|subtitled|no dialogue|none|n/a)$', re.I)
def split_langs(raw):
    raw = '; '.join(raw) if isinstance(raw, list) else str(raw or '')
    return [x.strip() for x in re.split(r'\s*[,;|]\s*|\s+and\s+', raw) if x.strip() and not SKIP.match(x.strip())]

FILLED = {}
for path in sorted(glob.glob(f'{ROOT}/languages/filled/*.csv')):
    for row in csv.DictReader(open(path, encoding='utf-8-sig')):
        if row.get('languages', '').strip() and row.get('language_source_url', '').strip():
            FILLED[row['film_id']] = (row['languages'], row['language_source_url'].strip(), os.path.basename(path))

def form_from_medium(m):
    k = key(m)
    if not k: return None
    for pat, form in [(r'music video', 'Music Video'), (r'animat|stop motion|puppet', 'Animation'), (r'docufiction|hybrid|performance', 'Hybrid'),
                      (r'experimental|video art|installation', 'Experimental'), (r'documentar|\bdoc\b', 'Documentary'),
                      (r'narrative|dramatic|fiction|comedy|television film', 'Fiction')]:
        if re.search(pat, k): return form
    return None
def length_from_medium(m):
    k = key(m)
    if re.search(r'series', k): return 'Series'
    if re.search(r'mid length', k): return 'Mid-length'
    if re.search(r'short|mini', k): return 'Short'
    if re.search(r'feature', k): return 'Feature'
    return None

rows, films, lang_count, theme_count = [], {}, collections.Counter(), collections.Counter()
seen = {}
for r in P:
    for f in r['films']:
        fk = (key(f['title']), f.get('year'))
        if fk in seen:  # co-directed film: one entry, all directors
            films[seen[fk]]['makers'].append({'id': r['id'], 'name': r['name']}); continue
        fid = f['id']; seen[fk] = fid
        e = {'title': f['title'], 'year': f.get('year'), 'makers': [{'id': r['id'], 'name': r['name']}], 'languages': [], 'themes': [],
             'primary_theme': None, 'families': [], 'form': None, 'length': None}
        def add(field, value, code='', source='', basis=''):
            rows.append({'film_id': fid, 'title': f['title'], 'year': f.get('year') or '', 'field': field, 'value': value, 'code': code, 'source_url': source, 'basis': basis})
        # languages
        if fid in FILLED:
            raw, lsrc, part = FILLED[fid]; basis = f'language fill ({part}), checked against the source page'
        else:
            raw, lsrc, basis = f.get('languages'), f.get('source', ''), 'recorded with the film in the atlas'
        for name in split_langs(raw):
            a = ALIAS.get(key(name))
            label = a['label'] if a else name
            if label in [x['label'] for x in e['languages']]: continue
            e['languages'].append({'label': label, 'as_credited': name, 'glottocode': a['glottocode'] if a else '', 'iso639_3': a['iso639_3'] if a else '',
                                   'match': a['match'] if a else 'not in authority', 'indigenous': (a['indigenous'] == 'yes') if a else None, 'source': lsrc})
            add('language', label, a['glottocode'] if a else '', lsrc, basis + (f'; credited as "{name}"' if a and key(name) != key(label) else ''))
            lang_count[label] += 1
        # themes, form, length from synopsis tagging
        t = T['films'].get(fid)
        if t:
            tags, primary, form, length, tsrc = t
            e['themes'] = tags; e['primary_theme'] = primary or None
            e['families'] = sorted({FAMILY[x] for x in tags if x in FAMILY})
            for tag in tags:
                add('theme', tag, FAMILY.get(tag, ''), tsrc, 'tagged from a published synopsis' + ('; primary theme' if tag == primary else ''))
                theme_count[tag] += 1
            if form: e['form'] = form; add('form', form, '', tsrc, 'from the published synopsis')
            if length: e['length'] = {'S': 'Short', 'F': 'Feature'}.get(length, length); add('length', e['length'], '', tsrc, 'from the published synopsis')
        if not e['form']:
            fm = form_from_medium(f.get('medium'))
            if fm: e['form'] = fm; add('form', fm, '', f.get('source', ''), f'normalised from the recorded form "{f.get("medium")}"')
        if not e['length']:
            ln = length_from_medium(f.get('medium'))
            if ln: e['length'] = ln; add('length', ln, '', f.get('source', ''), f'normalised from the recorded form "{f.get("medium")}"')
        films[fid] = e

os.makedirs(f'{BETA}/data', exist_ok=True)
cols = ['film_id', 'title', 'year', 'field', 'value', 'code', 'source_url', 'basis']
with open(f'{BETA}/data/film-facets.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=cols); w.writeheader(); w.writerows(rows)
lang_rows = []
for a in AUTH:
    lang_rows.append({**a, 'films': lang_count.get(a['label'], 0)})
for label, n in lang_count.items():
    if label not in {a['label'] for a in AUTH}:
        lang_rows.append({'label': label, 'also_credited_as': '', 'glottocode': '', 'glottolog_name': '', 'glottolog_level': '', 'iso639_3': '', 'match': 'not in authority', 'indigenous': '', 'note': 'Add to tools/facets/languages_authority.csv', 'films': n})
with open(f'{BETA}/data/languages.csv', 'w', newline='', encoding='utf-8') as fh:
    w = csv.DictWriter(fh, fieldnames=list(lang_rows[0].keys())); w.writeheader(); w.writerows(lang_rows)
doc = {'title': 'Indigenous Cinema Atlas · film facets', 'generated': TODAY, 'license': 'See data.html', 'films_on_public_map': len(films),
       'fields': {'language': 'Languages spoken in the film; label is the atlas form, as_credited is the wording of the credit; codes from Glottolog (glottocode) and ISO 639-3',
                  'theme': 'Themes from the atlas vocabulary (30 tags in 5 families), tagged only from a published synopsis whose URL is kept',
                  'form': 'Documentary, Fiction, Animation, Experimental, Hybrid or Music Video', 'length': 'Short, Mid-length, Feature or Series'},
       'vocabularies': {'themes': T['families'], 'forms': ['Documentary', 'Fiction', 'Animation', 'Experimental', 'Hybrid', 'Music Video'],
                        'lengths': ['Short', 'Mid-length', 'Feature', 'Series']},
       'language_authority': {'source': 'Glottolog (glottolog-cldf, fetched ' + TODAY + ')', 'languages': lang_rows}, 'films': films}
json.dump(doc, open(f'{BETA}/data/film-facets.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
compact = {fid: {k: v for k, v in {'l': [x['label'] for x in e['languages']], 't': e['themes'], 'p': e['primary_theme'], 'f': e['form'], 'n': e['length']}.items() if v}
           for fid, e in films.items()}
auth = {a['label']: {'g': a['glottocode'], 'i': a['iso639_3'], 'm': a['match'], 'x': a['indigenous'] == 'yes'} for a in AUTH}
open(f'{BETA}/facets-data.js', 'w', encoding='utf-8').write(
    f'/* Built by tools/facets/build.py on {TODAY} from the public records, the theme tagging and the language authority. Edit those, not this file. */\n'
    f'window.ATLAS_FACETS={json.dumps({"films": compact, "families": T["families"], "languages": auth, "titleIndex": {key(e["title"]) + "|" + str(e["year"] or ""): fid for fid, e in films.items()}}, ensure_ascii=False, separators=(",", ":"))};\n')

# ---- browse pages, built on the filmmaker directory's own page shell ----
shell = open(f'{BETA}/maker/index.html', encoding='utf-8').read()
head, _rest = shell.split('<main>', 1)
foot = '</main>' + _rest.split('</main>', 1)[1] if '</main>' in _rest else '</main></body></html>'
def page(path, title, desc, body):
    h = re.sub(r'<title>.*?</title>', f'<title>{esc(title)} · Indigenous Cinema Atlas</title>', head, flags=re.S)
    h = re.sub(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{esc(desc)}"', h)
    h = h.replace('href="../', 'href="').replace('src="../', 'src="')
    h = h.replace('</head>', '<style>.facet-list{list-style:none;padding:0;margin:0}.facet-list>li{padding:14px 0;border-bottom:1px solid rgba(24,32,40,.14)}'
                  '.facet-list h2{font:400 22px/1.2 Georgia,serif;margin:0 0 4px}.facet-list .codes{font-size:13px;color:#55616b}.facet-list ol{margin:8px 0 0;padding-left:18px;font-size:15px}'
                  '.facet-list ol li{margin:3px 0}.jump{display:flex;flex-wrap:wrap;gap:6px 14px;margin:14px 0 6px;font-size:14px}.fam{margin-top:30px}</style></head>')
    open(f'{BETA}/{path}', 'w', encoding='utf-8').write(h + '<main>' + body + foot.replace('href="../', 'href="').replace('src="../', 'src="'))
def film_li(fid, e):
    makers = ', '.join(f'<a href="maker/{esc(m["id"])}.html#{esc(fid)}">{esc(m["name"])}</a>' for m in e['makers'])
    return f'<li><cite>{esc(e["title"])}</cite>{" (" + str(e["year"]) + ")" if e["year"] else ""} · {makers}</li>'
by_lang = collections.defaultdict(list)
for fid, e in films.items():
    for x in e['languages']: by_lang[x['label']].append((fid, e))
A = {a['label']: a for a in AUTH}
order = sorted(by_lang, key=lambda l: (not (A.get(l, {}).get('indigenous') == 'yes'), l.lower()))
items = []
for l in order:
    a = A.get(l, {}); codes = []
    if a.get('glottocode'): codes.append(f'<a href="https://glottolog.org/resource/languoid/id/{esc(a["glottocode"])}" rel="noopener">Glottolog {esc(a["glottocode"])}</a>' + (' (language group)' if a.get('glottolog_level') == 'family' else ''))
    if a.get('iso639_3'): codes.append(f'ISO 639-3 <code>{esc(a["iso639_3"])}</code>')
    if a.get('match') == 'unresolved': codes.append(esc(a.get('note', 'variety not stated in the credit')))
    fl = sorted(by_lang[l], key=lambda x: (x[1]['year'] or 9999, x[1]['title'].lower()))
    items.append(f'<li id="{esc(key(l).replace(" ", "-"))}"><h2>{esc(l)}</h2><p class="codes">{len(fl)} film{"s" if len(fl) != 1 else ""} · {" · ".join(codes)}</p><ol>{"".join(film_li(fid, e) for fid, e in fl)}</ol></li>')
n_lang_films = sum(1 for e in films.values() if e['languages'])
ind = [l for l in order if A.get(l, {}).get('indigenous') == 'yes']
page('languages.html', 'Languages', f'Films on the Indigenous Cinema Atlas by the languages spoken in them, with Glottolog and ISO 639-3 codes.',
     f'<p class="crumb"><a href="./">Indigenous Cinema Atlas</a></p><h1>Languages</h1>'
     f'<p class="who">{len(ind)} Indigenous languages across {n_lang_films} films with a recorded language, of {len(films):,} films on the public map. Each language links to its Glottolog entry; where a credit names a language group rather than one variety, the group is linked. Languages are recorded only as a film’s credits or synopsis state them. Updated {TODAY}.</p>'
     f'<p class="jump">{" ".join(f"<a href=\"#{esc(key(l).replace(" ", "-"))}\">{esc(l)}</a>" for l in order)}</p>'
     f'<ul class="facet-list">{"".join(items)}</ul><p class="who"><a href="data/languages.csv">Language authority (CSV)</a> · <a href="data/film-facets.csv">All film facets (CSV)</a> · <a href="data.html">About the data</a></p>')
by_theme = collections.defaultdict(list)
for fid, e in films.items():
    for t in e['themes']: by_theme[t].append((fid, e))
secs = []
for fam, tags in T['families'].items():
    lis = []
    for t in tags:
        fl = sorted(by_theme.get(t, []), key=lambda x: (x[1]['year'] or 9999, x[1]['title'].lower()))
        if not fl: continue
        lis.append(f'<li id="{esc(key(t).replace(" ", "-"))}"><h2>{esc(t)}</h2><p class="codes">{len(fl)} film{"s" if len(fl) != 1 else ""}</p><ol>{"".join(film_li(fid, e) for fid, e in fl)}</ol></li>')
    secs.append(f'<section class="fam"><h2 style="font:400 28px/1.2 Georgia,serif">{esc(fam)}</h2><ul class="facet-list">{"".join(lis)}</ul></section>')
n_th = sum(1 for e in films.values() if e['themes'])
page('themes.html', 'Themes', 'Films on the Indigenous Cinema Atlas by theme: 30 themes in five families, each tagged from a published synopsis.',
     f'<p class="crumb"><a href="./">Indigenous Cinema Atlas</a></p><h1>Themes</h1>'
     f'<p class="who">{n_th} of {len(films):,} films on the public map are tagged so far, each from a published synopsis whose link is kept with the tag. A film can carry several themes; its primary theme is listed first in the data. Tagging continues. Updated {TODAY}.</p>'
     f'<p class="jump">{" ".join(f"<a href=\"#{esc(key(t).replace(" ", "-"))}\">{esc(t)}</a>" for fam in T["families"].values() for t in fam if by_theme.get(t))}</p>'
     + ''.join(secs) + '<p class="who"><a href="data/film-facets.csv">All film facets (CSV)</a> · <a href="data.html">About the data</a></p>')
print(f'films {len(films)} | with language {n_lang_films} | Indigenous languages {len(ind)} | with themes {n_th} | facet rows {len(rows)} | languages not in authority: {[l for l in lang_count if l not in A]}')
