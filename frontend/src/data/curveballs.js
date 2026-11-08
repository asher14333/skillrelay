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
    examples: curveball.replaceTestCases ? curveball.examples : [...problem.examples, ...curveball.examples],
    curveballStartIndex: curveball.replaceTestCases ? 0 : problem.testCases.length,
    testCases: [...(curveball.replaceTestCases ? [] : problem.testCases), ...curveball.testCases.map(({ expected: _expected, ...input }) => input)],
  }
}


export function validGeneratedCurveball(value, problemId) {
  return value && typeof value.id === 'string' && /^ai-[a-zA-Z0-9-]{16,80}$/.test(value.id) &&
    value.problemId === problemId && ['title', 'prompt', 'requirement', 'description'].every(key => typeof value[key] === 'string' && value[key].trim()) &&
    ['details', 'constraints'].every(key => Array.isArray(value[key]) && value[key].every(line => typeof line === 'string')) &&
    Array.isArray(value.examples) && value.examples.every(example => typeof example?.input === 'string' && typeof example.output === 'string') &&
    value.replaceTestCases === true && Array.isArray(value.testCases) && value.testCases.length > 0 && value.testCases.length <= 12 &&
    value.testCases.every(test => test && typeof test === 'object' && Object.hasOwn(test, 'expected'))
}
