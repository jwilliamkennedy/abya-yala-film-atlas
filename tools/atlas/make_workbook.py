"""Create atlas.xlsx from a captured beta state (one-time flattening; afterwards the workbook is the source).

usage: python3 tools/atlas/make_workbook.py <state.json> <out.xlsx>
Needs (from the site repo): beta/territories-data.js (land names), tools/facets/languages_authority.csv,
beta/data/film-facets.csv (language sources and notes)."""
import csv, json, re, sys, unicodedata, collections
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.protection import SheetProtection
sys.path.insert(0, __import__('os').path.dirname(__file__))
from schema import *

state = json.load(open(sys.argv[1], encoding='utf-8'))
g = state['globals']
PM, FE = g.get('ATLAS_PROFILE_MEDIA', {}), g.get('ATLAS_FILM_EXPLORATION', {})
TH = g.get('ATLAS_THEMES_1103', {}).get('films', {})
FAC = g.get('ATLAS_FACETS', {})
AUTH = {a['label']: a for a in csv.DictReader(open('tools/facets/languages_authority.csv', encoding='utf-8'))}

def fkey(t):
    return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', str(t or '')).encode('ascii', 'ignore').decode().lower()).strip()

# language sources/notes per facet film id
LROWS = collections.defaultdict(list)
for row in csv.DictReader(open('beta/data/film-facets.csv', encoding='utf-8')):
    if row['field'] == 'language':
        LROWS[row['film_id']].append(row)
def facet_id(f):
    films = FAC.get('films', {})
    if f['id'] in films:
        return f['id']
    return FAC.get('titleIndex', {}).get(fkey(f['title']) + '|' + str(f.get('year') or ''))

# land names
t = open('beta/territories-data.js', encoding='utf-8').read()
TERR = json.loads(t[t.index('=') + 1:].rstrip().rstrip(';'))
LAND_NAME = {}
for ft in TERR['features']:
    p = ft.get('properties', {})
    if p.get('sourceId') is not None:
        LAND_NAME.setdefault('LAND-' + str(p['sourceId']), p.get('name'))
for rec in g.get('ATLAS_NAMES_DATA', {}).get('records', []):
    LAND_NAME[rec['id']] = rec['name']
for k in ('ATLAS_RESEARCH_ADDITIONS', 'ATLAS_SOUTH_AMERICA_50', 'ATLAS_SOUTH_AMERICA_50_BATCH2'):
    for l in (g.get(k) or {}).get('lands', []) or []:
        LAND_NAME[l['id']] = l['name']
EDGES = collections.defaultdict(list)
for e in g.get('ATLAS_LAND_CROSSINDEX', {}).get('edges', []):
    if e['land'] not in EDGES[e['record']]:
        EDGES[e['record']].append(e['land'])
def lands_cell(rid):
    return SEP.join(f'{LAND_NAME.get(l, "?")} [{l}]' for l in EDGES.get(rid, []))

# co-directed: same title key + year across filmmakers
groups = collections.defaultdict(list)
for r in state['records']:
    for f in r['films']:
        groups[(fkey(f['title']), str(f.get('year') or ''))].append(r['id'])

def lang_note(bases):
    """One note per film: the basis once, then how the credits name each language (when it differs from the label)."""
    plain = list(dict.fromkeys(re.sub(r'; credited as ".*"$', '', b) for b in bases))
    credited = list(dict.fromkeys(m for b in bases for m in re.findall(r'credited as "(.+)"$', b)))
    return SEP.join(plain) + (('; credited as ' + ', '.join(f'"{c}"' for c in credited)) if credited else '')

