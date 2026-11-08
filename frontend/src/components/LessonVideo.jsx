import Icon from './Icon'
import { getLessonVideo, videoWatchUrl } from '../data/lessonVideos'
import '../LessonVideo.css'

function formatStart(seconds) {
  return seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '0:00'
}

// The player is embedded whenever feedback is on screen (no autoplay), and is
// removed when you leave the feedback view. The YouTube link is always available.
export default function LessonVideo({ dimension, active = true }) {
  const resource = getLessonVideo(dimension)
  if (!resource) return null
  return (
    <section className="lesson-video" aria-labelledby={`lesson-video-${dimension}`}>
      <div className="lesson-video-heading">
        <span><Icon name="play" size={14} />Watch an example</span>
        <a href={videoWatchUrl(resource)} target="_blank" rel="noopener noreferrer">Open on YouTube<Icon name="external" size={13} /><span className="sr-only"> (opens in a new tab)</span></a>
      </div>
      <div className="lesson-video-player">
        {active ? <iframe
          src={`https://www.youtube-nocookie.com/embed/${resource.videoId}?start=${resource.start}&autoplay=0&playsinline=1&rel=0&cc_load_policy=1&cc_lang_pref=en`}
          title={`${resource.chapter}: ${resource.title}`}
          loading="lazy"
          allow="encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        /> : <div className="lesson-video-placeholder"><Icon name="play" size={22} /></div>}
      </div>
      <h3 id={`lesson-video-${dimension}`}>{resource.title}</h3>
      <p className="lesson-video-source">{resource.creator} · starts at {formatStart(resource.start)} · {resource.chapter}</p>
      <p className="lesson-video-focus"><strong>Watch for:</strong> {resource.focus}</p>
    </section>
  )
}
