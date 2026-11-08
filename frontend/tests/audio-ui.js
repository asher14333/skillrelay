// Exercises the real audio hook in a temporary browser-only React harness.
// Audio/media and HTTP replies are labeled fixtures; no live Gemini or speakers.
// eslint-disable-next-line no-unused-expressions -- Playwright CLI evaluates this expression.
async page => {
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const origin = new URL(page.url()).origin
  assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Use the local Vite app')
  const context = await page.context().browser().newContext()
  const ui = await context.newPage()
  ui.setDefaultTimeout(5000)
  const checks = []
  let release = null
  let slow = false
  let errorResponse = false
  let count = 0
  const hookSource = await (await context.request.get(`${origin}/src/lib/useInterviewerAudio.js`)).text()
  const mainSource = await (await context.request.get(`${origin}/src/main.jsx`)).text()
  const reactUrl = hookSource.match(/from ["']([^"']*react\.js[^"']*)["']/)?.[1]
  const rootUrl = mainSource.match(/from ["']([^"']*react-dom_client[^"']*)["']/)?.[1]
  assert(reactUrl && rootUrl, 'The local Vite module paths must be available')
  try {
    await context.addInitScript(() => {
      window.__audioProbe = { created: [], revocations: [], reject: false, holdPlay: false }
      window.Audio = class {
        constructor(src) { this.src = src; this.paused = true; this.plays = 0; window.__audioProbe.created.push(this) }
        play() {
          this.plays += 1
          if (window.__audioProbe.reject) return Promise.reject(new DOMException('Fixture blocked autoplay', 'NotAllowedError'))
          if (window.__audioProbe.holdPlay) return new Promise(resolve => { this.resolvePlay = resolve })
          this.paused = false
          this.onplaying?.()
          return Promise.resolve()
        }
        pause() { this.paused = true }
        removeAttribute() { this.src = '' }
        load() {}
      }
      const revoke = URL.revokeObjectURL
      URL.revokeObjectURL = url => { window.__audioProbe.revocations.push(url); revoke(url) }
    })
    await ui.route('**/__audio_hook_regression', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body><div id="test-root"></div><script type="module">
      import React from '${reactUrl}'; import ReactDOM from '${rootUrl}';
      import useInterviewerAudio from '/src/lib/useInterviewerAudio.js';
      function Harness(){
        const [enabled,setEnabled]=React.useState(true),[blocked,setBlocked]=React.useState(false),[scope,setScope]=React.useState('first');
        const audio=useInterviewerAudio({enabled,blocked,scope});
        const button=(text,action)=>React.createElement('button',{onClick:action},text);
        return React.createElement('main',null,
          React.createElement('p',{role:'status'},audio.status),React.createElement('p',{role:'alert'},audio.error),
          React.createElement('p',{'data-testid':'last-text'},audio.lastText),
          button('Speak',()=>audio.speak('This is a synthetic interviewer reply.')),
          button('Stop voice',audio.stop),button('Replay voice',audio.replay),
          button(enabled?'Mute':'Enable',()=>setEnabled(!enabled)),
          button(blocked?'Stop microphone':'Start microphone',()=>setBlocked(!blocked)),
          button('Change scope',()=>setScope(scope==='first'?'second':'first')));
      }
      ReactDOM.createRoot(document.getElementById('test-root')).render(React.createElement(Harness));
      </script></body></html>` }))
    await ui.route('**/api/speech', async route => {
      count += 1
      if (slow) await new Promise(resolve => { release = resolve })
      if (errorResponse) return route.fulfill({ status: 429, json: { error: 'Speech fixture: quota reached.' } }).catch(() => {})
      return route.fulfill({ contentType: 'audio/wav', body: Buffer.alloc(48) }).catch(() => {})
    })
    await ui.goto(`${origin}/__audio_hook_regression`)
    const speak = ui.getByRole('button', { name: 'Speak', exact: true })
    const status = ui.getByRole('status')
    await speak.click()
    await status.filter({ hasText: /^speaking$/ }).waitFor()
    assert(await ui.evaluate(() => window.__audioProbe.created.length === 1 && !window.__audioProbe.created[0].paused), 'The successful reply should play one audio resource')
    await ui.getByRole('button', { name: 'Stop voice', exact: true }).click()
    assert(await status.innerText() === 'idle', 'Stop must immediately return to idle')
    assert(await ui.evaluate(() => window.__audioProbe.created[0].paused && window.__audioProbe.revocations.length === 1), 'Stop must pause and release the audio URL')
    checks.push('Explicit stop pauses Gemini audio and revokes its object URL')

    slow = true
    await speak.click()
    await status.filter({ hasText: /^loading$/ }).waitFor()
    await ui.waitForFunction(() => true)
    await ui.getByRole('button', { name: 'Start microphone', exact: true }).click()
    for (let attempt = 0; !release && attempt < 1000; attempt += 1) await new Promise(resolve => setTimeout(resolve, 5))
    assert(release, 'The delayed speech fixture must be pending')
    release(); release = null
    await ui.waitForTimeout(100)
    assert(await ui.evaluate(() => window.__audioProbe.created.length === 1), 'Cancelled synthesis must not construct late audio after microphone starts')
    const beforeBlocked = count
    await speak.click()
    await ui.waitForTimeout(50)
    assert(count === beforeBlocked, 'Microphone activity must suppress synthesis, not queue it')
    await ui.getByRole('button', { name: 'Stop microphone', exact: true }).click()
    await ui.waitForTimeout(50)
    assert(count === beforeBlocked, 'Stopping the microphone must not replay a suppressed reply automatically')
    checks.push('Microphone activation cancels pending synthesis and suppressed replies do not queue')

    slow = false
    await ui.evaluate(() => { window.__audioProbe.holdPlay = true })
    await speak.click()
    await ui.waitForFunction(() => window.__audioProbe.created.length === 2 && typeof window.__audioProbe.created[1].resolvePlay === 'function')
    await ui.getByRole('button', { name: 'Mute', exact: true }).click()
    await ui.evaluate(() => window.__audioProbe.created[1].resolvePlay())
    assert(await status.innerText() === 'idle', 'A late play promise must not restore speaking after mute')
    assert(await ui.evaluate(() => window.__audioProbe.created[1].paused), 'Muted in-flight playback must stay paused')
    await ui.getByRole('button', { name: 'Enable', exact: true }).click()
    await ui.evaluate(() => { window.__audioProbe.holdPlay = false; window.__audioProbe.reject = true })
    await ui.getByRole('button', { name: 'Replay voice', exact: true }).click()
    await ui.getByRole('alert').filter({ hasText: 'browser needs a click' }).waitFor()
    await ui.evaluate(() => { window.__audioProbe.reject = false })
    await ui.getByRole('button', { name: 'Replay voice', exact: true }).click()
    await status.filter({ hasText: /^speaking$/ }).waitFor()
    await ui.getByRole('button', { name: 'Change scope', exact: true }).click()
    assert(await status.innerText() === 'idle' && await ui.getByTestId('last-text').innerText() === '', 'Scope change must stop playback and clear old replay text')
    checks.push('Mute/scope changes cancel playback, including a late play promise, and autoplay rejection has a usable replay path')

    errorResponse = true
    await speak.click()
    await ui.getByRole('alert').filter({ hasText: 'quota reached' }).waitFor()
    assert(await status.innerText() === 'idle', 'HTTP synthesis errors must return to idle')
    checks.push('Provider failures remain visible without losing the text response')
    return { checks, fixtures: 'Audio constructor and WAV responses simulated; no live API or physical playback.' }
  } finally { release?.(); await context.close() }
}
