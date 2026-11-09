"""Fold the map's stylesheets into one file, beta/atlas.css, in the order index.html loads them (so the cascade
is unchanged), leaving out rules whose selectors name a class or id that exists nowhere in the beta's HTML or
JavaScript. Run once; afterwards edit beta/atlas.css directly.
usage: python3 tools/pages/bundle_css.py beta"""
import sys, re, pathlib, tinycss2

def main(root):
    root = pathlib.Path(root)
    html = (root / 'index.html').read_text(encoding='utf-8')
    links = re.findall(r'<link rel="stylesheet" href="([^"]+)"[^>]*>', html)
    files = [l for l in links if 'maplibre' not in l and 'site-menu' not in l and not l.startswith('http')]  # site-menu.css stays its own file: every page loads it
    corpus = '\n'.join(p.read_text(encoding='utf-8', errors='ignore') for p in list(root.rglob('*.js')) + list(root.rglob('*.html'))
                       if 'maker/' not in str(p.relative_to(root)) and 'atlas-data' not in p.name and 'territories' not in p.name)
    corpus += (root / 'maker' / 'index.html').read_text(encoding='utf-8')
    seen = {}
    def alive(tok):
        if tok in seen: return seen[tok]
        ok = re.search(r'(?<![\w-])' + re.escape(tok) + r'(?![\w-])', corpus) is not None
        if not ok:  # built at run time: 'is-'+x, `theme-${x}`
            parts = tok.split('-')
            for i in range(1, len(parts)):
                pre = '-'.join(parts[:i]) + '-'
                if re.search(re.escape(pre) + r"""(?:['"`]\s*\+|\$\{)""", corpus):
                    ok = True; break
        seen[tok] = ok; return ok
    def sel_alive(sel):
        s = re.sub(r':(?:not|is|where|has)\([^()]*(?:\([^()]*\)[^()]*)*\)', '', sel)   # optional parts don't make a selector dead
        toks = re.findall(r'[.#](-?[A-Za-z_][\w-]*)', re.sub(r'\[[^\]]*\]', '', s))
        return all(alive(t) for t in toks)
    kept = dropped = 0
    def walk(rules):
        nonlocal kept, dropped
        out = []
        for r in rules:
            if r.type == 'qualified-rule':
                sels = [s.strip() for s in tinycss2.serialize(r.prelude).split(',')]
                # split on commas outside parentheses
                raw = tinycss2.serialize(r.prelude); parts, depth, cur = [], 0, ''
                for ch in raw:
                    if ch == '(' : depth += 1
                    if ch == ')' : depth -= 1
                    if ch == ',' and depth == 0: parts.append(cur); cur = ''
                    else: cur += ch
                parts.append(cur)
                live = [p.strip() for p in parts if p.strip() and (p.strip().startswith('@') or sel_alive(p.strip()))]
                if not live:
                    dropped += 1; continue
                kept += 1
                out.append(',\n'.join(live) + '{' + tinycss2.serialize(r.content).strip() + '}')
            elif r.type == 'at-rule':
                if r.content is None:
                    out.append(tinycss2.serialize([r]).strip()); continue
                if r.lower_at_keyword in ('media', 'supports', 'container', 'layer'):
                    inner = walk(tinycss2.parse_rule_list(r.content, skip_whitespace=True, skip_comments=True))
                    if inner:
                        out.append('@' + r.at_keyword + tinycss2.serialize(r.prelude).rstrip() + '{\n' + '\n'.join(inner) + '\n}')
                else:  # keyframes, font-face …
                    out.append(tinycss2.serialize([r]).strip())
        return out
    chunks, imports = [], []
    for href in files:
        path = root / href.split('?')[0]
        text = path.read_text(encoding='utf-8')
        rules = tinycss2.parse_stylesheet(text, skip_whitespace=True, skip_comments=True)
        imports += [tinycss2.serialize([r]).strip() for r in rules if r.type == 'at-rule' and r.lower_at_keyword == 'import']
        rules = [r for r in rules if not (r.type == 'at-rule' and r.lower_at_keyword == 'import')]
        body = walk(rules)
        # url() paths: files in assets/ refer relative to assets/
        if '/' in href.split('?')[0]:
            base = href.split('?')[0].rsplit('/', 1)[0] + '/'
            body = [re.sub(r"url\((['\"]?)(?!data:|https?:|/|#)", lambda m: f'url({m.group(1)}{base}', b) for b in body]
        chunks.append(f'/* ── from {href.split("?")[0]} ── */\n' + '\n'.join(body))
    out = '\n'.join(imports) + '\n/* The map\'s styles, folded from ' + str(len(files)) + ' stylesheets on 8 Nov 2026 in their old load order (later rules win). Edit here. */\n' + '\n\n'.join(chunks) + '\n'
    (root / 'atlas.css').write_text(out, encoding='utf-8')
    print(len(files), 'stylesheets ->', 'beta/atlas.css', round(len(out) / 1024), 'KB; rules kept', kept, 'dropped (no element)', dropped)
    return files

if __name__ == '__main__':
    main(sys.argv[1])
