import { useLayoutEffect, useState, useSyncExternalStore } from 'react'
import { loadDisplay, saveDisplay } from '../data/displayPreferences'

function subscribeSystemMotion(listener) {
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
  preference.addEventListener('change', listener)
  return () => preference.removeEventListener('change', listener)
}

function systemReducesMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function useDisplayPreferences() {
  const systemReducedMotion = useSyncExternalStore(subscribeSystemMotion, systemReducesMotion)
  const [initial] = useState(loadDisplay)
  const [preferences, setPreferences] = useState(initial.preferences)
  const [warning, setWarning] = useState(initial.warning)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.textSize = preferences.textSize
    root.dataset.layout = preferences.layout
  }, [preferences.textSize, preferences.layout])

  useLayoutEffect(() => {
    document.documentElement.dataset.motion = preferences.motion
    window.dispatchEvent(new Event('notleetyet:motionchange'))
  }, [preferences.motion])

  function changePreference(key, value) {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    setWarning(saveDisplay(next))
  }

  return { preferences, warning, changePreference, reducedMotion: preferences.motion === 'reduce' || systemReducedMotion }
}
