const paths = {
  settings: 'M4 7h9m4 0h3M4 17h3m4 0h9M13 4v6M7 14v6',
  code: 'm8 7-5 5 5 5m8-10 5 5-5 5m-3-14-2 18',
  progress: 'M4 19V5m0 14h16M8 15l4-4 3 2 5-7',
  check: 'm5 12 4 4L19 6',
  arrow: 'M5 12h14m-5-5 5 5-5 5',
  close: 'm6 6 12 12M6 18 18 6',
  book: 'M4 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H4V4Zm9 3a3 3 0 0 1 3-3h5v14h-4a4 4 0 0 0-4 3',
  clock: 'M12 8v4l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  shield: 'm12 3 8 3v6c0 4-4 7-8 9-4-2-8-5-8-9V6l8-3Zm-4 9 3 3 5-6',
  mic: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5Zm-3 6v1a6 6 0 0 0 12 0v-1m-6 7v4m-4 0h8',
  play: 'm8 5 11 7-11 7V5Z',
  save: 'M5 3h12l4 4v14H3V3h2Zm2 0v6h10V3M7 21v-7h10v7',
  pause: 'M9 5v14m6-14v14',
  speaker: 'M4 9v6h4l5 4V5L8 9H4Zm12-1a5 5 0 0 1 0 8',
  keyboard: 'M3 6h18v12H3V6Zm4 4h.01M11 10h.01M15 10h.01M7 14h10',
}

export default function Icon({ name, size = 18, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.arrow} /></svg>
}

export function BrandMark() {
  return <svg className="brand-mark" width="30" height="30" viewBox="0 0 32 32" fill="none" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="currentColor" />
    <path d="m10 10 6 6-6 6m8-12 5 6-5 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
