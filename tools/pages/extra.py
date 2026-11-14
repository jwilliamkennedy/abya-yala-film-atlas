"""timeline.html (films by decade) and screening.html (the viewer's screening list) at the beta root. Run after build.py."""
import json, sys, os, html, re
d = json.load(open(sys.argv[1])); out = sys.argv[2]
esc = lambda s: html.escape(str(s or ''), quote=True)
tpl = open(os.path.join(out, 'maker', 'index.html'), encoding='utf-8').read()
head = tpl.split('<main>', 1)[0].replace('href="../', 'href="').replace('src="../', 'src="')
def write(name, title, desc, body):
    h = re.sub(r'<title>.*?</title>', f'<title>{esc(title)}</title>', head)
    h = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{esc(desc)}">', h)
    open(os.path.join(out, name), 'w', encoding='utf-8').write(h + '<main><script src="assets/screening.js"></script>' + body + '</main></body></html>')
EXTRA_CSS = '''<style>.bars{display:flex;align-items:flex-end;gap:6px;height:150px;margin:18px 0 6px;border-bottom:1px solid var(--line)}
.bars a{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;border:0;color:var(--muted);font-size:12px;height:100%}
.bars a span{width:100%;background:var(--accent);opacity:.75;border-radius:2px 2px 0 0;min-height:2px}.bars a:hover span{opacity:1}
.tl{list-style:none;padding:0;margin:0}.tl li{display:grid;grid-template-columns:52px 1fr auto;gap:2px 12px;padding:9px 0;border-bottom:1px solid var(--line);align-items:baseline}
.tl .y{color:var(--muted);font-size:14px}.tl .t{font:400 18px/1.3 var(--serif);color:var(--ink);border:0}.tl small{display:block;color:var(--muted);font-size:13px;grid-column:2/3}
.scr{font:inherit;font-size:12px;border:1px solid var(--line);background:transparent;color:var(--ink);border-radius:999px;padding:1px 10px;cursor:pointer;white-space:nowrap}.scr[aria-pressed=true]{background:var(--ink);color:var(--bg)}
#list li{grid-template-columns:28px 1fr auto}#list textarea{grid-column:2/4;width:100%;font:inherit;font-size:14px;padding:6px 8px;border:1px solid var(--line);border-radius:4px;background:transparent;color:var(--ink);min-height:38px}
.mv{border:0;background:none;color:var(--muted);cursor:pointer;font-size:14px;padding:0 4px}</style>'''
films = []
for r in d:
    for f in r['films']:
        films.append((f, r))
dated_raw = [x for x in films if isinstance(x[0]['year'], int)]
merged = {}
for f, r in dated_raw:
    k = (re.sub(r'[^a-z0-9]+', ' ', f['title'].lower()).strip(), f['year'])
    if k in merged: merged[k][2].append(r)
    else: merged[k] = (f, r, [r])
