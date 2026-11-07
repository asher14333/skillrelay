PROBLEMS = {
    "two-sum": {
        "id": 1,
        "slug": "two-sum",
        "title": "Two Sum",
        "difficulty": "Easy",
        "method": "twoSum",
        "args": ["nums", "target"],
        "test_cases": [
            {"nums": [2, 7, 11, 15], "target": 9, "expected": [0, 1]},
            {"nums": [3, 2, 4], "target": 6, "expected": [1, 2]},
            {"nums": [3, 3], "target": 6, "expected": [0, 1]},
        ],
        "validator": "two_sum",
        "description": (
            "Given an array of integers nums and an integer target, return indices "
            "of the two numbers such that they add up to target."
        ),
    },
    "valid-parentheses": {
        "id": 2,
        "slug": "valid-parentheses",
        "title": "Valid Parentheses",
        "difficulty": "Easy",
        "method": "isValid",
        "args": ["s"],
        "test_cases": [
            {"s": "()", "expected": True},
            {"s": "()[]{}", "expected": True},
            {"s": "(]", "expected": False},
            {"s": "([)]", "expected": False},
            {"s": "{[]}", "expected": True},
        ],
        "validator": "equals",
        "description": (
            'Given a string s containing just the characters "(", ")", "{", "}", '
            '"[" and "]", determine if the input string is valid.'
        ),
    },
    "contains-duplicate": {
        "id": 3,
        "slug": "contains-duplicate",
        "title": "Contains Duplicate",
        "difficulty": "Easy",
        "method": "hasDuplicate",
        "args": ["nums"],
        "test_cases": [
            {"nums": [1, 2, 3, 1], "expected": True},
            {"nums": [1, 2, 3, 4], "expected": False},
            {"nums": [1, 1, 1, 3, 3, 4, 3, 2, 4, 2], "expected": True},
        ],
        "validator": "equals",
        "description": (
            "Given an integer array nums, return true if any value appears at "
            "least twice in the array, and return false if every element is distinct."
        ),
    },
    "best-time-to-buy-and-sell-stock": {
        "id": 4,
        "slug": "best-time-to-buy-and-sell-stock",
        "title": "Best Time to Buy and Sell Stock",
        "difficulty": "Easy",
        "method": "maxProfit",
        "args": ["prices"],
        "test_cases": [
            {"prices": [7, 1, 5, 3, 6, 4], "expected": 5},
            {"prices": [7, 6, 4, 3, 1], "expected": 0},
            {"prices": [2, 4, 1], "expected": 2},
        ],
        "validator": "equals",
        "description": (
            "You are given an array prices where prices[i] is the price of a given "
            "stock on the ith day. Return the maximum profit you can achieve from "
            "one transaction. If you cannot achieve any profit, return 0."
        ),
    },
    "maximum-subarray": {
        "id": 5,
        "slug": "maximum-subarray",
        "title": "Maximum Subarray",
        "difficulty": "Medium",
        "method": "maxSubArray",
        "args": ["nums"],
        "test_cases": [
            {"nums": [-2, 1, -3, 4, -1, 2, 1, -5, 4], "expected": 6},
            {"nums": [1], "expected": 1},
            {"nums": [5, 4, -1, 7, 8], "expected": 23},
        ],
        "validator": "equals",
        "description": (
            "Given an integer array nums, find the subarray with the largest sum, "
            "and return its sum."
        ),
    },
}


def get_problem(slug: str) -> dict | None:
    return PROBLEMS.get(slug)
