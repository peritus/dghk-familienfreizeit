import type { Meta, StoryObj } from '@storybook/react-vite'
import { BuildingSection } from './building-section.js'
import { FixedAssignmentDialog } from './fixed-dialog.js'
import { FamilyEntry } from './family-entry.js'
import { RequirementChip } from './chips.js'
import { RoomCard } from './room-card.js'
import { AssignmentPrintLayout } from './print-layout.js'
import {
  FamilyOverviewRow,
  FitHints,
  OverviewList,
  OverviewSuccess,
  RoomOverviewRow,
} from './overview.js'
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
  name: 'Familie Baumann',
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
          occupants: [family, { ...family, id: 'fam_keller', name: 'Familie Keller' }],
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
      <OverviewList empty={null}>
        <ul>
          <FamilyOverviewRow family={family} onFix={() => undefined} />
          <RoomOverviewRow room={room({ fit_hints: [family] })} />
        </ul>
      </OverviewList>
      <FitHints room={room({ fit_hints: [family] })} />
      <OverviewSuccess>Alle Familien haben ein Zimmer</OverviewSuccess>
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

export const FixedDialog: Story = {
  args: { requirement: requirement({}) },
  render: () => (
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
