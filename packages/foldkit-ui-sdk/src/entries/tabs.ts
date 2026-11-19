// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/tabs"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Switch between related panels with one tab selected at a time.
 * @see https://ui-sdk.dev/docs/web-components/components/tabs
 */
export const Root = CustomElement.define({
  tag: "ui-tabs",
  properties: {
    value: Schema.NullOr(Schema.String),
    defaultValue: Schema.NullOr(Schema.String),
    orientation: Schema.Literals(["horizontal", "vertical"]),
    activation: Schema.Literals(["automatic", "manual"]),
    loop: Schema.Boolean,
    hiddenUntilFound: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.NullOr(Schema.String),
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-tabs>`.
 * @see https://ui-sdk.dev/docs/web-components/components/tabs
 */
export const Indicator = CustomElement.define({
  tag: "ui-tabs-indicator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-tabs>`.
 * @see https://ui-sdk.dev/docs/web-components/components/tabs
 */
export const List = CustomElement.define({
  tag: "ui-tabs-list",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-tabs>`.
 * @see https://ui-sdk.dev/docs/web-components/components/tabs
 */
export const Panel = CustomElement.define({
  tag: "ui-tabs-panel",
  properties: {
    value: Schema.String,
    keepMounted: Schema.Boolean,
    hiddenUntilFound: Schema.Boolean,
  },
  events: {
  },
})

/**
 * A wrapper, so the tab stays a real button with its built-in behavior. It has no role, so the tab list still sees its tabs as direct children.
 * @see https://ui-sdk.dev/docs/web-components/components/tabs
 */
export const Tab = CustomElement.define({
  tag: "ui-tabs-tab",
  properties: {
    value: Schema.String,
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * An icon inside a tab's button. Screen readers skip it.
 * @see https://ui-sdk.dev/docs/web-components/components/tabs
 */
export const TabIcon = CustomElement.define({
  tag: "ui-tabs-tab-icon",
  properties: {
    mirror: Schema.Boolean,
  },
  events: {
  },
})
