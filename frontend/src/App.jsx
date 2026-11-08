import { useState, useRef, useEffect, useLayoutEffect, useCallback, lazy, Suspense } from 'react'
import axios from 'axios'
import { problems, getProblemBySlug } from './data/problems'
import RubricFeedback from './components/RubricFeedback'
import TestConsole from './components/TestConsole'
import CurveballPractice from './components/CurveballPractice'
import { getCurveball, withCurveball } from './data/curveballs'
import InterviewPanel from './components/InterviewPanel'
import LearningPlan from './components/LearningPlan'
import ProgressPanel from './components/ProgressPanel'
import ReasoningReplay from './components/ReasoningReplay'
import FocusedRetry from './components/FocusedRetry'
import Icon, { BrandMark } from './components/Icon'
import Disclosure from './components/Disclosure'
import TabIndicator from './components/TabIndicator'
import DisplaySettings from './components/DisplaySettings'
import useDisplayPreferences from './lib/useDisplayPreferences'
import { animateArrival, useArrival } from './lib/motion'
import { getLearningGoal, LEARNING_GOALS } from './data/learning'
import { addAttempt, loadPractice, writePractice } from './data/practiceStorage'
import { appendCheckpoint, checkpointPayload, MAX_CODE, MAX_EXPLANATION } from './data/sessionReplay'
import './App.css'
import './Learning.css'
import './DisplaySettings.css'
import './Curveball.css'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const CodeEditor = lazy(() => import('./components/CodeEditor'))

