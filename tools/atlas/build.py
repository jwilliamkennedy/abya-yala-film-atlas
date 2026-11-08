"""Build the beta's data from atlas.xlsx (Published sheet), after checking the workbook.

usage: python3 tools/atlas/build.py <atlas.xlsx> <reference state.json> [--check-only]
  1. Checks the workbook (tools/atlas/check.py rules): stops on any error, writes nothing.
  2. Rebuilds every record and film from the Published rows. Cells that still show the original keep the original value
     exactly; edited cells and new rows are read from the cells.
  3. Builds the film tags (languages, themes, form, length) with tools/facets/build.py, which also rewrites the Languages and
     Themes pages and the tag downloads in beta/data.
  4. Writes beta/atlas-data.js (everything of ours in one file) and beta/index-flat.html (tools/atlas/bake.py),
     and beta/data/atlas-published.csv (the Published sheet without the machine columns)."""
import csv, json, re, sys, copy, pathlib
from openpyxl import load_workbook
sys.path.insert(0, __import__('os').path.dirname(__file__))
from schema import *
from schema import _set_sources
import bake, check

def cellnorm(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v)

def _same_number(a, b):
    """Excel keeps 15 significant digits; treat a number as unchanged when it matches the original to that precision."""
    try:
        return a not in (None, '') and b is not None and abs(float(a) - float(b)) <= 1e-9 * max(1.0, abs(float(b)))
    except (TypeError, ValueError):
        return False

def read_sheet(ws, cols_expected):
    rows = ws.iter_rows(min_row=2, values_only=True)
    header = [h for h in next(rows)]
    idx = {h: i for i, h in enumerate(header) if h}
    missing = [c for c in cols_expected if c not in idx]
    if missing:
        raise SystemExit(f'{ws.title}: missing columns {missing}')
    out = []
    for n, row in enumerate(rows, 3):
        d = {c: row[idx[c]] if idx[c] < len(row) else None for c in idx}
        if any(v not in (None, '') for v in d.values()):
            d['_row'] = n
            out.append(d)
    return out

def film_tags(records, themes, families):
    """Film tags for the filters (languages, themes, form, length), plus the Languages / Themes pages and the CSV downloads:
    tools/facets/build.py run on these records, so there is one definition of how tags are made."""
    import subprocess, tempfile, os
    ON = set(ON_MAP)
    pub = [{'id': r['id'], 'name': r['name'], 'films': [{'id': f['id'], 'title': f['title'], 'year': f.get('year') or None, 'medium': f.get('medium') or '',
            'languages': f.get('languages') or '', 'languageLabels': f.get('languageLabels'), 'languageSource': f.get('languageSource', ''),
            'languageNote': f.get('languageNote', ''), 'source': f.get('sourceURL') or f.get('source') or ''} for f in r.get('films') or []]}
           for r in records if r.get('status') in ON]
    with tempfile.TemporaryDirectory() as d:
        json.dump(pub, open(f'{d}/pub.json', 'w', encoding='utf-8'), ensure_ascii=False)
        json.dump({'families': families, 'films': themes}, open(f'{d}/themes.json', 'w', encoding='utf-8'), ensure_ascii=False)
        here = os.path.dirname(os.path.abspath(__file__))
        out = subprocess.run([sys.executable, os.path.join(here, '..', 'facets', 'build.py'), f'{d}/pub.json', 'beta', '--themes', f'{d}/themes.json',
                              '--js-out', f'{d}/facets.js'], capture_output=True, text=True)
        if out.returncode:
            raise SystemExit('film tags failed:\n' + out.stderr[-2000:])
        print(' ', out.stdout.strip().splitlines()[-1])
        t = open(f'{d}/facets.js', encoding='utf-8').read()
        return json.loads(t[t.index('window.ATLAS_FACETS=') + len('window.ATLAS_FACETS='):].rstrip().rstrip(';'))

