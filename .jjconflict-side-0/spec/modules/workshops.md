# Workshops

Workshop behavior is composed from direct workshop identity, physical spaces,
slots, rankings, and attendance:

- [official workshops](official-workshops.md) owns `workshop` identity and
  authoring facts;
- [workshop space](workshop-space.md) owns physical spaces and capabilities;
- [workshop scheduling](workshop-scheduling.md) owns slots and one placement;
- [workshop rankings](workshop-rankings.md) owns current-cycle choices; and
- [workshop attendance](workshop-assignment.md) owns allocation and traces.

The organiser route composes these contributions without reading raw event
payloads from another module. Self-organized workshops remain deferred. Family
controls use the same domain semantics through a separate family-facing
projection and UI.
