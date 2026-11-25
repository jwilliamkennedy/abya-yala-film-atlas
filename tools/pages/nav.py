"""One header menu for every page of the beta except the map itself (which builds the same menu in menus-20261107.js).
Same items, same order, same words as the map: About · Map · Constellate · Watch · More
(Browse: Languages, Themes, Timeline · Your list: Screening list · About the data: Data, Reuse, and CARE,
Resources, Suggest a correction). Filmmakers, Films and Land are switched inside the map's sidebar (2026-11-09).
Also loads the shared interface layer (assets/ui-20261109.css and .js) after site-menu.css, and last of all the left rail
(assets/rail-20261121.css and .js, 2026-11-21), which replaces this header at 901px and wider; the header stays in the page for phones
and for the rail to draw on. The current page is marked. Safe to run again.
usage: python3 tools/pages/nav.py beta"""
import sys, re, pathlib

TOP = [('About', 'about.html'), ('Map', './'), ('Constellate', './?constellate=1'), ('Watch', 'watch.html')]
MORE = [[('Languages', 'languages.html'), ('Themes', 'themes.html'), ('Timeline', 'timeline.html')],
        [('Saved', 'screening.html')],
        [('Suggest a correction', 'corrections.html')]]   # Data and CARE, and Resources, are tabs at the top of About
# the atlas mark (lens and meridian, 2026-11-15), drawn in the page's ink (the same icon on every page, in light and night themes)
MARK = ('<svg class="brand-mark" viewBox="0 0 120 120" aria-hidden="true" focusable="false"><circle cx="60" cy="60" r="50" fill="none" stroke="currentColor" stroke-width="7"/><path class="meridian" d="M44 16 C66 30 50 46 62 60 C74 74 56 88 66 104" fill="none" stroke="#5f8199" stroke-width="8" stroke-linecap="round"/><circle cx="62" cy="60" r="7" fill="currentColor"/></svg>')

CSS = '''<style id="site-nav-css">
/* the header sits exactly where the map's does: brand at left, the menu right after it, same sizes */
header{display:flex!important;flex-wrap:nowrap!important;justify-content:flex-start!important;align-items:center!important;gap:24px!important;padding:10px 28px!important;min-height:94px;box-sizing:border-box}
header .brand{display:flex;align-items:center;gap:22px!important;flex:none;border:0;color:var(--ink)}
header .brand>span{font:400 30px/1.1 var(--ui-serif,Georgia,serif)!important;letter-spacing:-.035em;color:var(--ink)}
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
nav.primary{display:flex;flex-wrap:wrap;align-items:center;gap:4px 20px}
nav.primary>a{color:var(--ink);border:0;font-size:15px;padding:6px 0}
nav.primary a[aria-current]{box-shadow:inset 0 -2px 0 var(--accent,var(--gold))}
/* links: ink inside the atlas, red with an arrow when they leave it (the same rule as the map) */
main a:not([href^="http"]):not(.primary):not(.btn){color:var(--ink);border-bottom-color:color-mix(in srgb,var(--ink) 30%,transparent)}
main a:not([href^="http"]):not(.primary):not(.btn):hover{border-bottom-color:var(--ink)}
main a[href^="http"]{color:var(--accent,var(--gold))}
</style>'''

# sets html[data-rail] before first paint, so pages do not jump when the rail takes the header's place
RAIL_EARLY = '''<script id="rail-early">(function(){var d=document.documentElement,p=null;if(!matchMedia('(min-width:901px)').matches)return;try{p=localStorage.getItem('atlas-rail')}catch(e){}d.setAttribute('data-rail',p||(innerWidth<1440||/[?&]constellate=1/.test(location.search)?'compact':'full'))})()</script>'''

JS = '''<script id="site-nav-js">document.addEventListener('click',function(e){document.querySelectorAll('details.more-menu[open]').forEach(function(d){if(!d.contains(e.target))d.open=false;});});
document.addEventListener('keydown',function(e){if(e.key==='Escape')document.querySelectorAll('details.more-menu[open]').forEach(function(d){d.open=false;d.querySelector('summary').focus();});});</script>'''

def nav(depth, current):
    up = '../' * depth
    cur = lambda href: ' aria-current="page"' if href == current else ''
    top = ''.join(f'<a href="{up}{h}"{cur(h)}>{t}</a>' for t, h in TOP)
    here = any(h == current for items in MORE for _, h in items)
    groups = '<span class="more-sep"></span>'.join(''.join(
        f'<a href="{up}{h}"{cur(h)}{" data-screen-count" if h == "screening.html" else ""}>{t}</a>' for t, h in items) for items in MORE)
    return (f'<nav class="primary" aria-label="Explore the atlas">{top}'
            f'<details class="more-menu{" here" if here else ""}"><summary>More</summary><div>{groups}</div></details></nav>')

