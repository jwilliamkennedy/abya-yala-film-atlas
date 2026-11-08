"""Write the flat beta files.

  beta/atlas-data.js       ATLAS_FLAT (records, countries, meta) + images, watch links and theme tags of the published films
  beta/reference-data.js   reference tables (land names and links, country index, verification notes, entries for films
                           not on the map): frozen from the captured beta, with the workbook's land-link edits applied
  beta/index-flat.html     the beta page loading those two files instead of the layers

Normally called by tools/atlas/build.py (from atlas.xlsx). For the one-time identity test it can bake a captured
state directly:  python3 tools/atlas/bake.py <state.json> --all-records   (never commit that output: it holds leads)."""
import json, re, sys, pathlib

B = pathlib.Path('beta')
OWNED = ['ATLAS_PROFILE_MEDIA', 'ATLAS_FILM_EXPLORATION', 'ATLAS_THEMES_1103']
SKIP = {'ATLAS_UPDATE_1031', 'ATLAS_FACETS', 'ATLAS_ON_MAP', 'ATLAS_FLAT'}
MIXED = ['ATLAS_REBUILD_SUPPLEMENT', 'ATLAS_RESEARCH_ADDITIONS', 'ATLAS_SOUTH_AMERICA_50', 'ATLAS_SOUTH_AMERICA_50_BATCH2', 'ATLAS_PILOT_CATALOG']
KEEP_PAGE = {'territories-data.js', 'facets-data.js'}

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

def write(records, countries, meta, owned, base_globals, edges=None, keep_record_arrays=False, all_ids=None):
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
    ref_txt = ('/* Reference tables, frozen from the beta as it stood with its layers (tools/atlas). Land names and links, '
               'country index, verification notes, and entries for films not on the map. */\n'
               + ''.join(js(k, ref[k]) for k in sorted(ref))
               + merge_js('ATLAS_PROFILE_MEDIA', orphans.get('ATLAS_PROFILE_MEDIA', {}))
               + merge_js('ATLAS_FILM_EXPLORATION', orphans.get('ATLAS_FILM_EXPLORATION', {}))
               + js('ATLAS_THEMES_1103', {**{k: v for k, v in th_base.items() if k != 'films'}, 'films': orphans.get('ATLAS_THEMES_1103', {})}))
    (B / 'reference-data.js').write_text(ref_txt, encoding='utf-8')
    head = '/* Built by tools/atlas/build.py from the Published sheet of atlas.xlsx (private research repository). Edit the workbook, not this file. */\n'
    data_txt = (head + js('ATLAS_FLAT', {'records': records, 'countries': countries, 'meta': meta})
                + merge_js('ATLAS_PROFILE_MEDIA', owned.get('ATLAS_PROFILE_MEDIA', {}))
                + merge_js('ATLAS_FILM_EXPLORATION', owned.get('ATLAS_FILM_EXPLORATION', {}))
                + 'Object.assign(window.ATLAS_THEMES_1103.films,' + json.dumps(owned.get('ATLAS_THEMES_1103', {}), ensure_ascii=False, separators=(',', ':')) + ');\n')
    (B / 'atlas-data.js').write_text(data_txt, encoding='utf-8')
    page()
    return {'atlas-data.js MB': round((B / 'atlas-data.js').stat().st_size / 1e6, 2), 'reference-data.js MB': round((B / 'reference-data.js').stat().st_size / 1e6, 2)}

def page():
    html = (B / 'index.html').read_text(encoding='utf-8')
    tags = list(re.finditer(r'[ \t]*<script\b[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"[^>]*></script>\n?', html))
    out, first = html, True
    for m in tags:
        src = m.group(1)
        if src.endswith('-data.js') and src not in KEEP_PAGE:
            rep = '<script src="reference-data.js"></script>\n<script src="atlas-data.js"></script>\n' if first else ''
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
