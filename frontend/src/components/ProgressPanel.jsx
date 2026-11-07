import { useState } from 'react'
import { getLearningGoal } from '../data/learning'
import { compareLatest, MAX_ATTEMPTS } from '../data/practiceStorage'
import { RUBRIC_LABELS } from '../data/problems'

export default function ProgressPanel({ attempts, onPractice, onDelete, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false)
  const comparison = compareLatest(attempts)
  const latest = attempts[0]
  return (
    <main className="progress-panel">
      <div className="progress-heading">
        <div>
          <p className="section-eyebrow">Small steps, visible practice</p>
          <h1>Your practice journey</h1>
          <p>Keep a record of what you practiced and what to work on next.</p>
        </div>
        <button className="learning-primary" onClick={onPractice}>Continue practicing →</button>
      </div>

      <p className="storage-note">Saved in this browser only, up to {MAX_ATTEMPTS} attempts. Code and explanations are not saved. Clearing site data removes this history.</p>

      {!latest ? (
        <section className="progress-empty">
          <span className="empty-mark" aria-hidden="true">↗</span>
          <h2>Your next step starts with one attempt</h2>
          <p>Choose a goal, explain your solution, and save your feedback to start your practice history.</p>
          <button className="learning-primary" onClick={onPractice}>Start a practice attempt</button>
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
              <button className="learning-danger" onClick={() => { onClear(); setConfirmClear(false) }}>Remove all attempts</button>
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
                <button className="history-delete" aria-label={`Remove saved attempt for ${attempt.problemTitle} from ${new Date(attempt.createdAt).toLocaleString()}`} onClick={() => onDelete(attempt.id)}>Remove attempt</button>
              </article>
            ))}
          </div>
        </>
      )}
    </main>
  )
}
