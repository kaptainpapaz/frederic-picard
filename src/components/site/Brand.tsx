/** Monogramme FP dans un cadre 16:9 à repères de visée. Proposition d'atelier, à valider par Fred. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 26" aria-hidden="true" className={className}>
      <rect x="1" y="1" width="42" height="24" fill="none" stroke="currentColor" strokeWidth="1" />
      <path d="M1 7V1h6M37 1h6v6M43 19v6h-6M7 25H1v-6" fill="none" stroke="currentColor" strokeWidth="2" />
      <text x="22" y="18" textAnchor="middle" fontFamily="var(--font-display)" fontStyle="italic" fontSize="15" fill="currentColor">
        FP
      </text>
    </svg>
  )
}
