import { useEffect, useId, useRef, useState, type ReactNode, type Ref } from 'react'
import { flushSync } from 'react-dom'
import { cn } from '../../../lib/utils.js'
/** Read the same footer metadata the DOM exposes; a specialised screen footer wins. */
function setPaperMarginFooter(element: HTMLElement | null): (() => void) | undefined {
  if (!element) return
  const frame = element.closest('[data-slot="application-frame"]')
  const specialised = frame?.querySelector('main [data-slot="print-footer"]')
  if (specialised && specialised !== element) return
  const text = Array.from(element.childNodes)
    .map(
      (node) =>
        `${node instanceof HTMLElement && node.tagName === 'P' ? '\n' : ''}${node.textContent ?? ''}`,
    )
    .join('')
  const value = JSON.stringify(text).replace(/\\n/g, '\\a ')
  const root = document.documentElement
  root.style.setProperty('--print-footer-text', value)
  return () => {
    if (root.style.getPropertyValue('--print-footer-text') === value)
      root.style.removeProperty('--print-footer-text')
  }
}

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
    <article className="print-document" aria-labelledby={titleId}>
      <h2
        id={titleId}
        ref={headingRef}
        tabIndex={-1}
        className="print-title text-2xl leading-tight font-heading focus:outline-3 focus:outline-offset-4 focus:outline-border"
      >
        {title}
      </h2>
      {metadata.map((item, index) => (
        <p
          key={index}
          className={cn('print-meta mt-1', index === metadata.length - 1 && 'print-meta--last')}
        >
          {item}
        </p>
      ))}
      {printNote ? <p className="print-note hidden">{printNote}</p> : null}
      <div className="mt-3">{children}</div>
    </article>
  )
}

export type PrintFooterProps = {
  revision?: number
  drafts?: number
  closed_at?: string | null
  confidentiality?: string
  context?: string
  generated_at?: Date
  time_zone?: string
  className?: string
  screen_visible?: boolean
}

/** A single timestamp and data-status contract for browser printing. */
export function PrintFooter({
  revision,
  drafts = 0,
  closed_at: closedAt,
  confidentiality,
  context,
  generated_at: generatedAt,
  time_zone: timeZone = 'Europe/Berlin',
  className,
  screen_visible: screenVisible = false,
}: PrintFooterProps) {
  const footerElement = useRef<HTMLElement>(null)
  const [printedAt, setPrintedAt] = useState(() => generatedAt ?? new Date())
  useEffect(() => {
    const refresh = () => {
      flushSync(() => setPrintedAt(generatedAt ?? new Date()))
      setPaperMarginFooter(footerElement.current)
    }
    window.addEventListener('beforeprint', refresh)
    return () => window.removeEventListener('beforeprint', refresh)
  }, [generatedAt])
  const format = (date: Date) =>
    new Intl.DateTimeFormat('de-DE', {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      timeZone,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      dateStyle: 'long',
      // eslint-disable-next-line @typescript-eslint/naming-convention
      timeStyle: 'short',
    }).format(date)
  useEffect(
    () => setPaperMarginFooter(footerElement.current),
    [printedAt, revision, drafts, closedAt, context, confidentiality, timeZone],
  )
  return (
    <footer
      ref={footerElement}
      data-slot="print-footer"
      className={cn(
        'border-t border-border pt-2 text-xs text-muted tabular-nums',
        !screenVisible && 'hidden print:block',
        className,
      )}
    >
      {context ? <span>{context} · </span> : null}
      {closedAt ? <span>Festgelegt am {format(new Date(closedAt))} Uhr · </span> : null}
      Stand {format(printedAt)} Uhr
      {revision !== undefined ? <span> · Datenstand v{revision}</span> : null}
      {drafts > 0 ? <strong> · mit ungespeicherten Änderungen</strong> : null}
      {confidentiality ? <p>{confidentiality}</p> : null}
    </footer>
  )
}
