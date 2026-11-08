// Run in a fresh isolated local-app browser session with:
// npx playwright cli -s=notleetyet-ui run-code --filename=tests/reliability-ui.js
// All AI/runner responses are labeled fixtures. SpeechRecognition below is a
// simulated browser API: this test never requests microphone access or records.
// eslint-disable-next-line no-unused-expressions -- The CLI evaluates this file as a function expression.
async page => {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const within = async (promise, label) => {
    let timer
    try {
      return await Promise.race([promise, new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Timed out: ${label}`)), 10000)
      })])
    } finally { clearTimeout(timer) }
  }
  const checks = []
  const fixture = 'Reliability UI fixture: no live AI, runner, or microphone.'

  await page.addInitScript(() => {
    class SimulatedRecognition {
      start() {
        window.__notleetyetSimulatedSpeech = this
        queueMicrotask(() => this.onstart?.())
      }
      // The test deliberately controls when the final result/end arrive.
      stop() { this.stopping = true }
      abort() { this.onend?.() }
    }
    window.SpeechRecognition = SimulatedRecognition
    window.webkitSpeechRecognition = SimulatedRecognition
  })
  await page.reload()
  await page.setViewportSize({ width: 1440, height: 900 })

  const spaceCriteria = ['memory', 'growth', 'bound'].map(id => ({ id, label: `Fixture space criterion: ${id}` }))
  const clarityCriteria = ['structure', 'example', 'conclusion'].map(id => ({ id, label: `Fixture clarity criterion: ${id}` }))
  const rubric = Object.fromEntries([
    ['problemUnderstanding', 2], ['bruteForce', 2], ['optimization', 2],
    ['timeComplexity', 1], ['spaceComplexity', 1], ['clarity', 2],
  ].map(([key, max]) => [key, { score: key === 'spaceComplexity' ? 0 : key === 'clarity' ? 1 : max, max, note: fixture }]))
  await page.route('**/api/analyze', async route => {
    const input = route.request().postDataJSON()
    await route.fulfill({ json: {
      score: 8, passed: true, rubric, strengths: [{ text: fixture }], improvements: ['Explain memory and structure.'],
      learningGoal: input.learningGoal,
      learningPlan: { id: 'fixture-memory', dimension: 'spaceComplexity', title: 'Fixture memory lesson',
        reason: fixture, minutes: 3, action: 'retry', steps: ['Identify storage.', 'Explain growth.'],
        practicePrompt: 'Explain the map memory.', selfCheck: 'How does it grow?' },
      replayInsights: [{ checkpointId: input.checkpoints.at(-1).id, dimension: 'clarity', kind: 'gap',
        observation: `${fixture} Practice the structure of your explanation.`,
        transcriptQuote: input.transcript, codeQuote: null }],
      focusedPractice: {
        spaceComplexity: { prompt: 'Explain memory.', criteria: spaceCriteria },
        clarity: { prompt: 'Explain the structure.', criteria: clarityCriteria },
      },
    } })
  })

  let delayedRoute
  let retryStarted
  let releaseRetry
  let delayedReplySettled
  const retryStartedPromise = new Promise(resolve => { retryStarted = resolve })
  const retryGate = new Promise(resolve => { releaseRetry = resolve })
  const retrySettled = new Promise(resolve => { delayedReplySettled = resolve })
  await page.route('**/api/practice/retry', async route => {
    delayedRoute = route
    retryStarted()
    await retryGate
    try {
      await route.fulfill({ json: {
        dimension: 'spaceComplexity', beforeMet: 0, afterMet: 3, total: 3,
        summary: 'STALE RETRY RESPONSE MUST NOT BE SAVED', nextStep: fixture,
        checks: spaceCriteria.map(item => ({ ...item,
          before: { met: false, quote: null, note: fixture },
          after: { met: true, quote: 'Memory draft to retain.', note: fixture } })),
      } })
    } catch { /* Expected if the abandoned request was canceled. */ }
    finally { delayedReplySettled() }
  })

  const explanation = page.getByRole('textbox', { name: 'Your solution explanation', exact: true })
  await explanation.fill('Original context: I find two distinct indices with a hash map.')
  await page.getByRole('button', { name: 'Get session feedback', exact: true }).click()
  await page.getByRole('heading', { name: 'Your practice feedback', exact: true }).waitFor()
  const lesson = page.getByRole('button', { name: 'Practice this lesson', exact: true })
  await lesson.click()
  const retryAnswer = page.getByRole('textbox', { name: 'Write a focused answer', exact: true })
  await retryAnswer.fill('Memory draft to retain.')
  await page.getByRole('button', { name: 'Back to feedback', exact: true }).click()
  await lesson.click()
  assert(await retryAnswer.inputValue() === 'Memory draft to retain.', 'Retry draft was lost after returning to the same lesson')
  checks.push('Retry draft survives Back to feedback and reopening the same lesson')

  await page.getByRole('button', { name: 'Compare explanations', exact: true }).click()
  await within(retryStartedPromise, 'retry request to start')
  const oldRequest = delayedRoute.request()
  let networkSettled
  const oldNetworkSettled = new Promise(resolve => { networkSettled = resolve })
  const settleOldRequest = request => { if (request === oldRequest) networkSettled() }
  page.on('requestfinished', settleOldRequest)
  page.on('requestfailed', settleOldRequest)
  try {
    await page.getByRole('button', { name: 'Back to feedback', exact: true }).click()
    await page.getByRole('button', { name: 'Practice this gap', exact: true }).click()
    await page.getByRole('heading', { name: 'Clarity', exact: true }).waitFor()
    await retryAnswer.fill('A new task has its own explanation.')
    releaseRetry()
    await within(Promise.all([retrySettled, oldNetworkSettled]), 'abandoned retry request to settle')
    await page.getByRole('button', { name: 'Back to feedback', exact: true }).click()
    assert(await page.locator('.retry-completed').count() === 0, 'An abandoned retry attached a stale comparison summary')
    assert(await page.getByText('STALE RETRY RESPONSE MUST NOT BE SAVED', { exact: true }).count() === 0, 'Abandoned retry result leaked into the UI')
  } finally {
    releaseRetry()
    page.off('requestfinished', settleOldRequest)
    page.off('requestfailed', settleOldRequest)
  }
  checks.push('Delayed result from a replaced retry task cannot attach to the current analysis')

  let startContext
  let responseMode = 'malformed'
  const submittedContexts = []
  await page.route('**/api/interview/start', async route => {
    startContext = route.request().postDataJSON()
    await route.fulfill({ json: { question: `${fixture} Explain your extra memory.` } })
  })
  await page.route('**/api/interview/respond', async route => {
    submittedContexts.push(route.request().postDataJSON())
    await route.fulfill({ json: responseMode === 'malformed' ? {
      answerEvaluation: { feedback: fixture }, complete: false, nextQuestion: '',
    } : {
      answerEvaluation: { feedback: fixture, score: 8, quote: null },
      complete: false, nextQuestion: `${fixture} What is the trade-off?`,
    } })
  })
  await page.getByRole('button', { name: 'Follow-up', exact: true }).click()
  await page.getByRole('button', { name: 'Start follow-up practice', exact: true }).click()
  const answer = page.getByRole('textbox', { name: 'Your follow-up answer', exact: true })
  await answer.waitFor()
  await page.getByRole('button', { name: 'Code & explain', exact: true }).click()
  await explanation.fill('Changed context: I now describe a different solution.')
  await page.locator('.monaco-editor .view-lines').click()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText('class ChangedSolution: pass')
  await page.getByRole('button', { name: 'Follow-up', exact: true }).click()
  await page.getByRole('button', { name: 'Restart with current work', exact: true }).waitFor()
  await answer.fill('My answer must survive a malformed model response.')
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click()
  await page.getByText('The interviewer returned an incomplete response. Your answer is still here; try again.', { exact: true }).waitFor()
  assert(await answer.inputValue() === 'My answer must survive a malformed model response.', 'Malformed response discarded the entered answer')
  assert(await page.getByRole('button', { name: 'Submit answer', exact: true }).isEnabled(), 'Malformed response left submission blocked')
  assert(submittedContexts[0].code === startContext.code && submittedContexts[0].transcript === startContext.transcript,
    'Follow-up request mixed changed code/explanation into an existing conversation')
  responseMode = 'valid'
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click()
  await page.getByText(`${fixture} What is the trade-off?`, { exact: true }).waitFor()
  checks.push('Follow-up retains its starting code/explanation and recovers without losing an answer after malformed output')

  await page.getByRole('button', { name: 'Record answer', exact: true }).click()
  await page.getByRole('button', { name: 'Stop recording', exact: true }).waitFor()
  await page.evaluate(() => {
    const result = Object.assign([{ transcript: 'An interim answer' }], { isFinal: false })
    window.__notleetyetSimulatedSpeech.onresult({ results: [result] })
  })
  await page.getByRole('button', { name: 'Stop recording', exact: true }).click()
  assert(await page.getByRole('button', { name: 'Submit answer', exact: true }).isDisabled(), 'Submit enabled before speech finalization')
  await page.getByRole('button', { name: 'Finishing transcript…', exact: true }).waitFor()
  await page.evaluate(() => {
    const recognition = window.__notleetyetSimulatedSpeech
    const result = Object.assign([{ transcript: 'The final answer includes O(n) extra space.' }], { isFinal: true })
    recognition.onresult({ results: [result] })
    recognition.onend()
  })
  // Submit remains visible while disabled. Wait for the idle-state control so
  // React has committed both the final transcript and recognition end event.
  await page.getByRole('button', { name: 'Record answer', exact: true }).waitFor({ state: 'visible' })
  assert(await page.getByRole('button', { name: 'Submit answer', exact: true }).isEnabled(), 'Submit did not recover after final speech event')
  await page.getByRole('button', { name: 'Submit answer', exact: true }).click()
  await page.getByText('The final answer includes O(n) extra space.', { exact: true }).waitFor()
  assert(submittedContexts.at(-1).answer === 'The final answer includes O(n) extra space.', 'Submitted answer omitted finalized simulated speech')
  checks.push('Simulated speech keeps Submit disabled from Stop through final result/onend; final words are submitted')

  await page.getByRole('button', { name: 'Code & explain', exact: true }).click()
  const changedCodeText = await page.locator('.monaco-editor .view-lines').innerText()
  assert(changedCodeText.includes('ChangedSolution'), 'Single-line editor edit did not reach the visible editor')
  await page.getByRole('button', { name: 'Reset code', exact: true }).click()
  await page.getByRole('button', { name: 'Undo reset', exact: true }).click()
  assert((await page.locator('.monaco-editor .view-lines').innerText()).includes('ChangedSolution'), 'Undo reset did not restore the working code')
  const guarded = await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    return event.defaultPrevented
  })
  assert(guarded, 'A working draft did not register the navigation guard')
  checks.push('Code reset can be undone and an unsaved practice draft registers a navigation guard')

  return { checks, providers: fixture, speech: 'Explicitly simulated; no microphone capture was tested.' }
}
