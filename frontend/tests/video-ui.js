// Local regression with a labeled AI response and a simulated video frame.
// Verifies explicit loading and teardown; it does not certify YouTube playback.
// eslint-disable-next-line no-unused-expressions -- Playwright CLI evaluates the function.
async page => {
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  const origin = new URL(page.url()).origin
  assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Use the local app')
  const context = await page.context().browser().newContext({ viewport: { width: 1440, height: 900 } })
  const ui = await context.newPage()
  const external = []
  const fixture = 'Video regression fixture: no live AI request.'
  try {
    await context.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (/youtube|ytimg|googlevideo/.test(url.hostname)) {
        external.push(url.href)
        return route.fulfill({ contentType: 'text/html', body: '<p>Video player fixture, not actual playback.</p>' })
      }
      if (url.pathname === '/api/analyze') return route.fulfill({ json: {
        score: 7, passed: true,
        rubric: Object.fromEntries([['problemUnderstanding', 2], ['bruteForce', 2], ['optimization', 2], ['timeComplexity', 1], ['spaceComplexity', 1], ['clarity', 2]].map(([key, max]) => [key, { score: key === 'spaceComplexity' ? 0 : max, max, note: fixture }])),
        strengths: [], improvements: [{ text: fixture }], replayInsights: [],
        learningPlan: { dimension: 'spaceComplexity', title: 'Explain extra storage', reason: fixture, minutes: 3, action: 'retry', steps: ['Name the extra storage.'], practicePrompt: 'Explain why your map grows with the input.', selfCheck: 'Did you justify the memory bound?' },
      } })
      return route.continue()
    })
    await ui.goto(origin)
    await ui.getByRole('textbox', { name: 'Your solution explanation', exact: true }).fill('My map tracks earlier values. I look up a complement for each new value.')
    await ui.getByRole('button', { name: 'Get session feedback', exact: true }).click()
    await ui.getByRole('heading', { name: 'Your practice feedback', exact: true }).waitFor()
    assert(external.length === 0 && await ui.locator('.lesson-video iframe').count() === 0, 'Feedback must not load YouTube or a thumbnail')
    const disclosure = ui.locator('details.lesson-video')
    await disclosure.locator('summary').click()
    assert(external.length === 0, 'Opening the optional resource must not connect to YouTube')
    const fallback = disclosure.getByRole('link', { name: 'Watch on YouTube', exact: true })
    assert(await fallback.getAttribute('href') === 'https://www.youtube.com/watch?v=aWKEBEg55ps&t=0s', 'Resource must use the curated source URL')
    await disclosure.getByRole('button', { name: 'Load video', exact: true }).click()
    const frame = disclosure.locator('iframe')
    await frame.waitFor()
    const src = new URL(await frame.getAttribute('src'))
    assert(src.hostname === 'www.youtube-nocookie.com' && src.searchParams.get('autoplay') === '0', 'Explicit loading must use the fixed YouTube host without autoplay')
    assert(await disclosure.getByRole('button', { name: 'Close video', exact: true }).evaluate(el => el === document.activeElement), 'Loading must preserve keyboard focus on the same control')
    assert(Boolean(await frame.getAttribute('title')), 'The player needs an accessible title')
    assert(await fallback.isVisible(), 'The external fallback must stay available while loaded')
    await disclosure.getByRole('button', { name: 'Close video', exact: true }).click()
    assert(await disclosure.locator('iframe').count() === 0, 'Close video must remove the player')
    assert(await disclosure.getByRole('button', { name: 'Load video', exact: true }).evaluate(el => el === document.activeElement), 'Closing must preserve focus on the load control')
    await disclosure.getByRole('button', { name: 'Load video', exact: true }).click()
    await frame.waitFor()
    await disclosure.locator('summary').click()
    await ui.waitForFunction(() => document.querySelector('.lesson-video iframe') === null)
    await disclosure.locator('summary').click()
    assert(await disclosure.getByRole('button', { name: 'Load video', exact: true }).isVisible(), 'Reopening a closed disclosure must require loading again')
    assert(await disclosure.getByText('Explain why your map grows with the input.', { exact: true }).isVisible(), 'The resource must lead back to the learner’s own practice prompt')
    await disclosure.getByRole('button', { name: 'Load video', exact: true }).click()
    await frame.waitFor()
    await ui.getByRole('button', { name: 'Code & explain', exact: true }).click()
    assert(await ui.locator('.lesson-video iframe').count() === 0, 'Leaving feedback must unload the player')
    return { checks: ['No YouTube requests or thumbnails before explicit Load video', 'Curated source, accessible player, no autoplay and visible fallback', 'Close and disclosure collapse unload the player', 'Practice prompt and player teardown when leaving feedback'], fixture }
  } finally { await context.close() }
}
