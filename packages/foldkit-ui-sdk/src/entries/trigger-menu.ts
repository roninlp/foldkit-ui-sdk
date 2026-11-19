// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/trigger-menu"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * "Opens suggestions at the caret when you type a trigger such as @, /, or #."
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const Root = CustomElement.define({
  tag: "ui-trigger-menu",
  properties: {
    open: Schema.Boolean,
    triggers: Schema.Array(Schema.Unknown),
    editor: Schema.Unknown,
    container: Schema.Unknown,
    pendingAnnouncement: Schema.String,
    status: Schema.Literals(["error", "idle", "loading"]),
    autoHighlight: Schema.Boolean,
    loop: Schema.Boolean,
    shortcut: Schema.String,
    dismissible: Schema.Boolean,
  },
  events: {
    "openchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
    "openchangecomplete": Schema.Struct({ value: Schema.Boolean }),
    "querychange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
    "itemselect": Schema.Unknown,
    "dismissattempt": Schema.Struct({ reason: Schema.String }),
  },
})

/**
 * Part of `<ui-trigger-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const Content = CustomElement.define({
  tag: "ui-trigger-menu-content",
  properties: {
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    align: Schema.Literals(["center", "start", "end"]),
    sideOffset: Schema.Number,
    alignOffset: Schema.Number,
    collisionPadding: Schema.Number,
    arrowPadding: Schema.Number,
    container: Schema.Unknown,
    anchor: Schema.String,
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-trigger-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const Empty = CustomElement.define({
  tag: "ui-trigger-menu-empty",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-trigger-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const Group = CustomElement.define({
  tag: "ui-trigger-menu-group",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-trigger-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const GroupLabel = CustomElement.define({
  tag: "ui-trigger-menu-group-label",
  properties: {
  },
  events: {
  },
})

/**
 * Without content, the hint shows the arguments to type.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const Hint = CustomElement.define({
  tag: "ui-trigger-menu-hint",
  properties: {
  },
  events: {
  },
})

/**
 * A wrapper, so the field stays a real textarea or input.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const Input = CustomElement.define({
  tag: "ui-trigger-menu-input",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-trigger-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const Item = CustomElement.define({
  tag: "ui-trigger-menu-item",
  properties: {
    value: Schema.Unknown,
    label: Schema.String,
    keywords: Schema.Array(Schema.String),
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * An icon inside a suggestion. Screen readers and filtering skip it.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const ItemIcon = CustomElement.define({
  tag: "ui-trigger-menu-item-icon",
  properties: {
    mirror: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-trigger-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const List = CustomElement.define({
  tag: "ui-trigger-menu-list",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-trigger-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const Separator = CustomElement.define({
  tag: "ui-trigger-menu-separator",
  properties: {
  },
  events: {
  },
})

/**
 * Without content, the status says the count and the keys.
 * @see https://ui-sdk.dev/docs/web-components/components/trigger-menu
 */
export const Status = CustomElement.define({
  tag: "ui-trigger-menu-status",
  properties: {
  },
  events: {
  },
})
