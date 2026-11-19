// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/toolbar"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Give buttons, toggles, menus and fields one tab stop with arrow-key navigation.
 * @see https://ui-sdk.dev/docs/web-components/components/toolbar
 */
export const Root = CustomElement.define({
  tag: "ui-toolbar",
  properties: {
    orientation: Schema.Literals(["horizontal", "vertical"]),
    loop: Schema.Boolean,
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-toolbar>`.
 * @see https://ui-sdk.dev/docs/web-components/components/toolbar
 */
export const Button = CustomElement.define({
  tag: "ui-toolbar-button",
  properties: {
    disabled: Schema.Boolean,
    focusableWhenDisabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-toolbar>`.
 * @see https://ui-sdk.dev/docs/web-components/components/toolbar
 */
export const Group = CustomElement.define({
  tag: "ui-toolbar-group",
  properties: {
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-toolbar>`.
 * @see https://ui-sdk.dev/docs/web-components/components/toolbar
 */
export const Input = CustomElement.define({
  tag: "ui-toolbar-input",
  properties: {
    disabled: Schema.Boolean,
    focusableWhenDisabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-toolbar>`.
 * @see https://ui-sdk.dev/docs/web-components/components/toolbar
 */
export const Link = CustomElement.define({
  tag: "ui-toolbar-link",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-toolbar>`.
 * @see https://ui-sdk.dev/docs/web-components/components/toolbar
 */
export const Separator = CustomElement.define({
  tag: "ui-toolbar-separator",
  properties: {
  },
  events: {
  },
})
