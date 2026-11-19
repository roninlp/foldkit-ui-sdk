# Contributing

Read [AGENTS.md](AGENTS.md) for the rules and [docs/architecture.md](docs/architecture.md) for
how the pieces fit.

```bash
pnpm install
pnpm run check
```

`pnpm run check` verifies the generated bindings are current, typechecks the package and the
example, runs the manifest tests, and drives the example in Chromium.

When changing a binding, change `packages/foldkit-ui-sdk/scripts/generate.mjs` and run
`pnpm run generate`. Never edit `src/entries/*.ts` or `src/index.ts` by hand.

When upgrading UI SDK, bump `@ui-sdk/web` (and its `@ui-sdk/core` peer), install, regenerate,
and run the full check. Include the regenerated entries in the same commit.

## CI

The workflow is [docs/ci.yml](docs/ci.yml). Pushing a file under `.github/workflows/` needs
the `workflow` scope on the GitHub token; after `gh auth refresh -s workflow`, copy it to
`.github/workflows/ci.yml` and commit. Until then, `pnpm run check` is the same set of steps.
