"""Move accepted Queue rows into Published (Claude runs this after checking each row against its source).

usage: python3 tools/atlas/merge.py <atlas.xlsx>
  queue_status "accepted" rows are applied, then marked "merged" (they stay in the Queue as the record of the change):
    add filmmaker / add film / lead   the row is appended to Published (a lead becomes published)
    correct   queue_target = a film_id: that film's row takes the Queue row's cells;
              queue_target = a filmmaker_id: the filmmaker columns of all their rows take the Queue row's values
    remove    the target rows leave Published and are copied back into the Queue (status "removed"): nothing is deleted
Machine columns of Published rows are kept, so unchanged values stay exact. Writes the Published fingerprint
(atlas/PUBLISHED.sha256) that the check uses to spot edits made outside this step."""
import sys, hashlib, json, datetime, copy
from openpyxl import load_workbook
sys.path.insert(0, __import__('os').path.dirname(__file__))
from schema import *

def fingerprint(ws):
    h = hashlib.sha256()
    for row in ws.iter_rows(min_row=2, values_only=True):
        h.update(json.dumps([None if v in ('', None) else str(v) for v in row], ensure_ascii=False).encode())
    return h.hexdigest()

def main(path):
    import build, check
    wbv = load_workbook(path, data_only=True)
    pub_rows = build.read_sheet(wbv['Published'], PUBLISHED_COLS)
    q_rows = build.read_sheet(wbv['Queue'], QUEUE_COLS)
    errs, _ = check.check_queue(q_rows, wbv, pub_rows)
    bad_rows = {int(n) for e in errs for grp in __import__('re').findall(r'rows? ([\d, ]+)', e) for n in __import__('re').findall(r'\d+', grp)}
    for e in errs:
        print('not merged:', e)
    wb = load_workbook(path)
    wp, wq = wb['Published'], wb['Queue']
    ph = [c.value for c in wp[2]]; qh = [c.value for c in wq[2]]
    P = {h: i + 1 for i, h in enumerate(ph) if h}; Q = {h: i + 1 for i, h in enumerate(qh) if h}
    maker_cols = [c[0] for c in MAKER]
    film_cols = [c for c in PUBLISHED_COLS if c not in maker_cols and c not in ('maker_json', 'film_json')]
    today = datetime.date.today().isoformat()
    def qv(r, c): return wq.cell(r, Q[c]).value
    def prow_values(r): return {c: wp.cell(r, i).value for c, i in P.items()}
    applied = {'added': 0, 'corrected': 0, 'removed': 0}
    removed_rows = []
    wp.protection.sheet = False
    for r in range(3, wq.max_row + 1):
        if str(qv(r, 'queue_status') or '').strip() != 'accepted' or r in bad_rows:
            continue
        a, t = str(qv(r, 'queue_action') or '').strip(), str(qv(r, 'queue_target') or '').strip()
        if a in ('add filmmaker', 'add film', 'lead'):
            n = wp.max_row + 1
            for c, i in P.items():
                if c in Q:
                    wp.cell(n, i, qv(r, c))
            if a == 'lead' and wp.cell(n, P['status']).value not in ON_MAP:
                wp.cell(n, P['status'], 'Discovery · credit supported')
            applied['added'] += 1
        elif a == 'correct':
            hit = False
            for pr in range(3, wp.max_row + 1):
                fid, mid = wp.cell(pr, P['film_id']).value, wp.cell(pr, P['filmmaker_id']).value
                if t == fid and str(mid) == str(qv(r, 'filmmaker_id') or mid):
                    for c in film_cols:
                        wp.cell(pr, P[c], qv(r, c))
                    hit = True
                if t == mid:
                    for c in maker_cols:
                        if c != 'filmmaker_id':
                            wp.cell(pr, P[c], qv(r, c))
                    hit = True
            if not hit:
                print(f'Queue row {r}: target {t} not found; left as accepted'); continue
            applied['corrected'] += 1
        elif a == 'remove':
            rows = [pr for pr in range(3, wp.max_row + 1) if t in (wp.cell(pr, P['filmmaker_id']).value, wp.cell(pr, P['film_id']).value)]
            for pr in rows:
                removed_rows.append(prow_values(pr))
            # a filmmaker's hidden record data sits on one of their rows: if that row leaves, hand it to a row that stays
            for pr in rows:
                mj = wp.cell(pr, P['maker_json']).value
                if mj:
                    mid = wp.cell(pr, P['filmmaker_id']).value
                    stay = [x for x in range(3, wp.max_row + 1) if x not in rows and wp.cell(x, P['filmmaker_id']).value == mid]
                    if stay:
                        wp.cell(stay[0], P['maker_json'], mj)
            for pr in sorted(rows, reverse=True):
                wp.delete_rows(pr)
            applied['removed'] += 1
        else:
            continue
        wq.cell(r, Q['queue_status'], 'merged')
        wq.cell(r, Q['review_note'], ((qv(r, 'review_note') or '') + f' Merged {today}.').strip())
    for vals in removed_rows:
        n = wq.max_row + 1
        for c, v in vals.items():
            if c in Q:
                wq.cell(n, Q[c], v)
        wq.cell(n, Q['queue_action'], 'remove'); wq.cell(n, Q['queue_status'], 'removed')
        wq.cell(n, Q['queue_target'], vals.get('film_id') or vals.get('filmmaker_id'))
        wq.cell(n, Q['proposed_on'], today); wq.cell(n, Q['review_note'], f'Removed from Published {today}; restore by setting queue_action "lead" or "add film" and status "accepted".')
    wp.protection.sheet = True
    wb.save(path)
    fp = fingerprint(load_workbook(path, read_only=True)['Published'])
    open(__import__('os').path.join(__import__('os').path.dirname(path), 'PUBLISHED.sha256'), 'w').write(fp + '\n')
    print(applied, '| Published fingerprint', fp[:12])

if __name__ == '__main__':
    main(sys.argv[1])
