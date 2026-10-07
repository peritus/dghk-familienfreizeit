import { PrintFooter } from '../../components/shared/ui/print-layout.js'
import { LoadingState } from '../../components/shared/ui/screen-state.js'
import { useMemo } from 'react'
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
      print_orientation="landscape"
      secondary_navigation={<WorkshopNavigation />}
      header={<ScreenHeader eyebrow="Workshops" title="Teilnahme" />}
      tertiary_navigation={<WorkshopParticipationNavigation />}
      footer={
        <PrintFooter
          className="workshop-participation__print-stamp"
          confidentiality="Vertraulich: Nur für das Organisationsteam."
          time_zone={activeProfile.meta.timezone}
          revision={state.head_seq}
          drafts={draftCount(state)}
        />
      }
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
