// Run through playwright-cli run-code --filename=tests/curveball-ui.js on localhost.
// Fresh browser data; /run executes the real local Python runner. AI replies are fixtures.
// eslint-disable-next-line no-unused-expressions -- The CLI evaluates a function expression.
async page => {
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const origin = new URL(page.url()).origin
  assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Use the local app')
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } })
  const ui = await context.newPage()
  ui.setDefaultTimeout(7000)
  const checks = []
  const fixture = 'Automated curveball fixture: no live AI call.'
  const requests = { run: [], review: [], analyze: [], retry: [], interview: [] }
  const errors = []
  let latestRun = null
  let reviewGate = null
  let reviewDone = null
  const baseCode = `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, value in enumerate(nums):
            complement = target - value
            if complement in seen:
                return [seen[complement], i]
            seen[value] = i
`
  const adaptedCode = baseCode + '        return []\n'
  const original = 'I use a hash map to find two distinct indices in one pass. The original problem guarantees a matching pair.'
  const revised = 'I return an empty list after the loop if no matching pair exists. The hash map keeps earlier values, so a found pair uses distinct indices. I checked [1,2,3] with target 99 and [3,3] with target 7; both return [].'
  const criteria = ['memory', 'growth', 'bound'].map(id => ({ id, label: id }))
  ui.on('pageerror', error => errors.push(error.message))
  const frames = () => ui.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  try {
    await ui.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      const data = route.request().postDataJSON()
      if (path === '/api/run') {
        requests.run.push(data)
        const response = await route.fetch()
        latestRun = await response.json()
        return route.fulfill({ response })
      }
      if (path === '/api/curveball/review') {
        requests.review.push(data)
        const gate = reviewGate
        try {
          if (gate) await gate
          await route.fulfill({ json: { run: latestRun, feedback: {
            summary: fixture,
            checks: ['requirementUnderstanding', 'adaptation', 'verification'].map(id => ({ id, label: id, met: true, quote: data.transcript, note: fixture })),
            nextStep: 'Explain one more no-match example.',
          } } })
        } catch { /* An interrupted review is intentionally aborted by the UI. */ }
        finally { reviewDone?.() }
        return
      }
      if (path === '/api/analyze') {
        requests.analyze.push(data)
        const rubric = Object.fromEntries([['problemUnderstanding', 2], ['bruteForce', 2], ['optimization', 2], ['timeComplexity', 1], ['spaceComplexity', 1], ['clarity', 2]]
          .map(([key, max]) => [key, { score: max, max, note: fixture }]))
        return route.fulfill({ json: {
          score: 10, passed: true, rubric, strengths: [{ text: fixture }], improvements: [], replayInsights: [],
          learningPlan: { id: 'curveball-fixture', dimension: 'spaceComplexity', title: 'Explain the memory trade-off', reason: fixture, minutes: 3,
            action: 'retry', steps: ['Explain extra storage.'], practicePrompt: 'Explain your own map size.', selfCheck: 'Did you justify the map size?' },
          focusedPractice: { spaceComplexity: { prompt: 'Explain extra storage.', criteria } },
        } })
      }
      if (path === '/api/practice/retry') {
        requests.retry.push(data)
        return route.fulfill({ json: {
          dimension: 'spaceComplexity', beforeMet: 0, afterMet: 3, total: 3, summary: fixture, nextStep: 'Try another example.',
          checks: criteria.map(item => ({ ...item, before: { met: false, quote: null, note: fixture }, after: { met: true, quote: data.after, note: fixture } })),
        } })
      }
      if (path === '/api/interview/start') {
        requests.interview.push(data)
        return route.fulfill({ json: { question: `${fixture} How did the changed requirement affect your approach?` } })
      }
      throw new Error(`Unexpected API request ${path}`)
    })
    await ui.goto(origin)
    const editor = ui.getByRole('textbox', { name: 'Editor content', exact: true })
    const explanation = ui.getByRole('textbox', { name: 'Your solution explanation', exact: true })
    await editor.waitFor()
    const setCode = async code => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await ui.evaluate(text => navigator.clipboard.writeText(text), code)
      await editor.focus(); await editor.press('ControlOrMeta+a'); await editor.press('ControlOrMeta+v')
    }
    const run = async () => {
      const response = ui.waitForResponse(response => new URL(response.url()).pathname === '/api/run')
      await ui.getByRole('button', { name: 'Run code', exact: true }).click()
      const payload = await (await response).json()
      await ui.getByRole('button', { name: 'Run code', exact: true }).waitFor({ state: 'visible' })
      await ui.waitForFunction(() => !document.querySelector('.btn-run-lc').disabled)
      return payload
    }
    await setCode(baseCode)
    await explanation.fill(original)
    const initial = await run()
    assert(initial.passed === 3, `Original code should pass all three original cases: ${JSON.stringify(initial)}; code=${JSON.stringify(requests.run.at(-1)?.code)}`)
    await ui.getByRole('button', { name: 'Reveal curveball', exact: true }).click()
    assert(await explanation.inputValue() === original, 'Reveal must preserve the explanation')
    await ui.getByRole('button', { name: 'Test cases', exact: true }).click()
    assert(await ui.getByRole('button', { name: 'New case 4', exact: true }).isVisible(), 'Reveal must add new executable cases')
    assert(!(await ui.locator('.problem-body').innerText()).includes('You may assume that each input would have exactly one solution'), 'Original guarantee must be replaced')
    await ui.locator('.curveball-baseline summary').click()
    assert((await ui.locator('.curveball-baseline pre').innerText()).trimEnd() === baseCode.trimEnd(), 'Before-code evidence should be frozen at reveal')
    await ui.locator('.curveball-baseline summary').click()
    const failed = await run()
    assert(failed.passed === 3 && failed.total === 5, `Original implementation should fail the two newly required no-match cases: ${JSON.stringify(failed)}; variant=${requests.run.at(-1)?.curveballId}`)
    await setCode(adaptedCode)
    await explanation.fill(revised)
    const passed = await run()
    assert(passed.passed === 5 && passed.all_passed, 'Adapted implementation must pass all five real runner cases')
    await ui.getByRole('button', { name: 'Review my adaptation', exact: true }).click()
    await ui.getByRole('heading', { name: 'Your adaptation review', exact: true }).waitFor()
    const review = requests.review[0]
    assert(review.beforeCode === baseCode && review.beforeTranscript === original, 'Review should keep the original code and explanation')
    assert(review.code === adaptedCode && review.transcript === revised && review.curveballId === 'two-sum-no-match', 'Review should send current evidence with the active variant')
    checks.push('Real runner: original 3/3 → changed requirement 3/5 → adapted solution 5/5; frozen before/after evidence')

    let release
    reviewGate = new Promise(resolve => { release = resolve })
    const completed = new Promise(resolve => { reviewDone = resolve })
    const requested = ui.waitForRequest(request => new URL(request.url()).pathname === '/api/curveball/review')
    await ui.getByRole('button', { name: 'Review my adaptation', exact: true }).click()
    await requested
    await explanation.fill(revised + ' I am revising my verification evidence.')
    release(); await completed; await frames()
    reviewGate = null; reviewDone = null
    assert(await ui.getByRole('heading', { name: 'Your adaptation review', exact: true }).count() === 0, 'An interrupted review must not attach to edited evidence')
    assert(await ui.getByRole('button', { name: 'Review my adaptation', exact: true }).isEnabled(), 'Editing must allow a fresh review')
    checks.push('Delayed adaptation review is cancelled when the learner edits the explanation')

    await ui.getByRole('button', { name: 'Get session feedback', exact: true }).click()
    await ui.getByRole('heading', { name: 'Your practice feedback', exact: true }).waitFor()
    assert(requests.analyze.at(-1).curveballId === 'two-sum-no-match', 'Session feedback must use the changed contract')
    await ui.getByRole('button', { name: 'Save practice', exact: true }).click()
    await ui.getByRole('button', { name: 'Practice this lesson', exact: true }).click()
    await ui.getByRole('textbox', { name: 'Write a focused answer', exact: true }).fill('The map stores at most n earlier values, so it needs O(n) additional memory.')
    await ui.getByRole('button', { name: 'Compare explanations', exact: true }).click()
    await ui.getByRole('heading', { name: 'Your before-and-after evidence', exact: true }).waitFor()
    assert(requests.retry.at(-1).curveballId === 'two-sum-no-match', 'Focused retry must keep the changed contract')
    await ui.getByRole('button', { name: 'Follow-up', exact: true }).click()
    await ui.getByRole('button', { name: 'Start follow-up practice', exact: true }).click()
    await ui.getByRole('textbox', { name: 'Your follow-up answer', exact: true }).waitFor()
    assert(requests.interview.at(-1).curveballId === 'two-sum-no-match', 'Follow-up must keep the changed contract')
    await ui.getByRole('link', { name: /Progress/ }).click()
    await ui.getByText('Curveball: No matching pair', { exact: true }).waitFor()
    checks.push('Analysis, focused retry and follow-up retain variant context; saved history labels the requirement')

    await ui.getByRole('link', { name: 'Practice', exact: true }).click()
    for (const width of [320, 1024, 1440]) {
      await ui.setViewportSize({ width, height: 900 })
      await frames()
      assert(await ui.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Changed requirement overflows at ${width}px`)
    }
    await ui.getByRole('button', { name: 'Change', exact: true }).click()
    await ui.getByRole('button', { name: /Valid Parentheses/ }).click()
    await ui.getByRole('button', { name: 'Switch challenge', exact: true }).click()
    await ui.getByRole('button', { name: 'Reveal curveball', exact: true }).waitFor()
    await ui.getByRole('button', { name: 'Code & explain', exact: true }).click()
    const ordinary = await run()
    assert(ordinary.total === 5 && requests.run.at(-1).curveballId === null, 'Changing problems should restore the ordinary contract and clear variant context')
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`)
    checks.push('Changed requirement fits phone/laptop/desktop; switching challenge restores ordinary test catalog')
    return { checks, runner: 'Real local Python execution', ai: fixture, isolatedContext: true }
  } finally { await context.close() }
}
