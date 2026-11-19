// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/drawer"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * A sheet you can open, drag, and resize from an edge of the screen.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Root = CustomElement.define({
  tag: "ui-drawer",
  properties: {
    open: Schema.Boolean,
    snapPoint: Schema.Unknown,
    physics: Schema.Unknown,
    persistentElements: Schema.Array(Schema.Unknown),
    container: Schema.Unknown,
    defaultOpen: Schema.Boolean,
    dismissible: Schema.Boolean,
    pendingAnnouncement: Schema.String,
    modal: Schema.Union([Schema.Boolean, Schema.Literal("trap-focus")]),
    closeOnOutsidePress: Schema.Boolean,
    snapPoints: Schema.Array(Schema.Unknown),
    defaultSnapPoint: Schema.Unknown,
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    modalAbove: Schema.Unknown,
    driver: Schema.Literals(["pointer", "auto", "scroll-snap"]),
    expandOnScroll: Schema.Boolean,
    themeColor: Schema.Boolean,
    preventEdgeSwipe: Schema.Boolean,
  },
  events: {
    "openchangecomplete": Schema.Struct({ value: Schema.Boolean }),
    "openchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
    "payloadchange": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
    "dismissattempt": Schema.Struct({ reason: Schema.String }),
    "snappointchange": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-drawer>`.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Backdrop = CustomElement.define({
  tag: "ui-drawer-backdrop",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-drawer>`.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Close = CustomElement.define({
  tag: "ui-drawer-close",
  properties: {
    value: Schema.String,
  },
  events: {
    "action": Schema.Unknown,
  },
})

/**
 * Part of `<ui-drawer>`.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Content = CustomElement.define({
  tag: "ui-drawer-content",
  properties: {
    container: Schema.Unknown,
    initialFocus: Schema.Unknown,
    finalFocus: Schema.Unknown,
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-drawer>`.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Description = CustomElement.define({
  tag: "ui-drawer-description",
  properties: {
  },
  events: {
  },
})

/**
 * The grabber wraps a button, like a trigger. Name the button, like aria-label="Resize".
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Handle = CustomElement.define({
  tag: "ui-drawer-handle",
  properties: {
  },
  events: {
  },
})

/**
 * With `for="drawer-id"`, an element anywhere, like the page's shell, follows the drawer.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Outlet = CustomElement.define({
  tag: "ui-drawer-outlet",
  properties: {
    keyframes: Schema.Unknown,
  },
  events: {
  },
})

/**
 * Part of `<ui-drawer>`.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Shortcut = CustomElement.define({
  tag: "ui-drawer-shortcut",
  properties: {
    shortcut: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-drawer>`.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Title = CustomElement.define({
  tag: "ui-drawer-title",
  properties: {
  },
  events: {
  },
})

/**
 * With `for="drawer-id"`, it opens that drawer from anywhere on the page.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Trigger = CustomElement.define({
  tag: "ui-drawer-trigger",
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
 * Part of `<ui-drawer>`.
 * @see https://ui-sdk.dev/docs/web-components/components/drawer
 */
export const Viewport = CustomElement.define({
  tag: "ui-drawer-viewport",
  properties: {
  },
  events: {
  },
})
