import { DEFAULT_GOAL, getLearningGoal } from './learning.js'
import { problems } from './problems.js'
import { findCurveball } from './curveballs.js'

export const STORAGE_KEY = 'notleetyet.practice.v1'
// Saves from before the rename are read once from this key and moved over.
export const LEGACY_STORAGE_KEY = 'skillrelay.practice.v1'
export const MAX_ATTEMPTS = 100
const RUBRIC_MAX = {
  problemUnderstanding: 2, bruteForce: 2, optimization: 2,
  timeComplexity: 1, spaceComplexity: 1, clarity: 2,
}
const problemById = new Map(problems.map((problem) => [problem.slug, problem]))
const finiteScore = (value, max) => Number.isFinite(value) && value >= 0 && value <= max
const shortText = (value, length = 200) => typeof value === 'string' && value.length > 0 && value.length <= length

// Return only the fields we intend to persist, including when reading old data.
export function cleanAttempt(value) {
  if (!value || !shortText(value.id, 100) || !problemById.has(value.problemId) ||
      !getLearningGoal(value.goal) || !finiteScore(value.score, 10) ||
      typeof value.createdAt !== 'string' || !Number.isFinite(Date.parse(value.createdAt))) return null
  const rubric = {}
  for (const [key, max] of Object.entries(RUBRIC_MAX)) {
    const item = value.rubric?.[key]
    if (!item || item.max !== max || !finiteScore(item.score, max)) return null
    rubric[key] = { score: item.score, max }
  }
  const total = Math.round(Object.values(rubric).reduce((sum, item) => sum + item.score, 0) * 10) / 10
  if (total !== value.score || !shortText(value.lesson?.id) || !shortText(value.lesson?.title)) return null
  const dimension = value.lesson.dimension
  if (dimension !== null && !Object.hasOwn(RUBRIC_MAX, dimension)) return null
  const curveball = value.curveballId ? findCurveball(value.curveballId) : null
  const generated = typeof value.curveballId === 'string' && /^ai-[a-zA-Z0-9-]{16,80}$/.test(value.curveballId) && shortText(value.curveballTitle, 160)
  if (value.curveballId && !generated && (!curveball || curveball.problemId !== value.problemId)) return null
  let run = null
  if (value.run !== null && value.run !== undefined) {
    if (!Number.isInteger(value.run.total) || value.run.total < 1 || value.run.total > 1000 ||
        !Number.isInteger(value.run.passed) || !finiteScore(value.run.passed, value.run.total)) return null
    run = { passed: value.run.passed, total: value.run.total }
  }
  let retrySummary = null
  const retry = value.retrySummary
  if (retry && typeof retry === 'object' && Object.hasOwn(RUBRIC_MAX, retry.dimension) && retry.total === 3 &&
      Number.isInteger(retry.beforeMet) && finiteScore(retry.beforeMet, 3) && Number.isInteger(retry.afterMet) && finiteScore(retry.afterMet, 3) &&
      typeof retry.createdAt === 'string' && Number.isFinite(Date.parse(retry.createdAt))) {
    retrySummary = { dimension: retry.dimension, beforeMet: retry.beforeMet, afterMet: retry.afterMet, total: 3, createdAt: retry.createdAt }
  }
  return {
    id: value.id,
    createdAt: new Date(value.createdAt).toISOString(),
    problemId: value.problemId,
    problemTitle: problemById.get(value.problemId).title,
    goal: value.goal,
    ...(curveball ? { curveballId: curveball.id, curveballTitle: curveball.title } : generated ? { curveballId: value.curveballId, curveballTitle: value.curveballTitle } : {}),
    score: value.score,
    rubric,
    lesson: { id: value.lesson.id, title: value.lesson.title, dimension },
    run,
    ...(retrySummary ? { retrySummary } : {}),
  }
}

function cleanHistory(values) {
  const seen = new Set()
  return values.map(cleanAttempt).filter((attempt) => {
    if (!attempt || seen.has(attempt.id)) return false
    seen.add(attempt.id)
    return true
  }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).slice(0, MAX_ATTEMPTS)
}

export function loadPractice(storage) {
  const empty = { goal: DEFAULT_GOAL, attempts: [], warning: '' }
  try {
    const store = storage ?? globalThis.localStorage
    let raw = store.getItem(STORAGE_KEY)
    if (!raw) {
      raw = store.getItem(LEGACY_STORAGE_KEY)
      if (!raw) return empty
      try { store.setItem(STORAGE_KEY, raw); store.removeItem(LEGACY_STORAGE_KEY) } catch { /* keep reading the legacy copy */ }
    }
    const value = JSON.parse(raw)
    if (value?.version !== 1 || !Array.isArray(value.attempts)) throw new Error('Invalid saved practice')
    const attempts = cleanHistory(value.attempts)
    return {
      goal: getLearningGoal(value.goal) ? value.goal : DEFAULT_GOAL,
      attempts,
      warning: attempts.length < Math.min(value.attempts.length, MAX_ATTEMPTS)
        ? 'Some saved entries could not be read. Valid practice summaries are still available.' : '',
    }
  } catch {
    return { ...empty, warning: 'Saved practice could not be read. Practice still works; a new save will start a fresh history.' }
  }
}

export function writePractice(goal, attempts, storage) {
  try {
    if (!getLearningGoal(goal)) throw new Error('Invalid learning goal')
    ;(storage ?? globalThis.localStorage).setItem(STORAGE_KEY, JSON.stringify({
      version: 1, goal, attempts: cleanHistory(attempts),
    }))
    return { ok: true, error: '' }
  } catch {
    return { ok: false, error: 'This browser could not save practice. Free up browser storage or allow site storage, then try again.' }
  }
}

export function addAttempt(attempts, value) {
  const attempt = cleanAttempt(value)
  if (!attempt) throw new Error('This practice summary is incomplete. Analyze your explanation again before saving.')
  return cleanHistory([attempt, ...attempts])
}

export function compareLatest(attempts) {
  const history = cleanHistory(attempts)
  const current = history[0]
  if (!current) return null
  const previous = history.slice(1).find((attempt) =>
    attempt.problemId === current.problemId && attempt.goal === current.goal &&
    (attempt.curveballId || null) === (current.curveballId || null))
  return previous ? { current, previous, delta: Math.round((current.score - previous.score) * 10) / 10 } : null
}
