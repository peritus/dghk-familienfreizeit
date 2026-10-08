import { useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { Switch } from '@base-ui/react/switch'
import { Check, ChevronDown, Pencil, TriangleAlert } from 'lucide-react'
import { useSaveControls } from './save-controls.js'
import { changeCountLabel, pluralDe } from '../lib/plural-de.js'
import { Button } from '../components/shared/ui/button'
import { cn } from '../lib/utils.js'

/**
 * A single persistent status control replacing the old cloud-icon toggle and
 * inline expanding panel. See spec/ui/design-system.md#save-status-pattern
 * and spec/ui/screens/organiser-dashboard.md for the button and popover
 * contract. State comes straight from the existing organiser reducer
 * (state.ts) -- this is a presentation layer, not a new state machine.
 *
 * Two deliberate departures from the source design, both because the
 * underlying reducer (organiser-state.test.ts) already has tested, binding
 * semantics that this component doesn't change:
 * - Saving or discarding every pending draft always exits drafting mode
 *   back to immediate/"Gespeichert" (the reducer's `applied` and `discard`
 *   cases both force `change_mode: 'immediate'` once no drafts remain).
 *   There is no "back to an empty, still-drafting state" transition.
 * - There is no offline state yet: `OrganiserStatus` has no case for a lost
 *   connection, so the fourth look from the design spec has no trigger here.
 */
export function SaveStatus() {
  const {
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
  } = useSaveControls()
  const [open, setOpen] = useState(false)
  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setConfirm(null)
  }

  const ariaLabel = (() => {
    switch (view.kind) {
      case 'saved':
        return 'Alles gespeichert. Speicheroptionen anzeigen'
      case 'draft-empty':
        return 'Entwurfsmodus aktiv, keine Entwürfe. Details anzeigen'
      case 'draft-pending':
        return `Entwurfsmodus: ${changeCountLabel(view.count)} nicht gespeichert. Details anzeigen`
      case 'failed':
        return 'Speichern fehlgeschlagen. Details anzeigen'
    }
  })()

  const Icon = view.kind === 'failed' ? TriangleAlert : view.kind === 'saved' ? Check : Pencil

  const draftModeSwitch = (
    <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-border pt-4">
      <div>
        <p id="draft-mode-switch-label" className="font-bold">
          Entwurfsmodus
        </p>
        <p id="draft-mode-switch-description" className="text-sm text-muted">
          Änderungen erst in diesem Browser sammeln und später gemeinsam speichern.
        </p>
      </div>
      <Switch.Root
        checked={drafting}
        onCheckedChange={handleSwitchChange}
        aria-labelledby="draft-mode-switch-label"
        aria-describedby="draft-mode-switch-description"
        className="h-8 w-14 shrink-0 rounded-full border-2 border-border bg-secondary-background data-[checked]:bg-main"
      >
        <Switch.Thumb className="block size-6 translate-x-0 rounded-full border-2 border-border bg-secondary-background transition-transform data-[checked]:translate-x-6" />
      </Switch.Root>
    </div>
  )

  const discardLink = (
    <button type="button" className="font-bold underline" onClick={() => setConfirm('discard')}>
      Verwerfen …
    </button>
  )

  function renderContent() {
    if (confirm === 'discard') {
      return (
        <div className="space-y-4">
          <div>
            <Popover.Title className="text-xl font-heading">
              {changeCountLabel(count)} verwerfen?
            </Popover.Title>
            <p className="mt-1 text-sm text-muted">
              Sie werden aus diesem Browser gelöscht. Das lässt sich nicht rückgängig machen.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="neutral" autoFocus onClick={() => setConfirm(null)}>
              Behalten
            </Button>
            <Button variant="danger" onClick={handleDiscard}>
              Ja, verwerfen
            </Button>
          </div>
        </div>
      )
    }

    if (confirm === 'leave-draft') {
      return (
        <div className="space-y-4">
          <div>
            <Popover.Title className="text-xl font-heading">Entwurfsmodus beenden?</Popover.Title>
            <p className="mt-1 text-sm text-muted">
              Du hast {changeCountLabel(count)}, die noch nicht{' '}
              {pluralDe(count, 'gespeichert ist', 'gespeichert sind')}. Danach wird wieder jede
              Änderung sofort gespeichert.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="neutral" autoFocus onClick={() => setConfirm(null)}>
              Abbrechen
            </Button>
            <Button variant="danger" onClick={handleDiscardAndLeaveDraftMode}>
              Verwerfen und beenden
            </Button>
            <Button disabled={saving} onClick={handleSave}>
              {saving ? 'Wird gespeichert …' : 'Speichern und beenden'}
            </Button>
          </div>
        </div>
      )
    }

    switch (view.kind) {
      case 'saved':
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-2">
              <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div>
                <Popover.Title className="text-xl font-heading">Alles gespeichert</Popover.Title>
                <p className="mt-1 text-sm text-muted">
                  Jede Änderung wird sofort für das ganze Team gespeichert.
                </p>
              </div>
            </div>
            {draftModeSwitch}
          </div>
        )
      case 'draft-empty':
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-2">
              <Pencil aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div>
                <Popover.Title className="text-xl font-heading">Noch keine Entwürfe</Popover.Title>
                <p className="mt-1 text-sm text-muted">
                  Neue Änderungen bleiben in diesem Browser, bis du sie speicherst.
                </p>
              </div>
            </div>
            {draftModeSwitch}
          </div>
        )
      case 'draft-pending':
        return (
          <div className="space-y-5">
            <div>
              <Popover.Title className="text-xl font-heading">
                {changeCountLabel(view.count)} nur in diesem Browser
              </Popover.Title>
              <p className="mt-1 text-sm text-muted">
                Andere im Team sehen sie erst, wenn du sie speicherst. In anderen Browsern oder auf
                anderen Geräten sind sie nicht da.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {discardLink}
              <Button disabled={saving} onClick={handleSave}>
                {saving ? 'Wird gespeichert …' : 'Änderungen speichern'}
              </Button>
            </div>
            {draftModeSwitch}
          </div>
        )
      case 'failed':
        return (
          <div className="space-y-5">
            <div className="flex items-start gap-2">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div>
                <Popover.Title className="text-xl font-heading">
                  Speichern fehlgeschlagen
                </Popover.Title>
                <p className="mt-1 text-sm text-muted">{state.error}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              {discardLink}
              <Button disabled={saving} onClick={handleSave}>
                {saving ? 'Wird gespeichert …' : 'Erneut versuchen'}
              </Button>
            </div>
          </div>
        )
    }
  }

  return (
    <>
      <Popover.Root open={open} onOpenChange={handleOpenChange}>
        <Popover.Trigger
          render={
            <Button
              variant="neutral"
              aria-label={ariaLabel}
              className={cn(
                'draft-status-control gap-2 px-3',
                view.kind === 'draft-empty' && 'blueprint',
                view.kind === 'draft-pending' && 'bg-main blueprint blueprint-on-main',
                view.kind === 'failed' && 'bg-danger',
              )}
            />
          }
        >
          <Icon aria-hidden="true" className="size-5" />
          <span className="pointer-events-none">
            {view.kind === 'saved' && 'Gespeichert'}
            {view.kind === 'draft-empty' && 'Entwurfsmodus'}
            {view.kind === 'draft-pending' && (
              <span className="hidden sm:inline">Nicht gespeichert</span>
            )}
            {view.kind === 'failed' && (
              <>
                <span className="hidden sm:inline">Speichern fehlgeschlagen</span>
                <span className="sm:hidden">Fehler</span>
              </>
            )}
          </span>
          {view.kind === 'draft-pending' ? (
            <span
              aria-hidden="true"
              className="pointer-events-none flex size-6 items-center justify-center rounded-full bg-foreground text-sm text-background"
            >
              {view.count}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={cn('size-4 transition-transform', open && 'rotate-180')}
          />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" align="end" sideOffset={12}>
            <Popover.Popup className="draft-status-surface w-[min(26rem,calc(100vw-2rem))] rounded-base border-2 border-border bg-paper p-5 shadow-shadow">
              {renderContent()}
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </>
  )
}
