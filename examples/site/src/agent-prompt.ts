// The prompt the home page's CTA copies. It gives an agent everything it needs
// to adopt the package in an existing Foldkit app without re-deriving the
// architecture from the README.
export const agentPrompt = `Add foldkit-ui-sdk to this Foldkit app.

Read these first:
- https://github.com/foldkit/foldkit-ui-sdk/blob/main/README.md
- https://github.com/foldkit/foldkit-ui-sdk/blob/main/docs/architecture.md
- https://foldkit.dev/core/routing-and-navigation

Install it:
  pnpm add foldkit-ui-sdk

How to use it:
- Import one entry per component (foldkit-ui-sdk/dialog) so only those tags register, or the root entry (foldkit-ui-sdk) for prototypes.
- Every part is a CustomElementSpec. Bind it with X.withMessage(h), set its properties from the Model, and dispatch Messages from its *change events.
- Keep the Model in Foldkit and the element's DOM state in UI SDK: never copy primitive state into the Model or Foldkit state into the element.
- Navigation is Foldkit routing: define routes once with defineRouteUnion, parse with Route.parseUrlWithFallback in init, and handle ClickedLink / ChangedUrl in update.
- Async work belongs in a Command, including the agent bridge and anything that touches navigator APIs.

Rules that keep the seam honest:
- Do not reimplement a component's behavior; the Web Components own keyboard, focus, selection and ARIA.
- Do not hand-write the generated entries under packages/foldkit-ui-sdk/src/entries; they come from @ui-sdk/web's manifest.
- A property the manifest types as Schema.Unknown stays unknown until there is a real mapping.

Verify with: pnpm run typecheck && pnpm test && pnpm run test:e2e`
