# Contributing to zhumoben

Thanks for taking the time to contribute.

## Before you start

- For a bug, open an issue with a minimal reproduction (a `question.mdx` or a
  `scorecard.json` that triggers it is ideal).
- For a feature, open an issue first. zhumoben is deliberately small; a feature
  that turns it into an ATS will be declined.
- For a typo or a broken link, just send the PR.

## Development setup

```bash
git clone git@github.com:zhumoben/zhumoben.git
cd zhumoben
pnpm install
pnpm dev          # examples/demo, talking to the workspace package
```

Useful commands:

```bash
pnpm typecheck    # tsc --noEmit across the workspace
pnpm test         # vitest
pnpm build        # bundles packages/kit into dist/
```

## Project layout

```
packages/kit/
├─ app/       React app served by `zhumoben dev` (Vite root)
├─ shared/    types and pure helpers used by both app and node
├─ src/       CLI, Vite plugin, records store, export renderer
└─ templates/ Handlebars templates for the Markdown / HTML export
examples/demo/  a consumer project used for development
```

## Rules of the codebase

1. **Types are the contract.** `packages/kit/shared/types.ts` is the single
   source of truth; the zod schema in `src/schema.ts` must stay in sync.
2. **No filesystem writes outside `records/`.** The tool owns exactly two
   directories in the consumer project: `questions/` (read) and `records/`
   (read/write).
3. **Keep the bundle boring.** No state library, no router library, no UI kit.
   The app is a handful of components and a hash router.
4. **Colour means something.** The palette is documented in `NOTICE.md`; a new
   colour must map to a semantic state (accent, amber, gray, red).
5. **Every write is a rename-safe operation.** If you touch the records path
   logic, run the tests in `src/server/records.test.ts`.

## Commit messages

Conventional commits, please:

```
feat(records): rename file when the candidate changes
fix(mdx): keep fenced code blocks out of the TOC
docs: explain how band coverage is validated
```

## Pull requests

- Keep the diff focused.
- Add or update a test when you touch `shared/` or `src/server/`.
- Run `pnpm typecheck && pnpm test` before opening the PR.
- If the change is user-visible, add a changeset:

```bash
pnpm dlx @changesets/cli
```

## Code of conduct

By participating you agree to the [Code of Conduct](./CODE_OF_CONDUCT.md).
