"""Write approved thumbnail candidates as a beta media layer.
usage: layer.py candidates.json af_missing.json "rejected numbers, comma separated" out.js"""
import json, sys
from urllib.parse import urlparse
cands = json.load(open(sys.argv[1]))['kept']
groups = {g['n']: g for g in json.load(open(sys.argv[2]))}
rejected = {int(x) for x in sys.argv[3].replace(' ', '').split(',') if x}
add = {}
for c in cands:
    if c['n'] in rejected: continue
    g = groups[c['n']]
    for fid in g['ids']:
        add[fid] = {'title': g['title'], 'image': c['image'], 'originalImage': c['image'], 'sourceURL': c['page'],
                    'publisher': urlparse(c['page']).netloc, 'kind': 'Film image (A–F search)', 'checkedOn': '2026-11-07',
                    'rightsStatus': 'hotlinked; image remains with its rights holder',
                    'matchBasis': f"Page title matches the film and names its director or year ({c['how'][:60]}); image load-tested and checked by eye on a contact sheet 2026-11-07."}
js = ('// Film images for A–F titles, 7 November 2026: each film\'s own page, or one search on title + director + year,\n'
      '// kept only when the page names the film and its director or year; shared images (banners, logos) rejected; every image checked by eye.\n'
      '(()=>{const add=' + json.dumps(add, ensure_ascii=False, indent=0) + ';window.ATLAS_PROFILE_MEDIA=window.ATLAS_PROFILE_MEDIA||{};'
      'for(const [k,v] of Object.entries(add))if(!window.ATLAS_PROFILE_MEDIA[k])window.ATLAS_PROFILE_MEDIA[k]=v;})();\n')
open(sys.argv[4], 'w', encoding='utf-8').write(js)
print('films with new images:', len(add), '| groups kept:', len({c['n'] for c in cands} - rejected))
