// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/tooltip"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Name a control or add a short hint on hover and keyboard focus.
 * @see https://ui-sdk.dev/docs/web-components/components/tooltip
 */
export const Root = CustomElement.define({
  tag: "ui-tooltip",
  properties: {
    open: Schema.Boolean,
    container: Schema.Unknown,
    defaultOpen: Schema.Boolean,
    delay: Schema.Number,
    closeDelay: Schema.Number,
    disabled: Schema.Boolean,
    toggleable: Schema.Boolean,
    closeOnPress: Schema.Boolean,
    type: Schema.Literals(["label", "description"]),
    shortcut: Schema.String,
  },
  events: {
    "openchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
    "openchangecomplete": Schema.Struct({ value: Schema.Boolean }),
    "payloadchange": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-tooltip>`.
 * @see https://ui-sdk.dev/docs/web-components/components/tooltip
 */
export const Arrow = CustomElement.define({
  tag: "ui-tooltip-arrow",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-tooltip>`.
 * @see https://ui-sdk.dev/docs/web-components/components/tooltip
 */
export const Content = CustomElement.define({
  tag: "ui-tooltip-content",
  properties: {
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    align: Schema.Literals(["center", "start", "end"]),
    sideOffset: Schema.Number,
    alignOffset: Schema.Number,
    collisionPadding: Schema.Number,
    container: Schema.Unknown,
    arrowPadding: Schema.Number,
    anchor: Schema.String,
  },
  events: {
  },
})

/**
 * Shows the tooltip's shortcut, or its own `shortcut`, when it has no text of its own.
 * @see https://ui-sdk.dev/docs/web-components/components/tooltip
 */
export const Shortcut = CustomElement.define({
  tag: "ui-tooltip-shortcut",
  properties: {
    shortcut: Schema.String,
  },
  events: {
  },
})

/**
 * The trigger wraps the user's own button or link, so it stays one. Inside another component's trigger, like <ui-menu-trigger>, it's the button deepest in. With `for="tooltip-id"`, it shows that tooltip from anywhere on...
 * @see https://ui-sdk.dev/docs/web-components/components/tooltip
 */
export const Trigger = CustomElement.define({
  tag: "ui-tooltip-trigger",
  properties: {
    payload: Schema.Unknown,
  },
  events: {
  },
})
