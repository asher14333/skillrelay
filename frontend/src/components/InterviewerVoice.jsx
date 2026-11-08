import { useId } from 'react'
import Icon from './Icon'
import '../InterviewerVoice.css'

export default function InterviewerVoice({ enabled, onToggle, audio }) {
  const statusId = useId()
  const busy = audio.status === 'loading' || audio.status === 'speaking'
  return <div className="interviewer-voice" role="group" aria-label="AI interviewer voice">
    <div className="interviewer-voice-controls">
      <button type="button" className="learning-secondary interviewer-voice-toggle" aria-pressed={enabled}
        aria-describedby={statusId} onClick={() => onToggle(!enabled)}>
        <Icon name="mic" size={16} />AI voice {enabled ? 'on' : 'off'}
      </button>
      {busy ? <button type="button" className="btn-text" onClick={audio.stop}>Stop voice</button> :
        <button type="button" className="btn-text" onClick={audio.replay} disabled={!enabled || audio.blocked || !audio.lastText}>Replay voice</button>}
      <span id={statusId} className="interviewer-voice-status" role="status">
        {audio.blocked ? 'Voice waits while the microphone is active.' : audio.status === 'loading' ? 'Generating Gemini audio…' :
          audio.status === 'speaking' ? 'Interviewer speaking' : enabled ? 'Gemini voice ready' : 'Text responses stay available.'}
      </span>
    </div>
    {audio.error && <p className="interviewer-voice-error" role="alert">{audio.error}</p>}
  </div>
}
