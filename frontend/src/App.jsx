import { useState, useRef, useEffect, useCallback } from 'react'
import axios from 'axios'
import { problems, getProblemBySlug } from './data/problems'
import CodeEditor from './components/CodeEditor'
import RubricFeedback from './components/RubricFeedback'
import TestConsole from './components/TestConsole'
import InterviewPanel from './components/InterviewPanel'
import LearningPlan from './components/LearningPlan'
import ProgressPanel from './components/ProgressPanel'
import { getLearningGoal, LEARNING_GOALS } from './data/learning'
import { addAttempt, loadPractice, writePractice } from './data/practiceStorage'
import './App.css'
import './Learning.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [initialPractice] = useState(loadPractice)
  const [learningGoal, setLearningGoal] = useState(initialPractice.goal)
  const [attempts, setAttempts] = useState(initialPractice.attempts)
  const [storageWarning, setStorageWarning] = useState(initialPractice.warning)
  const [view, setView] = useState('practice')
  const [notice, setNotice] = useState('')
  const [analysisSnapshot, setAnalysisSnapshot] = useState(null)
  const [runSnapshot, setRunSnapshot] = useState(null)
  const [lessonFocus, setLessonFocus] = useState(null)
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
  const inputRevisionRef = useRef(0)
  const codeRevisionRef = useRef(0)
  const currentCodeRef = useRef(problem.starterCode)
  const currentTranscriptRef = useRef('')

  const invalidateFeedback = useCallback(() => {
    inputRevisionRef.current += 1
    setFeedback(null)
    setAnalysisSnapshot(null)
    setNotice('')
    setActiveTab((tab) => tab === 'feedback' ? 'explain' : tab)
  }, [])

  const changeTranscript = useCallback((value) => {
    if (currentTranscriptRef.current === value) return
    currentTranscriptRef.current = value
    invalidateFeedback()
    setTranscript(value)
  }, [invalidateFeedback])

  const changeCode = useCallback((value = '') => {
    if (currentCodeRef.current === value) return
    currentCodeRef.current = value
    codeRevisionRef.current += 1
    invalidateFeedback()
    setCode(value)
    setRunSnapshot(null)
    setRunResults(null)
  }, [invalidateFeedback])

  const switchProblem = useCallback((slug) => {
    const next = getProblemBySlug(slug)
    recognitionRef.current?.abort()
    setIsRecording(false)
    invalidateFeedback()
    codeRevisionRef.current += 1
    currentCodeRef.current = next.starterCode
    currentTranscriptRef.current = ''
    sessionBaseRef.current = ''
    setProblemSlug(slug)
    setCode(next.starterCode)
    setTranscript('')
    setFeedback(null)
    setRunSnapshot(null)
    setLessonFocus(null)
    setRunResults(null)
    setConsoleTab('testcase')
    setSelectedCase(0)
    setActiveTab('code')
    setError(null)
    setShowProblemList(false)
  }, [invalidateFeedback])

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
      changeTranscript((sessionBaseRef.current + sessionText).trim())
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
    return () => recognition.abort()
  }, [changeTranscript])

  const persistPractice = (nextAttempts, nextGoal = learningGoal) => {
    const result = writePractice(nextGoal, nextAttempts)
    setStorageWarning(result.error)
    if (result.ok) setAttempts(nextAttempts)
    return result.ok
  }

  const changeGoal = (goal) => {
    invalidateFeedback()
    setLessonFocus(null)
    setLearningGoal(goal)
    persistPractice(attempts, goal)
  }

  const saveAttempt = () => {
    if (!analysisSnapshot) return
    const snapshot = analysisSnapshot
    try {
      const nextAttempts = addAttempt(attempts, {
        id: snapshot.id,
        createdAt: snapshot.createdAt,
        problemId: snapshot.problemId,
        goal: snapshot.goal,
        score: snapshot.feedback.score,
        rubric: snapshot.feedback.rubric,
        lesson: snapshot.feedback.learningPlan,
        run: snapshot.run,
      })
      if (persistPractice(nextAttempts)) setNotice('Practice saved in this browser. View your progress whenever you are ready.')
    } catch (err) {
      setError(err.message)
    }
  }

  const practiceLesson = () => {
    const plan = feedback?.learningPlan
    if (!plan) return
    if (plan.action === 'transfer') {
      const index = problems.findIndex((item) => item.slug === problemSlug)
      switchProblem(problems[(index + 1) % problems.length].slug)
    } else {
      setLessonFocus(plan)
      setActiveTab('explain')
    }
    setView('practice')
  }

  const startRecording = () => {
    setError(null)
    invalidateFeedback()
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
    const revision = codeRevisionRef.current
    setIsRunning(true)
    setError(null)
    setRunResults(null)
    setRunSnapshot(null)
    setActiveTab('code')
    setConsoleTab('result')

    try {
      const { data } = await axios.post(`${API_URL}/run`, {
        code,
        problemId: problemSlug,
      }, { timeout: 30000 })
      if (revision !== codeRevisionRef.current) return
      if (data.error && !data.results) {
        setError(data.error)
        setRunResults({ error: data.error, results: [] })
      } else {
        setRunResults(data)
        if (Number.isInteger(data.passed) && Number.isInteger(data.total) && data.total > 0) {
          setRunSnapshot({ code, problemId: problemSlug, passed: data.passed, total: data.total })
        }
        const firstFail = data.results?.findIndex((r) => !r.passed)
        setSelectedCase(firstFail >= 0 ? firstFail : 0)
      }
    } catch (err) {
      if (revision !== codeRevisionRef.current) return
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
    setAnalysisSnapshot(null)
    setNotice('')
    const revision = inputRevisionRef.current

    try {
      const { data } = await axios.post(`${API_URL}/analyze`, {
        transcript,
        code,
        problemId: problemSlug,
        learningGoal,
      }, { timeout: 60000 })
      if (revision !== inputRevisionRef.current) return
      setFeedback(data)
      setAnalysisSnapshot({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        problemId: problemSlug,
        goal: learningGoal,
        feedback: data,
        run: runSnapshot?.code === code && runSnapshot.problemId === problemSlug
          ? { passed: runSnapshot.passed, total: runSnapshot.total } : null,
      })
      setLessonFocus(null)
      setActiveTab('feedback')
    } catch (err) {
      if (revision !== inputRevisionRef.current) return
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
          <span className="logo">SkillRelay<span className="brand-dot">↗</span></span>
          <nav className="learning-nav" aria-label="Main navigation">
            <button aria-current={view === 'practice' ? 'page' : undefined} onClick={() => setView('practice')}>Practice</button>
            <button aria-current={view === 'progress' ? 'page' : undefined} onClick={() => { recognitionRef.current?.stop(); setIsRecording(false); setView('progress') }}>Progress <span>{attempts.length}</span></button>
          </nav>
        </div>
        {view === 'practice' && <div className="topbar-actions">
          <span className="topbar-divider" />
          <button
            className="problem-picker-btn"
            onClick={() => setShowProblemList((v) => !v)}
            disabled={isRecording}
            aria-expanded={showProblemList}
          >
            {problem.id}. {problem.title}
            <ChevronIcon />
          </button>
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
        </div>}
      </header>

      {storageWarning && <div className="storage-warning" role="alert">{storageWarning}</div>}
      {notice && <div className="learning-notice" role="status">{notice}</div>}

      {view === 'progress' && <ProgressPanel
        attempts={attempts}
        onPractice={() => setView('practice')}
        onDelete={(id) => { if (persistPractice(attempts.filter((attempt) => attempt.id !== id))) setNotice('Saved attempt removed.') }}
        onClear={() => { if (persistPractice([])) setNotice('Saved practice cleared from this browser.') }}
      />}

      {view === 'practice' && <section className="learning-toolbar" aria-label="Learning goal">
        <div className="learning-intro">
          <p className="section-eyebrow">A little practice. A clearer explanation.</p>
          <p>Practice a challenge, learn from feedback, and take your next step.</p>
        </div>
        <div className="goal-control">
          <label htmlFor="learning-goal">Today I want to</label>
          <select id="learning-goal" value={learningGoal} onChange={(event) => changeGoal(event.target.value)} disabled={isRecording}>
            {LEARNING_GOALS.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
          </select>
          <p>{getLearningGoal(learningGoal).description}</p>
        </div>
      </section>}

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

      <div className={`workspace ${view !== 'practice' ? 'workspace-hidden' : ''}`}>
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
            {lessonFocus && <div className="lesson-reminder" role="note">
              <p className="section-eyebrow">Your practice focus</p>
              <h2>{lessonFocus.title}</h2>
              <p>{lessonFocus.practicePrompt}</p>
              <p><strong>Self-check:</strong> {lessonFocus.selfCheck}</p>
            </div>}
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
                      changeCode(problem.starterCode)
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
                <CodeEditor value={code} onChange={changeCode} />
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
                onChange={(e) => changeTranscript(e.target.value)}
                aria-label="Your solution explanation"
                readOnly={isRecording}
                placeholder="Type your explanation here, or use Start Explanation to speak. Describe the problem, your approach, an example, and the costs."
              />
            </div>

            <div className={`feedback-pane ${activeTab !== 'feedback' || !feedback ? 'pane-hidden' : ''}`}>
              {feedback && <>
                <div className="feedback-save">
                  <div><strong>{getLearningGoal(analysisSnapshot?.goal || learningGoal).title}</strong><p>AI practice feedback. Your next lesson is chosen from this rubric.</p></div>
                  <button className="learning-secondary" onClick={saveAttempt} disabled={!analysisSnapshot || attempts.some((attempt) => attempt.id === analysisSnapshot.id)}>
                    {attempts.some((attempt) => attempt.id === analysisSnapshot?.id) ? 'Practice saved ✓' : 'Save practice summary'}
                  </button>
                  <p className="storage-note">Saves scores and your next lesson in this browser. Code and explanations stay out of saved history.</p>
                </div>
                <LearningPlan plan={feedback.learningPlan} onPractice={practiceLesson} />
              </>}
              <RubricFeedback feedback={feedback} />
            </div>

            <div className={`interview-pane-wrapper ${activeTab !== 'interview' ? 'pane-hidden' : ''}`}>
              <InterviewPanel
                key={problemSlug}
                problemId={problemSlug}
                transcript={transcript}
                code={code}
                active={view === 'practice' && activeTab === 'interview'}
                speechSupported={speechSupported}
                onError={setError}
              />
            </div>
          </div>

          {error && <div className="error-banner" role="alert">{error}</div>}
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
