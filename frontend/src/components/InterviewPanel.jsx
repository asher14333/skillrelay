import { useState, useRef, useEffect } from 'react'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const MAX_FOLLOWUPS = 3

export default function InterviewPanel({
  problemId,
  transcript,
  code,
  onError,
}) {
  const [history, setHistory] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [complete, setComplete] = useState(false)
  const [overallNote, setOverallNote] = useState('')
  const [speechSupported, setSpeechSupported] = useState(true)

  const recognitionRef = useRef(null)
  const sessionBaseRef = useRef('')
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 120
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [history, complete, overallNote])

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
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.abort()
    }
  }, [])

  const startRecording = () => {
    onError(null)
    sessionBaseRef.current = currentAnswer ? `${currentAnswer} ` : ''
    try {
      recognitionRef.current?.start()
      setIsRecording(true)
    } catch {
      onError('Could not start recording. Try again.')
    }
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  const startInterview = async () => {
    setIsLoading(true)
    onError(null)
    try {
      const { data } = await axios.post(`${API_URL}/interview/start`, {
        problemId,
        transcript,
        code,
      })
      setHistory([{ role: 'interviewer', content: data.question }])
      setComplete(false)
      setOverallNote('')
      setCurrentAnswer('')
    } catch (err) {
      onError(
        err.response?.data?.error ||
          err.message ||
          'Failed to start interview.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const submitAnswer = async () => {
    if (isRecording) {
      stopRecording()
    }
    if (!currentAnswer.trim()) return

    setIsLoading(true)
    onError(null)
    const answer = currentAnswer.trim()

    try {
      const { data } = await axios.post(`${API_URL}/interview/respond`, {
        problemId,
        transcript,
        code,
        history,
        answer,
      })

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

      if (data.nextQuestion) {
        newHistory.push({ role: 'interviewer', content: data.nextQuestion })
      }

      setHistory(newHistory)
      setCurrentAnswer('')
      sessionBaseRef.current = ''

      if (data.complete) {
        setComplete(true)
        setOverallNote(data.overallNote || '')
      }
    } catch (err) {
      onError(
        err.response?.data?.error ||
          err.message ||
          'Failed to submit answer.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const lastMsg = history[history.length - 1]
  const awaitingAnswer = !complete && lastMsg?.role === 'interviewer'

  return (
    <div className="interview-pane">
      {history.length === 0 ? (
        <div className="interview-start">
          <h3>Interview Follow-up Mode</h3>
          <p>
            The AI interviewer will ask up to {MAX_FOLLOWUPS} follow-up questions
            based on your explanation — just like a real interview.
          </p>
          <button
            className="btn-interview-start"
            onClick={startInterview}
            disabled={isLoading || !transcript.trim()}
          >
            {isLoading ? 'Starting…' : 'Start Follow-up Interview'}
          </button>
          {!transcript.trim() && (
            <p className="interview-hint">
              Record your explanation first before starting follow-ups.
            </p>
          )}
        </div>
      ) : (
        <div className="interview-chat">
          <div className="interview-messages" ref={messagesContainerRef}>
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
                <span className="msg-role">Interview Complete</span>
                <p>{overallNote}</p>
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
                    Start Answer
                  </button>
                ) : (
                  <button
                    className="btn-interview-stop"
                    onClick={stopRecording}
                    disabled={isLoading}
                  >
                    <StopIcon />
                    Stop
                  </button>
                )}
                {isRecording && (
                  <span className="recording-badge-top">
                    <span className="pulse" />
                    Listening…
                  </span>
                )}
              </div>

              {!speechSupported && (
                <p className="interview-voice-hint">
                  Voice not supported in this browser — type your answer below.
                </p>
              )}

              <textarea
                className="interview-answer"
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                readOnly={isRecording}
                placeholder="Click Start Answer and speak, or type your response…"
                rows={3}
              />
              <button
                className="btn-interview-submit"
                onClick={submitAnswer}
                disabled={isLoading || isRecording || !currentAnswer.trim()}
              >
                {isLoading ? 'Submitting…' : 'Submit Answer'}
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
