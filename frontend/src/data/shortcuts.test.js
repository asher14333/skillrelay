import test from 'node:test'
import assert from 'node:assert/strict'
import { matchShortcut, shortcutText } from './shortcuts.js'
import { normalizeDisplay } from './displayPreferences.js'

const key = (props) => ({ key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, repeat: false, isComposing: false, ...props })

test('matches modifier shortcuts on Windows and Mac', () => {
  assert.equal(matchShortcut(key({ key: 'Enter', ctrlKey: true })), 'run')
  assert.equal(matchShortcut(key({ key: 'Enter', metaKey: true })), 'run')
  assert.equal(matchShortcut(key({ key: 'Enter', ctrlKey: true, shiftKey: true })), 'feedback')
  assert.equal(matchShortcut(key({ key: 'µ', code: 'KeyM', altKey: true, shiftKey: true })), 'mic')
  assert.equal(matchShortcut(key({ key: 'L', code: 'KeyL', altKey: true, shiftKey: true })), 'mode')
  assert.equal(matchShortcut(key({ key: 'Escape' })), 'stopVoice')
})

test('ignores plain typing, repeats, composition and other combinations', () => {
  assert.equal(matchShortcut(key({ key: 'Enter' })), null)
  assert.equal(matchShortcut(key({ key: 'm', code: 'KeyM' })), null)
  assert.equal(matchShortcut(key({ key: 'M', code: 'KeyM', shiftKey: true })), null)
  assert.equal(matchShortcut(key({ key: 'm', code: 'KeyM', altKey: true, shiftKey: true, ctrlKey: true })), null)
  assert.equal(matchShortcut(key({ key: 'Enter', ctrlKey: true, repeat: true })), null)
  assert.equal(matchShortcut(key({ key: 'Enter', ctrlKey: true, isComposing: true })), null)
  assert.equal(matchShortcut(key({ key: 'Escape', shiftKey: true })), null)
})

test('labels keys for the platform', () => {
  assert.equal(shortcutText('feedback', false), 'Ctrl+Shift+Enter')
  assert.equal(shortcutText('feedback', true), '⌘+Shift+Enter')
  assert.equal(shortcutText('mic', true), 'Option+Shift+M')
})

test('shortcut preference defaults on and only accepts off', () => {
  assert.equal(normalizeDisplay({}).shortcuts, 'on')
  assert.equal(normalizeDisplay({ shortcuts: 'off' }).shortcuts, 'off')
  assert.equal(normalizeDisplay({ shortcuts: 'nope' }).shortcuts, 'on')
})