dated = [(f, r) for f, r, _ in merged.values()]
co = {f['id']: rs for f, r, rs in merged.values()}
decades = {}
for f, r in dated: decades.setdefault(f['year'] // 10 * 10, []).append((f, r))
mx = max(len(v) for v in decades.values())
bars = ''.join(f'<a href="#d{k}" title="{len(decades[k])} film{'' if len(decades[k]) == 1 else 's'} in the {k}s"><span style="height:{max(2, round(130 * len(decades[k]) / mx))}px"></span>{k}s</a>' for k in sorted(decades))
def row(f, r):
    return (f'<li><span class="y">{f["year"]}</span><span><a class="t" href="maker/{esc(r["id"])}.html#{esc(f["id"])}">{esc(f["title"])}</a>'
            f'<small>{esc(", ".join(x["name"] for x in co.get(f["id"], [r])))}{" · " + esc(r["nation"].split(";")[0]) if r["nation"] else ""}</small></span>'
            f'<button type="button" class="scr" data-screen data-fid="{esc(f["id"])}" data-rid="{esc(r["id"])}" data-title="{esc(f["title"])}" data-year="{f["year"]}" data-maker="{esc(", ".join(x["name"] for x in co.get(f["id"], [r])))}" data-page="maker/{esc(r["id"])}.html#{esc(f["id"])}" data-watch="{esc((f["watch"] or [""])[0])}">＋ Screening list</button></li>')
secs = ''.join(f'<h2 id="d{k}">{k}s <small>{len(decades[k])} film{'' if len(decades[k]) == 1 else 's'}</small></h2><ol class="tl">' + ''.join(row(f, r) for f, r in sorted(decades[k], key=lambda x: (x[0]['year'], x[0]['title'].lower()))) + '</ol>' for k in sorted(decades))
write('timeline.html', 'Timeline · Indigenous Cinema Atlas', f'{len(dated)} dated films by Indigenous filmmakers, by decade.',
      EXTRA_CSS + f'<h1>Timeline</h1><p class="who">{len(dated)} dated films on the public map, by decade. {len([x for x in films if not isinstance(x[0]["year"], int)])} more film credits have no year recorded yet.</p><nav class="bars" aria-label="Films per decade">{bars}</nav>{secs}')
write('screening.html', 'Screening list · Indigenous Cinema Atlas', 'Your screening list of films from the Indigenous Cinema Atlas.', EXTRA_CSS + '''
<h1>Screening list</h1><p class="who">Films you add from filmmaker pages, the timeline and Watch gather here, kept in this browser. Reorder them, add notes, and copy the list into a syllabus.</p>
<div class="actions"><button type="button" class="primary" id="copy">Copy as syllabus</button><button type="button" id="csv">Download CSV</button><button type="button" id="clear">Clear list</button></div>
<p id="empty" class="who">Nothing here yet. Use “＋ Screening list” on any film.</p><ol class="tl" id="list"></ol><p id="msg" class="note" aria-live="polite"></p>
<script>(()=>{const $=s=>document.querySelector(s),S=()=>window.AtlasScreening;const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const draw=()=>{const l=S().load();$('#empty').hidden=!!l.length;$('#list').innerHTML=l.map((x,i)=>`<li data-i="${i}"><span class="y">${i+1}.</span><span><a class="t" href="${esc(x.page)}">${esc(x.title)}</a><small>${esc(x.maker)}${x.year?' · '+esc(x.year):''}${x.watch?' · <a href="'+esc(x.watch)+'" target="_blank" rel="noopener">▶ Watch</a>':''}</small></span>
<span><button class="mv" data-up="${i}" aria-label="Move up">↑</button><button class="mv" data-down="${i}" aria-label="Move down">↓</button><button class="mv" data-rm="${i}" aria-label="Remove">✕</button></span>
<textarea data-note="${i}" placeholder="Notes, week, discussion questions…">${esc(x.note)}</textarea></li>`).join('');};
document.addEventListener('click',e=>{const l=S().load();const t=e.target;const mv=(i,j)=>{if(j<0||j>=l.length)return;[l[i],l[j]]=[l[j],l[i]];S().save(l);draw();};
 if(t.dataset.up)mv(+t.dataset.up,+t.dataset.up-1);if(t.dataset.down)mv(+t.dataset.down,+t.dataset.down+1);if(t.dataset.rm){l.splice(+t.dataset.rm,1);S().save(l);draw();}});
document.addEventListener('input',e=>{const n=e.target.dataset.note;if(n===undefined)return;const l=S().load();l[+n].note=e.target.value;try{localStorage.setItem('atlas-screening-v1',JSON.stringify(l));}catch(err){}});
const text=()=>S().load().map((x,i)=>`${i+1}. ${x.title}${x.year?' ('+x.year+')':''}, dir. ${x.maker}.\\n   ${x.watch?'Watch: '+x.watch+'\\n   ':''}Atlas: ${x.page}${x.note?'\\n   '+x.note:''}`).join('\\n\\n');
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText('Screening list · Indigenous Cinema Atlas\\n\\n'+text());$('#msg').textContent='Copied. Paste it into your syllabus.';}catch(e){$('#msg').textContent='Select the list to copy it.';}};
$('#csv').onclick=()=>{const q=s=>'"'+String(s||'').replace(/"/g,'""')+'"';const rows=[['order','title','year','filmmaker','watch','atlas_page','notes'],...S().load().map((x,i)=>[i+1,x.title,x.year,x.maker,x.watch,x.page,x.note])];
 const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff'+rows.map(r=>r.map(q).join(',')).join('\\n')],{type:'text/csv'}));a.download='screening-list.csv';a.click();};
$('#clear').onclick=()=>{if(S().load().length&&confirm('Clear your screening list?')){S().save([]);draw();}};
window.addEventListener('screening-change',()=>{if(!document.activeElement||!document.activeElement.dataset||document.activeElement.dataset.note===undefined)draw();});draw();})();</script>''')
print('timeline decades', len(decades), 'dated', len(dated))
