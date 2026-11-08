"""Fresh AI curveballs use declarative contracts and trusted expected values."""
from copy import deepcopy
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import app
import adaptive
from adaptive import normalize_checkpoint, register_curveball, reference, validate_contract
from curveballs import get_problem_variant
from problems import PROBLEMS
from runner import run_code

CASES = {
    'two-sum': ({'noMatch': 'empty', 'return': 'values', 'ignoreValue': None}, [{'nums': [4, 6], 'target': 10}, {'nums': [1, 2], 'target': 99}]),
    'valid-parentheses': ({'ignoreText': True, 'maxDepth': 1}, [{'s': 'a(b)c'}, {'s': '(())'}]),
    'contains-duplicate': ({'threshold': 3, 'ignoreValue': 0}, [{'nums': [0, 0, 0]}, {'nums': [7, 7, 7]}]),
    'best-time-to-buy-and-sell-stock': ({'fee': 3}, [{'prices': [1, 8]}, {'prices': [5]}]),
    'maximum-subarray': ({'allowEmpty': False, 'minLength': 2, 'maxLength': 3}, [{'nums': [5, -1, 9, 4]}, {'nums': [5]}]),
}
SOLUTIONS = {
    'two-sum': '''class Solution:
    def twoSum(self, nums, target):
        for i, value in enumerate(nums):
            for j in range(i+1, len(nums)):
                if value + nums[j] == target: return [value, nums[j]]
        return []
''',
    'valid-parentheses': '''class Solution:
    def isValid(self, s):
        stack=[]
        pairs={')':'(', ']':'[', '}':'{'}
        for char in s:
            if char in '([{':
                stack.append(char)
                if len(stack)>1: return False
            elif char in pairs:
                if not stack or stack.pop()!=pairs[char]: return False
        return not stack
''',
    'contains-duplicate': '''class Solution:
    def hasDuplicate(self, nums):
        from collections import Counter
        return any(count >= 3 for value,count in Counter(nums).items() if value != 0)
''',
    'best-time-to-buy-and-sell-stock': '''class Solution:
    def maxProfit(self, prices):
        return max([0]+[prices[j]-prices[i]-3 for i in range(len(prices)) for j in range(i+1,len(prices))])
''',
    'maximum-subarray': '''class Solution:
    def maxSubArray(self, nums):
        sums=[sum(nums[i:j]) for i in range(len(nums)) for j in range(i+1,len(nums)+1) if 2<=j-i<=3]
        return max(sums) if sums else 0
''',
}


def proposal(slug='two-sum'):
    contract, inputs = CASES[slug]
    return {'title': 'Generated requirement', 'contract': deepcopy(contract), 'testInputs': deepcopy(inputs)}


def turn(slug='two-sum'):
    return {'action': 'curveball', 'message': 'Let us explore a different behavior.',
            'reason': 'The learner has explained a working approach.', 'curveball': proposal(slug)}


