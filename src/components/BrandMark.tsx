// Logo "gerbang hitung": empat garis tally + diagonal kuning (hitungan ke-5).
// Geometri sama dengan scripts/make-icons.mjs.
export function BrandMark({ className = 'size-10' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#17191b" />
      <g fill="none" strokeLinecap="round">
        <path
          d="M139 158V354M217 158V354M295 158V354M373 158V354"
          stroke="#edebe4"
          strokeWidth="44"
        />
        <path d="M96 372L416 140" stroke="#17191b" strokeWidth="74" />
        <path d="M96 372L416 140" stroke="#f2b705" strokeWidth="46" />
      </g>
    </svg>
  );
}
