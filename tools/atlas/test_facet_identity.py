import unittest
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'facets'))
from identity import published_facets, unambiguous_titles


class FacetIdentityTest(unittest.TestCase):
    def test_explicit_values_independent_of_themes(self):
        rows = [{'film_id':'a','form':'Documentary','length':'F','film_source':'https://example.org/film'},
                {'film_id':'a','form':'Documentary','length':'Feature'}]
        values, sources, conflicts = published_facets(rows)['a']
        self.assertEqual(values, {'form':'Documentary','length':'Feature'})
        self.assertEqual(sources['form'], 'https://example.org/film')
        self.assertEqual(conflicts, [])

    def test_conflicts_and_order_independent_lists(self):
        rows = [{'film_id':'a','themes':'Water; Land Defense','form':'Documentary'},
                {'film_id':'a','themes':'Land Defense; Water','form':'Fiction'},
                {'film_id':'b','themes':'Water'}]
        values, _, conflicts = published_facets(rows)['a']
        self.assertEqual(values, {'themes':['Water','Land Defense']})
        self.assertEqual(conflicts, ['form'])

    def test_same_title_distinct_ids(self):
        films = {'a':{'title':'Home','year':2020}, 'b':{'title':'Home','year':2020},
                 'c':{'title':'Home','year':2021}}
        self.assertEqual(unambiguous_titles(films, str.lower), {'home|2021':'c'})
