export default function LearningPlan({ plan, onPractice }) {
  if (!plan) return null
  return (
    <section className="learning-card" aria-labelledby="learning-title">
      <div className="learning-eyebrow">Your next step <span>{plan.minutes} min</span></div>
      <h2 id="learning-title">{plan.title}</h2>
      <p className="learning-reason">{plan.reason}</p>
      <ol>{plan.steps.map((step) => <li key={step}>{step}</li>)}</ol>
      <div className="lesson-prompt">
        <strong>Try it out</strong>
        <p>{plan.practicePrompt}</p>
      </div>
      <p className="lesson-self-check"><strong>Ask yourself:</strong> {plan.selfCheck}</p>
      <button className="learning-primary" onClick={onPractice}>
        {plan.action === 'transfer' ? 'Try another challenge' : 'Practice this lesson'}
        <span aria-hidden="true"> →</span>
      </button>
    </section>
  )
}
