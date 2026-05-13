import React from 'react';

const PATHS = {
  search: (c) => <><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></>,
  plus: () => <path d="M8 3v10M3 8h10" />,
  pencil: () => <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5zM10 4l2 2" />,
  trash: () => <><path d="M3 4.5h10M6.5 4.5V3a1 1 0 011-1h1a1 1 0 011 1v1.5M5 4.5l.5 8.5a1 1 0 001 1h3a1 1 0 001-1L11 4.5" /></>,
  play: (c) => <path d="M5 3.5v9l7-4.5z" fill={c} stroke="none" />,
  grid: () => <><rect x="2.5" y="2.5" width="4" height="4" rx="0.8" /><rect x="9.5" y="2.5" width="4" height="4" rx="0.8" /><rect x="2.5" y="9.5" width="4" height="4" rx="0.8" /><rect x="9.5" y="9.5" width="4" height="4" rx="0.8" /></>,
  list: () => <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />,
  more: (c) => <><circle cx="3.5" cy="8" r="0.9" fill={c} stroke="none" /><circle cx="8" cy="8" r="0.9" fill={c} stroke="none" /><circle cx="12.5" cy="8" r="0.9" fill={c} stroke="none" /></>,
  moreVert: (c) => <><circle cx="8" cy="3.5" r="0.9" fill={c} stroke="none" /><circle cx="8" cy="8" r="0.9" fill={c} stroke="none" /><circle cx="8" cy="12.5" r="0.9" fill={c} stroke="none" /></>,
  check: () => <path d="M3 8.5L6.5 12 13 4.5" strokeWidth={1.8} />,
  x: () => <path d="M4 4l8 8M12 4l-8 8" />,
  chevronRight: () => <path d="M6 3l5 5-5 5" />,
  chevronDown: () => <path d="M3 6l5 5 5-5" />,
  chevronLeft: () => <path d="M10 3L5 8l5 5" />,
  arrowUpRight: () => <><path d="M5 11L11 5" /><path d="M6 5h5v5" /></>,
  link: () => <><path d="M7 9.5c.7.7 1.8.7 2.5 0L12 7a1.8 1.8 0 000-2.5l-.5-.5a1.8 1.8 0 00-2.5 0L8 5" /><path d="M9 6.5c-.7-.7-1.8-.7-2.5 0L4 9a1.8 1.8 0 000 2.5l.5.5a1.8 1.8 0 002.5 0L8 11" /></>,
  photo: () => <><rect x="2" y="3" width="12" height="10" rx="1.5" /><circle cx="5.5" cy="6.5" r="1" /><path d="M2 11l3.5-3 3 2.5 3-2.5L14 11" /></>,
  upload: () => <><path d="M8 11V3M5 6l3-3 3 3" /><path d="M3 12.5h10" /></>,
  refresh: () => <><path d="M13 4.5v3h-3" /><path d="M13 7.5A5 5 0 103.5 6" /></>,
  folder: () => <path d="M2 5a1 1 0 011-1h3l1.5 1.5h5.5a1 1 0 011 1v5.5a1 1 0 01-1 1H3a1 1 0 01-1-1V5z" />,
  sparkles: () => <><path d="M8 2.5v3M8 10.5v3M2.5 8h3M10.5 8h3M4 4l1.5 1.5M10.5 10.5L12 12M12 4l-1.5 1.5M5.5 10.5L4 12" strokeWidth={1.2} /></>,
  apps: () => <><rect x="2.5" y="2.5" width="3.2" height="3.2" rx="0.6" /><rect x="10.3" y="2.5" width="3.2" height="3.2" rx="0.6" /><rect x="2.5" y="10.3" width="3.2" height="3.2" rx="0.6" /><rect x="10.3" y="10.3" width="3.2" height="3.2" rx="0.6" /><rect x="6.4" y="6.4" width="3.2" height="3.2" rx="0.6" /></>,
  star: () => <path d="M8 2l1.7 3.7 4 .5-2.9 2.8.7 4-3.5-2-3.5 2 .7-4L2 6.2l4-.5L8 2z" strokeWidth={1.2} />,
  download: () => <><path d="M8 3v8M5 8l3 3 3-3" /><path d="M3 12.5h10" /></>,
  info: () => <><circle cx="8" cy="8" r="6" /><path d="M8 7v4M8 5.2v.6" strokeWidth={1.6} /></>,
  globe: () => <><circle cx="8" cy="8" r="6" /><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" /></>,
  lock: () => <><rect x="3.5" y="7" width="9" height="6" rx="1.2" /><path d="M5.5 7V5a2.5 2.5 0 015 0v2" /></>,
};

export default function Icon({ name, size = 14, color = 'currentColor', strokeWidth = 1.5, style = {} }) {
  const pathFn = PATHS[name];
  if (!pathFn) return null;
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16"
      fill="none" stroke={color} strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
      style={style}
    >
      {pathFn(color)}
    </svg>
  );
}
