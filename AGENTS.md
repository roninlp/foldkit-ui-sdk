# foldkit-ui-sdk

Typed Foldkit bindings for UI SDK's Web Components. Read `README.md` and
`docs/architecture.md` first.

## Commands

```bash
pnpm install
pnpm run generate         # rewrite src/entries and src/index.ts from the manifest
pnpm run check:generated  # fail when generated files are stale
pnpm run typecheck
pnpm test                 # unit tests against the manifest
pnpm run test:e2e         # Playwright against examples/poc
pnpm run check            # all of the above
```

## Rules

- **Generated files are not edited by hand.** `packages/foldkit-ui-sdk/src/entries/*.ts` and
  `src/index.ts` come from `scripts/generate.mjs`. Change the generator, then regenerate.
- **Never make a component depend on Foldkit-specific state.** The element owns its DOM; the
  app owns the Model. Bindings only translate properties and events.
- **Keep the namespace shape.** One entry per UI SDK entry, `Root` for the root tag, and the
  part name UI SDK uses elsewhere. A new tag with no obvious name is a signal to improve the
  naming rule, not to invent a one-off export.
- **Do not guess event detail shapes.** A type the manifest states imprecisely stays
  `Schema.Unknown` until there is a real mapping.
- **No runtime dependency beyond `@ui-sdk/web`.** `foldkit` and `effect` are peers; the package
  must not bundle another copy.
- **Tests are the contract.** A new binding needs the generated test to cover it, and any
  interaction change needs a Playwright assertion.

## Layout

- `packages/foldkit-ui-sdk`: the published package.
- `examples/poc`: the working Foldkit app the browser test drives.
- `tests`: Playwright specs.
- `docs`: architecture and the generated component index.
