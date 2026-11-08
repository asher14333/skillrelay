export const MAX_CHECKPOINTS = 16
export const MAX_CODE = 12000
export const MAX_EXPLANATION = 6000
export const MOMENT_LABELS = {
  start: 'Starting point', code: 'Code checkpoint', explanation: 'Explanation checkpoint',
  run: 'Run requested', 'run-result': 'Test result', microphone: 'Microphone started', review: 'Session review',
}

export function appendCheckpoint(moments, { kind, code, transcript, elapsedMs, run }) {
  if (!Object.hasOwn(MOMENT_LABELS, kind)) throw new Error('Unsupported checkpoint')
  const previous = moments.at(-1)
  const next = {
    id: `moment-${(previous?.sequence || 0) + 1}`,
    sequence: (previous?.sequence || 0) + 1,
    elapsedMs: Math.max(0, Math.round(elapsedMs), previous?.elapsedMs || 0),
    kind, code: code.slice(0, MAX_CODE), transcript: transcript.slice(0, MAX_EXPLANATION),
    ...(run ? { run: { passed: run.passed, total: run.total } } : {}),
  }
  if (previous && previous.code === next.code && previous.transcript === next.transcript &&
      kind === previous.kind && !run) return moments
  const result = [...moments, next]
  // Prefer explanation and test events over older code-only snapshots.
  if (result.length > MAX_CHECKPOINTS) {
    const oldCode = result.findIndex((entry, index) => index > 0 && index < result.length - 2 && entry.kind === 'code')
    result.splice(oldCode > 0 ? oldCode : 1, 1)
  }
  return result
}

export function checkpointPayload(moments) {
  return moments.map(({ id, elapsedMs, kind, code, transcript, run }) => ({ id, elapsedMs, kind, code, transcript, ...(run ? { run } : {}) }))
}

export function formatElapsed(ms) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function summarizeChanges(previous, current) {
  if (!previous) return 'The session’s starting point.'
  const before = previous.code.split('\n'), after = current.code.split('\n')
  let start = 0, tail = 0
  while (start < before.length && start < after.length && before[start] === after[start]) start++
  while (tail < before.length - start && tail < after.length - start && before[before.length - tail - 1] === after[after.length - tail - 1]) tail++
  const removed = before.length - start - tail, added = after.length - start - tail
  if (added || removed) return `Code changed near line ${start + 1}: ${added} line${added === 1 ? '' : 's'} added, ${removed} removed.`
  if (current.transcript !== previous.transcript) return 'The explanation was added to or revised; the code stayed the same.'
  return current.run ? `${current.run.passed}/${current.run.total} code checks passed.` : 'The code and explanation were captured again.'
}
