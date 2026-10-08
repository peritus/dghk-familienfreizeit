# UI-07 — Family detail

The implemented organiser family-detail shell and its four topic views are
documented in
[`docs/application/organiser-view.md`](../../../docs/application/organiser-view.md)
and [`docs/ui/frontend.md`](../../../docs/ui/frontend.md). The stable UI-07
route identity is `/organiser/families/:id` with URL-backed topic and person
segments.

## Outstanding organiser contracts

The following broader organiser contracts remain outside the imported screen:

- fixed-result badges and expandable privacy-projected comparisons, plus the
  family's difference between closed result and current derivation;
- a preview of exactly what the family view shows;
- a keyboard-readable chronological event-history surface; and
- stale-log and restricted-data notices for those history surfaces.

These contracts remain governed by the organiser view and
[phases](../../architecture/phases.md) specifications. They must not be reintroduced as prototype-only local state or
as a second relationship or persistence model.
