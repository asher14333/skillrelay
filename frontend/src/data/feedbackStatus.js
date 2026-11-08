export const RUBRIC_ORDER = ['problemUnderstanding', 'bruteForce', 'optimization', 'timeComplexity', 'spaceComplexity', 'clarity']

// Status is always shown with an icon and a word, never color alone.
export function skillStatus(item) {
  if (!item || !item.max) return { id: 'missing', label: 'Missing', icon: 'close' }
  if (item.score >= item.max) return { id: 'strong', label: 'Strong', icon: 'check' }
  if (item.score <= 0) return { id: 'missing', label: 'Missing', icon: 'close' }
  return { id: 'partial', label: 'Partial', icon: 'minus' }
}

export function scoreTone(score) {
  if (score >= 8) return { id: 'strong', label: 'Strong session' }
  if (score >= 5) return { id: 'partial', label: 'Good start' }
  return { id: 'missing', label: 'Needs work' }
}

export function rubricEntries(rubric) {
  return RUBRIC_ORDER.filter(key => rubric?.[key]).map(key => [key, rubric[key]])
}
