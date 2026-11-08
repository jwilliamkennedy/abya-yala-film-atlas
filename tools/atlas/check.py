"""Check atlas.xlsx. Used by build.py before anything is written, and by the research repo's workflow on every push.

usage: python3 tools/atlas/check.py <atlas.xlsx>
Errors stop the build; notes are printed for review. Rules:
  Published  filmmaker_id on every row; film_id unique; a filmmaker's columns agree on all of their rows;
             status is one of the map statuses; entity, form, length, themes, languages and country codes come from the
             Lists sheet; links start with http; new filmmakers have a source; new films have a title and a source.
  Queue      queue_action and queue_status from the lists; every add or correct row has an evidence link and a proposer;
             a correct or remove row names an existing ID in queue_target; nothing in Queue reuses a Published film_id
             unless it corrects or removes it."""
import re, sys, collections
sys.path.insert(0, __import__('os').path.dirname(__file__))
from schema import *

MAKER_COLS = [c[0] for c in MAKER]

def lists_of(wb):
    wl = wb['Lists']
    return {c[0].value: [x.value for x in c[1:] if x.value is not None] for c in wl.iter_cols()}

def v(x):
    if x is None:
        return ''
    if isinstance(x, float) and x.is_integer():
        x = int(x)
    return str(x).strip()

def check_rows(rows, L, sheet, statuses, errors, notes):
    langs, themes, countries = set(L.get('language', [])), set(L.get('theme', [])), set(L.get('country code', []))
    forms, lengths, entities = set(L.get('form', [])), set(L.get('length', [])), set(L.get('entity', []))
    by_maker = collections.defaultdict(list)
    for r in rows:
        where = f"{sheet} row {r['_row']}"
        if not v(r.get('filmmaker_id')):
            errors.append(f'{where}: filmmaker_id is empty')
            continue
        by_maker[v(r['filmmaker_id'])].append(r)
        if statuses and v(r.get('status')) not in statuses:
            errors.append(f"{where}: status \"{v(r.get('status'))}\" is not one of {statuses}")
        if v(r.get('entity')) and v(r.get('entity')) not in entities:
            errors.append(f"{where}: entity \"{v(r.get('entity'))}\" (use Person or Collective)")
        for c in split_list(r.get('country_codes')):
            if c not in countries:
                errors.append(f'{where}: country code "{c}" is not in the Lists sheet')
        for l in split_list(r.get('languages')):
            if l not in langs:
                errors.append(f'{where}: language "{l}" is not in the Lists sheet (add it to the language authority first)')
        for t in split_list(r.get('themes')):
            if t not in themes:
                errors.append(f'{where}: theme "{t}" is not one of the 30 themes')
        if v(r.get('form')) and v(r.get('form')) not in forms:
            errors.append(f"{where}: form \"{v(r.get('form'))}\" is not in the list")
        if v(r.get('length')) and v(r.get('length')) not in lengths:
            errors.append(f"{where}: length \"{v(r.get('length'))}\" is not in the list")
        for c in ('source_1_url', 'source_2_url', 'source_3_url', 'film_source', 'image_url', 'image_page', 'watch_1_url', 'watch_2_url', 'language_source', 'theme_source', 'evidence_url'):
            for u in ([x for x in v(r.get(c)).split('; ') if x] if c == 'language_source' else ([v(r.get(c))] if v(r.get(c)) else [])):
                if not re.match(r'(https?://|assets/)', u):
                    errors.append(f'{where}: {c} "{u[:60]}" is not a link')
        y = r.get('year')
        if v(y) and not re.fullmatch(r'\d{4}', v(y)):
            notes.append(f'{where}: year "{v(y)}" is not a four-digit year')
        new_film = v(r.get('film_id')) and not v(r.get('film_json')) and v(r.get('queue_action')) in ('', 'add filmmaker', 'add film')
        if new_film and not v(r.get('title')):
            errors.append(f'{where}: new film has no title')
        if new_film and not v(r.get('film_source')):
            errors.append(f'{where}: new film has no film_source (the page that credits the director)')
    for mid, rs in by_maker.items():
        for c in MAKER_COLS:
            vals = {v(r.get(c)) for r in rs}
            if len(vals) > 1:
                errors.append(f"{sheet}: filmmaker {mid} has different {c} on rows {', '.join(str(r['_row']) for r in rs)} — make them agree")
        mj = [r for r in rs if v(r.get('maker_json'))]
        if len(mj) > 1:
            errors.append(f"{sheet}: filmmaker {mid} has machine data on more than one row ({', '.join(str(r['_row']) for r in mj)})")
        if not mj and not v(rs[0].get('source_1_url')) and v(rs[0].get('queue_action')) not in ('correct', 'remove'):
            errors.append(f"{sheet} row {rs[0]['_row']}: new filmmaker {mid} has no source_1_url (the page that names their people)")
        elif not v(rs[0].get('source_1_url')):
            notes.append(f'{sheet}: {mid} has no source listed')
    return by_maker

