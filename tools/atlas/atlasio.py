"""Read and write the atlas, kept as plain CSV in the private research repository (its atlas/ folder).

The tools (check, merge, build, verify_queue) work on three sheets, Published, Queue and Lists, with their column names
on row 2, as they always have. load() builds those sheets in memory from the CSV files; save() writes them back. Give the
tools the atlas folder (e.g. atlas/); a path ending in .xlsx still opens a workbook, for old copies.

  <atlas>/master/filmmakers-a-l.csv, filmmakers-m-z.csv   one row per filmmaker (the filmmaker columns), by name
  <atlas>/master/films-a-l.csv, films-m-z.csv             one row per credit: row (its order), filmmaker_id, film columns
  <atlas>/master/machine.csv                              filmmaker_id, film_id, maker_json, film_json (do not edit)
  <atlas>/master/lists.csv                                the Lists sheet, cell for cell
  <atlas>/master/PUBLISHED.sha256                         fingerprint of Published, written by the merge
  <atlas>/queue/proposals.csv, leads-a-l.csv, leads-m-z.csv, history.csv, machine.csv (qid, maker_json, film_json)

Each file people open stays under GitHub's 1 MB file-view limit; that is why the master is split in halves by name."""
import csv, os, re, sys, unicodedata
from openpyxl import Workbook, load_workbook
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from schema import PUBLISHED_COLS, QUEUE_COLS, MAKER  # noqa: E402

MACH = ['maker_json', 'film_json']
MAKER_COLS = [c[0] for c in MAKER]
FILM_COLS = [c for c in PUBLISHED_COLS if c not in MAKER_COLS and c not in MACH]
QCOLS = ['qid'] + [c for c in QUEUE_COLS if c not in MACH]
OPEN = ('new', 'needs more', 'accepted')
QFILES = ['proposals.csv', 'leads-a-l.csv', 'leads-m-z.csv', 'history.csv']
NUM = {'year', 'runtime_min'}
csv.field_size_limit(10 ** 8)

def is_folder(path):
    return os.path.isdir(os.path.join(path, 'master'))

def fp_path(path):
    """Where the Published fingerprint lives for this atlas."""
    return os.path.join(path, 'master', 'PUBLISHED.sha256') if is_folder(path) else \
        os.path.join(os.path.dirname(os.path.abspath(path)), 'PUBLISHED.sha256')

def fold(s):
    return unicodedata.normalize('NFKD', str(s or '')).encode('ascii', 'ignore').decode().lower()

def half(name):
    first = (re.sub(r'[^a-z]', '', fold(name)) or 'a')[0]
    return 'a-l' if first <= 'l' else 'm-z'

def qnum(q):
    m = re.fullmatch(r'Q(\d+)', q or '')
    return int(m.group(1)) if m else None

def raw(v):                       # master cells: exactly as stored
    return '' if v is None else str(v)

def text(v):                      # Queue cells: whole floats written as integers
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v)

def number(c, v):
    if c in NUM and re.fullmatch(r'-?\d+', v):
        return int(v)
    if c in NUM and re.fullmatch(r'-?\d+\.\d+', v):
        return float(v)
    return v

def read(path):
    with open(path, encoding='utf-8-sig', newline='') as fh:
        return list(csv.DictReader(fh))

def write(path, cols, rows):
    with open(path, 'w', newline='', encoding='utf-8') as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction='ignore', lineterminator='\n')
        w.writeheader(); w.writerows(rows)

