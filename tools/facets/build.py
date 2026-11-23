"""Build the atlas's film facets: one documented store for languages, themes, form and length, with a source per value.

Run by tools/atlas/build.py (the inputs come from the atlas master):
usage: python3 tools/facets/build.py <records json> <beta dir> --themes <themes json> --js-out <path>
Inputs  : the published records (languages from the workbook's language columns), the theme tags (workbook theme columns),
          tools/facets/languages_authority.csv (checked against Glottolog; the workbook's Lists sheet carries the same list).
Outputs : beta/data/film-facets.csv   one row per film, field and value, with code, source and basis (long form)
          beta/data/film-facets.json  the same as one document, with vocabularies and the language authority
          beta/data/languages.csv     the language authority with film counts
          the compact copy the map loads (filters and search), written to --js-out and folded into beta/atlas-data.js
          beta/languages.html, beta/themes.html   browse pages
"""
import csv, json, re, sys, glob, html, datetime, os, unicodedata, collections
PUB, BETA = sys.argv[1], sys.argv[2].rstrip('/')
# optional: --themes <json {families, films}> (theme tags as built from the atlas master), --js-out <path> (where the map's copy goes)
OPT = {sys.argv[i]: sys.argv[i + 1] for i in range(3, len(sys.argv) - 1, 2)}
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TODAY = datetime.date.today().isoformat()
BASE = 'https://jwilliamkennedy.github.io/abya-yala-film-atlas/beta'
esc = lambda s: html.escape(str(s or ''), quote=True)
def key(s):  # same as the map's: accents dropped, every other non-letter (’ ' - …) a space, so typing variants match
    return re.sub(r'[^a-z0-9]+', ' ', ''.join(c for c in unicodedata.normalize('NFD', str(s or '')) if not unicodedata.combining(c)).lower()).strip()

P = json.load(open(PUB, encoding='utf-8'))
if '--themes' in OPT:
    T = json.load(open(OPT['--themes'], encoding='utf-8'))
else:
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
        if f.get('languageLabels'):  # the atlas master: the language store since 8 Nov 2026
            raw, lsrc, basis = f['languageLabels'], f.get('languageSource', ''), (f.get('languageNote') if f.get('languageNote') and not re.search(r'\.csv|fill\b|atlas\.xlsx|in the atlas', f.get('languageNote')) else 'recorded with the film')
        elif fid in FILLED:
            raw, lsrc, part = FILLED[fid]; basis = 'checked against the source page'
        else:
            raw, lsrc, basis = f.get('languages'), f.get('source', ''), 'recorded with the film'
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

# Distinct works, counted the way the map's Films list groups them (2026-11-09): credits sharing a film ID are one work;
# copies of the same title from different filmmakers are one work when their years agree, or when one year is missing and
# the title is long enough to be distinctive; "Title / Translation" or "Title: subtitle" matches "Title" when the years agree.
# (beta/patches-catalog.js, sections artwork-presentation59.js and films-merge-20261107.js.) Facet entries above stay one per film ID.
def count_works(records):
    by_id, groups = {}, []
    for r in records:
        for f in r['films']:
            if f['id'] in by_id: continue
            g = {'t': key(f['title']), 'y': f.get('year') or None, 'main': key(re.split(r'\s+/\s+|:\s', str(f['title'] or ''))[0])}
            by_id[f['id']] = g; groups.append(g)
    kept, by_title, by_main = 0, {}, {}
    for g in groups:
        lst = by_title.setdefault(g['t'], [])
        match = next((o for o in lst if (g['y'] == o['y'] if g['y'] and o['y'] else len(g['t']) >= 10)), None)
        mk = g['main'] + '|' + str(g['y'] or '')
        if not match and g['y'] and len(mk) > 8: match = by_main.get(mk)
        if match:
            if not match['y'] and g['y']: match['y'] = g['y']
            continue
        lst.append(g)
        if g['y']: by_main[mk] = g
        kept += 1
    return kept
