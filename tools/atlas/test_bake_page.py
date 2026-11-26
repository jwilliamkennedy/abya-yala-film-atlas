from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from bake import page


class PageLoaderTest(unittest.TestCase):
    def test_bake_preserves_independent_scripts(self):
        independent = [
            '<script src="territories-data.js?v=2"></script>',
            '<script src="watch-data.js?v=7" defer></script>',
            '<script src="future-data.js?v=1"></script>',
            '<script src="assets/constellate.js?v=98-globe"></script>',
            '<script src="assets/globe.js?v=24"></script>',
        ]
        legacy = '<script src="connections-data.js?v=19"></script>'
        for catalogue in ['', '<script src="atlas-data.js?v=current"></script>']:
            with self.subTest(catalogue=catalogue), TemporaryDirectory() as folder:
                path = Path(folder) / 'index.html'
                path.write_text('\n'.join([catalogue, legacy, *independent]))
                page(path)
                once = path.read_text()
                self.assertEqual(once.count('src="atlas-data.js'), 1)
                self.assertIn(catalogue or '<script src="atlas-data.js"></script>', once)
                self.assertNotIn(legacy, once)
                self.assertEqual(once.count('src="territory-fixes.js"'), 1)
                positions = [once.index(tag) for tag in independent]
                self.assertEqual(positions, sorted(positions))
                page(path)
                self.assertEqual(once, path.read_text())

    def test_current_beta_page_preserves_loader_order_and_versions(self):
        # Test the real checked-in shell, not just synthetic script tags.
        root = Path(__file__).resolve().parents[2]
        original = (root / 'beta' / 'index.html').read_text(encoding='utf-8')
        import re
        pattern = r'<script\b[^>]*\bsrc="([^"?]+)(?:\?[^"]*)?"[^>]*></script>'
        def scripts(html):
            return [(m.group(1), m.group(0)) for m in re.finditer(pattern, html)]
        before = scripts(original)
        required = ('atlas-data.js', 'territories-data.js', 'territory-fixes.js',
                    'assets/catalogue.js', 'assets/collection-editor.js', 'watch-data.js', 'assets/globe-core.js', 'assets/globe.js')
        for src in required:
            self.assertEqual(sum(name == src for name, _ in before), 1, src)
        names = [name for name, _ in before]
        self.assertLess(names.index('watch-data.js'), names.index('assets/globe.js'))
        self.assertLess(names.index('assets/globe-core.js'), names.index('assets/globe.js'))
        with TemporaryDirectory() as folder:
            path = Path(folder) / 'index.html'
            path.write_text(original, encoding='utf-8')
            page(path)
            once = path.read_text(encoding='utf-8')
            self.assertEqual(scripts(once), before, 'Rebuild changed a published script tag or its order')
            self.assertEqual(once, original, 'Current beta shell must be a fixed point of bake.page()')
            page(path)
            self.assertEqual(path.read_text(encoding='utf-8'), once)
