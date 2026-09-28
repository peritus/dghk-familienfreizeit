import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { RoomCard } from './room-card.js'
import type { FamilyView, RoomView } from './types.js'

const family: FamilyView = {
  id: 'family-baumann',
  name: 'Familie Baumann',
  people: [
    { id: 'ben-baumann', name: 'Ben Baumann', role: 'adult' },
    { id: 'clara-baumann', name: 'Clara Baumann', role: 'adult' },
    { id: 'david-baumann', name: 'David Baumann', role: 'child' },
    { id: 'ella-baumann', name: 'Ella Baumann', role: 'child' },
  ],
  bed_demand: 4,
  requirements: [],
  status: { label: 'Platziert', tone: 'success' },
}

const room: RoomView = {
  id: 'room-12',
  name: 'Zimmer 12',
  building: 'Haus am See',
  floor: 'Erdgeschoss',
  capacity: 4,
  occupied: 4,
  free: 0,
  occupants: [family],
  features: ['Eigenes Bad'],
  feature_keys: ['private-sanitary'],
  beds: [{ bed_type: 'single', count: 4, sleeps: 4 }],
  fixed_family_ids: [],
  fixed_invalid_family_ids: [],
  fit_hints: [],
}

const meta = {
  title: 'Components/Accommodation/Room card',
  component: RoomCard,
  parameters: {
    docs: {
      description: {
        component:
          'A room occupancy card showing capacity, room features, assigned families, and expandable family members.',
      },
    },
  },
} satisfies Meta<typeof RoomCard>

export default meta
type Story = StoryObj<typeof meta>

function InteractiveRoomCard() {
  const [expandedFamilyIds, setExpandedFamilyIds] = useState<ReadonlySet<string>>(
    new Set([family.id]),
  )
  return (
    <RoomCard
      room={room}
      expanded_family_ids={expandedFamilyIds}
      onToggleFamily={(familyId) =>
        setExpandedFamilyIds((current) => {
          const next = new Set(current)
          if (next.has(familyId)) next.delete(familyId)
          else next.add(familyId)
          return next
        })
      }
    />
  )
}

export const Full: Story = {
  args: {
    room,
    expanded_family_ids: new Set([family.id]),
    onToggleFamily: () => undefined,
  },
  render: () => (
    <div className="max-w-2xl bg-background p-6">
      <InteractiveRoomCard />
    </div>
  ),
}