WORKS = count_works(P)

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
doc = {'title': 'Indigenous Cinema Atlas · film facets', 'generated': TODAY, 'license': 'See data.html', 'films_on_public_map': WORKS, 'film_entries': len(films),
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
open(OPT.get('--js-out', f'{BETA}/facets-data.js'), 'w', encoding='utf-8').write(
    f'/* Built by tools/facets/build.py on {TODAY} from the public records, the theme tagging and the language authority. Edit those, not this file. */\n'
    f'window.ATLAS_FACETS={json.dumps({"films": compact, "families": T["families"], "languages": auth, "titleIndex": {key(e["title"]) + "|" + str(e["year"] or ""): fid for fid, e in films.items()}}, ensure_ascii=False, separators=(",", ":"))};\n')

# ---- browse pages, built on the filmmaker directory's own page shell ----
shell = open(f'{BETA}/maker/index.html', encoding='utf-8').read()
head, _rest = shell.split('<main>', 1)
foot = '</main>' + _rest.split('</main>', 1)[1] if '</main>' in _rest else '</main></body></html>'
def page(path, title, desc, body, head_extra=''):
    h = re.sub(r'<title>.*?</title>', f'<title>{esc(title)} · Indigenous Cinema Atlas</title>', head, flags=re.S)
    h = re.sub(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{esc(desc)}"', h)
    h = h.replace('href="../', 'href="').replace('src="../', 'src="')
    h = h.replace('</head>', '<style>.facet-list{list-style:none;padding:0;margin:0}.facet-list>li{padding:14px 0;border-bottom:1px solid rgba(30,33,36,.14)}'
                  '.facet-list h2{font:400 22px/1.2 Georgia,serif;margin:0 0 4px}.facet-list .codes{font-size:13px;color:#5d6267}.facet-list ol{margin:8px 0 0;padding-left:18px;font-size:15px}'
                  '.facet-list ol li{margin:3px 0}.jump{display:flex;flex-wrap:wrap;gap:6px 14px;margin:14px 0 6px;font-size:14px}.fam{margin-top:30px}</style>' + head_extra + '</head>')
    open(f'{BETA}/{path}', 'w', encoding='utf-8').write(h + '<main>' + body + foot.replace('href="../', 'href="').replace('src="../', 'src="'))
def film_li(fid, e):
    makers = ', '.join(f'<a href="maker/{esc(m["id"])}.html#{esc(fid)}">{esc(m["name"])}</a>' for m in e['makers'])
    return f'<li><cite>{esc(e["title"])}</cite>{" (" + str(e["year"]) + ")" if e["year"] else ""} · {makers}</li>'
def facet_film(fid, e):
    """A film on the Themes and Languages pages: year column, then the title and the filmmakers."""
    makers = ', '.join(f'<a href="maker/{esc(m["id"])}.html#{esc(fid)}">{esc(m["name"])}</a>' for m in e['makers'])
    return f'<li><span class="yr">{e["year"] or "—"}</span><span class="ti"><cite>{esc(e["title"])}</cite><span class="by">{makers}</span></span></li>'
def decades(fl, lo):
    """Films per decade, from the page's first decade to this one, and how many have no year."""
    c = collections.Counter(e['year'] // 10 * 10 for _, e in fl if e['year'])
    return [c.get(d, 0) for d in range(lo, int(TODAY[:3]) * 10 + 1, 10)], sum(1 for _, e in fl if not e['year'])
def strip(counts):
    """A decade strip: one cell per decade, shaded against the entry's own busiest decade (the count is the number beside it)."""
    mx = max(counts) or 1
    return '<span class="strip" aria-hidden="true">' + ''.join(f'<i style="--a:{0.2 + 0.8 * c / mx:.2f}"></i>' if c else '<i></i>' for c in counts) + '</span>'
def strip_key(lo):
    return f'<p class="strip-key"><span class="strip" aria-hidden="true">{"".join("<i></i>" for _ in range(lo, int(TODAY[:3]) * 10 + 1, 10))}</span>Films by decade, {lo}s–{TODAY[:3]}0s</p>'
def histogram(counts, undated, lo):
    """One entry's films by decade: a column per decade (height against its busiest), its count and the decade.
    Shown from five dated films on; below that the list's year column says as much."""
    if sum(counts) < 5:
        return ''
    mx = max(counts) or 1
    cols = ''.join(f'<span class="col"><span class="v">{c or ""}</span><span class="b" style="--h:{round(100 * c / mx)}"></span><span class="d">{lo + 10 * i}</span></span>' for i, c in enumerate(counts))
    return f'<div class="decades" aria-hidden="true">{cols}</div>' + (f'<p class="undated">{undated} undated</p>' if undated else '')
def facet_row(anchor, name, fl, lo):
    """An index entry: name, count and decade strip."""
    return f'<li><a href="#{anchor}"><span class="nm">{esc(name)}</span><span class="n">{len(fl)}</span>{strip(decades(fl, lo)[0])}</a></li>'
FACET_HEAD = '<link rel="stylesheet" href="assets/facets-20261123.css">'
FACET_JS = '<script defer src="assets/facets-20261123.js"></script>'
by_lang = collections.defaultdict(list)
for fid, e in films.items():
    for x in e['languages']: by_lang[x['label']].append((fid, e))
A = {a['label']: a for a in AUTH}
order = sorted(by_lang, key=lambda l: (not (A.get(l, {}).get('indigenous') == 'yes'), l.lower()))
# Regions (UN M49: Mexico in Central America, Greenland in North America), north to south. A language's region is in the
# authority (from Glottolog's countries for it); a language not yet there is placed by its filmmakers' countries.
REGIONS = ['North America', 'Central America and the Caribbean', 'South America']
R3 = {**{c: REGIONS[0] for c in 'CAN USA GRL BMU SPM'.split()},
      **{c: REGIONS[1] for c in 'MEX GTM BLZ SLV HND NIC CRI PAN CUB DOM HTI PRI JAM BHS TTO BRB LCA VCT GRD ATG DMA KNA ABW CUW GLP MTQ CYM TCA VGB VIR AIA'.split()},
      **{c: REGIONS[2] for c in 'ARG BOL BRA CHL COL ECU GUY PER PRY SUR URY VEN GUF FLK'.split()}}
MAKER_COUNTRIES = {r['id']: r.get('countries') or [] for r in P}
def lang_region(l):
    if A.get(l, {}).get('region'):
        return A[l]['region']
    votes = collections.Counter(R3[c] for _, e in by_lang[l] for m in e['makers'] for c in MAKER_COUNTRIES.get(m['id'], []) if c in R3)
    return votes.most_common(1)[0][0] if votes else 'Region not recorded'
LANG_LO = min((e['year'] // 10 * 10 for l in order for _, e in by_lang[l] if e['year']), default=int(TODAY[:3]) * 10)
items = []
for l in order:
    a = A.get(l, {}); codes = []
    if a.get('glottocode'): codes.append(f'<a href="https://glottolog.org/resource/languoid/id/{esc(a["glottocode"])}" rel="noopener">Glottolog {esc(a["glottocode"])}</a>' + (' (language group)' if a.get('glottolog_level') == 'family' else ''))
    if a.get('iso639_3'): codes.append(f'<a href="https://iso639-3.sil.org/code/{esc(a["iso639_3"])}" rel="noopener" title="International language code (ISO 639-3)">ISO code {esc(a["iso639_3"])}</a>')
    if a.get('match') == 'unresolved': codes.append(esc(a.get('note', 'variety not stated in the credit')))
    fl = sorted(by_lang[l], key=lambda x: (x[1]['year'] or 9999, x[1]['title'].lower()))
    items.append((l, f'<li id="{esc(key(l).replace(" ", "-"))}"><h2>{esc(l)}</h2><p class="codes">{len(fl)} film{"s" if len(fl) != 1 else ""} · {" · ".join(codes)}</p>{histogram(*decades(fl, LANG_LO), LANG_LO)}<ol class="films">{"".join(facet_film(fid, e) for fid, e in fl)}</ol></li>'))
n_lang_films = sum(1 for e in films.values() if e['languages'])
ind = [l for l in order if A.get(l, {}).get('indigenous') == 'yes']
page('languages.html', 'Languages', f'Films on the Indigenous Cinema Atlas by the languages spoken in them, with Glottolog and ISO 639-3 codes.',
     f'<h1>Languages</h1>'
     f'<p class="who">{len(ind)} Indigenous languages across {n_lang_films} films with a recorded language, of {WORKS:,} films on the public map. Each language links to its Glottolog entry; where a credit names a language group rather than one variety, the group is linked. Languages are recorded only as a film’s credits or synopsis state them. Updated {TODAY}.</p>'
     # the index: Indigenous languages by region, then the other languages in the films; each with its count and decade strip
     + f'<div class="facet-index" data-choose="Choose a language" data-all="All languages" data-prev="Previous language" data-next="Next language">'
     + strip_key(LANG_LO)
     + ''.join(f'<section><h2>{esc(g)}</h2><ul>' + ''.join(facet_row(esc(key(l).replace(" ", "-")), l, by_lang[l], LANG_LO) for l in ind if lang_region(l) == g) + '</ul></section>'
               for g in REGIONS + ['Region not recorded'] if any(lang_region(l) == g for l in ind))
     + '<section class="other"><h2>Other languages</h2><ul>' + ''.join(facet_row(esc(key(l).replace(" ", "-")), l, by_lang[l], LANG_LO) for l in order if l not in ind) + '</ul></section></div>'
     # the lists, in the index's order: each region of Indigenous languages, then the other languages
     + ''.join(f'<section class="fam"><h2>{esc(g)}</h2><ul class="facet-list">{"".join(h for l, h in items if l in ind and lang_region(l) == g)}</ul></section>'
               for g in REGIONS + ['Region not recorded'] if any(lang_region(l) == g for l in ind))
     + f'<section class="fam"><h2>Other languages</h2><ul class="facet-list">{"".join(h for l, h in items if l not in ind)}</ul></section><p class="who"><a href="data/languages.csv">Language authority (CSV)</a> · <a href="data/film-facets.csv">All film facets (CSV)</a> · <a href="data.html">About the data</a></p>' + FACET_JS,
     head_extra=FACET_HEAD)
by_theme = collections.defaultdict(list)
for fid, e in films.items():
    for t in e['themes']: by_theme[t].append((fid, e))
THEME_LO = min((e['year'] // 10 * 10 for v in by_theme.values() for _, e in v if e['year']), default=int(TODAY[:3]) * 10)
secs = []
for fam, tags in T['families'].items():
    lis = []
    for t in tags:
        fl = sorted(by_theme.get(t, []), key=lambda x: (x[1]['year'] or 9999, x[1]['title'].lower()))
        if not fl: continue
        lis.append(f'<li id="{esc(key(t).replace(" ", "-"))}"><h2>{esc(t)}</h2><p class="codes">{len(fl)} film{"s" if len(fl) != 1 else ""}</p>{histogram(*decades(fl, THEME_LO), THEME_LO)}<ol class="films">{"".join(facet_film(fid, e) for fid, e in fl)}</ol></li>')
    secs.append(f'<section class="fam"><h2 style="font:400 28px/1.2 Georgia,serif">{esc(fam)}</h2><ul class="facet-list">{"".join(lis)}</ul></section>')
n_th = sum(1 for e in films.values() if e['themes'])
page('themes.html', 'Themes', 'Films on the Indigenous Cinema Atlas by theme: 30 themes in five families, each tagged from a published synopsis.',
     f'<h1>Themes</h1>'
     f'<p class="who">There are {n_th} of {WORKS:,} films tagged with a theme or themes so far, each from a published synopsis, with its source and link. While a film can carry several themes, its primary theme is listed first in the data. Updated {TODAY}.</p>'
     # the index: the five families, each theme with its count and decade strip (facets-20261123.js turns it into one theme at a time)
     + '<div class="facet-index" data-choose="Choose a theme" data-all="All themes" data-prev="Previous theme" data-next="Next theme">' + strip_key(THEME_LO) + ''.join(
         f'<section><h2>{esc(fam)}</h2><ul>' + ''.join(facet_row(esc(key(t).replace(" ", "-")), t, by_theme[t], THEME_LO) for t in tags if by_theme.get(t)) + '</ul></section>'
         for fam, tags in T['families'].items()) + '</div>'
     + ''.join(secs) + '<p class="who"><a href="data/film-facets.csv">All film facets (CSV)</a> · <a href="data.html">About the data</a></p>'
     + FACET_JS,
     head_extra=FACET_HEAD)
print(f'films {WORKS} (facet entries {len(films)}) | with language {n_lang_films} | Indigenous languages {len(ind)} | with themes {n_th} | facet rows {len(rows)} | languages not in authority: {[l for l in lang_count if l not in A]}')
