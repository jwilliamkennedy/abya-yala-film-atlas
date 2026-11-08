"""One-time: put four free-wording columns of Published into a fixed vocabulary, keeping every detail (8 Nov 2026).

Each cell becomes  "<Category>"  or  "<Category> — <detail>". The category comes from a short list (kept on the Lists
sheet, checked by tools/atlas/check.py); the detail keeps whatever the old wording said that the category does not:
a collaborator, a place, a source's own sentence. Wording that only repeated the category, or only named where the
credit was listed, goes to credit_note / the mapping file instead of the cell.

  credit             what the person did on the film          (Director, Co-director, Collective direction, ...)
  affiliation_basis  how a source establishes their people    (Own words, Biography or programme, ...)
  country_basis      why the filmmaker is listed under a country (Home community or residence, ...)
  review_status      where the record's review stands          (derived from status; open points kept as detail)

Every change is written to atlas/vocabulary-mapping-2026-11-08.csv (filmmaker_id, film_id, column, before, after).
usage: PYTHONPATH=tools/atlas python3 tools/atlas/normalize_2026-11-08.py <atlas.xlsx> [--apply] [--queue]   (Published first, then the Queue)"""
import sys, re, csv, os, unicodedata, collections
from openpyxl import load_workbook
from schema import *
import merge

D = ' — '
CREDIT = ['Director', 'Co-director', 'Collective direction', 'Director and writer', 'Director and producer',
          'Director, writer and producer', 'Segment director', 'Filmmaker', 'Other role']
AFFIL = ['Own words', 'Biography or programme', 'Heritage or descent', 'Membership or citizenship', 'Collective', 'Needs review']
COUNTRY = ['Home community or residence', 'Catalogue or programme country', 'Film production country', 'Unassigned']
REVIEW = {'Map Ready': 'Reviewed: identity and credit', 'Discovery · directing credit sourced': 'Credit sourced; identity from source',
          'Discovery · credit supported': 'Credit supported; identity reported by source'}

def k(t):
    return re.sub(r'[^a-z0-9]+', ' ', unicodedata.normalize('NFD', str(t or '')).encode('ascii', 'ignore').decode().lower()).strip()

SOURCE_ONLY = re.compile(r'^\(?\s*(festival listing|festival program|primary-source listing|official program/catalog|source verified|'
                         r'\d{4} morelia biography filmography|ecamc \d{4} project|fellow project|festival|official)\s*\)?$', re.I)

def credit(v, name=''):
    o = (v or '').strip()
    if not o:
        return o, ''
    low = o.lower()
    names_in = re.search(r'\b(with|associates|credited as|co-credit|fellow directors)\b', low)
    if re.search(r'director is|credits .* as director', low) or (re.match(r'^(producers?|associate producer|camera|story|key creative|co-screenwriter)', low) and 'direct' not in low):
        return 'Other role' + D + o, ''
    if re.search(r'segment director|anthology', low):
        role = 'Segment director'
    elif re.search(r'collective direction|collective (video|indigenous) authorship|collective filmography|co-directing (/ production )?collective|co-directing collective', low):
        role = 'Collective direction'
    elif re.search(r'co-?direct|co-realiz|^directors\b', low):
        role = 'Co-director'
    elif re.search(r'direct', low) and re.search(r'writer', low) and re.search(r'producer', low):
        role = 'Director, writer and producer'
    elif re.search(r'direct', low) and re.search(r'writer', low):
        role = 'Director and writer'
    elif re.search(r'direct', low) and re.search(r'producer', low):
        role = 'Director and producer'
    elif re.match(r'^(filmmaker|producer / filmmaker)', low):
        role = 'Filmmaker'
    elif re.search(r'direct|realiza|fellow', low):
        role = 'Director'
    else:
        return 'Other role' + D + o, ''
    ROLEWORDS = r'(co-?directors?|co-?writers?|directors?|writers?|screenwriter|co-?producers?|producers?|filmmaker|fellow|collective attribution|collective direction|co-?creator)'
    rest = re.sub(r'^(' + ROLEWORDS + r'[\s/&,;\-]*(and\s+)?)+', '', o, flags=re.I).strip()
    rest = re.sub(r'^:\s*', '', rest).strip(' ;,:-').strip()
    if rest.startswith('(') and rest.endswith(')') and rest.find(')') == len(rest) - 1:
        rest = rest[1:-1].strip()
    if name and k(rest).startswith(k(name)) and ',' not in rest:
        rest = ''                                           # the cell only repeated the filmmaker's own name (and people)
    if not rest or SOURCE_ONLY.match(rest) or k(rest) in (k(role), 'collective attribution'):
        return role, ('' if k(o) == k(role) else o)          # nothing to show; the old wording goes to the note
    return role + D + rest, ''

