# Food preferences

Module id `food-preferences` · factory `foodPreferences`

## 1. Purpose and boundary

Food preferences records, for each person, one diet and optional free-text
allergies, and aggregates them for kitchen planning. It owns the per-person model,
the cardinality rules, and the food reports. It does not plan menus, order food, or
interpret allergy text.

The data belongs to the person, not the family. Family-level food tables are
derived counts, never an alternative family-level model.

## 2. Dependencies

Requires: none. Enhances: none.

## 3. Parameters

```ts
type FoodPreferencesParams = {
  diet_tag: string
  allergies_tag: string | null
  count_by_day: boolean
}
```

| Parameter | Default | Validation |
|---|---|---|
| `diet_tag` | — (required) | fills the diet role (§6) |
| `allergies_tag` | `null` | fills the allergies role (§6) |
| `count_by_day` | `true` | counts diets per occasion day from `meta.starts_on` to `meta.ends_on` |

## 4. Entity kinds

None.

## 5. Events

None of its own. Diet and allergies are `LabelSet` and `LabelCleared` events on
persons, set by the person's family or by an organiser.

```kdl
LabelSet entity_id=per_anna key=diet value=vegetarian strength=#null
LabelSet entity_id=per_jonas key=allergies-text value="2x Beifuß (sehr starke Allergie)" strength=#null
```

## 6. Labels and tag roles

Module-owned label keys: none.

| Role | Parameter | Required tag shape |
|---|---|---|
| Diet | `diet_tag` | `property`, scope `person`, value `enumOf(…)`, cardinality exactly one |
| Allergies | `allergies_tag` | `property`, scope `person`, value `text()`, cardinality zero or one, sensitivity `restricted` |

"Exactly one" is enforced as: setting a diet replaces the current value in the same
append, and a person without a diet appears on the chase list. Allergy text is
retained exactly as entered, including quantities and wording such as `1 x Eier`;
the module never parses it.

## 7. Solver input and stages

None. Food data is read from the world by reports; it does not affect any plan.

## 8. Rules and scoring

None.

## 9. Preflight checks

None. A missing diet is a chase-list item, not a plan diagnostic.

## 10. Output and diff

No plan section. The module exposes:

```ts
type FoodSummary = {
  by_diet: readonly { diet: string, persons: number }[]            // profile vocabulary order
  by_day: readonly { date: string, by_diet: readonly { diet: string, persons: number }[] }[]
  with_allergies: number
  missing_diet: readonly string[]                                   // person ids, sorted
}
```

Counts use people who are not withdrawn.

## 11. Screens, controls, reports, and emails

| Kind | Contribution |
|---|---|
| Controls | The diet tag uses `choice`; the allergies tag uses `free-text` ([family preferences](family-preferences.md)) |
| Screen | Diet and allergy columns on family detail; missing diets on the chase list |
| Reports | Food service overview (aggregates, may be shared); allergy and safety sheet (organiser-only, restricted); food part of the family information sheet ([reports](../application/reports.md) §3) |
| Emails | Reminder copy may name people without a diet |

Own food values are current after every save, independent of release control.
Aggregate diet counts may be shared. Individual allergy text never leaves organiser
and own-family views.

## 12. Tests

- A second diet value replaces the first; a person never holds two.
- Allergy text round-trips byte for byte.
- Withdrawn people are excluded from counts.
- The allergy sheet is unreachable with a family session.

## 13. When not selected

No food tags can be defined; the food reports, columns, and chase-list entries are
absent.
