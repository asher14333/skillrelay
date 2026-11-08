import { useState, useRef, useEffect, useCallback, lazy, Suspense } from 'react'
import axios from 'axios'
import { problems, getProblemBySlug } from './data/problems'
import RubricFeedback from './components/RubricFeedback'
import TestConsole from './components/TestConsole'
import InterviewPanel from './components/InterviewPanel'
import LearningPlan from './components/LearningPlan'
import ProgressPanel from './components/ProgressPanel'
import Icon, { BrandMark } from './components/Icon'
import { getLearningGoal, LEARNING_GOALS } from './data/learning'
import { addAttempt, loadPractice, writePractice } from './data/practiceStorage'
import './App.css'
import './Learning.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const CodeEditor = lazy(() => import('./components/CodeEditor'))

function App() {
  const [initialPractice] = useState(loadPractice)
  const [learningGoal, setLearningGoal] = useState(initialPractice.goal)
  const [attempts, setAttempts] = useState(initialPractice.attempts)
  const [storageWarning, setStorageWarning] = useState(initialPractice.warning)
  const [view, setView] = useState(() => window.location.hash === '#progress' ? 'progress' : 'practice')
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
  const [pendingProblem, setPendingProblem] = useState(null)
  const pickerRef = useRef(null)

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
    setPendingProblem(null)
  }, [invalidateFeedback])

  const navigate = (next) => {
    window.location.hash = next
    setView(next)
    if (next === 'progress') {
      recognitionRef.current?.stop()
      setIsRecording(false)
    }
  }

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash
      if (hash !== '#practice' && hash !== '#progress') return
      const next = hash.slice(1)
      if (next === 'progress') recognitionRef.current?.stop()
      setView(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    const dialog = pickerRef.current
    if (showProblemList && !dialog.open) dialog.showModal()
    if (!showProblemList && dialog.open) dialog.close()
  }, [showProblemList])

  const chooseProblem = (slug) => {
    if (slug === problemSlug) { setShowProblemList(false); return }
    if (code !== problem.starterCode || transcript.trim()) setPendingProblem(slug)
    else switchProblem(slug)
  }

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
      const message = err.response?.data?.error
      setError(
        message?.includes('OPENAI_API_KEY')
          ? 'Feedback isn’t connected yet. You can keep practicing and try again later.'
          : err.code === 'ECONNABORTED'
            ? 'Feedback is taking longer than expected. Your explanation is still here; try again.'
            : message || 'Couldn’t get feedback. Check your connection and try again.'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  return (
    <div className="app">
      <a className="skip-link" href="#main-content">Skip to workspace</a>
      <header className="topbar">
        <a href="#practice" className="brand" aria-label="SkillRelay practice" translate="no">
          <BrandMark /><span>SkillRelay</span>
        </a>
        <nav className="learning-nav" aria-label="Main navigation">
          <a href="#practice" aria-current={view === 'practice' ? 'page' : undefined}><Icon name="code" />Practice</a>
          <a href="#progress" aria-current={view === 'progress' ? 'page' : undefined}><Icon name="progress" />Progress{attempts.length > 0 && <span className="nav-count">{attempts.length}</span>}</a>
        </nav>
        <span className="app-edition">Technical interview practice</span>
      </header>

      <main className="app-main" id="main-content" tabIndex={-1}>
        {storageWarning && <div className="storage-warning" role="alert">{storageWarning}</div>}
        {notice && <div className="learning-notice" role="status"><Icon name="check" />{notice}</div>}

        {view === 'progress' && <ProgressPanel
          attempts={attempts}
          onPractice={() => navigate('practice')}
          onDelete={(id) => {
            const saved = persistPractice(attempts.filter((attempt) => attempt.id !== id))
            if (saved) setNotice('Saved attempt removed.')
            return saved
          }}
          onRestore={(attempt) => {
            const saved = persistPractice(addAttempt(attempts, attempt))
            if (saved) setNotice('Saved attempt restored.')
            return saved
          }}
          onClear={() => { if (persistPractice([])) setNotice('Saved practice cleared from this browser.') }}
        />}

        {view === 'practice' && <section className="learning-toolbar" aria-label="Learning goal">
          <div className="learning-intro">
            <h1>Make your thinking clear.</h1>
            <p>Solve a challenge. Explain your approach. Find your next step.</p>
          </div>
          <div className="goal-control">
            <label htmlFor="learning-goal">Your learning focus</label>
            <select id="learning-goal" name="learningGoal" value={learningGoal} onChange={(event) => changeGoal(event.target.value)} disabled={isRecording}>
              {LEARNING_GOALS.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
            </select>
            <p>{getLearningGoal(learningGoal).description}</p>
          </div>
        </section>}

        <div className={`workspace ${view !== 'practice' ? 'workspace-hidden' : ''}`}>
          <aside className="problem-panel" aria-labelledby="challenge-title">
            <div className="problem-header">
              <div className="challenge-heading">
                <span>Challenge {String(problem.id).padStart(2, '0')} <span className="challenge-total">/ {String(problems.length).padStart(2, '0')}</span></span>
                <button className="change-challenge" onClick={() => setShowProblemList(true)} disabled={isRecording} aria-haspopup="dialog">Change <ChevronIcon /></button>
              </div>
              <h2 id="challenge-title">{problem.title}</h2>
              <div className="problem-meta">
                <span className={`difficulty difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                {problem.topics.map((topic) => <span key={topic} className="topic-tag">{topic}</span>)}
              </div>
            </div>
            <div className="problem-body">
              {lessonFocus && <div className="lesson-reminder" role="note">
                <span className="focus-label"><Icon name="book" /> Your practice focus</span>
                <h3>{lessonFocus.title}</h3>
                <p>{lessonFocus.practicePrompt}</p>
                <p><strong>Self-check:</strong> {lessonFocus.selfCheck}</p>
              </div>}
              <p className="problem-text">{problem.description}</p>
              {problem.details.map((line, i) => <p key={i} className="problem-text">{line}</p>)}
              <details className="example-disclosure" open>
                <summary>Examples <span>{problem.examples.length}</span></summary>
                {problem.examples.map((ex, i) => <div key={i} className="example-block">
                  <p className="example-title">Example {i + 1}</p>
                  <pre className="example-code"><strong>Input:</strong> {ex.input}{'\n'}<strong>Output:</strong> {ex.output}
                    {ex.explanation && <>{'\n'}<strong>Why:</strong> {ex.explanation}</>}
                  </pre>
                </div>)}
              </details>
              <details className="constraints-block">
                <summary>Constraints</summary>
                <ul>{problem.constraints.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </details>
              {!lessonFocus && <div className="explanation-guide">
                <Icon name="book" /><div><h3>More than a correct answer</h3><p>Explain why your approach works, walk through an example, and make the trade-offs clear.</p></div>
              </div>}
            </div>
          </aside>

          <section className="editor-panel" aria-label="Practice workspace">
            <nav className="panel-tabs" aria-label="Practice stages">
              {[
                { id: 'code', number: 1, title: 'Solve' },
                { id: 'explain', number: 2, title: 'Explain' },
                { id: 'feedback', number: 3, title: 'Feedback' },
              ].map((step) => <button key={step.id} className={`tab ${activeTab === step.id ? 'tab-active' : ''}`}
                aria-pressed={activeTab === step.id} disabled={step.id === 'feedback' && !feedback}
                onClick={() => { if (step.id !== 'explain') recognitionRef.current?.stop(); setActiveTab(step.id) }}>
                <span className="step-number">{step.number}</span>{step.title}
                {step.id === 'explain' && isRecording && <span className="tab-recording-dot" />}
              </button>)}
              <button className={`tab tab-followup ${activeTab === 'interview' ? 'tab-active' : ''}`} aria-pressed={activeTab === 'interview'} onClick={() => { recognitionRef.current?.stop(); setActiveTab('interview') }}>Follow-up</button>
            </nav>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <div className="panel-content">
              <div className={`code-pane ${activeTab !== 'code' ? 'pane-hidden' : ''}`}>
                <div className="code-toolbar">
                  <span className="lang-label"><span className="language-dot" />Python 3</span>
                  <div className="code-toolbar-right">
                    <button className="btn-text" onClick={() => { changeCode(problem.starterCode); setRunResults(null); setConsoleTab('testcase') }}>Reset code</button>
                    <button className="btn-run-lc" onClick={handleRun} disabled={isRunning}><PlayIcon />{isRunning ? 'Running…' : 'Run code'}</button>
                  </div>
                </div>
                <div className="monaco-wrapper"><Suspense fallback={<div className="editor-loading" role="status">Opening your editor…</div>}><CodeEditor value={code} onChange={changeCode} /></Suspense></div>
                <TestConsole problem={problem} consoleTab={consoleTab} setConsoleTab={setConsoleTab} selectedCase={selectedCase} setSelectedCase={setSelectedCase} runResults={runResults} />
                <div className="flow-footer"><span>A solution is a starting point.</span><button className="learning-primary" onClick={() => setActiveTab('explain')}>Explain your approach <Icon name="arrow" size={16} /></button></div>
              </div>

              <div className={`explain-pane ${activeTab !== 'explain' ? 'pane-hidden' : ''}`}>
                {activeTab === 'explain' && <>
                  <div className="explanation-heading"><h2>Walk through your thinking.</h2><p>Start with the problem, explain your approach, and use an example.</p></div>
                  {!speechSupported && <p className="warning">Voice input isn’t available in this browser. You can type your explanation below.</p>}
                  <div className="writing-area"><label className="sr-only" htmlFor="solution-explanation">Your solution explanation</label>
                    <textarea id="solution-explanation" name="transcript" autoComplete="off" className="transcript-editor" value={transcript} onChange={(event) => changeTranscript(event.target.value)} readOnly={isRecording}
                      placeholder="For example: I’m looking for two indices whose values add up to the target. My first approach would be…" />
                    <span className="word-count">{transcript.trim() ? transcript.trim().split(/\s+/).length : 0} words</span>
                  </div>
                  <div className="flow-footer explanation-actions">
                    <div>{!isRecording ? <button className="learning-secondary" onClick={startRecording} disabled={!speechSupported}><MicIcon />Use microphone</button> : <button className="learning-danger" onClick={stopRecording}><StopIcon />Stop recording</button>}
                      {isRecording && <span className="recording-badge-top"><span className="pulse" />Listening…</span>}</div>
                    <button className="learning-primary" onClick={handleAnalyze} disabled={isAnalyzing || isRecording || !transcript.trim()}>{isAnalyzing ? 'Getting feedback…' : 'Get feedback'}<Icon name="arrow" size={16} /></button>
                  </div>
                </>}
              </div>

              <div className={`feedback-pane ${activeTab !== 'feedback' || !feedback ? 'pane-hidden' : ''}`}>
                {feedback && <>
                  <div className="feedback-save"><div><h2>Your next learning step</h2><p>{getLearningGoal(analysisSnapshot?.goal || learningGoal).title}</p></div>
                    <button className="learning-secondary" onClick={saveAttempt} disabled={!analysisSnapshot || attempts.some((attempt) => attempt.id === analysisSnapshot.id)}>
                      <Icon name={attempts.some((attempt) => attempt.id === analysisSnapshot?.id) ? 'check' : 'save'} size={16} />
                      {attempts.some((attempt) => attempt.id === analysisSnapshot?.id) ? 'Practice saved' : 'Save practice'}
                    </button>
                  </div>
                  <LearningPlan plan={feedback.learningPlan} onPractice={practiceLesson} />
                  <p className="feedback-storage"><Icon name="shield" size={15} />Saved summaries stay on this device. Code and explanations aren’t included.</p>
                </>}
                <RubricFeedback feedback={feedback} />
              </div>
              <div className={`interview-pane-wrapper ${activeTab !== 'interview' ? 'pane-hidden' : ''}`}>
                <InterviewPanel key={problemSlug} problemId={problemSlug} transcript={transcript} code={code} active={view === 'practice' && activeTab === 'interview'} speechSupported={speechSupported} onError={setError} />
              </div>
            </div>
          </section>
        </div>
      </main>

      <dialog className="problem-picker" ref={pickerRef} aria-labelledby="picker-title" onClose={() => { setShowProblemList(false); setPendingProblem(null) }} onCancel={() => setShowProblemList(false)}>
        <div className="picker-header"><div><h2 id="picker-title">Choose your next challenge</h2><p>Five ways to practice explaining your thinking.</p></div><button className="icon-button" aria-label="Close challenge picker" onClick={() => setShowProblemList(false)}><Icon name="close" /></button></div>
        <div className="picker-list">{problems.map((item) => <button key={item.slug} className={`problem-picker-item ${item.slug === problemSlug ? 'active' : ''} ${item.slug === pendingProblem ? 'pending' : ''}`}
          onClick={() => chooseProblem(item.slug)} aria-current={item.slug === problemSlug ? 'true' : undefined}>
          <span className="picker-id">{String(item.id).padStart(2, '0')}</span><span className="picker-title">{item.title}</span><span className={`difficulty difficulty-${item.difficulty.toLowerCase()}`}>{item.difficulty}</span>
        </button>)}</div>
        {pendingProblem && <div className="draft-notice" role="alert"><strong>Switch to {getProblemBySlug(pendingProblem).title}?</strong><p>Your current code and explanation will be cleared.</p><button className="learning-primary" onClick={() => switchProblem(pendingProblem)}>Switch challenge</button><button className="learning-secondary" onClick={() => { setPendingProblem(null); setShowProblemList(false) }}>Keep working</button></div>}
      </dialog>
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
