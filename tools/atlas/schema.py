"""atlas.xlsx: the columns, how each cell is written from a record, and how it is read back.

Design (agreed 8 Nov 2026): one row per film credit; a filmmaker's columns repeat on each of their rows and must
agree (filmmaker_id is the key). A filmmaker with no films has one row with the film columns blank.
Sheets: Published (what the beta shows), Queue (proposals: ChatGPT writes only here), Lists (hidden: vocabularies).

Exact round trip: the hidden machine columns keep the original record / film as JSON. When a cell still shows
what the original renders to, the original value is kept unchanged; when a cell was edited (or the row is new),
the cell is parsed. So nothing is lost and every visible cell is editable."""
import json, re

SEP = '; '        # lists inside a cell
FSEP = ' | '      # fields inside one source / question / watch entry

def _s(v):
    return '' if v is None else str(v)

def split_list(cell):
    return [x.strip() for x in re.split(r'\s*;\s*', _s(cell)) if x.strip()]

def num(cell):
    if cell in (None, ''):
        return None
    if isinstance(cell, (int, float)):
        return int(cell) if float(cell).is_integer() else cell
    t = str(cell).strip()
    if re.fullmatch(r'-?\d+', t):
        return int(t)
    if re.fullmatch(r'-?\d+\.\d+', t):
        return float(t)
    return t

# ---------------- filmmaker columns ----------------
def src_detail(s):
    return FSEP.join([_s(s.get('type')), _s(s.get('authority')), _s(s.get('checkedOn'))]).rstrip(' |')

def parse_src(url, quote, detail):
    parts = [p.strip() for p in _s(detail).split('|')] + ['', '', '']
    out = {'url': _s(url).strip(), 'type': parts[0], 'evidence': _s(quote).strip(), 'authority': parts[1]}
    if parts[2]:
        out['checkedOn'] = parts[2]
    return out

def more_sources_cell(sources):
    return '\n'.join(FSEP.join([_s(s.get('url')), _s(s.get('evidence')), src_detail(s)]) for s in sources)

def parse_more_sources(cell):
    out = []
    for line in _s(cell).splitlines():
        if not line.strip():
            continue
        p = [x.strip() for x in line.split('|')]
        p += [''] * (5 - len(p))
        out.append(parse_src(p[0], p[1], ' | '.join(p[2:5])))
    return out

def issues_cell(issues):
    return '\n'.join(FSEP.join([_s(i.get('type')), _s(i.get('action'))] + ([_s(i['message'])] if i.get('message') else [])) for i in issues)

def parse_issues(cell):
    out = []
    for line in _s(cell).splitlines():
        if not line.strip():
            continue
        p = [x.strip() for x in line.split('|')]
        i = {'type': p[0], 'action': p[1] if len(p) > 1 else ''}
        if len(p) > 2 and p[2]:
            i['message'] = p[2]
        out.append(i)
    return out

# (column, header group, width, render(record)->cell, apply(record, cell)) — record-level fields
def _set(field, conv=lambda c: _s(c).strip()):
    def f(r, c):
        r[field] = conv(c)
    return f

def _set_codes(r, c):
    codes = split_list(c)
    r['countryCodes'] = codes
    r['country'] = codes[0] if codes else None

def _set_sources(r, cells):
    srcs = [parse_src(*cells[i:i + 3]) for i in (0, 3, 6) if _s(cells[i]).strip()]
    r['sources'] = srcs + parse_more_sources(cells[9])

MAKER = [
    ('filmmaker_id', 14, lambda r: r['id']),
    ('name', 26, lambda r: r.get('name')),
    ('aliases', 22, lambda r: SEP.join(a if isinstance(a, str) else a.get('name', '') for a in r.get('aliases') or [])),
    ('entity', 11, lambda r: r.get('entity')),
    ('nation', 24, lambda r: r.get('nation')),
    ('community', 28, lambda r: r.get('community')),
    ('affiliation_basis', 22, lambda r: r.get('affiliation')),
    ('country_codes', 10, lambda r: SEP.join(r.get('countryCodes') or [])),
    ('country_basis', 26, lambda r: r.get('countryBasis')),
    ('country_source', 26, lambda r: r.get('countrySource')),
    ('lands', 30, None),          # filled from the land links (reference tables)
    ('status', 24, lambda r: r.get('status')),
    ('review_status', 26, lambda r: r.get('auditStatus')),
    ('maker_evidence', 34, lambda r: r.get('evidence')),
    ('maker_notes', 30, lambda r: r.get('notes')),
    ('audit_note', 30, lambda r: r.get('auditNote')),
    ('open_questions', 34, lambda r: issues_cell(r.get('issues') or [])),
]
for n in (1, 2, 3):
    MAKER += [(f'source_{n}_url', 30, None), (f'source_{n}_quote', 34, None), (f'source_{n}_detail', 26, None)]
