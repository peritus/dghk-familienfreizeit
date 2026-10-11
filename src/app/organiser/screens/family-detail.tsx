import { useLocation } from 'wouter'
import {
  FamilyDetail as SharedFamilyDetail,
  FamilyPersonSidebar as SharedPersonSidebar,
} from '../../components/family-detail/family-detail.js'
import { buildFamilyDetailData } from '../../../family-detail/read-model.js'
import { familyChangeEvents } from '../../../family-detail/changes.js'
import type { EventDraft } from '../../../events/types.js'
import type { FamilyPerson } from '../family-data.js'
import { personName } from '../../../family-detail/model.js'
import { activeProfile } from '../../../config/index.js'
import { useOrganiser } from '../context.js'
import { useAttention } from '../attention.js'
import { findFamily, familyStatus } from '../family-data.js'
import { OrganiserLink } from '../../components/application/organiser-link.js'
import { organiserPaths, type FamilyTopic } from '../../../organiser/routes.js'
import { StatusNotice } from '../../components/shared/ui/notice.js'
import { ScreenLayout, ScreenHeader } from '../../components/shared/ui/screen-layout.js'
import { ErrorState } from '../../components/shared/ui/screen-state.js'
import { randomIdPart } from '../ids.js'

export function FamilyDetail({
  family_id: familyId,
  topic = 'zimmer',
  person_id: personId,
}: {
  family_id?: string
  topic?: FamilyTopic
  person_id?: string
}) {
  const { world, state, stage, effective_features: effectiveFeatures } = useOrganiser()
  const attention = useAttention()
  const [, navigate] = useLocation()
  const family = familyId && world ? findFamily(world, familyId) : null
  if (!family || !world || !state.principal_email)
    return (
      <ScreenLayout header={<ScreenHeader title="Familie nicht gefunden" />}>
        <ErrorState title="Diese Familie gibt es nicht.">
          <OrganiserLink href={organiserPaths.families()} className="underline">
            Zur Familienliste
          </OrganiserLink>
        </ErrorState>
      </ScreenLayout>
    )
  const data = buildFamilyDetailData(world, activeProfile, family.family.id, {
    audience: 'organiser',
    now: new Date().toISOString(),
    overrides: state.feature_overrides,
  })
  if (effectiveFeatures)
    data.sections = data.sections.map((section) => ({
      ...section,
      visible:
        section.key === 'room-wishes'
          ? effectiveFeatures.has('family-preferences.organiser-room-wishes')
          : section.key === 'workshops'
            ? effectiveFeatures.has('workshop-rankings.organiser-workshop-wishes')
            : section.visible,
    }))
  const status = familyStatus(world, family, attention)
  const currentPerson = data.people.find((person) => person.id === personId) ?? data.people[0]
  const topicPath = (next: FamilyTopic) =>
    next === 'zimmer' || !currentPerson
      ? organiserPaths.family_topic(family.family.id, next)
      : organiserPaths.family_person_topic(family.family.id, next, currentPerson.id)
  return (
    <SharedFamilyDetail
      data={data}
      actions={{
        change: async (change) => {
          stage(
            familyChangeEvents(
              change,
              world,
              family.family.id,
              state.principal_email!,
              new Date().toISOString(),
              `per_${randomIdPart()}`,
            ),
          )
        },
      }}
      topic={topic}
      person_id={personId}
      on_topic={(next) => void navigate(topicPath(next))}
      on_select={(id) =>
        void navigate(
          organiserPaths.family_person_topic(
            family.family.id,
            topic === 'zimmer' ? 'personen' : topic,
            id,
          ),
        )
      }
      topic_link={(next) => <OrganiserLink href={topicPath(next)} />}
      back_link={
        <OrganiserLink href={organiserPaths.families()} className="inline-block underline">
          ← Familien
        </OrganiserLink>
      }
      status={
        status.complete ? (
          <StatusNotice label="Vollständig" tone="success">
            Alles angegeben.
          </StatusNotice>
        ) : undefined
      }
      defer_text
    />
  )
}

/** Story compatibility adapter for the extracted shared person selector. */
export function FamilyPersonSidebar(props: {
  family_id: string
  topic: FamilyTopic
  persons: readonly FamilyPerson[]
  selected_person_id?: string
  on_select: (id: string) => void
  adding: boolean
  on_add_change: (open: boolean) => void
  actor: string
  stage: (events: readonly EventDraft[]) => void
}) {
  const { world, state, stage } = useOrganiser()
  const familyId = String(props.family_id ?? '')
  if (!world || !world.entity_kind_by_id[familyId]) return null
  const data = buildFamilyDetailData(world, activeProfile, familyId, {
    audience: 'organiser',
    now: new Date().toISOString(),
  })
  const old = props as {
    selected_person_id?: string
    on_select: (id: string) => void
    adding: boolean
    on_add_change: (open: boolean) => void
  }
  return (
    <SharedPersonSidebar
      data={data}
      persons={data.people}
      selected_person_id={old.selected_person_id}
      on_select={old.on_select}
      adding={old.adding}
      on_add_change={old.on_add_change}
      actions={{
        change: async (change) => {
          stage(
            familyChangeEvents(
              change,
              world,
              familyId,
              state.principal_email!,
              new Date().toISOString(),
              `per_${randomIdPart()}`,
            ),
          )
        },
      }}
    />
  )
}

export { personName }
