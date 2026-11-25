"""Regression: keep every sparse archived correction without an unsplittable file."""
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import atlasio


class ArchiveSplitTests(unittest.TestCase):
    def test_named_and_sparse_partition(self):
        self.assertEqual(atlasio.history_key({'name': 'Álvarez', 'qid': 'Q000101'}), 'al')
        rows = [{'name': '', 'qid': f'Q{i:06d}', 'evidence_url': 'x' * 200}
                for i in range(1, 1001)]
        self.assertGreater(len({atlasio.history_key(row) for row in rows}), 500)
        with tempfile.TemporaryDirectory() as folder, patch.object(atlasio, 'LIMIT', 10000):
            files = atlasio.write_split(folder, 'history-merged',
                                        ['qid', 'name', 'evidence_url'], rows,
                                        atlasio.history_key)
            restored = [row for file in files for row in atlasio.read(Path(folder) / file)]
            self.assertEqual(sorted(restored, key=lambda r: r['qid']), rows)
            self.assertTrue(all((Path(folder) / file).stat().st_size <= 10000 for file in files))


if __name__ == '__main__':
    unittest.main()
