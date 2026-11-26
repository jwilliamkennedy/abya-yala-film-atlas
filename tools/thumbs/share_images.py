"""Give every copy of a film the image one copy already has.

usage: python3 tools/thumbs/share_images.py <atlas dir> [--write] [--also FILM_ID=SOURCE_FILM_ID ...]

Two kinds of copy lose their image:
 1. credit rows of one film (same film_id, another filmmaker): always shared;
 2. the same work entered twice under different film_ids (a variant spelling, a subtitle,
    a co-director's own record): listed as candidates only, because titles alone also match
    episodes, parts and unrelated films. Pass the ones checked by eye with --also.
With --write, appends `correct` rows (image cells only, no title) to atlas/queue/proposals.csv."""
import csv, difflib, glob, io, os, re, sys, unicodedata
from datetime import date

def fold(s):
    s = unicodedata.normalize('NFKD', s or '').encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', ' ', re.sub(r"['’‘`´]", '', s)).strip()

def main_title(s):
    return fold(re.split(r'\s[/–-]\s|:|\(', s or '')[0])

IMAGE = ['image_url', 'image_original', 'image_page', 'image_credit', 'image_kind', 'image_rights']

def load(atlas):
    rows = [r for f in sorted(glob.glob(os.path.join(atlas, 'master', 'films-*.csv'))) for r in csv.DictReader(open(f, encoding='utf-8'))]
    films = {}
    for r in rows:
        films.setdefault(r['film_id'], []).append(r)
    return films

def candidates(films):
    have = {f: next((r for r in rs if r['image_url'].strip()), None) for f, rs in films.items()}
    makers = {}
    for f, rs in films.items():
        for r in rs:
            makers.setdefault(r['filmmaker_id'], set()).add(f)
    out = []
    for f, rs in films.items():
        if have[f]:
            continue
        a = rs[0]
        near = set().union(*(makers.get(r['filmmaker_id'], set()) for r in rs))
        for g, src in have.items():
            if not src or g == f:
                continue
            if a['year'].strip() and src['year'].strip() and a['year'].strip() != src['year'].strip():
                continue
            ta, tb = fold(a['title']), fold(src['title'])
            ratio = difflib.SequenceMatcher(None, ta, tb).ratio()
            contained = len(main_title(a['title'])) >= 4 and (main_title(a['title']) in tb or main_title(src['title']) in ta)
            if (g in near and (ratio >= .8 or contained)) or (ta == tb and len(ta) >= 6):
                out.append((f, g, round(ratio, 2), g in near, a['title'], src['title']))
    return have, out

def main():
    atlas = sys.argv[1]
    write = '--write' in sys.argv
    also = dict(x.split('=', 1) for x in sys.argv[2:] if '=' in x)
    films = load(atlas)
    have, cands = candidates(films)
    print('Possible repeats (check by eye, then pass as FILM_ID=SOURCE_FILM_ID):')
    for f, g, ratio, same, ta, tb in cands:
        print(f'  {f}={g}  {ratio}  {"same filmmaker" if same else "other filmmaker"}  {ta!r} <= {tb!r}')
    rows = []
    def share(fid, src, basis):
        for r in films[fid]:
            if r['image_url'].strip():
                continue
            row = {k: src.get(k, '') for k in IMAGE}
            row.update(queue_action='correct', queue_target=fid, filmmaker_id=r['filmmaker_id'], queue_status='new',
                       proposed_by='Atlas research', proposed_on=date.today().isoformat(), evidence_url=src['image_page'] or src['film_source'],
                       image_basis=basis, image_checked=date.today().isoformat())
            rows.append(row)
    for f, rs in films.items():
        src = have[f]
        if src:
            share(f, src, 'same film as its other credit row, which carries this image')
    for f, g in also.items():
        share(f, have[g], f'same work as {g} ({films[g][0]["title"]}), which carries this image; matched by eye')
    print(len(rows), 'rows')
    if write and rows:
        p = os.path.join(atlas, 'queue', 'proposals.csv')
        raw = open(p, encoding='utf-8', newline='').read()
        lt = '\r\n' if '\r\n' in raw else '\n'
        old = list(csv.DictReader(io.StringIO(raw)))
        hdr = list(old[0].keys())
        out = io.StringIO()
        w = csv.DictWriter(out, fieldnames=hdr, lineterminator=lt)
        w.writerows([{k: r.get(k, '') for k in hdr} for r in rows])
        sep = '' if raw.endswith(('\n', '\r\n')) else lt
        open(p, 'w', encoding='utf-8', newline='').write(raw + sep + out.getvalue())
        assert list(csv.DictReader(io.StringIO(open(p, encoding='utf-8', newline='').read())))[:len(old)] == old

if __name__ == '__main__':
    main()
