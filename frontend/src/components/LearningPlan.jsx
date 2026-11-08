import Icon from './Icon'

export default function LearningPlan({ plan, onPractice }) {
  if (!plan) return null
  return (
    <section className="learning-card" aria-labelledby="learning-title">
      <div className="lesson-meta"><span><Icon name="book" size={16} />Focused practice</span><span><Icon name="clock" size={15} />{plan.minutes} min</span></div>
      <h2 id="learning-title">{plan.title}</h2>
      <p className="learning-reason">{plan.reason}</p>
      <ol>{plan.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <div className="lesson-prompt">
        <strong>Your practice prompt</strong>
        <p>{plan.practicePrompt}</p>
      </div>
      <p className="lesson-self-check"><strong>Ask yourself:</strong> {plan.selfCheck}</p>
      <div className="lesson-action"><span>Put this into practice while it’s fresh.</span><button className="learning-primary" onClick={onPractice}>{plan.action === 'transfer' ? 'Try another challenge' : 'Practice this lesson'}<Icon name="arrow" size={16} /></button></div>
    </section>
  )
}
