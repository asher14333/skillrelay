import { useState } from 'react'
import { getLearningGoal } from '../data/learning'
import { compareLatest, MAX_ATTEMPTS } from '../data/practiceStorage'
import { RUBRIC_LABELS } from '../data/problems'
import Icon from './Icon'

export default function ProgressPanel({ attempts, onPractice, onDelete, onRestore, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [removedAttempt, setRemovedAttempt] = useState(null)
  const comparison = compareLatest(attempts)
  const latest = attempts[0]
  return (
    <section className="progress-panel" aria-labelledby="progress-title">
      <div className="progress-heading">
        <div>
          <h1 id="progress-title">Every attempt is a step forward.</h1>
          <p>Keep a record of what you practiced and what to work on next.</p>
        </div>
        {latest && <button className="learning-primary" onClick={onPractice}>Continue practice <Icon name="arrow" size={16} /></button>}
      </div>

      <p className="storage-note"><Icon name="shield" size={16} />Saved on this device, up to {MAX_ATTEMPTS} attempts. Code and explanations aren’t included.</p>

      {removedAttempt && <div className="undo-removal" role="status"><span>Practice attempt removed.</span><button onClick={() => { if (onRestore(removedAttempt)) setRemovedAttempt(null) }}>Undo</button></div>}

      {!latest ? (
        <section className="progress-empty">
          <div className="empty-journey" aria-hidden="true"><span><Icon name="code" size={28} /></span><i /><span><Icon name="mic" size={28} /></span><i /><span><Icon name="book" size={28} /></span></div>
          <h2>Your first attempt belongs here.</h2>
          <p>Choose a challenge, explain your approach, and save your feedback. Your practice history will grow with you.</p>
          <button className="learning-primary" onClick={onPractice}>Start practicing <Icon name="arrow" size={16} /></button>
          <div className="empty-steps"><span>Find your focus</span><span>Practice your explanation</span><span>Keep your next step</span></div>
        </section>
      ) : (
        <>
          <div className="progress-stats">
            <div><strong>{attempts.length}</strong><span>Saved attempts</span></div>
            <div><strong>{new Set(attempts.map((attempt) => attempt.problemId)).size}</strong><span>Problems practiced</span></div>
            <div><strong>{latest.score}<small>/10</small></strong><span>Latest practice score</span></div>
          </div>
          <div className="practice-comparison">
            {comparison ? (
              <p><strong>{comparison.delta > 0 ? '+' : ''}{comparison.delta} points</strong> compared with your previous saved attempt on {latest.problemTitle}, with the goal “{getLearningGoal(latest.goal).title}.”</p>
            ) : (
              <p>Save another attempt on <strong>{latest.problemTitle}</strong> with the goal “{getLearningGoal(latest.goal).title}” to compare your practice scores.</p>
            )}
            <span>AI practice feedback can vary. These scores are learning signals, not a credential or hiring assessment.</span>
          </div>
          <div className="history-heading">
            <h2>Saved practice</h2>
            <button className="learning-secondary" onClick={() => setConfirmClear(true)}>Clear saved practice</button>
          </div>
          {confirmClear && (
            <div className="clear-confirmation" role="group" aria-label="Confirm clearing practice history">
              <p>Remove all saved attempts from this browser? This cannot be undone.</p>
              <button className="learning-danger" onClick={() => { onClear(); setConfirmClear(false); setRemovedAttempt(null) }}>Remove all attempts</button>
              <button className="learning-secondary" onClick={() => setConfirmClear(false)}>Keep my practice</button>
            </div>
          )}
          <div className="history-list">
            {attempts.map((attempt) => (
              <article key={attempt.id} className="history-card">
                <div className="history-card-heading">
                  <div>
                    <time dateTime={attempt.createdAt}>{new Date(attempt.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time>
                    <h3>{attempt.problemTitle}</h3>
                    <p>{getLearningGoal(attempt.goal).title}</p>
                  </div>
                  <strong className="history-score">{attempt.score}<small>/10</small></strong>
                </div>
                <details>
                  <summary>View rubric breakdown</summary>
                  <dl className="history-rubric">
                    {Object.entries(attempt.rubric).map(([key, item]) => (
                      <div key={key}><dt>{RUBRIC_LABELS[key]}</dt><dd>{item.score}/{item.max}</dd></div>
                    ))}
                  </dl>
                </details>
                <p className="history-lesson"><strong>Next lesson:</strong> {attempt.lesson.title}</p>
                {attempt.run && <p className="history-run">Code checks: {attempt.run.passed}/{attempt.run.total} passed</p>}
                <button className="history-delete" aria-label={`Remove saved attempt for ${attempt.problemTitle} from ${new Date(attempt.createdAt).toLocaleString()}`} onClick={() => { if (onDelete(attempt.id)) setRemovedAttempt(attempt) }}>Remove attempt</button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
