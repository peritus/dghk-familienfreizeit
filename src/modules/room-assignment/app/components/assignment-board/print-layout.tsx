import { OrganiserLink } from '../../../../app/components/application/organiser-link.js'
import { BedIcon } from '../../../../app/components/shared/icons/bed-icons.js'
import { organiserPathWithHash, organiserPaths } from '../../../../organiser/routes.js'
import type { AssignmentPrintView, BuildingView } from '../../screens/assignment-board/types.js'

export function AssignmentPrintLayout({
  buildings,
  print,
}: {
  buildings: readonly BuildingView[]
  print: AssignmentPrintView
}) {
  return (
    <div className="assignment-print hidden">
      <header className="assignment-print-header">
        <h1>Belegungsübersicht</h1>
        <dl>
          <div>
            <dt>Erstellt</dt>
            <dd>{print.generated_at}</dd>
          </div>
          <div>
            <dt>Datenstand</dt>
            <dd>{print.data_cut}</dd>
          </div>
          <div>
            <dt>Geltungsbereich</dt>
            <dd>{print.audience}</dd>
          </div>
          <div>
            <dt>Vertraulichkeit</dt>
            <dd>{print.sensitivity}</dd>
          </div>
        </dl>
      </header>

      <section
        className="assignment-print-summary"
        aria-labelledby="assignment-print-summary-title"
      >
        <h2 id="assignment-print-summary-title">Zusammenfassung</h2>
        <dl>
          <div>
            <dt>Familien</dt>
            <dd>{print.total_families}</dd>
          </div>
          <div>
            <dt>Platziert</dt>
            <dd>{print.placed_families}</dd>
          </div>
          <div>
            <dt>Offen</dt>
            <dd>{print.unplaced_families}</dd>
          </div>
          <div>
            <dt>Zimmer</dt>
            <dd>{print.rooms.length}</dd>
          </div>
        </dl>
      </section>

      {print.unplaced.length > 0 ? (
        <section
          className="assignment-print-findings"
          aria-labelledby="assignment-print-open-title"
        >
          <h2 id="assignment-print-open-title">Nicht platzierte Familien</h2>
          <ul>
            {print.unplaced.map((family) => (
              <li key={family.family}>
                <strong>{family.family}</strong> · {family.people}: {family.reason}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {print.findings.length > 0 ? (
        <section
          className="assignment-print-findings"
          aria-labelledby="assignment-print-diagnostics-title"
        >
          <h2 id="assignment-print-diagnostics-title">Hinweise</h2>
          <ul>
            {print.findings.map((finding) => (
              <li key={finding.id}>
                <strong>{finding.title}</strong> · {finding.description}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

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
                  <span key={bed.bed_type} className="assignment-print-bed">
                    <BedIcon bed_type={bed.bed_type} className="h-5 w-7" /> {bed.count}×
                  </span>
                ))}
              </div>
              <p className="assignment-print-room-status">
                {room.occupied} / {room.capacity} Plätze ·{' '}
                {room.free < 0
                  ? `${Math.abs(room.free)} Plätze zu wenig`
                  : room.free === 0
                    ? 'Voll'
                    : room.occupied > 0
                      ? 'Belegt'
                      : 'Frei'}
              </p>
              {room.features.length > 0 ? <p>Merkmale: {room.features.join(', ')}</p> : null}
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
