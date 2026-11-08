// Hands-free App regression. Recognition, Gemini, audio and runner responses
// are controlled fixtures; no physical microphone or live provider is used.
// eslint-disable-next-line no-unused-expressions -- Playwright CLI evaluates this expression.
async page => {
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const origin = new URL(page.url()).origin
  assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Use the local app')
  const browser = page.context().browser()
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
  const ui = await context.newPage()
  ui.setDefaultTimeout(8000)
  const checks = []
  const requests = { checkpoint: [], speech: [] }
  const errors = []
  ui.on('pageerror', error => errors.push(error.message))
  const question = 'Hands-free fixture: why check the complement before inserting the value?'
  const definition = {
    id: 'ai-handsfree-fixture-0001', problemId: 'two-sum', generated: true, replaceTestCases: true,
    title: 'Return matching values', prompt: 'Return matching values, or an empty list if no pair exists.',
    requirement: 'Return two values from distinct positions, or [] if no pair exists.',
    description: 'Return matching values rather than their indices.',
    details: ['Keep distinct positions, but return the values.'], constraints: ['Use the same function name and arguments.'],
    examples: [{ input: 'nums=[2,7], target=9', output: '[2,7]' }],
    testCases: [{ nums: [2, 7], target: 9, expected: [2, 7] }, { nums: [1, 2], target: 99, expected: [] }],
  }
  let nextAction = 'question'
  let hold = false
  let release = null
  let requestFinished = null
  try {
    await context.addInitScript(() => {
      window.__handsfree = { starts: 0, stops: 0, active: false, audio: [], denied: false }
      class Recognition {
        start() {
          window.__handsfree.recognition = this
          window.__handsfree.starts += 1
          this.stopping = false
          if (window.__handsfree.denied) {
            queueMicrotask(() => { this.onerror?.({ error: 'not-allowed' }); this.onend?.() })
          } else {
            window.__handsfree.active = true
            queueMicrotask(() => this.onstart?.())
          }
        }
        stop() { this.stopping = true; window.__handsfree.active = false; window.__handsfree.stops += 1 }
        abort() { window.__handsfree.active = false; this.onend?.() }
      }
      window.SpeechRecognition = Recognition
      window.webkitSpeechRecognition = Recognition
      window.Audio = class {
        constructor(src) { this.src = src; this.paused = true; window.__handsfree.audio.push(this) }
        play() { this.paused = false; this.onplaying?.(); return Promise.resolve() }
        pause() { this.paused = true }
        load() {}
        removeAttribute() { this.src = '' }
        finish() { this.paused = true; this.onended?.() }
      }
    })
    await ui.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      const data = route.request().postDataJSON()
      if (path === '/api/interview/checkpoint') {
        requests.checkpoint.push(data)
        const action = nextAction
        try {
          if (hold) await new Promise(resolve => { release = resolve })
          await route.fulfill({ json: { action, message: action === 'curveball' ? definition.prompt : action === 'continue' ? 'Keep working.' : question,
            reason: 'Hands-free fixture: no live Gemini call.', curveball: action === 'curveball' ? definition : null } })
        } catch { /* Cancelled turns deliberately abort the fixture response. */ }
        finally { requestFinished?.() }
        return
      }
      if (path === '/api/speech') {
        requests.speech.push(data.text)
        return route.fulfill({ contentType: 'audio/wav', body: Buffer.alloc(48) })
      }
      throw new Error(`Unexpected fixture request ${path}`)
    })
    const emit = (text, final) => ui.evaluate(({ text, final }) => {
      const item = [{ transcript: text }]
      item.isFinal = final
      window.__handsfree.recognition.onresult?.({ results: [item], resultIndex: 0 })
    }, { text, final })
    const finishRecognition = () => ui.evaluate(() => { window.__handsfree.active = false; window.__handsfree.recognition.onend?.() })
    const audioFinished = () => ui.evaluate(() => window.__handsfree.audio.at(-1).finish())
    const log = ui.getByRole('log', { name: 'Interview conversation', exact: true })
    const start = ui.getByRole('button', { name: 'Start live interview', exact: true })
    const pause = ui.getByRole('button', { name: 'Pause interview', exact: true })
    await ui.goto(origin)
    await ui.getByRole('textbox', { name: 'Editor content', exact: true }).waitFor()
    assert(await ui.getByRole('button', { name: 'Check now', exact: true }).count() === 0, 'Normal interview flow must not require a Check now button')
    await ui.getByRole('button', { name: 'Live interview', exact: true }).click()
    await start.click()
    await ui.waitForFunction(() => window.__handsfree.starts === 1 && window.__handsfree.active)
    await ui.waitForTimeout(1800)
    assert(requests.checkpoint.length === 0, 'Initial silence must not generate interviewer turns')
    const first = 'I use a map to find an earlier complement before storing each current value.'
    await emit(first, false)
    await ui.waitForFunction(() => window.__handsfree.stops === 1)
    assert(requests.checkpoint.length === 0, 'Silence must finish recognition before requesting a response')
    await emit(first, true)
    await finishRecognition()
    await log.getByText(first, { exact: true }).waitFor()
    await log.getByText(question, { exact: true }).waitFor()
    await ui.waitForFunction(() => window.__handsfree.audio.length === 1 && !window.__handsfree.audio[0].paused)
    assert(requests.checkpoint.length === 1 && requests.checkpoint[0].transcript === first, 'One finalized utterance must cause exactly one automatic checkpoint')
    await ui.waitForTimeout(250)
    assert(await ui.evaluate(() => window.__handsfree.starts === 1 && !window.__handsfree.active), 'Recognition must remain stopped while AI is speaking')
    await audioFinished()
    await ui.waitForFunction(() => window.__handsfree.starts === 2 && window.__handsfree.active)
    checks.push('Start once, speak, pause, finalize, receive a visible spoken response, and resume only after actual audio end')

    nextAction = 'curveball'
    const second = 'Yes.'
    await emit(second, true)
    await ui.waitForFunction(() => window.__handsfree.stops === 2)
    await finishRecognition()
    await log.getByText(second, { exact: true }).waitFor()
    await log.getByText(definition.prompt, { exact: true }).waitFor()
    await ui.waitForFunction(() => window.__handsfree.audio.length === 2 && !window.__handsfree.audio[1].paused)
    assert(requests.checkpoint.length === 2 && requests.checkpoint[1].transcript.includes(first) && requests.checkpoint[1].transcript.endsWith(second), 'A short second utterance must be processed and appended once')
    assert(await log.locator('.conversation-bubble-candidate').count() === 2, 'Candidate turns must be separate bubbles without duplicating the full transcript')
    assert(await log.locator('.conversation-bubble-curveball').count() === 1, 'A generated requirement must appear once as a marked AI bubble')
    const newestVisible = await log.evaluate(element => {
      const bubble = element.querySelector('.conversation-bubble:last-child').getBoundingClientRect()
      const bounds = element.getBoundingClientRect()
      return bubble.bottom <= bounds.bottom + 1
    })
    assert(newestVisible, 'The newest AI bubble must be fully visible when following the conversation')
    await ui.getByRole('button', { name: 'New case 1', exact: true }).waitFor()
    assert((await ui.locator('.problem-body').innerText()).includes(definition.requirement), 'The automatically generated requirement must update the actual problem')
    await audioFinished()
    await ui.waitForFunction(() => window.__handsfree.starts === 3 && window.__handsfree.active)
    checks.push('Short replies create one candidate bubble each; generated curveballs update requirements and cases, then resume listening')

    nextAction = 'continue'
    const spokenBeforeContinue = requests.speech.length
    await emit('I will adjust the return value while keeping the positions distinct.', true)
    await ui.waitForFunction(() => window.__handsfree.stops === 3)
    await finishRecognition()
    await ui.waitForFunction(() => window.__handsfree.starts === 4 && window.__handsfree.active)
    assert(requests.speech.length === spokenBeforeContinue, 'A continue decision should not produce an unnecessary spoken interruption')
    checks.push('Gemini can remain quiet and return to listening instead of speaking after every turn')

    nextAction = 'question'; hold = true
    await emit('Here is another completed explanation for the interviewer.', true)
    await ui.waitForFunction(() => window.__handsfree.stops === 4)
    await finishRecognition()
    for (let attempt = 0; !release && attempt < 1000; attempt += 1) await new Promise(resolve => setTimeout(resolve, 5))
    assert(release, 'The delayed interviewer fixture should be pending')
    const responsesBeforePause = await log.locator('.conversation-bubble-interviewer').count()
    const playsBeforePause = requests.speech.length
    const completed = new Promise(resolve => { requestFinished = resolve })
    await pause.click()
    release(); release = null
    await completed
    await ui.waitForTimeout(600)
    assert(await ui.evaluate(() => !window.__handsfree.active), 'Pause must not restart recognition')
    assert(requests.speech.length === playsBeforePause, 'A late paused reply must not create audio')
    assert(await log.locator('.conversation-bubble-interviewer').count() === responsesBeforePause, 'A cancelled turn must not append a late AI bubble')
    hold = false; requestFinished = null
    checks.push('Pausing while thinking cancels the response, audio and automatic restart')

    await start.click()
    await ui.waitForFunction(() => window.__handsfree.active)
    const beforeNavigation = await ui.evaluate(() => window.__handsfree.starts)
    await emit('An unfinished turn before navigating away.', false)
    await ui.getByRole('link', { name: /Progress/ }).click()
    await ui.getByRole('heading', { name: 'Practice history', exact: true }).waitFor()
    await finishRecognition()
    await ui.waitForTimeout(1800)
    assert(await ui.evaluate(count => window.__handsfree.starts === count && !window.__handsfree.active, beforeNavigation), 'Navigation must cancel finalization and prevent a late restart')
    await ui.getByRole('link', { name: 'Practice', exact: true }).click()
    await start.waitFor()
    for (const width of [320, 1024, 1440]) {
      await ui.setViewportSize({ width, height: 1000 })
      assert(await ui.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Conversation layout overflows at ${width}px`)
    }
    checks.push('Navigation pauses hands-free capture, and chat remains usable at phone and desktop widths')

    await ui.evaluate(() => { window.__handsfree.denied = true })
    const startsBeforeDenial = await ui.evaluate(() => window.__handsfree.starts)
    await start.click()
    await ui.waitForTimeout(1800)
    assert(await ui.evaluate(count => window.__handsfree.starts === count + 1 && !window.__handsfree.active, startsBeforeDenial), 'Denied microphone permission must not create restart loops')
    const typedContext = await browser.newContext({ viewport: { width: 1024, height: 900 } })
    try {
      await typedContext.addInitScript(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined })
      const typed = await typedContext.newPage()
      typed.on('pageerror', error => errors.push(error.message))
      await typed.route('**/api/interview/checkpoint', route => route.fulfill({ json: { action: 'question', message: 'Typed fixture: explain how the map grows.', reason: 'Typed fallback fixture.', curveball: null } }))
      await typed.route('**/api/speech', route => route.fulfill({ status: 429, json: { error: 'Voice fixture quota reached. Text remains available.' } }))
      await typed.goto(origin)
      await typed.getByRole('textbox', { name: 'Your solution explanation', exact: true }).fill('I use a map to store earlier values while looking for a complement in a single pass.')
      await typed.getByRole('button', { name: 'Live interview', exact: true }).click()
      await typed.getByRole('button', { name: 'Start live interview', exact: true }).click()
      await typed.getByRole('log', { name: 'Interview conversation', exact: true }).getByText('Typed fixture: explain how the map grows.', { exact: true }).waitFor({ timeout: 8000 })
      checks.push('Typed explanations still receive automatic visible replies when speech recognition is unavailable')
    } finally { await typedContext.close() }
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`)
    checks.push('Denied microphone permission stops automatic capture without a restart loop')
    return { checks, fixture: 'Controlled SpeechRecognition, Gemini, Audio and runner; no physical microphone or playback.', isolatedContext: true }
  } finally { await context.close() }
}
