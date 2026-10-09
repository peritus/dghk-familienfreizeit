# Family preferences

Module id `family-preferences` · factory `familyPreferences`

## 1. Purpose and boundary

Family preferences renders the page where a family states its preferences. The page
is a renderer, not a form: every profile trait declaring `family_facing` produces a
control where its governing [feature](../architecture/features.md) is effective,
grouped into the sections this module's parameters name (D14). Adding a trait
that reuses an existing control needs no family view code.

The module owns the control union, section layout, Zieltermin and closed-input notices, and the
save-on-change contract. The family view shell, privacy boundaries, and the
assignment page are specified in [family view](../application/family-view.md).

The same control union is reused, editable, by the organiser family-detail
screen ([organiser view](../application/organiser-view.md) §3), authorised
per the organiser branch of the authorisation table rather than the family
branch, so organisers can enter any family-facing fact on a family's behalf
(D24).

## 2. Dependencies

Requires: none. Enhances: none. Controls contributed by other modules become
available when those modules are selected.

## 3. Parameters

```ts
type FamilyPreferencesParams = {
  sections: readonly {
    key: string                        // kebab-case
    title: LocalizedText
    intro: LocalizedText | null
    traits: readonly string[]            // family_facing traits, in display order
    features: readonly FeatureId[]     // governing features, at most one per audience
    phase: PhaseId | null              // governing phase, for target and closed notices
    late_contact: LocalizedText | null // copy shown once the phase is late; required with a phase
  }[]
  module_controls: readonly {
    key: string                        // selected module-owned control key
    section: string                    // one of sections[].key
    label: LocalizedText
    help: LocalizedText | null
  }[]
}
```

| Parameter | Default | Validation |
|---|---|---|
| `sections` | — (required) | every `family_facing` trait appears in exactly one section; no other traits appear; each `features` entry is a feature of a selected module, at most one per audience; each `phase` is a declared phase or `null`; `late_contact` is set exactly when `phase` is |
| `module_controls` | `[]` | unique selected module control keys; section exists; cannot redefine key schemas or authorisation |

The module declares the phase `family-preferences.accommodation-preferences`
(area `accommodation`, always open, accepts a Zieltermin, closed by the area;
[phases](../architecture/phases.md) §4). A section's `phase` selects whose
Zieltermin and closed state the section shows; the Zieltermin comes from
`meta.phase_dates`. `null` means that the section has no phase notice.

A section's `features` govern every control in the section, including its module
controls ([features](../architecture/features.md) §3). The family view offers a
governed section only while its family feature is effective, and a family label
write for one of its controls is rejected on append otherwise. Organiser family
detail offers it while its organiser feature is effective (D24). An audience
without a listed feature leaves the section ungoverned for that audience.

## 4. Entity kinds

None.

## 5. Events

