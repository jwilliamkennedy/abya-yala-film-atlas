"""Accept the Queue rows whose sources check out, so they publish without a hand review.

usage: python3 tools/atlas/auto_accept.py <atlas folder> <verify.json>

Reads verify.json (written by verify_queue.py for every row with queue_status "new") and, in the Queue CSVs:
  add filmmaker -> accepted when the identity page shows the quote and the name, and the credit page shows the
                   title and the name, and no published filmmaker has the same name; otherwise "needs more"
  add film      -> accepted when the credit page shows the title and the filmmaker's name, and the filmmaker
                   does not already have a film with that title; otherwise "needs more"
  correct       -> accepted when the evidence page could be read and shows what the row adds; otherwise "needs more"
Each decision is written into review_note ("Auto-check <date>: ..."). Rows that are not "new" are not touched.
The identity rule is the atlas's: the quote must be the page's own words naming the person's people."""
import csv, glob, io, json, os, re, sys, unicodedata, datetime

def norm(t):
    t = unicodedata.normalize('NFD', str(t or '')).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', t).strip()

def ok(c, keys):
    return bool(c) and c.get('fetch') == 'ok' and all(c.get(k) for k in keys)

def why(c, keys, label):
    if not c:
        return f'no {label} page'
    if c.get('fetch') != 'ok':
        return f'the {label} page could not be read ({c.get("fetch")})'
    missing = [k.replace('_found', '') for k in keys if not c.get(k)]
    return f'the {label} page does not show the ' + ' or the '.join(missing)

def main(atlas, verify_path):
    today = datetime.date.today().isoformat()
    V = {x['qid']: x.get('checks', {}) for x in json.load(open(verify_path, encoding='utf-8'))}
    names, titles = set(), {}
    for f in glob.glob(os.path.join(atlas, 'master', 'filmmakers*.csv')):
        for r in csv.DictReader(open(f, encoding='utf-8')):
            names.add(norm(r['name']))
            for a in re.split(r'[;|]', r.get('aliases') or ''):
                if a.strip():
                    names.add(norm(a))
    for f in glob.glob(os.path.join(atlas, 'master', 'films*.csv')):
        for r in csv.DictReader(open(f, encoding='utf-8')):
            titles.setdefault(r['filmmaker_id'], set()).add(norm(r['title']))
    tally = {'accepted': 0, 'needs more': 0}
    for path in sorted(glob.glob(os.path.join(atlas, 'queue', 'proposals*.csv'))):
        raw = open(path, encoding='utf-8', newline='').read()
        rows = list(csv.DictReader(io.StringIO(raw)))
        if not rows:
            continue
        fields = list(rows[0].keys())
        nl = '\r\n' if '\r\n' in raw[:5000] else '\n'
        changed = False
        for r in rows:
            if r.get('queue_status') != 'new' or r['qid'] not in V:
                continue
            c, act, problems = V[r['qid']], r.get('queue_action'), []
            if act == 'add filmmaker':
                if not ok(c.get('identity'), ['quote_found', 'name_found']):
                    problems.append(why(c.get('identity'), ['quote_found', 'name_found'], 'identity'))
                if not ok(c.get('credit'), ['title_found', 'name_found']):
                    problems.append(why(c.get('credit'), ['title_found', 'name_found'], 'credit'))
                if norm(r.get('name')) in names:
                    problems.append('a published filmmaker already has this name: use add film with their filmmaker_id')
            elif act == 'add film':
                if not ok(c.get('credit'), ['title_found', 'name_found']):
                    problems.append(why(c.get('credit'), ['title_found', 'name_found'], 'credit'))
                if norm(r.get('title')) in titles.get(r.get('queue_target') or r.get('filmmaker_id'), set()):
                    problems.append('this filmmaker already has a film with this title')
            elif act == 'correct':
                e = c.get('evidence')
                if not e or e.get('fetch') != 'ok':
                    problems.append(why(e, [], 'evidence'))
                else:
                    missing = [k for k in ('languages', 'year', 'title') if e.get(k) is False]
                    if missing:
                        problems.append('the evidence page does not show the ' + ' or the '.join(missing))
            else:
                continue
            status = 'needs more' if problems else 'accepted'
            note = f'Auto-check {today}: ' + ('; '.join(problems) + '.' if problems else 'sources confirmed (identity quote and credit on the cited pages).')
            r['queue_status'] = status
            r['review_note'] = (note + ' ' + (r.get('review_note') or '')).strip()
            tally[status] += 1
            changed = True
        if changed:
            out = io.StringIO()
            w = csv.DictWriter(out, fieldnames=fields, lineterminator=nl)
            w.writeheader()
            w.writerows(rows)
            open(path, 'w', encoding='utf-8', newline='').write(out.getvalue())
    print(json.dumps(tally))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
