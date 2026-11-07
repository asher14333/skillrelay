export const DEFAULT_GOAL = 'clear-explanations'

export const LEARNING_GOALS = [
  {
    id: 'clear-explanations',
    title: 'Explain clearly',
    description: 'Turn your thinking into an explanation someone else can follow.',
  },
  {
    id: 'technical-tradeoffs',
    title: 'Explain trade-offs',
    description: 'Make runtime, memory, and approach choices understandable.',
  },
  {
    id: 'interview-confidence',
    title: 'Build interview confidence',
    description: 'Practice moving from the problem to a structured solution.',
  },
]

export function getLearningGoal(id) {
  return LEARNING_GOALS.find((goal) => goal.id === id)
}
