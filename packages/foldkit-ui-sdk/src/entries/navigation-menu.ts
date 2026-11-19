// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/navigation-menu"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Groups site links into panels that open from a row of triggers.
 * @see https://ui-sdk.dev/docs/web-components/components/navigation-menu
 */
export const Root = CustomElement.define({
  tag: "ui-navigation-menu",
  properties: {
    value: Schema.NullOr(Schema.String),
    container: Schema.Unknown,
    defaultValue: Schema.NullOr(Schema.String),
    delay: Schema.Number,
    closeDelay: Schema.Number,
    openOnHover: Schema.Boolean,
    closeOnSelect: Schema.Boolean,
    orientation: Schema.Literals(["horizontal", "vertical"]),
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.NullOr(Schema.String),
      reason: Schema.String,
      source: Schema.String,
    }),
    "openchangecomplete": Schema.Struct({ value: Schema.Boolean }),
  },
})

/**
 * A block, so a closed content kept findable has a box for `hidden="until-found"` to hide; an inline one would show its links. Not shown, it's always `hidden`, which wins over any display.
 * @see https://ui-sdk.dev/docs/web-components/components/navigation-menu
 */
export const Content = CustomElement.define({
  tag: "ui-navigation-menu-content",
  properties: {
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    align: Schema.Literals(["center", "start", "end"]),
    sideOffset: Schema.Number,
    alignOffset: Schema.Number,
    collisionPadding: Schema.Number,
    arrowPadding: Schema.Number,
    anchor: Schema.String,
    keepMounted: Schema.Boolean,
    hiddenUntilFound: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-navigation-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/navigation-menu
 */
export const Indicator = CustomElement.define({
  tag: "ui-navigation-menu-indicator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-navigation-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/navigation-menu
 */
export const Item = CustomElement.define({
  tag: "ui-navigation-menu-item",
  properties: {
    value: Schema.String,
  },
  events: {
  },
})

/**
 * A wrapper, so the link stays a real link, or any element with as-child.
 * @see https://ui-sdk.dev/docs/web-components/components/navigation-menu
 */
export const Link = CustomElement.define({
  tag: "ui-navigation-menu-link",
  properties: {
    current: Schema.Boolean,
    closeOnSelect: Schema.Boolean,
  },
  events: {
  },
})

/**
 * An icon inside a link. Screen readers skip it.
 * @see https://ui-sdk.dev/docs/web-components/components/navigation-menu
 */
export const LinkIcon = CustomElement.define({
  tag: "ui-navigation-menu-link-icon",
  properties: {
    mirror: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-navigation-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/navigation-menu
 */
export const List = CustomElement.define({
  tag: "ui-navigation-menu-list",
  properties: {
  },
  events: {
  },
})

/**
 * A wrapper, so the trigger stays a real button.
 * @see https://ui-sdk.dev/docs/web-components/components/navigation-menu
 */
export const Trigger = CustomElement.define({
  tag: "ui-navigation-menu-trigger",
  properties: {
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-navigation-menu>`.
 * @see https://ui-sdk.dev/docs/web-components/components/navigation-menu
 */
export const Viewport = CustomElement.define({
  tag: "ui-navigation-menu-viewport",
  properties: {
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    align: Schema.Literals(["center", "start", "end"]),
    sideOffset: Schema.Number,
    alignOffset: Schema.Number,
    collisionPadding: Schema.Number,
    arrowPadding: Schema.Number,
    anchor: Schema.String,
  },
  events: {
  },
})
