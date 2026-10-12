import { Button } from '../components/shared/ui/button.js'
import { ErrorState } from '../components/shared/ui/screen-state.js'

export function OrganiserDerivationError({
  has_drafts: hasDrafts,
  message,
  onDiscard,
  onReload,
}: {
  has_drafts: boolean
  message: string
  onDiscard: () => void
  onReload: () => void
}) {
  return (
    <ErrorState title="Die Planung konnte nicht berechnet werden">
      {message}
      <Button variant="neutral" className="mt-4" onClick={hasDrafts ? onDiscard : onReload}>
        {hasDrafts ? 'Änderungsentwürfe verwerfen' : 'Neu laden'}
      </Button>
    </ErrorState>
  )
}
