import { DraftingCompassIcon } from '../components/shared/icons/drafting-compass-icon'

export function Welcome() {
  return (
    <div className="mx-auto max-w-4xl">
      <section
        aria-labelledby="welcome-title"
        className="overflow-hidden rounded-base border-2 border-black bg-white shadow-[6px_6px_0_0_#000]"
      >
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-10 lg:p-12">
            <p className="mb-5 inline-flex items-center border-2 border-black bg-main px-3 py-1 text-sm font-bold uppercase tracking-wide shadow-[3px_3px_0_0_#000]">
              Familienfreizeit
            </p>
            <h1 id="welcome-title" className="max-w-xl text-4xl leading-tight sm:text-5xl">
              Willkommen zur Familienfreizeit
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed">
              Hier findest Du bald die Angaben und Informationen für Deine Familie.
            </p>

            <div className="mt-8 flex max-w-lg items-start gap-3 border-t-2 border-black pt-5">
              <span className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-main">
                <span
                  className="size-3 rounded-full border-2 border-black bg-white"
                  aria-hidden="true"
                />
              </span>
              <div>
                <p className="font-bold">Anmeldung noch nicht freigeschaltet</p>
                <p className="mt-1 text-sm">
                  Das Organisationsteam informiert Dich, sobald es losgeht.
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex min-h-72 items-center justify-center overflow-hidden border-t-2 border-black bg-main p-8 lg:border-l-2 lg:border-t-0">
            <div className="absolute -right-16 -top-16 size-48 rounded-full border-2 border-black bg-white/30" />
            <div className="absolute -bottom-20 -left-16 size-56 rounded-full border-2 border-black bg-white/20" />
            <div className="relative flex size-44 rotate-3 items-center justify-center rounded-full border-2 border-black bg-white shadow-[5px_5px_0_0_#000] sm:size-52">
              <DraftingCompassIcon className="size-24 stroke-[1.5] sm:size-28" />
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
