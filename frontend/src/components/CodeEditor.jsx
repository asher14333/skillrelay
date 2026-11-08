import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution'
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })

export default function CodeEditor({ value, onChange }) {
  return (
    <Editor
      height="100%"
      loading={<div className="editor-loading" role="status">Opening your editor…</div>}
      language="python"
      theme="skillrelay-night"
      beforeMount={(monaco) => monaco.editor.defineTheme('skillrelay-night', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment', foreground: '7F9BA9', fontStyle: 'italic' },
          { token: 'keyword', foreground: '95C5F2' },
          { token: 'string', foreground: 'B5D6A7' },
          { token: 'number', foreground: 'E3BE8C' },
        ],
        colors: {
          'editor.background': '#152433',
          'editor.foreground': '#DCE7EF',
          'editorLineNumber.foreground': '#6B8799',
          'editorLineNumber.activeForeground': '#B7CEDC',
          'editor.lineHighlightBackground': '#1A2C3D',
          'editor.selectionBackground': '#34566A',
          'editorCursor.foreground': '#8BD0C0',
          'editorGutter.background': '#152433',
        },
      })}
      value={value}
      onChange={onChange}
      options={{
        fontSize: 14,
        lineHeight: 24,
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
