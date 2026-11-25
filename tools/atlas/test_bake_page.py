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
            '<script src="assets/globe-experiment.js?v=32"></script>',
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
