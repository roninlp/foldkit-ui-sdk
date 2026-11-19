// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/color-picker"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Choose a color by dragging across an area and along sliders, typing any CSS color, or picking a preset.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const Root = CustomElement.define({
  tag: "ui-color-picker",
  properties: {
    value: Schema.String,
    name: Schema.String,
    defaultValue: Schema.String,
    space: Schema.Literals(["hsv", "hsl", "srgb", "oklch"]),
    format: Schema.Literals(["hsl", "srgb", "oklch", "srgb-linear", "display-p3", "hwb", "lab", "lch", "oklab", "xyz-d65", "xyz-d50", "hex"]),
    gamut: Schema.Literals([false, "srgb", "p3"]),
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
    "valuecommit": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const Area = CustomElement.define({
  tag: "ui-color-picker-area",
  properties: {
    x: Schema.Literals(["alpha", "hue", "saturation", "brightness", "lightness", "chroma", "red", "green", "blue"]),
    y: Schema.Literals(["alpha", "hue", "saturation", "brightness", "lightness", "chroma", "red", "green", "blue"]),
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const AreaCanvas = CustomElement.define({
  tag: "ui-color-picker-area-canvas",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const AreaThumb = CustomElement.define({
  tag: "ui-color-picker-area-thumb",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const ChannelInput = CustomElement.define({
  tag: "ui-color-picker-channel-input",
  properties: {
    channel: Schema.Literals(["alpha", "hue", "saturation", "brightness", "lightness", "chroma", "red", "green", "blue"]),
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const EyeDropper = CustomElement.define({
  tag: "ui-color-picker-eye-dropper",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const Input = CustomElement.define({
  tag: "ui-color-picker-input",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const Slider = CustomElement.define({
  tag: "ui-color-picker-slider",
  properties: {
    channel: Schema.Literals(["alpha", "hue", "saturation", "brightness", "lightness", "chroma", "red", "green", "blue"]),
    orientation: Schema.Literals(["horizontal", "vertical"]),
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const SliderThumb = CustomElement.define({
  tag: "ui-color-picker-slider-thumb",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const Swatch = CustomElement.define({
  tag: "ui-color-picker-swatch",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const SwatchItem = CustomElement.define({
  tag: "ui-color-picker-swatch-item",
  properties: {
    value: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-color-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/color-picker
 */
export const Swatches = CustomElement.define({
  tag: "ui-color-picker-swatches",
  properties: {
  },
  events: {
  },
})
