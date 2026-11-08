// Local regression with a labeled AI response and a simulated video frame.
// Verifies the embedded player, the external link and teardown; it does not certify YouTube playback.
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
    const video = ui.locator('section.lesson-video')
    const frame = video.locator('iframe')
    await frame.waitFor()
    const src = new URL(await frame.getAttribute('src'))
    assert(src.hostname === 'www.youtube-nocookie.com' && src.searchParams.get('autoplay') === '0', 'The embedded player must use the fixed YouTube host without autoplay')
    assert(Boolean(await frame.getAttribute('title')), 'The player needs an accessible title')
    const link = video.getByRole('link', { name: /Open on YouTube/ })
    assert(await link.getAttribute('href') === 'https://www.youtube.com/watch?v=aWKEBEg55ps&t=0s', 'Resource must use the curated source URL')
    assert(await link.getAttribute('target') === '_blank' && (await link.getAttribute('rel')).includes('noopener'), 'The YouTube link must open safely in a new tab')
    assert(await ui.getByText('Explain why your map grows with the input.', { exact: true }).isVisible(), 'The lesson must lead back to the learner’s own practice prompt')
    await ui.getByRole('button', { name: 'Code & explain', exact: true }).click()
    assert(await ui.locator('.lesson-video iframe').count() === 0, 'Leaving feedback must unload the player')
    await ui.getByRole('button', { name: 'Session feedback', exact: true }).click()
    await frame.waitFor()
    return { checks: ['Player embeds with feedback, no autoplay', 'Curated source link opens safely in a new tab', 'Practice prompt shown with the lesson', 'Player unloads when leaving feedback and returns with it'], fixture, externalRequests: external.length }
  } finally { await context.close() }
}
