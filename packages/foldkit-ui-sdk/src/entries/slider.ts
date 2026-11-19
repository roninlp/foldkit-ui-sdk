// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/slider"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Adjust a number or a range with draggable thumbs and keyboard controls.
 * @see https://ui-sdk.dev/docs/web-components/components/slider
 */
export const Root = CustomElement.define({
  tag: "ui-slider",
  properties: {
    value: Schema.Array(Schema.Unknown),
    format: Schema.Unknown,
    name: Schema.String,
    defaultValue: Schema.Array(Schema.Unknown),
    min: Schema.Number,
    max: Schema.Number,
    step: Schema.Number,
    largeStep: Schema.Number,
    minStepsBetweenThumbs: Schema.Number,
    orientation: Schema.Literals(["horizontal", "vertical"]),
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
    locale: Schema.String,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.Array(Schema.Unknown),
      reason: Schema.String,
      source: Schema.String,
    }),
    "valuecommit": Schema.Struct({
      value: Schema.Array(Schema.Unknown),
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-slider>`.
 * @see https://ui-sdk.dev/docs/web-components/components/slider
 */
export const Control = CustomElement.define({
  tag: "ui-slider-control",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-slider>`.
 * @see https://ui-sdk.dev/docs/web-components/components/slider
 */
export const Indicator = CustomElement.define({
  tag: "ui-slider-indicator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-slider>`.
 * @see https://ui-sdk.dev/docs/web-components/components/slider
 */
export const Thumb = CustomElement.define({
  tag: "ui-slider-thumb",
  properties: {
    index: Schema.Number,
  },
  events: {
  },
})

/**
 * Part of `<ui-slider>`.
 * @see https://ui-sdk.dev/docs/web-components/components/slider
 */
export const ThumbInput = CustomElement.define({
  tag: "ui-slider-thumb-input",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-slider>`.
 * @see https://ui-sdk.dev/docs/web-components/components/slider
 */
export const Track = CustomElement.define({
  tag: "ui-slider-track",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-slider>`.
 * @see https://ui-sdk.dev/docs/web-components/components/slider
 */
export const Value = CustomElement.define({
  tag: "ui-slider-value",
  properties: {
  },
  events: {
  },
})
