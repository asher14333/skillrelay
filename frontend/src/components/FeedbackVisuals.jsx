import { useId, useState } from 'react'
import Icon from './Icon'
import { RUBRIC_LABELS } from '../data/problems'
import { rubricEntries, scoreTone, skillStatus } from '../data/feedbackStatus'

export function ScoreRing({ score, max = 10, size = 96, label = 'AI practice score' }) {
  const stroke = size >= 80 ? 8 : 5
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const fraction = Math.max(0, Math.min(1, score / max))
  const tone = scoreTone((score / max) * 10)
  return (
    <div className={`score-ring score-ring-${tone.id}`} style={{ width: size, height: size, '--ring-circumference': circumference }} role="img" aria-label={`${label}: ${score} out of ${max}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="score-ring-track" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} />
        <circle className="score-ring-fill" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke}
          strokeDasharray={circumference} strokeDashoffset={circumference * (1 - fraction)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="score-ring-value" aria-hidden="true" style={{ fontSize: Math.round(size * 0.13) }}><strong style={{ fontSize: Math.round(size * 0.3) }}>{score}</strong><small>/{max}</small></span>
    </div>
  )
}

export function StatusBadge({ item, compact = false }) {
  const status = skillStatus(item)
  return <span className={`status-badge status-${status.id}`}><Icon name={status.icon} size={compact ? 12 : 13} />{status.label}</span>
}

function SkillMeter({ item }) {
  const segments = Array.from({ length: item.max }, (_, index) => Math.max(0, Math.min(1, item.score - index)))
  return (
    <span className={`skill-meter status-${skillStatus(item).id}`} aria-hidden="true">
      {segments.map((fill, index) => <span key={index}><span style={{ width: `${fill * 100}%` }} /></span>)}
    </span>
  )
}

// One row per rubric skill: name, segmented meter, score and status.
export function SkillBars({ rubric, previous, onSelect, compact = false }) {
  const entries = rubricEntries(rubric)
  return (
    <ul className={`skill-bars${compact ? ' skill-bars-compact' : ''}`}>
      {entries.map(([key, item]) => {
        const before = previous?.[key]
        const delta = before ? Math.round((item.score - before.score) * 10) / 10 : 0
        const name = RUBRIC_LABELS[key] || key
        const content = <>
          <span className="skill-bars-name">{name}</span>
          <SkillMeter item={item} />
          <span className="skill-bars-score">{item.score}/{item.max}</span>
          {!compact && <StatusBadge item={item} compact />}
          {before && delta !== 0 && <span className={`skill-delta ${delta > 0 ? 'skill-delta-up' : 'skill-delta-down'}`}>{delta > 0 ? '+' : ''}{delta}</span>}
        </>
        return <li key={key}>
          {onSelect
            ? <button type="button" className="skill-bars-row" onClick={() => onSelect(key)} aria-label={`${name}: ${item.score} of ${item.max}, ${skillStatus(item).label}. Show details`}>{content}</button>
            : <div className="skill-bars-row" aria-label={`${name}: ${item.score} of ${item.max}${before && delta !== 0 ? `, ${delta > 0 ? 'up' : 'down'} ${Math.abs(delta)} from before` : ''}`} role="group">{content}</div>}
        </li>
      })}
    </ul>
  )
}

// Single-series score trend; the heading names the series, so no legend box.
export function ScoreTrend({ attempts }) {
  const titleId = useId()
  const [hover, setHover] = useState(null)
  const points = [...attempts].reverse().slice(-20)
  const width = 560
  const height = 170
  const pad = { top: 14, right: 16, bottom: 26, left: 30 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const x = index => pad.left + (points.length === 1 ? innerW / 2 : (index / (points.length - 1)) * innerW)
  const y = score => pad.top + innerH - (score / 10) * innerH
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${x(index).toFixed(1)},${y(point.score).toFixed(1)}`).join(' ')
  const area = points.length > 1 ? `${path} L${x(points.length - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : ''
  const date = value => new Date(value).toLocaleDateString([], { month: 'short', day: 'numeric' })
  const active = hover === null ? null : points[hover]

  return (
    <figure className="score-trend" aria-labelledby={titleId}>
      <figcaption id={titleId}>Practice score over time</figcaption>
      <div className="score-trend-plot">
        <svg viewBox={`0 0 ${width} ${height}`} role="img"
          aria-label={`Scores for ${points.length} saved attempts, oldest to newest: ${points.map(point => point.score).join(', ')} out of 10.`}
          onMouseLeave={() => setHover(null)}>
          {[0, 5, 10].map(tick => <g key={tick} className="score-trend-grid">
            <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} />
            <text x={pad.left - 8} y={y(tick)} dy="0.35em" textAnchor="end">{tick}</text>
          </g>)}
          {area && <path className="score-trend-area" d={area} />}
          {points.length > 1 && <path className="score-trend-line" d={path} pathLength="1000" />}
          {hover !== null && <line className="score-trend-cross" x1={x(hover)} x2={x(hover)} y1={pad.top} y2={y(0)} />}
          {points.map((point, index) => <g key={point.id}>
            <circle className={`score-trend-dot${hover === index ? ' is-active' : ''}`} cx={x(index)} cy={y(point.score)} r={hover === index ? 6 : 4.5} />
            <circle className="score-trend-hit" cx={x(index)} cy={y(point.score)} r={16}
              onMouseEnter={() => setHover(index)} />
          </g>)}
          {points.length > 1 && <>
            <text className="score-trend-axis" x={x(0)} y={height - 6} textAnchor="start">{date(points[0].createdAt)}</text>
            <text className="score-trend-axis" x={x(points.length - 1)} y={height - 6} textAnchor="end">{date(points.at(-1).createdAt)}</text>
          </>}
        </svg>
        {active && <div className="score-trend-tooltip" style={{ left: `${(x(hover) / width) * 100}%`, top: `${(y(active.score) / height) * 100}%` }}>
          <strong>{active.score}/10</strong>
          <span>{active.problemTitle}</span>
          <span>{new Date(active.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>}
      </div>
      {points.length < 2 && <p className="score-trend-empty">Save another attempt to start a trend line.</p>}
    </figure>
  )
}
