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
  minus: 'M6 12h12',
  external: 'M14 4h6v6m0-6-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  trendUp: 'm4 16 6-6 4 4 6-7m0 0h-5m5 0v5',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z',
  speaker: 'M4 9v6h4l5 4V5L8 9H4Zm12-1a5 5 0 0 1 0 8',
  keyboard: 'M3 6h18v12H3V6Zm4 4h.01M11 10h.01M15 10h.01M7 14h10',
}

export default function Icon({ name, size = 18, ...props }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.arrow} /></svg>
}

export function BrandMark() {
  return <svg className="brand-mark" width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
    <path className="brand-mark-bubble" d="M9 3h13.5a7 7 0 0 1 7 7v8a7 7 0 0 1-7 7H14l-6.2 5.2V25A7 7 0 0 1 2 18v-8a7 7 0 0 1 7-7z" />
    <g className="brand-mark-braces" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.6 8.6c-1.7 0-2.5.8-2.5 2.4v1.4c0 1.1-.6 1.6-1.7 1.6 1.1 0 1.7.5 1.7 1.6V17c0 1.6.8 2.4 2.5 2.4" />
      <path d="M19.4 8.6c1.7 0 2.5.8 2.5 2.4v1.4c0 1.1.6 1.6 1.7 1.6-1.1 0-1.7.5-1.7 1.6V17c0 1.6-.8 2.4-2.5 2.4" transform="rotate(26 21.5 14) translate(0.2 1.4)" />
    </g>
    <path className="brand-mark-drop" d="M27.6 0.8c1.5 2.1 2.4 3.4 2.4 4.4a2.4 2.4 0 0 1-4.8 0c0-1 .9-2.3 2.4-4.4z" strokeWidth="1.1" strokeLinejoin="round" />
  </svg>
}
