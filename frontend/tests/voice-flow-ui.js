// Real App + follow-up voice flow; all AI/audio/recognition APIs are controlled fixtures.
// eslint-disable-next-line no-unused-expressions -- Playwright CLI evaluates this expression.
async page => {
  const assert = (value, message) => { if (!value) throw new Error(message) }
  const origin = new URL(page.url()).origin
  assert(['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname), 'Use the local app')
  const context = await page.context().browser().newContext({viewport:{width:1440,height:1000}})
  const ui = await context.newPage()
  ui.setDefaultTimeout(6000)
  const speechRequests = []
  const checks = []
  let delayStart = false
  let releaseStart = null
  const question = 'Voice flow fixture: why does your map preserve the indices?'
  const evaluation = 'Voice flow fixture: you explained the lookup before insertion clearly.'
  const nextQuestion = 'Voice flow fixture: what extra memory does your map need?'
  try {
    await context.addInitScript(() => {
      window.__voiceFlow = { audio: [], revocations: [] }
      window.Audio = class {
        constructor(src) { this.src=src; this.paused=true; window.__voiceFlow.audio.push(this) }
        play() { this.paused=false; this.onplaying?.(); return Promise.resolve() }
        pause() { this.paused=true }
        removeAttribute() { this.src='' }
        load() {}
      }
      const revoke = URL.revokeObjectURL
      URL.revokeObjectURL = url => { window.__voiceFlow.revocations.push(url); revoke(url) }
      class Recognition {
        start() { window.__voiceFlow.recognition=this; queueMicrotask(()=>this.onstart?.()) }
        stop() { this.stopping=true }
        abort() { this.onend?.() }
      }
      window.SpeechRecognition=Recognition; window.webkitSpeechRecognition=Recognition
    })
    await ui.route('**/api/**', async route => {
      const path=new URL(route.request().url()).pathname
      if(path==='/api/speech') {
        speechRequests.push(route.request().postDataJSON().text)
        return route.fulfill({contentType:'audio/wav',body:Buffer.alloc(48)})
      }
      if(path==='/api/interview/start') {
        if(delayStart) await new Promise(resolve=>{releaseStart=resolve})
        return route.fulfill({json:{question}}).catch(()=>{})
      }
      if(path==='/api/interview/respond') return route.fulfill({json:{complete:false,answerEvaluation:{score:8,feedback:evaluation,quote:'I check earlier indices.'},nextQuestion,overallNote:null}})
      throw new Error(`Unexpected request ${path}`)
    })
    await ui.goto(origin)
    await ui.getByRole('textbox',{name:'Your solution explanation',exact:true}).fill('I store earlier values and their indices, then look up the complement before inserting the current number.')
    await ui.getByRole('button',{name:'Follow-up',exact:true}).click()
    await ui.getByRole('button',{name:'AI voice off',exact:true}).click()
    await ui.getByRole('button',{name:'Start follow-up practice',exact:true}).click()
    await ui.getByText(question,{exact:true}).waitFor()
    await ui.waitForFunction(()=>window.__voiceFlow.audio.length===1&&!window.__voiceFlow.audio[0].paused)
    assert(speechRequests[0]===question,'The first spoken response must match the visible interviewer question')
    checks.push('The follow-up question remains visible and is sent to Gemini speech when AI voice is enabled')

    const answer=ui.getByRole('textbox',{name:'Your follow-up answer',exact:true})
    await answer.fill('I check earlier indices.')
    await ui.getByRole('button',{name:'Record answer',exact:true}).click()
    assert(await ui.evaluate(()=>window.__voiceFlow.audio[0].paused),'Recording must stop the existing AI audio immediately')
    await ui.getByRole('button',{name:'Stop recording',exact:true}).waitFor()
    const replay=ui.getByRole('button',{name:'Replay voice',exact:true})
    assert(await replay.isDisabled(),'Replay must be disabled while the microphone is active')
    await ui.getByRole('button',{name:'Stop recording',exact:true}).click()
    assert(await ui.getByRole('button',{name:'Submit answer',exact:true}).isDisabled(),'Submit must wait for microphone finalization')
    await ui.evaluate(()=>window.__voiceFlow.recognition.onend?.())
    await ui.getByRole('button',{name:'Submit answer',exact:true}).click()
    await ui.getByText(nextQuestion,{exact:true}).waitFor()
    await ui.waitForFunction(()=>window.__voiceFlow.audio.length===2&&!window.__voiceFlow.audio[1].paused)
    assert(speechRequests[1]===`${evaluation} ${nextQuestion}`,'Answer feedback and next question should both be spoken')
    checks.push('Microphone start stops AI audio, replay is gated until finalization, and feedback plus the next question are spoken')

    await ui.getByRole('button',{name:'AI voice on',exact:true}).click()
    assert(await ui.evaluate(()=>window.__voiceFlow.audio.every(audio=>audio.paused)),'Mute must stop all audio')
    assert(await replay.isDisabled(),'Replay must remain disabled while AI voice is off')
    await ui.getByRole('button',{name:'AI voice off',exact:true}).click()
    await replay.click()
    await ui.waitForFunction(()=>window.__voiceFlow.audio.length===3&&!window.__voiceFlow.audio[2].paused)
    await ui.getByRole('link',{name:'Progress',exact:true}).click()
    await ui.getByRole('heading',{name:'Practice history',exact:true}).waitFor()
    assert(await ui.evaluate(()=>window.__voiceFlow.audio.every(audio=>audio.paused)),'Navigating away must stop AI playback')
    assert(await ui.evaluate(()=>window.__voiceFlow.revocations.length===3),'Each stopped playback must release its audio URL')
    checks.push('Mute and navigation stop audio, while explicit replay works after enabling voice again')
    await ui.reload()
    await ui.getByRole('link',{name:'Practice',exact:true}).click()
    await ui.getByRole('textbox',{name:'Your solution explanation',exact:true}).fill('A fresh synthetic explanation for a delayed follow-up response.')
    await ui.getByRole('button',{name:'Follow-up',exact:true}).click()
    await ui.getByRole('button',{name:'AI voice off',exact:true}).click()
    delayStart = true
    const request = ui.waitForRequest(request=>new URL(request.url()).pathname==='/api/interview/start')
    await ui.getByRole('button',{name:'Start follow-up practice',exact:true}).click()
    await request
    await ui.getByRole('button',{name:'Code & explain',exact:true}).click()
    for(let attempt=0;!releaseStart&&attempt<1000;attempt+=1) await new Promise(resolve=>setTimeout(resolve,5))
    assert(releaseStart,'The delayed follow-up fixture must be pending')
    const beforeLate = speechRequests.length
    const response = ui.waitForResponse(response=>new URL(response.url()).pathname==='/api/interview/start')
    releaseStart();releaseStart=null
    await response
    await ui.waitForTimeout(150)
    assert(speechRequests.length===beforeLate && await ui.evaluate(()=>window.__voiceFlow.audio.length===0),'A response arriving after leaving Follow-up must remain text-only until that pane is active again')
    checks.push('A delayed follow-up response cannot start voice playback after switching to the code workspace')
    return {checks,fixtures:'Gemini, Audio and SpeechRecognition simulated; no physical recording or playback.'}
  } finally {releaseStart?.();await context.close()}
}