def check_published(rows, wb):
    errors, notes = [], []
    L = lists_of(wb)
    check_rows(rows, L, 'Published', L.get('status (Published)', ON_MAP), errors, notes)
    # the same film_id on several filmmakers' rows is a co-directed film; twice for one filmmaker is a duplicate
    ids = collections.Counter((v(r.get('filmmaker_id')), v(r.get('film_id'))) for r in rows if v(r.get('film_id')))
    for (mid, fid), n in ids.items():
        if n > 1:
            errors.append(f'Published: film_id {fid} appears {n} times for filmmaker {mid}')
    return errors, notes

def check_queue(rows, wb, published_rows):
    errors, notes = [], []
    L = lists_of(wb)
    rows = [r for r in rows if v(r.get('queue_status')) not in ('merged', 'removed', 'rejected')]  # history rows are not re-checked
    for r in rows:
        r['_queue'] = True
    check_rows(rows, L, 'Queue', None, errors, notes)
    pub_makers = {v(r.get('filmmaker_id')) for r in published_rows}
    pub_films = {v(r.get('film_id')) for r in published_rows if v(r.get('film_id'))}
    for r in rows:
        where = f"Queue row {r['_row']}"
        a, s = v(r.get('queue_action')), v(r.get('queue_status'))
        if a not in QUEUE_ACTIONS:
            errors.append(f'{where}: queue_action "{a}" (use one of {QUEUE_ACTIONS})')
        if s not in QUEUE_STATUSES:
            errors.append(f'{where}: queue_status "{s}" (use one of {QUEUE_STATUSES})')
        if a in ('add filmmaker', 'add film', 'correct') and not v(r.get('evidence_url')):
            errors.append(f'{where}: {a} needs an evidence_url')
        if a != 'lead' and not v(r.get('proposed_by')):
            errors.append(f'{where}: proposed_by is empty')
        t = v(r.get('queue_target'))
        if a in ('correct', 'remove') and t not in pub_makers and t not in pub_films:
            errors.append(f'{where}: {a} needs queue_target = an existing filmmaker_id or film_id (got "{t}")')
        if a == 'add filmmaker' and v(r.get('filmmaker_id')) in pub_makers:
            errors.append(f'{where}: filmmaker_id {v(r.get("filmmaker_id"))} already exists in Published — use add film or correct')
        if a == 'add film' and v(r.get('filmmaker_id')) not in pub_makers:
            notes.append(f'{where}: add film for a filmmaker who is not published yet ({v(r.get("filmmaker_id"))})')
        if a in ('add filmmaker', 'add film') and v(r.get('film_id')) in pub_films and not v(r.get('co_directed_with')):
            errors.append(f'{where}: film_id {v(r.get("film_id"))} already exists in Published — use correct, or list the co-directors in co_directed_with')
    return errors, notes

if __name__ == '__main__':
    from openpyxl import load_workbook
    import build
    wb = load_workbook(sys.argv[1], data_only=True)
    pub = build.read_sheet(wb['Published'], PUBLISHED_COLS)
    q = build.read_sheet(wb['Queue'], QUEUE_COLS)
    e1, n1 = check_published(pub, wb)
    import os, merge
    fp_file = os.path.join(os.path.dirname(os.path.abspath(sys.argv[1])), 'PUBLISHED.sha256')
    if os.path.exists(fp_file):
        fp = merge.fingerprint(load_workbook(sys.argv[1], read_only=True)['Published'])
        if fp != open(fp_file).read().strip():
            e1.append('Published was changed outside the merge step. Proposals go in the Queue; only tools/atlas/merge.py changes Published.')
    e2, n2 = check_queue(q, wb, pub)
    for e in e1 + e2:
        print('ERROR', e)
    print(f'{len(pub)} Published rows, {len(q)} Queue rows | {len(e1) + len(e2)} errors | {len(n1) + len(n2)} notes')
    for n in (n1 + n2)[:40]:
        print('note', n)
    sys.exit(1 if e1 or e2 else 0)
