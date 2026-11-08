export const DISPLAY_STORAGE_KEY = 'notleetyet.display.v1'
export const LEGACY_DISPLAY_STORAGE_KEY = 'skillrelay.display.v1'
export const DEFAULT_DISPLAY = { textSize: 'default', layout: 'columns', motion: 'system', shortcuts: 'on' }

export function normalizeDisplay(value) {
  return {
    textSize: ['default', 'large', 'larger'].includes(value?.textSize) ? value.textSize : 'default',
    layout: ['columns', 'stacked'].includes(value?.layout) ? value.layout : 'columns',
    motion: value?.motion === 'reduce' ? 'reduce' : 'system',
    shortcuts: value?.shortcuts === 'off' ? 'off' : 'on',
  }
}

export function loadDisplay() {
  try {
    let raw = window.localStorage.getItem(DISPLAY_STORAGE_KEY)
    if (raw === null) {
      raw = window.localStorage.getItem(LEGACY_DISPLAY_STORAGE_KEY)
      if (raw !== null) {
        try { window.localStorage.setItem(DISPLAY_STORAGE_KEY, raw); window.localStorage.removeItem(LEGACY_DISPLAY_STORAGE_KEY) } catch { /* keep reading the legacy copy */ }
      }
    }
    return { preferences: normalizeDisplay(JSON.parse(raw)), warning: '' }
  } catch {
    return { preferences: { ...DEFAULT_DISPLAY }, warning: 'Display settings could not be loaded. You can still change them for this visit.' }
  }
}

export function saveDisplay(preferences) {
  try {
    window.localStorage.setItem(DISPLAY_STORAGE_KEY, JSON.stringify(normalizeDisplay(preferences)))
    return ''
  } catch {
    return 'Your display settings apply now, but could not be saved in this browser.'
  }
}
