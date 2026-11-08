"""Write the flat beta files.

  beta/atlas-data.js       everything of ours in one file: reference tables (land names and links, country index, verification
                           notes; frozen from the captured beta, with the workbook's land-link edits applied), the records,
                           images, watch links, theme tags, and the film tags the filters use
  beta/index-flat.html     the beta page loading it (plus the Native Land shapes and territory-fixes.js) instead of the layers

Normally called by tools/atlas/build.py (from atlas.xlsx). For the one-time identity test it can bake a captured
state directly:  python3 tools/atlas/bake.py <state.json> --all-records   (never commit that output: it holds leads)."""
import json, re, sys, pathlib

B = pathlib.Path('beta')
OWNED = ['ATLAS_PROFILE_MEDIA', 'ATLAS_FILM_EXPLORATION', 'ATLAS_THEMES_1103']
SKIP = {'ATLAS_UPDATE_1031', 'ATLAS_FACETS', 'ATLAS_ON_MAP', 'ATLAS_FLAT'}  # merge input / built with the records / defined in code
MIXED = ['ATLAS_REBUILD_SUPPLEMENT', 'ATLAS_RESEARCH_ADDITIONS', 'ATLAS_SOUTH_AMERICA_50', 'ATLAS_SOUTH_AMERICA_50_BATCH2', 'ATLAS_PILOT_CATALOG']
KEEP_PAGE = {'territories-data.js'}  # Native Land shapes stay their own file; everything of ours is in atlas-data.js

def js(name, value):
    return f'window.{name}=' + json.dumps(value, ensure_ascii=False, separators=(',', ':')) + ';\n'

def merge_js(name, value):
    return f'window.{name}=Object.assign(window.{name}||{{}},' + json.dumps(value, ensure_ascii=False, separators=(',', ':')) + ');\n'

DROP = re.compile(r'^ATLAS_(BETA|NEXT25|DEDUPE|MIRROR_FILMOGRAPHY)')  # merge logs of the old layers; no code reads them

def scrub(value, hidden):
    """Remove entries about filmmakers and films that are not published (leads stay in the private Queue only)."""
    if isinstance(value, list):
        return [scrub(x, hidden) for x in value
                if not (isinstance(x, dict) and (x.get('record') in hidden or (isinstance(x.get('id'), str) and x.get('id') in hidden)))]
    if isinstance(value, dict):
        return {k: scrub(v, hidden) for k, v in value.items() if k not in hidden}
    return value

def reference_globals(base_globals, records, all_ids=None, keep_record_arrays=False):
    """The reference tables as published: record arrays and merge logs removed, lead entries scrubbed."""
    film_ids = {f['id'] for r in records for f in r.get('films') or []}
    rec_ids = {r['id'] for r in records}
    hidden = set(all_ids or ()) - rec_ids - film_ids
    ref = {}
    for k, v in base_globals.items():
        if k in SKIP or k in OWNED or DROP.match(k):
            continue
        if k in MIXED and not keep_record_arrays and isinstance(v, dict):
            v = {kk: vv for kk, vv in v.items() if kk != 'records'}
        ref[k] = scrub(v, hidden) if hidden else v
    return ref

