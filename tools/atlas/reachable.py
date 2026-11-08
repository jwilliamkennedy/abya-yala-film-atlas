"""List which files in the site repository the live pages actually use, starting from the given entry pages and
following every local reference (HTML src/href, and quoted paths or fetch() calls inside JS, CSS and JSON).

usage: python3 tools/atlas/reachable.py <entry.html> [<entry.html> ...]   (paths relative to the repo root)
prints: USED <path> / UNUSED <path> for every tracked file (git ls-files), so old files can be archived with care."""
import re, sys, os, subprocess, posixpath
from urllib.parse import unquote

EXT = r'(?:js|css|json|html|png|jpe?g|svg|webp|gif|woff2?|ttf|mp4|webm|pdf|csv|geojson|topojson|txt|xml|ico|md)'
REF = re.compile(r'''(?:src|href|data-src|poster|content)\s*=\s*["']([^"'#?]+)|url\(\s*["']?([^"')#?]+)|["'`]((?:\.{0,2}/)?[\w\-./ %]+\.''' + EXT + r''')(?:[?#][^"'`]*)?["'`]''', re.I)
files = set(subprocess.run(['git', 'ls-files'], capture_output=True, text=True).stdout.split('\n')) - {''}
used, todo = set(), list(sys.argv[1:])
while todo:
    f = todo.pop()
    if f in used or f not in files:
        continue
    used.add(f)
    if not re.search(r'\.(html|js|css|json|webmanifest|xml)$', f):
        continue
    try:
        text = open(f, encoding='utf-8', errors='ignore').read()
    except OSError:
        continue
    base = posixpath.dirname(f)
    for m in REF.finditer(text):
        ref = unquote(next(g for g in m.groups() if g)).strip()
        if re.match(r'^(https?:|data:|mailto:|javascript:|//)', ref) or not ref:
            continue
        for cand in (posixpath.normpath(posixpath.join(base, ref)), posixpath.normpath(ref.lstrip('/'))):
            if cand in files and cand not in used:
                todo.append(cand)
            elif cand + '/index.html' in files:
                todo.append(cand + '/index.html')
for f in sorted(files):
    print(('USED ' if f in used else 'UNUSED ') + f)
