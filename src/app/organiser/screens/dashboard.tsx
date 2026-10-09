import { AttentionNotices } from '../attention.js'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import { useOrganiser } from '../context.js'
import { familyRows } from '../family-data.js'
import { organiserPaths } from '../../../organiser/routes.js'
import {
  ScreenLayout,
  ScreenHeader,
  CollectionSection,
} from '../../components/shared/ui/screen-layout.js'
import { ActionableNotices } from '../../components/shared/ui/notice.js'
import { StatsStrip } from '../../components/shared/ui/stats-strip.js'
import { buttonVariants } from '../../components/shared/ui/button.js'

export function Dashboard() {
  const { world } = useOrganiser()
  const families = familyRows(world!)
  const people = families.reduce((total, family) => total + family.persons.length, 0)

  return (
    <ScreenLayout
      header={<ScreenHeader title="Was braucht heute Aufmerksamkeit?" />}
      notices={
        <ActionableNotices>
          <AttentionNotices scope="dashboard" actionable show_clear />
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
