import { useEffect, useRef } from 'react'
import { animateArrival } from '../lib/motion'

// Keep native details/summary semantics and immediate open/close behavior.
export default function Disclosure({ children, onToggle, ...props }) {
  const wasOpen = useRef(Boolean(props.open))
  const cleanup = useRef([])
  useEffect(() => () => cleanup.current.forEach(cancel => cancel()), [])
  const handleToggle = event => {
    const details = event.currentTarget
    const changed = wasOpen.current !== details.open
    wasOpen.current = details.open
    cleanup.current.forEach(cancel => cancel())
    cleanup.current = changed && details.open
      ? [...details.children].filter(child => child.tagName !== 'SUMMARY').map(child => animateArrival(child))
      : []
    onToggle?.(event)
  }
  return <details {...props} onToggle={handleToggle}>{children}</details>
}
