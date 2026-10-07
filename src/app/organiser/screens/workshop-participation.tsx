import { LoadingState } from '../../components/shared/ui/screen-state.js'
import { useEffect, useMemo, useState } from 'react'
import { activeProfile } from '../../../config/index.js'
import { buildWorkshopAllocationProjection } from '../../../modules/workshop-rankings/app/workshop-allocation-view.js'
import { WorkshopParticipation } from '../../../modules/workshop-rankings/app/components/workshop-participation.js'
import { useDocumentTitle } from '../../lib/use-document-title.js'
import { ScreenHeader, ScreenLayout } from '../../components/shared/ui/screen-layout.js'
import { WorkshopNavigation, WorkshopParticipationNavigation } from './workshops.js'
import { useOrganiser } from '../context.js'
import { draftCount } from '../state.js'

function rankingLimit(): number {
  const module = activeProfile.modules.find((item) => item.id === 'workshop-rankings')
  return typeof module?.parameters?.max_rank === 'number' ? module.parameters.max_rank : 3
}

function printStamp(date: Date, revision: number, drafts: number): string {
  const day = date.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
  return `Stand ${day}, ${time} Uhr · v${revision}${drafts ? ' · mit ungespeicherten Änderungen' : ''}`
}

function ParticipationPrintStamp({ revision, drafts }: { revision: number; drafts: number }) {
  const [printedAt, setPrintedAt] = useState(() => new Date())
  useEffect(() => {
    const refresh = () => setPrintedAt(new Date())
    window.addEventListener('beforeprint', refresh)
    return () => window.removeEventListener('beforeprint', refresh)
  }, [])

  return (
    <footer className="workshop-participation__print-stamp">
      {printStamp(printedAt, revision, drafts)}
    </footer>
  )
}

export function WorkshopParticipationScreen() {
  useDocumentTitle('Teilnahme · Workshops · Familienfreizeit')
  const { state, world, current_plan: currentPlan } = useOrganiser()
  const projection = useMemo(
    () =>
      world && currentPlan
        ? buildWorkshopAllocationProjection({
            world,
            plan: currentPlan,
            event_date: activeProfile.meta.starts_on,
            time_zone: activeProfile.meta.timezone,
            max_rank: rankingLimit(),
          })
        : null,
    [currentPlan, world],
  )

  if (!world || !projection)
    return (
      <ScreenLayout
        secondary_navigation={<WorkshopNavigation />}
        header={<ScreenHeader title="Teilnahme" />}
      >
        <LoadingState />
      </ScreenLayout>
    )

  return (
    <ScreenLayout
      className="workshop-participation-page"
      secondary_navigation={<WorkshopNavigation />}
      header={<ScreenHeader eyebrow="Workshops" title="Teilnahme" />}
      tertiary_navigation={<WorkshopParticipationNavigation />}
      footer={<ParticipationPrintStamp revision={state.head_seq} drafts={draftCount(state)} />}
    >
      <div className="workshop-participation-body mt-6 mb-10">
        <WorkshopParticipation
          participation={projection.participation}
          max_rank={projection.max_rank}
        />
      </div>
    </ScreenLayout>
  )
}
