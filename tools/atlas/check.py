"""Check the atlas (master + Queue CSV files). Used by build.py before anything is written, and by the research repo's Queue check on every commit.

usage: python3 tools/atlas/check.py <atlas folder>
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
            directors = r.get('_target_directors') or []
            if sheet == 'Queue' and len(directors) > 1:
                errors.append(
                    f"{where}: filmmaker_id is empty for co-directed film "
                    f"{v(r.get('queue_target'))}; make a correct row for each "
                    f"director ({', '.join(directors)})"
                )
            else:
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
        for c, lst in (('credit', 'credit role'), ('affiliation_basis', 'affiliation basis'), ('country_basis', 'country basis'), ('review_status', 'review status')):
            cats = L.get(lst)
            val = v(r.get(c))
            if cats and val and val.split(' — ')[0] not in cats:
                errors.append(f'{where}: {c} "{val[:50]}" must start with one of the {lst} values on the Lists sheet (then optionally " — " and detail)')
        y = r.get('year')
        if v(y) and not re.fullmatch(r'\d{4}', v(y)):
            notes.append(f'{where}: year "{v(y)}" is not a four-digit year')
        new_film = v(r.get('film_id')) and not v(r.get('film_json')) and v(r.get('queue_action')) in ('', 'add filmmaker', 'add film')
        if new_film and not v(r.get('title')):
            errors.append(f'{where}: new film has no title')
        if new_film and not v(r.get('film_source')):
            errors.append(f'{where}: new film has no film_source (the page that credits the director)')
    for mid, rs in by_maker.items():
        # A Queue correct/remove row is a PATCH, not a second filmmaker
        # biography. In particular, a sparse film correction has only its
        # filmmaker_id set, and its blank maker fields mean "leave unchanged".
        # Compare actual filmmaker records strictly, including blank values.
        full = [r for r in rs if sheet != 'Queue'
                or v(r.get('queue_action')) not in ('correct', 'remove')]
        for c in MAKER_COLS:
            vals = {v(r.get(c)) for r in full}
            if len(vals) > 1:
                errors.append(
                    f"{sheet}: filmmaker {mid} has different {c} on rows "
                    f"{', '.join(str(r['_row']) for r in full)} — make them agree"
                )

        # Multiple corrections to the filmmaker itself may touch different
        # fields. Empty cells are not modifications, but two *nonempty*
        # proposed values for the same field must not contradict one another.
        patches = [r for r in rs if sheet == 'Queue'
                   and v(r.get('queue_action')) == 'correct'
                   and v(r.get('queue_target')) == mid]
        for c in MAKER_COLS:
            values = {v(r.get(c)) for r in patches if v(r.get(c))}
            if len(values) > 1:
                errors.append(
                    f"{sheet}: filmmaker {mid} has conflicting corrections "
                    f"to {c} on rows {', '.join(str(r['_row']) for r in patches)}"
                )
        mj = [r for r in rs if v(r.get('maker_json'))]
        if len(mj) > 1:
            errors.append(f"{sheet}: filmmaker {mid} has machine data on more than one row ({', '.join(str(r['_row']) for r in mj)})")

        if full:
            # A lead may lack an affiliation source; a proposed new
            # filmmaker may not. Film corrections do not introduce a maker.
            newcomers = [r for r in full if v(r.get('queue_action')) == 'add filmmaker']
            missing = next((r for r in newcomers if not v(r.get('source_1_url'))), None)
            if sheet == 'Queue' and missing and not v(missing.get('maker_json')):
                errors.append(
                    f"{sheet} row {missing['_row']}: new filmmaker {mid} "
                    f"has no source_1_url (the page that names their people)"
                )
            elif not v(full[0].get('source_1_url')):
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
    pub_makers = {v(r.get('filmmaker_id')) for r in published_rows}
    pub_films = {v(r.get('film_id')) for r in published_rows if v(r.get('film_id'))}
    film_directors = collections.defaultdict(set)
    for p in published_rows:
        if v(p.get('film_id')) and v(p.get('filmmaker_id')):
            film_directors[v(p['film_id'])].add(v(p['filmmaker_id']))

    valid_rows = []
    for r in rows:
        where = f"Queue row {r['_row']}"
        a, s = v(r.get('queue_action')), v(r.get('queue_status'))
        # Malformed CSV continuations can land in action/status columns.
        # Flag the root error once; inspecting their shifted fields as if
        # they were real data produces dozens of false diagnoses.
        if a not in QUEUE_ACTIONS or s not in QUEUE_STATUSES:
            errors.append(
                f'{where}: malformed Queue action/status ({a!r}, {s!r}); '
                'inspect CSV quoting and column alignment'
            )
            continue
        r['_queue'] = True
        r['_target_directors'] = sorted(film_directors.get(v(r.get('queue_target')), ()))
        valid_rows.append(r)

    check_rows(valid_rows, L, 'Queue', None, errors, notes)
    for r in valid_rows:
        where = f"Queue row {r['_row']}"
        a, s = v(r.get('queue_action')), v(r.get('queue_status'))
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
    import build, atlasio
    wb = atlasio.load(sys.argv[1])
    pub = build.read_sheet(wb['Published'], PUBLISHED_COLS)
    q = build.read_sheet(wb['Queue'], QUEUE_COLS)
    e1, n1 = check_published(pub, wb)
    import os, merge
    fp_file = atlasio.fp_path(sys.argv[1])
    if os.path.exists(fp_file):
        fp = merge.fingerprint(wb['Published'])
        if fp != open(fp_file).read().strip():
            e1.append('Published was changed outside the merge step. Proposals go in the Queue; only tools/atlas/merge.py changes Published.')
    e2, n2 = check_queue(q, wb, pub)
    for e in e1 + e2:
        print('ERROR', e)
    print(f'{len(pub)} Published rows, {len(q)} Queue rows | {len(e1) + len(e2)} errors | {len(n1) + len(n2)} notes')
    for n in (n1 + n2)[:40]:
        print('note', n)
    sys.exit(1 if e1 or (e2 and '--published-only' not in sys.argv) else 0)
