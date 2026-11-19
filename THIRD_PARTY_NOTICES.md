# Third-party notices

`foldkit-ui-sdk` is MIT-licensed. Its generated bindings embed short descriptions and the
public tag, property and event names from UI SDK, and its types and runtime come from Foldkit.

## UI SDK

- Source: https://github.com/vercel-labs/ui
- License: Apache License 2.0 (see [LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt))
- Used as: the `@ui-sdk/web` dependency, and the `custom-elements.json` manifest the bindings
  are generated from. Generated JSDoc summaries quote UI SDK's element descriptions.

## Foldkit

- Source: https://github.com/foldkit/foldkit
- License: MIT (see [LICENSES/MIT-Foldkit.txt](LICENSES/MIT-Foldkit.txt))
- Used as: a peer dependency (`foldkit`, `effect`). No Foldkit source is copied.