def film_cells(r, f, pos):
    c = {}
    for col, field in FILM_FIELD.items():
        v = f.get(field)
        c[col] = '' if v is None else show(col, v)
    c['film_id'] = f['id']
    others = [x for x in groups[(fkey(f['title']), str(f.get('year') or ''))] if x != r['id']]
    c['co_directed_with'] = SEP.join(dict.fromkeys(others))
    fid = facet_id(f)
    labels = (FAC.get('films', {}).get(fid) or {}).get('l') or []
    rows = LROWS.get(fid, [])
    lang = {}
    if labels:
        lang = {'labels': labels,
                'source': SEP.join(dict.fromkeys(x['source_url'] for x in rows if x['source_url'])),
                'note': lang_note([x['basis'] for x in rows if x['basis']])}
    c['languages'] = SEP.join(labels)
    c['language_codes'] = SEP.join((AUTH.get(l) or {}).get('glottocode', '') or '—' for l in labels)
    c['language_source'] = lang.get('source', '')
    c['language_note'] = lang.get('note', '')
    c['themes'] = SEP.join(x['term'] for x in f.get('themes') or [] if isinstance(x, dict))
    m = PM.get(f['id']) or {}
    for col, _, key in IMAGE:
        c[col] = m.get(key, '') if m else ''
    links = (FE.get(f['id']) or {}).get('links', [])
    for n in (1, 2):
        l = links[n - 1] if len(links) >= n else {}
        c[f'watch_{n}_label'], c[f'watch_{n}_url'], c[f'watch_{n}_note'] = l.get('title', ''), l.get('url', ''), l.get('context', '')
    orig = dict(f)
    orig['_pos'] = pos
    if f['id'] in PM: orig['_image'] = PM[f['id']]
    if f['id'] in FE: orig['_watch'] = FE[f['id']]
    if f['id'] in TH: orig['_th'] = TH[f['id']]
    if lang: orig['_lang'] = lang
    c['film_json'] = dumps(orig)
    return c

def maker_cells(r, pos):
    c = {}
    for col, _, render in MAKER:
        if render:
            v = render(r)
            c[col] = '' if v is None else v
    for col, v in zip([x[0] for x in MAKER if x[0].startswith('source_') or x[0] == 'more_sources'], source_cells(r)):
        c[col] = '' if v is None else v
    c['lands'] = lands_cell(r['id'])
    return c

def rows_for(records):
    out = []
    order = {r['id']: i for i, r in enumerate(state['records'])}
    for r in sorted(records, key=lambda r: (fkey(r['name']), r['id'])):
        mc = maker_cells(r, order[r['id']])
        orig = {k: (None if k == 'films' else v) for k, v in r.items()}  # films come from the rows; the key keeps its place
        orig['_pos'] = order[r['id']]
        orig['_lands'] = EDGES.get(r['id'], [])
        orig['_film_ids'] = [f['id'] for f in r.get('films') or []]
        films = r.get('films') or []
        for i, f in enumerate(films or [None]):
            row = dict(mc)
            if f is not None:
                row.update(film_cells(r, f, i))
            row['maker_json'] = dumps(orig) if i == 0 else ''
            out.append(row)
    return out

pub = [r for r in state['records'] if r['status'] in ON_MAP]
leads = [r for r in state['records'] if r['status'] not in ON_MAP]

wb = Workbook()
HEAD = Font(bold=True, color='FFFFFF')
def sheet(ws, cols, rows, group_extra=None):
    groups = ([('Queue', [c[0] for c in QUEUE], 'C00000')] if group_extra else []) + GROUPS
    col_idx = {c: i + 1 for i, c in enumerate(cols)}
    for name, gcols, color in groups:
        idx = [col_idx[c] for c in gcols if c in col_idx]
        ws.cell(1, idx[0], name).font = HEAD
        for i in idx:
            ws.cell(1, i).fill = PatternFill('solid', fgColor=color)
            h = ws.cell(2, i, cols[i - 1])
            h.font = Font(bold=True, color=color)
            h.fill = PatternFill('solid', fgColor='F2F2F2')
        ws.merge_cells(start_row=1, start_column=idx[0], end_row=1, end_column=idx[-1])
    for r_i, row in enumerate(rows, 3):
        for c in cols:
            v = row.get(c, '')
            if v not in ('', None):
                ws.cell(r_i, col_idx[c], v)
    for c, i in col_idx.items():
        ws.column_dimensions[get_column_letter(i)].width = WIDTH.get(c, 14)
        if c in ('maker_json', 'film_json'):
            ws.column_dimensions[get_column_letter(i)].hidden = True
    ws.freeze_panes = ws.cell(3, col_idx['aliases'])
    ws.auto_filter.ref = f'A2:{get_column_letter(len(cols))}{len(rows) + 2}'
    return col_idx