def build(path, state_path, check_only=False):
    wb = load_workbook(path, data_only=True)
    state = json.load(open(state_path, encoding='utf-8'))
    pub = read_sheet(wb['Published'], PUBLISHED_COLS)
    errors, warnings = check.check_published(pub, wb)
    if errors:
        print('WORKBOOK CHECK FAILED — nothing written:')
        for e in errors[:60]:
            print('  -', e)
        raise SystemExit(1)
    for w in warnings[:20]:
        print('  note:', w)
    if check_only:
        print('workbook check passed:', len(pub), 'Published rows')
        return
    fam = {}
    wl = wb['Lists']
    lists = {c[0].value: [x.value for x in c[1:] if x.value is not None] for c in wl.iter_cols()}
    fam = dict(zip(lists.get('theme', []), lists.get('theme family', [])))

    by_maker = {}
    for row in pub:
        by_maker.setdefault(row['filmmaker_id'], []).append(row)
    records, owned = [], {'ATLAS_PROFILE_MEDIA': {}, 'ATLAS_FILM_EXPLORATION': {}, 'ATLAS_THEMES_1103': {}}
    land_edits = {}
    stats = {'filmmakers': 0, 'films': 0, 'edited cells': 0, 'new filmmakers': 0, 'new films': 0}
    for mid, rows in by_maker.items():
        first = rows[0]
        mj = next((r['maker_json'] for r in rows if r.get('maker_json')), None)
        orig = json.loads(mj) if mj else None
        if orig is None:
            stats['new filmmakers'] += 1
            rec = {'id': mid, 'name': '', 'director': '', 'aliases': [], 'films': [], 'sources': [], 'issues': [], 'metadata': {},
                   'status': 'Map Ready', 'entity': 'Person', 'country': None, 'countryCodes': [], 'countryName': '', 'filmCount': '0'}
            base = {}
        else:
            rec = {k: copy.deepcopy(v) for k, v in orig.items() if not k.startswith('_')}
            base = rec
        # filmmaker columns
        for col, _, render in MAKER:
            if col in MAKER_APPLY:
                shown = cellnorm(render(base)) if orig else None
                if cellnorm(first.get(col)) != shown:
                    MAKER_APPLY[col](rec, first.get(col))
                    stats['edited cells'] += bool(orig)
        if orig is None or rec.get('name') != orig.get('name'):
            rec['director'] = rec['name']
        if orig is None or rec.get('countryCodes') != orig.get('countryCodes'):
            names = {c['code']: c['name'] for c in state['countries']}
            rec['countryName'] = names.get(rec['country'], '') if rec.get('country') else 'Unassigned'
        scols = [c[0] for c in MAKER if c[0].startswith('source_') or c[0] == 'more_sources']
        cells = [first.get(c) for c in scols]
        if not orig or [cellnorm(x) for x in cells] != [cellnorm(x) for x in source_cells(base)]:
            _set_sources(rec, cells)
            stats['edited cells'] += bool(orig)
        lands = re.findall(r'\[([^\]]+)\]', cellnorm(first.get('lands')))
        if lands != (orig or {}).get('_lands', []):
            land_edits[mid] = lands
        # films
        films = []
        for row in rows:
            if not row.get('film_id'):
                continue
            fj = json.loads(row['film_json']) if row.get('film_json') else None
            if fj is None:
                stats['new films'] += 1
                f = {'id': row['film_id'], 'title': '', 'year': None, 'credit': 'Director', 'medium': None, 'languages': None,
                     'notes': None, 'review': False}
                fb, pos = {}, 10 ** 6 + len(films)
            else:
                f = {k: copy.deepcopy(v) for k, v in fj.items() if not k.startswith('_')}
                fb, pos = f, fj['_pos']
            for col, field in FILM_FIELD.items():
                v = fb.get(field) if fj else None
                if col in NUMERIC and fj and _same_number(row.get(col), v):
                    continue
                if cellnorm(row.get(col)) != ('' if not fj or v is None else cellnorm(show(col, v))):
                    c = row.get(col)
                    f[field] = num(c) if col in NUMERIC else (None if c in (None, '') else store(col, str(c).strip()))
                    stats['edited cells'] += bool(fj)
            terms = SEP.join(x['term'] for x in fb.get('themes') or [] if isinstance(x, dict)) if fj else None
            if cellnorm(row.get('themes')) != (terms if fj else ''):
                f['themes'] = [{'term': t, 'source': 'curator', 'family': fam.get(t, '')} for t in split_list(row.get('themes'))]
                stats['edited cells'] += bool(fj)
            labels = split_list(row.get('languages'))
            if labels:
                f['languageLabels'] = labels
                f['languageSource'] = cellnorm(row.get('language_source'))
                f['languageNote'] = cellnorm(row.get('language_note'))
            # image
            img0 = (fj or {}).get('_image')
            shown = [cellnorm((img0 or {}).get(k)) for _, _, k in IMAGE]
            now = [cellnorm(row.get(c)) for c, _, _ in IMAGE]
            if now != shown:
                img = dict(img0 or {'title': f['title']})
                for (c, _, k), v in zip(IMAGE, now):
                    if v:
                        img[k] = v
                    else:
                        img.pop(k, None)
                img0 = img if img.get('image') else None
            if img0:
                owned['ATLAS_PROFILE_MEDIA'][f['id']] = img0
            # watch
            w0 = (fj or {}).get('_watch')
            links0 = (w0 or {}).get('links', [])
            shown = [cellnorm(x) for n in (1, 2) for x in ((links0[n - 1].get('title'), links0[n - 1].get('url'), links0[n - 1].get('context')) if len(links0) >= n else ('', '', ''))]
            now = [cellnorm(row.get(f'watch_{n}_{k}')) for n in (1, 2) for k in ('label', 'url', 'note')]
            if now != shown:
                links = [{'title': now[i] or 'Watch', 'url': now[i + 1], 'context': now[i + 2]} for i in (0, 3) if now[i + 1]]
                w0 = dict(w0 or {}, links=links) if links else None
            if w0:
                owned['ATLAS_FILM_EXPLORATION'][f['id']] = w0
            # theme tags used by Constellate
            th0 = (fj or {}).get('_th')
            th_now = [split_list(row.get('themes')), cellnorm(row.get('primary_theme')), cellnorm(row.get('form')),
                      cellnorm(store('length', cellnorm(row.get('length')))), cellnorm(row.get('theme_source'))]
            if th0 and th_now == [th0[0], cellnorm(th0[1]), cellnorm(th0[2]), cellnorm(th0[3]), cellnorm(th0[4])]:
                owned['ATLAS_THEMES_1103'][f['id']] = th0
            elif th_now[4] and th_now[0]:
                owned['ATLAS_THEMES_1103'][f['id']] = th_now
            films.append((pos, f))
        rec['films'] = [f for _, f in sorted(films, key=lambda x: x[0])]
        if orig is None or [f['id'] for f in rec['films']] != orig.get('_film_ids'):
            rec['filmCount'] = str(len(rec['films']))
        records.append(((orig or {}).get('_pos', 10 ** 6 + len(records)), rec))
        stats['filmmakers'] += 1
        stats['films'] += len(rec['films'])
    records = [r for _, r in sorted(records, key=lambda x: x[0])]
    # land links: replace a filmmaker's edges only where the lands cell was edited
    edges = None
    if land_edits:
        base_edges = state['globals']['ATLAS_LAND_CROSSINDEX']['edges']
        edges = []
        for e in base_edges:
            if e['record'] in land_edits and e['land'] not in land_edits[e['record']]:
                continue
            edges.append(e)
        have = {(e['record'], e['land']) for e in edges}
        for rid, lands in land_edits.items():
            for l in lands:
                if (rid, l) not in have:
                    edges.append({'record': rid, 'land': l, 'basis': 'atlas.xlsx', 'method': 'Land link entered in the Published sheet of atlas.xlsx.', 'status': 'provisional'})
    all_ids = [r['id'] for r in state['records']] + [f['id'] for r in state['records'] for f in r['films']]
    facets = film_tags(records, owned['ATLAS_THEMES_1103'], state['globals'].get('ATLAS_THEMES_1103', {}).get('families', {}))
    sizes = bake.write(records, state['countries'], state['meta'], owned, state['globals'], edges=edges, all_ids=all_ids, facets=facets)
    out = pathlib.Path('beta/data/atlas-published.csv')
    with open(out, 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh)
        cols = [c for c in PUBLISHED_COLS if c not in ('maker_json', 'film_json')]
        w.writerow(cols)
        for row in pub:
            w.writerow([cellnorm(row.get(c)) for c in cols])
    print(' | '.join(f'{k} {v}' for k, v in stats.items()), '| land-link edits', len(land_edits), '|', sizes)

if __name__ == '__main__':
    build(sys.argv[1], sys.argv[2], '--check-only' in sys.argv)