def affiliation(v, nation, community):
    o = (v or '').strip()
    low = o.lower()
    if not o:
        return o
    if re.search(r'needs review', low):
        cat = 'Needs review'
    elif re.search(r'collective|organi[sz]ation|women filmmakers from multiple|member affiliations', low):
        cat = 'Collective'
    elif re.search(r'self-|first-person|self |own website|self-profile', low):
        cat = 'Own words'
    elif re.search(r'citizenship|membership|tribal|registered status|member\b', low):
        cat = 'Membership or citizenship'
    elif re.search(r'heritage|descent|ancestry|lineage', low) and 'affiliation' not in low:
        cat = 'Heritage or descent'
    else:
        cat = 'Biography or programme'
    generic = re.compile(r'^(source-described|self-described|festival-reported|festival-described|source-reported|reported / specific|'
                         r'source-verified|identified by source|source explicitly names|indigenous filmmaker (identity|attribution)|sourced|'
                         r'source documents|community origin|citizenship|descent|tribal membership|self-described / official biography)', re.I)
    if low == 'broad':
        return cat + D + 'people named broadly (for example First Nations or Inuit)'
    if generic.match(o) and not re.search(r'pending|not independently|not established|unspecified|specificity', low):
        return cat
    if k(o) and (k(o) in k(nation) or k(o) in k(community)):
        return cat                                          # the old cell only repeated the nation / community
    return cat + D + o

GENERIC_COUNTRY = None
def country(v, generic):
    o = (v or '').strip()
    low = o.lower()
    if not o:
        return o
    if re.search(r'^unassigned|no explicit catalog country', low):
        cat = 'Unassigned'
    elif re.search(r'production (country|metadata|entry)|film production', low) and not re.search(r'biography|community', low):
        cat = 'Film production country'
    elif re.search(r'community or residence|biography|born|raised|from |based|lives|home|upbringing|village|origin|residence|membership|works out of|profile (lists|places|identifies)|identifies', low) \
            and not re.search(r'^(catalog country|country association documented in the consulted|navigation|discovery|country named|film program|research browsing|country search|country index|navigational)', low):
        cat = 'Home community or residence'
    else:
        cat = 'Catalogue or programme country'
    if o in generic:
        return cat
    detail = re.sub(r'^Documented country association for browsing:\s*', '', o)
    detail = re.sub(r'\s*This does not establish citizenship or a territorial bound\w*\.?\s*$', '', detail).strip()
    return cat + D + detail

def review(v, status):
    o = (v or '').strip()
    if status not in REVIEW:  # a lead in the Queue
        return 'Not yet verified' + (D + o if o and not re.match(r'^(not yet verified)$', o, re.I) else '')
    cat = REVIEW.get(status, 'Credit supported; identity reported by source')
    if re.search(r'pending|not closed|staged|provisional|not map ready|new lead|do not promote|research addition', o, re.I):
        return cat + D + 'open: ' + o
    return cat

