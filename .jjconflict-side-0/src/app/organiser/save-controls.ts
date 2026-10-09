import { useState } from 'react'
import { useOrganiser } from './context.js'
import { draftCount, saveStatusView } from './state.js'

type ConfirmStep = 'discard' | 'leave-draft' | null

/** One command and confirmation adapter over the existing organiser state owner. */
export function useSaveControls() {
  const { state, dispatch, apply } = useOrganiser()
  const [confirm, setConfirm] = useState<ConfirmStep>(null)
  const [announcement, setAnnouncement] = useState('')
  const view = saveStatusView(state)
  const count = draftCount(state)
  const saving = state.status === 'applying'
  const drafting = state.change_mode === 'drafting'
  function handleSwitchChange(checked: boolean) {
    if (checked === drafting) return
    if (checked) {
      dispatch({ type: 'toggle_drafting' })
      setAnnouncement('Entwurfsmodus eingeschaltet.')
      return
    }
    if (count === 0) {
      dispatch({ type: 'toggle_drafting' })
      setAnnouncement('Entwurfsmodus ausgeschaltet. Änderungen werden sofort gespeichert.')
      return
    }
    setConfirm('leave-draft')
  }

  function handleDiscard() {
    dispatch({ type: 'discard' })
    setAnnouncement('Änderungen verworfen.')
    setConfirm(null)
  }

  function handleDiscardAndLeaveDraftMode() {
    dispatch({ type: 'discard' })
    setAnnouncement('Änderungen verworfen, Entwurfsmodus ausgeschaltet.')
    setConfirm(null)
  }

  function handleSave() {
    setConfirm(null)
    void apply()
  }
  return {
    state,
    view,
    count,
    saving,
    drafting,
    confirm,
    set_confirm: setConfirm,
    announcement,
    switch_mode: handleSwitchChange,
    discard: handleDiscard,
    discard_and_leave: handleDiscardAndLeaveDraftMode,
    save: handleSave,
  }
}
