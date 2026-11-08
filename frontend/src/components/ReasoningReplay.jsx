import { useLayoutEffect, useRef, useState } from 'react'
import { MOMENT_LABELS, formatElapsed, summarizeChanges } from '../data/sessionReplay'
import { RUBRIC_LABELS } from '../data/problems'
import Disclosure from './Disclosure'
import { animateArrival, scrollWithPreference } from '../lib/motion'

export default function ReasoningReplay({ checkpoints, insights, onRetry, active = true }) {
  const [selectedId, setSelectedId] = useState(null)
  const selected = checkpoints?.find((moment) => moment.id === selectedId) || checkpoints?.at(-1)
  const timelineRef = useRef(null)
  const evidenceRef = useRef(null)
  const previousId = useRef(selected?.id)
  useLayoutEffect(() => {
    if (!selected) return
    const changed = previousId.current !== selected.id
    previousId.current = selected.id
    if (!active) return
    const timeline = timelineRef.current
    let cancelScroll = () => {}
    const alignSelection = smooth => {
      const button = timeline?.querySelector('[aria-pressed="true"]')
      if (!button || !timeline.clientWidth || getComputedStyle(timeline).visibility === 'hidden') return
      const track = timeline.getBoundingClientRect()
      const item = button.getBoundingClientRect()
      const overflow = item.left < track.left + 3 ? item.left - track.left - 3
        : item.right > track.right - 3 ? item.right - track.right + 3 : 0
      if (overflow) {
        const left = timeline.scrollLeft + overflow
        cancelScroll()
        cancelScroll = scrollWithPreference(behavior => timeline.scrollTo({ left, behavior }), smooth)
      }
    }
    alignSelection(changed)
    const cancelArrival = changed ? animateArrival(evidenceRef.current) : () => {}
    let measuredWidth = timeline?.getBoundingClientRect().width
    const observer = new ResizeObserver(() => {
      const width = timeline.getBoundingClientRect().width
      if (Math.abs(width - measuredWidth) > 0.5) {
        measuredWidth = width
        alignSelection(false)
      }
    })
    if (timeline) observer.observe(timeline)
    return () => { observer.disconnect(); cancelArrival(); cancelScroll() }
  }, [selected, active])
  if (!selected) return null
  const index = checkpoints.indexOf(selected)
  return <section className="replay-panel" aria-labelledby="replay-title">
    <div className="replay-heading"><div><h2 id="replay-title">Replay your reasoning</h2><p>See what you were coding and explaining at each checkpoint.</p></div><span>{checkpoints.length} moments</span></div>
    {insights?.length > 0 ? <div className="replay-insights">{insights.map((insight, i) => <article key={`${insight.checkpointId}-${i}`} className={`replay-insight insight-${insight.kind}`}>
      <div><span>{insight.kind === 'gap' ? 'A moment to practice' : 'A useful connection'}</span><button onClick={() => setSelectedId(insight.checkpointId)}>View {formatElapsed(checkpoints.find((moment) => moment.id === insight.checkpointId)?.elapsedMs || 0)}</button></div>
      <h3>{RUBRIC_LABELS[insight.dimension]}</h3><p>{insight.observation}</p>
      {(insight.codeQuote || insight.transcriptQuote) && <Disclosure className="insight-evidence"><summary>View supporting evidence</summary>
        {insight.codeQuote && <pre><code>{insight.codeQuote}</code></pre>}
        {insight.transcriptQuote && <blockquote>“{insight.transcriptQuote}”</blockquote>}
      </Disclosure>}
      {insight.kind === 'gap' && <button className="learning-secondary" onClick={() => onRetry(insight.dimension, insight.checkpointId)}>Practice this gap</button>}
    </article>)}</div> : <p className="replay-note">No moment-specific AI observation was returned. You can still inspect your recorded checkpoints below.</p>}
    <div className="checkpoint-navigation" role="group" aria-label="Navigate session checkpoints">
      <button className="learning-secondary" disabled={index === 0} onClick={() => setSelectedId(checkpoints[index - 1].id)}>Previous checkpoint</button>
      <span aria-live="polite" aria-atomic="true">{index + 1} of {checkpoints.length}</span>
      <button className="learning-secondary" disabled={index === checkpoints.length - 1} onClick={() => setSelectedId(checkpoints[index + 1].id)}>Next checkpoint</button>
    </div>
    <div ref={timelineRef} className="replay-timeline" aria-label="Session checkpoints">{checkpoints.map((moment) => <button key={moment.id} aria-pressed={selected.id === moment.id} onClick={() => setSelectedId(moment.id)}><time>{formatElapsed(moment.elapsedMs)}</time><span>{MOMENT_LABELS[moment.kind]}</span></button>)}</div>
    <div className="checkpoint-detail">
      <div className="checkpoint-title"><h3>{MOMENT_LABELS[selected.kind]} at {formatElapsed(selected.elapsedMs)}</h3>{selected.run && <span>{selected.run.passed}/{selected.run.total} checks passed</span>}</div>
      <p>{summarizeChanges(checkpoints[index - 1], selected)}</p>
      <div ref={evidenceRef} className="checkpoint-evidence"><div><h4>Code at this moment</h4><pre><code>{selected.code || 'No code yet.'}</code></pre></div><div><h4>Explanation at this moment</h4><blockquote>{selected.transcript || 'No explanation captured yet.'}</blockquote></div></div>
    </div>
    <p className="replay-note">Checkpoints reflect when edits and transcription arrived, not exact audio alignment. Replay stays in this session; saved history keeps summaries only.</p>
  </section>
}
