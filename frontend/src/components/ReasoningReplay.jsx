import { useState } from 'react'
import { MOMENT_LABELS, formatElapsed, summarizeChanges } from '../data/sessionReplay'
import { RUBRIC_LABELS } from '../data/problems'
import Icon from './Icon'

export default function ReasoningReplay({ checkpoints, insights, onRetry }) {
  const [selectedId, setSelectedId] = useState(null)
  if (!checkpoints?.length) return null
  const selected = checkpoints.find((moment) => moment.id === selectedId) || checkpoints.at(-1)
  const index = checkpoints.indexOf(selected)
  return <section className="replay-panel" aria-labelledby="replay-title">
    <div className="replay-heading"><div><h2 id="replay-title">Replay your reasoning</h2><p>See what you were coding and explaining at each checkpoint.</p></div><span>{checkpoints.length} moments</span></div>
    {insights?.length > 0 ? <div className="replay-insights">{insights.map((insight, i) => <article key={`${insight.checkpointId}-${i}`} className={`replay-insight insight-${insight.kind}`}>
      <div><span>{insight.kind === 'gap' ? 'A moment to practice' : 'A useful connection'}</span><button onClick={() => setSelectedId(insight.checkpointId)}>View {formatElapsed(checkpoints.find((moment) => moment.id === insight.checkpointId)?.elapsedMs || 0)}</button></div>
      <h3>{RUBRIC_LABELS[insight.dimension]}</h3><p>{insight.observation}</p>
      {insight.codeQuote && <pre><code>{insight.codeQuote}</code></pre>}
      {insight.transcriptQuote && <blockquote>“{insight.transcriptQuote}”</blockquote>}
      {insight.kind === 'gap' && <button className="learning-secondary" onClick={() => onRetry(insight.dimension, insight.checkpointId)}>Practice this gap <Icon name="arrow" size={14} /></button>}
    </article>)}</div> : <p className="replay-note">No moment-specific AI observation was returned. You can still inspect your recorded checkpoints below.</p>}
    <div className="replay-timeline" aria-label="Session checkpoints">{checkpoints.map((moment) => <button key={moment.id} aria-pressed={selected.id === moment.id} onClick={() => setSelectedId(moment.id)}><time>{formatElapsed(moment.elapsedMs)}</time><span>{MOMENT_LABELS[moment.kind]}</span></button>)}</div>
    <div className="checkpoint-detail">
      <div className="checkpoint-title"><h3>{MOMENT_LABELS[selected.kind]} at {formatElapsed(selected.elapsedMs)}</h3>{selected.run && <span>{selected.run.passed}/{selected.run.total} checks passed</span>}</div>
      <p>{summarizeChanges(checkpoints[index - 1], selected)}</p>
      <div className="checkpoint-evidence"><div><h4>Code at this moment</h4><pre><code>{selected.code || 'No code yet.'}</code></pre></div><div><h4>Explanation at this moment</h4><blockquote>{selected.transcript || 'No explanation captured yet.'}</blockquote></div></div>
    </div>
    <p className="replay-note">Checkpoints reflect when edits and transcription arrived, not exact audio alignment. Replay stays in this session; saved history keeps summaries only.</p>
  </section>
}
