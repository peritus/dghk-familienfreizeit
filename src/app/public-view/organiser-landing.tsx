import { ScreenHeader, ScreenLayout } from '../components/shared/ui/screen-layout.js'
import { DraftingCompassIcon } from '../components/shared/icons/drafting-compass-icon'
import type { ProfilePresentation } from '../../config/presentation.js'
import { ProfileBrand } from '../components/application/profile-brand.js'
import { buttonVariants } from '../components/shared/ui/button'
import { localizedProfileText } from '../lib/profile-presentation.js'
import { Link } from 'wouter'

export function OrganiserLanding({ profile }: { profile?: ProfilePresentation }) {
  return (
    <ScreenLayout
      header={
        <ScreenHeader
          title={localizedProfileText(profile, profile?.meta.public_landing.heading)}
          description={localizedProfileText(profile, profile?.meta.public_landing.intro)}
        />
      }
    >
      <section
        aria-label="Zugang zur Organisation"
        className="grid overflow-hidden rounded-base border-2 border-border bg-secondary-background lg:grid-cols-2"
      >
        <div className="flex items-center p-6 sm:p-10">
          <Link data-slot="button" href="/login" className={buttonVariants({ size: 'lg' })}>
            Als Organisator anmelden
          </Link>
        </div>
        <div
          data-slot="decorative-illustration"
          className="print:hidden relative flex min-h-64 items-center justify-center overflow-hidden border-t-2 border-border bg-main p-8 lg:border-l-2 lg:border-t-0"
        >
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 size-48 rounded-full border-2 border-border bg-foreground/30"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -left-16 size-56 rounded-full border-2 border-border bg-foreground/20"
          />
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
      </section>
    </ScreenLayout>
  )
}
