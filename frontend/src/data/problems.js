export const problems = [
  {
    id: 1,
    slug: 'two-sum',
    title: 'Two Sum',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
    description:
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
    details: [
      'You may assume that each input would have exactly one solution, and you may not use the same element twice.',
      'You can return the answer in any order.',
    ],
    examples: [
      {
        input: 'nums = [2,7,11,15], target = 9',
        output: '[0,1]',
        explanation: 'Because nums[0] + nums[1] == 9, we return [0, 1].',
      },
      {
        input: 'nums = [3,2,4], target = 6',
        output: '[1,2]',
      },
    ],
    constraints: [
      '2 <= nums.length <= 10⁴',
      '-10⁹ <= nums[i] <= 10⁹',
      'Only one valid answer exists.',
    ],
    starterCode: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        # Write your solution here
        pass
`,
    testCases: [
      { nums: [2, 7, 11, 15], target: 9 },
      { nums: [3, 2, 4], target: 6 },
      { nums: [3, 3], target: 6 },
    ],
  },
  {
    id: 2,
    slug: 'valid-parentheses',
    title: 'Valid Parentheses',
    difficulty: 'Easy',
    topics: ['String', 'Stack'],
    description:
      'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid.',
    details: [
      'An input string is valid if open brackets are closed by the same type of brackets in the correct order.',
      'Every close bracket has a corresponding open bracket of the same type.',
    ],
    examples: [
      { input: 's = "()"', output: 'true' },
      { input: 's = "()[]{}"', output: 'true' },
      { input: 's = "(]"', output: 'false' },
    ],
    constraints: [
      '1 <= s.length <= 10⁴',
      's consists of parentheses only "()[]{}"',
    ],
    starterCode: `class Solution:
    def isValid(self, s: str) -> bool:
        # Write your solution here
        pass
`,
    testCases: [
      { s: '()' },
      { s: '()[]{}' },
      { s: '(]' },
      { s: '([)]' },
      { s: '{[]}' },
    ],
  },
  {
    id: 3,
    slug: 'contains-duplicate',
    title: 'Contains Duplicate',
    difficulty: 'Easy',
    topics: ['Array', 'Hash Table'],
    description:
      'Given an integer array nums, return true if any value appears at least twice in the array, and return false if every element is distinct.',
    details: [],
    examples: [
      { input: 'nums = [1,2,3,1]', output: 'true' },
      { input: 'nums = [1,2,3,4]', output: 'false' },
    ],
    constraints: [
      '1 <= nums.length <= 10⁵',
      '-10⁹ <= nums[i] <= 10⁹',
    ],
    starterCode: `class Solution:
    def hasDuplicate(self, nums: List[int]) -> bool:
        # Write your solution here
        pass
`,
    testCases: [
      { nums: [1, 2, 3, 1] },
      { nums: [1, 2, 3, 4] },
      { nums: [1, 1, 1, 3, 3, 4, 3, 2, 4, 2] },
    ],
  },
  {
    id: 4,
    slug: 'best-time-to-buy-and-sell-stock',
    title: 'Best Time to Buy and Sell Stock',
    difficulty: 'Easy',
    topics: ['Array', 'Dynamic Programming'],
    description:
      'You are given an array prices where prices[i] is the price of a given stock on the ith day. You want to maximize your profit by choosing a single day to buy and a different day in the future to sell. Return the maximum profit. If you cannot achieve any profit, return 0.',
    details: [],
    examples: [
      {
        input: 'prices = [7,1,5,3,6,4]',
        output: '5',
        explanation: 'Buy on day 2 (price = 1) and sell on day 5 (price = 6), profit = 6-1 = 5.',
      },
      { input: 'prices = [7,6,4,3,1]', output: '0' },
    ],
    constraints: [
      '1 <= prices.length <= 10⁵',
      '0 <= prices[i] <= 10⁴',
    ],
    starterCode: `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # Write your solution here
        pass
`,
    testCases: [
      { prices: [7, 1, 5, 3, 6, 4] },
      { prices: [7, 6, 4, 3, 1] },
      { prices: [2, 4, 1] },
    ],
  },
  {
    id: 5,
    slug: 'maximum-subarray',
    title: 'Maximum Subarray',
    difficulty: 'Medium',
    topics: ['Array', 'Dynamic Programming'],
    description:
      'Given an integer array nums, find the subarray with the largest sum, and return its sum.',
    details: [],
    examples: [
      {
        input: 'nums = [-2,1,-3,4,-1,2,1,-5,4]',
        output: '6',
        explanation: 'The subarray [4,-1,2,1] has the largest sum 6.',
      },
      { input: 'nums = [1]', output: '1' },
    ],
    constraints: [
      '1 <= nums.length <= 10⁵',
      '-10⁴ <= nums[i] <= 10⁴',
    ],
    starterCode: `class Solution:
    def maxSubArray(self, nums: List[int]) -> int:
        # Write your solution here
        pass
`,
    testCases: [
      { nums: [-2, 1, -3, 4, -1, 2, 1, -5, 4] },
      { nums: [1] },
      { nums: [5, 4, -1, 7, 8] },
    ],
  },
]

export function getProblemBySlug(slug) {
  return problems.find((p) => p.slug === slug) || problems[0]
}

export const RUBRIC_LABELS = {
  problemUnderstanding: 'Problem Understanding',
  bruteForce: 'Brute Force',
  optimization: 'Optimization',
  timeComplexity: 'Time Complexity',
  spaceComplexity: 'Space Complexity',
  clarity: 'Clarity',
}
