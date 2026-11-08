import Icon from './Icon'
import { RUBRIC_LABELS } from '../data/problems'
import { ScoreRing, SkillBars } from './FeedbackVisuals'
import { rubricEntries, scoreTone, skillStatus } from '../data/feedbackStatus'
import { animateArrival, scrollWithPreference } from '../lib/motion'

function showSkillDetail(key) {
  const card = document.getElementById(`rubric-${key}`)
  if (!card) return
  scrollWithPreference(behavior => card.scrollIntoView({ behavior, block: 'center' }))
  card.focus({ preventScroll: true })
  card.classList.remove('rubric-item-flash')
  void card.offsetWidth
  card.classList.add('rubric-item-flash')
  animateArrival(card, { scale: 0.99, from: 0.6 })
}

// The at-a-glance answer to "how did I do, and where are the gaps?"
export default function FeedbackSummary({ feedback, run, retrySummary }) {
  const entries = rubricEntries(feedback.rubric)
  const counts = { strong: 0, partial: 0, missing: 0 }
  entries.forEach(([, item]) => { counts[skillStatus(item).id] += 1 })
  const gaps = entries
    .filter(([, item]) => item.score < item.max)
    .sort(([, a], [, b]) => a.score / a.max - b.score / b.max)
    .slice(0, 2)
    .map(([key]) => RUBRIC_LABELS[key] || key)
  const tone = scoreTone(feedback.score)

  return (
    <section className="feedback-summary" aria-label="Session summary">
      <div className="summary-score">
        <ScoreRing score={feedback.score} />
        <div className="summary-text">
          <span className={`summary-tone status-${tone.id}`}>{tone.label}</span>
          <p className="summary-headline">{counts.strong} of {entries.length} skills at full marks</p>
          <p className="summary-sub">{gaps.length ? <>Biggest {gaps.length === 1 ? 'gap' : 'gaps'}: <strong>{gaps.join(' and ')}</strong></> : 'No gaps found in this session.'}</p>
          <ul className="summary-chips" aria-label="Skill counts">
            <li className="status-strong"><Icon name="check" size={13} />{counts.strong} strong</li>
            <li className="status-partial"><Icon name="minus" size={13} />{counts.partial} partial</li>
            <li className="status-missing"><Icon name="close" size={13} />{counts.missing} missing</li>
          </ul>
          {(run || retrySummary) && <ul className="summary-facts">
            {run && <li><Icon name="code" size={14} />Code checks <strong>{run.passed}/{run.total}</strong> passed</li>}
            {retrySummary && <li><Icon name="trendUp" size={14} />Focused retry <strong>{retrySummary.beforeMet}/{retrySummary.total} → {retrySummary.afterMet}/{retrySummary.total}</strong></li>}
          </ul>}
        </div>
      </div>
      <div className="summary-skills">
        <div className="summary-skills-heading"><h3>Skills at a glance</h3><span>Select a skill to see why</span></div>
        <SkillBars rubric={feedback.rubric} onSelect={showSkillDetail} />
      </div>
    </section>
  )
}