ws = wb.active
ws.title = 'Published'
pub_rows = rows_for(pub)
ci = sheet(ws, PUBLISHED_COLS, pub_rows)
wq = wb.create_sheet('Queue')
lead_rows = rows_for(leads)
for row in lead_rows:
    row.update({'queue_action': 'lead', 'queue_target': row['filmmaker_id'], 'queue_status': 'new',
                'proposed_by': 'atlas before flattening', 'proposed_on': '2026-11-08'})
cq = sheet(wq, QUEUE_COLS, lead_rows, group_extra=True)

# Lists (hidden)
wl = wb.create_sheet('Lists')
forms = sorted({f.get('weaveForm') for r in state['records'] for f in r['films'] if f.get('weaveForm')})
lengths = sorted({show('length', f.get('weaveLength')) for r in state['records'] for f in r['films'] if f.get('weaveLength')})
fam = {}
for r in state['records']:
    for f in r['films']:
        for x in f.get('themes') or []:
            if isinstance(x, dict) and x.get('family'):
                fam[x['term']] = x['family']
for term, family in (FAC.get('families') or {}).items() if isinstance(FAC.get('families'), dict) else []:
    pass
fams = FAC.get('families') or {}
for family, terms in fams.items():
    for term in terms:
        fam.setdefault(term, family)
lists = {
    'status (Published)': ON_MAP, 'status (Queue leads)': LEAD_STATUSES, 'entity': ENTITIES,
    'queue_action': QUEUE_ACTIONS, 'queue_status': QUEUE_STATUSES, 'form': forms, 'length': lengths,
    'theme': sorted(fam), 'theme family': [fam[t] for t in sorted(fam)],
    'language': list(AUTH), 'glottocode': [AUTH[l]['glottocode'] for l in AUTH], 'iso639_3': [AUTH[l]['iso639_3'] for l in AUTH],
    'language indigenous': [AUTH[l]['indigenous'] for l in AUTH],
    'country code': [c['code'] for c in state['countries']], 'country name': [c['name'] for c in state['countries']],
}
LCOL = {}
for j, (name, vals) in enumerate(lists.items(), 1):
    wl.cell(1, j, name).font = Font(bold=True)
    for i, v in enumerate(vals, 2):
        wl.cell(i, j, v)
    LCOL[name] = f"Lists!${get_column_letter(j)}$2:${get_column_letter(j)}${max(2, len(vals) + 1)}"
    wl.column_dimensions[get_column_letter(j)].width = 22
wl.sheet_state = 'hidden'
wl.protection.sheet = True

def validate(ws, col_idx, col, ref, n):
    if col not in col_idx:
        return
    L = get_column_letter(col_idx[col])
    dv = DataValidation(type='list', formula1=ref, allow_blank=True, showErrorMessage=True, errorTitle='Not in the list',
                        error='Choose a value from the list (the lists are on the hidden Lists sheet).')
    dv.add(f'{L}3:{L}{n + 1000}')
    ws.add_data_validation(dv)
for w, idx, n, status_ref in ((ws, ci, len(pub_rows), LCOL['status (Published)']), (wq, cq, len(lead_rows), None)):
    if status_ref:
        validate(w, idx, 'status', status_ref, n)
    validate(w, idx, 'entity', LCOL['entity'], n)
    validate(w, idx, 'form', LCOL['form'], n)
    validate(w, idx, 'length', LCOL['length'], n)
    validate(w, idx, 'primary_theme', LCOL['theme'], n)
validate(wq, cq, 'queue_action', LCOL['queue_action'], len(lead_rows))
validate(wq, cq, 'queue_status', LCOL['queue_status'], len(lead_rows))

# Published is locked (no password): only the merge step changes it. Filtering and sorting still work.
ws.protection = SheetProtection(sheet=True, autoFilter=False, sort=False, formatColumns=False, formatRows=False)
wb.save(sys.argv[2])
print(f'Published: {len(pub)} filmmakers, {len(pub_rows)} rows | Queue: {len(leads)} leads, {len(lead_rows)} rows | '
      f'{len(PUBLISHED_COLS)} columns | lists: {", ".join(f"{k} {len(v)}" for k, v in lists.items() if not k.startswith(("glotto", "iso", "language ind", "country name", "theme fam")))}')
