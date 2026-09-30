# Importing an HTML prototype into the component library

This guide describes the repository workflow for turning an HTML prototype into
a reusable, semantically composed React component library. It complements the
[HTML prototype rules](AGENTS.md). The prototype is the visual goal and a
source of interaction ideas; it is not a production implementation or a
domain contract.

## Outcome

An import is complete when:

- the original HTML artifact remains an unchanged, traceable snapshot;
- the prototype has an inventory of screens, states, responsive variants,
  print variants, dialogs, and meaningful visual regions;
- each reusable concept has been checked against the existing component
  catalogue before a new component is named;
- semantic components exist for the prototype's reusable concepts, including
  the smaller pieces that compose a screen;
- every component has synthetic Storybook fixtures for its meaningful states;
- approved existing screens use the canonical components where real data and
  event behavior already exist; and
- no prototype-only fixture, calculation, link, or screen-local lookup has
  become application behavior.

The target is not one React component per prototype screen. A screen is a
composition of shared chrome, semantic domain components, and data-driven
collections. The library should be useful for the next step, where screens are
built with real derived data and events.

## 1. Establish provenance and read the rules

Before touching application code:

1. Read this directory's `AGENTS.md`, the repository `AGENTS.md`, and the
   relevant frontend lifecycle guidance.
2. Record the source path, import date, scope, and whether the artifact was
   copied unchanged. Do not repair, reformat, or redesign the snapshot while
   importing it.
3. Check the prototype's fixture data for contact-like, health-like, or
   participant-like values. Replace them with clearly synthetic values in any
   new Storybook fixture; never carry real event data into the catalogue.
4. Treat visible prototype behavior as a hypothesis. It may guide visual
   composition, wording, responsive treatment, and accessibility review, but it
   does not authorize new entity kinds, labels, relationships, events,
   permissions, persistence, solver rules, or routes.

If the prototype has not yet been imported, create or copy it as a separate
provenance change. Keep generated assets and build output out of
`spec/html-prototypes/`.

## 2. Inventory before extracting

Read the complete artifact and make an inventory before implementing. For each
screen or view, record:

- screen purpose and navigation context;
- repeated page chrome and lifecycle/navigation elements;
- sections and their semantic responsibilities;
- data collections, row/card variants, filters, and sort/group controls;
- statuses, loading, error, empty, blocked, and conflict states;
- dialogs, forms, confirmations, and action affordances;
- desktop, narrow, and print presentations;
- accessibility requirements suggested by the markup; and
- which values are fixture-only versus which would need real derived data.

Then split the inventory into three levels:

| Level | Meaning | Examples |
|---|---|---|
| Shared primitive | General UI behavior already expected across domains | button, badge, alert, dialog, tabs, data table |
| Semantic component | A reusable concept with domain vocabulary but no screen ownership | workshop identity, slot row, demand bar, attendance cell, choice trace |
| Composition | A data-driven arrangement of semantic components for one route or view | workshop overview, programme, participation review |

Do not skip the semantic level. If a prototype section appears in more than one
view, has a meaningful state, or represents a concept a user can reason about,
it is a candidate semantic component even when it is visually small.

## 3. Check the existing catalogue first

Before naming a component, search all of these:

```sh
nix develop -c rg -n "ComponentName|visual phrase|prototype label" src/app src/modules docs spec
nix develop -c rg --files src/app/components src/app/organiser src/modules | sort
nix develop -c rg -n "title:|Canvas of=|uiCoverage|coverage" src/app
```

Inspect the implementation, stories, and coverage entry of every plausible
match. Record one of these outcomes for each inventory item:

- reuse the existing component unchanged;
- extend the existing component because the responsibility is the same;
- compose existing components into a new semantic component; or
- create a new component because no canonical responsibility exists.

A new name must describe responsibility, not a prototype selector, page name,
visual shape, or one-off state. If the new component is necessary, record why
the closest existing component was not suitable. The canonical implementation
belongs in the normal source tree, not in the prototype directory.

## 4. Define a semantic component contract

For each new semantic component, decide before coding:

- the user-facing concept and the one responsibility it owns;
- the smallest useful inputs, typed as derived view data or explicit callbacks;
- the states it can render and how empty, loading, error, blocked, and conflict
  cases are represented;
