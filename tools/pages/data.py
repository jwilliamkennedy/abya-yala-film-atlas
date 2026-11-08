"""Write beta/data/atlas-films.csv and atlas-filmmakers.csv from public.json, and beta/data.html describing them."""
import csv, json, sys, os, datetime, html
d = json.load(open(sys.argv[1])); out = sys.argv[2]; BASE = sys.argv[3].rstrip('/')
os.makedirs(os.path.join(out, 'data'), exist_ok=True)
today = datetime.date.today().isoformat()
with open(os.path.join(out, 'data', 'atlas-filmmakers.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['record_id', 'filmmaker', 'also_credited_as', 'people_as_recorded', 'country_index', 'land_references', 'film_count', 'identity_and_credit_sources', 'atlas_page'])
    for r in sorted(d, key=lambda r: r['name'].lower()):
        w.writerow([r['id'], r['name'], '; '.join(r['aliases']), r['nation'], r['country'], '; '.join(r['lands']), len(r['films']), ' '.join(s['url'] for s in r['sources']), f'{BASE}/maker/{r["id"]}.html'])
n = 0
with open(os.path.join(out, 'data', 'atlas-films.csv'), 'w', newline='', encoding='utf-8') as fh:
    w = csv.writer(fh); w.writerow(['film_id', 'title', 'year', 'filmmaker', 'record_id', 'credit', 'form', 'languages', 'credit_source', 'watch_links', 'atlas_page'])
    for r in d:
        for f in r['films']:
            w.writerow([f['id'], f['title'], f['year'] or '', r['name'], r['id'], f['credit'], f['medium'], f['languages'], f['source'], ' '.join(f['watch']), f'{BASE}/maker/{r["id"]}.html#{f["id"]}']); n += 1
films_n = n
page = open(os.path.join(out, 'maker', 'index.html'), encoding='utf-8').read()
head, rest = page.split('<main>', 1)
body = (f'<p class="crumb">Indigenous Cinema Atlas</p><h1>Data</h1><p class="who">Download the public atlas as spreadsheets. Exported {today}.</p>'
        f'<div class="actions"><a class="primary" href="data/atlas-films.csv" download>Films · {films_n} rows (CSV)</a><a href="data/atlas-filmmakers.csv" download>Filmmakers · {len(d)} rows (CSV)</a></div>'
        '<h2>What is in them</h2><ul class="src"><li>Only filmmakers on the public map; research candidates are not included.</li>'
        '<li><b>people_as_recorded</b> is the filmmaker’s affiliation as the atlas records it, from their own words or an explicit biographical source. It does not establish enrolment, citizenship or residence.</li>'
        '<li><b>country_index</b> is the country the atlas files the filmmaker under for browsing.</li>'
        '<li><b>land_references</b> are Native Land Digital / MapMaker (2023) territory references linked on the atlas, not definitive boundaries.</li>'
        '<li>A film credited to several filmmakers appears once per filmmaker, with the same film_id where the record shares one.</li>'
        '<li>Images are not included; they remain with their rights holders.</li></ul>'
        '<h2>Reuse</h2><p>[License to be chosen by John Kennedy Godoy.] Please cite the atlas: Godoy, John Kennedy. <i>Indigenous Cinema Atlas: Abya Yala and Turtle Island</i>. University of Colorado Boulder, 2026.</p>'
        '<p>Found an error? <a href="corrections.html">Suggest a correction</a>.</p>')
open(os.path.join(out, 'data.html'), 'w', encoding='utf-8').write(head.replace('Filmmakers A–Z · Indigenous Cinema Atlas', 'Data · Indigenous Cinema Atlas').replace('href="../', 'href="').replace('src="../', 'src="') + '<main>' + body + '</main></body></html>')
print('films rows', films_n, 'filmmakers', len(d))
