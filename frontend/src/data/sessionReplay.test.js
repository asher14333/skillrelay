import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendCheckpoint, checkpointPayload, formatElapsed, MAX_CHECKPOINTS, summarizeChanges } from './sessionReplay.js'

const moment = (overrides = {}) => ({ kind: 'code', code: 'a = 1', transcript: 'My plan', elapsedMs: 0, ...overrides })
test('bounds checkpoints while retaining the initial context and unique stable IDs', () => {
  let history = []
  for (let i = 0; i < 40; i++) history = appendCheckpoint(history, moment({ code: String(i), elapsedMs: i * 100 }))
  assert.equal(history.length, MAX_CHECKPOINTS)
  assert.equal(history[0].code, '0')
  assert.equal(history.at(-1).code, '39')
  assert.equal(new Set(history.map((entry) => entry.id)).size, MAX_CHECKPOINTS)
  assert.equal(history.at(-1).id, 'moment-40')
})
test('deduplicates unchanged edits but retains test and review events', () => {
  const history = appendCheckpoint([], moment())
  assert.equal(appendCheckpoint(history, moment()), history)
  assert.equal(appendCheckpoint(history, moment({ kind: 'run-result', run: { passed: 3, total: 3 } })).length, 2)
  assert.equal(appendCheckpoint(history, moment({ kind: 'review' })).length, 2)
})
test('preserves explanation and test evidence while thinning old code snapshots', () => {
  let history = appendCheckpoint([], moment({ kind: 'start' }))
  history = appendCheckpoint(history, moment({ kind: 'explanation', transcript: 'My initial plan' }))
  history = appendCheckpoint(history, moment({ kind: 'run-result', run: { passed: 0, total: 3 } }))
  for (let i = 0; i < 40; i++) history = appendCheckpoint(history, moment({ code: `version ${i}` }))
  assert.ok(history.some((entry) => entry.transcript === 'My initial plan'))
  assert.ok(history.some((entry) => entry.kind === 'run-result'))
})
test('timestamps are monotonic and request payload excludes internal sequence', () => {
  let history = appendCheckpoint([], moment({ elapsedMs: 4000 }))
  history = appendCheckpoint(history, moment({ kind: 'explanation', elapsedMs: 3000 }))
  assert.equal(history.at(-1).elapsedMs, 4000)
  assert.equal('sequence' in checkpointPayload(history)[0], false)
  assert.equal(formatElapsed(65000), '1:05')
})
test('change summary distinguishes code edits, explanation revisions, and run results', () => {
  const previous = moment({ code: 'a\nb\nc' })
  assert.match(summarizeChanges(previous, moment({ code: 'a\nx\ny\nc' })), /line 2: 2 lines added, 1 removed/)
  assert.match(summarizeChanges(previous, { ...previous, transcript: 'A revised plan' }), /explanation/)
  assert.match(summarizeChanges(previous, { ...previous, run: { passed: 2, total: 3 } }), /2\/3/)
})
