import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import axios from 'axios'
import Icon from './Icon'
import { validGeneratedCurveball } from '../data/curveballs'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const QUIET_MS = 3000

export default function LiveInterviewer(props) {
  const { code, transcript, blocked, active, running: live, spokenTurn, inputMode, onInputModeChange, onStop, onStart } = props
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(null)
  const latestRef = useRef(null)
  const historyRef = useRef([])
  const lastCheckedRef = useRef('')
  const finishRef = useRef(null)
  const lastSpokenRef = useRef(0)
  const lastSubmittedRef = useRef('')

  useLayoutEffect(() => { latestRef.current = { ...props, live } })
  useLayoutEffect(() => {
    if (!requestRef.current) return
    lastCheckedRef.current = ''
    requestRef.current.abort()
    finishRef.current?.()
  }, [code, transcript, blocked, active, live])
  useEffect(() => () => { requestRef.current?.abort(); finishRef.current?.() }, [])

  const check = useCallback(async (isSpoken = false) => {
    const context = latestRef.current
    if (!context?.live || context.blocked || !context.active || requestRef.current || !context.transcript.trim()) return
    const fingerprint = JSON.stringify([context.code, context.transcript])
    if (!isSpoken && fingerprint === lastCheckedRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    lastCheckedRef.current = fingerprint
    setBusy(true); setError('')
    context.onBusyChange?.(true)
    const finish = () => {
      if (requestRef.current !== controller) return
      requestRef.current = null
      finishRef.current = null
      setBusy(false)
      context.onBusyChange?.(false)
      context.onTurnComplete?.()
    }
    finishRef.current = finish
    const previous = lastSubmittedRef.current
    const text = isSpoken ? context.spokenTurn.text :
      context.transcript.startsWith(previous) ? context.transcript.slice(previous.length).trim() : context.transcript
    const candidateId = isSpoken ? `candidate-turn-${context.spokenTurn.number}` : crypto.randomUUID()
    if (isSpoken) lastSpokenRef.current = context.spokenTurn.number
    lastSubmittedRef.current = context.transcript
    if (text) context.onMessage?.({ id: candidateId, role: 'candidate', text })
    try {
      const { data } = await axios.post(`${API_URL}/interview/checkpoint`, {
        problemId: context.problemId, curveballId: context.curveballId,
        code: context.code, transcript: context.transcript,
        history: historyRef.current, allowCurveball: !context.curveballId,
      }, { timeout: 60000, signal: controller.signal })
      if (controller.signal.aborted || requestRef.current !== controller) return
      if (!['continue', 'question', 'curveball'].includes(data.action) || typeof data.message !== 'string' || !data.message.trim() ||
          typeof data.reason !== 'string' || (data.action === 'curveball' && !validGeneratedCurveball(data.curveball, context.problemId))) {
        throw new Error('The interviewer returned an incomplete turn. Your work is still here; try again.')
      }
      if (data.action === 'curveball') {
        if (!context.onCurveball(data.curveball, { code: context.code, transcript: context.transcript })) return
      }
      const turn = { kind: data.action, text: data.message }
      historyRef.current = [...historyRef.current, turn].slice(-5)
      context.onMessage?.({ id: crypto.randomUUID(), role: 'interviewer', text: data.message, kind: data.action })
      if (data.action !== 'continue') context.onSpeak(data.message)
    } catch (err) {
      if (controller.signal.aborted || requestRef.current !== controller) return
      setError(err.response?.data?.error || err.message || 'The interviewer could not respond. Keep practicing or try again.')
    } finally {
      finish()
    }
  }, [])

  useEffect(() => {
    if (!live || !active || blocked || busy || !transcript.trim()) return
    const isSpoken = spokenTurn.number > lastSpokenRef.current
    const timer = setTimeout(() => check(isSpoken), isSpoken ? 0 : QUIET_MS)
    return () => clearTimeout(timer)
  }, [live, active, blocked, busy, code, transcript, spokenTurn, check])

  function toggle() {
    if (live) onStop()
    else onStart()
  }

  return <section className="live-interviewer" aria-labelledby="live-interviewer-title">
    <h3 id="live-interviewer-title"><Icon name="mic" size={16} />Live interviewer</h3>
    <p>Gemini follows your code and explanation, asks questions, and changes the requirements when it would help you practice.</p>
    <label className="interview-input-mode">Interview input
      <select aria-label="Interview input" value={inputMode} onChange={event => onInputModeChange(event.target.value)}>
        <option value="voice">Voice</option><option value="text">Text</option>
      </select>
    </label>
    <div className="live-interviewer-actions">
      <button className="learning-secondary" onClick={toggle} aria-pressed={live}>{live ? 'Pause interview' : 'Start live interview'}</button>
    </div>
    {live && <p className="live-interviewer-status" role="status">{!active ? 'Paused while you review another view.' : busy ? 'Gemini is considering your turn.' : inputMode === 'text' ? 'Type your turn. Gemini responds automatically after a pause.' : 'Hands-free: speak, pause, and listen. Your conversation appears beside the editor.'}</p>}
    <p className="live-interviewer-privacy">Starting sends snapshots of your code and finalized explanation to your AI provider. No timer. You can pause at any time.</p>
    {error && <p className="curveball-error" role="alert">{error}</p>}
  </section>
}
