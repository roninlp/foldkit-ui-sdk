// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/collapsible"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Show and hide a panel, preserve its contents, and animate its height.
 * @see https://ui-sdk.dev/docs/web-components/components/collapsible
 */
export const Root = CustomElement.define({
  tag: "ui-collapsible",
  properties: {
    open: Schema.Boolean,
    defaultOpen: Schema.Boolean,
    disabled: Schema.Boolean,
  },
  events: {
    "openchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
    "openchangecomplete": Schema.Struct({ value: Schema.Boolean }),
  },
})

/**
 * Part of `<ui-collapsible>`.
 * @see https://ui-sdk.dev/docs/web-components/components/collapsible
 */
export const Panel = CustomElement.define({
  tag: "ui-collapsible-panel",
  properties: {
    keepMounted: Schema.Boolean,
    hiddenUntilFound: Schema.Boolean,
  },
  events: {
  },
})

/**
 * A wrapper, so the trigger stays a real button with its built-in behavior.
 * @see https://ui-sdk.dev/docs/web-components/components/collapsible
 */
export const Trigger = CustomElement.define({
  tag: "ui-collapsible-trigger",
  properties: {
  },
  events: {
  },
})
