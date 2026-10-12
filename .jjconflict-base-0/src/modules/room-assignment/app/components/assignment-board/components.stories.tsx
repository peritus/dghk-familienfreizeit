import { loadKdl } from '../../../../../events/kdl.js'
import { activeProfile } from '../../../../../config/index.js'
import { FixtureProvider } from '../../../../../app/stories/organiser-fixtures.js'
import { initialOrganiserState, organiserReducer } from '../../../../../app/organiser/state.js'
import { CollectionList } from '../../../../../app/components/shared/ui/collection-list.js'
import { SuccessState } from '../../../../../app/components/shared/ui/success-state.js'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { BuildingSection } from './building-section.js'
import { FixedAssignmentDialog } from './fixed-dialog.js'
import { FamilyEntry } from './family-entry.js'
import { RequirementChip } from './chips.js'
import { RoomCard } from './room-card.js'
import { AssignmentPrintLayout } from './print-layout.js'
import { FamilyOverviewRow, FitHints, RoomOverviewRow } from './overview.js'
import type {
  AssignmentPrintView,
  BuildingView,
  FamilyView,
  RequirementView,
  RoomView,
} from '../../screens/assignment-board/types.js'

const requirement = (overrides: Partial<RequirementView>): RequirementView => ({
  key: 'accessible',
  label: 'Barrierearm',
  strength: 'required',
  capability_key: 'accessible',
  kind: 'profile-requirement',
  structural: null,
  ...overrides,
})

const family: FamilyView = {
  id: 'fam_baumann',
  name: 'Baumann',
  people: [
    { id: 'per_anna', name: 'Anna Baumann', role: 'adult' },
    { id: 'per_luis', name: 'Luis Baumann', role: 'child' },
  ],
  bed_demand: 2,
  requirements: [
    requirement({ met: true }),
    requirement({
      key: 'private',
      label: 'Eigenes Bad',
      strength: 'preferred',
      capability_key: 'private-sanitary',
      met: false,
    }),
  ],
  fixed: false,
}

const room = (overrides: Partial<RoomView> = {}): RoomView => ({
  id: 'rm_23',
  name: 'Zimmer 23',
  building: 'Haupthaus',
  floor: '1. Obergeschoss',
  capacity: 4,
  occupied: 2,
  free: 2,
  occupants: [family],
  amenities: ['Eigenes Bad', 'Barrierearm'],
  amenity_keys: ['private-sanitary', 'accessible'],
  beds: [
    { bed_type: 'single', count: 2, sleeps: 2 },
    { bed_type: 'bunk', count: 1, sleeps: 2 },
  ],
  fixed_family_ids: [],
  fixed_invalid_family_ids: [],
  fit_hints: [],
  ...overrides,
})

const building: BuildingView = {
  id: 'bld_haupthaus',
  name: 'Haupthaus',
  rooms: [room()],
  family_count: 1,
  requirement_issues: 0,
  wish_issues: 1,
}

const meta = {
  title: 'Modules/room-assignment/Components/Assignment board',
  component: RequirementChip,
  parameters: { layout: 'padded' },
} satisfies Meta<typeof RequirementChip>

export default meta
type Story = StoryObj<typeof meta>

export const RequirementChipVariants: Story = {
  args: { requirement: requirement({}) },
  render: () => (
    <div className="flex flex-wrap gap-2 bg-background p-6">
      <RequirementChip requirement={requirement({ met: true })} />
      <RequirementChip requirement={requirement({ met: false })} />
      <RequirementChip
        requirement={requirement({ strength: 'preferred', met: true, label: 'Eigenes Bad' })}
      />
      <RequirementChip
        requirement={requirement({ strength: 'preferred', met: false, label: 'Eigenes Bad' })}
      />
      <RequirementChip requirement={requirement({ met: undefined })} />
    </div>
  ),
}

export const RoomCardVariants: Story = {
  args: { requirement: requirement({}) },
  render: () => (
    <div className="grid gap-4 bg-background p-6 xl:grid-cols-2">
      <RoomCard room={room({ occupied: 4, free: 0, occupants: [family] })} />
      <RoomCard
        room={room({
          occupants: [family, { ...family, id: 'fam_keller', name: 'Keller' }],
        })}
      />
      <RoomCard room={room()} />
      <RoomCard
        room={room({
          occupied: 0,
          free: 4,
          occupants: [],
          amenities: [],
          amenity_keys: [],
          beds: [{ bed_type: 'double', count: 2, sleeps: 4 }],
        })}
      />
      <RoomCard
        room={room({ occupants: [{ ...family, fixed: true, fixed_room_name: 'Zimmer 23' }] })}
      />
      <RoomCard
        room={room({
          occupied: 5,
          free: -1,
          fixed_invalid_family_ids: ['fam_baumann'],
          occupants: [{ ...family, fixed: true, fixed_invalid: true }],
        })}
      />
    </div>
  ),
}

