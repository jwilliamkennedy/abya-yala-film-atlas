"""Check the research repository's layout, so it stays two CSV folders (master and Queue) and four workflows.

usage: python3 tools/atlas/structure.py <research repository root>
Run by the research repository's Queue check after the format check; prints ERROR lines and exits 1 on any.
  - every CSV file people or connectors open must stay under 950 KB (GitHub's file view stops at 1 MB). The publish
    workflow splits files at 700 KB, so this only fires if a file grew by more than 250 KB in one go.
  - nothing may be added outside the layout below: no new workflows, scripts or loose files. Agents ask John first;
    one-off work goes in archive/ (where nothing runs) or in an issue comment."""
import os, re, sys

LIMIT = 950 * 1024
ALLOWED = {
    '.': {'atlas', 'archive', '.github', 'AGENTS.md', 'CLAUDE.md', 'README.md', '.gitignore', '.git'},
    'atlas': {'master', 'queue', 'legacy', 'INTAKE.md', 'README.md'},
    'atlas/legacy': {'published-json.csv', 'queue-json.csv', 'snapshot-2026-11-08.json', 'README.md'},
    '.github': {'workflows', 'atlas'},
    '.github/workflows': {'queue-check.yml', 'publish-beta.yml', 'leads-verify.yml', 'pages-fetch.yml'},
    '.github/atlas': {'workbook-template.xlsx', 'fetch-list.txt'},
}
PATTERNS = {
    'atlas/master': re.compile(r'^((filmmakers|films)(-[a-z]{1,2}-[a-z]{1,2})?\.csv|lists\.csv|PUBLISHED\.sha256|README\.md)$'),
    'atlas/queue': re.compile(r'^((proposals|leads|history(-[a-z]+)?)(-[a-z]{1,2}-[a-z]{1,2})?\.csv|README\.md)$'),
}
OPENED = re.compile(r'^.+\.csv$')

def main(root):
    errors = []
    for d, names in ALLOWED.items():
        p = os.path.join(root, d)
        if not os.path.isdir(p):
            errors.append(f'{d}/ is missing'); continue
        for f in sorted(os.listdir(p)):
            if f not in names:
                errors.append(f'{d}/{f} is outside the agreed layout (ask John before adding workflows, scripts or files; one-off work goes in archive/)')
    for d, pat in PATTERNS.items():
        p = os.path.join(root, d)
        for f in sorted(os.listdir(p)):
            if not pat.match(f):
                errors.append(f'{d}/{f} is not a master or Queue file (only the files described in {d}/README.md belong here)')
            elif OPENED.match(f) and os.path.getsize(os.path.join(p, f)) > LIMIT:
                errors.append(f'{d}/{f} is {os.path.getsize(os.path.join(p, f)) // 1024} KB; files must stay under 950 KB '
                              '(the publish workflow splits them; commit again or run tools/atlas/atlasio.py atlas --tidy)')
    for e in errors:
        print('ERROR structure:', e)
    print(f'structure: {len(errors)} errors')
    sys.exit(1 if errors else 0)

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
