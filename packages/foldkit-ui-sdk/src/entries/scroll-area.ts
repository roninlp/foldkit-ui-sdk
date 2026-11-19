// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/scroll-area"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Add styled scrollbars, edge indicators, and follow-to-end behavior to native scrolling.
 * @see https://ui-sdk.dev/docs/web-components/components/scroll-area
 */
export const Root = CustomElement.define({
  tag: "ui-scroll-area",
  properties: {
    type: Schema.Literals(["scroll", "always", "auto", "hover"]),
    scrollHideDelay: Schema.Number,
    stickToEnd: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-scroll-area>`.
 * @see https://ui-sdk.dev/docs/web-components/components/scroll-area
 */
export const Content = CustomElement.define({
  tag: "ui-scroll-area-content",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-scroll-area>`.
 * @see https://ui-sdk.dev/docs/web-components/components/scroll-area
 */
export const Corner = CustomElement.define({
  tag: "ui-scroll-area-corner",
  properties: {
  },
  events: {
  },
})

/**
 * A wrapper, so the button stays a real button with its built-in behavior.
 * @see https://ui-sdk.dev/docs/web-components/components/scroll-area
 */
export const ScrollToEnd = CustomElement.define({
  tag: "ui-scroll-area-scroll-to-end",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-scroll-area>`.
 * @see https://ui-sdk.dev/docs/web-components/components/scroll-area
 */
export const Scrollbar = CustomElement.define({
  tag: "ui-scroll-area-scrollbar",
  properties: {
    orientation: Schema.Literals(["horizontal", "vertical"]),
  },
  events: {
  },
})

/**
 * Part of `<ui-scroll-area>`.
 * @see https://ui-sdk.dev/docs/web-components/components/scroll-area
 */
export const Thumb = CustomElement.define({
  tag: "ui-scroll-area-thumb",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-scroll-area>`.
 * @see https://ui-sdk.dev/docs/web-components/components/scroll-area
 */
export const Viewport = CustomElement.define({
  tag: "ui-scroll-area-viewport",
  properties: {
  },
  events: {
  },
})
