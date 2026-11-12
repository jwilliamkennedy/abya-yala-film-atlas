"""Promote the beta to the main site (the repository root). Run only when John says so.

usage: python3 tools/promote_beta.py <private archive dir> [--apply]
Without --apply it prints the plan. With --apply:
  1. every file under beta/ is copied to the same path at the root (beta/x -> x); addresses that name
     .../abya-yala-film-atlas/beta become .../abya-yala-film-atlas (canonical links, sitemap, page links);
  2. root files the new main site does not use (the old layered main site, passes/, old review pages) are copied
     to <archive>/site-repo-main/<path> and then removed from the public repository (git rm). Nothing is deleted
     beyond git: the archive and git history keep them;
  3. kept at the root regardless: README.md, CITATION.cff, .zenodo.json, .nojekyll, .gitignore, go.html, .github/, tools/, beta/.
The beta stays where it is, as the preview for the next round."""
import os, sys, shutil, subprocess, pathlib, re

KEEP = {'README.md', 'CITATION.cff', '.zenodo.json', '.nojekyll', '.gitignore', 'go.html'}
KEEP_DIRS = ('.github/', 'tools/', 'beta/', 'docs/')
TEXT = re.compile(r'\.(html|xml|js|css|json|txt|md|csv)$')

def git_files():
    return [f for f in subprocess.run(['git', 'ls-files'], capture_output=True, text=True).stdout.split('\n') if f]

def main(archive, apply):
    files = git_files()
    beta = [f for f in files if f.startswith('beta/')]
    targets = {f[len('beta/'):] for f in beta}
    old_root = [f for f in files if not f.startswith(KEEP_DIRS) and f not in KEEP and f not in targets]
    replaced = [f for f in files if not f.startswith(KEEP_DIRS) and f in targets]
    print(f'copy beta -> root: {len(beta)} files ({len(replaced)} replace older root versions)')
    print(f'archive and remove from the public repo: {len(old_root)} root files no longer used')
    groups = {}
    for f in old_root:
        groups.setdefault(f.split('/')[0] if '/' in f else '(root files)', []).append(f)
    for g, fs in sorted(groups.items(), key=lambda x: -len(x[1])):
        print(f'   {len(fs):4}  {g}' + ('' if len(fs) > 6 else '  ' + ', '.join(fs)))
    if not apply:
        return
    arch = pathlib.Path(archive) / 'site-repo-main'
    for f in old_root + replaced:  # keep a copy of every main-site file that changes or leaves
        dst = arch / f
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(f, dst)
    if old_root:
        subprocess.run(['git', 'rm', '-q', '--'] + old_root, check=True)
    for f in beta:
        dst = pathlib.Path(f[len('beta/'):])
        dst.parent.mkdir(parents=True, exist_ok=True)
        if TEXT.search(f):
            t = pathlib.Path(f).read_text(encoding='utf-8', errors='surrogateescape')
            t = t.replace('jwilliamkennedy.github.io/abya-yala-film-atlas/beta/', 'jwilliamkennedy.github.io/abya-yala-film-atlas/')
            t = t.replace('jwilliamkennedy.github.io/abya-yala-film-atlas/beta', 'jwilliamkennedy.github.io/abya-yala-film-atlas')
            dst.write_text(t, encoding='utf-8', errors='surrogateescape')
        else:
            shutil.copy2(f, dst)
    subprocess.run(['git', 'add', '-A', '--', '.'], check=True)
    print('done: review with git status, then commit')

if __name__ == '__main__':
    main(sys.argv[1], '--apply' in sys.argv)
