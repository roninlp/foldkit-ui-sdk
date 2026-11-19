// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/combobox"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Search a list of options and choose one or several values.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Root = CustomElement.define({
  tag: "ui-combobox",
  properties: {
    value: Schema.Unknown,
    query: Schema.String,
    open: Schema.Boolean,
    items: Schema.Unknown,
    emptyItems: Schema.Unknown,
    itemToValue: Schema.Unknown,
    itemToLabel: Schema.Unknown,
    isItemEqualToValue: Schema.Unknown,
    announcement: Schema.Unknown,
    filter: Schema.Unknown,
    name: Schema.String,
    container: Schema.Unknown,
    defaultValue: Schema.Unknown,
    defaultQuery: Schema.String,
    defaultOpen: Schema.Boolean,
    multiple: Schema.Boolean,
    maxSelected: Schema.Number,
    pendingAnnouncement: Schema.String,
    autoHighlight: Schema.Union([Schema.Boolean, Schema.Literal("always"), Schema.Literal("selected")]),
    keepQuery: Schema.Boolean,
    allowCustomValue: Schema.Boolean,
    status: Schema.Literals(["error", "idle", "loading"]),
    loop: Schema.Boolean,
    modal: Schema.Union([Schema.Boolean, Schema.Literal("pointer")]),
    presentation: Schema.Literals(["popover", "sheet", "auto"]),
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
    dismissible: Schema.Boolean,
  },
  events: {
    "querychange": Schema.Struct({
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
    "highlight": Schema.Struct({ value: Schema.Unknown }),
    "loadmore": Schema.Struct({}),
    "dismissattempt": Schema.Struct({ reason: Schema.String }),
    "valuechange": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Arrow = CustomElement.define({
  tag: "ui-combobox-arrow",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Chip = CustomElement.define({
  tag: "ui-combobox-chip",
  properties: {
    value: Schema.Unknown,
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const ChipRemove = CustomElement.define({
  tag: "ui-combobox-chip-remove",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Chips = CustomElement.define({
  tag: "ui-combobox-chips",
  properties: {
  },
  events: {
  },
})

/**
 * "+2 more" once chips don't fit on the chips' line. Rendering it turns collapsing on.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const ChipsOverflow = CustomElement.define({
  tag: "ui-combobox-chips-overflow",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Clear = CustomElement.define({
  tag: "ui-combobox-clear",
  properties: {
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Content = CustomElement.define({
  tag: "ui-combobox-content",
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
 * Without content, it offers to create the text: Create “…”. Listen for `create`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Create = CustomElement.define({
  tag: "ui-combobox-create",
  properties: {
    minLength: Schema.Number,
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Empty = CustomElement.define({
  tag: "ui-combobox-empty",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Group = CustomElement.define({
  tag: "ui-combobox-group",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const GroupLabel = CustomElement.define({
  tag: "ui-combobox-group-label",
  properties: {
  },
  events: {
  },
})

/**
 * A wrapper, so the input stays a real input.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Input = CustomElement.define({
  tag: "ui-combobox-input",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Item = CustomElement.define({
  tag: "ui-combobox-item",
  properties: {
    label: Schema.String,
    keywords: Schema.Array(Schema.String),
    disabled: Schema.Boolean,
    index: Schema.Number,
    value: Schema.Unknown,
  },
  events: {
  },
})

/**
 * An icon inside an item. Screen readers and filtering skip it.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const ItemIcon = CustomElement.define({
  tag: "ui-combobox-item-icon",
  properties: {
    mirror: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const ItemIndicator = CustomElement.define({
  tag: "ui-combobox-item-indicator",
  properties: {
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Its text, with what the input's text matched in <mark>. It holds text only.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const ItemText = CustomElement.define({
  tag: "ui-combobox-item-text",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Label = CustomElement.define({
  tag: "ui-combobox-label",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const List = CustomElement.define({
  tag: "ui-combobox-list",
  properties: {
  },
  events: {
  },
})

/**
 * Selects every item that matches, in its <ui-combobox-group> or in the whole list.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const SelectAll = CustomElement.define({
  tag: "ui-combobox-select-all",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Separator = CustomElement.define({
  tag: "ui-combobox-separator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Status = CustomElement.define({
  tag: "ui-combobox-status",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-combobox>`.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const Trigger = CustomElement.define({
  tag: "ui-combobox-trigger",
  properties: {
  },
  events: {
  },
})

/**
 * The selected item's icon, copied from its <ui-combobox-item-icon>, like next to the input.
 * @see https://ui-sdk.dev/docs/web-components/components/combobox
 */
export const ValueIcon = CustomElement.define({
  tag: "ui-combobox-value-icon",
  properties: {
  },
  events: {
  },
})
