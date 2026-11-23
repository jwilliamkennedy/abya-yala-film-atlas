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

def csv_with_original_spans(raw):
    """Parse RFC 4180 records while retaining every source byte verbatim.

    A prior bug rewrote *all* Queue rows, cascading corruption in historic
    multiline source and review fields. Only records changed by the source
    review should be serialized again; accepted and historic bytes are sacred.
    """
    stream = io.StringIO(raw, newline='')
    reader = csv.reader(stream, strict=True)
    header = next(reader, None)
    if header is None:
        return [], '', []
    head_source = raw[:stream.tell()]
    entries = []
    start = stream.tell()
    for cells in reader:
        end = stream.tell()
        # Preserve pre-existing fragments verbatim; never auto-repair or
        # normalize one while deciding a different row.
        data = dict(zip(header, cells)) if len(cells) == len(header) else None
        entries.append({'data': data, 'raw': raw[start:end]})
        start = end
    return header, head_source, entries


def row_key(r):
    return tuple((v or '').strip() for k, v in r.items() if k and k != 'qid')

def pending_ids(atlas):
    """The id each blank-id Queue row will get, worked out exactly as atlasio.load does (all Queue files in name
    order; the next number after the highest; a blank or repeated id takes the next one). verify_queue.py checks
    rows under these ids before the tidy writes them to disk, so without this a new row waits a whole extra run.
    Keyed by the row's other cells; a key shared by two blank-id rows is left out (those wait for the tidy)."""
    # the same file pattern, reading and numbering as atlasio.py (copied here so this step needs no openpyxl)
    queue_file = re.compile(r'^(proposals|leads|history(?:-[a-z]+)?)(?:-([a-z]{1,2})-([a-z]{1,2}))?\.csv$')
    def qnum(q):
        m = re.fullmatch(r'Q(\d+)', q or '')
        return int(m.group(1)) if m else None
    csv.field_size_limit(10 ** 8)
    d = os.path.join(atlas, 'queue')
    rows = []
    for f in sorted(os.listdir(d)):
        if queue_file.match(f):
            with open(f'{d}/{f}', encoding='utf-8-sig', newline='') as fh:
                for r in csv.DictReader(fh):
                    r = {k: (v or '').strip() for k, v in r.items() if k}
                    if any(v for k, v in r.items() if k != 'qid'):
                        rows.append(r)
    seen, nxt, out, dup = set(), max([qnum(r.get('qid')) or 0 for r in rows] + [0]) + 1, {}, set()
    for r in rows:
        q = r.get('qid')
        if not qnum(q) or q in seen:
            q = f'Q{nxt:06d}'; nxt += 1
            if not qnum(r.get('qid')):
                k = row_key(r)
                if k in out:
                    dup.add(k)
                out[k] = q
        seen.add(q)
    return {k: q for k, q in out.items() if k not in dup}

def main(atlas, verify_path):
    today = datetime.date.today().isoformat()
    V = {x['qid']: x.get('checks', {}) for x in json.load(open(verify_path, encoding='utf-8'))}
    pending = pending_ids(atlas)
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
        fields, header_source, entries = csv_with_original_spans(raw)
        if not entries:
            continue
        nl = '\r\n' if '\r\n' in raw[:5000] else '\n'
        changed = False
        for entry in entries:
            r = entry['data']
            if r is not None and r.get('queue_status') == 'new' and not (r.get('qid') or '').strip():
                q = pending.get(row_key(r))
                if q in V:
                    r['qid'] = q          # the id the tidy would give it, written now so the merge below sees the same row
            if r is None or r.get('queue_status') != 'new' or r['qid'] not in V:
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
            # Re-encode this one reviewed row, not every other CSV record.
            # A single misplaced comma/quote elsewhere cannot be amplified.
            buf = io.StringIO(newline='')
            writer = csv.writer(buf, lineterminator=nl)
            writer.writerow([r.get(col, '') for col in fields])
            entry['raw'] = buf.getvalue()
            tally[status] += 1
            changed = True
        if changed:
            updated = header_source + ''.join(entry['raw'] for entry in entries)
            with open(path, 'w', encoding='utf-8', newline='') as fh:
                fh.write(updated)
    print(json.dumps(tally))

if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
