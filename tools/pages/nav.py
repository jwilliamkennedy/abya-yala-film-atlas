"""One header menu for every page of the beta except the map itself (which builds the same menu in menus-20261107.js).
Same items, same order, same words as the map: About · Filmmakers · Films · Land · Constellate · Watch · More
(Browse: Languages, Themes, Timeline, Globe · Your list: Screening list · About the data: Data and downloads,
Suggest a correction). The current page is marked. Safe to run again.
usage: python3 tools/pages/nav.py beta"""
import sys, re, pathlib

TOP = [('About', 'about.html'), ('Filmmakers', './#view=filmmakers'), ('Films', './#view=films'), ('Land', './#view=land'),
       ('Constellate', './?constellate=1'), ('Watch', 'watch.html')]
MORE = [('Browse', [('Languages', 'languages.html'), ('Themes', 'themes.html'), ('Timeline', 'timeline.html'), ('Globe (preview)', 'globe-lab/')]),
        ('Your list', [('Screening list', 'screening.html')]),
        ('About the data', [('Data and downloads', 'data.html'), ('Suggest a correction', 'corrections.html')])]

CSS = '''<style id="site-nav-css">
/* the header sits exactly where the map's does: brand at left, the menu right after it, same sizes */
header{display:flex!important;flex-wrap:nowrap!important;justify-content:flex-start!important;align-items:center!important;gap:24px!important;padding:10px 28px!important;min-height:94px;box-sizing:border-box}
header .brand{display:flex;align-items:center;gap:22px!important;flex:none;border:0;color:var(--ink)}
header .brand>span{font:400 30px/1.1 Georgia,'Times New Roman',serif!important;letter-spacing:-.035em;color:var(--ink)}
header .brand small{display:block;font:500 11px/1.4 var(--sans,system-ui,sans-serif)!important;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-top:6px!important}
header nav.primary{flex-wrap:nowrap!important;gap:0 20px!important}
header nav.primary>a,header nav.primary .more-menu summary{font:400 15px/1 var(--sans,system-ui,sans-serif)!important;letter-spacing:normal;height:44px;display:flex;align-items:center;padding:0 2px!important;opacity:1}
@media (max-width:1000px) and (min-width:761px){header{flex-wrap:wrap!important;row-gap:0!important}}
@media (max-width:760px){
 header{display:block!important;padding:12px 16px 4px!important;min-height:0}
 header .brand>span{font-size:22px!important}
 header nav.primary{flex-wrap:wrap!important;column-gap:18px!important;margin-top:5px}
 header nav.primary>a,header nav.primary .more-menu summary{height:44px;font-size:16px!important}
}
.brand img{width:30px;height:30px;flex:none}
nav.primary{display:flex;flex-wrap:wrap;align-items:center;gap:4px 20px}
nav.primary>a{color:var(--ink);border:0;font-size:15px;padding:6px 0}
nav.primary a[aria-current]{box-shadow:inset 0 -2px 0 var(--accent,var(--gold))}
.more-menu{position:relative}
.more-menu summary{list-style:none;cursor:pointer;font-size:15px;color:var(--ink);padding:6px 0}
.more-menu summary::-webkit-details-marker{display:none}
.more-menu summary::after{content:' \\25BE';font-size:11px;color:var(--muted)}
.more-menu.here summary{box-shadow:inset 0 -2px 0 var(--accent,var(--gold))}
.more-menu>div{position:absolute;right:0;top:100%;z-index:50;min-width:220px;background:var(--bg);border:1px solid var(--line);border-radius:8px;box-shadow:0 10px 30px rgba(0,0,0,.14);padding:6px 0;display:flex;flex-direction:column}
.more-menu>div a{color:var(--ink);border:0;padding:7px 14px;font-size:14px}
.more-menu>div a:hover,.more-menu>div a:focus-visible{color:var(--accent,var(--gold));background:var(--card,var(--bg2))}
.more-menu>div a[aria-current]{box-shadow:inset 3px 0 0 var(--accent,var(--gold))}
.more-menu .more-group{font:600 10.5px/1 var(--sans,system-ui,sans-serif);letter-spacing:.09em;text-transform:uppercase;color:var(--muted);padding:12px 14px 4px}
/* links: ink inside the atlas, red with an arrow when they leave it (the same rule as the map) */
main a:not([href^="http"]):not(.primary){color:var(--ink);border-bottom-color:color-mix(in srgb,var(--ink) 30%,transparent)}
main a:not([href^="http"]):not(.primary):hover{border-bottom-color:var(--ink)}
main a[href^="http"]{color:var(--accent,var(--gold))}
@media (max-width:560px){.more-menu>div{position:fixed;left:16px;right:16px;min-width:0}}
</style>'''

JS = '''<script id="site-nav-js">document.addEventListener('click',function(e){document.querySelectorAll('details.more-menu[open]').forEach(function(d){if(!d.contains(e.target))d.open=false;});});
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('details.more-menu[open]').forEach(function(d){d.open=false;d.querySelector('summary').focus();});});</script>'''

def nav(depth, current):
    up = '../' * depth
    cur = lambda href: ' aria-current="page"' if href == current else ''
    top = ''.join(f'<a href="{up}{h}"{cur(h)}>{t}</a>' for t, h in TOP)
    here = any(h == current for _, items in MORE for _, h in items)
    groups = ''.join(f'<span class="more-group">{g}</span>' + ''.join(
        f'<a href="{up}{h}"{cur(h)}{" data-screen-count" if h == "screening.html" else ""}>{t}</a>' for t, h in items) for g, items in MORE)
    return (f'<nav class="primary" aria-label="Explore the atlas">{top}'
            f'<details class="more-menu{" here" if here else ""}"><summary>More</summary><div>{groups}</div></details></nav>')

def main(root):
    root = pathlib.Path(root)
    n = 0
    for f in root.rglob('*.html'):
        rel = f.relative_to(root)
        if str(rel) == 'index.html' or rel.parts[0].startswith('_'):
            continue
        t = f.read_text(encoding='utf-8')
        if '<nav class="primary"' not in t:
            continue
        depth = len(rel.parts) - 1
        current = './#view=filmmakers' if rel.parts[0] == 'maker' else str(rel)
        new = re.sub(r'<nav class="primary".*?</nav>', lambda m: nav(depth, current), t, count=1, flags=re.S)
        up = '../' * depth
        new = new.replace('<a class="brand" href="./">Indigenous Cinema Atlas<small>Abya Yala and Turtle Island</small></a>',
                          f'<a class="brand" href="{up}./"><img src="{up}assets/icon-1107.svg" alt=""><span>Indigenous Cinema Atlas<small>Abya Yala and Turtle Island</small></span></a>')
        new = re.sub(r'<main.*</main>', lambda m: re.sub(r'(<a [^>]*href="https?://[^"]*"[^>]*>)([^<]*?)</a>',
                     lambda a: a.group(0) if '\u2197' in a.group(2) or not a.group(2).strip() else f'{a.group(1)}{a.group(2)} \u2197</a>', m.group(0)), new, count=1, flags=re.S)
        if 'id="site-nav-css"' in new:
            new = re.sub(r'<style id="site-nav-css">.*?</style>', lambda m: CSS, new, flags=re.S)
        else:
            new = new.replace('</head>', CSS + '\n</head>', 1)
        if 'id="site-nav-js"' not in new:
            new = new.replace('</body>', JS + '</body>', 1)
        if new != t:
            f.write_text(new, encoding='utf-8'); n += 1
    print('header menu written on', n, 'pages')

if __name__ == '__main__':
    main(sys.argv[1])
