import { useLayoutEffect, useRef } from 'react'

const running = new WeakMap()

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Native scrolling is not a WAAPI animation. A live preference change must
// explicitly finish it without motion rather than relying on CSS alone.
export function scrollWithPreference(scroll, smooth = true) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  scroll(smooth && !preference.matches ? 'smooth' : 'auto')
  if (!smooth || preference.matches) return () => {}
  const release = () => {
    clearTimeout(timer)
    preference.removeEventListener('change', finishWithoutMotion)
  }
  const finishWithoutMotion = () => {
    if (preference.matches) { scroll('auto'); release() }
  }
  const timer = setTimeout(release, 1000)
  preference.addEventListener('change', finishWithoutMotion)
  return release
}

// A bounded arrival, never a delay before content becomes usable.
export function animateArrival(element, { offset = 0 } = {}) {
  running.get(element)?.cancel()
  if (!element?.animate || prefersReducedMotion() || document.hidden ||
      !element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') return () => {}

  const tokens = getComputedStyle(document.documentElement)
  const duration = parseFloat(tokens.getPropertyValue('--motion-standard')) || 180
  const easing = tokens.getPropertyValue('--motion-ease').trim() || 'cubic-bezier(0.16, 1, 0.3, 1)'
  const frames = offset
    ? [{ opacity: 0.72, transform: `translateY(${offset}px)` }, { opacity: 1, transform: 'translateY(0)' }]
    : [{ opacity: 0.72 }, { opacity: 1 }]
  const animation = element.animate(frames, { duration, easing })
  running.set(element, animation)
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  const cancelForPreference = () => { if (preference.matches) animation.cancel() }
  const release = () => {
    preference.removeEventListener('change', cancelForPreference)
    if (running.get(element) === animation) running.delete(element)
  }
  preference.addEventListener('change', cancelForPreference)
  animation.finished.then(release, release)
  return () => { animation.cancel(); release() }
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
