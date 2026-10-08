import { activeProfile } from '../../../config/index.js'
import { accommodationTrack } from '../../../modules/room-assignment/app/accommodation-track.js'
import { WorkflowStepper } from '../../components/shared/ui/workflow-stepper.js'
import { useOrganiser } from '../context.js'
import { AreaClosingActions } from './area-closing.js'

export function AccommodationWorkflow({ actions = false }: { actions?: boolean }) {
  const { phases } = useOrganiser()
  return (
    <WorkflowStepper
      aria_label="Ablauf der Unterbringung"
      steps={accommodationTrack({ phases: phases ?? [], meta: activeProfile.meta })}
      next_action={actions ? <AreaClosingActions area="accommodation" /> : undefined}
    />
  )
}
