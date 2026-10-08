# UI-14 — Workshop spaces

## Audience, purpose, and route

Organisers maintain physical workshop spaces and the schedule context that
affects their availability. Route: `/organiser/workshops/spaces`.

The view is not accommodation inventory. A workshop space is a typed physical
entity with a name, location description, capacity, availability windows,
resolver-backed capabilities, and deterministic order.

## Controls

- Add, edit, and remove actions create event-backed changes. Removal retires
  the identity and preserves historical derivation.
- Capability editing is simple and supports multiple generic values. The
  configured resolver, not the screen, decides whether a workshop need is met.
- Slots are maintained on the dedicated slots view. This screen shows their
  occupancy context and provides a simple per-space/per-slot block control.
- Block and unblock actions remain event-backed typed constraints consumed by
  scheduling.

## Responsive and print behavior

Cards work at narrow widths without hover or drag interaction. Tables gain an
accessible card alternative where necessary. Browser printing shows the space
inventory and schedule context without interactive controls. No in-app print or
export action exists.

## Acceptance criteria

- Invalid capacity, names, timestamps, reversed or overlapping windows fail at
  append and replay.
- A retired space is absent from current scheduler input and remains available
  in labelled history.
- Space-slot blocks affect only the selected pair and produce an explainable
  scheduler finding when they prevent placement.
- The screen works with and without accommodation inventory selected.