def main(root):
    root = pathlib.Path(root)
    import hashlib
    ver = lambda name: hashlib.sha1((root / 'assets' / name).read_bytes()).hexdigest()[:8] if (root / 'assets' / name).exists() else '1'
    V = {k: ver(k) for k in ('site-menu.css', 'site-menu.js', 'ui-20261109.css', 'ui-20261109.js', 'rail-20261121.css', 'rail-20261121.js')}
    n = 0
    for f in root.rglob('*.html'):
        rel = f.relative_to(root)
        if str(rel) in ('index.html', 'flat.html') or rel.parts[0].startswith('_'):
            continue
        t = f.read_text(encoding='utf-8')
        if '<nav class="primary"' not in t:
            continue
        depth = len(rel.parts) - 1
        current = './' if rel.parts[0] == 'maker' else str(rel)
        new = re.sub(r'<nav class="primary".*?</nav>', lambda m: nav(depth, current), t, count=1, flags=re.S)
        up = '../' * depth
        new = new.replace('<a class="brand" href="./">Indigenous Cinema Atlas<small>Abya Yala and Turtle Island</small></a>',
                          f'<a class="brand" href="{up}./">{MARK}<span>Indigenous Cinema Atlas<small>Abya Yala and Turtle Island</small></span></a>')
        new = re.sub(r'<img src="(?:\.\./)*assets/icon-1107\.svg" alt="">', MARK, new)
        new = re.sub(r'<script id="site-nav-js">.*?</script>', '', new, flags=re.S)
        new = re.sub(r'<link rel="stylesheet" href="(?:\.\./)*assets/site-menu\.css[^"]*"><script defer src="(?:\.\./)*assets/site-menu\.js[^"]*"></script>(?:<script defer src="(?:\.\./)*i18n-20261107\.js[^"]*"></script>)?\n', '', new)
        new = re.sub(r'<link rel="stylesheet" href="(?:\.\./)*assets/ui-20261109\.css[^"]*"><script defer src="(?:\.\./)*assets/ui-20261109\.js[^"]*"></script>\n', '', new)
        new = re.sub(r'<main.*</main>', lambda m: re.sub(r'(<a [^>]*href="https?://[^"]*"[^>]*>)([^<]*?)</a>',
                     lambda a: a.group(0) if '\u2197' in a.group(2) or not a.group(2).strip() else f'{a.group(1)}{a.group(2)} \u2197</a>', m.group(0)), new, count=1, flags=re.S)
        new = re.sub(r'<script id="rail-early">.*?</script><link rel="stylesheet" href="(?:\.\./)*assets/rail-20261121\.css[^"]*"><script defer src="(?:\.\./)*assets/rail-20261121\.js[^"]*"></script>\n', '', new, flags=re.S)
        if 'id="site-nav-css"' in new:
            new = re.sub(r'<style id="site-nav-css">.*?</style>', lambda m: CSS, new, flags=re.S)
        else:
            new = new.replace('</head>', CSS + '\n</head>', 1)
        # shared stylesheets last, after the page's own styles and site-nav-css, so the shared layer wins the cascade
        new = new.replace('</head>', f'<link rel="stylesheet" href="{up}assets/site-menu.css?v={V["site-menu.css"]}"><script defer src="{up}assets/site-menu.js?v={V["site-menu.js"]}"></script><script defer src="{up}i18n-20261107.js?v=23"></script>\n</head>', 1)
        new = new.replace('</head>', f'<link rel="stylesheet" href="{up}assets/ui-20261109.css?v={V["ui-20261109.css"]}"><script defer src="{up}assets/ui-20261109.js?v={V["ui-20261109.js"]}"></script>\n</head>', 1)
        new = new.replace('</head>', f'{RAIL_EARLY}<link rel="stylesheet" href="{up}assets/rail-20261121.css?v={V["rail-20261121.css"]}"><script defer src="{up}assets/rail-20261121.js?v={V["rail-20261121.js"]}"></script>\n</head>', 1)
        if new != t:
            f.write_text(new, encoding='utf-8'); n += 1
    print('header menu written on', n, 'pages')

if __name__ == '__main__':
    main(sys.argv[1])
