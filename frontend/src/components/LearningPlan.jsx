import Icon from './Icon'
import Disclosure from './Disclosure'

export default function LearningPlan({ plan, onPractice }) {
  if (!plan) return null
  return (
    <section className="learning-card" aria-labelledby="learning-title">
      <div className="lesson-heading"><h2 id="learning-title">{plan.title}</h2><span><Icon name="clock" size={15} />{plan.minutes} min</span></div>
      <p className="learning-reason">{plan.reason}</p>
      <Disclosure className="lesson-reading">
        <summary>Read the lesson</summary>
        <ol>{plan.steps.map((step) => <li key={step}>{step}</li>)}</ol>
        <div className="lesson-prompt">
          <strong>Your practice prompt</strong>
          <p>{plan.practicePrompt}</p>
        </div>
        <p className="lesson-self-check"><strong>Ask yourself:</strong> {plan.selfCheck}</p>
      </Disclosure>
      <div className="lesson-action"><span>Practice one part of your explanation.</span><button className="learning-primary" onClick={onPractice}>{plan.action === 'transfer' ? 'Try another challenge' : 'Practice this lesson'}</button></div>
    </section>
  )
}
