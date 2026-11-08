import { useCallback, useLayoutEffect, useRef, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const MAX_SPEECH_CHARACTERS = 1800
const MAX_AUDIO_BYTES = 16 * 1024 * 1024

function dispose(job) {
  if (!job || job.disposed) return
  job.disposed = true
  clearTimeout(job.timer)
  job.controller.abort()
  if (job.audio) {
    job.audio.onended = null
    job.audio.onerror = null
    job.audio.onplaying = null
    job.audio.pause()
    job.audio.removeAttribute('src')
    job.audio.load()
  }
  if (job.url) URL.revokeObjectURL(job.url)
}

// One interviewer player for the entire workspace. Call speak only for a new
// AI reply; microphone state and scope changes cancel rather than queue audio.
export default function useInterviewerAudio({ enabled, blocked = false, scope }) {
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [lastText, setLastText] = useState('')
  const latestText = useRef('')
  const current = useRef(null)
  const generation = useRef(0)
  const gate = useRef({ enabled, blocked, scope })
  const previousScope = useRef(scope)
  gate.current = { enabled, blocked, scope }

  const cancel = useCallback(() => {
    generation.current += 1
    dispose(current.current)
    current.current = null
  }, [])

  const stop = useCallback(() => {
    cancel()
    setStatus('idle')
    setError('')
  }, [cancel])

  useLayoutEffect(() => {
    if (previousScope.current !== scope) {
      previousScope.current = scope
      latestText.current = ''
      setLastText('')
      stop()
    } else if (!enabled || blocked) stop()
  }, [enabled, blocked, scope, stop])

  useLayoutEffect(() => cancel, [cancel])

  const speak = useCallback(async text => {
    stop()
    if (typeof text !== 'string' || !text.trim()) return false
    const clean = text.trim()
    latestText.current = clean
    setLastText(clean)
    if (!gate.current.enabled || gate.current.blocked) return false
    if (clean.length > MAX_SPEECH_CHARACTERS) {
      setError('This reply is too long for voice playback. Read the complete response on screen.')
      return false
    }
    const job = {
      id: generation.current, scope: gate.current.scope,
      controller: new AbortController(), audio: null, url: null, timer: null,
    }
    current.current = job
    const matches = () => current.current === job && generation.current === job.id &&
      gate.current.scope === job.scope && gate.current.enabled && !gate.current.blocked
    let timedOut = false
    job.timer = setTimeout(() => { timedOut = true; job.controller.abort() }, 60000)
    setStatus('loading')
    try {
      const response = await fetch(`${API_URL}/speech`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: clean }), signal: job.controller.signal,
      })
      if (!matches()) return false
      if (!response.ok) {
        let message = 'Gemini voice is unavailable. You can keep reading the interviewer response.'
        try {
          const body = await response.json()
          if (typeof body.error === 'string' && body.error.trim()) message = body.error
        } catch { /* Keep the local error if the upstream body is not JSON. */ }
        throw new Error(message)
      }
      if (!/^audio\/(?:wav|x-wav)(?:;|$)/i.test(response.headers.get('content-type') || '')) {
        throw new Error('The voice response was not playable audio. Try Replay voice.')
      }
      const blob = await response.blob()
      clearTimeout(job.timer)
      if (!matches()) return false
      if (!blob.size || blob.size > MAX_AUDIO_BYTES) throw new Error('The voice response was incomplete. Try Replay voice.')
      job.url = URL.createObjectURL(blob)
      job.audio = new Audio(job.url)
      job.audio.preload = 'auto'
      job.audio.onplaying = () => { if (matches()) setStatus('speaking') }
      job.audio.onended = () => { if (matches()) stop() }
      job.audio.onerror = () => {
        if (!matches()) return
        stop()
        setError('The audio could not play. Try Replay voice, or read the response on screen.')
      }
      await job.audio.play()
      if (!matches()) { dispose(job); return false }
      setStatus('speaking')
      return true
    } catch (failure) {
      if (!matches()) { dispose(job); return false }
      stop()
      setError(timedOut ? 'Voice generation took too long. Try Replay voice.' :
        failure.name === 'NotAllowedError' ? 'Your browser needs a click to play audio. Choose Replay voice.' :
          failure.message || 'Gemini voice is unavailable. Read the response on screen.')
      return false
    } finally {
      clearTimeout(job.timer)
      if (!matches()) dispose(job)
    }
  }, [stop])

  const replay = useCallback(() => speak(latestText.current), [speak])
  return { speak, stop, replay, status, error, lastText, blocked }
}
