# Frontend

The application surfaces are indexed in the [UI screen catalog](README.md).

One React application for every screen, built from copied neobrutalism
components, talking to a small JSON API.

---

## 1. The decision and its boundary

The derived world is the read side of the application
([architecture](../architecture/overview.md)), and must run in the organiser browser. The organiser
screens are views over it: the dashboard, families, the board, plan
diffs, workshops, and constraints all render `derive(committed ++ pending)`. The
pending list is shared by every one of them: the constraints screen adds decision
labels to it just as the board drags into it. That is a client application with one piece of
state and a pure function over it, which is exactly the shape React is built for.

So: render everything in React, organiser and family view alike, and keep the server
to authentication, the event log, and side effects.

What that buys, concretely:

- **One pending list across screens.** It lives in one reducer at the root of the
  organiser application, so every screen sees the same unapplied work.
- **No hand-written rendering engine for the board.** Re-deriving on every drag,
  keeping selection, focus, and drag state across renders, flashing moved cards —
  this is component state and reconciliation, not DOM bookkeeping.
- **Accessible primitives instead of hand-written ones.** The person picker, the room
  picker, confirmation dialogs, toasts, radio groups, and selects come from
  maintained components with keyboard and ARIA behaviour already correct.
- **Almost no per-screen server code.** Organiser screens need no routes of their own;
  they read the log once and write through apply.
- **One way to render.** Every screen is a component, and every request returns
  JSON.

The family view requires JavaScript. It is a small bundle that never contains the
organiser screens or the solver, loads on any browser released in the last several
years, and saves on change through ordinary requests.

### Development event-log debug view

Development mode includes an explicitly non-production debug view for editing the
KDL event log in a `Textarea`. It is an editor and inspection surface, not a new
state model or a replacement for the organiser application:

```text
KDL Textarea → parse → validate → Event[] → derive(events, config)
                                      │
                                      └→ world, plan, diagnostics, trace
```

The view shows parse and event-schema errors with file/line locations and updates
the derived output only after the current text parses and validates. It may load
from or export to the configured `TextFileEventSource`, so the same KDL parser,
serializer, defaults, and validation rules apply to both the textarea and the
file-backed source. Export/download is optional convenience; the authored KDL
text remains the source for the experiment.

The route and bundle are development-only. They are not included in production
navigation, do not bypass authentication or authorization for production APIs,
and cannot select a filesystem source in a production build. The view is intended
to make a fixture immediately inspectable: edit a family, person, inventory item,
or label and see the resolver, plan, diagnostics, and trace respond.

---

## 2. Build extensions

Use the [implemented build](../../docs/architecture/overview.md) and
[development commands](../../docs/engineering/development.md) as the foundation.
Add deployment and offline weight-tuning commands when their features exist:

```jsonc
{
  "deploy": "vite build && wrangler deploy",
  "tune": "tsx scripts/tune.ts"
}
```

`tune` runs under Node outside Vite. Extend both strict runtime TypeScript
projects to include shared domain code as it is introduced, excluding Worker and
module Worker code from the browser project and browser/module app code from the
Worker project. Preserve `noUncheckedIndexedAccess`, and regenerate and commit
Worker types when the bindings change.

## 3. Application shape

```
src/app/
  main.tsx              router, session probe, lazy-loads the organiser application
  family-view/               login, preferences page, assignment page
  organiser/
    OrganiserApp.tsx        loads the log, owns the pending reducer, derives the world
    screens/            dashboard, families, inventory, board, plans, workshops, constraints, reports
  components/ui/        neobrutalism components, copied in by the shadcn CLI
```

**Routing** is `wouter`: path patterns with parameters for the dozen routes in the
[organiser view](../application/organiser-view.md) and the family view. `/organiser/**` is a lazy
chunk, so a family's phone never downloads the organiser screens or the solver.

**Organiser state** is one reducer:

