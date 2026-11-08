import { useLayoutEffect, useRef } from 'react'

const running = new WeakMap()

export function prefersReducedMotion() {
  return document.documentElement.dataset.motion === 'reduce' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function onMotionChange(listener) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  preference.addEventListener('change', listener)
  window.addEventListener('skillrelay:motionchange', listener)
  return () => {
    preference.removeEventListener('change', listener)
    window.removeEventListener('skillrelay:motionchange', listener)
  }
}

// Native scrolling is not a WAAPI animation. A live preference change must
// explicitly finish it without motion rather than relying on CSS alone.
export function scrollWithPreference(scroll, smooth = true) {
  scroll(smooth && !prefersReducedMotion() ? 'smooth' : 'auto')
  if (!smooth || prefersReducedMotion()) return () => {}
  const release = () => {
    clearTimeout(timer)
    unsubscribe()
  }
  const finishWithoutMotion = () => {
    if (prefersReducedMotion()) { scroll('auto'); release() }
  }
  const timer = setTimeout(release, 1000)
  const unsubscribe = onMotionChange(finishWithoutMotion)
  return release
}

// A bounded arrival, never a delay before content becomes usable: elements stay
// interactive while they fade and settle into place.
export function animateArrival(element, { offset = 0, scale = 1, delay = 0, from = 0.35 } = {}) {
  running.get(element)?.cancel()
  if (!element?.animate || prefersReducedMotion() || document.hidden ||
      !element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') return () => {}

  const tokens = getComputedStyle(document.documentElement)
  const duration = parseFloat(tokens.getPropertyValue('--motion-arrive')) || 240
  const easing = tokens.getPropertyValue('--motion-ease').trim() || 'cubic-bezier(0.16, 1, 0.3, 1)'
  const start = [offset && `translateY(${offset}px)`, scale !== 1 && `scale(${scale})`].filter(Boolean).join(' ') || 'none'
  const frames = [{ opacity: from, transform: start }, { opacity: 1, transform: 'none' }]
  const animation = element.animate(frames, { duration, easing, delay, fill: 'backwards' })
  running.set(element, animation)
  const cancelForPreference = () => { if (prefersReducedMotion()) animation.cancel() }
  const release = () => {
    unsubscribe()
    if (running.get(element) === animation) running.delete(element)
  }
  const unsubscribe = onMotionChange(cancelForPreference)
  animation.finished.then(release, release)
  return () => { animation.cancel(); release() }
}

// Arrives a group of elements in order with a short, capped stagger.
export function animateStagger(elements, { offset = 6, step = 30, max = 6 } = {}) {
  const cleanups = [...elements].filter(Boolean)
    .map((element, index) => animateArrival(element, { offset, delay: Math.min(index, max) * step }))
  return () => cleanups.forEach(cleanup => cleanup())
}

// Does not animate first render, keystrokes, or unrelated component updates.
export function useArrival(ref, trigger) {
  const previous = useRef(trigger)
  useLayoutEffect(() => {
    const changed = previous.current !== trigger
    previous.current = trigger
    if (changed && trigger) return animateArrival(ref.current)
  }, [ref, trigger])
}