export const FamilyEntryAndOverviewRows: Story = {
  args: { requirement: requirement({}) },
  render: () => (
    <div className="space-y-4 bg-background p-6">
      <div className="rounded-base border-2 border-border bg-secondary-background px-5">
        <ul>
          <FamilyEntry family={family} onFix={() => undefined} />
        </ul>
      </div>
      <CollectionList>
        <ul>
          <FamilyOverviewRow family={family} onFix={() => undefined} />
          <RoomOverviewRow room={room({ fit_hints: [family] })} />
        </ul>
      </CollectionList>
      <FitHints room={room({ fit_hints: [family] })} />
      <SuccessState>Alle Familien haben ein Zimmer</SuccessState>
    </div>
  ),
}

export const BuildingHeader: Story = {
  args: { requirement: requirement({}) },
  render: () => (
    <BuildingSection
      building={building}
      initially_expanded
      onFix={() => undefined}
      onUnassign={() => undefined}
    />
  ),
}

const fixedDialogState = organiserReducer(initialOrganiserState, {
  type: 'loaded',
  build_revision: 'storybook',
  compatibility_revision: 1,
  feature_overrides: [],
  principal_email: 'organiser@example.test',
  events: loadKdl(
    `
FamilyInvited family_id="fam_baumann" email="baumann@example.test" display_name="Familie Baumann" locale="de"
PersonAdded person_id="per_anna" family_id="fam_baumann" given_name="Anna" family_name="Baumann" role="adult" age=30
PersonAdded person_id="per_luis" family_id="fam_baumann" given_name="Luis" family_name="Baumann" role="child" age=8
BuildingAdded building_id="bld_haupthaus" name="Haupthaus" sort_key=1
RoomAdded room_id="rm_23" building_id="bld_haupthaus" number="23" floor="first" room_type="standard" sort_key=1
RoomAdded room_id="rm_24" building_id="bld_haupthaus" number="24" floor="first" room_type="standard" sort_key=2
LabelSet entity_id="rm_23" key="is-accessible" value=#true strength=#null note=#null
LabelSet entity_id="rm_24" key="is-accessible" value=#true strength=#null note=#null
LabelSet entity_id="rm_23" key="sanitary" value="private" strength=#null note=#null
LabelSet entity_id="rm_24" key="sanitary" value="private" strength=#null note=#null
LabelSet entity_id="rm_23" key="price-per-bed-eur" value=0 strength=#null note=#null
LabelSet entity_id="rm_24" key="price-per-bed-eur" value=0 strength=#null note=#null
LabelSet entity_id="fam_baumann" key="needs-accessible" value="accessible" strength="required" note=#null
LabelSet entity_id="fam_baumann" key="needs-private-sanitary" value="private-sanitary" strength="preferred" note=#null
BedAdded bed_id="bed_23a" room_id="rm_23" label="1" bed_type="single" sleeps=1 sort_key=1
BedAdded bed_id="bed_23b" room_id="rm_23" label="2" bed_type="single" sleeps=1 sort_key=2
BedAdded bed_id="bed_23c" room_id="rm_23" label="3" bed_type="single" sleeps=1 sort_key=3
BedAdded bed_id="bed_23d" room_id="rm_23" label="4" bed_type="single" sleeps=1 sort_key=4
BedAdded bed_id="bed_24a" room_id="rm_24" label="1" bed_type="single" sleeps=1 sort_key=1
BedAdded bed_id="bed_24b" room_id="rm_24" label="2" bed_type="single" sleeps=1 sort_key=2
BedAdded bed_id="bed_24c" room_id="rm_24" label="3" bed_type="single" sleeps=1 sort_key=3
BedAdded bed_id="bed_24d" room_id="rm_24" label="4" bed_type="single" sleeps=1 sort_key=4
`,
    activeProfile.validation_view,
  ),
})
export const FixedDialog: Story = {
  args: { requirement: requirement({}) },
  render: () => (
    <FixtureProvider initialState={fixedDialogState}>
      <FixedAssignmentDialog
        family={family}
        rooms={[
          room(),
          room({ id: 'rm_24', name: 'Zimmer 24', occupied: 0, free: 4, occupants: [] }),
        ]}
        open
        onOpenChange={() => undefined}
        onAssign={() => undefined}
      />
    </FixtureProvider>
  ),
}

export const PrintLayout: Story = {
  args: { requirement: requirement({}) },
  render: () => <AssignmentPrintLayout buildings={[building]} print={print} />,
}

const print: AssignmentPrintView = {
  generated_at: '01.01.2027, 12:00:00',
  data_cut: 'Ereignis 1',
  audience: 'Organisationsteam',
  sensitivity: 'Nur Organisationsteam',
  total_families: 2,
  placed_families: 2,
  unplaced_families: 0,
  rooms: [],
  unplaced: [],
  findings: [],
}
