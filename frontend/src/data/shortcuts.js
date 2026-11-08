// Keyboard shortcuts use modifier keys only (WCAG 2.1.4), except Escape,
// which only acts while interviewer audio is playing.
export const SHORTCUTS = [
  { id: 'run', label: 'Run code', keys: ['Mod', 'Enter'], aria: 'Control+Enter Meta+Enter' },
  { id: 'feedback', label: 'Get session feedback', keys: ['Mod', 'Shift', 'Enter'], aria: 'Control+Shift+Enter Meta+Shift+Enter' },
  { id: 'mic', label: 'Start or stop mic / interview', keys: ['Alt', 'Shift', 'M'], aria: 'Alt+Shift+M' },
  { id: 'mode', label: 'Switch Practice / Live', keys: ['Alt', 'Shift', 'L'], aria: 'Alt+Shift+L' },
  { id: 'stopVoice', label: 'Stop AI voice', keys: ['Esc'], aria: 'Escape' },
]

export const isMacPlatform = (platform = globalThis.navigator?.userAgentData?.platform || globalThis.navigator?.platform || '') =>
  /mac|iphone|ipad/i.test(platform)

export function keyLabel(key, mac = isMacPlatform()) {
  if (key === 'Mod') return mac ? '⌘' : 'Ctrl'
  if (key === 'Alt') return mac ? 'Option' : 'Alt'
  return key
}

export function shortcutText(id, mac = isMacPlatform()) {
  const shortcut = SHORTCUTS.find(item => item.id === id)
  return shortcut ? shortcut.keys.map(key => keyLabel(key, mac)).join('+') : ''
}

// Returns the shortcut id for a keydown event, or null.
export function matchShortcut(event) {
  if (!event || event.repeat || event.isComposing) return null
  const mod = event.ctrlKey || event.metaKey
  if (event.key === 'Enter' && mod && !event.altKey) return event.shiftKey ? 'feedback' : 'run'
  if (event.altKey && event.shiftKey && !mod) {
    if (event.code === 'KeyM') return 'mic'
    if (event.code === 'KeyL') return 'mode'
  }
  if (event.key === 'Escape' && !mod && !event.altKey && !event.shiftKey) return 'stopVoice'
  return null
}
