import type { ReactNode } from 'react'
import { OrganiserScreenHeader } from '../../../../../app/organiser/components/layout.js'

export function ScreenFrame({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="space-y-8 pb-24">
      <OrganiserScreenHeader title={title} actions={actions} />
      {eyebrow || description ? (
        <p className="-mt-6 text-muted">{[eyebrow, description].filter(Boolean).join(' · ')}</p>
      ) : null}
      {children}
    </div>
  )
}
