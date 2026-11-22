"""Regression tests for Queue validation: full profiles vs. sparse patches.

Run: python3 -m unittest discover -s tools/atlas -p 'test_check_validation.py' -v
"""
import unittest
import csv
import io
import json
import os
import tempfile
from unittest.mock import patch
import check
import auto_accept


L = {
    'language': ['English', 'Spanish'],
    'theme': ['Kinship'],
    'country code': ['USA', 'CAN'],
    'form': ['Documentary'],
    'length': ['Short'],
    'entity': ['Person', 'Collective'],
    'credit role': ['Director', 'Co-director'],
    'affiliation basis': ['Own words', 'Biography or programme'],
    'country basis': ['Catalogue or programme country'],
    'review status': ['Not yet verified'],
}


def maker(**updates):
    r = dict(
        filmmaker_id='M1', name='First Director', entity='Person',
        nation='Named Nation', source_1_url='https://example.org/bio',
        queue_action='lead', queue_status='new', _row=3,
    )
    r.update(updates)
    return r


def correction(**updates):
    r = dict(
        filmmaker_id='M1', queue_action='correct', queue_status='new',
        queue_target='FILM-1', proposed_by='ChatGPT',
        evidence_url='https://example.org/film', _row=4,
    )
    r.update(updates)
    return r


def published(**updates):
    r = maker(queue_action='', queue_status='', film_id='FILM-1')
    r.update(updates)
    return r


class AtlasQueueValidationTest(unittest.TestCase):
    def validate(self, rows, pub=None):
        with patch.object(check, 'lists_of', return_value=L):
            return check.check_queue(rows, None, pub if pub is not None else [published()])

    def test_sparse_film_correction_does_not_conflict_with_profile(self):
        errors, _ = self.validate([maker(), correction()])
        self.assertEqual(errors, [])

    def test_full_film_correction_does_not_replace_profile(self):
        errors, _ = self.validate([
            maker(),
            correction(name='Different spelling', nation='Different Nation'),
        ])
        self.assertEqual(errors, [])

    def test_full_maker_records_still_must_agree_exactly(self):
        errors, _ = self.validate([
            maker(), maker(_row=5, nation='Other Nation'),
        ])
        self.assertTrue(any('different nation' in e for e in errors), errors)

    def test_compatible_sparse_maker_corrections_do_not_conflict(self):
        errors, _ = self.validate([
            correction(_row=4, queue_target='M1', nation='New Nation'),
            correction(_row=5, queue_target='M1', source_1_quote='Own words'),
        ])
        self.assertEqual(errors, [])

    def test_conflicting_maker_corrections_are_flagged(self):
        errors, _ = self.validate([
            correction(_row=4, queue_target='M1', nation='Nation A'),
            correction(_row=5, queue_target='M1', nation='Nation B'),
        ])
        self.assertTrue(any('conflicting corrections to nation' in e for e in errors), errors)

    def test_invalid_csv_fragments_get_one_root_cause_error(self):
        errors, _ = self.validate([
            dict(_row=8, queue_action='FILM-OTHER', queue_status='2007'),
        ])
        self.assertEqual(len(errors), 1, errors)
        self.assertIn('malformed Queue action/status', errors[0])

    def test_codirected_film_requires_explicit_maker_id(self):
        rows = [correction(filmmaker_id='', _row=8)]
        pub = [published(), published(filmmaker_id='M2', name='Second Director')]
        errors, _ = self.validate(rows, pub)
        self.assertEqual(len(errors), 1, errors)
        self.assertIn('co-directed film FILM-1', errors[0])
        self.assertIn('M1', errors[0])
        self.assertIn('M2', errors[0])

    def test_codirector_specific_patches_pass(self):
        pub = [published(), published(filmmaker_id='M2', name='Second Director')]
        errors, _ = self.validate([
            correction(_row=4),
            correction(_row=5, filmmaker_id='M2'),
        ], pub)
        self.assertEqual(errors, [])

    def test_new_filmmaker_requires_people_source(self):
        row = maker(queue_action='add filmmaker', filmmaker_id='NEW-1',
                    source_1_url='', title='First Film', film_id='NEW-1-F1',
                    film_source='https://example.org/film')
        errors, _ = self.validate([row])
        self.assertTrue(any('has no source_1_url' in e for e in errors), errors)

    def test_published_profile_conflict_is_never_exempt(self):
        # Call the common published checker directly to avoid a workbook.
        errors, notes = [], []
        check.check_rows([
            published(_row=3),
            published(_row=4, nation='Other Nation', film_id='FILM-2'),
        ], L, 'Published', None, errors, notes)
        self.assertTrue(any('different nation' in e for e in errors), errors)


class AutoAcceptSerializationTest(unittest.TestCase):
    def test_preserves_original_csv_quoting_and_multiline_records(self):
        source = (
            'qid,queue_action,queue_status,review_note\n'
            'Q000001,lead,accepted,"A multiline, ""quoted"" note\nnext line"\n'
            'Q000002,correct,new,Unchanged\n'
        )
        fields, header, records = auto_accept.csv_with_original_spans(source)
        self.assertEqual(fields, ['qid', 'queue_action', 'queue_status', 'review_note'])
        self.assertEqual(header + ''.join(r['raw'] for r in records), source)
        self.assertEqual(records[0]['data']['queue_status'], 'accepted')
        self.assertEqual(records[1]['data']['queue_status'], 'new')

    def test_one_accepted_row_is_never_reserialized(self):
        with tempfile.TemporaryDirectory() as temp:
            os.makedirs(os.path.join(temp, 'queue'))
            os.makedirs(os.path.join(temp, 'master'))
            csv_path = os.path.join(temp, 'queue', 'proposals.csv')
            verify_path = os.path.join(temp, 'verify.json')
            original = (
                'qid,queue_action,queue_status,proposed_by,review_note\n'
                'Q000001,correct,accepted,Claude,"Keep, this protected ""quoted"" note\nand its next line"\n'
            )
            unreviewed = 'Q000002,correct,new,ChatGPT,Original note\n'
            with open(csv_path, 'w', encoding='utf-8', newline='') as file:
                file.write(original + unreviewed)
            with open(verify_path, 'w', encoding='utf-8') as file:
                json.dump([{'qid': 'Q000002',
                            'checks': {'evidence': {'fetch': 'ok'}}}], file)
            auto_accept.main(temp, verify_path)
            with open(csv_path, encoding='utf-8', newline='') as file:
                updated = file.read()
            self.assertTrue(updated.startswith(original), updated)
            self.assertIn('Q000002,correct,accepted,ChatGPT,', updated)
            self.assertNotEqual(updated, original + unreviewed)


if __name__ == '__main__':
    unittest.main()
