# Workshops

Workshop behavior is composed from direct workshop identity, physical spaces,
slots, rankings, and attendance:

- [official workshops](../../docs/modules/official-workshops.md) owns `workshop` identity and
  authoring facts;
- [workshop space](../../docs/modules/workshop-space.md) owns physical spaces and capabilities;
- [workshop scheduling](../../docs/modules/workshop-scheduling.md) owns slots and one placement;
- [workshop rankings](../../docs/modules/workshop-rankings.md) owns current-cycle choices; and
- [workshop attendance](../../docs/modules/workshop-assignment.md) owns allocation and traces.

The organiser route composes these contributions without reading raw event
payloads from another module. Self-organized workshops remain deferred. Family
controls use the same domain semantics through a separate family-facing
projection and UI.
