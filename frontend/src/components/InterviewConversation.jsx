import { useLayoutEffect, useRef } from 'react'
import { animateArrival, scrollWithPreference } from '../lib/motion'
import '../InterviewConversation.css'

export default function InterviewConversation({ messages = [], pending = false, listening = false, speaking = false, active = true, emptyState = null }) {
  const logRef = useRef(null)
  const pinnedRef = useRef(true)
  const previousIdsRef = useRef(null)
  const previousActiveRef = useRef(active)

  useLayoutEffect(() => {
    const log = logRef.current
    const previousIds = previousIdsRef.current
    const wasActive = previousActiveRef.current
    previousIdsRef.current = new Set(messages.map(message => String(message.id)))
    previousActiveRef.current = active
    if (!active || !log?.getClientRects().length) return

    const cleanups = []
    if (previousIds && wasActive) {
      for (const bubble of log.querySelectorAll('[data-conversation-message]')) {
        if (!previousIds.has(bubble.dataset.conversationMessage)) cleanups.push(animateArrival(bubble, { offset: 4 }))
      }
    }
    if (pinnedRef.current) {
      cleanups.push(scrollWithPreference(behavior => log.scrollTo({ top: log.scrollHeight, behavior }), false))
    }
    return () => cleanups.forEach(cleanup => cleanup())
  }, [messages, pending, listening, speaking, active])

  return <section className="interview-conversation" aria-label="Conversation area">
    <div ref={logRef} className="interview-conversation-log" role="log" aria-label="Interview conversation"
      aria-live="polite" aria-relevant="additions text" aria-atomic="false" aria-busy={pending}
      onScroll={event => {
        const log = event.currentTarget
        pinnedRef.current = log.scrollHeight - log.scrollTop - log.clientHeight < 64
      }}>
      {!messages.length && !pending && <div className="interview-conversation-empty">
        {emptyState || <>
          <p>Your conversation appears here.</p>
          <p>Start the live interview and explain your approach.</p>
        </>}
      </div>}
      {messages.map(message => <article key={message.id} data-conversation-message={message.id}
        className={`conversation-bubble conversation-bubble-${message.role}${message.kind === 'curveball' ? ' conversation-bubble-curveball' : ''}`}>
        <span className="conversation-bubble-label">{message.role === 'candidate' ? 'You' : message.kind === 'curveball' ? 'Requirement change' : 'Interviewer'}</span>
        <p>{message.text}</p>
      </article>)}
      {pending && <div className="conversation-pending"><span>Interviewer</span><p>Thinking…</p></div>}
    </div>
    {listening && !speaking && <p className="interview-conversation-status" role="status">
      Listening to your explanation…
    </p>}
  </section>
}
