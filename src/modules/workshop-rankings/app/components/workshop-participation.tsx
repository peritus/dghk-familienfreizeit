import {
  type WorkshopParticipationCell,
  type WorkshopParticipationPerson,
  type WorkshopParticipationView,
} from '../workshop-allocation-view.js'
import { organiserPathWithQuery, organiserPaths } from '../../../../organiser/routes.js'
import { OrganiserLink } from '../../../../app/components/application/organiser-link.js'

function personCount(count: number): string {
  return `${count} ${count === 1 ? 'Person' : 'Personen'}`
}

function slotCount(count: number): string {
  return `${count} ${count === 1 ? 'Slot' : 'Slots'}`
}

function rankClass(cell: WorkshopParticipationCell): string {
  if (cell.kind !== 'assignment') return ''
  const rank = cell.entries[0]?.rank
  return rank === null || rank === undefined
    ? ''
    : `workshop-participation__slot-cell--rank-${Math.min(rank, 4)}`
}

function statusBadge(person: WorkshopParticipationPerson) {
  if (person.response_status === 'Rangfolge') return null
  return (
    <span
      className={`workshop-participation__badge${person.response_tone === 'attention' ? ' workshop-participation__badge--attention' : ' workshop-participation__badge--quiet'}`}
    >
      {person.response_status}
    </span>
  )
}

function participationAgeLabel(person: WorkshopParticipationPerson): string {
  return person.group === 'adults' ? 'erwachsen' : person.age_label
}

function WishesLink({ person }: { person: WorkshopParticipationPerson }) {
  const href = organiserPathWithQuery(organiserPaths.workshop_allocation_trace(), {
    person: person.id,
  })
  return (
    <OrganiserLink
      className="workshop-participation__person-link"
      href={href}
      aria-label={`${person.name}: Wünsche verfolgen`}
    >
      {person.name}
    </OrganiserLink>
  )
}

function CellContent({ cell }: { cell: WorkshopParticipationCell }) {
  if (cell.kind === 'free')
    return (
      <span className="workshop-participation__quiet">
        <span aria-hidden="true">-</span>
        <span className="sr-only">freier Platz</span>
      </span>
    )
  return (
    <div className="workshop-participation__cell-entries">
      {cell.entries.map((entry) => (
        <div
          className={`workshop-participation__cell-entry${cell.kind === 'leader' ? ' workshop-participation__cell-entry--leader' : ''}${cell.kind === 'sign-up' || cell.kind === 'interest' ? ' workshop-participation__cell-entry--participation' : ''}${cell.kind === 'assignment' && entry.reason === 'fixed' ? ' workshop-participation__cell-entry--fixed' : ''}`}
          key={entry.workshop_id}
        >
          {cell.kind === 'leader' ? (
            <span className="workshop-participation__cell-title">Leitet {entry.title}</span>
          ) : (
            <>
              <span className="workshop-participation__cell-title">{entry.title}</span>
              <br />
              <span className="workshop-participation__cell-detail">
                {cell.kind === 'sign-up'
                  ? 'Anmeldung'
                  : cell.kind === 'interest'
                    ? 'Interesse'
                    : entry.reason === 'fixed'
                      ? 'fest zugeordnet'
                      : entry.rank
                        ? `${entry.rank}. Wahl`
                        : 'nicht gewählt'}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

function SlotLabel({ day, starts, ends }: { day: string; starts: string; ends: string }) {
  return (
    <>
      {day} {starts}
      <span className="workshop-participation__slot-end">bis {ends}</span>
    </>
  )
}

function Legend({ max_rank: maxRank }: { max_rank: number }) {
  const ranks = Array.from({ length: Math.min(maxRank, 4) }, (_, index) => index + 1)
  return (
    <div className="workshop-participation__legend">
      {ranks.map((rank) => (
        <span key={rank}>
          <i
            aria-hidden="true"
            className={`workshop-participation__swatch workshop-participation__swatch--rank-${rank}`}
          />
          {rank === 4 ? (maxRank === 4 ? '4. Wahl' : `4.–${maxRank}. Wahl`) : `${rank}. Wahl`}
        </span>
      ))}
      <span>
        <i aria-hidden="true" className="workshop-participation__swatch" />
        nicht gewählt oder freier Platz
      </span>
      <span>
        <i
          aria-hidden="true"
          className="workshop-participation__swatch workshop-participation__swatch--leader"
        />
        leitet
      </span>
    </div>
  )
}

function WideTable({ participation }: { participation: WorkshopParticipationView }) {
  return (
    <div className="workshop-participation__wide">
      <div className="workshop-participation__table-wrap">
        <table className="workshop-participation__table">
          <caption>
            Teilnahme{' '}
            <span>
              · {personCount(participation.people.length)} · {slotCount(participation.slots.length)}
            </span>
          </caption>
          <colgroup>
            <col className="workshop-participation__person-column" />
            {participation.slots.map((slot) => (
              <col key={slot.id} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Person</th>
              {participation.slots.map((slot) => (
                <th scope="col" key={slot.id}>
                  <SlotLabel day={slot.day_label} starts={slot.start_label} ends={slot.end_label} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {participation.people.map((person) => (
              <tr key={person.id}>
                <th scope="row">
                  <WishesLink person={person} />
                  <span className="workshop-participation__age">
                    {participationAgeLabel(person)}
                  </span>
                  {statusBadge(person)}
                </th>
                {person.cells.map((cell, index) => (
                  <td
                    className={`workshop-participation__slot-cell workshop-participation__slot-cell--${cell.kind} ${rankClass(cell)}${cell.kind === 'assignment' && cell.entries.some((entry) => entry.reason === 'fixed') ? ' workshop-participation__slot-cell--fixed' : ''}`}
                    key={participation.slots[index]?.id ?? index}
                  >
                    <CellContent cell={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr aria-hidden="true">
              <td colSpan={1 + participation.slots.length} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function PersonCards({ participation }: { participation: WorkshopParticipationView }) {
  return (
    <div className="workshop-participation__narrow">
      <div className="workshop-participation__cards">
        {participation.people.map((person) => (
          <article
            aria-labelledby={`workshop-participation-person-${person.id}`}
            className="workshop-participation__card"
            key={person.id}
          >
            <h3 id={`workshop-participation-person-${person.id}`}>
              <WishesLink person={person} />
              <span className="workshop-participation__person-meta">
                · {participationAgeLabel(person)}
              </span>
            </h3>
            {statusBadge(person) ? (
              <div className="workshop-participation__card-badges">{statusBadge(person)}</div>
            ) : null}
            <h4>Zuordnung</h4>
            <ul className="workshop-participation__card-slots">
              {participation.slots.map((slot, index) => (
                <li key={slot.id}>
                  <span className="workshop-participation__slot-name">
                    {slot.day_label} {slot.start_label}
                    <span className="sr-only"> bis {slot.end_label}</span>
                  </span>
                  <span>
                    <CellContent cell={person.cells[index]!} />
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}

export function WorkshopParticipation({
  participation,
  max_rank: maxRank,
}: {
  participation: WorkshopParticipationView
  max_rank: number
}) {
  return (
    <section className="workshop-participation" aria-label="Teilnahme">
      <Legend max_rank={maxRank} />
      <WideTable participation={participation} />
      <PersonCards participation={participation} />
    </section>
  )
}
