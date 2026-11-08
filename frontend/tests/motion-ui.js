// Run with: npx playwright cli -s=notleetyet-ui run-code --filename=tests/motion-ui.js
// Open the local app first. This function creates and closes its own isolated
// context; all AI replies are labeled fixtures, with no runner or microphone use.
// eslint-disable-next-line no-unused-expressions -- The CLI evaluates a function expression.
async page => {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const origin = new URL(page.url()).origin
  assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Run this regression against the local app')
  const browser = page.context().browser()
  assert(browser, 'The regression needs a browser connection to create an isolated context')
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  const ui = await context.newPage()
  ui.setDefaultTimeout(5000)
  const checks = []
  const fixture = 'Automated motion UI fixture: no live AI call.'
  const unexpected = []
  let analyzed = null
  let analyses = 0
  let analysisGate = null
  const explanationText = 'I find two distinct indices with a hash map. Each lookup is constant time, so one pass takes O(n) time and O(n) extra memory.'
  const draftAnswer = 'My map stores earlier values so I can find each complement without a second loop.'
  try {
    // Observe native animations rather than replacing their timing or completion.
    await ui.addInitScript(() => {
      window.__motionProbe = { arrivals: [], scrolls: [], held: null }
      const animate = Element.prototype.animate
      Element.prototype.animate = function (...args) {
        const animation = animate.apply(this, args)
        window.__motionProbe.arrivals.push({ target: this, animation })
        return animation
      }
      const intoView = Element.prototype.scrollIntoView
      Element.prototype.scrollIntoView = function (options) {
        window.__motionProbe.scrolls.push({ target: this, kind: 'intoView', options })
        return intoView.call(this, options)
      }
      const scrollTo = Element.prototype.scrollTo
      Element.prototype.scrollTo = function (...args) {
        window.__motionProbe.scrolls.push({ target: this, kind: 'scrollTo', options: args[0] })
        return scrollTo.apply(this, args)
      }
    })
    await ui.route('**/api/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path === '/api/analyze') {
        analyzed = route.request().postDataJSON()
        analyses += 1
        const rubric = Object.fromEntries([
          ['problemUnderstanding', 2], ['bruteForce', 2], ['optimization', 2],
          ['timeComplexity', 1], ['spaceComplexity', 1], ['clarity', 2],
        ].map(([key, max]) => [key, { score: max, max, note: fixture }]))
        if (analysisGate) await analysisGate
        return route.fulfill({ json: {
          score: 10, passed: true, rubric, strengths: [{ text: fixture }], improvements: [], replayInsights: [],
          learningPlan: { id: 'motion-fixture', dimension: 'spaceComplexity', title: 'Explain the memory trade-off',
            reason: fixture, minutes: 3, action: 'retry', steps: ['Identify extra storage.', 'Explain how it grows.'],
            practicePrompt: 'Explain the map size.', selfCheck: 'Did you justify O(n) extra space?' },
        } })
      }
      if (path === '/api/interview/start') return route.fulfill({ json: { question: `${fixture} Why use a map?` } })
      if (path === '/api/interview/respond') return route.fulfill({ json: {
        answerEvaluation: { feedback: fixture, score: 8, quote: draftAnswer },
        complete: false, nextQuestion: `${fixture} What is the memory trade-off?`, overallNote: null,
      } })
      unexpected.push(path)
      return route.abort('blockedbyclient')
    })
    await ui.goto(`${origin}/#practice`)
    const frames = () => ui.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    const settle = async () => {
      await frames()
      await ui.evaluate(async () => {
        const finite = document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity)
        await Promise.allSettled(finite.map(animation => animation.finished))
      })
      await frames()
    }
    const clearProbe = () => ui.evaluate(() => {
      window.__motionProbe.arrivals = []
      window.__motionProbe.scrolls = []
    })
    const codeTab = ui.getByRole('button', { name: 'Code & explain', exact: true })
    const followUpTab = ui.getByRole('button', { name: 'Follow-up', exact: true })
    const feedbackTab = ui.getByRole('button', { name: 'Session feedback', exact: true })
    const explanation = ui.getByRole('textbox', { name: 'Your solution explanation', exact: true })
    const editor = ui.getByRole('textbox', { name: 'Editor content', exact: true })
    await editor.waitFor({ state: 'visible' })
    await settle()
    await clearProbe()
    await explanation.fill(explanationText)
    await explanation.press('End')
    await explanation.pressSequentially(' I keep the original indices.')
    await editor.focus()
    await editor.press('ControlOrMeta+End')
    await editor.press('End')
    await editor.press('Enter')
    await editor.pressSequentially('# preserved motion draft')
    await frames()
    assert(await editor.evaluate(el => el === document.activeElement || el.contains(document.activeElement)), 'Typing should keep focus in Monaco')
    assert(await ui.evaluate(() => window.__motionProbe.arrivals.length === 0), 'Typing must not trigger JS arrival animations')
    assert(await ui.evaluate(() => ['.code-pane', '.monaco-wrapper', '.live-explanation', '.transcript-editor']
      .every(selector => document.querySelector(selector).getAnimations().length === 0)), 'Editor and transcript containers must stay still on keystrokes')
    checks.push('Monaco and explanation keystrokes preserve focus without animating their containers')

    await followUpTab.press('Enter')
    await ui.getByRole('button', { name: 'Start follow-up practice', exact: true }).click()
    const answer = ui.getByRole('textbox', { name: 'Your follow-up answer', exact: true })
    await answer.waitFor({ state: 'visible' })
    assert(await answer.evaluate(el => document.activeElement === el), 'The first follow-up should focus its answer field')
    assert(await ui.evaluate(() => window.__motionProbe.arrivals.some(entry => entry.target.matches('.interview-msg-interviewer'))), 'A new interview message should receive its own arrival')
    await answer.fill(draftAnswer)
    // Keyboard activation avoids click actionability waiting for the 180ms pane
    // animation, so these switches really do interrupt arrivals and transitions.
    for (let i = 0; i < 4; i += 1) {
      await codeTab.press('Enter')
      await followUpTab.press('Enter')
    }
    await settle()
    assert(await answer.inputValue() === draftAnswer, 'Rapid switching must preserve the follow-up draft')
    assert(await answer.evaluate(el => document.activeElement === el), 'Returning to a conversation should focus its answer, after interrupted arrivals')
    await codeTab.press('Enter')
    await settle()
    assert(await codeTab.evaluate(el => document.activeElement === el), 'The final Code activation should retain keyboard focus')
    assert((await explanation.inputValue()).startsWith(explanationText), 'Rapid switching must preserve the explanation draft')
    assert((await ui.locator('.monaco-editor .view-lines').innerText()).replace(/\u00a0/g, ' ').includes('# preserved motion draft'), 'Rapid switching must preserve the code draft')
    const indicatorAligned = () => ui.evaluate(() => {
      const indicator = document.querySelector('.panel-tabs .tab-indicator').getBoundingClientRect()
      const selected = document.querySelector('.panel-tabs .tab-active').getBoundingClientRect()
      return Math.abs(indicator.left - selected.left) < 1 && Math.abs(indicator.width - selected.width) < 1
    })
    assert(await indicatorAligned(), 'The indicator must settle exactly under the final active tab')
    checks.push('Interrupted tab transitions settle on the active button while all drafts and intended focus survive')

    // Each real feedback request flushes pending checkpoint edits immediately;
    // no artificial clock or debounce sleeps are needed to create an overflow.
    for (let i = 0; i < 3; i += 1) {
      if (i) {
        await codeTab.press('Enter')
        await explanation.fill(`${explanationText} Revision ${i}: the map grows with the input.`)
        await editor.focus()
        await editor.press('ControlOrMeta+End')
        await editor.press('End')
        await editor.press('Enter')
        await editor.pressSequentially(`# checkpoint revision ${i}`)
      }
      let releaseAnalysis
      if (i === 2) analysisGate = new Promise(resolve => { releaseAnalysis = resolve })
      const request = ui.waitForRequest(request => new URL(request.url()).pathname === '/api/analyze')
      await ui.getByRole('button', { name: 'Get session feedback', exact: true }).click()
      await request
      if (i === 2) {
        await ui.getByRole('link', { name: 'Progress', exact: true }).press('Enter')
        await ui.getByRole('heading', { name: 'Practice history', exact: true }).waitFor({ state: 'visible' })
        const response = ui.waitForResponse(response => new URL(response.url()).pathname === '/api/analyze')
        releaseAnalysis()
        await response
        analysisGate = null
        await ui.waitForFunction(count => document.querySelector('.checkpoint-navigation > span')?.textContent === `${count} of ${count}`, analyzed.checkpoints.length)
        assert(await ui.locator('.feedback-pane').isHidden(), 'Analysis should finish in the hidden workspace without changing the Progress view')
        await ui.getByRole('link', { name: 'Practice', exact: true }).press('Enter')
      }
      await ui.getByRole('heading', { name: 'Your practice feedback', exact: true }).waitFor({ state: 'visible' })
    }
    await settle()
    assert(analyzed?.checkpoints.length >= 8, 'The fixture session should contain enough real checkpoints to overflow the replay track')
    const selectionInTrack = () => ui.evaluate(() => {
      const track = document.querySelector('.replay-timeline').getBoundingClientRect()
      const selected = document.querySelector('.replay-timeline [aria-pressed="true"]').getBoundingClientRect()
      return selected.left >= track.left - 1 && selected.right <= track.right + 1
    })
    assert(await selectionInTrack(), 'Revealing an analysis completed in Progress must align the selected latest checkpoint')
    await ui.setViewportSize({ width: 1024, height: 900 })
    await ui.waitForFunction(() => {
      const track = document.querySelector('.replay-timeline').getBoundingClientRect()
      const selected = document.querySelector('.replay-timeline [aria-pressed="true"]').getBoundingClientRect()
      return selected.left >= track.left - 1 && selected.right <= track.right + 1
    })
    await ui.setViewportSize({ width: 1440, height: 900 })
    await settle()
    checks.push('Analysis completed in a hidden workspace aligns its latest checkpoint on reveal and resize')
    const lesson = ui.locator('details.lesson-reading')
    const lessonSummary = lesson.locator('summary')
    await lessonSummary.scrollIntoViewIfNeeded()
    await lessonSummary.focus()
    await clearProbe()
    await lessonSummary.press('Enter')
    await ui.waitForFunction(() => window.__motionProbe.arrivals.some(entry => entry.target.closest('.lesson-reading') && entry.animation.playState === 'running'))
    assert(await lesson.evaluate(el => el.open), 'The native disclosure must open immediately during its content arrival')
    await ui.keyboard.press('Enter')
    await ui.waitForFunction(() => !document.querySelector('.lesson-reading').open)
    await ui.waitForFunction(() => window.__motionProbe.arrivals.filter(entry => entry.target.closest('.lesson-reading')).every(entry => entry.animation.playState !== 'running'))
    assert(await lessonSummary.evaluate(el => document.activeElement === el), 'Closing a disclosure should keep keyboard focus on its native summary')

    const change = ui.getByRole('button', { name: 'Change', exact: true })
    await change.press('Enter')
    const picker = ui.getByRole('dialog', { name: 'Choose your next challenge', exact: true })
    await ui.waitForFunction(() => document.querySelector('.problem-picker').open && document.querySelector('.problem-picker').getAnimations().some(animation => animation.playState === 'running'))
    await ui.keyboard.press('Escape')
    await picker.waitFor({ state: 'hidden' })
    assert(await change.evaluate(el => document.activeElement === el), 'Escape should restore focus to the challenge picker trigger during its arrival')
    checks.push('Native disclosure open/close and dialog Escape remain immediate during animations')

    const previous = ui.getByRole('button', { name: 'Previous checkpoint', exact: true })
    const next = ui.getByRole('button', { name: 'Next checkpoint', exact: true })
    const evidence = ui.locator('.checkpoint-evidence')
    const latest = analyzed.checkpoints.at(-1)
    assert(await next.isDisabled(), 'Replay should start at its latest checkpoint')
    await previous.scrollIntoViewIfNeeded()
    await previous.press('Enter')
    await settle()
    assert(await next.isEnabled(), 'Previous must allow returning to the latest checkpoint')
    // Put replay below the viewport before selecting a checkpoint. A component
    // scrollIntoView regression would now move the entire feedback pane.
    await ui.locator('.feedback-pane').evaluate(el => { el.scrollTop = 0 })
    await frames()
    const scrollBefore = await ui.evaluate(() => ({ page: scrollY, feedback: document.querySelector('.feedback-pane').scrollTop }))
    await clearProbe()
    await next.evaluate(async el => {
      const frame = () => new Promise(resolve => requestAnimationFrame(resolve))
      el.click()
      await frame()
      document.querySelector('.checkpoint-navigation button:first-child').click()
      await frame()
      el.click()
    })
    await ui.waitForFunction(expected => document.querySelector('.checkpoint-evidence blockquote').textContent === expected, latest.transcript)
    await settle()
    const replayState = await ui.evaluate(() => {
      const timeline = document.querySelector('.replay-timeline')
      const selected = timeline.querySelector('[aria-pressed="true"]')
      const trackBox = timeline.getBoundingClientRect()
      const itemBox = selected.getBoundingClientRect()
      return { page: scrollY, feedback: document.querySelector('.feedback-pane').scrollTop,
        overflow: timeline.scrollWidth > timeline.clientWidth,
        selectedInTrack: itemBox.left >= trackBox.left - 1 && itemBox.right <= trackBox.right + 1,
        intoView: window.__motionProbe.scrolls.some(call => call.kind === 'intoView') }
    })
    assert(replayState.overflow && replayState.selectedInTrack, 'The selected checkpoint should remain visible inside its overflowing timeline')
    assert(replayState.page === scrollBefore.page && replayState.feedback === scrollBefore.feedback && !replayState.intoView, 'Replay should scroll only its timeline, never the feedback pane or document')
    assert(await evidence.locator('pre code').innerText() === latest.code, 'The latest checkpoint must display its exact code after an interrupted evidence refresh')
    assert(await evidence.locator('blockquote').innerText() === latest.transcript, 'The latest checkpoint must display its exact explanation')
    checks.push('Previous/Next returns exact latest evidence and scrolls only the checkpoint timeline')

    await codeTab.press('Enter')
    await clearProbe()
    await feedbackTab.press('Enter')
    // Pause a real in-flight arrival so live media emulation cannot race the
    // short 180ms duration; cancellation still uses the native WAAPI object.
    await ui.waitForFunction(() => {
      const entry = window.__motionProbe.arrivals.find(item => item.target.matches('.feedback-pane') && item.animation.playState === 'running')
      if (!entry) return false
      entry.animation.pause()
      window.__motionProbe.held = entry.animation
      return true
    })
    await ui.locator('.replay-timeline button').first().evaluate(el => el.click())
    await ui.waitForFunction(() => {
      const scroll = window.__motionProbe.scrolls.find(call => call.kind === 'scrollTo' && call.target.matches('.replay-timeline') && call.options?.behavior === 'smooth')
      if (!scroll) return false
      window.__motionProbe.heldScroll = scroll
      return true
    })
    await ui.emulateMedia({ reducedMotion: 'reduce' })
    await ui.waitForFunction(() => matchMedia('(prefers-reduced-motion: reduce)').matches && window.__motionProbe.held.playState === 'idle')
    await ui.waitForFunction(() => {
      const initial = window.__motionProbe.heldScroll
      return window.__motionProbe.scrolls.some(call => call.kind === 'scrollTo' && call.target === initial.target && call.options?.behavior === 'auto' && call.options.left === initial.options.left)
    })
    checks.push('A live reduced-motion change cancels WAAPI arrivals and finishes native smooth scrolling with an immediate call')

    await clearProbe()
    await lessonSummary.scrollIntoViewIfNeeded()
    await lessonSummary.press('Enter')
    assert(await lesson.evaluate(el => el.open), 'Reduced motion must still allow opening a lesson')
    await lessonSummary.press('Enter')
    await change.press('Enter')
    await picker.waitFor({ state: 'visible' })
    assert(await picker.evaluate(el => getComputedStyle(el).animationName === 'none' && getComputedStyle(el, '::backdrop').animationName === 'none'), 'Reduced motion must disable dialog and backdrop CSS animations')
    await ui.keyboard.press('Escape')
    await picker.waitFor({ state: 'hidden' })
    await followUpTab.press('Enter')
    assert(await answer.inputValue() === draftAnswer, 'The follow-up draft must remain available after feedback and motion preference changes')
    await ui.getByRole('button', { name: 'Submit answer', exact: true }).click()
    await ui.getByText(`${fixture} What is the memory trade-off?`, { exact: true }).waitFor({ state: 'visible' })
    await frames()
    assert(await answer.evaluate(el => document.activeElement === el), 'Reduced motion must not block the next answer focus')
    assert(await indicatorAligned(), 'The reduced-motion tab indicator should move immediately to Follow-up')
    const reduced = await ui.evaluate(() => ({
      js: window.__motionProbe.arrivals.length,
      smooth: window.__motionProbe.scrolls.some(call => call.options?.behavior === 'smooth'),
      conversationAutoScroll: window.__motionProbe.scrolls.some(call => call.kind === 'intoView' && call.options?.behavior === 'auto'),
      activeAnimations: document.getAnimations().filter(animation => ['running', 'paused'].includes(animation.playState)).length,
      indicatorTransition: getComputedStyle(document.querySelector('.tab-indicator')).transitionDuration,
    }))
    assert(reduced.js === 0 && reduced.activeAnimations === 0 && reduced.indicatorTransition === '0s', 'Reduced motion should produce no JS arrivals or CSS motion')
    assert(!reduced.smooth && reduced.conversationAutoScroll, 'Reduced-motion conversation updates should scroll immediately without smooth scrolling')
    checks.push('Reduced motion disables JS/CSS motion and smooth scrolling while disclosure, Escape, tabs, and fixture answers still work')
    assert(unexpected.length === 0, `Unexpected API requests: ${unexpected.join(', ')}`)
    return { checks, analyses, ai: fixture, isolatedContext: true }
  } finally {
    await context.close()
  }
}