# ------------------------------------------------------------------------------------------------ CSV -> sheets
def master_rows(path):
    d = os.path.join(path, 'master')
    makers, films = {}, []
    for h in ('a-l', 'm-z'):
        for m in read(f'{d}/filmmakers-{h}.csv'):
            bad = [k for k in m if k not in MAKER_COLS]
            if bad:
                sys.exit(f'master/filmmakers-{h}.csv: unknown columns {bad}')
            if m['filmmaker_id'] in makers:
                sys.exit(f'master: filmmaker {m["filmmaker_id"]} is listed twice')
            makers[m['filmmaker_id']] = m
        films += read(f'{d}/films-{h}.csv')
    mach = {(m['filmmaker_id'], m['film_id']): m for m in read(f'{d}/machine.csv')}
    missing = sorted({f['filmmaker_id'] for f in films} - set(makers))
    unused = sorted(set(makers) - {f['filmmaker_id'] for f in films})
    if missing or unused:
        sys.exit(f'master: films without a filmmaker row {missing[:10]}; filmmakers without a film {unused[:10]}')
    try:
        films.sort(key=lambda f: int(f['row']))
    except ValueError:
        sys.exit('master: every row of films-*.csv needs a whole number in "row"')
    rows, seen = [], set()
    for f in films:
        k = (f['filmmaker_id'], f['film_id'])
        if k in seen:
            sys.exit(f'master: {k} appears twice in films-*.csv')
        seen.add(k)
        r = dict(makers[f['filmmaker_id']]); r.update({c: v for c, v in f.items() if c != 'row'})
        r.update({c: mach.get(k, {}).get(c, '') for c in MACH})
        rows.append(r)
    with open(f'{d}/lists.csv', encoding='utf-8', newline='') as fh:
        lists = list(csv.reader(fh))
    return rows, lists

def queue_rows(path, makers):
    d = os.path.join(path, 'queue')
    rows = []
    for f in QFILES:
        for r in read(f'{d}/{f}'):
            bad = [k for k in r if k and k not in QCOLS]
            if bad:
                sys.exit(f'queue/{f}: unknown columns {bad}')
            r = {k: (v or '').strip() for k, v in r.items() if k}
            if any(r.get(c) for c in QCOLS if c != 'qid'):
                rows.append(r)
    mach = {m['qid']: m for m in read(f'{d}/machine.csv')}
    seen, nxt = set(), max([qnum(r.get('qid')) or 0 for r in rows] + [0]) + 1
    for r in rows:                               # blank or repeated ids get the next number
        if not qnum(r.get('qid')) or r['qid'] in seen:
            r['qid'] = f'Q{nxt:06d}'; nxt += 1
        seen.add(r['qid'])
    rows.sort(key=lambda r: qnum(r['qid']))
    for r in rows:
        # add film rows may leave the filmmaker columns blank: they are copied from Published
        if r.get('queue_action') == 'add film' and r.get('queue_target') in makers and not r.get('name'):
            r.update(makers[r['queue_target']])
        r.update({c: mach.get(r['qid'], {}).get(c, '') for c in MACH})
    return rows

def sheet(wb, title, cols, rows, conv):
    ws = wb.create_sheet(title)
    ws.append([None] * len(cols))                # row 1: group labels in the workbook; unused by the tools
    ws.append(cols)
    for r in rows:
        ws.append([None if r.get(c, '') == '' else conv(c, r[c]) for c in cols])
    return ws

def load(path):
    """The atlas as an openpyxl workbook with sheets Published, Queue and Lists."""
    if not is_folder(path):
        return load_workbook(path, data_only=True)
    pub, lists = master_rows(path)
    makers = {}
    for r in pub:
        makers.setdefault(r['filmmaker_id'], {c: r.get(c, '') for c in MAKER_COLS})
    queue = queue_rows(path, makers)
    wb = Workbook(); wb.remove(wb.active)
    sheet(wb, 'Published', PUBLISHED_COLS, pub, number)
    sheet(wb, 'Queue', QUEUE_COLS + ['qid'], queue,
          lambda c, v: int(v) if c in NUM and re.fullmatch(r'-?\d+', v) else v)
    wl = wb.create_sheet('Lists')
    for row in lists:
        wl.append([v or None for v in row])
    return wb

# ------------------------------------------------------------------------------------------------ sheets -> CSV
def sheet_dicts(ws, conv):
    rows = ws.iter_rows(min_row=2, values_only=True)
    head = list(next(rows))
    out = []
    for r in rows:
        d = {h: conv(r[i]) if i < len(r) else '' for i, h in enumerate(head) if h}
        if any(d.values()):
            out.append(d)
    return out

