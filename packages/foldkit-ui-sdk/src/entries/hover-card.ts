// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/hover-card"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Preview a link on hover or keyboard focus while keeping its normal navigation.
 * @see https://ui-sdk.dev/docs/web-components/components/hover-card
 */
export const Root = CustomElement.define({
  tag: "ui-hover-card",
  properties: {
    open: Schema.Boolean,
    container: Schema.Unknown,
    defaultOpen: Schema.Boolean,
    delay: Schema.Number,
    closeDelay: Schema.Number,
    disabled: Schema.Boolean,
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
 * Part of `<ui-hover-card>`.
 * @see https://ui-sdk.dev/docs/web-components/components/hover-card
 */
export const Arrow = CustomElement.define({
  tag: "ui-hover-card-arrow",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-hover-card>`.
 * @see https://ui-sdk.dev/docs/web-components/components/hover-card
 */
export const Content = CustomElement.define({
  tag: "ui-hover-card-content",
  properties: {
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    align: Schema.Literals(["center", "start", "end"]),
    sideOffset: Schema.Number,
    alignOffset: Schema.Number,
    collisionPadding: Schema.Number,
    container: Schema.Unknown,
    arrowPadding: Schema.Number,
    anchor: Schema.String,
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * The trigger wraps the user's own link, so it stays one. With `for="card-id"`, it opens that card from anywhere on the page.
 * @see https://ui-sdk.dev/docs/web-components/components/hover-card
 */
export const Trigger = CustomElement.define({
  tag: "ui-hover-card-trigger",
  properties: {
    payload: Schema.Unknown,
  },
  events: {
  },
})
