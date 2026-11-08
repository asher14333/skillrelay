import { RUBRIC_LABELS } from '../data/problems'
import Icon from './Icon'
import { StatusBadge } from './FeedbackVisuals'
import { rubricEntries, skillStatus } from '../data/feedbackStatus'

const itemText = item => (typeof item === 'string' ? item : item.text)

export default function RubricFeedback({ feedback }) {
  if (!feedback) return null
  const entries = rubricEntries(feedback.rubric)
  const strengths = feedback.strengths || []
  const improvements = feedback.improvements || []

  return (
    <div className="feedback-pane-inner">
      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="feedback-columns">
          {strengths.length > 0 && <section className="feedback-list-card feedback-list-strengths" aria-labelledby="strengths-title">
            <h3 id="strengths-title"><span className="feedback-list-icon"><Icon name="check" size={14} /></span>What went well</h3>
            <ul className="strengths">
              {strengths.map((item, i) => <li key={i}>
                <span>{itemText(item)}</span>
                {item.quote && <blockquote className="feedback-quote">&ldquo;{item.quote}&rdquo;</blockquote>}
              </li>)}
            </ul>
          </section>}
          {improvements.length > 0 && <section className="feedback-list-card feedback-list-improvements" aria-labelledby="improvements-title">
            <h3 id="improvements-title"><span className="feedback-list-icon"><Icon name="arrow" size={14} /></span>What to improve</h3>
            <ul className="improvements">
              {improvements.map((item, i) => <li key={i}>{itemText(item)}</li>)}
            </ul>
          </section>}
        </div>
      )}

      {entries.length > 0 && (
        <div className="feedback-block">
          <div className="feedback-block-heading">
            <h3>Skill details</h3>
            <p>Each score, with the words from your explanation that earned it.</p>
          </div>
          <div className="rubric-grid">
            {entries.map(([key, item]) => (
              <article key={key} id={`rubric-${key}`} tabIndex={-1} className={`rubric-item status-${skillStatus(item).id}`}>
                <div className="rubric-item-header">
                  <span className="rubric-label">{RUBRIC_LABELS[key] || key}</span>
                  <span className="rubric-item-meta"><StatusBadge item={item} compact /><span className="rubric-score">{item.score}/{item.max}</span></span>
                </div>
                <div className="rubric-bar">
                  <div className={`rubric-bar-fill ${item.score >= item.max ? 'rubric-bar-full' : item.score === 0 ? 'rubric-bar-empty' : ''}`}
                    style={{ width: `${(item.score / item.max) * 100}%` }} />
                </div>
                {item.quote && <blockquote className="rubric-quote">&ldquo;{item.quote}&rdquo;</blockquote>}
                {item.note && <p className="rubric-note">{item.note}</p>}
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