```tsx
function OrganiserApp() {
  const { committed, build_revision, compatibility_revision } = useLog() // GET /api/organiser/log, once
  const [pending, dispatch] = useReducer(pendingReducer, [])
  const world = useMemo(() => derive([...committed, ...pending], config), [committed, pending])
  …
}
```

Every screen receives `world` and `dispatch`. Actions append one or more pending
events, remove the last action's events together for undo, clear the list for
discard, or apply. Action boundaries are local UI bookkeeping; only the ordinary
event list is sent to `derive` and append. There is no state manager and no
data-fetching library: the organiser application makes three kinds of request — load
the log, apply pending events, and trigger emails.

Release badges and inline diffs are derived through the canonical
`CommunicationScopeView` contract in [release control](../application/release-control.md).
The organiser application computes the organiser projection from its committed log,
pending world, communication references and the shared scope-diff function; screens
must not implement their own status or before/after comparison.

This full-log/local-derivation path is restricted to the organiser application. The
family bundle never downloads the event log, pending events, full organiser `World`,
solver traces, organiser labels or notes. It receives only the Worker response after
server-side derivation and family privacy projection.

**Family view state** is the family's privacy-projected response from
`GET /api/family/view`, which the Worker derives and composes according to [release
control](../application/release-control.md) §2 and filters to that family ([family view](../application/family-view.md)).
The response includes family-projected communication status and diffs; it never
transfers the source log or the organiser `World`. A control change posts the label
event and re-renders from the response. The response's scope views are the same
`CommunicationScopeView` shape after server-side family projection.

**Escaping.** React escapes interpolated values by default.
`dangerouslySetInnerHTML` appears nowhere in this codebase. Family free text, organiser
notes, and workshop titles are all user-supplied and all rendered as `{value}`.

The family preferences page is a renderer over `family_facing` occasion-profile entries
rather than hand-written JSX ([family view](../application/family-view.md) §1): each
`control` value maps one-to-one onto a component in `src/app/family-view/controls/`.

---

## 4. Components

