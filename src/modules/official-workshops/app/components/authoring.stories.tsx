import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../../app/components/shared/ui/button.js'
import { ExternalLeaderRow, InternalLeaderRow, WorkshopSummaryRow } from './authoring.js'
import { WorkshopList } from '../../../../app/components/shared/workshop/shared.js'
import {
  fullExternalLeaders,
  fullInternalLeaders,
  fullWorkshopRows,
} from '../../../../app/stories/workshop-fixtures.js'

const meta = {
  title: 'Modules/official-workshops/Components/Authoring',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Semantic authoring pieces for workshop rows, internal leaders, and external leaders. They accept already-derived labels and never perform domain lookups.',
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const WorkshopRows: Story = {
  render: () => (
    <div className="grid max-w-4xl gap-3 bg-background p-6">
      {fullWorkshopRows.map((workshop) => (
        <WorkshopSummaryRow
          key={workshop.id}
          workshop={workshop}
          action={
            <Button size="sm" variant="neutral">
              Bearbeiten
            </Button>
          }
        />
      ))}
    </div>
  ),
}

export const LeaderRows: Story = {
  render: () => (
    <div className="grid gap-6 bg-background p-6">
      <div className="overflow-x-auto rounded-base border-2 border-border bg-secondary-background">
        <table className="w-full min-w-[36rem] text-left">
          <caption className="sr-only">Leitungen aus der Veranstaltung</caption>
          <thead>
            <tr className="border-b-2 border-border">
              <th className="p-3">Person</th>
              <th className="p-3">Alter</th>
              <th className="p-3">Leitet</th>
              <th className="p-3 text-right">Nimmt teil an</th>
            </tr>
          </thead>
          <tbody>
            {fullInternalLeaders.map((leader) => (
              <InternalLeaderRow key={leader.id} leader={leader} />
            ))}
          </tbody>
        </table>
      </div>
      <WorkshopList>
        {fullExternalLeaders.map((leader) => (
          <ExternalLeaderRow
            key={leader.id}
            leader={leader}
            total_slots={7}
            action={
              <Button size="sm" variant="neutral">
                Bearbeiten
              </Button>
            }
          />
        ))}
      </WorkshopList>
    </div>
  ),
}