- the semantic HTML structure, heading level, table relationships, labels, and
  accessible names;
- keyboard, focus, and dialog behavior for interactive parts;
- wide, narrow, and print behavior where the prototype shows variants;
- which strings are content/configuration and which are fixed UI semantics;
- how the component remains independent of domain lookup, event reduction, and
  relationship resolution; and
- which Storybook stories will prove the contract.

Prefer components such as `WorkshopDemandTable`, `AttendanceMatrix`,
`SlotDayGroup`, or `WorkshopConfirmationDialog` over components named after a
prototype section or CSS treatment. A semantic component may compose smaller
pieces, but it should not know which route owns it.

Component APIs are not required to mirror prototype markup. Prototype class
names and fixture object shapes are implementation details. Use typed props,
explicit callbacks, and stable semantic names instead.

## 5. Build the library before building new screens

Use this order for a prototype with multiple views:

1. Add or reuse shared shell components: page header, section header, tabs,
   lifecycle timeline, filters, notices, states, table wrappers, responsive
   collections, print framing, and row actions.
2. Add semantic components for identity, facts, statuses, resources, choice
   answers, demand, trace, participation, reports, and editors as applicable.
3. Add composition stories using synthetic fixtures that cover the prototype's
   visual goal and meaningful states.
4. Add catalogue/coverage entries and a barrel export when the package has
   multiple related modules.
5. Compose existing routes with the new components only where the application
   already has real derived data and event behavior. Preserve lifecycle,
   navigation, and binding rules.
6. Leave prototype-only views as library stories until their real contracts,
   data, and routes are explicitly approved and implemented.

This order prevents a screen implementation from becoming the accidental API.
It also lets the next implementation step supply real data to tested semantic
components rather than copying fixture markup into a route.

## 6. Storybook fixtures and catalogue coverage

Every component module should have nearby stories. Stories should demonstrate:

- the representative populated state;
- empty and loading/error states where the component supports them;
- status, conflict, or blocked variants shown by the prototype;
- narrow/responsive presentation when the component has a distinct variant;
- print or confidentiality treatment when relevant; and
- interactive behavior without requiring application state or a backend.

Use stable synthetic IDs and obviously fictional names such as `Mara Schmidt`
only when a person-shaped fixture is necessary. Keep fixture values local to
stories. Do not import the prototype's JavaScript data into production code.

Add each meaningful story to `src/app/design/ui-coverage.ts` with its Storybook
title and source. Coverage is an index of implemented, reviewable examples;
it is not evidence that a prototype-only screen is implemented. Keep the
coverage entry aligned with the actual story title.

## 7. Verification

Run commands through the repository flake. For a library import, the minimum
verification set is:

```sh
nix develop -c npm run format:check
nix develop -c npm run lint
nix develop -c npm run typecheck
nix develop -c npm run test
nix develop -c npm run storybook:build
nix develop -c npm run test:storybook
nix develop -c npm run test:docs
```

Also inspect the rendered stories at wide and narrow widths when responsive
behavior is part of the contract. Verify table headers, form labels, focus
return, dialog dismissal, status text, print framing, and any confidentiality
notice with the relevant tests or manual review. Visual similarity by itself
does not prove domain correctness or accessibility.

## 8. Review checklist

- [ ] The source artifact and its provenance are recorded.
- [ ] The original prototype remains unchanged.
- [ ] The complete prototype was inventoried, including non-primary views and
      responsive/print/dialog states.
- [ ] Existing primitives and semantic components were searched before adding
      names.
- [ ] Each new component has one semantic responsibility and a typed contract.
- [ ] Components use semantic HTML and preserve accessible names and states.
- [ ] Domain rules, derived-world lookups, event handling, and relationship
      resolution remain outside presentational components.
- [ ] Synthetic fixtures and meaningful states have Storybook stories.
- [ ] Stories are indexed in `ui-coverage.ts`.
- [ ] Existing real-data screens use the canonical components where approved.
- [ ] Prototype-only concepts remain stories until their real contract is
      approved.
- [ ] Format, lint, typecheck, tests, Storybook, and docs checks pass.
- [ ] The change summary names the catalogue matches, approved concept scope,
      consumers, and verification evidence.
