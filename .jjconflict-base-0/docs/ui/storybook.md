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

This split keeps intent readable in Markdown while the browser renders and
tests the actual implementation. A story is not a mockup: it is a small,
deterministic fixture around the production component.

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
