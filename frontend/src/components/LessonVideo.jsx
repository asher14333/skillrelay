import { useId, useState } from 'react'
import Disclosure from './Disclosure'
import Icon from './Icon'
import { getLessonVideo, videoWatchUrl } from '../data/lessonVideos'
import '../LessonVideo.css'

function VideoResource({ resource, practicePrompt, active }) {
  const [loaded, setLoaded] = useState(false)
  const playerId = useId()
  const isLoaded = loaded && active
  const startLabel = resource.start
    ? `${Math.floor(resource.start / 60)}:${String(resource.start % 60).padStart(2, '0')}`
    : 'the beginning'

  return (
    <Disclosure className="lesson-video" onToggle={event => {
      if (!event.currentTarget.open) setLoaded(false)
    }}>
      <summary><Icon name="play" size={15} /><span>Watch an example</span><span className="lesson-video-optional">Optional</span></summary>
      <div className="lesson-video-content">
        <h3>{resource.title}</h3>
        <p className="lesson-video-source">{resource.creator}. Starts at {startLabel}.</p>
        <p className="lesson-video-focus">{resource.focus}</p>
        <div className="lesson-video-consent">
          <p>The player connects to YouTube only when you load it. It won’t autoplay.</p>
          <button type="button" className="learning-secondary" aria-expanded={isLoaded}
            aria-controls={isLoaded ? playerId : undefined} onClick={() => setLoaded(!isLoaded)}>
            <Icon name={isLoaded ? 'close' : 'play'} size={15} />{isLoaded ? 'Close video' : 'Load video'}
          </button>
        </div>
        {isLoaded && <div className="lesson-video-player" id={playerId}>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${resource.videoId}?start=${resource.start}&autoplay=0&playsinline=1&rel=0&cc_load_policy=1&cc_lang_pref=en`}
            title={`${resource.chapter}: ${resource.title}`}
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>}
        <p className="lesson-video-fallback"><a href={videoWatchUrl(resource)} target="_blank" rel="noopener noreferrer">Watch on YouTube</a><span>Use this link if the player is unavailable. Use CC for captions when available.</span></p>
        <div className="lesson-video-apply">
          <strong>Then apply it to your code</strong>
          <p>{practicePrompt || 'Explain the same idea using a concrete example from your solution.'}</p>
          <p>Use the focused retry below to compare your explanations. Watching alone doesn’t assess your understanding.</p>
        </div>
      </div>
    </Disclosure>
  )
}

export default function LessonVideo({ dimension, practicePrompt, active = true }) {
  const resource = getLessonVideo(dimension)
  if (!resource) return null
  return <VideoResource key={`${dimension}:${active}`} resource={resource} practicePrompt={practicePrompt} active={active} />
}
