"""Join the beta's data layers into one file per block, in load order, and write beta/index-bundled.html.

The individual *-data.js files stay the sources (ChatGPT and Claude keep adding layers as before).
Each consecutive run of *-data.js <script> tags in beta/index.html becomes one bundle; code files in
between keep their place, so load order and behaviour are unchanged. Each layer is wrapped so an
error in one still lets the next run, as separate <script> tags would.
usage: python3 tools/build_bundle.py   (from the repo root)"""
import re, hashlib, pathlib
B = pathlib.Path('beta')
html = (B / 'index.html').read_text(encoding='utf-8')
tags = list(re.finditer(r'<script\b[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"[^>]*></script>', html))
def is_data(m): return m.group(1).endswith('-data.js')
def adjacent(a, b): return html[a.end():b.start()].strip() == ''
runs, cur = [], []
for m in tags:
    if is_data(m) and cur and adjacent(cur[-1], m):
        cur.append(m)
    else:
        if len(cur) > 1: runs.append(cur)
        cur = [m] if is_data(m) else []
if len(cur) > 1: runs.append(cur)
out = html
for i, run in enumerate(runs, 1):
    parts = []
    for m in run:
        src = (B / m.group(1)).read_text(encoding='utf-8')
        # each layer runs as its own unit, like a separate <script>: a thrown error is reported and the next layer still runs
        parts.append(f'/* ---- {m.group(1)} ---- */\ntry{{\n' + src.rstrip() + f'\n}}catch(e){{console.error("data layer failed: {m.group(1)}",e)}}')
    body = '\n'.join(parts)
    name = f'data-bundle-{i}.js'
    (B / name).write_text(f'/* Built by tools/build_bundle.py from {len(run)} layers; edit the layers, not this file. */\n' + body, encoding='utf-8')
    ver = hashlib.sha1(body.encode()).hexdigest()[:8]
    first, last = run[0], run[-1]
    block = html[first.start():last.end()]
    defer = ' defer' if re.search(r'\bdefer\b', first.group(0)) else ''
    assert all(bool(re.search(r'\bdefer\b', m.group(0))) == bool(defer) for m in run), 'mixed defer in one block'
    out = out.replace(block, f'<script src="{name}?v={ver}"{defer}></script>', 1)
    print(name, len(run), 'layers', round(len(body) / 1e6, 2), 'MB')
(B / 'index-bundled.html').write_text(out, encoding='utf-8')
print('scripts:', len(tags), '->', len(re.findall(r'<script src=', out)))
