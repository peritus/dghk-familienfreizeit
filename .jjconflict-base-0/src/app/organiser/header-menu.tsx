import { useEffect, useId, useState } from 'react'
import { Check, LoaderCircle, Pencil, SlidersHorizontal, X } from 'lucide-react'
import { useSaveControls } from './save-controls.js'
import { activeProfile } from '../../config/index.js'
import { changeCountLabel, pluralDe } from '../lib/plural-de.js'
import { cn } from '../lib/utils.js'
import { Button } from '../components/shared/ui/button.js'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '../components/shared/ui/dialog.js'

/** Compact shell presentation; all state and commands use the organiser pipeline. */
export function HeaderMenu({
  on_logout: onLogout,
  logging_out: loggingOut = false,
}: {
  on_logout: () => void | Promise<void>
  logging_out?: boolean
}) {
  const controls = useSaveControls()
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
  } = controls
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const wide = window.matchMedia('(min-width: 48rem)')
    const closeOnWideScreen = () => {
      if (wide.matches) {
        setOpen(false)
        setConfirm(null)
      }
    }
    wide.addEventListener('change', closeOnWideScreen)
    return () => wide.removeEventListener('change', closeOnWideScreen)
  }, [setConfirm])
  const modeName = useId()
  const kind = saving ? 'saving' : view.kind
  const pending = `${count} ungespeicherte ${pluralDe(count, 'Änderung', 'Änderungen')}`
  const status =
    kind === 'saving'
      ? 'Wird gespeichert …'
      : kind === 'failed'
        ? 'Nicht gespeichert'
        : kind === 'draft-pending'
          ? `Entwurf · ${pending}`
          : kind === 'draft-empty'
            ? 'Entwurfsmodus · nichts offen'
            : 'Alles gespeichert'
  const ariaStatus = kind === 'draft-pending' ? pending : status.toLocaleLowerCase('de-DE')
  const savedAt = state.last_saved_at ? new Date(state.last_saved_at) : null
  const savedTime =
    savedAt && Number.isFinite(savedAt.getTime())
      ? new Intl.DateTimeFormat('de-DE', {
          // Intl option names are fixed by its API.
          // eslint-disable-next-line @typescript-eslint/naming-convention
          dateStyle: 'short',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          timeStyle: 'short',
          // eslint-disable-next-line @typescript-eslint/naming-convention
          timeZone: activeProfile.meta.timezone,
        }).format(savedAt)
      : null
  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setConfirm(null)
        }}
      >
        <div className="flex shrink-0 items-center gap-2">
          {kind === 'draft-pending' || kind === 'failed' ? (
            <Button size="sm" disabled={saving} onClick={handleSave}>
              {kind === 'failed' ? 'Wiederholen' : 'Speichern'}
            </Button>
          ) : null}
          <DialogTrigger
            aria-label={`Menü (Speichern, Abmelden) – ${ariaStatus}`}
            className={cn(
              'header-menu-pill inline-flex h-10 shrink-0 overflow-hidden rounded-full border-2 border-border bg-secondary-background text-sm font-bold shadow-sm',
              (kind === 'draft-empty' || kind === 'draft-pending') && 'border-dashed',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'flex min-w-9 items-center justify-center gap-1 border-r-2 border-border px-2',
                (kind === 'draft-empty' || kind === 'draft-pending') &&
                  'border-dashed bg-main-soft',
                kind === 'failed' && 'bg-danger',
              )}
            >
              {kind === 'saved' ? (
                <Check className="size-4" strokeWidth={3} />
              ) : kind === 'saving' ? (
                <LoaderCircle className="size-4 motion-safe:animate-spin" />
              ) : kind === 'failed' ? (
                '!'
              ) : (
                <Pencil className="size-3.5" />
              )}
              {kind === 'draft-pending' ? count : null}
            </span>
            <span aria-hidden="true" className="flex w-9 items-center justify-center">
              <SlidersHorizontal className="size-[18px]" />
            </span>
          </DialogTrigger>
        </div>
        <DialogContent presentation="header-menu" aria-modal="true">
          <div
            aria-hidden="true"
            className="header-menu-handle mx-auto mb-4 h-1 w-10 rounded-full bg-muted sm:hidden"
          />
          <div className="mb-5 flex items-center justify-between gap-3">
            <DialogTitle render={<h2 />} className="text-base font-bold">
              Menü
            </DialogTitle>
            <DialogClose
              render={
                <button
                  type="button"
                  aria-label="Schließen"
                  className="inline-flex size-10 items-center justify-center rounded-base hover:bg-paper"
                />
              }
            >
              <X aria-hidden="true" className="size-5" />
            </DialogClose>
          </div>
          <p className="mb-2 text-xs font-bold text-muted uppercase">Speichern</p>
          <div
            className={cn(
              'space-y-3 rounded-base border-2 border-border p-3',
              drafting && 'border-dashed bg-warning-bg',
            )}
          >
            {confirm ? (
              <>
                <h3 className="text-sm font-bold">
                  {confirm === 'discard'
                    ? `${changeCountLabel(count)} verwerfen?`
                    : 'Entwurfsmodus beenden?'}
                </h3>
                <p className="text-sm">
                  {confirm === 'discard'
                    ? 'Sie werden aus diesem Browser gelöscht. Das lässt sich nicht rückgängig machen.'
                    : `Du hast ${changeCountLabel(count)}, die noch nicht ${pluralDe(count, 'gespeichert ist', 'gespeichert sind')}. Danach wird wieder jede Änderung sofort gespeichert.`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="neutral" onClick={() => setConfirm(null)}>
                    {confirm === 'discard' ? 'Behalten' : 'Abbrechen'}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={confirm === 'discard' ? handleDiscard : handleDiscardAndLeaveDraftMode}
                  >
                    {confirm === 'discard' ? 'Ja, verwerfen' : 'Verwerfen und beenden'}
                  </Button>
                  {confirm === 'leave-draft' ? (
                    <Button disabled={saving} onClick={handleSave}>
                      Speichern und beenden
                    </Button>
                  ) : null}
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-sm font-bold" role="status">
                    {status}
                  </p>
                  {savedTime ? (
                    <p className="mt-1 text-xs text-muted">
                      Zuletzt gespeichert: <time dateTime={state.last_saved_at}>{savedTime}</time>
                    </p>
                  ) : null}
                  {kind === 'failed' ? (
                    <p role="alert" className="mt-1 text-sm">
                      {state.error}
                    </p>
                  ) : null}
                </div>
                <fieldset className="space-y-3" role="radiogroup" aria-label="Speichermodus">
                  {[
                    {
                      value: false,
                      title: 'Automatisch speichern',
                      description: 'Jede Änderung wird sofort für das ganze Team gespeichert.',
                    },
                    {
                      value: true,
                      title: 'Entwurfsmodus',
                      description:
                        'Änderungen erst in diesem Browser sammeln und später gemeinsam speichern.',
                    },
                  ].map((option) => (
                    <label
                      key={option.title}
                      className="flex min-h-11 items-start gap-2 py-1 text-sm"
                    >
                      <input
                        className="mt-0.5 size-4 shrink-0 accent-main-deep"
                        type="radio"
                        name={modeName}
                        checked={drafting === option.value}
                        disabled={saving}
                        onChange={() => handleSwitchChange(option.value)}
                      />
                      <span>
                        <span className="block font-bold">{option.title}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          {option.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {kind === 'draft-pending' || kind === 'failed' ? (
                  <>
                    <Button className="w-full" disabled={saving} onClick={handleSave}>
                      {kind === 'failed' ? 'Wiederholen' : `${changeCountLabel(count)} speichern`}
                    </Button>
                    <button
                      type="button"
                      className="min-h-10 text-sm font-bold underline"
                      onClick={() => setConfirm('discard')}
                    >
                      Verwerfen …
                    </button>
                  </>
                ) : null}
              </>
            )}
          </div>
          <p className="mt-4 mb-2 text-xs font-bold text-muted uppercase">Sitzung</p>
          <Button className="w-full" variant="neutral" disabled={loggingOut} onClick={onLogout}>
            {loggingOut ? 'Abmeldung …' : 'Abmelden'}
          </Button>
        </DialogContent>
      </Dialog>
      <span aria-live="polite" className="sr-only">
        {saving ? 'Wird gespeichert …' : announcement}
      </span>
    </>
  )
}
