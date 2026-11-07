import { RUBRIC_LABELS } from '../data/problems'

const RUBRIC_ORDER = [
  'problemUnderstanding',
  'bruteForce',
  'optimization',
  'timeComplexity',
  'spaceComplexity',
  'clarity',
]

export default function RubricFeedback({ feedback }) {
  if (!feedback) return null

  const rubricEntries = RUBRIC_ORDER.filter((key) => feedback.rubric?.[key]).map(
    (key) => [key, feedback.rubric[key]]
  )

  return (
    <div className="feedback-pane-inner">
      <div
        className={`verdict ${feedback.passed ? 'verdict-pass' : 'verdict-fail'}`}
      >
        {feedback.passed ? '✓ You passed!' : 'Keep practicing'}
      </div>

      <div className="score-row">
        <span className="score-label">Communication Score</span>
        <span className="score-value">{feedback.score}/10</span>
      </div>

      {rubricEntries.length > 0 && (
        <div className="feedback-block">
          <h3>Rubric Breakdown</h3>
          <div className="rubric-grid">
            {rubricEntries.map(([key, item]) => (
              <div key={key} className="rubric-item">
                <div className="rubric-item-header">
                  <span className="rubric-label">
                    {RUBRIC_LABELS[key] || key}
                  </span>
                  <span className="rubric-score">
                    {item.score}/{item.max}
                  </span>
                </div>
                <div className="rubric-bar">
                  <div
                    className={`rubric-bar-fill ${item.score >= item.max ? 'rubric-bar-full' : item.score === 0 ? 'rubric-bar-empty' : ''}`}
                    style={{ width: `${(item.score / item.max) * 100}%` }}
                  />
                </div>
                {item.quote && (
                  <blockquote className="rubric-quote">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>
                )}
                {item.note && <p className="rubric-note">{item.note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {feedback.strengths?.length > 0 && (
        <div className="feedback-block">
          <h3>Strengths</h3>
          <ul className="strengths">
            {feedback.strengths.map((item, i) => (
              <li key={i}>
                <span>{typeof item === 'string' ? item : item.text}</span>
                {item.quote && (
                  <blockquote className="feedback-quote">
                    &ldquo;{item.quote}&rdquo;
                  </blockquote>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {feedback.improvements?.length > 0 && (
        <div className="feedback-block">
          <h3>Improvements</h3>
          <ul className="improvements">
            {feedback.improvements.map((item, i) => (
              <li key={i}>
                {typeof item === 'string' ? item : item.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