[neobrutalism.dev](https://www.neobrutalism.dev) is a shadcn-style registry built on
Base UI. The CLI copies component source into `src/app/components/ui/`; the code is
ours to read and edit, not a dependency to upgrade.

```bash
npx shadcn@latest init https://neobrutalism.dev/r/styling/<palette>.json
npx shadcn@latest add <component URL from its neobrutalism.dev page>
```

The outstanding screens require the following component inventory.
[Implemented primitives](../../docs/ui/design-system.md) provide the starting set:

| Component | Used for |
|---|---|
| Button, Card, Badge, Alert | everywhere |
| Label, Input, Textarea, Checkbox, Radio Group, Select | family view controls, organiser forms, CSV paste |
| Combobox, Popover, Command | person picker, room picker, family search |
| Dialog, Alert Dialog | import, organiser decisions, communicate confirmation, discard pending |
| Table, ScrollArea | families, CSV preview, plans, constraints, workshop fill |
| Tabs | building filter on the board, before and after communication in the family view |
| Sonner | "Gespeichert um 14:22", "Applied", apply conflicts |
| Sidebar, Sheet, Drawer, Breadcrumb | organiser navigation, mobile pickers |
| Skeleton, Tooltip | loading states and hints |

This list and the inventory in [UI-00](design-system.md) are the same list.
The families table sorts and filters 55 rows with `useMemo`; it does not need the
registry's data-table wrapper or a table library. Adding a component to this list is
a deliberate decision, the same as adding a dependency.

Rules for copied components:

- Change them in place when the application needs different behaviour. They are
  source, not a vendored package.
- Screens compose components; components never import from screens, the world, or
  the API.

---

## 5. Styling for domain screens

Extend the [implemented design system](../../docs/ui/design-system.md).
The outstanding screens must meet these acceptance criteria:

- Visible keyboard focus for every interactive control.
- Check contrast for new combinations: black body text on white or cream.
- Never communicate status through color alone; include text, a glyph, or a border.
- Respect `prefers-reduced-motion` in new interactions.
- Verify family screens at 360px; the organiser board targets laptop widths.

Use the existing Tailwind tokens, utility classes and component variants for
these screens. Do not introduce hand-written component CSS beyond registry styling.

## 6. The board

A screen of the organiser application like any other, with the most interaction.
Drag and drop is `@atlaskit/pragmatic-drag-and-drop` — framework-agnostic, ~4.7kB
core, attached to room cards and family cards from effects.

### Responsibilities

```
draggable()   family cards become draggable
dropTarget()  room cards accept drops, with a canDrop predicate
monitor()     global drag state → dim infeasible rooms, show penalty ghosts
reducer       selection, keyboard handling, pending list
world         derive(committed ++ pending), memoised
```

The feasibility predicate is the real one. `canDrop` asks `derive` what happens if
this constraint is appended, so an infeasible room is dimmed because it is
infeasible — with the constraints and exclusions all present —
rather than because a cheap approximation guessed so.

### Mutation cycle

```
1. dispatch the event onto the pending list
2. world = derive(committed ++ pending, config)
3. React renders the board from world
4. if more than this family moved → flash them, show the summary
```

No network, and no reconcile step, because there is nothing to reconcile: the world
on screen was computed the same way the server would compute it.

Applying is the only write the organiser application makes:

```
POST /api/organiser/apply
     { input_seq, events[], build_revision, compatibility_revision }

  409 → the log moved; response carries the new events, the application re-derives on them
  200 → applied; response carries the resulting derived world
```

The server's plan is authoritative. The server checks the event head,
`build_revision`, and `compatibility_revision` supplied with the request, then derives
from trusted events. The
determinism contract ([solver contract](../architecture/solver-contract.md) §1) makes the client
prediction reproducible; any disagreement is reported as a defect rather than
smoothed over.

A stale bundle must not derive at all. The log response carries the Worker's
`build_revision` and `compatibility_revision`, and a bundle differing in either refuses to open
the organiser application and asks for a reload ([deployment](../engineering/deployment.md) §1).

---

## 7. Dependencies, and why each is there

The [installed manifest](../../package.json) and lockfile describe the working
foundation. Outstanding capabilities need these additional dependencies, reviewed
and locked when implemented:

| Dependency | Outstanding use |
|---|---|
| `zod` | Shared event and request schemas |
| `papaparse`, `@types/papaparse` | Browser CSV import with quoted commas |
| `@atlaskit/pragmatic-drag-and-drop` | Assignment board drag and drop |
| `tsx` | Node execution of offline weight tuning |
| Additional registry primitives | Planned controls in the component inventory |

Resolve compatible versions when implementing each capability and commit the
lockfile. Review registry-added dependencies like any other dependency.

**The derivation core has zero dependencies.** `src/derive/**` and `src/solver/**`
import only from themselves, from `src/config/**`, from the pure parts of
`src/modules/**`, and from TypeScript's standard library; those are dependency-free
as well. That is deliberate: the most
important code in the project should be readable without knowing any framework, and
auditable by someone who does not know this stack. React never reaches into it.

**Deliberately absent:**

| Not used | Because |
|---|---|
| Server-rendered HTML templates | One rendering model; the world is derived in the browser anyway |
| htmx or other partial-update libraries | React owns updates; requests return JSON |
| A meta-framework (Next.js, Remix, TanStack Start) | No server rendering to organise; the Worker is an API |
| A state manager | The state is a list of events and a pure function over it |
| A data-fetching library | Three organiser requests and two family view requests |
| A table library | 55 rows, sorted and filtered in `useMemo` |
| tRPC | Shared zod schemas type both ends |
| An ORM | Only the event log and operational tables are stored; see [data model](../architecture/data-model.md) |
| An auth library | See [authentication](../application/authentication.md) |
| A solver or LP library | Reviewability beats optimality here |
| A date library | One function, `ageAt()`, over ISO strings |
| A CSS-in-JS library | Tailwind and the registry's tokens |
