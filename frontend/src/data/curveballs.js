import catalog from '../../../shared/curveballs.json' with { type: 'json' }

export const curveballs = catalog
export const getCurveball = problemId => curveballs.find(item => item.problemId === problemId)
export const findCurveball = id => curveballs.find(item => item.id === id)

export function withCurveball(problem, curveball) {
  if (!curveball) return problem
  return {
    ...problem,
    description: curveball.description || problem.description,
    details: curveball.details,
    constraints: curveball.constraints,
    examples: [...problem.examples, ...curveball.examples],
    curveballStartIndex: problem.testCases.length,
    testCases: [...problem.testCases, ...curveball.testCases.map(({ expected: _expected, ...input }) => input)],
  }
}