None of its own. Controls emit `LabelSet` and `LabelCleared` through the family
routes, authorised per [labels and constraints](../architecture/labels-and-constraints.md) §4.
For a profile trait, the control uses that trait's canonical label key and value
schema; it does not emit a generic `needs` or `provides` label. A tri-state
requirement therefore emits the trait key with `strength=required` or
`strength=preferred`, and writes an explicit neutral response marker for the indifferent state, as
documented in [response declarations](../../docs/modules/family-preferences.md#response-declarations).

## 6. Labels and trait roles

None. The module reads each trait's `family_facing` declaration:

```ts
type FamilyFacing = {
  control: Control
  label: LocalizedText                 // family-facing wording; may differ from the organiser label
  help: LocalizedText | null
  scope: 'family' | 'person'
  strengths: readonly ('required' | 'preferred')[] | null
  invert: boolean                      // presentation only
}
```

A trait declaring `organiser_only: true` may not declare `family_facing`; the profile
build rejects both together.

### The control union

`control` is a closed union. Adding a trait that uses an existing control is a
one-file change; adding a new kind of control is two files — the control and its
renderer in `src/modules/<module-id>/app/controls/`.

| `control` | Contributed by | Renders | Writes |
|---|---|---|---|
| `tri-state` | this module | answer radios plus unanswered reset | strength `required`, `preferred`, explicit neutral marker, or reset of both labels |
| `toggle` | this module | one checkbox | `LabelSet` with no strength, or `LabelCleared` |
| `choice` | this module | one select over the trait's enum or referenced entities | `LabelSet` replacing the current value, or `LabelCleared` when optional |
| `free-text` | this module | a text area | `LabelSet` with the text, or `LabelCleared` when emptied |
| `family-picker` | this module | searchable family list, multi-select | one `LabelSet` per selection, value = family id |
| `person-picker` | this module | people within the same family | one `LabelSet` per selection, value = person id |
| `workshop-sign-up` | [`workshops`](workshops.md) | join/leave with availability | `signed-up-for` set/clear |
| `workshop-interest` | [`workshops`](workshops.md) | non-binding interest toggle | `interested-in` set/clear |
| `ranking` | [implemented workshop rankings](../../docs/modules/workshop-rankings.md) | ordered choices in the current workshop choice cycle | clears the cycle's labels and sets the new ones in one append |

`invert: true` flips the wording so a positively named trait can read negatively, for
example "Zimmer teilen: gerne / lieber nicht / auf keinen Fall", while the stored
trait keeps its name.

A control whose trait's `valid_for` fails for the entity renders disabled with the
reason, not hidden. A missing option makes people think the site is broken; a
disabled one with a reason answers the question.

## 7. Solver input and stages

None.

## 8. Rules and scoring

None.

## 9. Preflight checks

None.

## 10. Output and diff

None.

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Family view | The preferences page ([family view](../application/family-view.md) §1, [UI-03](../ui/screens/family-preferences.md)) |
| Screen | Preference completion columns and chase-list entries for the organiser ([organiser view](../application/organiser-view.md) §2, §3) |
| Screen | Family detail renders the same control union, editable, organiser-authorised, for phone/email requests ([organiser view](../application/organiser-view.md) §3, D24) |
| Emails | Reminder copy names what is missing, per person and section |
| Reports | none |

Module-owned controls are placed by `module_controls`, after the section's traits in
configured order. They reuse module schemas and authorisation, not duplicate profile
trait definitions. `workshop-sign-up` and `workshop-interest` are supplied by workshops.
Only the appropriate control for the effective mode appears. `ranking` remains
contributed by the implemented [workshop-rankings module](../../docs/modules/workshop-rankings.md).

Every control saves on change and renders its confirmation from the current response.
Family composition belongs to [phases](../architecture/phases.md) §6, not to the
control renderer. A failed save returns the control to its stored state and says so;
nothing is queued in the browser.

The Worker includes each section's phase status, Zieltermin and `late_contact` in
the family response. A passed Zieltermin keeps the controls editable; it is a prompt
to contact the organisers, not a write barrier. A late family change is an ordinary
authorised event; it changes current derived state but never changes a closed
result by itself. When the area is closed, the section's controls are not
effective: they show saved values read-only with the closed-input notice, and a
family write to them is rejected on append ([features](../architecture/features.md) §4)
until the area is reopened.

## 12. Tests

- Every `family_facing.control` has a renderer.
- Every `family_facing` trait appears in exactly one section.
- Module controls are unique, selected, authorised and do not redefine built-in keys.
- Closing an area never hides saved values; it shows them read-only.
- A passed Zieltermin shows the section's late notice while controls remain editable.
- Late family writes are accepted through the ordinary ownership and label rules
  while the area is open, and rejected once it is closed.
- A family cannot set an `organiser_only` trait or a strength its control does not
  allow.
- `valid_for` failures render disabled with the reason.

## 13. When not selected

The family view has no preferences page. It still shows permitted live information,
fixed arrangements and shared reports under [phases](../architecture/phases.md). Organisers enter
preferences and participation through their module screens — the same D24
parity requirement this module satisfies through the shared control union
when it is selected.
