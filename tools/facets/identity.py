"""Permanent film IDs and exact published field values are the join keys.

Conflicting nonblank credit values are reported, not silently reconciled.
Blank rows do not override a populated field. No catalogue rows are mutated.
"""
from collections import defaultdict

FIELDS = ('languages', 'themes', 'primary_theme', 'form', 'length')
LIST_FIELDS = {'languages', 'themes'}
LENGTH = {'S': 'Short', 'F': 'Feature', 'M': 'Mid-length'}


def published_facets(rows):
    groups = defaultdict(list)
    for row in rows:
        if row.get('film_id'):
            groups[row['film_id']].append(row)
    result = {}
    for fid, credits in groups.items():
        values, conflicts, sources = {}, [], {}
        for field in FIELDS:
            seen = {}
            for row in credits:
                raw = str(row.get(field) or '').strip()
                if not raw:
                    continue
                value = tuple(dict.fromkeys(x.strip() for x in raw.split(';') if x.strip())) if field in LIST_FIELDS else LENGTH.get(raw, raw) if field == 'length' else raw
                key = tuple(sorted(value)) if field in LIST_FIELDS else value
                source = row.get('language_source') if field == 'languages' else row.get('theme_source') or (row.get('film_source') if field in ('form','length') else '')
                seen.setdefault(key, (value, []))[1].append(source)
            if len(seen) > 1:
                conflicts.append(field)
            elif seen:
                value, urls = next(iter(seen.values()))
                values[field] = list(value) if field in LIST_FIELDS else value
                sources[field] = next((url for url in urls if url), '')
        result[fid] = (values, sources, conflicts)
    return result


def unambiguous_titles(films, key):
    groups = defaultdict(list)
    for fid, e in films.items():
        groups[key(e['title']) + '|' + str(e.get('year') or '')].append(fid)
    return {title: ids[0] for title, ids in groups.items() if len(ids) == 1}
