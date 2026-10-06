import { Fragment, type ReactNode, type Ref } from 'react'
import { TertiaryNavigation } from '../../../components/shared/ui/tertiary-navigation.js'
import {
  WorkshopListPicker,
  WorkshopPrintDocument,
  type WorkshopListOption,
} from '../../../components/shared/workshop/shared.js'
import { cn } from '../../../lib/utils.js'

const tableBase =
  'w-full border-collapse text-left text-[15px] [&_:is(th,td)]:text-left [&_:is(th,td)]:align-top [&_thead_th]:border-b-2 [&_thead_th]:border-border [&_thead_th]:font-bold [&_tbody_:is(th,td)]:border-t-[1.5px] [&_tbody_:is(th,td)]:border-rule [&_tbody_tr:first-child>*]:border-t-0'

const tableVariants = {
  /** Prototype `table.roster`: the workshop roster. */
  roster: '[&_:is(th,td)]:px-3.5 [&_:is(th,td)]:py-2.5 [&_thead_th]:text-sm',
  /** Prototype `table.plain.roster`: person, family and room plans. */
  plain: '[&_:is(th,td)]:px-3 [&_:is(th,td)]:py-2 [&_thead_th]:text-[13px]',
}

function ListTable({
  caption,
  variant = 'plain',
  kind,
  head,
  children,
}: {
  caption: string
  variant?: keyof typeof tableVariants
  /** Print hook for the document type (roster, person, family, room). */
  kind: 'roster' | 'person' | 'family' | 'room'
  head: ReactNode
  children: ReactNode
}) {
  return (
    <div className="workshop-list-table-wrap overflow-x-auto rounded-base border-2 border-border bg-secondary-background">
      <table
        className={cn(
          'workshop-list-table',
          `workshop-list-table--${kind}`,
          tableBase,
          tableVariants[variant],
        )}
      >
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>{head}</tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

/** Wide tables become cards only when the list area itself is narrow (prototype: 720px). */
function ListResponsive({ wide, narrow }: { wide: ReactNode; narrow: ReactNode }) {
  return (
    <>
      <div className="workshop-list-wide @max-[720px]:hidden">{wide}</div>
      <div className="workshop-list-narrow hidden @max-[720px]:block">{narrow}</div>
    </>
  )
}

const cardClass =
  'grid gap-1 rounded-base border-2 border-border bg-secondary-background px-3.5 py-3'

function Muted({ children }: { children: ReactNode }) {
  return <span className="text-muted">{children}</span>
}

/** Prototype `.chip.attn`: an open case. */
export function OpenChip() {
  return (
    <span className="workshop-chip inline-flex min-h-7 items-center rounded-base border-2 border-border bg-main px-2 text-sm font-bold whitespace-nowrap text-main-foreground">
      Offen
    </span>
  )
}

/** Prototype `.badge`: a quiet marker such as "leitet". */
function QuietBadge({ children }: { children: ReactNode }) {
  return (
    <span className="workshop-quiet-badge ml-1.5 inline-flex min-h-[26px] items-center rounded-base border-[1.5px] border-muted bg-secondary-background px-2 text-[13px] font-medium whitespace-nowrap">
      {children}
    </span>
  )
}

export type ListLeader = { name: string; external: boolean }

/** Leader names, external ones followed by the prototype's small dashed "extern" badge. */
export function LeaderNames({ leaders }: { leaders: readonly ListLeader[] }) {
  if (!leaders.length) return <>—</>
  return (
    <>
      {leaders.map((leader, index) => (
        <Fragment key={`${leader.name}-${index}`}>
          {index ? ', ' : ''}
          {leader.name}
          {leader.external ? (
            <>
              {' '}
              <span className="workshop-ext-badge inline-flex min-h-[18px] items-center rounded-base border-[1.5px] border-dashed border-muted px-[5px] align-middle text-[11px] font-medium">
                extern
              </span>
            </>
          ) : null}
        </Fragment>
      ))}
    </>
  )
}

function PrintOnlyCell({ children, header = false }: { children?: ReactNode; header?: boolean }) {
  const className = 'workshop-print-only hidden'
  return header ? (
    <th scope="col" className={className}>
      {children}
    </th>
  ) : (
    <td className={cn(className, 'w-[5.5em]')}>{children}</td>
  )
}

export type WorkshopRosterEntry = {
  id: string
  name: string
  /** Table form: a child's age as a number, adults "erw.". */
  age: string
  /** Card form: "7 Jahre" or "erwachsen". */
  age_long: string
  health?: string
}

export function WorkshopRosterTable({
  caption,
  entries,
}: {
  caption: string
  entries: readonly WorkshopRosterEntry[]
}) {
  return (
    <ListTable
      caption={caption}
      variant="roster"
      kind="roster"
      head={
        <>
          <th scope="col">Name</th>
          <th scope="col">Alter</th>
          <th scope="col">Allergien und Gesundheit</th>
          <PrintOnlyCell header>Anwesend</PrintOnlyCell>
        </>
      }
    >
      {entries.map((entry) => (
        <tr key={entry.id}>
          <th scope="row">{entry.name}</th>
          <td>{entry.age}</td>
          <td>{entry.health ? <strong>{entry.health}</strong> : <Muted>keine Angabe</Muted>}</td>
          <PrintOnlyCell>
            <span
              aria-hidden="true"
              className="workshop-check inline-block size-4 border-[1.5px] border-border align-middle"
            />
          </PrintOnlyCell>
        </tr>
      ))}
    </ListTable>
  )
}

export function WorkshopRosterCards({ entries }: { entries: readonly WorkshopRosterEntry[] }) {
  return (
    <ul className="grid gap-2.5">
      {entries.map((entry) => (
        <li key={entry.id} className={cardClass}>
          <p>
            <strong>{entry.name}</strong> <Muted>· {entry.age_long}</Muted>
          </p>
          {entry.health ? (
            <p>
              <strong>{entry.health}</strong>
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export type PersonPlanEntry = {
  id: string
  slot: string
  workshop?: string
  room?: string
  /** Role text; for an open slot, the reason. */
  role?: string
  status?:
    | 'open'
    | 'assigned'
    | 'fixed'
    | 'lead'
    | 'signup'
    | 'interest'
    | 'free'
    | 'available'
    | 'unavailable'
  /** Participants of a workshop an external leader leads. */
  participants?: number | null
}

function personen(count: number): string {
  return `${count} ${count === 1 ? 'Person' : 'Personen'}`
}

function PersonPlanRole({ entry }: { entry: PersonPlanEntry }) {
  if (entry.status === 'lead')
    return (
      <>
        <strong>leitet</strong>
        {typeof entry.participants === 'number' ? ` · ${personen(entry.participants)}` : null}
      </>
    )
  if (entry.status === 'available') return <Muted>verfügbar</Muted>
  return <>{entry.role}</>
}

export function PersonPlanTable({
  caption,
  entries,
}: {
  caption: string
  entries: readonly PersonPlanEntry[]
}) {
  return (
    <ListTable
      caption={caption}
      kind="person"
      head={
        <>
          <th scope="col">Slot</th>
          <th scope="col">Workshop</th>
          <th scope="col">Raum</th>
          <th scope="col">Rolle</th>
        </>
      }
    >
      {entries.map((entry) => (
        <tr key={entry.id}>
          <th scope="row">{entry.slot}</th>
          <td>
            {entry.workshop ? (
              <strong>{entry.workshop}</strong>
            ) : entry.status === 'open' ? (
              <OpenChip />
            ) : (
              <Muted>{entry.status === 'free' ? 'frei' : '—'}</Muted>
            )}
          </td>
          <td>{entry.room ?? ''}</td>
          <td>
            <PersonPlanRole entry={entry} />
          </td>
        </tr>
      ))}
    </ListTable>
  )
}

export type FamilyPlanSlot = {
  id: string
  label: string
  members: readonly { id: string; name: string; detail?: ReactNode; value: ReactNode }[]
}

export function FamilyPlanTable({
  caption,
  slots,
}: {
  caption: string
  slots: readonly FamilyPlanSlot[]
}) {
  const members = slots[0]?.members ?? []
  return (
    <ListTable
      caption={caption}
      kind="family"
      head={
        <>
          <th scope="col">Slot</th>
          {members.map((member) => (
            <th scope="col" key={member.id}>
              {member.name}
              {member.detail ? (
                <span className="block text-sm font-medium text-muted">{member.detail}</span>
              ) : null}
            </th>
          ))}
        </>
      }
    >
      {slots.map((slot) => (
        <tr key={slot.id}>
          <th scope="row">{slot.label}</th>
          {slot.members.map((member) => (
            <td key={member.id} className="min-w-[8em]">
              {member.value}
            </td>
          ))}
        </tr>
      ))}
    </ListTable>
  )
}

export function FamilyPlanCards({ slots }: { slots: readonly FamilyPlanSlot[] }) {
  return (
    <ul className="grid gap-2.5">
      {slots.map((slot) => (
        <li key={slot.id} className={cardClass}>
          <p>
            <strong>{slot.label}</strong>
          </p>
          {slot.members.map((member) => (
            <p key={member.id} className="text-sm">
              {member.name}: {member.value}
            </p>
          ))}
        </li>
      ))}
    </ul>
  )
}

/** One family-plan cell: workshop, a quiet "leitet" marker, and the room below. */
export function FamilyPlanCell({
  workshop,
  room,
  lead,
  open,
}: {
  workshop: string | null
  room: string | null
  lead: boolean
  open: boolean
}) {
  if (!workshop) return open ? <OpenChip /> : <Muted>—</Muted>
  return (
    <>
      <strong>{workshop}</strong>
      {lead ? <QuietBadge>leitet</QuietBadge> : null}
      {room ? (
        <>
          <br />
          <span className="text-sm text-muted">{room}</span>
        </>
      ) : null}
    </>
  )
}

export type RoomPlanEntry = {
  id: string
  time: string
  workshop?: string
  audience?: string
  leaders: readonly ListLeader[]
}

export function RoomPlanTable({
  caption,
  entries,
}: {
  caption: string
  entries: readonly RoomPlanEntry[]
}) {
  return (
    <ListTable
      caption={caption}
      kind="room"
      head={
        <>
          <th scope="col">Zeit</th>
          <th scope="col">Workshop</th>
          <th scope="col">Für</th>
          <th scope="col">Leitung</th>
        </>
      }
    >
      {entries.map((entry) => (
        <tr key={entry.id}>
          <th scope="row">{entry.time}</th>
          <td>{entry.workshop ? <strong>{entry.workshop}</strong> : <Muted>—</Muted>}</td>
          <td>{entry.audience ?? ''}</td>
          <td>{entry.workshop ? <LeaderNames leaders={entry.leaders} /> : ''}</td>
        </tr>
      ))}
    </ListTable>
  )
}

export function WorkshopListKinds({
  value,
  onChange,
}: {
  value: 'workshop' | 'person' | 'family' | 'room'
  onChange: (value: 'workshop' | 'person' | 'family' | 'room') => void
}) {
  return (
    <TertiaryNavigation
      aria_label="Art der Liste"
      value={value}
      onChange={(next) => onChange(next as 'workshop' | 'person' | 'family' | 'room')}
      items={[
        { value: 'workshop', label: 'Workshop' },
        { value: 'person', label: 'Person' },
        { value: 'family', label: 'Familie' },
        { value: 'room', label: 'Raum' },
      ]}
    />
  )
}

type DocumentProps = {
  title: string
  metadata: readonly ReactNode[]
  heading_ref?: Ref<HTMLHeadingElement>
}

export function WorkshopRosterDocument({
  title,
  metadata,
  entries,
  heading_ref: headingRef,
}: DocumentProps & { entries: readonly WorkshopRosterEntry[] }) {
  return (
    <WorkshopPrintDocument
      title={title}
      metadata={metadata}
      heading_ref={headingRef}
      print_note="Vertraulich: enthält Gesundheitsangaben. Nur für die Workshopleitung. Nach der Veranstaltung vernichten."
    >
      {entries.length ? (
        <ListResponsive
          wide={<WorkshopRosterTable caption={`Teilnehmende ${title}`} entries={entries} />}
          narrow={<WorkshopRosterCards entries={entries} />}
        />
      ) : (
        <p className="text-muted">Noch niemand zugeordnet.</p>
      )}
    </WorkshopPrintDocument>
  )
}

export function WorkshopPersonPlanDocument({
  title,
  metadata,
  entries,
  heading_ref: headingRef,
}: DocumentProps & { entries: readonly PersonPlanEntry[] }) {
  return (
    <WorkshopPrintDocument title={title} metadata={metadata} heading_ref={headingRef}>
      <PersonPlanTable caption={`Plan von ${title}`} entries={entries} />
    </WorkshopPrintDocument>
  )
}

export function WorkshopFamilyPlanDocument({
  title,
  metadata,
  slots,
  heading_ref: headingRef,
}: DocumentProps & { slots: readonly FamilyPlanSlot[] }) {
  return (
    <WorkshopPrintDocument title={title} metadata={metadata} heading_ref={headingRef}>
      <ListResponsive
        wide={<FamilyPlanTable caption={title} slots={slots} />}
        narrow={<FamilyPlanCards slots={slots} />}
      />
    </WorkshopPrintDocument>
  )
}

export function WorkshopRoomPlanDocument({
  title,
  metadata,
  entries,
  heading_ref: headingRef,
}: DocumentProps & { entries: readonly RoomPlanEntry[] }) {
  return (
    <WorkshopPrintDocument title={title} metadata={metadata} heading_ref={headingRef}>
      <RoomPlanTable caption={`Raumplan ${title}`} entries={entries} />
    </WorkshopPrintDocument>
  )
}

export function WorkshopListPickerWithDocument({
  label,
  value,
  options,
  onChange,
  onStep = onChange,
  search,
  notice,
  children,
}: {
  label: string
  value: string
  options: readonly WorkshopListOption[]
  onChange: (value: string) => void
  /** Previous/next; defaults to `onChange`. The screen moves focus to the new document. */
  onStep?: (value: string) => void
  search?: boolean
  /** Shown above the picker, on screen only (the roster's confidentiality notice). */
  notice?: ReactNode
  children: ReactNode
}) {
  const index = options.findIndex((option) => option.value === value)
  const previous = index > 0 ? options[index - 1] : undefined
  const next = index >= 0 ? options[index + 1] : undefined
  return (
    <div className="@container">
      {notice ? <div className="workshop-screen-only mb-6">{notice}</div> : null}
      <div className="workshop-screen-only">
        <WorkshopListPicker
          label={label}
          value={value}
          options={options}
          onChange={onChange}
          search={search}
          onPrevious={previous ? () => onStep(previous.value) : undefined}
          onNext={next ? () => onStep(next.value) : undefined}
        />
      </div>
      {children}
    </div>
  )
}
