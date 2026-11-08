"""Print the finder's evidence for review: python3 tools/languages/review.py lang.jsonl
Structured hits (Wikidata with codes, Wikipedia infobox) first, then quoted page text."""
import json, sys
rows = [json.loads(l) for l in open(sys.argv[1], encoding='utf-8')]
rows.sort(key=lambda r: r['n'])
hit = [r for r in rows if r['evidence']]
print(len(rows), 'films checked;', len(hit), 'with evidence')
for r in hit:
    print(f"\n#{r['n']} {r['id']} | {r['title']} ({r['year']}) | {', '.join(r['makers'])}")
    for e in r['evidence']:
        if e.get('langs'):
            print('  [WD]', e['page'], '|', e['title'], '|', '; '.join(f"{l['label']} {l['glottocode']} {l['iso639_3']}" for l in e['langs']))
        elif e.get('quote'):
            print('  [WP]', e['page'], '|', e['quote'])
        else:
            print('  [PG]', e['how'], e['page'], '|', e.get('title', '')[:80])
            for s in e.get('snippets', []):
                print('      -', s[:260])
            if e.get('jsonld'):
                print('      ld:', e['jsonld'])
