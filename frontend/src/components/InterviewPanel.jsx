import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { animateArrival, scrollWithPreference } from '../lib/motion'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const MAX_FOLLOWUPS = 3

export default function InterviewPanel({
  problemId,
  curveballId = null,
  transcript,
  code,
  onError,
  active = true,
}) {
  const [history, setHistory] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [speechPhase, setSpeechPhase] = useState('idle')
  const isRecording = speechPhase !== 'idle'
  const [isLoading, setIsLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [overallNote, setOverallNote] = useState('')
  const [speechSupported, setSpeechSupported] = useState(true)

  const recognitionRef = useRef(null)
  const sessionBaseRef = useRef('')
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const answerRef = useRef(null)
  const requestRef = useRef(null)
  const conversationRef = useRef(null)
  const previousMessages = useRef({ first: null, length: 0 })

  useEffect(() => () => requestRef.current?.abort(), [])

  useEffect(() => {
    if (active && history.length && !complete && !isLoading) answerRef.current?.focus()
  }, [active, history.length, complete, isLoading])

  useEffect(() => {
    if (!active && recognitionRef.current) {
      try { recognitionRef.current.stop() } catch { /* Already stopped. */ }
    }
  }, [active])

  useEffect(() => {
    const previous = previousMessages.current
    const start = previous.first === history[0] ? previous.length : 0
    previousMessages.current = { first: history[0], length: history.length }
    if (!active || !messagesContainerRef.current) return
    const added = [...messagesContainerRef.current.querySelectorAll('.interview-msg')].slice(start)
    const cleanup = added.map(message => animateArrival(message, { offset: 4 }))
    return () => cleanup.forEach(cancel => cancel())
  }, [history, active])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!active || !container) return
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120
    if (isNearBottom) {
      return scrollWithPreference(behavior => messagesEndRef.current?.scrollIntoView({ behavior, block: 'nearest' }))
    }
  }, [history, complete, overallNote, active])

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setSpeechSupported(false)
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => setSpeechPhase('listening')

    recognition.onresult = (event) => {
      let sessionText = ''
      for (let i = 0; i < event.results.length; i++) {
        sessionText += event.results[i][0].transcript
      }
      setCurrentAnswer((sessionBaseRef.current + sessionText).trim())
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        onError(`Speech recognition error: ${event.error}`)
      }
      setSpeechPhase('idle')
    }

    recognition.onend = () => {
      setSpeechPhase('idle')
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [onError])

  const startRecording = () => {
    onError(null)
    sessionBaseRef.current = currentAnswer ? `${currentAnswer} ` : ''
    try {
      if (!recognitionRef.current) throw new Error('Speech is unavailable')
      setSpeechPhase('starting')
      recognitionRef.current?.start()
    } catch {
      setSpeechPhase('idle')
      onError('Could not start recording. Try again.')
    }
  }

  const stopRecording = () => {
    setSpeechPhase('stopping')
    try {
      recognitionRef.current?.stop()
    } catch {
      setSpeechPhase('idle')
      onError('Could not finish recording. Review your answer before submitting.')
    }
  }

  const startInterview = async () => {
    if (requestRef.current || isRecording) return
    const controller = new AbortController()
    const context = { problemId, curveballId, transcript, code }
    requestRef.current = controller
    setIsLoading(true)
    onError(null)
    try {
      const { data } = await axios.post(`${API_URL}/interview/start`, context, { timeout: 60000, signal: controller.signal })
      if (controller.signal.aborted || requestRef.current !== controller) return
      if (typeof data?.question !== 'string' || !data.question.trim()) throw new Error('The interviewer did not return a question. Try starting again.')
      conversationRef.current = context
      setHistory([{ role: 'interviewer', content: data.question.trim() }])
      setComplete(false)
      setOverallNote('')
      setCurrentAnswer('')
    } catch (err) {
      if (controller.signal.aborted || requestRef.current !== controller) return
      onError(
        err.code === 'ECONNABORTED' ? 'The interviewer is taking longer than expected. Try starting again.' : err.response?.data?.error ||
          err.message ||
          'Failed to start interview.'
      )
    } finally {
      if (!controller.signal.aborted && requestRef.current === controller) {
        requestRef.current = null
        setIsLoading(false)
      }
    }
  }

  const submitAnswer = async () => {
    if (isRecording || !currentAnswer.trim() || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller

    setIsLoading(true)
    onError(null)
    const answer = currentAnswer.trim()

    try {
      const { data } = await axios.post(`${API_URL}/interview/respond`, {
        ...conversationRef.current,
        history,
        answer,
      }, { timeout: 60000, signal: controller.signal })
      if (controller.signal.aborted || requestRef.current !== controller) return
      if (typeof data?.complete !== 'boolean' || typeof data?.answerEvaluation?.feedback !== 'string' || !data.answerEvaluation.feedback.trim() ||
          (data.complete !== true && (typeof data.nextQuestion !== 'string' || !data.nextQuestion.trim()))) {
        throw new Error('The interviewer returned an incomplete response. Your answer is still here; try again.')
      }

      const newHistory = [
        ...history,
        { role: 'candidate', content: answer },
      ]

      if (data.answerEvaluation?.feedback) {
        newHistory.push({
          role: 'evaluation',
          content: data.answerEvaluation.feedback,
          score: data.answerEvaluation.score,
          quote: data.answerEvaluation.quote,
        })
      }

      if (!data.complete && data.nextQuestion) {
        newHistory.push({ role: 'interviewer', content: data.nextQuestion })
      }

      setHistory(newHistory)
      setCurrentAnswer('')
      sessionBaseRef.current = ''

      if (data.complete) {
        setComplete(true)
        setOverallNote(data.overallNote || 'Practice complete. Start a new conversation whenever you are ready.')
      }
    } catch (err) {
      if (controller.signal.aborted || requestRef.current !== controller) return
      onError(
        err.code === 'ECONNABORTED' ? 'The interviewer is taking longer than expected. Your answer is still here; try again.' : err.response?.data?.error ||
          err.message ||
          'Failed to submit answer.'
      )
    } finally {
      if (!controller.signal.aborted && requestRef.current === controller) {
        requestRef.current = null
        setIsLoading(false)
      }
    }
  }

  const lastMsg = history[history.length - 1]
  const awaitingAnswer = !complete && lastMsg?.role === 'interviewer'
  const contextChanged = conversationRef.current && (conversationRef.current.code !== code || conversationRef.current.transcript !== transcript)

  return (
    <div className="interview-pane">
      {history.length === 0 ? (
        <div className="interview-start">
          <h3>Follow-up practice</h3>
          <p>
            Answer up to {MAX_FOLLOWUPS} AI follow-up questions about your
            approach and trade-offs.
          </p>
          <button
            className="btn-interview-start"
            onClick={startInterview}
            disabled={isLoading || !transcript.trim()}
          >
            {isLoading ? 'Starting…' : 'Start follow-up practice'}
          </button>
          {!transcript.trim() && (
            <p className="interview-hint">
              Add a spoken or typed explanation while coding to start.
            </p>
          )}
        </div>
      ) : (
        <div className="interview-chat">
          {contextChanged && <div className="interview-context-note"><p className="interview-hint">This conversation uses your code and explanation from when it started.</p><button className="btn-text" disabled={isLoading || isRecording} onClick={startInterview}>Restart with current work</button></div>}
          <div className="interview-messages" ref={messagesContainerRef} role="log" aria-label="Follow-up conversation" aria-live="polite">
            {history.map((msg, i) => (
              <div key={i} className={`interview-msg interview-msg-${msg.role}`}>
                {msg.role === 'interviewer' && (
                  <>
                    <span className="msg-role">Interviewer</span>
                    <p>{msg.content}</p>
                  </>
                )}
                {msg.role === 'candidate' && (
                  <>
                    <span className="msg-role">You</span>
                    <p>{msg.content}</p>
                  </>
                )}
                {msg.role === 'evaluation' && (
                  <div className="msg-evaluation">
                    <span className="msg-role">
                      Feedback {msg.score != null && `· ${msg.score}/10`}
                    </span>
                    <p>{msg.content}</p>
                    {msg.quote && (
                      <blockquote className="feedback-quote">
                        &ldquo;{msg.quote}&rdquo;
                      </blockquote>
                    )}
                  </div>
                )}
              </div>
            ))}
            {complete && overallNote && (
              <div className="interview-complete">
                <span className="msg-role">Practice complete</span>
                <p>{overallNote}</p>
                <button className="btn-interview-start" disabled={isLoading} onClick={startInterview}>{isLoading ? 'Starting…' : 'Start another conversation'}</button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {awaitingAnswer && (
            <div className="interview-input">
              <div className="interview-input-toolbar">
                {!isRecording ? (
                  <button
                    className="btn-interview-record"
                    onClick={startRecording}
                    disabled={!speechSupported || isLoading}
                  >
                    <MicIcon />
                    Record answer
                  </button>
                ) : (
                  <button
                    className="btn-interview-stop"
                    onClick={stopRecording}
                    disabled={isLoading || speechPhase !== 'listening'}
                  >
                    <StopIcon />
                    {speechPhase === 'starting' ? 'Connecting microphone…' : speechPhase === 'stopping' ? 'Finishing transcript…' : 'Stop recording'}
                  </button>
                )}
                {isRecording && (
                  <span className="recording-badge-top">
                    <span className="pulse" />
                    {speechPhase === 'listening' ? 'Listening…' : speechPhase === 'starting' ? 'Waiting for microphone access…' : 'Waiting for the final transcript…'}
                  </span>
                )}
              </div>

              {!speechSupported && (
                <p className="interview-voice-hint">
                  Voice not supported in this browser — type your answer below.
                </p>
              )}

              <label htmlFor="followup-answer" className="interview-answer-label">Your follow-up answer</label>
              <textarea
                ref={answerRef}
                id="followup-answer"
                name="followupAnswer"
                autoComplete="off"
                className="interview-answer"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                readOnly={isRecording}
                disabled={isLoading}
                placeholder="Record an answer or type your response."
                rows={3}
              />
              <button
                className="btn-interview-submit"
                onClick={submitAnswer}
                disabled={isLoading || isRecording || !currentAnswer.trim()}
              >
                {isLoading ? 'Submitting…' : 'Submit answer'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}
