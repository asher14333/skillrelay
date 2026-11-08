// Run through playwright-cli run-code --filename=tests/display-ui.js against the local app.
// Uses isolated browser data and labeled AI fixtures; no model or microphone request.
// eslint-disable-next-line no-unused-expressions -- The CLI evaluates a function expression.
async page => {
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const origin = new URL(page.url()).origin
  assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Use the local app')
  const browser = page.context().browser()
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' })
  const ui = await context.newPage()
  ui.setDefaultTimeout(6000)
  const checks = []
  const errors = []
  ui.on('pageerror', error => errors.push(error.message))
  const storageKey = 'skillrelay.display.v1'
  const frame = () => ui.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  const trigger = ui.getByRole('button', { name: 'Display settings', exact: true })
  const panel = ui.getByRole('dialog', { name: 'Display settings', exact: true })
  const size = ui.getByRole('combobox', { name: 'Text size', exact: true })
  const layout = ui.getByRole('combobox', { name: 'Layout', exact: true })
  const motion = ui.getByRole('combobox', { name: 'Reduce motion', exact: true })
  const close = () => ui.getByRole('button', { name: 'Close display settings', exact: true }).click()
  const open = async () => { await trigger.click(); await panel.waitFor({ state: 'visible' }) }
  try {
    await ui.addInitScript(() => {
      window.__displayProbe = { arrivals: [] }
      const animate = Element.prototype.animate
      Element.prototype.animate = function (...args) {
        const animation = animate.apply(this, args)
        window.__displayProbe.arrivals.push(animation)
        return animation
      }
    })
    await ui.route('**/api/**', route => route.fulfill({ json: {
      question: 'Display regression fixture: explain your approach.',
    } }))
    await ui.goto(origin)
    const editor = ui.getByRole('textbox', { name: 'Editor content', exact: true })
    const explanation = ui.getByRole('textbox', { name: 'Your solution explanation', exact: true })
    await editor.waitFor({ state: 'visible' })
    await explanation.fill('My explanation stays here while I adjust the display.')
    await editor.focus()
    await editor.press('ControlOrMeta+End')
    await editor.press('Enter')
    await editor.pressSequentially('# display preference draft')
    await ui.evaluate(() => { window.__displayProbe.editor = document.querySelector('.monaco-editor') })
    await trigger.focus()
    await trigger.press('Enter')
    await panel.waitFor({ state: 'visible' })
    assert(await size.evaluate(el => el === document.activeElement), 'Keyboard opening should focus the first control')
    await size.selectOption('larger')
    await layout.selectOption('stacked')
    await motion.selectOption('reduce')
    await frame()
    assert(await size.evaluate(el => el.getBoundingClientRect().width > 0), 'Changing size/layout must leave the settings usable')
    await ui.keyboard.press('Escape')
    await panel.waitFor({ state: 'hidden' })
    assert(await trigger.evaluate(el => el === document.activeElement), 'Escape must return focus to Display settings')
    assert(await ui.evaluate(() => document.querySelector('.monaco-editor') === window.__displayProbe.editor), 'Settings must not remount Monaco')
    assert(await explanation.inputValue() === 'My explanation stays here while I adjust the display.', 'Settings must preserve explanation drafts')
    assert(await ui.locator('.monaco-editor .view-lines').innerText().then(text => text.replace(/\u00a0/g, ' ').includes('# display preference draft')), 'Settings must preserve code')
    const reading = await ui.evaluate(() => ({
      text: parseFloat(getComputedStyle(document.querySelector('.problem-text')).fontSize),
      code: parseFloat(getComputedStyle(document.querySelector('.monaco-editor .view-lines')).fontSize),
      problem: document.querySelector('.problem-panel').getBoundingClientRect().bottom,
      codeTop: document.querySelector('.editor-panel').getBoundingClientRect().top,
      codingBottom: document.querySelector('.coding-column').getBoundingClientRect().bottom,
      explanationTop: document.querySelector('.live-explanation').getBoundingClientRect().top,
    }))
    assert(Math.abs(reading.text - 18) < 0.1 && reading.code === 18, 'Larger must scale actual interface and editor text to 18px')
    assert(reading.codeTop >= reading.problem && reading.explanationTop >= reading.codingBottom - 1, 'Stacked must place problem, code/tests, explanation in order')
    await editor.focus()
    await editor.press('ControlOrMeta+z')
    assert(!(await ui.locator('.monaco-editor .view-lines').innerText()).replace(/\u00a0/g, ' ').includes('# display preference draft'), 'Editor undo history must survive preferences')
    const cursorBlinks = async () => {
      await editor.focus()
      await frame()
      return ui.evaluate(async () => {
        const cursor = document.querySelector('.monaco-editor .cursor')
        let hidden = getComputedStyle(cursor).visibility === 'hidden'
        const observer = new MutationObserver(() => { hidden ||= getComputedStyle(cursor).visibility === 'hidden' })
        observer.observe(cursor, { attributes: true, attributeFilter: ['style'] })
        await new Promise(resolve => setTimeout(resolve, 1200))
        observer.disconnect()
        return hidden
      })
    }
    assert(!(await cursorBlinks()), 'Saved Reduce should stop Monaco timer-driven cursor blinking')
    await open()
    await motion.selectOption('system')
    await close()
    await ui.emulateMedia({ reducedMotion: 'reduce' })
    assert(!(await cursorBlinks()), 'Follow system plus OS reduction should stop Monaco cursor blinking')
    await ui.emulateMedia({ reducedMotion: 'no-preference' })
    assert(await cursorBlinks(), 'A live OS change back should restore normal cursor blinking')
    await open()
    await motion.selectOption('reduce')
    await explanation.click()
    await panel.waitFor({ state: 'hidden' })
    assert(await explanation.evaluate(el => el === document.activeElement), 'Outside dismissal must preserve the clicked destination focus')
    checks.push('Monaco cursor follows both saved and live OS motion preferences; outside dismissal retains destination focus')
    checks.push('Keyboard settings, focus restoration, 18px interface/editor type, stacked order, preserved drafts and Monaco undo')

    await ui.getByRole('button', { name: 'Follow-up', exact: true }).click()
    await ui.getByRole('button', { name: 'Start follow-up practice', exact: true }).click()
    const answer = ui.getByRole('textbox', { name: 'Your follow-up answer', exact: true })
    await answer.fill('My follow-up draft remains intact.')
    await open()
    await size.selectOption('large')
    await layout.selectOption('columns')
    await close()
    assert(await answer.inputValue() === 'My follow-up draft remains intact.', 'Layout switching must preserve follow-up drafts')
    await ui.getByRole('button', { name: 'Code & explain', exact: true }).click()
    await open()
    await size.selectOption('default')
    await motion.selectOption('system')
    await close()
    await ui.getByRole('button', { name: 'Follow-up', exact: true }).press('Enter')
    await ui.waitForFunction(() => {
      const animation = window.__displayProbe.arrivals.find(item => item.playState === 'running')
      if (!animation) return false
      animation.pause()
      window.__displayProbe.held = animation
      return true
    })
    await open()
    await motion.selectOption('reduce')
    await ui.waitForFunction(() => window.__displayProbe.held.playState === 'idle')
    await close()
    assert(await ui.locator('.tab-indicator').evaluate(el => getComputedStyle(el).transitionDuration === '0s'), 'Saved Reduce must disable CSS motion without OS reduction')
    await open()
    await motion.selectOption('system')
    await close()
    await ui.emulateMedia({ reducedMotion: 'reduce' })
    assert(await ui.locator('.tab-indicator').evaluate(el => getComputedStyle(el).transitionDuration === '0s'), 'Follow system must still honor OS reduction')
    checks.push('Independent settings preserve follow-up drafts; Reduce cancels an active arrival and Follow system honors OS reduction')

    await open()
    await size.selectOption('larger')
    await layout.selectOption('stacked')
    await motion.selectOption('reduce')
    await close()
    await ui.reload()
    await open()
    assert(await size.inputValue() === 'larger' && await layout.inputValue() === 'stacked' && await motion.inputValue() === 'reduce', 'All choices must survive reload')
    await close()
    await ui.getByRole('link', { name: 'Progress', exact: true }).click()
    await ui.getByRole('heading', { name: 'Practice history', exact: true }).waitFor()
    await open()
    await size.selectOption('large')
    await close()
    assert(await ui.evaluate(key => JSON.parse(localStorage.getItem(key)).textSize === 'large', storageKey), 'Settings should work on Progress and persist independently')
    checks.push('Preferences survive reload and remain available in Progress')

    await ui.getByRole('link', { name: 'Practice', exact: true }).click()
    for (const width of [320, 700, 1024, 1440]) {
      await ui.setViewportSize({ width, height: 900 })
      await open()
      await size.selectOption('larger')
      for (const mode of ['columns', 'stacked']) {
        await layout.selectOption(mode)
        await frame()
        const overflow = await ui.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)
        assert(!overflow, `${width}px ${mode}: page must not overflow horizontally at Larger`)
        assert(await ui.getByRole('button', { name: 'Close display settings' }).isVisible(), `${width}px: panel close must be reachable`)
      }
      await close()
      const tabsFit = await ui.locator('.panel-tabs button').evaluateAll(buttons => buttons.every(button => {
        const box = button.getBoundingClientRect()
        const parent = button.parentElement.getBoundingClientRect()
        return box.left >= parent.left && box.right <= parent.right + 1 && button.scrollWidth <= button.clientWidth + 1
      }))
      assert(tabsFit, `${width}px: all workspace tabs must remain fully readable at Larger`)
    }
    checks.push('Larger text and both layouts fit 320, 700, 1024 and 1440px without horizontal page overflow')
    assert(errors.length === 0, `Browser errors: ${errors.join('; ')}`)

    for (const broken of ['malformed', 'blocked']) {
      const safeContext = await browser.newContext()
      try {
        await safeContext.addInitScript(({ key, mode }) => {
          if (mode === 'malformed') localStorage.setItem(key, '{broken')
          else {
            Storage.prototype.getItem = () => { throw new Error('Storage blocked by regression fixture') }
            Storage.prototype.setItem = () => { throw new Error('Storage blocked by regression fixture') }
          }
        }, { key: storageKey, mode: broken })
        const safe = await safeContext.newPage()
        await safe.goto(origin)
        await safe.getByRole('button', { name: 'Display settings', exact: true }).click()
        const control = safe.getByRole('combobox', { name: 'Text size', exact: true })
        assert(await control.inputValue() === 'default', 'Unavailable/corrupt preferences should use safe defaults')
        await control.selectOption('large')
        assert(await safe.evaluate(() => document.documentElement.dataset.textSize === 'large'), 'Storage problems must not prevent applying settings')
        if (broken === 'blocked') await safe.getByRole('status').filter({ hasText: 'could not be saved' }).waitFor()
      } finally { await safeContext.close() }
    }
    checks.push('Malformed and blocked storage retain usable controls and report save failures accurately')
    return { checks, isolatedContext: true, ai: 'Labeled follow-up fixture only; no live AI request.' }
  } finally { await context.close() }
}
