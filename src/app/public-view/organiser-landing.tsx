import { DraftingCompassIcon } from '../components/shared/icons/drafting-compass-icon'
import type { ProfilePresentation } from '../../config/presentation.js'
import { ProfileBrand } from '../components/application/profile-brand.js'
import { buttonVariants } from '../components/shared/ui/button'
import { localizedProfileText } from '../lib/profile-presentation.js'
import { Link } from 'wouter'

export function OrganiserLanding({ profile }: { profile?: ProfilePresentation }) {
  return (
    <div className="mx-auto max-w-4xl">
      <section
        aria-labelledby="organiser-landing-title"
        className="overflow-hidden rounded-base border-2 border-border bg-secondary-background shadow-[6px_6px_0_0_var(--shadow-c)]"
      >
        <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
          <div className="p-6 sm:p-10 lg:p-12">
            <h1
              id="organiser-landing-title"
              className="max-w-xl text-4xl leading-tight sm:text-5xl"
            >
              {localizedProfileText(profile, profile?.meta.public_landing.heading)}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed">
              {localizedProfileText(profile, profile?.meta.public_landing.intro)}
            </p>

            <div className="mt-8">
              <Link href="/login" className={buttonVariants({ size: 'lg' })}>
                Als Organisator anmelden
              </Link>
            </div>
          </div>

          <div className="relative flex min-h-72 items-center justify-center overflow-hidden border-t-2 border-border bg-main p-8 lg:border-l-2 lg:border-t-0">
            <div className="absolute -right-16 -top-16 size-48 rounded-full border-2 border-border bg-foreground/30" />
            <div className="absolute -bottom-20 -left-16 size-56 rounded-full border-2 border-border bg-foreground/20" />
            <div className="relative flex size-44 rotate-3 items-center justify-center rounded-full border-2 border-border bg-secondary-background shadow-[5px_5px_0_0_var(--shadow-c)] sm:size-52">
              {profile?.branding ? (
                <ProfileBrand
                  branding={profile.branding}
                  className="size-24 object-contain sm:size-28"
                />
              ) : (
                <DraftingCompassIcon className="size-24 stroke-[1.5] sm:size-28" />
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
