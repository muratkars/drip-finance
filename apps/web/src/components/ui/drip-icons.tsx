"use client";

import { cn } from "@/lib/utils";

interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const strokeProps = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function DripIcon({ name, size = 18, className, style }: IconProps) {
  const s = { width: size, height: size, ...style };

  switch (name) {
    case "grid": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></g></svg>;
    case "building": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M4 21V6l8-3 8 3v15"/><path d="M9 21V12h6v9"/><path d="M4 21h16"/></g></svg>;
    case "arrows": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M7 7h13l-3-3"/><path d="M17 17H4l3 3"/></g></svg>;
    case "calendar": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></g></svg>;
    case "target": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></g></svg>;
    case "bar": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-8"/><path d="M22 20H2"/></g></svg>;
    case "settings": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1c0 .7.4 1.3 1 1.5a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1c.2.6.8 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></g></svg>;
    case "signout": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></g></svg>;
    case "plus": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M12 5v14M5 12h14"/></g></svg>;
    case "upload": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/></g></svg>;
    case "trash": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></g></svg>;
    case "chevron-down": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M6 9l6 6 6-6"/></g></svg>;
    case "chevron-right": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M9 6l6 6-6 6"/></g></svg>;
    case "check": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M5 12l5 5L20 7"/></g></svg>;
    case "x": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M6 6l12 12M18 6L6 18"/></g></svg>;
    case "up": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M7 17L17 7"/><path d="M8 7h9v9"/></g></svg>;
    case "down": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M17 7L7 17"/><path d="M16 17H7V8"/></g></svg>;
    case "spark": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6z"/></g></svg>;
    case "wallet": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3"/><path d="M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2z"/><circle cx="17" cy="13" r="1" fill="currentColor"/></g></svg>;
    case "card": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/></g></svg>;
    case "piggy": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M19 10c1.5 0 2 1 2 2s-.5 2-2 2"/><path d="M17 5l-1 2"/><path d="M12 5a7 7 0 0 0-7 7c0 2 1 4 2 5v3h3v-2h4v2h3v-3c1-1 2-3 2-5a7 7 0 0 0-7-7z"/><circle cx="9" cy="11" r=".8" fill="currentColor"/></g></svg>;
    case "trendup": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></g></svg>;
    case "trenddown": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M3 7l6 6 4-4 8 8"/><path d="M14 17h7v-7"/></g></svg>;
    case "banknote": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v.01M18 14v.01"/></g></svg>;
    case "receipt": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M8 8h8M8 12h8M8 16h5"/></g></svg>;
    case "repeat": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></g></svg>;
    case "home": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M3 11l9-8 9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></g></svg>;
    case "basket": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M3 8h18l-2 12H5z"/><path d="M8 8l3-5M16 8l-3-5"/></g></svg>;
    case "fork": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M8 3v8a2 2 0 1 0 4 0V3"/><path d="M10 11v10"/><path d="M17 3c-2 2-2 6 0 8v10"/></g></svg>;
    case "car": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M4 16V12l2-5h12l2 5v4"/><rect x="2" y="16" width="20" height="4" rx="1"/><circle cx="7" cy="20" r="1.5" fill="currentColor"/><circle cx="17" cy="20" r="1.5" fill="currentColor"/></g></svg>;
    case "bolt": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></g></svg>;
    case "heart": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M12 21s-8-5-8-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-8 11-8 11z" fill="none"/></g></svg>;
    case "bag": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M5 8h14l-1 13H6z"/><path d="M9 8a3 3 0 0 1 6 0"/></g></svg>;
    case "play": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><circle cx="12" cy="12" r="9"/><path d="M10 9l5 3-5 3z"/></g></svg>;
    case "arrow-in": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M12 5v14"/><path d="M6 13l6 6 6-6"/></g></svg>;
    case "filter": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><path d="M3 5h18l-7 9v5l-4 2v-7z"/></g></svg>;
    case "search": return <svg style={s} className={className} viewBox="0 0 24 24"><g {...strokeProps}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></g></svg>;
    default: return null;
  }
}

export function Drop({ size = 18, className, filled = true }: { size?: number; className?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path
        d="M12 3.5 C12 3.5, 5 11, 5 15.5 A7 7 0 0 0 19 15.5 C19 11, 12 3.5, 12 3.5 Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={filled ? 0 : 1.6}
        strokeLinejoin="round"
      />
    </svg>
  );
}
