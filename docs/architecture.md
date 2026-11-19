# Architecture

`foldkit-ui-sdk` is a binding layer. It does not reimplement a component, render markup, or
own state. UI SDK owns the behavior inside its Web Components; Foldkit owns the application
Model and the property/event seam.

## Layers

| Layer | Path | Owns |
| --- | --- | --- |
| Generated bindings | `packages/foldkit-ui-sdk/src/entries/<entry>.ts` | One `CustomElement.define` spec per `ui-*` tag, plus the side-effect import that registers that entry's elements |
| Root barrel | `packages/foldkit-ui-sdk/src/index.ts` | `export * as <Component>` per entry, and the pinned UI SDK version |
| Tooling | `src/testing.ts`, `src/agent.ts`, `src/observe.ts`, `src/shortcuts.ts` | Re-exports of UI SDK's framework-agnostic helpers, so one package covers components, testing and agents |
| Generator | `packages/foldkit-ui-sdk/scripts/generate.mjs` | Reads `@ui-sdk/web/custom-elements.json` and writes both layers |
| Tests | `packages/foldkit-ui-sdk/test/` | Coverage against the same manifest; browser behavior in `tests/` |
| Examples | `examples/site` | One Foldkit app: the marketing site, per-component docs pages that run their component live, the sixteen-demo showcase, and the agents demo |

The package ships TypeScript source, like UI SDK's own adapters, so a consumer needs a bundler
that compiles TypeScript dependencies. It has no build step and no bundled runtime.

## Why Web Components

Foldkit's view is `Model -> Document`. There are no component instances, hooks or refs, and
event attributes dispatch Messages. UI SDK's primitives are the opposite shape: an external
store, a `bind(el)` lifecycle, and synchronous event handlers that move focus and call
`preventDefault()`.

A native renderer would need to invent a component instance in Foldkit and route every DOM
event through `update`. Keyboard, typeahead, pointer and focus work cannot survive that
round-trip, and the resulting state systems would duplicate each other.

`CustomElement.define` is the seam Foldkit provides for exactly this: JavaScript properties in,
`CustomEvent`s out, and the element owns its own DOM. That keeps both architectures intact.

## The manifest pipeline

`@ui-sdk/web` publishes `custom-elements.json`, generated from its real `createParts` calls.
For every declaration with a `tagName`, the generator emits:

- `properties`: each writable field except `api`, `controller` and `debug`, typed as narrowly
  as the manifest's type text allows (`boolean`, `string`, `number`, literal unions, arrays,
  nullish unions), else `Schema.Unknown`.
- `events`: every event. Change events become `{ value, reason, source }`; open-complete,
  dismiss-attempt, highlight, load-more and simple `CustomEvent<{…}>` payloads get their own
  shapes; the rest stay `Schema.Unknown` instead of inventing a type.

Naming follows the component: `ui-toggle` is `Root` inside `Toggle`, `ui-tabs-tab` is `Tab`
inside `Tabs`, and `ui-overlay-host` is `OverlayHost` inside `Overlays`. A duplicate name in one
entry fails generation instead of silently renaming.

Imports mirror UI SDK's entries, so a bundle only registers what it renders:

```ts
import * as Menu from 'foldkit-ui-sdk/menu'        // defines the ui-menu tags
import { Menu } from 'foldkit-ui-sdk'              // defines everything
```

## Testing

- `test/generated.test.ts` compares the generated specs with the manifest: every tag, every
  event, no framework-only properties, one namespace per entry, and a pinned UI SDK version.
- `tests/site.spec.ts` drives the site in Chromium: navigation through a SegmentedControl,
  the docs sidebar and its per-component pages (each running its demo live), all sixteen
  showcase components one Model round-trip at a time, the component index parsed from the
  generated `docs/components.md`, the live agent bridge flipping a Switch through a Foldkit
  Command, and the light color-scheme pin that keeps component text readable under a
  dark-mode OS.
- `scripts/screenshot.mjs` recaptures `docs/screenshot.png` from the site's showcase page;
  run it with `pnpm run screenshot`.

## Upgrading UI SDK

1. Bump `@ui-sdk/web` in `packages/foldkit-ui-sdk/package.json`.
2. `pnpm install`
3. `pnpm run generate`
4. `pnpm run check` (generated check, typecheck, unit tests, Playwright)

If a new event or property gets `Schema.Unknown` and deserves a type, improve the parser or add
an explicit mapping in `scripts/generate.mjs`; never hand-edit a generated file.

## Limits

- **SSR**: UI SDK's Web Components calculate ARIA in the browser, so a Foldkit server-rendered
  page has the tags but not their state attributes before upgrade.
- **Cancellation**: `CustomElement.define` hands the event factory a decoded `detail`, not the
  `CustomEvent`, so a Foldkit view cannot call `preventDefault()` to refuse a change. A
  controlled property written on the next render still wins.
- **Attributes without properties**: a few part attributes (`for`, `as-child`) have no
  JavaScript property. Keep parts inside their root, or render the tag through Foldkit's
  `h.customElement()` and set the attribute yourself.
