import type { CSSProperties } from "react";

export type GlyphName = "mountain" | "plane" | "arrow" | "monitor" | "dispatch" | "cabin" | "operations" | "copilot" | "journal" | "compass" | "check";
const shapes: Record<GlyphName, React.ReactNode> = {
  mountain: <><path d="M2 20 11 9l3 4L22 3l16 17-12-7 3 7-8-7-7 6 1-5-5 3Z" fill="currentColor" stroke="none" /></>,
  plane: <path d="m12 2 2 8 8 5v2l-8-2v5l3 2v1l-5-1-5 1v-1l3-2v-5l-8 2v-2l8-5Z" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  monitor: <><rect x="3" y="4" width="18" height="13" rx="2" /><path d="M8 21h8m-4-4v4M6 12h3l2-5 3 8 2-3h2" /></>,
  dispatch: <><path d="M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h5" /></>,
  cabin: <><circle cx="8" cy="7" r="3" /><circle cx="17" cy="8" r="2.5" /><path d="M2 21v-4a6 6 0 0 1 12 0v4m2-8a5 5 0 0 1 6 5v3" /></>,
  operations: <><path d="M3 21V12h4v9m3 0V6h4v15m3 0V3h4v18" /></>,
  copilot: <><path d="M3 14v-2a9 9 0 0 1 18 0v2M7 12H3v7h4Zm10 0h4v7h-4Zm4 7c0 3-5 3-7 3" /><path d="m9 13 2-2 2 5 2-3" /></>,
  journal: <><rect x="5" y="3" width="15" height="18" rx="2" /><path d="M8 7h8m-8 4h8m-8 4h5M2 7h3m-3 5h3m-3 5h3" /></>,
  compass: <><circle cx="12" cy="12" r="10" /><path d="m16 7-3 6-6 3 3-6Z" /></>,
  check: <path d="m5 12 4 4L19 6" />,
};
export function Glyph({ name, size = 24, style, className }: { name: GlyphName; size?: number; style?: CSSProperties; className?: string }) {
  return <svg width={name === "mountain" ? size * 1.65 : size} height={size} viewBox={name === "mountain" ? "0 0 40 24" : "0 0 24 24"} fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style} className={className}>{shapes[name]}</svg>;
}

