import { useId, type ReactNode } from 'react'
import { cn } from '../../../lib/utils.js'

export type ScreenHeaderProps = {
  title: ReactNode
  eyebrow?: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function ScreenHeader({
  title,
  eyebrow,
  description,
  action,
  className,
}: ScreenHeaderProps) {
  return (
    <header
      data-slot="screen-header"
      className={cn(
        'flex flex-wrap items-end justify-between gap-4 border-b-2 border-border pb-5',
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-sm font-bold uppercase tracking-wide text-muted">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl leading-tight font-heading sm:text-4xl">{title}</h1>
        {description ? <div className="mt-2 max-w-3xl text-muted">{description}</div> : null}
      </div>
      {action ? (
        <div data-slot="screen-actions" className="ml-auto flex flex-wrap gap-2 print:hidden">
          {action}
        </div>
      ) : null}
    </header>
  )
}

/** Screen-wide context stays mounted above local views; collection content follows them. */
export function ScreenLayout({
  header,
  secondary_navigation: secondaryNavigation,
  notices,
  workflow,
  summary,
  tertiary_navigation: tertiaryNavigation,
  footer,
  children,
  className,
}: {
  header: ReactNode
  secondary_navigation?: ReactNode
  notices?: ReactNode
  workflow?: ReactNode
  summary?: ReactNode
  tertiary_navigation?: ReactNode
  footer?: ReactNode
  children?: ReactNode
  className?: string
}) {
  return (
    <div data-slot="screen-layout" className={cn('w-full min-w-0 space-y-8', className)}>
      {secondaryNavigation ? (
        <div data-slot="screen-secondary-navigation" className="print:hidden">
          {secondaryNavigation}
        </div>
      ) : null}
      {header}
      {notices ? (
        <div data-slot="screen-notices" className="empty:hidden">
          {notices}
        </div>
      ) : null}
      {workflow ? (
        <div data-slot="screen-workflow" className="space-y-4 empty:hidden">
          {workflow}
        </div>
      ) : null}
      {summary ? (
        <div data-slot="screen-summary" className="empty:hidden">
          {summary}
        </div>
      ) : null}
      {tertiaryNavigation ? (
        <div data-slot="screen-tertiary-navigation" className="print:hidden">
          {tertiaryNavigation}
        </div>
      ) : null}
      {children ? (
        <div data-slot="screen-content" className="min-w-0 space-y-6">
          {children}
        </div>
      ) : null}
      {footer ? <div data-slot="screen-footer">{footer}</div> : null}
    </div>
  )
}

export type SectionHeaderProps = {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  heading_level?: 2 | 3 | 4
  id?: string
  className?: string
}

export function SectionHeader({
  title,
  description,
  action,
  heading_level: headingLevel = 2,
  id,
  className,
}: SectionHeaderProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4'
  return (
    <div
      data-slot="section-header"
      className={cn('flex flex-wrap items-end justify-between gap-3', className)}
    >
      <div className="min-w-0">
        <Heading
          id={id}
          className={cn('font-heading', headingLevel === 2 ? 'text-2xl' : 'text-xl')}
        >
          {title}
        </Heading>
        {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
      </div>
      {action ? (
        <div data-slot="collection-actions" className="ml-auto flex flex-wrap gap-2 print:hidden">
          {action}
        </div>
      ) : null}
    </div>
  )
}

export function CollectionSection({
  title,
  description,
  action,
  heading_level: headingLevel,
  controls,
  children,
  className,
  id,
}: SectionHeaderProps & { controls?: ReactNode; children: ReactNode }) {
  const generatedId = useId()
  const headingId = id ?? `collection-${generatedId}`
  return (
    <section
      data-slot="collection-section"
      aria-labelledby={headingId}
      className={cn('min-w-0 space-y-4', className)}
    >
      <SectionHeader
        id={headingId}
        title={title}
        description={description}
        action={action}
        heading_level={headingLevel}
      />
      {controls ? (
        <div data-slot="collection-controls" className="print:hidden">
          {controls}
        </div>
      ) : null}
      {children}
    </section>
  )
}
