import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addAttempt, cleanAttempt, compareLatest, loadPractice, MAX_ATTEMPTS, STORAGE_KEY, writePractice } from './practiceStorage.js'

function attempt(id = 'a', score = 0, overrides = {}) {
  return {
    id, createdAt: '2026-11-07T20:00:00Z', problemId: 'two-sum', goal: 'clear-explanations',
    score, rubric: {
      problemUnderstanding: { score: score / 5, max: 2 }, bruteForce: { score: score / 5, max: 2 },
      optimization: { score: score / 5, max: 2 }, timeComplexity: { score: score / 10, max: 1 },
      spaceComplexity: { score: score / 10, max: 1 }, clarity: { score: score / 5, max: 2 },
    }, lesson: { id: 'structure-your-explanation', title: 'Structure your explanation', dimension: 'clarity' },
    run: { passed: 3, total: 3 }, ...overrides,
  }
}

function memoryStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
}

test('round trip retains summaries and strips code, transcripts, and unknown fields', () => {
  const storage = memoryStorage()
  const source = attempt('a', 5, { code: 'private source', transcript: 'private transcript' })
  assert.equal(writePractice('clear-explanations', [source], storage).ok, true)
  const saved = loadPractice(storage)
  assert.equal(saved.attempts[0].score, 5)
  assert.equal(saved.attempts[0].problemTitle, 'Two Sum')
  assert.equal('code' in saved.attempts[0], false)
  assert.equal('transcript' in saved.attempts[0], false)
})

test('duplicates are not saved twice and history is bounded', () => {
  const first = addAttempt([], attempt())
  assert.equal(addAttempt(first, attempt()).length, 1)
  const history = Array.from({ length: MAX_ATTEMPTS + 10 }, (_, i) => attempt(String(i), 0, {
    createdAt: new Date(Date.UTC(2026, 10, 7, 0, i)).toISOString(),
  }))
  const result = addAttempt(history, attempt('new', 0, { createdAt: '2026-11-08T01:00:00Z' }))
  assert.equal(result.length, MAX_ATTEMPTS)
  assert.equal(result[0].id, 'new')
})

test('corrupt and unsupported storage data fail safely', () => {
  const storage = memoryStorage()
  for (const raw of ['bad json', 'null', '{"version":2,"attempts":[]}', '{"version":1,"attempts":{}}']) {
    storage.setItem(STORAGE_KEY, raw)
    const result = loadPractice(storage)
    assert.deepEqual(result.attempts, [])
    assert.ok(result.warning)
  }
})

test('invalid entries are excluded without losing valid history', () => {
  const storage = memoryStorage()
  storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, goal: 'clear-explanations', attempts: [
    attempt(), attempt('bad', 5, { score: 9 }), null,
  ] }))
  const result = loadPractice(storage)
  assert.equal(result.attempts.length, 1)
  assert.ok(result.warning)
  assert.equal(cleanAttempt(attempt('bad', 0, { run: { passed: 8, total: 3 } })), null)
  assert.equal(cleanAttempt(attempt('bad', 0, { createdAt: 'invalid' })), null)
  assert.equal(cleanAttempt(attempt('bad', 0, { goal: 'invalid' })), null)
})

test('storage access failures preserve a usable result and actionable error', () => {
  const storage = { getItem() { throw new Error('denied') }, setItem() { throw new Error('full') } }
  assert.ok(loadPractice(storage).warning)
  assert.equal(writePractice('clear-explanations', [attempt()], storage).ok, false)
})

test('score comparisons use the same problem and goal, regardless of intervening attempts', () => {
  const history = [
    attempt('latest', 8, { createdAt: '2026-11-07T23:00:00Z' }),
    attempt('other-goal', 1, { createdAt: '2026-11-07T22:00:00Z', goal: 'technical-tradeoffs' }),
    attempt('other-problem', 9, { createdAt: '2026-11-07T21:00:00Z', problemId: 'valid-parentheses' }),
    attempt('previous', 5),
  ]
  const comparison = compareLatest(history)
  assert.equal(comparison.previous.id, 'previous')
  assert.equal(comparison.delta, 3)
  assert.equal(compareLatest(history.slice(0, 3)), null)
  assert.equal(compareLatest([]), null)
})

test('deleting an attempt and clearing history persist across reload', () => {
  const storage = memoryStorage()
  const history = addAttempt([attempt('older')], attempt('new'))
  writePractice('technical-tradeoffs', history.filter((entry) => entry.id !== 'older'), storage)
  assert.deepEqual(loadPractice(storage).attempts.map((entry) => entry.id), ['new'])
  assert.equal(loadPractice(storage).goal, 'technical-tradeoffs')
  writePractice('technical-tradeoffs', [], storage)
  assert.deepEqual(loadPractice(storage).attempts, [])
})

test('focused retry summaries update an existing attempt and omit private evidence', () => {
  const original = attempt('a', 5)
  const updated = { ...original, checkpoints: [{ code: 'private code' }], retrySummary: {
    dimension: 'clarity', beforeMet: 1, afterMet: 3, total: 3, createdAt: '2026-11-07T23:00:00Z',
    before: 'private explanation', checks: ['private quotes'],
  } }
  const history = addAttempt([original], updated)
  assert.equal(history.length, 1)
  assert.equal(history[0].retrySummary.afterMet, 3)
  assert.equal('before' in history[0].retrySummary, false)
  assert.equal('checks' in history[0].retrySummary, false)
  assert.equal('checkpoints' in history[0], false)
  assert.equal('retrySummary' in cleanAttempt({ ...original, retrySummary: { ...updated.retrySummary, total: 100 } }), false)
})


test('curveball summaries persist without raw evidence and compare only the same requirement', () => {
  const latest = attempt('variant', 8, { curveballId: 'two-sum-no-match', createdAt: '2026-11-08T03:00:00Z', code: 'private', beforeTranscript: 'private' })
  const ordinary = attempt('ordinary', 9, { createdAt: '2026-11-08T02:00:00Z' })
  assert.equal(compareLatest([latest, ordinary]), null)
  const previous = attempt('earlier-variant', 5, { curveballId: 'two-sum-no-match' })
  assert.equal(compareLatest([latest, ordinary, previous]).delta, 3)
  const storage = memoryStorage()
  writePractice('clear-explanations', [latest], storage)
  const saved = loadPractice(storage).attempts[0]
  assert.equal(saved.curveballId, 'two-sum-no-match')
  assert.equal(saved.curveballTitle, 'No matching pair')
  assert.equal('code' in saved, false)
  assert.equal('beforeTranscript' in saved, false)
  assert.equal(cleanAttempt(attempt('wrong', 5, { curveballId: 'stock-empty-prices' })), null)
})
