import { activeProfile } from '../../../config/index.js'
import { accommodationTrack } from '../../../modules/room-assignment/app/accommodation-track.js'
import { WorkflowStepper } from '../../components/shared/ui/workflow-stepper.js'
import { useOrganiser } from '../context.js'
import { AreaClosingActions } from './area-closing.js'

export function AccommodationWorkflow() {
  const { phases } = useOrganiser()
  return (
    <WorkflowStepper
      aria_label="Ablauf der Unterbringung"
      steps={accommodationTrack({ phases: phases ?? [], meta: activeProfile.meta })}
      next_action={<AreaClosingActions area="accommodation" />}
    />
  )
}