def save(wb, path):
    """Write Published, Queue and Lists back to the CSV files (or save the workbook, for an .xlsx path)."""
    if not is_folder(path):
        wb.save(path); return
    d, q = os.path.join(path, 'master'), os.path.join(path, 'queue')
    pub = sheet_dicts(wb['Published'], raw)
    makers, bad = {}, set()
    for r in pub:
        m = {c: r.get(c, '') for c in MAKER_COLS}
        if makers.setdefault(m['filmmaker_id'], m) != m:
            bad.add(m['filmmaker_id'])
    if bad:
        sys.exit(f'save: filmmaker columns differ between rows of {sorted(bad)}; nothing written')
    queue = sheet_dicts(wb['Queue'], text)
    nxt = max([qnum(r.get('qid')) or 0 for r in queue] + [0]) + 1
    for r in queue:
        if not qnum(r.get('qid')):
            r['qid'] = f'Q{nxt:06d}'; nxt += 1
    # "row" keeps Published's order. Rows keep the number they had (gaps are fine), so a change touches only its own
    # lines; a new row, or one whose number no longer fits, takes the next number after the row before it.
    old = {}
    for h in ('a-l', 'm-z'):
        p = f'{d}/films-{h}.csv'
        if os.path.exists(p):
            for f in read(p):
                if re.fullmatch(r'\d+', f.get('row', '')):
                    old[(f['filmmaker_id'], f['film_id'])] = int(f['row'])
    prev = 0
    for r in pub:
        n = old.get((r['filmmaker_id'], r['film_id']), 0)
        r['row'] = prev = n if n > prev else prev + 1
    for h in ('a-l', 'm-z'):
        write(f'{d}/filmmakers-{h}.csv', MAKER_COLS, [m for m in makers.values() if half(m['name']) == h])
        write(f'{d}/films-{h}.csv', ['row', 'filmmaker_id'] + FILM_COLS,
              [r for r in pub if half(makers[r['filmmaker_id']]['name']) == h])
    write(f'{d}/machine.csv', ['filmmaker_id', 'film_id'] + MACH, pub)
    with open(f'{d}/lists.csv', 'w', newline='', encoding='utf-8') as fh:
        w = csv.writer(fh, lineterminator='\n')
        for r in wb['Lists'].iter_rows(values_only=True):
            r = [raw(v) for v in r]
            while r and r[-1] == '':
                r.pop()
            w.writerow(r)
    groups = {f: [] for f in QFILES}
    for r in queue:
        if r.get('queue_status') not in OPEN:
            groups['history.csv'].append(r)
        elif r.get('queue_action') == 'lead':
            groups[f'leads-{half(r.get("name"))}.csv'].append(r)
        else:
            groups['proposals.csv'].append(r)
    for f, rs in groups.items():
        write(f'{q}/{f}', QCOLS, rs)
    write(f'{q}/machine.csv', ['qid'] + MACH, [r for r in queue if r.get('maker_json') or r.get('film_json')])
    return {'Published': len(pub), **{f: len(rs) for f, rs in groups.items()}}

if __name__ == '__main__':
    # python3 tools/atlas/atlasio.py <atlas folder> <out.xlsx> [template.xlsx]: write the atlas as one workbook
    # (into a copy of the template, keeping its formatting and drop-downs, when one is given)
    src, dst = sys.argv[1], sys.argv[2]
    tpl = sys.argv[3] if len(sys.argv) > 3 else None
    mem = load(src)
    if not tpl:
        mem.save(dst); print('wrote', dst); sys.exit()
    wb = load_workbook(tpl)
    for name in ('Published', 'Queue', 'Lists'):
        ws, ms = wb[name], mem[name]
        first = 1 if name == 'Lists' else 3
        rows = list(ms.iter_rows(min_row=first, values_only=True))
        for n, r in enumerate(rows, first):
            for i, v in enumerate(r, 1):
                ws.cell(n, i).value = v
        for n in range(first + len(rows), ws.max_row + 1):
            for i in range(1, ws.max_column + 1):
                ws.cell(n, i).value = None
    wb.save(dst)
    print('wrote', dst, {n: len(sheet_dicts(mem[n], raw)) for n in ('Published', 'Queue')})
