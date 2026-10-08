import { activeProfile } from '../../../config/index.js'
import { accommodationTrack } from '../../../modules/room-assignment/app/accommodation-track.js'
import { WorkflowStepper } from '../../components/shared/ui/workflow-stepper.js'
import { useOrganiser } from '../context.js'
import { AreaClosingActions } from './area-closing.js'

export function AccommodationWorkflow({ actions = false }: { actions?: boolean }) {
  const { phases, state } = useOrganiser()
  return (
    <WorkflowStepper
      aria_label="Ablauf der Unterbringung"
      storage_key={actions ? "accommodation.inventory.phase.expanded" : "accommodation.assignment.phase.expanded"}
      storage_user={state.principal_email}
      steps={accommodationTrack({ phases: phases ?? [], meta: activeProfile.meta })}
      next_action={actions ? <AreaClosingActions area="accommodation" /> : undefined}
    />
  )
}
