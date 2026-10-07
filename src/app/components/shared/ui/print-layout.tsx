import { useId, type ReactNode, type Ref } from 'react'
import { cn } from '../../../lib/utils.js'
export function PrintDocument({
  title,
  metadata,
  print_note: printNote,
  heading_ref: headingRef,
  children,
}: {
  title: string
  metadata: readonly ReactNode[]
  /** Shown only on paper, under the metadata (for example a confidentiality line). */
  print_note?: ReactNode
  /** Receives focus after previous/next so keyboard users land on the new document. */
  heading_ref?: Ref<HTMLHeadingElement>
  children: ReactNode
}) {
  const titleId = useId()
  return (
    <article className="workshop-print-document" aria-labelledby={titleId}>
      <h2
        id={titleId}
        ref={headingRef}
        tabIndex={-1}
        className="workshop-print-title text-2xl leading-tight font-heading focus:outline-3 focus:outline-offset-4 focus:outline-border"
      >
        {title}
      </h2>
      {metadata.map((item, index) => (
        <p
          key={index}
          className={cn(
            'workshop-print-meta mt-1',
            index === metadata.length - 1 && 'workshop-print-meta--last',
          )}
        >
          {item}
        </p>
      ))}
      {printNote ? <p className="workshop-print-note hidden">{printNote}</p> : null}
      <div className="mt-3">{children}</div>
    </article>
  )
}
