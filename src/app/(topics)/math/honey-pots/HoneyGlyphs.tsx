/** Vector drawings remain sharp at every board size; labels live in the HTML controls. */
export function PotGlyph() {
  return <svg viewBox="0 0 48 54" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <ellipse cx="24" cy="8" rx="13" ry="4" fill="var(--color-dough)" />
    <path d="M11 9v7c-5 4-7 10-7 17 0 13 7 17 20 17s20-4 20-17c0-7-2-13-7-17V9" fill="var(--color-dough)" />
    <path d="M11 16c6 4 20 4 26 0M10 26c-2 4-2 9-1 12" opacity=".45" />
  </svg>;
}

export function AntGlyph({ dead = false }: { dead?: boolean }) {
  return <svg viewBox="0 0 48 36" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <ellipse cx="34" cy="19" rx="8" ry="6" fill="currentColor" fillOpacity=".12" />
    <circle cx="22" cy="18" r="4" /><circle cx="12" cy="16" r="5" />
    <path d="m9 11-3-5m8 5 3-5M21 14l-3-6m7 7 3-7M20 21l-5 9m10-9 5 9M29 22l8 7M27 14l9-6" />
    {dead ? <path d="m10 14 4 4m0-4-4 4" /> : <circle cx="10" cy="15" r=".9" fill="currentColor" />}
  </svg>;
}
