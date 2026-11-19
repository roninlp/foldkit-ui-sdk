// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/popover"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Edit or explore something beside its trigger.
 * @see https://ui-sdk.dev/docs/web-components/components/popover
 */
export const Root = CustomElement.define({
  tag: "ui-popover",
  properties: {
    open: Schema.Boolean,
    container: Schema.Unknown,
    defaultOpen: Schema.Boolean,
    modal: Schema.Union([Schema.Boolean, Schema.Literal("trap-focus")]),
    openOnHover: Schema.Boolean,
    delay: Schema.Number,
    closeDelay: Schema.Number,
    presentation: Schema.Literals(["popover", "sheet", "auto"]),
    dismissible: Schema.Boolean,
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
    "dismissattempt": Schema.Struct({ reason: Schema.String }),
  },
})

/**
 * Part of `<ui-popover>`.
 * @see https://ui-sdk.dev/docs/web-components/components/popover
 */
export const Arrow = CustomElement.define({
  tag: "ui-popover-arrow",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-popover>`.
 * @see https://ui-sdk.dev/docs/web-components/components/popover
 */
export const Close = CustomElement.define({
  tag: "ui-popover-close",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-popover>`.
 * @see https://ui-sdk.dev/docs/web-components/components/popover
 */
export const Content = CustomElement.define({
  tag: "ui-popover-content",
  properties: {
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    align: Schema.Literals(["center", "start", "end"]),
    sideOffset: Schema.Number,
    alignOffset: Schema.Number,
    collisionPadding: Schema.Number,
    container: Schema.Unknown,
    arrowPadding: Schema.Number,
    anchor: Schema.String,
    initialFocus: Schema.Unknown,
    finalFocus: Schema.Unknown,
    keepMounted: Schema.Boolean,
    inline: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-popover>`.
 * @see https://ui-sdk.dev/docs/web-components/components/popover
 */
export const Description = CustomElement.define({
  tag: "ui-popover-description",
  properties: {
  },
  events: {
  },
})

/**
 * Shows the shortcut of the trigger it's in, or its own `shortcut`, when it has no text of its own.
 * @see https://ui-sdk.dev/docs/web-components/components/popover
 */
export const Shortcut = CustomElement.define({
  tag: "ui-popover-shortcut",
  properties: {
    shortcut: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-popover>`.
 * @see https://ui-sdk.dev/docs/web-components/components/popover
 */
export const Title = CustomElement.define({
  tag: "ui-popover-title",
  properties: {
  },
  events: {
  },
})

/**
 * With `for="popover-id"`, it opens that popover from anywhere on the page.
 * @see https://ui-sdk.dev/docs/web-components/components/popover
 */
export const Trigger = CustomElement.define({
  tag: "ui-popover-trigger",
  properties: {
    payload: Schema.Unknown,
    disabled: Schema.Boolean,
    focusableWhenDisabled: Schema.Boolean,
    shortcut: Schema.String,
  },
  events: {
  },
})
