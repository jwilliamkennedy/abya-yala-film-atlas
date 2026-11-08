"""Put the private visit counter (beta/assets/counter.js) on every page of the beta, once. Safe to run again.
usage: python3 tools/pages/counter_tag.py beta"""
import sys, pathlib, re
root = pathlib.Path(sys.argv[1])
n = 0
for f in root.rglob('*.html'):
    rel = f.relative_to(root)
    if rel.parts[0].startswith('_') or 'google' in f.name:
        continue
    t = f.read_text(encoding='utf-8')
    if 'assets/counter.js' in t or '</head>' not in t:
        continue
    up = '../' * (len(rel.parts) - 1)
    t = t.replace('</head>', f'<script defer src="{up}assets/counter.js"></script>\n</head>', 1)
    f.write_text(t, encoding='utf-8'); n += 1
print('counter tag added to', n, 'pages')
