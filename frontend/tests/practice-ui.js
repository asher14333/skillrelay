// Run with: npx playwright cli -s=skillrelay-ui run-code --filename=tests/practice-ui.js
// The browser must already be open on the local app in a fresh session.
// AI responses below are labeled fixtures; browser persistence remains real.
// eslint-disable-next-line no-unused-expressions -- The CLI evaluates this file as a function expression.
async page => {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const checks = []
  const fixture = 'Automated UI fixture: no live AI call.'
  const rubric = Object.fromEntries([
    ['problemUnderstanding', 2], ['bruteForce', 2], ['optimization', 2],
    ['timeComplexity', 1], ['spaceComplexity', 1], ['clarity', 2],
  ].map(([key, max]) => [key, { score: key === 'spaceComplexity' ? 0 : max, max, note: fixture }]))
  const criteria = [
    { id: 'memory', label: 'Identify the extra memory used' },
    { id: 'growth', label: 'Explain how that memory grows' },
    { id: 'bound', label: 'State and justify the space bound' },
  ]
  await page.route('**/api/analyze', route => route.fulfill({ json: {
    score: 9, passed: true, rubric, strengths: [{ text: fixture }], improvements: ['Explain extra memory.'],
    learningGoal: 'technical-tradeoffs', replayInsights: [],
    learningPlan: { id: 'account-for-memory', dimension: 'spaceComplexity', title: 'Account for the memory your solution uses',
      reason: fixture, minutes: 3, action: 'retry', steps: ['Identify extra storage.', 'Explain how it grows.', 'Justify the bound.'],
      practicePrompt: 'Explain how the map grows with the input.', selfCheck: 'Did you distinguish extra memory from the input?' },
    focusedPractice: { spaceComplexity: { prompt: 'Explain extra memory.', criteria } },
  } }))
  await page.route('**/api/practice/retry', route => route.fulfill({ json: {
    dimension: 'spaceComplexity', beforeMet: 0, afterMet: 3, total: 3, summary: fixture, nextStep: 'Try another example.',
    checks: criteria.map(item => ({ ...item, before: { met: false, quote: null, note: fixture },
      after: { met: true, quote: 'The map grows with n.', note: fixture } })),
  } }))
  await page.route('**/api/interview/start', route => route.fulfill({ json: { question: `${fixture} What memory does the map need?` } }))
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.getByRole('combobox', { name: 'Your learning focus' }).selectOption('technical-tradeoffs')
  const explanation = page.getByRole('textbox', { name: 'Your solution explanation', exact: true })
  await explanation.fill('I find two distinct array indices that sum to the target. A hash map lets me find earlier complements in one pass.')
  await page.getByRole('button', { name: 'Get session feedback', exact: true }).click()
  const feedback = page.getByRole('heading', { name: 'Your practice feedback', exact: true })
  await feedback.waitFor()
  assert(await feedback.evaluate(el => document.activeElement === el), 'Feedback heading should receive focus')
  const scoreBox = await page.locator('.feedback-overview').boundingBox()
  const lessonBox = await page.locator('.learning-card').boundingBox()
  const replayBox = await page.locator('.replay-panel').boundingBox()
  assert(scoreBox.y < lessonBox.y && lessonBox.y < replayBox.y, 'Score and next lesson should precede replay')
  const lessonButton = page.getByRole('button', { name: 'Practice this lesson', exact: true })
  const actionBox = await lessonButton.boundingBox()
  assert(actionBox.y + actionBox.height <= 900, 'Next practice action should fit in the desktop viewport')
  await page.getByText('Read the lesson', { exact: true }).click()
  assert(await page.getByText('Identify extra storage.', { exact: true }).isVisible(), 'Lesson steps should expand')
  await page.getByText('Read the lesson', { exact: true }).click()
  checks.push('Feedback focus, hierarchy, visible next action, and lesson disclosure')
  await page.getByRole('button', { name: 'Save practice', exact: true }).click()
  await lessonButton.click()
  const retryHeading = page.getByRole('heading', { name: 'Space Complexity', exact: true })
  assert(await retryHeading.evaluate(el => document.activeElement === el), 'Retry heading should receive focus')
  await page.getByRole('textbox', { name: 'Write a focused answer' }).fill('The map grows with n. Each entry uses constant space, so extra space is O(n).')
  await page.getByRole('button', { name: 'Compare explanations', exact: true }).click()
  await page.getByRole('heading', { name: 'Your before-and-after evidence' }).waitFor()
  await page.getByRole('button', { name: 'Return to session feedback' }).click()
  await page.getByRole('button', { name: 'Update saved practice', exact: true }).click()
  await lessonButton.click()
  // Regression: changing this select used to clear the task but leave the retry
  // tab active, rendering an empty workspace.
  await page.getByRole('combobox', { name: 'Your learning focus' }).selectOption('interview-confidence')
  await page.getByRole('button', { name: 'Run code', exact: true }).waitFor()
  assert((await explanation.inputValue()).includes('two distinct array indices'), 'Goal changes must preserve the explanation')
  checks.push('Goal change exits retry and preserves the working explanation')
  await page.getByRole('button', { name: 'Follow-up', exact: true }).click()
  await page.getByRole('button', { name: 'Start follow-up practice' }).click()
  const answer = page.getByRole('textbox', { name: 'Your follow-up answer' })
  await answer.waitFor()
  assert(await answer.evaluate(el => document.activeElement === el), 'Follow-up answer should receive focus')
  assert(await page.getByRole('log', { name: 'Follow-up conversation' }).isVisible(), 'Conversation should have an accessible live log')
  checks.push('Follow-up answer label, focus, and live log')
  await page.getByRole('link', { name: 'Progress 1', exact: true }).click()
  await page.reload()
  await page.getByRole('heading', { name: 'Saved practice', exact: true }).waitFor()
  assert(await page.getByText(/Focused retry.*0\/3.*3\/3/).isVisible(), 'Retry summary should survive reload on one attempt')
  checks.push('One saved practice with persisted retry summary')
  await page.getByRole('button', { name: 'Continue practice', exact: true }).click()
  const responsive = []
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 })
    const sizes = await page.evaluate(() => ({ width: innerWidth, page: document.documentElement.scrollWidth }))
    assert(sizes.page <= sizes.width, `Page overflows at ${width}px`)
    responsive.push(width)
  }
  await page.setViewportSize({ width: 1440, height: 900 })
  // Leave a clearly labeled feedback state available for visual inspection.
  await explanation.fill('I find two indices with a hash map in one pass. The memory analysis is missing in this automated fixture.')
  await page.getByRole('button', { name: 'Get session feedback', exact: true }).click()
  await feedback.waitFor()
  return { checks, responsive, ai: fixture }
}