class AdaptiveContractsTests(unittest.TestCase):
    def setUp(self):
        with adaptive._lock: adaptive._variants.clear()

    def test_all_five_generated_variants_run_with_reference_computed_outputs(self):
        base = deepcopy(PROBLEMS)
        for slug in CASES:
            with self.subTest(problem=slug):
                result = normalize_checkpoint(turn(slug), PROBLEMS[slug], True)
                definition = result['curveball']
                self.assertTrue(definition['id'].startswith('ai-'))
                self.assertTrue(definition['generated'] and definition['replaceTestCases'])
                self.assertEqual(len(definition['testCases']), len(PROBLEMS[slug]['test_cases']) + 2)
                execution = run_code(slug, SOLUTIONS[slug], definition['id'])
                self.assertTrue(execution.get('all_passed'), execution)
                self.assertIn(definition['requirement'], result['message'])
                self.assertNotIn('expected', proposal(slug)['testInputs'][0])
        self.assertEqual(base, PROBLEMS)

    def test_pair_values_accept_either_order_but_reject_indices_and_booleans(self):
        definition = register_curveball(PROBLEMS['two-sum'], proposal(), 'Question')
        reverse = SOLUTIONS['two-sum'].replace('return [value, nums[j]]', 'return [nums[j], value]')
        self.assertTrue(run_code('two-sum', reverse, definition['id'])['all_passed'])
        wrong = SOLUTIONS['two-sum'].replace('return [value, nums[j]]', 'return [i, j]')
        self.assertFalse(run_code('two-sum', wrong, definition['id'])['all_passed'])
        wrong_type = 'class Solution:\n    def twoSum(self, nums, target): return [False, True]'
        self.assertFalse(run_code('two-sum', wrong_type, definition['id'])['all_passed'])

    def test_parameter_values_and_original_case_expectations_are_recomputed(self):
        first = register_curveball(PROBLEMS['best-time-to-buy-and-sell-stock'], proposal('best-time-to-buy-and-sell-stock'), 'Question')
        raw = proposal('best-time-to-buy-and-sell-stock'); raw['contract']['fee'] = 2
        second = register_curveball(PROBLEMS['best-time-to-buy-and-sell-stock'], raw, 'Question')
        self.assertNotEqual(first['id'], second['id'])
        self.assertNotEqual(first['requirement'], second['requirement'])
        self.assertEqual(first['testCases'][0]['expected'], 2)
        self.assertEqual(second['testCases'][0]['expected'], 3)
        self.assertNotIn('_validOutputs', first['testCases'][0])

    def test_bad_contracts_code_and_forged_expected_values_are_rejected(self):
        bad = [None, [], {'fee': 0}, {'fee': True}, {'fee': 1001}, {'fee': 2, 'code': 'print(1)'}]
        for value in bad:
            with self.assertRaises(ValueError): validate_contract('best-time-to-buy-and-sell-stock', value)
        for change in ({'testInputs': []}, {'testInputs': [{'nums': [1], 'target': 1, 'expected': [0,0]}]*2},
                       {'testInputs': [{'nums': [1]*65, 'target': 2}, {'nums': [1], 'target': 2}]},
                       {'code': 'def validate(): return True'}):
            with self.assertRaises(ValueError): register_curveball(PROBLEMS['two-sum'], {**proposal(), **change}, 'Question')
        for slug, value in [('valid-parentheses', {'ignoreText': False, 'maxDepth': None}),
                            ('contains-duplicate', {'threshold': 2, 'ignoreValue': None}),
                            ('maximum-subarray', {'allowEmpty': False, 'minLength': 1, 'maxLength': None})]:
            with self.assertRaises(ValueError): validate_contract(slug, value)

    def test_duplicate_or_non_demonstrating_inputs_are_rejected(self):
        raw = proposal(); raw['testInputs'][1] = raw['testInputs'][0]
        with self.assertRaises(ValueError): register_curveball(PROBLEMS['two-sum'], raw, 'Question')
        raw = proposal('contains-duplicate'); raw['contract'] = {'threshold': 2, 'ignoreValue': 999}
        raw['testInputs'] = [{'nums': [8, 8]}, {'nums': [6, 7]}]
        with self.assertRaises(ValueError): register_curveball(PROBLEMS['contains-duplicate'], raw, 'Question')

    def test_registry_is_bounded_and_expiry_is_actionable(self):
        with patch.object(adaptive, 'MAX_VARIANTS', 2):
            first = register_curveball(PROBLEMS['two-sum'], proposal(), 'Question')
            for _ in range(2): register_curveball(PROBLEMS['two-sum'], proposal(), 'Question')
            self.assertEqual(len(adaptive._variants), 2)
            with self.assertRaisesRegex(ValueError, 'expired'): get_problem_variant('two-sum', first['id'])
        definition = register_curveball(PROBLEMS['two-sum'], proposal(), 'Question')
        with patch.object(adaptive.time, 'monotonic', return_value=time_after()):
            with self.assertRaisesRegex(ValueError, 'expired'): get_problem_variant('two-sum', definition['id'])

    def test_unknown_and_wrong_problem_dynamic_ids_are_rejected(self):
        definition = register_curveball(PROBLEMS['two-sum'], proposal(), 'Question')
        with self.assertRaisesRegex(ValueError, 'selected problem'): get_problem_variant('contains-duplicate', definition['id'])
        with self.assertRaisesRegex(ValueError, 'expired'): get_problem_variant('two-sum', 'ai-forged')

    def test_continue_question_and_no_nested_curveball(self):
        for action in ['continue', 'question']:
            raw = {'action': action, 'message': 'Keep working.' if action=='continue' else 'Why choose a map?', 'reason': 'An explanation is in progress.', 'curveball': None}
            self.assertEqual(normalize_checkpoint(raw, PROBLEMS['two-sum'], True)['action'], action)
        with self.assertRaises(ValueError): normalize_checkpoint(turn(), PROBLEMS['two-sum'], False)
        definition = register_curveball(PROBLEMS['two-sum'], proposal(), 'Question')
        with self.assertRaises(ValueError): normalize_checkpoint(turn(), get_problem_variant('two-sum', definition['id']), True)


class AdaptiveApiTests(unittest.TestCase):
    def setUp(self):
        self.client = app.app.test_client()
        self.payload = {'problemId': 'two-sum', 'code': SOLUTIONS['two-sum'], 'transcript': 'I use a map to look up complements in one pass.', 'allowCurveball': True, 'history': []}

    def test_checkpoint_uses_model_timing_and_prior_turns_and_resolves_generated_run(self):
        payload = {**self.payload, 'history': [{'kind': 'question', 'text': 'Why use a map?'}]}
        with patch.object(app, 'call_model', return_value=turn()) as model:
            response = self.client.post('/interview/checkpoint', json=payload)
        self.assertEqual(response.status_code, 200, response.json)
        self.assertIn(payload['code'], model.call_args.args[1])
        self.assertIn('Why use a map?', model.call_args.args[1])
        ident = response.json['curveball']['id']
        execution = self.client.post('/run', json={**payload, 'curveballId': ident})
        self.assertEqual(execution.status_code, 200, execution.json)
        self.assertTrue(execution.json['all_passed'])

    def test_request_shapes_rejected_before_model_call(self):
        bad = [{'allowCurveball': 'yes'}, {'history': [None]}, {'history': [{'kind': 'execute', 'text': 'code'}]},
               {'history': [{'kind': 'question', 'text': 'x'*1201}]}, {'history': [{'kind': 'question','text':'Why?'}]*6},
               {'code': 'x'*12001}, {'transcript': 'x'*6001}]
        with patch.object(app, 'call_model') as model:
            for extra in bad:
                response = self.client.post('/interview/checkpoint', json={**self.payload, **extra})
                self.assertEqual(response.status_code, 400, response.json)
            model.assert_not_called()

    def test_malformed_model_is_recoverable_and_does_not_register(self):
        before = len(adaptive._variants)
        for raw in [None, {}, {'action': 'execute'}, {**turn(), 'curveball': {'code': 'print(1)'}}, {**turn(), 'reason': []}]:
            with patch.object(app, 'call_model', return_value=raw):
                response = self.client.post('/interview/checkpoint', json=self.payload)
                self.assertEqual(response.status_code, 502, response.json)
        self.assertEqual(before, len(adaptive._variants))


def time_after():
    return max(created for created, _ in adaptive._variants.values()) + adaptive.VARIANT_TTL + 1


if __name__ == '__main__': unittest.main()
