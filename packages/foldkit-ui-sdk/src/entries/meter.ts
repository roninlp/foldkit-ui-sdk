// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/meter"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Show a measurement within a known range, such as storage used or an account quota.
 * @see https://ui-sdk.dev/docs/web-components/components/meter
 */
export const Root = CustomElement.define({
  tag: "ui-meter",
  properties: {
    format: Schema.Unknown,
    getValueLabel: Schema.Unknown,
    min: Schema.Number,
    max: Schema.Number,
    locale: Schema.String,
    value: Schema.Number,
  },
  events: {
  },
})

/**
 * Part of `<ui-meter>`.
 * @see https://ui-sdk.dev/docs/web-components/components/meter
 */
export const Indicator = CustomElement.define({
  tag: "ui-meter-indicator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-meter>`.
 * @see https://ui-sdk.dev/docs/web-components/components/meter
 */
export const Label = CustomElement.define({
  tag: "ui-meter-label",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-meter>`.
 * @see https://ui-sdk.dev/docs/web-components/components/meter
 */
export const Track = CustomElement.define({
  tag: "ui-meter-track",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-meter>`.
 * @see https://ui-sdk.dev/docs/web-components/components/meter
 */
export const Value = CustomElement.define({
  tag: "ui-meter-value",
  properties: {
  },
  events: {
  },
})
