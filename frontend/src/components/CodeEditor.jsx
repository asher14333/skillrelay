import Editor from '@monaco-editor/react'

export default function CodeEditor({ value, onChange }) {
  return (
    <Editor
      height="100%"
      language="python"
      theme="vs-dark"
      value={value}
      onChange={onChange}
      options={{
        fontSize: 14,
        fontFamily: 'Menlo, Consolas, Monaco, monospace',
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: 'on',
        renderLineHighlight: 'line',
        padding: { top: 12 },
        tabSize: 4,
        insertSpaces: true,
        automaticLayout: true,
        wordWrap: 'off',
      }}
    />
  )
}