def main(path, apply, sheet='Published'):
    wb = load_workbook(path)
    wp = wb[sheet]
    P = {c.value: i + 1 for i, c in enumerate(wp[2]) if c.value}
    rows = [r for r in range(3, wp.max_row + 1)
            if sheet == 'Published' or str(wp.cell(r, P['queue_status']).value or '') not in ('merged', 'removed', 'rejected', 'accepted')]
    val = lambda r, c: (str(wp.cell(r, P[c]).value).strip() if wp.cell(r, P[c]).value not in (None, '') else '')
    cnt = collections.Counter(val(r, 'country_basis') for r in rows if val(r, 'filmmaker_id'))
    # wording used for 2+ filmmakers is generic boilerplate; one-off wording is a source's own sentence
    makers_by_val = collections.defaultdict(set)
    for r in rows:
        makers_by_val[val(r, 'country_basis')].add(val(r, 'filmmaker_id'))
    generic = {v for v, m in makers_by_val.items() if len(m) >= 2}
    changes, out = [], collections.Counter()
    for r in rows:
        mid, fid, status = val(r, 'filmmaker_id'), val(r, 'film_id'), val(r, 'status')
        new = {}
        c_new, note = credit(val(r, 'credit'), val(r, 'name')) if fid else (val(r, 'credit'), '')
        new['credit'] = c_new
        new['affiliation_basis'] = affiliation(val(r, 'affiliation_basis'), val(r, 'nation'), val(r, 'community'))
        new['country_basis'] = country(val(r, 'country_basis'), generic)
        new['review_status'] = review(val(r, 'review_status'), status)
        for c, v in new.items():
            if v != val(r, c):
                changes.append({'filmmaker_id': mid, 'film_id': fid, 'column': c, 'before': val(r, c), 'after': v})
                out[c] += 1
                if apply:
                    wp.cell(r, P[c], v)
        if apply and note:
            old = val(r, 'credit_note')
            if note not in old:
                wp.cell(r, P['credit_note'], (f'Credited as: {note}.' + (' ' + old if old else '')).strip())
    if apply:
        wp.protection.sheet = False
        wl = wb['Lists']
        j = wl.max_column
        for name, vals in (('credit role', CREDIT), ('affiliation basis', AFFIL), ('country basis', COUNTRY), ('review status', list(dict.fromkeys(REVIEW.values())) + ['Not yet verified'])):
            hdr = [c.value for c in wl[1]]
            col = hdr.index(name) + 1 if name in hdr else (j := j + 1)
            wl.cell(1, col, name)
            for i, v in enumerate(vals, 2):
                wl.cell(i, col, v)
        wp.protection.sheet = True
        wb.save(path)
        open(os.path.join(os.path.dirname(path), 'PUBLISHED.sha256'), 'w').write(merge.fingerprint(load_workbook(path, read_only=True)['Published']) + '\n')
        mp = os.path.join(os.path.dirname(path), 'vocabulary-mapping-2026-11-08.csv')
        new_file = not os.path.exists(mp)
        with open(mp, 'a', newline='', encoding='utf-8') as fh:
            w = csv.DictWriter(fh, fieldnames=['sheet', 'filmmaker_id', 'film_id', 'column', 'before', 'after'])
            if new_file: w.writeheader()
            w.writerows([dict(c, sheet=sheet) for c in changes])
    # report
    after = collections.defaultdict(collections.Counter)
    for r in rows:
        pass
    for c in ('credit', 'affiliation_basis', 'country_basis', 'review_status'):
        cats = collections.Counter(ch['after'].split(D)[0] for ch in changes if ch['column'] == c)
        print(f'{c}: {out[c]} cells changed; categories {dict(cats)}')
    return changes

if __name__ == '__main__':
    ch = main(sys.argv[1], '--apply' in sys.argv, 'Queue' if '--queue' in sys.argv else 'Published')
    if '--apply' not in sys.argv:
        import random
        random.seed(3)
        for c in ('credit', 'affiliation_basis', 'country_basis', 'review_status'):
            xs = [x for x in ch if x['column'] == c]
            for x in random.sample(xs, min(12, len(xs))):
                print(f"  {c}: {x['before'][:90]!r}  ->  {x['after'][:110]!r}")
