// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/menu"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Choose actions and settings from a button or a context menu.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const Root = CustomElement.define({
  tag: "ui-menu",
  properties: {
    open: Schema.Boolean,
    items: Schema.Unknown,
    container: Schema.Unknown,
    defaultOpen: Schema.Boolean,
    pendingAnnouncement: Schema.String,
    itemShortcuts: Schema.Boolean,
    loop: Schema.Boolean,
    delay: Schema.Number,
    presentation: Schema.Literals(["popover", "sheet", "auto"]),
    modal: Schema.Union([Schema.Boolean, Schema.Literal("pointer")]),
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
    "action": Schema.Struct({ value: Schema.Unknown }),
    "dismissattempt": Schema.Struct({ reason: Schema.String }),
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const CheckboxItem = CustomElement.define({
  tag: "ui-menu-checkbox-item",
  properties: {
    value: Schema.String,
    label: Schema.String,
    disabled: Schema.Boolean,
    checked: Schema.Boolean,
    defaultChecked: Schema.Boolean,
    closeOnSelect: Schema.Boolean,
  },
  events: {
    "checkedchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const Content = CustomElement.define({
  tag: "ui-menu-content",
  properties: {
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    align: Schema.Literals(["center", "start", "end"]),
    sideOffset: Schema.Number,
    alignOffset: Schema.Number,
    collisionPadding: Schema.Number,
    arrowPadding: Schema.Number,
    container: Schema.Unknown,
    anchor: Schema.String,
    finalFocus: Schema.Unknown,
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * An area that opens the menu at the pointer on a right-click or a long press, and on Shift+F10.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const ContextTrigger = CustomElement.define({
  tag: "ui-menu-context-trigger",
  properties: {
    payload: Schema.Unknown,
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const Group = CustomElement.define({
  tag: "ui-menu-group",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const GroupLabel = CustomElement.define({
  tag: "ui-menu-group-label",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const Item = CustomElement.define({
  tag: "ui-menu-item",
  properties: {
    value: Schema.String,
    label: Schema.String,
    disabled: Schema.Boolean,
    destructive: Schema.Boolean,
    shortcut: Schema.String,
    closeOnSelect: Schema.Boolean,
  },
  events: {
    "select": Schema.Struct({ value: Schema.Unknown }),
  },
})

/**
 * An icon inside an item. Screen readers and typeahead skip it.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const ItemIcon = CustomElement.define({
  tag: "ui-menu-item-icon",
  properties: {
    mirror: Schema.Boolean,
  },
  events: {
  },
})

/**
 * The check or dot inside a checkbox or radio item.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const ItemIndicator = CustomElement.define({
  tag: "ui-menu-item-indicator",
  properties: {
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const RadioGroup = CustomElement.define({
  tag: "ui-menu-radio-group",
  properties: {
    value: Schema.NullOr(Schema.String),
    defaultValue: Schema.NullOr(Schema.String),
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const RadioItem = CustomElement.define({
  tag: "ui-menu-radio-item",
  properties: {
    value: Schema.String,
    label: Schema.String,
    disabled: Schema.Boolean,
    closeOnSelect: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const Separator = CustomElement.define({
  tag: "ui-menu-separator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const Shortcut = CustomElement.define({
  tag: "ui-menu-shortcut",
  properties: {
  },
  events: {
  },
})

/**
 * A submenu inside the menu: its <ui-menu-sub-trigger> is an item that opens its <ui-menu-sub-content> beside it.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const Sub = CustomElement.define({
  tag: "ui-menu-sub",
  properties: {
    open: Schema.Boolean,
    defaultOpen: Schema.Boolean,
    pendingAnnouncement: Schema.String,
    loop: Schema.Boolean,
    delay: Schema.Number,
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
    "action": Schema.Struct({ value: Schema.Unknown }),
    "checkedchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
    "valuechange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
    "dismissattempt": Schema.Struct({ reason: Schema.String }),
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const SubContent = CustomElement.define({
  tag: "ui-menu-sub-content",
  properties: {
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    align: Schema.Literals(["center", "start", "end"]),
    sideOffset: Schema.Number,
    alignOffset: Schema.Number,
    collisionPadding: Schema.Number,
    arrowPadding: Schema.Number,
    anchor: Schema.String,
    finalFocus: Schema.Unknown,
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-menu>` or `<ui-menu-sub>`.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const SubTrigger = CustomElement.define({
  tag: "ui-menu-sub-trigger",
  properties: {
    payload: Schema.Unknown,
    disabled: Schema.Boolean,
    focusableWhenDisabled: Schema.Boolean,
    shortcut: Schema.String,
  },
  events: {
  },
})

/**
 * A wrapper, so the trigger stays a real button with its built-in behavior. With `for="menu-id"`, it opens that menu from anywhere on the page.
 * @see https://ui-sdk.dev/docs/web-components/components/menu
 */
export const Trigger = CustomElement.define({
  tag: "ui-menu-trigger",
  properties: {
    payload: Schema.Unknown,
    disabled: Schema.Boolean,
    focusableWhenDisabled: Schema.Boolean,
    shortcut: Schema.String,
  },
  events: {
  },
})
