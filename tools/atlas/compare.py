"""Compare a flat-beta capture with the layered capture: python3 tools/atlas/compare.py <layered.json> <flat.json>
Records shown on the map must be identical (the workbook's new language fields aside); leads are expected to be gone;
countries, meta and every data table the code reads must match."""
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
import bake
A = json.load(open(sys.argv[1], encoding='utf-8')); F = json.load(open(sys.argv[2], encoding='utf-8'))
ON = {'Map Ready', 'Discovery · credit supported', 'Discovery · directing credit sourced'}
NEW = {'languageLabels', 'languageSource', 'languageNote'}
MIXED = ('ATLAS_REBUILD_SUPPLEMENT', 'ATLAS_RESEARCH_ADDITIONS', 'ATLAS_SOUTH_AMERICA_50', 'ATLAS_SOUTH_AMERICA_50_BATCH2', 'ATLAS_PILOT_CATALOG')
strip = lambda r: {**{k: v for k, v in r.items() if k != 'films'}, 'films': [{k: v for k, v in f.items() if k not in NEW} for f in r['films']]}
AR = [r for r in A['records'] if r['status'] in ON]; FR = [strip(r) for r in F['records']]
ok = True
def say(c, m):
    global ok
    ok &= c
    print(('PASS ' if c else 'FAIL ') + m)
say([r['id'] for r in AR] == [r['id'] for r in FR], f'same {len(AR)} filmmakers on the map, same order (leads left out: {len(A["records"]) - len(AR)})')
bad = [a['id'] for a, f in zip(AR, FR) if a != f]
say(not bad, f'every record and film identical ({len(bad)} differ{": " + ", ".join(bad[:5]) if bad else ""})')
say(A['countries'] == F['countries'] and A['meta'] == F['meta'], 'countries and archive details identical')
# expected published form of every reference table: lead entries and merge logs removed (bake.reference_globals)
all_ids = [r['id'] for r in A['records']] + [f['id'] for r in A['records'] for f in r['films']]
EXP = bake.reference_globals(A['globals'], F['records'], all_ids)
pub_ids = {f['id'] for r in F['records'] for f in r['films']}
hidden = set(all_ids) - {r['id'] for r in F['records']} - pub_ids
for k in bake.OWNED:
    v = A['globals'].get(k, {})
    EXP[k] = {**v, 'films': {i: e for i, e in v.get('films', {}).items() if i not in hidden}} if k == 'ATLAS_THEMES_1103' else {i: e for i, e in v.items() if i not in hidden}
EXP['ATLAS_FACETS'] = A['globals'].get('ATLAS_FACETS'); EXP['ATLAS_ON_MAP'] = A['globals'].get('ATLAS_ON_MAP')
for k in sorted(set(EXP) | set(F['globals'])):
    if k in ('ATLAS_UPDATE_1031', 'ATLAS_FLAT'):
        continue
    say(EXP.get(k) == F['globals'].get(k), f'data table {k}')
say(A.get('territories') == F.get('territories'), f"territory layer identical ({len(F.get('territories') or [])} features)")
say(not F.get('errors'), f'no page errors {F.get("errors") or ""}')
sys.exit(0 if ok else 1)
