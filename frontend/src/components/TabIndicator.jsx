import { useLayoutEffect, useState } from 'react'

export default function TabIndicator({ trackRef, activeKey }) {
  const [bounds, setBounds] = useState(null)
  useLayoutEffect(() => {
    const track = trackRef.current
    const selected = track?.querySelector('.tab-active')
    if (!track || !selected) return
    const measure = () => {
      if (!track.getClientRects().length || !selected.offsetWidth) return
      const left = selected.offsetLeft
      const width = selected.offsetWidth
      setBounds(previous => previous?.left === left && previous.width === width ? previous : { left, width })
      track.dataset.motionIndicator = 'ready'
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(track)
    observer.observe(selected)
    return () => { observer.disconnect(); delete track.dataset.motionIndicator }
  }, [trackRef, activeKey])

  // The first indicator mounts at its measured position, avoiding a load animation.
  return bounds && <span className="tab-indicator" aria-hidden="true"
    style={{ transform: `translateX(${bounds.left}px) scaleX(${bounds.width})` }} />
}
