"""Audit every tracked CSV and both release export sets without mutating them."""
import csv
import json
import subprocess
from collections import Counter
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
EXPORTS = ('atlas-published.csv', 'atlas-filmmakers.csv', 'atlas-films.csv',
           'atlas-names.csv', 'film-facets.csv', 'languages.csv')


def read(path):
    with path.open(encoding='utf-8-sig', newline='') as stream:
        reader = csv.reader(stream, strict=True)
        header = next(reader)
        if not header or any(not c.strip() for c in header) or len(set(header)) != len(header):
            raise ValueError('blank or duplicate header')
        rows = []
        for row in reader:
            if not row:
                continue
            if len(row) != len(header):
                raise ValueError(f'line {reader.line_num}: {len(row)} fields, expected {len(header)}')
            rows.append(dict(zip(header, row)))
        return rows


def joins(tables):
    pub = tables['atlas-published.csv']
    credits = Counter((r['filmmaker_id'], r['film_id']) for r in pub if r['film_id'])
    makers = {r['filmmaker_id'] for r in pub}
    works = {fid for _, fid in credits}
    directory = Counter(r['record_id'] for r in tables['atlas-filmmakers.csv'])
    exported = Counter((r['record_id'], r['film_id']) for r in tables['atlas-films.csv'])
    names = Counter((r['title'], r['year'], r['name']) for r in pub if r['film_id'])
    public_names = Counter((r['film_title'], r['year'], r['filmmaker']) for r in tables['atlas-names.csv'])
    facet_ids = {r['film_id'] for r in tables['film-facets.csv']}
    authority = {r['label'] for r in tables['languages.csv']}
    return dict(makers=len(makers), credits=sum(credits.values()), works=len(works),
                duplicate_credit_keys=sum(v-1 for v in credits.values() if v>1),
                missing_directory_makers=len(makers-set(directory)),
                extra_directory_makers=len(set(directory)-makers),
                missing_export_credits=sum((credits-exported).values()),
                extra_export_credits=sum((exported-credits).values()),
                names_missing=sum((names-public_names).values()),
                names_extra=sum((public_names-names).values()),
                orphan_facet_ids=len(facet_ids-works),
                unknown_language_labels=len({r['value'] for r in tables['film-facets.csv'] if r['field']=='language'}-authority))


def main():
    files = subprocess.check_output(['git','ls-files','-z','*.csv'], cwd=ROOT).decode().split('\0')
    files = [p for p in files if p]
    tables, errors = {}, {}
    for path in files:
        try:
            tables[path] = read(ROOT/path)
        except (OSError, UnicodeError, ValueError, csv.Error, StopIteration) as exc:
            errors[path] = str(exc)
    releases = {}
    for directory in ('data','beta/data'):
        missing = [name for name in EXPORTS if directory+'/'+name not in tables]
        if missing:
            releases[directory] = {'missing_or_invalid': missing}
        else:
            try:
                releases[directory] = joins({name:tables[directory+'/'+name] for name in EXPORTS})
            except KeyError as exc:
                releases[directory] = {'missing_field': str(exc)}
    print(json.dumps({'files':len(files),'parsed':len(tables),'structure_errors':errors,'release_joins':releases},ensure_ascii=False,indent=2))
    # Historical files and production snapshot differences are disclosed, not changed.
    return int(any(path.startswith('beta/data/') for path in errors) or
               'missing_or_invalid' in releases['beta/data'] or
               'missing_field' in releases['beta/data'])


if __name__ == '__main__':
    sys.exit(main())
