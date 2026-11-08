import { useRef, useState } from 'react'
import Icon from './Icon'

export default function DisplaySettings({ preferences, warning, onChange }) {
  const panelRef = useRef(null)
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)

  function close() {
    panelRef.current.hidePopover()
    triggerRef.current.focus({ preventScroll: true })
  }

  return (
    <div className="display-settings">
      <button ref={triggerRef} type="button" className="display-settings-trigger"
        popoverTarget="display-settings-panel" aria-label="Display settings" aria-haspopup="dialog" aria-expanded={open}>
        <Icon name="settings" size={16} /><span className="display-settings-full">Display settings</span><span className="display-settings-short" aria-hidden="true">Display</span>
      </button>
      <div ref={panelRef} id="display-settings-panel" className="display-settings-panel"
        popover="auto" role="dialog" aria-labelledby="display-settings-title"
        onToggle={event => {
          const visible = event.newState === 'open'
          setOpen(visible)
          if (visible) panelRef.current.querySelector('select').focus({ preventScroll: true })
        }}>
        <div className="display-settings-heading">
          <h2 id="display-settings-title">Display settings</h2>
          <button className="icon-button" type="button" aria-label="Close display settings" onClick={close}><Icon name="close" size={16} /></button>
        </div>
        <div className="display-setting">
          <label htmlFor="display-text-size">Text size</label>
          <p id="display-text-help">Applies to the interface and code.</p>
          <select id="display-text-size" aria-describedby="display-text-help" value={preferences.textSize} onChange={event => onChange('textSize', event.target.value)}>
            <option value="default">Default</option><option value="large">Large</option><option value="larger">Larger</option>
          </select>
        </div>
        <div className="display-setting">
          <label htmlFor="display-layout">Layout</label>
          <p id="display-layout-help">Columns adapt to your screen. Stacked puts each section on its own row.</p>
          <select id="display-layout" aria-describedby="display-layout-help" value={preferences.layout} onChange={event => onChange('layout', event.target.value)}>
            <option value="columns">Columns</option><option value="stacked">Stacked</option>
          </select>
        </div>
        <div className="display-setting">
          <label htmlFor="display-motion">Reduce motion</label>
          <p id="display-motion-help">Follow your device preference or always reduce animation.</p>
          <select id="display-motion" aria-describedby="display-motion-help" value={preferences.motion} onChange={event => onChange('motion', event.target.value)}>
            <option value="system">Follow system</option><option value="reduce">Reduce</option>
          </select>
        </div>
        <p className={`display-settings-note${warning ? ' display-settings-warning' : ''}`} role="status">
          {warning || 'Changes apply immediately and are saved in this browser.'}
        </p>
      </div>
    </div>
  )
}
