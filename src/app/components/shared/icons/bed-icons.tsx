import type { SVGProps } from 'react'

/**
 * Three custom bed glyphs (Q7): lucide has no bunk-bed icon, and a
 * consistent top-view-vs-side-view mix was accepted as a deliberate
 * compromise so all three read clearly at a small size.
 */

export function SingleBedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="9" y="2" width="14" height="20" rx="2" />
      <line x1="12" y1="7" x2="20" y2="7" />
    </svg>
  )
}

export function DoubleBedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="28" height="20" rx="2" />
      <line x1="6" y1="7" x2="13" y2="7" />
      <line x1="19" y1="7" x2="26" y2="7" />
    </svg>
  )
}

export function BunkBedIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <line x1="4" y1="2" x2="4" y2="22" />
      <line x1="28" y1="2" x2="28" y2="22" />
      <line x1="4" y1="4" x2="28" y2="4" />
      <line x1="7" y1="4" x2="11" y2="4" strokeWidth="3" />
      <line x1="4" y1="13" x2="28" y2="13" />
      <line x1="7" y1="13" x2="11" y2="13" strokeWidth="3" />
      <line x1="4" y1="22" x2="28" y2="22" />
    </svg>
  )
}

/**
 * A single stable component that switches internally, rather than handing
 * callers a dynamically-selected component reference (which resets state
 * on every render if assigned to a local variable and used as a JSX tag).
 */
export function BedIcon({
  bed_type: bedType,
  ...props
}: { bed_type: string } & SVGProps<SVGSVGElement>) {
  if (bedType === 'double') return <DoubleBedIcon {...props} />
  if (bedType === 'bunk') return <BunkBedIcon {...props} />
  return <SingleBedIcon {...props} />
}
