import { useRef } from 'react'
import { useArrival } from '../lib/motion'

export default function TestConsole({
  problem,
  consoleTab,
  setConsoleTab,
  selectedCase,
  setSelectedCase,
  runResults,
}) {
  const activeTestCase = problem.testCases[selectedCase]
  const activeResult = runResults?.results?.[selectedCase]
  const bodyRef = useRef(null)
  useArrival(bodyRef, consoleTab)
  useArrival(bodyRef, runResults)

  const renderTestCaseFields = (testCase) => {
    if (!testCase) return null
    return Object.entries(testCase).map(([key, value]) => (
      <div key={key} className="case-field">
        <label>{key} =</label>
        <pre>{typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}</pre>
      </div>
    ))
  }

  return (
    <div className="lc-console">
      <div className="lc-console-header">
        <div className="lc-console-tabs">
          <button
            className={`lc-console-tab ${consoleTab === 'testcase' ? 'lc-console-tab-active' : ''}`}
            aria-pressed={consoleTab === 'testcase'}
            onClick={() => setConsoleTab('testcase')}
          >
            Test cases
          </button>
          <button
            className={`lc-console-tab ${consoleTab === 'result' ? 'lc-console-tab-active' : ''}`}
            aria-pressed={consoleTab === 'result'}
            onClick={() => setConsoleTab('result')}
          >
            Test results
          </button>
        </div>
      </div>

      <div ref={bodyRef} className="lc-console-body">
        {problem.curveballStartIndex !== undefined && <p className="curveball-context">Includes the original checks and new requirement cases.</p>}
        {consoleTab === 'testcase' && (
          <>
            <div className="case-pills">
              {problem.testCases.map((_, i) => (
                <button
                  key={i}
                  className={`case-pill ${selectedCase === i ? 'case-pill-active' : ''}`}
                  aria-pressed={selectedCase === i}
                  onClick={() => setSelectedCase(i)}
                >
                  {i >= (problem.curveballStartIndex ?? Infinity) ? 'New case' : 'Case'} {i + 1}
                </button>
              ))}
            </div>
            <div className="case-fields">{renderTestCaseFields(activeTestCase)}</div>
          </>
        )}

        {consoleTab === 'result' && (
          <>
            {!runResults ? (
              <p className="console-empty">
                Choose <strong>Run code</strong> to execute your code against the test
                cases.
              </p>
            ) : runResults.error && !runResults.results?.length ? (
              <div className="result-view">
                <div className="result-status result-error">Error</div>
                <pre className="result-error-msg">{runResults.error}</pre>
              </div>
            ) : (
              <div className="result-view">
                <div className="result-summary">
                  <div
                    role="status" className={`result-status ${runResults.all_passed ? 'result-accepted' : 'result-wrong'}`}
                  >
                    {runResults.all_passed ? 'Accepted' : 'Wrong Answer'} · {runResults.passed}/{runResults.total} checks passed
                  </div>

                  <div className="case-pills">
                    {runResults.results.map((r, i) => (
                      <button
                        key={r.case}
                        className={`case-pill ${selectedCase === i ? 'case-pill-active' : ''} ${r.passed ? 'case-pill-pass' : 'case-pill-fail'}`}
                        aria-pressed={selectedCase === i}
                        aria-label={`Case ${r.case}, ${r.passed ? 'passed' : 'failed'}`}
                        onClick={() => setSelectedCase(i)}
                      >
                        <span
                          className={`case-dot ${r.passed ? 'dot-pass' : 'dot-fail'}`}
                        />
                        Case {r.case}
                      </button>
                    ))}
                  </div>

                </div>

                {activeResult && (
                  <div className="result-details">
                    <div className="result-row">
                      <span className="result-label">Input</span>
                      <pre className="result-value">{activeResult.input}</pre>
                    </div>
                    <div className="result-row">
                      <span className="result-label">Output</span>
                      <pre
                        className={`result-value ${!activeResult.passed ? 'result-value-wrong' : ''}`}
                      >
                        {activeResult.output != null
                          ? JSON.stringify(activeResult.output)
                          : 'null'}
                      </pre>
                    </div>
                    {!activeResult.passed && (
                      <div className="result-row">
                        <span className="result-label">Expected</span>
                        <pre className="result-value result-value-expected">
                          {JSON.stringify(activeResult.expected)}
                        </pre>
                      </div>
                    )}
                    {activeResult.error && (
                      <div className="result-row">
                        <span className="result-label">Error</span>
                        <pre className="result-value result-value-wrong">
                          {activeResult.error}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
