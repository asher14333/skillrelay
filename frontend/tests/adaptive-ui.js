// Isolated UI regression. Gemini decisions/audio and runner results are labeled
// fixtures; real generated-contract/oracle behavior is covered by backend tests.
// eslint-disable-next-line no-unused-expressions -- Playwright CLI evaluates the function.
async page => {
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const origin = new URL(page.url()).origin
  assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Use the local app')
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } })
  const ui = await context.newPage()
  ui.setDefaultTimeout(7000)
  const fixture = 'Adaptive interview fixture: no live AI, audio or Python call.'
  const requests = { checkpoint: [], speech: [], run: [], analyze: [], retry: [], interview: [] }
  const checks = []
  const errors = []
  const id = 'ai-adaptive-fixture-0001'
  const definition = {
    id, problemId: 'two-sum', generated: true, replaceTestCases: true,
    title: 'No-match sentinel indices',
    prompt: 'A client now expects two sentinel indices when there is no matching pair. How would you adapt?',
    requirement: 'Return [-1,-1] when no pair exists; otherwise return two distinct matching indices.',
    description: 'Find two distinct indices whose values sum to target, or return [-1,-1].',
    details: ['A matching pair is not guaranteed. Return [-1,-1] when none exists.'],
    constraints: ['2 <= nums.length <= 100', 'Return original indices for a matching pair.'],
    examples: [{ input: 'nums=[4,1,8], target=99', output: '[-1,-1]' }],
    testCases: [{ nums: [2, 7, 11, 15], target: 9, expected: [0, 1] }, { nums: [4, 1, 8], target: 99, expected: [-1, -1] }, { nums: [3, 3], target: 6, expected: [0, 1] }],
  }
  const original = 'I use a map to find a pair of distinct indices in one pass and store each value after checking its complement.'
  const revised = 'The client now expects [-1,-1] when no matching pair exists. I return those sentinel indices after the loop. I checked [4,1,8] with target 99 and retained valid original indices for a matching pair. The map uses O(n) extra space.'
  const code = 'class Solution:\n    def twoSum(self, nums, target):\n        seen = {}\n        for i, value in enumerate(nums):\n            if target-value in seen:\n                return [seen[target-value], i]\n            seen[value] = i\n        return [-1, -1]\n'
  const criteria = ['memory', 'growth', 'bound'].map(key => ({ id: key, label: key }))
  let nextAction = 'continue'
  let gate = null
  let gateDone = null
  let expired = false
  ui.on('pageerror', error => errors.push(error.message))
  try {
    await ui.addInitScript(() => {
      window.__adaptiveAudio = []
      window.Audio = class {
        constructor(src) { this.src = src; window.__adaptiveAudio.push(this) }
        play() { this.onplaying?.(); return Promise.resolve() }
        pause() { this.paused = true }
        load() {}
        removeAttribute(name) { if (name === 'src') this.src = '' }
      }
      class Speech {
        start() { window.__adaptiveSpeech = this; this.onstart?.() }
        stop() { this.stopping = true }
        abort() { this.onend?.() }
      }
      window.SpeechRecognition = Speech
      window.webkitSpeechRecognition = Speech
    })
    await ui.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      const data = route.request().postDataJSON()
      if (path === '/api/interview/checkpoint') {
        requests.checkpoint.push(data)
        const action = nextAction
        const message = action === 'curveball' ? 'Try the generated sentinel contract.' : action === 'question' ? 'Why does checking before insertion preserve distinct indices?' : 'Continue explaining your approach.'
        const pending = gate
        try {
          if (pending) await pending
          return await route.fulfill({ json: { action, message, reason: fixture, ...(action === 'curveball' ? { curveball: definition } : {}) } })
        } catch { /* A cancelled turn intentionally aborts its response. */ }
        finally { gateDone?.() }
        return
      }
      if (path === '/api/speech') {
        requests.speech.push(data)
        return route.fulfill({ contentType: 'audio/wav', body: Buffer.from('UklGRiYAAABXQVZFZm10IBAAAAABAAEAwF0AAIC7AAACABAAZGF0YQIAAAAAAA==', 'base64') })
      }
      if (path === '/api/run') {
        requests.run.push(data)
        if (expired) return route.fulfill({ status: 400, json: { error: 'The AI-generated requirement expired. Return to original requirements and start a new interview.' } })
        const cases = definition.testCases
        const results = cases.map((test, index) => ({ case: index + 1, input: JSON.stringify(test), expected: test.expected, output: test.expected, passed: true }))
        return route.fulfill({ json: { results, passed: results.length, total: results.length, all_passed: true } })
      }
      if (path === '/api/analyze') {
        requests.analyze.push(data)
        const rubric = Object.fromEntries([['problemUnderstanding', 2], ['bruteForce', 2], ['optimization', 2], ['timeComplexity', 1], ['spaceComplexity', 1], ['clarity', 2]].map(([key, max]) => [key, { score: max, max, note: fixture }]))
        return route.fulfill({ json: { score: 10, passed: true, rubric, strengths: [{ text: fixture }], improvements: [], replayInsights: [],
          learningPlan: { id: 'adaptive-fixture', dimension: 'spaceComplexity', title: 'Explain the map size', reason: fixture, minutes: 3, action: 'retry', steps: ['Explain the memory bound.'], practicePrompt: 'Explain extra storage.', selfCheck: 'Did you justify O(n)?' },
          focusedPractice: { spaceComplexity: { prompt: 'Explain the map size.', criteria } } } })
      }
      if (path === '/api/practice/retry') {
        requests.retry.push(data)
        return route.fulfill({ json: { dimension: 'spaceComplexity', beforeMet: 0, afterMet: 3, total: 3, summary: fixture, nextStep: 'Try another example.', checks: criteria.map(check => ({ ...check, before: { met: false, quote: null, note: fixture }, after: { met: true, quote: data.after, note: fixture } })) } })
      }
      if (path === '/api/interview/start') {
        requests.interview.push(data)
        return route.fulfill({ json: { question: 'Adaptive fixture: explain the sentinel decision.' } })
      }
      throw new Error(`Unexpected fixture API request ${path}`)
    })
    await ui.goto(origin)
    const editor = ui.getByRole('textbox', { name: 'Editor content', exact: true })
    const explanation = ui.getByRole('textbox', { name: 'Your solution explanation', exact: true })
    const start = ui.getByRole('button', { name: 'Start live interview', exact: true })
    const pause = ui.getByRole('button', { name: 'Pause interview', exact: true })
    const chat = ui.getByRole('log', { name: 'Interview conversation', exact: true })
    const startTextInterview = async () => {
      await start.click()
      await ui.getByRole('button', { name: 'AI voice on', exact: true }).click()
    }
    const checkpointResponse = () => ui.waitForResponse(response => new URL(response.url()).pathname === '/api/interview/checkpoint')
    await editor.waitFor()
    await ui.getByRole('combobox', { name: 'Interview input', exact: true }).selectOption('text')
    await explanation.fill(original)
    await ui.waitForTimeout(3300)
    assert(requests.checkpoint.length === 0 && requests.speech.length === 0, 'Before Start, no interview or audio requests should occur')
    assert(await ui.getByRole('button', { name: 'Check now', exact: true }).count() === 0, 'The conversation must not require a Check now button')
    const automatic = checkpointResponse()
    await startTextInterview()
    await ui.waitForTimeout(500)
    assert(requests.checkpoint.length === 0, 'Starting should wait for a quiet pause')
    await automatic
    await chat.getByText('Continue explaining your approach.', { exact: true }).waitFor()
    assert(await chat.getByText(original, { exact: true }).isVisible(), 'The chat must show the candidate turn beside the interviewer response')
    assert(requests.checkpoint.length === 1, 'A pause should trigger exactly one automatic turn')
    await pause.click()
    checks.push('Opt-in typed conversation automatically replies after a pause and shows both chat bubbles without Check now')

    nextAction = 'question'
    await explanation.fill(original + ' The complement lookup happens before insertion.')
    const questionResponse = checkpointResponse()
    await startTextInterview()
    await questionResponse
    await chat.getByText('Why does checking before insertion preserve distinct indices?', { exact: true }).waitFor()
    assert(requests.checkpoint.at(-1).transcript.includes('before insertion'), 'The question should use the current finalized explanation')
    assert(requests.speech.length === 0, 'Muting must retain visible chat without synthesizing audio')
    checks.push('A contextual question appears automatically in chat and retains the current explanation while voice is muted')

    let release
    gate = new Promise(resolve => { release = resolve })
    let completed = new Promise(resolve => { gateDone = resolve })
    nextAction = 'curveball'
    const waiting = ui.waitForRequest(request => new URL(request.url()).pathname === '/api/interview/checkpoint')
    await explanation.fill(original + ' I am considering another edge case.')
    await waiting
    await explanation.fill(original + ' I changed my explanation before the turn returned.')
    release(); await completed
    gate = null; gateDone = null
    await pause.click()
    assert(await ui.getByText(definition.title, { exact: true }).count() === 0, 'A stale curveball must not attach after explanation edits')

    gate = new Promise(resolve => { release = resolve })
    completed = new Promise(resolve => { gateDone = resolve })
    await explanation.fill(original + ' Now test cancelling with Pause.')
    const pausing = ui.waitForRequest(request => new URL(request.url()).pathname === '/api/interview/checkpoint')
    await startTextInterview(); await pausing
    await pause.click()
    release(); await completed
    gate = null; gateDone = null
    assert(await ui.getByText(definition.title, { exact: true }).count() === 0, 'Pause should discard a pending generated requirement')

    gate = new Promise(resolve => { release = resolve })
    completed = new Promise(resolve => { gateDone = resolve })
    nextAction = 'question'
    await explanation.fill(original + ' I am about to change workspace views.')
    const leaving = ui.waitForRequest(request => new URL(request.url()).pathname === '/api/interview/checkpoint')
    await startTextInterview(); await leaving
    await ui.getByRole('button', { name: 'Follow-up', exact: true }).click()
    release(); await completed
    gate = null; gateDone = null
    await ui.getByRole('button', { name: 'Code & explain', exact: true }).click()
    await start.waitFor()
    assert(await chat.getByText('Why does checking before insertion preserve distinct indices?', { exact: true }).count() === 1, 'A hidden pending turn must not append another AI message')
    checks.push('Explanation edits, Pause and navigation discard pending turns without stale requirement or chat updates')

    nextAction = 'curveball'
    await explanation.fill(original + ' Please consider the no-pair behavior now.')
    await startTextInterview()
    await ui.getByText(definition.title, { exact: true }).waitFor()
    await chat.getByText('Requirement change', { exact: true }).waitFor()
    await pause.click()
    assert(await explanation.inputValue() === original + ' Please consider the no-pair behavior now.', 'Generated requirements must preserve the explanation')
    const body = await ui.locator('.problem-body').innerText()
    assert(await ui.getByRole('button', { name: 'New case 1', exact: true }).isVisible(), 'Generated executable cases must replace the original catalog')
    assert(body.includes('[-1,-1]') && !body.includes('Return an empty list when no two'), 'UI should display generated sentinel behavior, not the old hardcoded empty-list requirement')
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await ui.evaluate(text => navigator.clipboard.writeText(text), code)
    await editor.focus(); await editor.press('ControlOrMeta+a'); await editor.press('ControlOrMeta+v')
    await explanation.fill(revised)
    await ui.getByRole('button', { name: 'Run code', exact: true }).click()
    await ui.getByText('Accepted · 3/3 checks passed', { exact: true }).waitFor()
    assert(requests.run.at(-1).curveballId === id, 'The runner must receive the generated contract ID')
    expired = true
    await ui.getByRole('button', { name: 'Run code', exact: true }).click()
    await ui.getByRole('alert').filter({ hasText: 'requirement expired' }).waitFor()
    assert(await explanation.inputValue() === revised, 'An expired server definition must not delete the explanation')
    assert((await ui.locator('.monaco-editor .view-lines').innerText()).replace(/\u00a0/g, ' ').includes('return [-1, -1]'), 'An expiry error must not delete the code')
    expired = false
    for (const width of [320, 1024, 1440]) {
      await ui.setViewportSize({ width, height: 900 })
      assert(await ui.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Generated requirement UI overflows at ${width}px`)
    }
    checks.push('Generated contract and cases replace the old catalog; runner receives the ID and expiry errors preserve work')

    await ui.getByRole('button', { name: 'Get session feedback', exact: true }).click()
    await ui.getByRole('heading', { name: 'Your practice feedback', exact: true }).waitFor()
    assert(requests.analyze.at(-1).curveballId === id, 'Feedback must keep the generated contract')
    await ui.getByRole('button', { name: 'Save practice', exact: true }).click()
    await ui.getByRole('button', { name: 'Practice this lesson', exact: true }).click()
    await ui.getByRole('textbox', { name: 'Write a focused answer', exact: true }).fill('The map stores at most n earlier values, so it requires O(n) extra memory.')
    await ui.getByRole('button', { name: 'Compare explanations', exact: true }).click()
    await ui.getByRole('heading', { name: 'Your before-and-after evidence', exact: true }).waitFor()
    assert(requests.retry.at(-1).curveballId === id, 'Retry must keep the generated contract')
    await ui.getByRole('button', { name: 'Follow-up', exact: true }).click()
    await ui.getByRole('button', { name: 'Start follow-up practice', exact: true }).click()
    await ui.getByRole('textbox', { name: 'Your follow-up answer', exact: true }).waitFor()
    assert(requests.interview.at(-1).curveballId === id, 'Follow-up must keep the generated contract')
    await ui.getByRole('button', { name: 'Return to original requirements', exact: true }).click()
    await ui.getByRole('button', { name: 'Start live interview', exact: true }).waitFor()
    assert(await explanation.inputValue() === revised, 'Returning to original requirements must keep the explanation')
    assert((await ui.locator('.monaco-editor .view-lines').innerText()).replace(/\u00a0/g, ' ').includes('return [-1, -1]'), 'Returning to original requirements must keep the code')
    await ui.getByRole('button', { name: 'Run code', exact: true }).click()
    await ui.getByText('Accepted · 3/3 checks passed', { exact: true }).waitFor()
    assert(requests.run.at(-1).curveballId === null, 'Returning to original requirements must clear the dynamic ID')
    checks.push('Returning to original requirements preserves work, clears the variant, and pauses automatic turns')
    await ui.getByRole('link', { name: /Progress/ }).click()
    await ui.getByText('Curveball: ' + definition.title, { exact: true }).waitFor()
    await ui.reload()
    await ui.getByText('Curveball: ' + definition.title, { exact: true }).waitFor()
    checks.push('Generated contract ID reaches feedback/retry/follow-up and its title survives saved-history reload')
    await ui.getByRole('link', { name: 'Practice', exact: true }).click()
    for (const width of [320, 1024, 1440]) {
      await ui.setViewportSize({ width, height: 900 })
      assert(await ui.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Adaptive UI overflows at ${width}px`)
    }
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`)
    checks.push('Adaptive workspace fits 320, 1024 and 1440px without console exceptions')
    return { checks, fixture, isolatedContext: true }
  } finally { await context.close() }
}
