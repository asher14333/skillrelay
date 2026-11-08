import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { RUBRIC_LABELS } from '../data/problems'
import Icon from './Icon'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function FocusedRetry({ task, onComplete, onBack, active = true }) {
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const headingRef = useRef(null)
  const requestRef = useRef(null)
  useEffect(() => { if (active) headingRef.current?.focus() }, [active])
  useEffect(() => () => requestRef.current?.abort(), [])
  const compare = async () => {
    if (!answer.trim() || requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true); setError(''); setResult(null)
    try {
      const { data } = await axios.post(`${API_URL}/practice/retry`, { problemId: task.problemId, dimension: task.dimension, code: task.code, before: task.before, after: answer }, { timeout: 60000, signal: controller.signal })
      if (controller.signal.aborted || requestRef.current !== controller) return
      setResult(data)
      onComplete({ ...data, createdAt: new Date().toISOString() })
    } catch (err) {
      if (controller.signal.aborted || requestRef.current !== controller) return
      setError(err.response?.data?.code === 'AI_NOT_CONFIGURED' ? 'Practice feedback isn’t connected yet. Your answer is still here.' : err.response?.data?.error || 'Couldn’t compare your answer. Try again.')
    } finally {
      if (!controller.signal.aborted && requestRef.current === controller) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }
  return <section className="focused-retry" aria-labelledby="retry-title">
    <div className="retry-heading"><button className="learning-secondary" onClick={onBack}>Back to feedback</button><span>One skill. One focused retry.</span></div>
    <h2 id="retry-title" ref={headingRef} tabIndex={-1}>{RUBRIC_LABELS[task.dimension]}</h2>
    <p className="retry-instruction">{task.prompt}</p>
    <ul className="retry-criteria">{task.criteria.map((criterion) => <li key={criterion.id}>{criterion.label}</li>)}</ul>
    <details className="retry-baseline"><summary>Your original explanation</summary><blockquote>{task.before || 'No explanation was captured at this checkpoint.'}</blockquote><pre><code>{task.code}</code></pre></details>
    <label htmlFor="focused-answer">Write a focused answer</label>
    <textarea id="focused-answer" name="retryAnswer" autoComplete="off" maxLength={6000} value={answer} onChange={(event) => { setAnswer(event.target.value); setResult(null); onComplete(null) }} placeholder="Address this one skill using a concrete example from your solution…" disabled={loading} />
    <button className="learning-primary" disabled={loading || !answer.trim()} onClick={compare}>{loading ? 'Comparing evidence…' : 'Compare explanations'}<Icon name="arrow" size={16} /></button>
    {error && <p className="retry-error" role="alert">{error}</p>}
    {result && <div className="retry-result" role="status"><h3>Your before-and-after evidence</h3><p>{result.summary}</p><div className="retry-totals"><span>Before <strong>{result.beforeMet}/{result.total}</strong></span><span>After <strong>{result.afterMet}/{result.total}</strong></span><span>criteria supported</span></div>
      <div className="retry-checks">{result.checks.map((check) => <article key={check.id}><h4>{check.label}</h4><div>{['before', 'after'].map((side) => <section key={side}><strong>{side === 'before' ? 'Before' : 'After'}: {check[side].met ? 'Supported' : 'Not evidenced'}</strong>{check[side].quote && <blockquote>“{check[side].quote}”</blockquote>}<p>{check[side].note}</p></section>)}</div></article>)}</div>
      <p><strong>Next step:</strong> {result.nextStep}</p><p className="replay-note">This is AI practice feedback. A retry may improve, stay the same, or reveal another gap.</p>
      <button className="learning-primary" onClick={onBack}>Return to session feedback</button><p className="replay-note">You can save the comparison summary with your practice there.</p>
    </div>}
  </section>
}
