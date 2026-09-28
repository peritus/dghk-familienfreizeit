import { OrganiserLink } from '../../../../app/components/organiser-link.js'
import { BedIcon } from '../../../../app/components/bed-icons.js'
import { organiserPathWithHash, organiserPaths } from '../../../../organiser/routes.js'
import type { BuildingView } from '../types.js'

export function AssignmentPrintLayout({ buildings }: { buildings: readonly BuildingView[] }) {
  return (
    <div className="assignment-print hidden">
      {buildings.map((building) => (
        <section key={building.id} className="assignment-print-building">
          <h1>{building.name}</h1>
          {building.rooms.map((room) => (
            <article key={room.id} className="assignment-print-room">
              <h2>
                <OrganiserLink
                  href={organiserPathWithHash(organiserPaths.inventory(), `#room=${room.id}`)}
                >
                  {room.name}
                </OrganiserLink>
              </h2>
              <p>
                {room.floor} · {room.capacity} {room.capacity === 1 ? 'Platz' : 'Plätze'}
              </p>
              <div>
                {room.beds.map((bed) => (
                  <span key={bed.bed_type}>
                    <BedIcon bed_type={bed.bed_type} className="h-5 w-7" /> {bed.count}×
                  </span>
                ))}
              </div>
              <ul>
                {room.occupants.flatMap((family) =>
                  family.people.map((person) => <li key={person.id}>{person.name}</li>),
                )}
              </ul>
            </article>
          ))}
        </section>
      ))}
    </div>
  )
}
