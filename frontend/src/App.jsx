import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { problems, getProblemBySlug } from './data/problems'
import CodeEditor from './components/CodeEditor'
import RubricFeedback from './components/RubricFeedback'
import TestConsole from './components/TestConsole'
import InterviewPanel from './components/InterviewPanel'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [problemSlug, setProblemSlug] = useState('two-sum')
  const problem = getProblemBySlug(problemSlug)

  const [code, setCode] = useState(problem.starterCode)
  const [transcript, setTranscript] = useState('')
  const [activeTab, setActiveTab] = useState('code')
  const [isRecording, setIsRecording] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runResults, setRunResults] = useState(null)
  const [consoleTab, setConsoleTab] = useState('testcase')
  const [selectedCase, setSelectedCase] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [showProblemList, setShowProblemList] = useState(false)

  const recognitionRef = useRef(null)
  const sessionBaseRef = useRef('')

  const switchProblem = useCallback((slug) => {
    const next = getProblemBySlug(slug)
    setProblemSlug(slug)
    setCode(next.starterCode)
    setTranscript('')
    setFeedback(null)
    setRunResults(null)
    setConsoleTab('testcase')
    setSelectedCase(0)
    setActiveTab('code')
    setError(null)
    setShowProblemList(false)
  }, [])

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
      setTranscript((sessionBaseRef.current + sessionText).trim())
    }

    recognition.onerror = (event) => {
      if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`)
      }
      setIsRecording(false)
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
  }, [])

  const startRecording = () => {
    setError(null)
    setFeedback(null)
    setActiveTab('explain')
    sessionBaseRef.current = transcript ? `${transcript} ` : ''
    try {
      recognitionRef.current?.start()
      setIsRecording(true)
    } catch {
      setError('Could not start recording. Try again.')
    }
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  const handleRun = async () => {
    setIsRunning(true)
    setError(null)
    setRunResults(null)
    setActiveTab('code')
    setConsoleTab('result')

    try {
      const { data } = await axios.post(`${API_URL}/run`, {
        code,
        problemId: problemSlug,
      })
      if (data.error && !data.results) {
        setError(data.error)
        setRunResults({ error: data.error, results: [] })
      } else {
        setRunResults(data)
        const firstFail = data.results?.findIndex((r) => !r.passed)
        setSelectedCase(firstFail >= 0 ? firstFail : 0)
      }
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.message ||
        'Failed to run code. Make sure the backend is running.'
      setError(message)
      setRunResults({ error: message, results: [] })
    } finally {
      setIsRunning(false)
    }
  }

  const handleAnalyze = async () => {
    if (isRecording) {
      setError('Stop your explanation before analyzing.')
      return
    }
    if (!transcript.trim()) {
      setError('Please record or type your explanation first.')
      setActiveTab('explain')
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setFeedback(null)

    try {
      const { data } = await axios.post(`${API_URL}/analyze`, {
        transcript,
        code,
        problemId: problemSlug,
      })
      setFeedback(data)
      setActiveTab('feedback')
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.message ||
          'Failed to analyze. Make sure the backend is running.'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">SpeakCode</span>
          <span className="topbar-divider" />
          <button
            className="problem-picker-btn"
            onClick={() => setShowProblemList((v) => !v)}
          >
            {problem.id}. {problem.title}
            <ChevronIcon />
          </button>
        </div>
        <div className="topbar-actions">
          {!isRecording ? (
            <button
              className="btn-record-top"
              onClick={startRecording}
              disabled={!speechSupported}
            >
              <MicIcon />
              Start Explanation
            </button>
          ) : (
            <button className="btn-stop-top" onClick={stopRecording}>
              <StopIcon />
              Stop Explanation
            </button>
          )}
          {isRecording && (
            <span className="recording-badge-top">
              <span className="pulse" />
              Listening…
            </span>
          )}
          <button
            className="btn-analyze-top"
            onClick={handleAnalyze}
            disabled={isAnalyzing || isRecording || !transcript.trim()}
          >
            {isAnalyzing ? 'Analyzing…' : 'Analyze Interview'}
          </button>
        </div>
      </header>

      {showProblemList && (
        <div className="problem-picker-overlay" onClick={() => setShowProblemList(false)}>
          <div className="problem-picker" onClick={(e) => e.stopPropagation()}>
            <h3>Problems</h3>
            {problems.map((p) => (
              <button
                key={p.slug}
                className={`problem-picker-item ${p.slug === problemSlug ? 'active' : ''}`}
                onClick={() => switchProblem(p.slug)}
              >
                <span className="picker-id">{p.id}.</span>
                <span className="picker-title">{p.title}</span>
                <span className={`difficulty difficulty-${p.difficulty.toLowerCase()}`}>
                  {p.difficulty}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="workspace">
        <aside className="problem-panel">
          <div className="problem-header">
            <h1>{problem.title}</h1>
            <div className="problem-meta">
              <span className={`difficulty difficulty-${problem.difficulty.toLowerCase()}`}>
                {problem.difficulty}
              </span>
              {problem.topics.map((topic) => (
                <span key={topic} className="topic-tag">
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="problem-body">
            <p className="problem-text">{problem.description}</p>
            {problem.details.map((line, i) => (
              <p key={i} className="problem-text">
                {line}
              </p>
            ))}

            {problem.examples.map((ex, i) => (
              <div key={i} className="example-block">
                <p className="example-title">Example {i + 1}:</p>
                <pre className="example-code">
                  <strong>Input:</strong> {ex.input}
                  {'\n'}
                  <strong>Output:</strong> {ex.output}
                  {ex.explanation && (
                    <>
                      {'\n'}
                      <strong>Explanation:</strong> {ex.explanation}
                    </>
                  )}
                </pre>
              </div>
            ))}

            <div className="constraints-block">
              <p className="section-title">Constraints:</p>
              <ul>
                {problem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </aside>

        <main className="editor-panel">
          <div className="panel-tabs">
            <button
              className={`tab ${activeTab === 'code' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('code')}
            >
              Code
            </button>
            <button
              className={`tab ${activeTab === 'explain' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('explain')}
            >
              Explanation
              {isRecording && <span className="tab-recording-dot" />}
            </button>
            {feedback && (
              <button
                className={`tab ${activeTab === 'feedback' ? 'tab-active' : ''}`}
                onClick={() => setActiveTab('feedback')}
              >
                Feedback
              </button>
            )}
            <button
              className={`tab ${activeTab === 'interview' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('interview')}
            >
              Interview
            </button>
          </div>

          <div className="panel-content">
            <div className={`code-pane ${activeTab !== 'code' ? 'pane-hidden' : ''}`}>
              <div className="code-toolbar">
                <span className="lang-label">Python3</span>
                <div className="code-toolbar-right">
                  <button
                    className="btn-text"
                    onClick={() => {
                      setCode(problem.starterCode)
                      setRunResults(null)
                      setConsoleTab('testcase')
                    }}
                  >
                    Reset
                  </button>
                  <button
                    className="btn-run-lc"
                    onClick={handleRun}
                    disabled={isRunning}
                  >
                    <PlayIcon />
                    {isRunning ? 'Running…' : 'Run'}
                  </button>
                </div>
              </div>

              <div className="monaco-wrapper">
                <CodeEditor value={code} onChange={setCode} />
              </div>

              <TestConsole
                problem={problem}
                consoleTab={consoleTab}
                setConsoleTab={setConsoleTab}
                selectedCase={selectedCase}
                setSelectedCase={setSelectedCase}
                runResults={runResults}
              />
            </div>

            <div className={`explain-pane ${activeTab !== 'explain' ? 'pane-hidden' : ''}`}>
              {!speechSupported && (
                <p className="warning">
                  Speech recognition isn&apos;t supported in this browser. Type
                  your explanation below.
                </p>
              )}
              <textarea
                className="transcript-editor"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                readOnly={isRecording}
                placeholder="Your explanation will appear here when you start speaking…"
              />
            </div>

            <div className={`feedback-pane ${activeTab !== 'feedback' || !feedback ? 'pane-hidden' : ''}`}>
              <RubricFeedback feedback={feedback} />
            </div>

            <div className={`interview-pane-wrapper ${activeTab !== 'interview' ? 'pane-hidden' : ''}`}>
              <InterviewPanel
                key={problemSlug}
                problemId={problemSlug}
                transcript={transcript}
                code={code}
                speechSupported={speechSupported}
                onError={setError}
              />
            </div>
          </div>

          {error && <div className="error-banner">{error}</div>}
        </main>
      </div>
    </div>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  )
}

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M7 10l5 5 5-5z" />
    </svg>
  )
}

export default App
