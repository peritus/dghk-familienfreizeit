# Local UI contract

The repository uses Storybook as a local, git-native design-system workbench.
It requires no account, hosted service, MCP server, or external design file.
Stories import the real React components and render them with the same Tailwind
and CSS-token pipeline used by the application.

## What belongs where

- Storybook stories (`*.stories.tsx`) show the executable visual states: default,
  variants, loading, empty, error, responsive, and representative populated
  screens.
- The style-guide MDX page records why and when a primitive is appropriate and
  composes the same stories with `Canvas`. It is guidance, not a second visual
  implementation.
- `src/app/design/tokens.ts` names the CSS custom properties and their semantic
  roles without duplicating runtime values from `globals.css`.
- `src/app/design/ui-coverage.ts` is the review index. Every current public
  component, application composition, and screen has a Storybook id and source
  path there.
- `test/storybook/style-guide.spec.ts` checks that every index entry resolves and
  takes a Playwright snapshot of every component/application/screen entry.

Storybook's visible tree follows ownership rather than implementation depth:

- `Foundations/` contains tokens and the style guide.
- `Shared/` contains app-wide primitives, icons, and reusable patterns.
- `Application/` contains shell and organiser-wide compositions.
- `Screens/` contains route-level screens owned by the application host.
- `Modules/<module>/` contains module-owned components and screens, using the
  exact lowercase module ID from `src/modules/` (for example,
  `Modules/room-assignment/`).

The story title and source folder must agree on ownership. A component shared by
multiple modules belongs in `Shared/` or `Application/`; it must not be placed
under an arbitrary module only to shorten a Storybook tree. Module stories are
kept beside their implementation under `src/modules/<module>/app/`.

This split keeps intent readable in Markdown while the browser renders and
tests the actual implementation. A story is not a mockup: it is a small,
deterministic fixture around the production component.

The global preview decorator gives every story its own in-memory router. Stories
must not write `window.history` or navigate the preview iframe itself. Components
may exercise ordinary and hash-bearing links inside that isolated router; a story
that needs a non-root starting location declares `parameters.route.path`. The
Storybook interaction suite verifies that route changes leave the iframe URL
unchanged.

## Local workflow

```sh
nix develop -c npm run storybook
nix develop -c npm run storybook:build
nix develop -c npm run test:storybook
nix develop -c npm run test:storybook:update
```

Run the update command only when the visual change is intentional and the new
PNG baselines have been reviewed. Baselines are committed under
`test/storybook/style-guide.spec.ts-snapshots/`; they are the repository-local
visual contract, not generated release artefacts.

When adding a component or screen:

1. Add a story beside the implementation and document its usage decision in the
   story's `parameters.docs.description.component` or the style-guide MDX page.
2. Use a shared deterministic fixture for derived application state rather than
   inventing a parallel rendering path.
3. Add the story id, subject, and source path to `uiCoverage`.
4. Run the visual test and inspect the baseline. Keep interaction and domain
   behavior tests in Vitest or the application Playwright suite as appropriate;
   the visual test is the final rendered-contract check.

Storybook is a development and review surface. It does not claim that an
unimplemented screen is complete, and the coverage list deliberately contains
only renderables that currently exist in `src/app`.
