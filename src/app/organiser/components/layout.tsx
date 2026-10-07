import type { ReactNode } from 'react'
import { ScreenHeader, SectionHeader } from '../../components/shared/ui/screen-layout.js'

export function OrganiserScreenHeader({
  actions,
  ...props
}: {
  title: string
  actions?: ReactNode
  className?: string
}) {
  return <ScreenHeader {...props} action={actions} />
}

export function OrganiserSectionHeader({
  detail,
  ...props
}: {
  title: string
  detail?: string
  action?: ReactNode
}) {
  return <SectionHeader {...props} description={detail} />
}