MAKER += [('more_sources', 30, None)]

MAKER_APPLY = {
    'name': _set('name'), 'aliases': lambda r, c: r.__setitem__('aliases', split_list(c)), 'entity': _set('entity'),
    'nation': _set('nation'), 'community': _set('community'), 'affiliation_basis': _set('affiliation'),
    'country_codes': _set_codes, 'country_basis': _set('countryBasis'), 'country_source': _set('countrySource'),
    'status': _set('status'), 'review_status': _set('auditStatus'), 'maker_evidence': _set('evidence'),
    'maker_notes': _set('notes'), 'audit_note': _set('auditNote'),
    'open_questions': lambda r, c: r.__setitem__('issues', parse_issues(c)),
}

def source_cells(r):
    s = r.get('sources') or []
    cells = []
    for i in range(3):
        cells += [s[i].get('url'), s[i].get('evidence'), src_detail(s[i])] if i < len(s) else ['', '', '']
    return cells + [more_sources_cell(s[3:])]

# ---------------- film columns ----------------
FILM = [
    ('film_id', 16), ('title', 30), ('year', 7), ('credit', 20), ('credit_note', 22), ('medium', 16), ('runtime_min', 9),
    ('co_directed_with', 18), ('film_source', 30), ('film_notes', 28), ('film_checked', 11),
    ('languages', 22), ('language_codes', 16), ('language_source', 28), ('language_note', 26),
    ('themes', 34), ('primary_theme', 22), ('form', 13), ('length', 9), ('theme_source', 28),
]
FILM_FIELD = {'title': 'title', 'year': 'year', 'credit': 'credit', 'credit_note': 'creditNote', 'medium': 'medium',
              'runtime_min': 'runtimeMinutes', 'film_source': 'sourceURL', 'film_notes': 'notes', 'film_checked': 'checkedOn',
              'primary_theme': 'primaryTheme', 'form': 'weaveForm', 'length': 'weaveLength', 'theme_source': 'themeSource'}
NUMERIC = {'year', 'runtime_min'}
# cells that show a readable word for a stored code (the records keep the code)
SHOW = {'length': {'S': 'Short', 'F': 'Feature'}}
def show(col, value):
    return SHOW.get(col, {}).get(value, value)
def store(col, cell):
    back = {v: k for k, v in SHOW.get(col, {}).items()}
    return back.get(cell, cell)

IMAGE = [('image_url', 30, 'image'), ('image_original', 30, 'originalImage'), ('image_page', 30, 'sourceURL'),
         ('image_credit', 22, 'publisher'), ('image_kind', 20, 'kind'), ('image_basis', 30, 'matchBasis'),
         ('image_rights', 20, 'rightsStatus'), ('image_checked', 11, 'checkedOn')]
WATCH = []
for n in (1, 2):
    WATCH += [(f'watch_{n}_label', 18), (f'watch_{n}_url', 30), (f'watch_{n}_note', 22)]
MACHINE = [('maker_json', 12), ('film_json', 12)]
QUEUE = [('queue_action', 14), ('queue_target', 16), ('queue_status', 12), ('proposed_by', 12), ('proposed_on', 11),
         ('evidence_url', 30), ('review_note', 30)]

GROUPS = [('Filmmaker', [c[0] for c in MAKER], '1F4E79'), ('Film', [c[0] for c in FILM], '375623'),
          ('Image', [c[0] for c in IMAGE], '833C0B'), ('Watch', [c[0] for c in WATCH], '7030A0'),
          ('Machine (do not edit)', [c[0] for c in MACHINE], '7F7F7F')]
PUBLISHED_COLS = [c for _, cols, _ in GROUPS for c in cols]
QUEUE_COLS = [c[0] for c in QUEUE] + PUBLISHED_COLS
WIDTH = {c[0]: c[1] for c in MAKER + [(a, b) for a, b in FILM] + [(a, b) for a, b, _ in IMAGE] + WATCH + MACHINE + QUEUE}

ON_MAP = ['Map Ready', 'Discovery · credit supported', 'Discovery · directing credit sourced']
LEAD_STATUSES = ['Discovery · review pending', 'Candidate', 'Verification Needed']
QUEUE_ACTIONS = ['add filmmaker', 'add film', 'correct', 'remove', 'lead']
QUEUE_STATUSES = ['new', 'needs more', 'accepted', 'rejected', 'merged', 'removed']  # merged / removed are set by merge.py
ENTITIES = ['Person', 'Collective']

def dumps(o):
    return json.dumps(o, ensure_ascii=False, separators=(',', ':'))  # key order kept as recorded
