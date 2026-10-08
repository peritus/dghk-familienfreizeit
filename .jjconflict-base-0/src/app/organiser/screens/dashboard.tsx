import { lazy, Suspense } from 'react'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import { SuccessState } from '../../components/shared/ui/success-state.js'
import { useOrganiser } from '../context.js'
import { familyRows } from '../family-data.js'
import { organiserPaths } from '../../../organiser/routes.js'
import {
  ScreenLayout,
  ScreenHeader,
  CollectionSection,
} from '../../components/shared/ui/screen-layout.js'
import { ActionableNotices, ActionableNotice } from '../../components/shared/ui/notice.js'
import { StatsStrip } from '../../components/shared/ui/stats-strip.js'
import { buttonVariants } from '../../components/shared/ui/button.js'

// Closed-area differences derive solver results; they load only once an area has been closed.
const ClosedAreaHints = lazy(() =>
  import('../components/closed-area-hints.js').then((module) => ({
    default: module.ClosedAreaHints,
  })),
)

export function Dashboard() {
  const { world } = useOrganiser()
  const families = familyRows(world!)
  const people = families.reduce((total, family) => total + family.persons.length, 0)
  const diagnostics = world!.diagnostics
  const closedOnce = Object.values(world!.phase_facts.areas).some(
    ({ closings }) => closings.length > 0,
  )

  return (
    <ScreenLayout
      header={<ScreenHeader title="Was braucht heute Aufmerksamkeit?" />}
      notices={
        <ActionableNotices>
          {closedOnce ? (
            <Suspense fallback={null}>
              <ClosedAreaHints />
            </Suspense>
          ) : null}
          {diagnostics.length > 0 ? (
            <ActionableNotice title={`${diagnostics.length} Hinweise`}>
              <ul className="space-y-2">
                {diagnostics.map((diagnostic) => (
                  <li key={`${diagnostic.id}:${diagnostic.subject_id}`}>{diagnostic.message}</li>
                ))}
              </ul>
            </ActionableNotice>
          ) : (
            <SuccessState>Alles im Griff – heute ist nichts zu erledigen.</SuccessState>
          )}
        </ActionableNotices>
      }
      summary={
        <StatsStrip
          items={[
            { value: families.length, label: 'Familien' },
            { value: people, label: 'Personen' },
          ]}
        />
      }
    >
      <CollectionSection title="Überblick" className="print:hidden">
        <OrganiserLink
          href={organiserPaths.families()}
          className={buttonVariants({ variant: 'neutral' })}
        >
          Alle Familien ansehen
        </OrganiserLink>
      </CollectionSection>
    </ScreenLayout>
  )
}