function App() {
  const { preferences, warning: displayWarning, changePreference, reducedMotion } = useDisplayPreferences()
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
  const [curveballSession, setCurveballSession] = useState(null)
  const curveballDefinition = getCurveball(problemSlug)
  const curveballId = curveballSession?.id || null
  const problem = withCurveball(getProblemBySlug(problemSlug), curveballId ? curveballDefinition : null)

  const [code, setCode] = useState(problem.starterCode)
  const [transcript, setTranscript] = useState('')
  const [activeTab, setActiveTab] = useState('code')
  const [isRecording, setIsRecording] = useState(false)
  const [speechPhase, setSpeechPhase] = useState('idle')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [runResults, setRunResults] = useState(null)
  const [resetCodeDraft, setResetCodeDraft] = useState(null)
  const [consoleTab, setConsoleTab] = useState('testcase')
  const [selectedCase, setSelectedCase] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const [error, setError] = useState(null)
  const [speechSupported, setSpeechSupported] = useState(true)
  const [showProblemList, setShowProblemList] = useState(false)
  const [pendingProblem, setPendingProblem] = useState(null)
  const [checkpoints, setCheckpoints] = useState([])
  const [retryTask, setRetryTask] = useState(null)
  const retryTaskIdRef = useRef(null)
  const pickerRef = useRef(null)
  const feedbackHeadingRef = useRef(null)
  const mainRef = useRef(null)
  const panelTabsRef = useRef(null)
  const panelContentRef = useRef(null)
  const noticeRef = useRef(null)
  const previousNavigation = useRef({ view, tab: activeTab })
  useArrival(noticeRef, notice)

  useLayoutEffect(() => {
    const previous = previousNavigation.current
    previousNavigation.current = { view, tab: activeTab }
    if (previous.view === view && previous.tab === activeTab) return
    if (view === 'progress') return animateArrival(mainRef.current?.querySelector('.progress-panel'))
    if (activeTab !== 'code') return animateArrival(panelContentRef.current?.querySelector(':scope > :not(.pane-hidden)'))
  }, [view, activeTab])

  const recognitionRef = useRef(null)
  const sessionBaseRef = useRef('')
  const inputRevisionRef = useRef(0)
  const codeRevisionRef = useRef(0)
  const currentCodeRef = useRef(problem.starterCode)
  const currentTranscriptRef = useRef('')
  const sessionRef = useRef({ startedAt: null, moments: [], timers: {} })
  const generationRef = useRef(0)
  const speechGenerationRef = useRef(null)
  const lastFinalSpeechRef = useRef('')

  const captureMoment = useCallback((kind, extra = {}) => {
    const session = sessionRef.current
    const now = Date.now()
    if (session.startedAt === null) session.startedAt = now
    session.moments = appendCheckpoint(session.moments, {
      kind, code: currentCodeRef.current, transcript: currentTranscriptRef.current,
      elapsedMs: now - session.startedAt, ...extra,
    })
    setCheckpoints(session.moments)
    return session.moments
  }, [])

  const scheduleMoment = useCallback((kind) => {
    clearTimeout(sessionRef.current.timers[kind])
    sessionRef.current.timers[kind] = setTimeout(() => {
      delete sessionRef.current.timers[kind]
      captureMoment(kind)
    }, 1100)
  }, [captureMoment])

  const flushPendingMoments = useCallback(() => {
    for (const [kind, timer] of Object.entries(sessionRef.current.timers)) {
      clearTimeout(timer)
      delete sessionRef.current.timers[kind]
      captureMoment(kind)
    }
  }, [captureMoment])

  useEffect(() => {
    const session = sessionRef.current
    return () => {
      Object.values(session.timers).forEach(clearTimeout)
      generationRef.current += 1
    }
  }, [])

  const invalidateFeedback = useCallback(() => {
    inputRevisionRef.current += 1
    setFeedback(null)
    setAnalysisSnapshot(null)
    setRetryTask(null)
    retryTaskIdRef.current = null
    setNotice('')
    setActiveTab((tab) => ['feedback', 'retry'].includes(tab) ? 'code' : tab)
  }, [])

  useEffect(() => {
    if (view === 'practice' && activeTab === 'feedback') feedbackHeadingRef.current?.focus()
  }, [activeTab, view])

  useEffect(() => {
    if (view !== 'practice' || (code === problem.starterCode && !transcript.trim())) return
    const warnBeforeLeaving = (event) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warnBeforeLeaving)
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving)
  }, [view, code, transcript, problem.starterCode])

  const changeTranscript = useCallback((value, shouldCapture = true) => {
    if (currentTranscriptRef.current === value) return
    if (!sessionRef.current.moments.length) captureMoment('start')
    currentTranscriptRef.current = value
    invalidateFeedback()
    setTranscript(value)
    if (shouldCapture) scheduleMoment('explanation')
  }, [invalidateFeedback, captureMoment, scheduleMoment])

  const changeCode = useCallback((value = '') => {
    if (currentCodeRef.current === value) return
    if (!sessionRef.current.moments.length) captureMoment('start')
    currentCodeRef.current = value
    setResetCodeDraft(null)
    codeRevisionRef.current += 1
    invalidateFeedback()
    setCode(value)
    setRunSnapshot(null)
    setRunResults(null)
    scheduleMoment('code')
  }, [invalidateFeedback, captureMoment, scheduleMoment])

  const switchProblem = useCallback((slug) => {
    const next = getProblemBySlug(slug)
    generationRef.current += 1
    Object.values(sessionRef.current.timers).forEach(clearTimeout)
    Object.assign(sessionRef.current, { startedAt: null, moments: [], timers: {} })
    setCheckpoints([])
    recognitionRef.current?.abort()
    setIsRecording(false)
    setSpeechPhase('idle')
    invalidateFeedback()
    codeRevisionRef.current += 1
    currentCodeRef.current = next.starterCode
    currentTranscriptRef.current = ''
    sessionBaseRef.current = ''
    setProblemSlug(slug)
    setCurveballSession(null)
    setResetCodeDraft(null)
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
      if (speechGenerationRef.current !== generationRef.current) return
      let sessionText = ''
      let finalText = ''
      for (let i = 0; i < event.results.length; i++) {
        sessionText += event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript
      }
      changeTranscript((sessionBaseRef.current + sessionText).trim(), false)
      if (finalText && finalText !== lastFinalSpeechRef.current) {
        lastFinalSpeechRef.current = finalText
        captureMoment('explanation', { transcript: (sessionBaseRef.current + finalText).trim() })
      }
    }

    recognition.onstart = () => {
      if (speechGenerationRef.current === generationRef.current) {
        setSpeechPhase('listening')
        captureMoment('microphone')
      }
    }

    recognition.onerror = (event) => {
      if (speechGenerationRef.current !== generationRef.current) return
      if (event.error !== 'aborted') {
        setError(`Speech recognition error: ${event.error}`)
      }
      setIsRecording(false)
      setSpeechPhase('idle')
    }

    recognition.onend = () => {
      if (speechGenerationRef.current !== generationRef.current) return
      setIsRecording(false)
      setSpeechPhase('idle')
      if (speechGenerationRef.current === generationRef.current) captureMoment('explanation')
      speechGenerationRef.current = null
    }

    recognitionRef.current = recognition
    return () => recognition.abort()
  }, [changeTranscript, captureMoment])

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
        curveballId: snapshot.curveballId,
        score: snapshot.feedback.score,
        rubric: snapshot.feedback.rubric,
        lesson: snapshot.feedback.learningPlan,
        run: snapshot.run,
        retrySummary: snapshot.retrySummary,
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
      startFocusedRetry(plan.dimension)
    }
    setView('practice')
  }

  const startFocusedRetry = (dimension, checkpointId = null) => {
    if (!analysisSnapshot || !dimension) return
    const spec = analysisSnapshot.feedback.focusedPractice?.[dimension]
    if (!spec) return
    if (retryTask?.analysisId === analysisSnapshot.id && retryTask.dimension === dimension && retryTask.checkpointId === checkpointId) {
      setActiveTab('retry')
      return
    }
    const moment = checkpointId ? analysisSnapshot.checkpoints.find((item) => item.id === checkpointId) : null
    const task = { id: crypto.randomUUID(), analysisId: analysisSnapshot.id, problemId: analysisSnapshot.problemId, curveballId: analysisSnapshot.curveballId, checkpointId,
      dimension, code: moment ? moment.code : analysisSnapshot.code,
      before: moment ? moment.transcript : analysisSnapshot.transcript, prompt: spec.prompt, criteria: spec.criteria }
    retryTaskIdRef.current = task.id
    setRetryTask(task)
    setActiveTab('retry')
  }

  const revealCurveball = () => {
    if (!curveballDefinition || curveballSession || isRunning || isAnalyzing || isRecording) return
    flushPendingMoments()
    setCurveballSession({ id: curveballDefinition.id, code, transcript })
    invalidateFeedback()
    codeRevisionRef.current += 1
    setRunSnapshot(null)
    setRunResults(null)
    setLessonFocus(null)
    setSelectedCase(problem.testCases.length)
    setConsoleTab('testcase')
    setActiveTab('code')
    Object.values(sessionRef.current.timers).forEach(clearTimeout)
    Object.assign(sessionRef.current, { startedAt: null, moments: [], timers: {} })
    captureMoment('start')
  }

  const startRecording = () => {
    setError(null)
    invalidateFeedback()
    setActiveTab('code')
    sessionBaseRef.current = transcript ? `${transcript} ` : ''
    speechGenerationRef.current = generationRef.current
    lastFinalSpeechRef.current = ''
    if (!sessionRef.current.moments.length) captureMoment('start')
    try {
      setSpeechPhase('starting')
      recognitionRef.current?.start()
      setIsRecording(true)
    } catch {
      setIsRecording(false)
      setSpeechPhase('idle')
      setError('Could not start recording. Try again.')
    }
  }

  const stopRecording = () => {
    setSpeechPhase('stopping')
    recognitionRef.current?.stop()
  }

  const handleRun = async () => {
    flushPendingMoments()
    if (!sessionRef.current.moments.length) captureMoment('start')
    captureMoment('run')
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
        curveballId,
      }, { timeout: 30000 })
      if (revision !== codeRevisionRef.current) return
      if (data.error && !data.results) {
        setError(data.error)
        setRunResults({ error: data.error, results: [] })
      } else {
        setRunResults(data)
        if (Number.isInteger(data.passed) && Number.isInteger(data.total) && data.total > 0) {
          setRunSnapshot({ code, problemId: problemSlug, curveballId, passed: data.passed, total: data.total })
          captureMoment('run-result', { run: { passed: data.passed, total: data.total } })
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
    if (isRunning || isAnalyzing) return
    if (isRecording) {
      setError('Stop your explanation before analyzing.')
      return
    }
    if (!transcript.trim()) {
      setError('Please record or type your explanation first.')
      setActiveTab('code')
      return
    }
    if (code.length > MAX_CODE || transcript.length > MAX_EXPLANATION) {
      setError('Keep this session under 12,000 code characters and 6,000 explanation characters to get feedback.')
      return
    }

    flushPendingMoments()
    const reviewCheckpoints = checkpointPayload(captureMoment('review'))

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
        curveballId,
        learningGoal,
        checkpoints: reviewCheckpoints,
      }, { timeout: 60000 })
      if (revision !== inputRevisionRef.current) return
      setFeedback(data)
      setAnalysisSnapshot({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        problemId: problemSlug,
        curveballId,
        goal: learningGoal,
        feedback: data,
        code, transcript, checkpoints: reviewCheckpoints,
        run: runSnapshot?.code === code && runSnapshot.problemId === problemSlug && runSnapshot.curveballId === curveballId
          ? { passed: runSnapshot.passed, total: runSnapshot.total } : null,
      })
      setLessonFocus(null)
      setActiveTab('feedback')
    } catch (err) {
      if (revision !== inputRevisionRef.current) return
      const message = err.response?.data?.error
      setError(
        err.response?.data?.code === 'AI_NOT_CONFIGURED'
          ? 'Feedback isn’t connected yet. You can keep practicing and try again later.'
          : err.code === 'ECONNABORTED'
            ? 'Feedback is taking longer than expected. Your explanation is still here; try again.'
            : message || 'Couldn’t get feedback. Check your connection and try again.'
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const savedAttempt = attempts.find((attempt) => attempt.id === analysisSnapshot?.id)
  const isCurrentSaved = !!savedAttempt && (!analysisSnapshot?.retrySummary || savedAttempt.retrySummary?.createdAt === analysisSnapshot.retrySummary.createdAt)

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
        <DisplaySettings preferences={preferences} warning={displayWarning} onChange={changePreference} />
      </header>

      <main ref={mainRef} className="app-main" id="main-content" tabIndex={-1}>
        {storageWarning && <div className="storage-warning" role="alert">{storageWarning}</div>}
        {notice && <div ref={noticeRef} className="learning-notice" role="status"><Icon name="check" /><span>{notice}</span><button className="icon-button" aria-label="Dismiss notice" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}

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
            <h1>Practice workspace</h1>
            <p>Explain your choices as you code.</p>
          </div>
          <div className="goal-control">
            <label htmlFor="learning-goal">Your learning focus</label>
            <select id="learning-goal" name="learningGoal" aria-describedby="learning-goal-description" value={learningGoal} onChange={(event) => changeGoal(event.target.value)} disabled={isRecording}>
              {LEARNING_GOALS.map((goal) => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
            </select>
            <p id="learning-goal-description">{getLearningGoal(learningGoal).description}</p>
          </div>
        </section>}

        <div className={`workspace ${view !== 'practice' ? 'workspace-hidden' : ''}`}>
          <aside className="problem-panel" aria-labelledby="challenge-title">
            <div className="problem-panel-toolbar">
              <span><Icon name="book" size={15} />Problem</span>
              <button className="change-challenge" onClick={() => setShowProblemList(true)} disabled={isRecording} aria-haspopup="dialog">Change <ChevronIcon /></button>
            </div>
            <div className="problem-header">
              <h2 id="challenge-title">{problem.title}</h2>
              <div className="problem-meta">
                <span className={`difficulty difficulty-${problem.difficulty.toLowerCase()}`}>{problem.difficulty}</span>
                {problem.topics.map((topic) => <span key={topic} className="topic-tag">{topic}</span>)}
              </div>
            </div>
            <div className="problem-body">
              <CurveballPractice key={`${problemSlug}:${curveballId || 'base'}`} definition={curveballDefinition} session={curveballSession}
                code={code} transcript={transcript} disabled={isRecording || isRunning || isAnalyzing}
                onReveal={revealCurveball} onRunResult={data => {
                  setRunResults(data)
                  setRunSnapshot({ code, problemId: problemSlug, curveballId, passed: data.passed, total: data.total })
                  setConsoleTab('result')
                  const failed = data.results.findIndex(result => !result.passed)
                  setSelectedCase(failed >= 0 ? failed : 0)
                }} />
              {lessonFocus && <div className="lesson-reminder" role="note">
                <span className="focus-label"><Icon name="book" /> Your practice focus</span>
                <h3>{lessonFocus.title}</h3>
                <p>{lessonFocus.practicePrompt}</p>
                <p><strong>Self-check:</strong> {lessonFocus.selfCheck}</p>
              </div>}
              <p className="problem-text">{problem.description}</p>
              {problem.details.map((line, i) => <p key={i} className="problem-text">{line}</p>)}
              <Disclosure className="example-disclosure" open>
                <summary>Examples <span>{problem.examples.length}</span></summary>
                {problem.examples.map((ex, i) => <div key={i} className="example-block">
                  <p className="example-title">Example {i + 1}</p>
                  <pre className="example-code"><strong>Input:</strong> {ex.input}{'\n'}<strong>Output:</strong> {ex.output}
                    {ex.explanation && <>{'\n'}<strong>Why:</strong> {ex.explanation}</>}
                  </pre>
                </div>)}
              </Disclosure>
              <Disclosure className="constraints-block">
                <summary>Constraints</summary>
                <ul>{problem.constraints.map((item, i) => <li key={i}>{item}</li>)}</ul>
              </Disclosure>
              {!lessonFocus && <div className="explanation-guide">
                <Icon name="book" /><div><h3>Talk as you work</h3><p>Share your plan, explain the choices you make, and walk through what you’re checking as you test.</p></div>
              </div>}
            </div>
          </aside>

          <section className="editor-panel" aria-label="Practice workspace">
            <nav ref={panelTabsRef} className="panel-tabs" aria-label="Practice views">
              <button className={`tab ${activeTab === 'code' ? 'tab-active' : ''}`} aria-pressed={activeTab === 'code'} onClick={() => setActiveTab('code')}>
                <Icon name="code" size={16} />Code & explain{isRecording && <span className="tab-recording-dot" />}
              </button>
              <button className={`tab ${['feedback', 'retry'].includes(activeTab) ? 'tab-active' : ''}`} aria-pressed={['feedback', 'retry'].includes(activeTab)} disabled={!feedback || isRecording} onClick={() => setActiveTab('feedback')}>
                <Icon name="book" size={16} />{activeTab === 'retry' ? 'Focused retry' : 'Session feedback'}
              </button>
              <button className={`tab tab-followup ${activeTab === 'interview' ? 'tab-active' : ''}`} aria-pressed={activeTab === 'interview'} disabled={isRecording} onClick={() => setActiveTab('interview')}>Follow-up</button>
              <TabIndicator trackRef={panelTabsRef} activeKey={activeTab} />
            </nav>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <div ref={panelContentRef} className="panel-content">
              <div className={`code-pane concurrent-session ${activeTab !== 'code' ? 'pane-hidden' : ''}`}>
                <div className="coding-column">
                  <div className="code-toolbar">
                    <span className="lang-label"><span className="language-dot" />Python 3 <span className="checkpoint-count">{checkpoints.length} replay moments</span></span>
                    <div className="code-toolbar-right">
                      <button className="btn-text" disabled={code === problem.starterCode && !resetCodeDraft} onClick={() => { if (resetCodeDraft) { changeCode(resetCodeDraft) } else { const previousCode = code; changeCode(problem.starterCode); setResetCodeDraft(previousCode); setConsoleTab('testcase') } }}>{resetCodeDraft ? 'Undo reset' : 'Reset code'}</button>
                      <button className="btn-run-lc" onClick={handleRun} disabled={isRunning}><PlayIcon />{isRunning ? 'Running…' : 'Run code'}</button>
                    </div>
                  </div>
                  <div className="monaco-wrapper"><Suspense fallback={<div className="editor-loading" role="status">Opening your editor…</div>}><CodeEditor value={code} onChange={changeCode} fontSize={{ default: 14, large: 16, larger: 18 }[preferences.textSize]} reducedMotion={reducedMotion} /></Suspense></div>
                  <TestConsole problem={problem} consoleTab={consoleTab} setConsoleTab={setConsoleTab} selectedCase={selectedCase} setSelectedCase={setSelectedCase} runResults={runResults} />
                </div>
                <aside className="live-explanation" aria-labelledby="live-explanation-title">
                  <div className="live-explanation-heading">
                    <h2 id="live-explanation-title">Live explanation</h2>
                    <p>Talk through your choices as you code.</p>
                  </div>
                  <div className="session-microphone">
                    {!isRecording ? <button className="learning-secondary" onClick={startRecording} disabled={!speechSupported || isAnalyzing}><MicIcon />Start microphone</button> : <button className="learning-danger" onClick={stopRecording} disabled={speechPhase !== 'listening'}><StopIcon />{speechPhase === 'starting' ? 'Connecting microphone…' : speechPhase === 'stopping' ? 'Finishing transcript…' : 'Stop microphone'}</button>}
                    <span className={`session-status ${isRecording ? 'session-status-live' : ''}`} role="status">{speechPhase === 'listening' ? <><span className="pulse" />Listening while you code</> : speechPhase === 'starting' ? 'Waiting for microphone access…' : speechPhase === 'stopping' ? 'Waiting for the final transcript…' : 'You can also type your thinking below.'}</span>
                  </div>
                  {!speechSupported && <p className="warning">Voice input isn’t available in this browser. You can type your explanation while coding.</p>}
                  {activeTab === 'code' && <div className="writing-area live-writing-area">
                    <label className="sr-only" htmlFor="solution-explanation">Your solution explanation</label>
                    <textarea id="solution-explanation" name="transcript" autoComplete="off" className="transcript-editor" value={transcript} onChange={(event) => changeTranscript(event.target.value)} readOnly={isRecording}
                      placeholder="Start with your approach. Explain what you change and why." />
                    <span className="word-count">{transcript.trim() ? transcript.trim().split(/\s+/).length : 0} words</span>
                  </div>}
                  <div className="session-feedback-action">
                    <p>{isRecording ? 'Stop the microphone when you’re ready to review your transcript.' : isRunning ? 'Wait for code checks to finish before getting feedback.' : 'Feedback uses your code, explanation, and checkpoints.'}</p>
                    <button className="learning-primary" onClick={handleAnalyze} disabled={isAnalyzing || isRecording || isRunning || !transcript.trim()}>{isAnalyzing ? 'Getting feedback…' : 'Get session feedback'}</button>
                  </div>
                </aside>
              </div>

              <div className={`feedback-pane ${activeTab !== 'feedback' || !feedback ? 'pane-hidden' : ''}`}>
                {feedback && <>
                  <div className="feedback-save"><div><h2 ref={feedbackHeadingRef} tabIndex={-1}>Your practice feedback</h2><p>{getLearningGoal(analysisSnapshot?.goal || learningGoal).title}</p></div>
                    <button className="learning-secondary" onClick={saveAttempt} disabled={!analysisSnapshot || isCurrentSaved}>
                      <Icon name={isCurrentSaved ? 'check' : 'save'} size={16} />
                      {isCurrentSaved ? 'Practice saved' : savedAttempt ? 'Update saved practice' : 'Save practice'}
                    </button>
                  </div>
                  <div className="feedback-overview">
                    <div><span>AI practice score</span><strong>{feedback.score}<small>/10</small></strong></div>
                    <p>{feedback.passed ? 'A strong practice attempt' : 'Keep building your explanation'}<small>Use this feedback to choose what to practice next.</small></p>
                  </div>
                  {analysisSnapshot?.retrySummary && <div className="retry-completed"><Icon name="check" /><span>Focused retry: {analysisSnapshot.retrySummary.beforeMet}/{analysisSnapshot.retrySummary.total} → {analysisSnapshot.retrySummary.afterMet}/{analysisSnapshot.retrySummary.total} criteria supported. {isCurrentSaved ? 'Summary saved with this practice.' : 'Save practice to keep this summary.'}</span></div>}
                  {curveballId && <p className="curveball-context">Requirement change: {curveballDefinition.title}. Feedback uses the updated problem.</p>}
                  <LearningPlan plan={feedback.learningPlan} onPractice={practiceLesson} active={view === 'practice' && activeTab === 'feedback'} />
                  <p className="feedback-storage"><Icon name="shield" size={15} />Saved summaries stay on this device. Code and explanations aren’t included.</p>
                  <ReasoningReplay key={analysisSnapshot?.id} checkpoints={analysisSnapshot?.checkpoints} insights={feedback.replayInsights} onRetry={startFocusedRetry} active={view === 'practice' && activeTab === 'feedback'} />
                </>}
                <RubricFeedback feedback={feedback} />
              </div>
              {retryTask && <div className={`retry-pane ${activeTab !== 'retry' ? 'pane-hidden' : ''}`}><FocusedRetry key={retryTask.id} task={retryTask} active={view === 'practice' && activeTab === 'retry'} onBack={() => setActiveTab('feedback')} onComplete={(result) => setAnalysisSnapshot((snapshot) => {
                if (!snapshot || snapshot.id !== retryTask.analysisId || retryTaskIdRef.current !== retryTask.id) return snapshot
                return { ...snapshot, retrySummary: result ? { dimension: result.dimension, beforeMet: result.beforeMet, afterMet: result.afterMet, total: result.total, createdAt: result.createdAt } : null }
              })} /></div>}
              <div className={`interview-pane-wrapper ${activeTab !== 'interview' ? 'pane-hidden' : ''}`}>
                <InterviewPanel key={`${problemSlug}:${curveballId || 'base'}`} problemId={problemSlug} curveballId={curveballId} transcript={transcript} code={code} active={view === 'practice' && activeTab === 'interview'} speechSupported={speechSupported} onError={setError} />
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
