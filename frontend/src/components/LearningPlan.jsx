import Icon from './Icon'
import Disclosure from './Disclosure'
import LessonVideo from './LessonVideo'

export default function LearningPlan({ plan, onPractice, active = true }) {
  if (!plan) return null
  return (
    <section className="learning-card" aria-labelledby="learning-title">
      <span className="learning-kicker"><Icon name="target" size={14} />Recommended next step</span>
      <div className="learning-card-body">
        <div className="learning-card-main">
          <div className="lesson-heading"><h2 id="learning-title">{plan.title}</h2><span><Icon name="clock" size={15} />{plan.minutes} min</span></div>
          <p className="learning-reason">{plan.reason}</p>
          <div className="lesson-prompt lesson-prompt-callout">
            <strong>Your practice prompt</strong>
            <p>{plan.practicePrompt}</p>
          </div>
          <Disclosure className="lesson-reading">
            <summary>Read the lesson</summary>
            <ol>{plan.steps.map((step) => <li key={step}>{step}</li>)}</ol>
            <p className="lesson-self-check"><strong>Ask yourself:</strong> {plan.selfCheck}</p>
          </Disclosure>
          <div className="lesson-action">
            <button className="learning-primary" onClick={onPractice}>{plan.action === 'transfer' ? 'Try another challenge' : 'Practice this lesson'}<Icon name="arrow" size={16} /></button>
            <span>Write one focused answer, then compare it with your original.</span>
          </div>
        </div>
        <LessonVideo dimension={plan.dimension} active={active} />
      </div>
    </section>
  )
}
