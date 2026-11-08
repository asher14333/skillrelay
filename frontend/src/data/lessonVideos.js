// Curated resources, not model-generated links. Title/channel/embed metadata checked
// against YouTube oEmbed and watch-page chapter/caption metadata on 2026-11-07.
// Publisher chapters: https://www.youtube.com/watch?v=Ti5vfu9arXQ
// Communication chapter: https://www.youtube.com/watch?v=6ZZX9iIgFoo
// Complexity resource: https://www.youtube.com/watch?v=aWKEBEg55ps
const interviewExample = {
  videoId: 'Ti5vfu9arXQ',
  title: 'How to solve a Google coding interview question',
  creator: 'Life at Google',
}
const complexityExample = {
  videoId: 'aWKEBEg55ps',
  title: 'Time & Space Complexity - Big O Notation - DSA Course in Python Lecture 1',
  creator: 'Greg Hogg',
  start: 0,
  chapter: 'Time and space complexity',
}

export const LESSON_VIDEOS = {
  problemUnderstanding: {
    ...interviewExample, start: 109, chapter: 'Clarifying questions',
    focus: 'Notice how the candidate checks the requirements before choosing an approach.',
  },
  bruteForce: {
    ...interviewExample, start: 188, chapter: 'Brute force approach',
    focus: 'Notice how the candidate makes a straightforward approach understandable before improving it.',
  },
  optimization: {
    ...interviewExample, start: 302, chapter: 'Optimal approaches',
    focus: 'Listen for the reason to change approaches, then connect that reason to your own solution.',
  },
  timeComplexity: {
    ...complexityExample,
    focus: 'Focus on how the amount of work changes as the input grows. Apply that reasoning to your loops.',
  },
  spaceComplexity: {
    ...complexityExample,
    focus: 'Look for the difference between the input and the extra storage an approach needs.',
  },
  clarity: {
    videoId: '6ZZX9iIgFoo', title: 'Prepare for Your Google Interview: Coding', creator: 'Life at Google',
    start: 24, chapter: 'Communications and collaboration',
    focus: 'Listen for ways to make your thinking understandable while you work.',
  },
}

export function getLessonVideo(dimension) {
  return Object.hasOwn(LESSON_VIDEOS, dimension) ? LESSON_VIDEOS[dimension] : null
}

export function videoWatchUrl(resource) {
  return `https://www.youtube.com/watch?v=${resource.videoId}&t=${resource.start}s`
}
