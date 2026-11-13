import unittest
from analysis.calculate_polling_accuracy import candidate_key, party, result_info, poll_record, is_standard_round

class PollingAccuracyUnitTests(unittest.TestCase):
    def test_canonical_names(self):
        self.assertEqual(candidate_key('Nick Begich III'), ('nick','begich'))
        self.assertEqual(candidate_key('Nick Begich'), ('nick','begich'))
    def test_party(self):
        self.assertEqual(party('Democratic'), 'D')
        self.assertEqual(party('Republican'), 'R')
        self.assertEqual(party('Nonpartisan'), 'O')
    def test_two_party_result_with_minor(self):
        r={'candidates':[{'name':'Jane Doe','party':'Democratic','votes':550},
                         {'name':'James Roe','party':'Republican','votes':450},
                         {'name':'Other','party':'Libertarian','votes':10}]}
        margin,reason,_=result_info(r)
        self.assertIsNone(reason)
        self.assertAlmostEqual(margin,10)
    def test_large_third_party_exclusion(self):
        r={'candidates':[{'name':'Jane Doe','party':'Democratic','votes':500},
                         {'name':'James Roe','party':'Republican','votes':400},
                         {'name':'Other Person','party':'Nonpartisan','votes':200}]}
        _,why,_=result_info(r)
        self.assertEqual(why,'significant_other_or_nonpartisan_vote')
    def test_poll_candidate_mismatch(self):
        answers=[{'name':'Different Democrat','party':'DEM','pct':50},
                 {'name':'James Roe','party':'REP','pct':45}]
        _,why=poll_record({'answers':answers},{'D':('jane','doe'),'R':('james','roe')})
        self.assertEqual(why,'candidate_matchup_mismatch')
    def test_normalized_margin(self):
        answers=[{'name':'Jane Doe','party':'DEM','pct':48},
                 {'name':'James Roe','party':'REP','pct':42}]
        value,why=poll_record({'answers':answers},{'D':('jane','doe'),'R':('james','roe')})
        self.assertIsNone(why)
        self.assertAlmostEqual(value,100*6/90)
    def test_ranked_choice_exclusion(self):
        self.assertFalse(is_standard_round({'round':['1','FALSE','FALSE']}))
        self.assertTrue(is_standard_round({'round':['','FALSE','FALSE']}))

if __name__=='__main__':unittest.main()
