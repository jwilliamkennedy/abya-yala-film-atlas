"""Themes page: each theme with films you can watch gets a link to Watch filtered to that theme (watch.html?theme=…).
Reads beta/watch-data.js (written by tools/atlas/build.py). Safe to run again.
usage: python3 tools/pages/watch_links.py beta"""
import sys, re, json, pathlib, collections, html, urllib.parse

def main(root):
    root = pathlib.Path(root)
    w = (root / 'watch-data.js').read_text(encoding='utf-8')
    films = json.loads(w[w.index('window.ATLAS_WATCH=') + len('window.ATLAS_WATCH='):].rstrip().rstrip(';'))['films']
    n = collections.Counter(t for f in films for t in f.get('th') or [])
    p = root / 'themes.html'
    t = p.read_text(encoding='utf-8')
    t = re.sub(r' · <a class="watch-theme"[^>]*>[^<]*</a>', '', t)
    def add(m):
        name = html.unescape(m.group(2))
        if not n.get(name):
            return m.group(0)
        href = 'watch.html?theme=' + urllib.parse.quote(name)
        return f'{m.group(1)}{m.group(3)} · <a class="watch-theme" href="{href}">▶ Watch {n[name]}</a></p>'
    t = re.sub(r'(<li id="[^"]+"><h2>([^<]+)</h2><p class="codes">)([^<]*)</p>', add, t)
    p.write_text(t, encoding='utf-8')
    print('themes with films to watch:', sum(1 for k in n if n[k]))

if __name__ == '__main__':
    main(sys.argv[1])
