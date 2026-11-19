// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/autocomplete"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Suggest text while someone types, without limiting what they can enter.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Root = CustomElement.define({
  tag: "ui-autocomplete",
  properties: {
    value: Schema.String,
    open: Schema.Boolean,
    items: Schema.Unknown,
    emptyItems: Schema.Unknown,
    announcement: Schema.Unknown,
    filter: Schema.Unknown,
    container: Schema.Unknown,
    defaultValue: Schema.String,
    defaultOpen: Schema.Boolean,
    inlineComplete: Schema.Boolean,
    autoHighlight: Schema.Boolean,
    openOnFocus: Schema.Boolean,
    submitOnSelect: Schema.Boolean,
    status: Schema.Literals(["error", "idle", "loading"]),
    loop: Schema.Boolean,
    modal: Schema.Union([Schema.Boolean, Schema.Literal("pointer")]),
    presentation: Schema.Literals(["popover", "sheet", "auto"]),
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
    name: Schema.String,
    form: Schema.String,
    dismissible: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
    "openchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
    "openchangecomplete": Schema.Struct({ value: Schema.Boolean }),
    "submit": Schema.Struct({ value: Schema.String }),
    "highlight": Schema.Struct({ value: Schema.Unknown }),
    "loadmore": Schema.Struct({}),
    "dismissattempt": Schema.Struct({ reason: Schema.String }),
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Arrow = CustomElement.define({
  tag: "ui-autocomplete-arrow",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Clear = CustomElement.define({
  tag: "ui-autocomplete-clear",
  properties: {
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Content = CustomElement.define({
  tag: "ui-autocomplete-content",
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
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Empty = CustomElement.define({
  tag: "ui-autocomplete-empty",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Group = CustomElement.define({
  tag: "ui-autocomplete-group",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const GroupLabel = CustomElement.define({
  tag: "ui-autocomplete-group-label",
  properties: {
  },
  events: {
  },
})

/**
 * Wrappers, so the field stays a real input and the buttons real buttons.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Input = CustomElement.define({
  tag: "ui-autocomplete-input",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Item = CustomElement.define({
  tag: "ui-autocomplete-item",
  properties: {
    value: Schema.String,
    label: Schema.String,
    keywords: Schema.Array(Schema.String),
    disabled: Schema.Boolean,
    index: Schema.Number,
  },
  events: {
  },
})

/**
 * An icon inside a suggestion. Screen readers and filtering skip it.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const ItemIcon = CustomElement.define({
  tag: "ui-autocomplete-item-icon",
  properties: {
    mirror: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Its text, with what the field's text matched in <mark>. It holds text only.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const ItemText = CustomElement.define({
  tag: "ui-autocomplete-item-text",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Label = CustomElement.define({
  tag: "ui-autocomplete-label",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const List = CustomElement.define({
  tag: "ui-autocomplete-list",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Separator = CustomElement.define({
  tag: "ui-autocomplete-separator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Status = CustomElement.define({
  tag: "ui-autocomplete-status",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-autocomplete>`.
 * @see https://ui-sdk.dev/docs/web-components/components/autocomplete
 */
export const Trigger = CustomElement.define({
  tag: "ui-autocomplete-trigger",
  properties: {
  },
  events: {
  },
})