def write(records, countries, meta, owned, base_globals, edges=None, keep_record_arrays=False, all_ids=None, facets=None):
    """owned: {global: {film_id: entry}} for published films; base_globals: captured globals (reference source)."""
    film_ids = {f['id'] for r in records for f in r.get('films') or []}
    rec_ids = {r['id'] for r in records}
    hidden = set(all_ids or ()) - rec_ids - film_ids
    ref = reference_globals(base_globals, records, all_ids, keep_record_arrays)
    orphans = {}
    for k in OWNED:  # entries for films not on the map stay as reference (alias IDs), never for leads
        v = base_globals.get(k, {})
        src = v.get('films', {}) if k == 'ATLAS_THEMES_1103' else v
        orphans[k] = {fid: e for fid, e in src.items() if fid not in film_ids and fid not in hidden}
    if edges is not None:
        ref['ATLAS_LAND_CROSSINDEX'] = dict(ref['ATLAS_LAND_CROSSINDEX'], edges=scrub(edges, hidden))
    th_base = base_globals.get('ATLAS_THEMES_1103', {})
    head = ('/* The atlas data: built by tools/atlas/build.py from atlas.xlsx (private research repository). Edit the workbook, not this file.\n'
            '   1. reference tables (land names and links, country index, verification notes; frozen 8 Nov 2026 from the layered beta)\n'
            '   2. filmmakers and films (Published sheet)  3. images, watch links, theme tags  4. film tags for filters (languages, themes, form, length) */\n')
    txt = (head + ''.join(js(k, ref[k]) for k in sorted(ref))
           + js('ATLAS_PROFILE_MEDIA', orphans.get('ATLAS_PROFILE_MEDIA', {}))
           + js('ATLAS_FILM_EXPLORATION', orphans.get('ATLAS_FILM_EXPLORATION', {}))
           + js('ATLAS_THEMES_1103', {**{k: v for k, v in th_base.items() if k != 'films'}, 'films': orphans.get('ATLAS_THEMES_1103', {})})
           + js('ATLAS_FLAT', {'records': records, 'countries': countries, 'meta': meta})
           + 'Object.assign(window.ATLAS_PROFILE_MEDIA,' + json.dumps(owned.get('ATLAS_PROFILE_MEDIA', {}), ensure_ascii=False, separators=(',', ':')) + ');\n'
           + 'Object.assign(window.ATLAS_FILM_EXPLORATION,' + json.dumps(owned.get('ATLAS_FILM_EXPLORATION', {}), ensure_ascii=False, separators=(',', ':')) + ');\n'
           + 'Object.assign(window.ATLAS_THEMES_1103.films,' + json.dumps(owned.get('ATLAS_THEMES_1103', {}), ensure_ascii=False, separators=(',', ':')) + ');\n'
           + (js('ATLAS_FACETS', facets) if facets is not None else ''))
    (B / 'atlas-data.js').write_text(txt, encoding='utf-8')
    page()
    return {'atlas-data.js MB': round((B / 'atlas-data.js').stat().st_size / 1e6, 2)}

def page():
    html = (B / 'index.html').read_text(encoding='utf-8')
    tags = list(re.finditer(r'[ \t]*<script\b[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"[^>]*></script>\n?', html))
    out, first = html, True
    for m in tags:
        src = m.group(1)
        if src.endswith('-data.js') and src not in KEEP_PAGE:
            rep = '<script src="atlas-data.js"></script>\n' if first else ''
            first = False
            out = out.replace(m.group(0), rep, 1)
    out = re.sub(r'(<script\b[^>]*\bsrc="territories-data\.js[^"]*"[^>]*></script>)', r'\1<script src="territory-fixes.js" defer></script>', out, count=1)
    (B / 'index-flat.html').write_text(out, encoding='utf-8')

if __name__ == '__main__':
    state = json.load(open(sys.argv[1], encoding='utf-8'))
    g = state['globals']
    ON_MAP = {'Map Ready', 'Discovery · credit supported', 'Discovery · directing credit sourced'}
    recs = state['records'] if '--all-records' in sys.argv else [r for r in state['records'] if r['status'] in ON_MAP]
    ids = {f['id'] for r in recs for f in r['films']}
    owned = {'ATLAS_PROFILE_MEDIA': {k: v for k, v in g.get('ATLAS_PROFILE_MEDIA', {}).items() if k in ids},
             'ATLAS_FILM_EXPLORATION': {k: v for k, v in g.get('ATLAS_FILM_EXPLORATION', {}).items() if k in ids},
             'ATLAS_THEMES_1103': {k: v for k, v in g.get('ATLAS_THEMES_1103', {}).get('films', {}).items() if k in ids}}
    all_ids = [r['id'] for r in state['records']] + [f['id'] for r in state['records'] for f in r['films']]
    print(write(recs, state['countries'], state['meta'], owned, g, keep_record_arrays='--all-records' in sys.argv, all_ids=all_ids))
