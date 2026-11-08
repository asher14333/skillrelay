import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })

export default function CodeEditor({ value, onChange, fontSize = 14, reducedMotion = false }) {
  return (
    <Editor
      height="100%"
      loading={<div className="editor-loading" role="status">Opening your editor…</div>}
      language="python"
      theme="notleetyet-night"
      beforeMount={(monaco) => monaco.editor.defineTheme('notleetyet-night', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '909590', fontStyle: 'italic' },
          { token: 'keyword', foreground: 'C4AFE0' },
          { token: 'string', foreground: 'A8C7A0' },
          { token: 'number', foreground: 'DEC18E' },
        ],
        colors: {
          'editor.background': '#181818',
          'editor.foreground': '#EDEDED',
          'editorLineNumber.foreground': '#858585',
          'editorLineNumber.activeForeground': '#D0D0D0',
          'editor.lineHighlightBackground': '#202020',
          'editor.selectionBackground': '#5D492F',
          'editor.inactiveSelectionBackground': '#39332B',
          'editorCursor.foreground': '#EAB86B',
          'editorGutter.background': '#181818',
          'editorWidget.background': '#232323',
          'editorWidget.border': '#505050',
          'editorSuggestWidget.background': '#232323',
          'editorSuggestWidget.foreground': '#EDEDED',
          'editorSuggestWidget.border': '#505050',
          'editorSuggestWidget.selectedBackground': '#3C3428',
          'editorHoverWidget.background': '#232323',
          'editorHoverWidget.border': '#505050',
          'focusBorder': '#EAB86B',
          'scrollbarSlider.background': '#50505080',
          'scrollbarSlider.hoverBackground': '#68686899',
          'scrollbarSlider.activeBackground': '#85858599',
        },
      })}
      value={value}
      onChange={onChange}
      options={{
        fontSize,
        lineHeight: Math.round(fontSize * 12 / 7),
        smoothScrolling: false,
        cursorBlinking: reducedMotion ? 'solid' : 'blink',
        cursorSmoothCaretAnimation: 'off',
        fontFamily: 'Menlo, Consolas, Monaco, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        padding: { top: 12 },
        tabSize: 4,
        insertSpaces: true,
        automaticLayout: true,
        wordWrap: 'on',
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        stickyScroll: { enabled: false },
      }}
    />
  )
}
