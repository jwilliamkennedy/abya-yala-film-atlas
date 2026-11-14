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
try:
    works_n = json.load(open(os.path.join(out, 'data', 'film-facets.json'), encoding='utf-8'))['films_on_public_map']
except Exception:
    works_n = None
page = open(os.path.join(out, 'maker', 'index.html'), encoding='utf-8').read()
head, rest = page.split('<main>', 1)
body = (f'<h1>Data</h1><p class="who">Download the public atlas as spreadsheets. Exported {today}.' + (f' {works_n:,} films by {len(d):,} filmmakers; a film with two directors has one row for each.' if works_n else '') + '</p>'
        f'<div class="actions"><a class="primary" href="data/atlas-films.csv" download>Film credits · {films_n:,} rows (CSV)</a><a href="data/atlas-filmmakers.csv" download>Filmmakers · {len(d):,} rows (CSV)</a></div>'
        '<h2>What is in them</h2><ul class="src"><li>Only filmmakers on the public map; research candidates are not included.</li>'
        '<li><b>people_as_recorded</b> is the filmmaker’s affiliation as the atlas records it, from their own words or an explicit biographical source. It does not establish enrollment, citizenship or residence.</li>'
        '<li><b>country_index</b> is the country the atlas files the filmmaker under for browsing.</li>'
        '<li><b>land_references</b> are Native Land Digital / MapMaker (2023) territory references linked on the atlas, not definitive boundaries.</li>'
        '<li>A film credited to several filmmakers appears once per filmmaker in atlas-films.csv, and once in the film facets.</li>'
        '<li>Images are not included; they remain with their rights holders.</li></ul>'
        + (lambda: (lambda F, L: (
          f'<h2>Film facets: languages, themes, form and length</h2>'
          f'<p>The facets file lists what the atlas records about each film: one row per film, field and value, with the page that states it and how it was recorded. The map’s filters and search, the <a href="languages.html">Languages</a> and <a href="themes.html">Themes</a> pages and these downloads all read from it.</p>'
          f'<div class="actions"><a class="primary" href="data/film-facets.csv" download>Film facets · {F:,} rows (CSV)</a><a href="data/film-facets.json" download>Film facets (JSON)</a><a href="data/languages.csv" download>Language authority · {L} languages (CSV)</a></div>'
          '<table class="dict"><thead><tr><th>Field</th><th>What it holds</th></tr></thead><tbody>'
          '<tr><td><b>language</b></td><td>A language spoken in the film, as its credits or synopsis state it. <b>value</b> is the atlas’s name for it; <b>code</b> is its <a href="https://glottolog.org">Glottolog</a> code. The language authority adds ISO 639-3 codes and marks each match as exact, group (the credit names a language group, not one variety) or unresolved (the credit does not say which language). Never inferred from the filmmaker’s people or the film’s setting.</td></tr>'
          '<tr><td><b>theme</b></td><td>One of 30 themes in five families (Land and Environment; Sovereignty and Politics; Knowledge and Continuity; Lives and Relations; Expression and Representation), tagged only from a published synopsis whose link is kept as <b>source_url</b>. <b>code</b> holds the family; the primary theme is marked in <b>basis</b>.</td></tr>'
          '<tr><td><b>form</b></td><td>Documentary, Fiction, Animation, Experimental, Hybrid or Music Video: from the synopsis where tagged, otherwise normalized from the form recorded with the credit (the original wording is kept in <b>basis</b>).</td></tr>'
          '<tr><td><b>length</b></td><td>Short, Mid-length, Feature or Series, recorded the same way as form.</td></tr>'
          '<tr><td><b>source_url</b>, <b>basis</b></td><td>The page that states the value, and how it entered the atlas.</td></tr></tbody></table>'
          '<h2>How the atlas records</h2><ul class="src">'
          '<li>A filmmaker appears only when their Indigenous affiliation comes from their own words or an explicit biographical source; it is never inferred from a surname, language, subject, setting or festival listing.</li>'
          '<li>Every affiliation, film credit and facet keeps its source.</li>'
          ''
          ''
          '<li>Corrections from filmmakers and communities come in through the <a href="corrections.html">corrections page</a>.</li></ul>'
        ))(sum(1 for _ in open(os.path.join(out, 'data', 'film-facets.csv'), encoding='utf-8')) - 1, sum(1 for _ in open(os.path.join(out, 'data', 'languages.csv'), encoding='utf-8')) - 1)
        if os.path.exists(os.path.join(out, 'data', 'film-facets.csv')) else '')() +
        '<h2>Reuse</h2><p>Please cite the atlas: Godoy, John Kennedy. <i>Indigenous Cinema Atlas: Abya Yala and Turtle Island</i>. University of Colorado Boulder, 2026.</p>'
        '<p>Found an error? <a href="corrections.html">Suggest a correction</a>.</p>')
open(os.path.join(out, 'data.html'), 'w', encoding='utf-8').write(head.replace('Filmmakers A–Z · Indigenous Cinema Atlas', 'Data · Indigenous Cinema Atlas').replace('href="../', 'href="').replace('src="../', 'src="') + '<main>' + body.replace('<table class="dict">','<style>.dict{border-collapse:collapse;width:100%;font-size:15px;margin:10px 0 20px}.dict th,.dict td{text-align:left;vertical-align:top;padding:9px 10px 9px 0;border-bottom:1px solid var(--line)}.dict td:first-child{white-space:nowrap;padding-right:16px}</style><table class="dict">') + '</main></body></html>')
print('films rows', films_n, 'filmmakers', len(d))
