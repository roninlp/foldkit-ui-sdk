// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/carousel"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Page through slides with native scrolling, keyboard controls, and optional rotation.
 * @see https://ui-sdk.dev/docs/web-components/components/carousel
 */
export const Root = CustomElement.define({
  tag: "ui-carousel",
  properties: {
    page: Schema.Number,
    playing: Schema.Boolean,
    defaultPage: Schema.Number,
    defaultPlaying: Schema.Boolean,
    interval: Schema.Number,
    orientation: Schema.Literals(["horizontal", "vertical"]),
    align: Schema.Literals(["center", "start", "end"]),
    slidesPerPage: Schema.Unknown,
    loop: Schema.Boolean,
    skipSnaps: Schema.Boolean,
    dragFree: Schema.Boolean,
    drag: Schema.Boolean,
  },
  events: {
    "pagechange": Schema.Struct({
      value: Schema.Number,
      reason: Schema.String,
      source: Schema.String,
    }),
    "pagechangecomplete": Schema.Struct({ value: Schema.Number }),
    "playingchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-carousel>`.
 * @see https://ui-sdk.dev/docs/web-components/components/carousel
 */
export const Content = CustomElement.define({
  tag: "ui-carousel-content",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-carousel>`.
 * @see https://ui-sdk.dev/docs/web-components/components/carousel
 */
export const Indicator = CustomElement.define({
  tag: "ui-carousel-indicator",
  properties: {
    page: Schema.Number,
  },
  events: {
  },
})

/**
 * Part of `<ui-carousel>`.
 * @see https://ui-sdk.dev/docs/web-components/components/carousel
 */
export const IndicatorGroup = CustomElement.define({
  tag: "ui-carousel-indicator-group",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-carousel>`.
 * @see https://ui-sdk.dev/docs/web-components/components/carousel
 */
export const Item = CustomElement.define({
  tag: "ui-carousel-item",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-carousel>`.
 * @see https://ui-sdk.dev/docs/web-components/components/carousel
 */
export const Next = CustomElement.define({
  tag: "ui-carousel-next",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-carousel>`.
 * @see https://ui-sdk.dev/docs/web-components/components/carousel
 */
export const PlayToggle = CustomElement.define({
  tag: "ui-carousel-play-toggle",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-carousel>`.
 * @see https://ui-sdk.dev/docs/web-components/components/carousel
 */
export const Previous = CustomElement.define({
  tag: "ui-carousel-previous",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-carousel>`.
 * @see https://ui-sdk.dev/docs/web-components/components/carousel
 */
export const Viewport = CustomElement.define({
  tag: "ui-carousel-viewport",
  properties: {
  },
  events: {
  },
})
