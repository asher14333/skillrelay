import { useState } from 'react'
import { getLearningGoal } from '../data/learning'
import { compareLatest, MAX_ATTEMPTS } from '../data/practiceStorage'
import { RUBRIC_LABELS } from '../data/problems'
import Icon from './Icon'
import { ScoreRing, ScoreTrend, SkillBars } from './FeedbackVisuals'

export default function ProgressPanel({ attempts, onPractice, onDelete, onRestore, onClear }) {
  const [confirmClear, setConfirmClear] = useState(false)
  const [removedAttempt, setRemovedAttempt] = useState(null)
  const comparison = compareLatest(attempts)
  const latest = attempts[0]
  return (
    <section className="progress-panel" aria-labelledby="progress-title">
      <div className="progress-heading">
        <div>
          <h1 id="progress-title">Practice history</h1>
          <p>Review your saved feedback and choose what to practice next.</p>
        </div>
        {latest && <button className="learning-primary" onClick={onPractice}>Back to workspace</button>}
      </div>

      <p className="storage-note"><Icon name="shield" size={16} />Saved on this device, up to {MAX_ATTEMPTS} attempts. Code and explanations aren’t included.</p>

      {removedAttempt && <div className="undo-removal" role="status"><span>Practice attempt removed.</span><button onClick={() => { if (onRestore(removedAttempt)) setRemovedAttempt(null) }}>Undo</button></div>}

      {!latest ? (
        <section className="progress-empty">
          <Icon name="progress" size={24} />
          <h2>No saved practice yet</h2>
          <p>Work through a challenge, get feedback, then choose Save practice. Your summary and next lesson will appear here.</p>
          <button className="learning-primary" onClick={onPractice}>Start practicing</button>
        </section>
      ) : (
        <>
          <div className="progress-overview">
            <section className="progress-latest" aria-labelledby="progress-latest-title">
              <h2 id="progress-latest-title">Latest attempt</h2>
              <div className="progress-latest-body">
                <ScoreRing score={latest.score} size={88} label="Latest practice score" />
                <div>
                  <p className="progress-latest-problem">{latest.problemTitle}</p>
                  <p className="progress-latest-goal">{getLearningGoal(latest.goal).title}</p>
                  {comparison ? <span className={`progress-delta ${comparison.delta > 0 ? 'is-up' : comparison.delta < 0 ? 'is-down' : 'is-flat'}`}>
                    <Icon name={comparison.delta > 0 ? 'trendUp' : comparison.delta < 0 ? 'arrow' : 'minus'} size={14} />
                    {comparison.delta > 0 ? '+' : ''}{comparison.delta} vs previous
                  </span> : <span className="progress-delta is-flat">First attempt for this goal</span>}
                </div>
              </div>
              <p className="progress-next"><Icon name="target" size={14} /><span><strong>Next:</strong> {latest.lesson.title}</span></p>
            </section>
            <section className="progress-trend-card">
              <ScoreTrend attempts={attempts} />
            </section>
          </div>
          <div className="progress-stats">
            <div><strong>{attempts.length}</strong><span>Saved attempts</span></div>
            <div><strong>{new Set(attempts.map((attempt) => attempt.problemId)).size}</strong><span>Problems practiced</span></div>
            <div><strong>{Math.max(...attempts.map(attempt => attempt.score))}<small>/10</small></strong><span>Best score</span></div>
            <div><strong>{Math.round(attempts.reduce((sum, attempt) => sum + attempt.score, 0) / attempts.length * 10) / 10}<small>/10</small></strong><span>Average score</span></div>
          </div>
          <section className="progress-skills" aria-labelledby="progress-skills-title">
            <div className="progress-section-heading">
              <h2 id="progress-skills-title">Skills in your latest attempt</h2>
              <span>{comparison ? `Changes compared with your previous ${latest.problemTitle} attempt` : 'Save another attempt on the same problem and goal to see what changed'}</span>
            </div>
            <SkillBars rubric={latest.rubric} previous={comparison?.previous.rubric} />
          </section>
          <div className="practice-comparison">
            {comparison ? (
              <p><strong>{comparison.delta > 0 ? '+' : ''}{comparison.delta} points</strong> compared with your previous saved attempt on {latest.problemTitle}, with the goal “{getLearningGoal(latest.goal).title}”{latest.curveballId ? ` and the curveball “${latest.curveballTitle}.”` : '.'}</p>
            ) : (
              <p>Save another attempt on <strong>{latest.problemTitle}</strong> with the goal “{getLearningGoal(latest.goal).title}”{latest.curveballId ? ` and the curveball “${latest.curveballTitle}”` : ''} to compare your practice scores.</p>
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
                  <ScoreRing score={attempt.score} size={56} label={`Score for ${attempt.problemTitle}`} />
                  <div>
                    <h3>{attempt.problemTitle}</h3>
                    <p>{getLearningGoal(attempt.goal).title} · <time dateTime={attempt.createdAt}>{new Date(attempt.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</time></p>
                    {attempt.curveballId && <p className="curveball-history">Curveball: {attempt.curveballTitle}</p>}
                  </div>
                </div>
                <SkillBars rubric={attempt.rubric} compact />
                <ul className="history-facts">
                  {attempt.run && <li className={attempt.run.passed === attempt.run.total ? 'is-good' : ''}><Icon name="code" size={13} />Code {attempt.run.passed}/{attempt.run.total} passed</li>}
                  {attempt.retrySummary && <li className="is-good"><Icon name="trendUp" size={13} />Retry · {RUBRIC_LABELS[attempt.retrySummary.dimension]} {attempt.retrySummary.beforeMet}/{attempt.retrySummary.total} → {attempt.retrySummary.afterMet}/{attempt.retrySummary.total}</li>}
                </ul>
                <p className="history-lesson"><Icon name="target" size={14} /><span><strong>Next lesson:</strong> {attempt.lesson.title}</span></p>
                <button className="history-delete" aria-label={`Remove saved attempt for ${attempt.problemTitle} from ${new Date(attempt.createdAt).toLocaleString()}`} onClick={() => { if (onDelete(attempt.id)) setRemovedAttempt(attempt) }}>Remove attempt</button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
