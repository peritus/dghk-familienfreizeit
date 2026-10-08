# UI-15 — Feature availability (deferred)

This organiser screen is accepted but deferred. Defining features and switching
them operationally is a system-administration task: features are defined in code
and the profile, and switched through `DGHK_FEATURE_*` bindings whose state is
visible in the startup log and the health response
([features](../architecture/features.md) §6). Promotion follows the
[deferred-ideas rules](README.md).

## Audience, purpose, and route

Organisers open this screen to answer "what does this deployment offer, and
why?" Route: `/organiser/features`, navigation label **Funktionen**. Governing
spec: [features](../architecture/features.md) §6–7.

The screen is a kernel organiser surface. It is always present, is not itself a
feature, and renders the organiser feature view; it computes no layer locally.

## Content

One table, one row per declared feature, grouped by owning module in catalogue
order and sorted by feature id within a module:

| Column | Content |
|---|---|
| Funktion | The feature's localized name, with its id in a secondary line |
| Zielgruppe | **Familien** or **Organisationsteam** |
| Profil | **ausgewählt** or **nicht ausgewählt** |
| Umgebung | empty when no binding is set; otherwise **eingeschaltet** or **ausgeschaltet** with the binding name |
| Phase | **aktiv**, or the governing phase that is not active |
| Bereit | **ja**, or the not-ready reason linking to its finding |
| Wirksam | **ja** or **nein**, with the first failing layer named |

A row whose operational value differs from the built selection uses the
warning tone and states the difference as a sentence, for example **Per
Umgebung eingeschaltet, im Profil nicht ausgewählt.** Status is never conveyed
by colour alone.

## Dashboard hint

While any feature binding is set, the [organiser dashboard](../ui/screens/organiser-dashboard.md)
shows one Hinweis naming how many features differ from the profile, linking to
this screen. It is the only dashboard Hinweis not tied to a family.

## States

- **No overrides:** the table without warning rows and a short line stating that
  the deployment matches the profile.
- **Invalid binding:** the Worker refuses to serve the application, so this
  screen is never reached; the health response names the invalid bindings.

## Accessibility

The table has a caption and column headers. Warning rows carry their sentence as
text, not only an icon or tone. Follow [UI-00](../ui/design-system.md) for tables
and status tones.
