// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/progress"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Show a task’s progress, or an indeterminate state while its progress is unknown.
 * @see https://ui-sdk.dev/docs/web-components/components/progress
 */
export const Root = CustomElement.define({
  tag: "ui-progress",
  properties: {
    format: Schema.Unknown,
    getValueLabel: Schema.Unknown,
    min: Schema.Number,
    max: Schema.Number,
    locale: Schema.String,
    value: Schema.NullOr(Schema.Number),
  },
  events: {
  },
})

/**
 * Part of `<ui-progress>`.
 * @see https://ui-sdk.dev/docs/web-components/components/progress
 */
export const Indicator = CustomElement.define({
  tag: "ui-progress-indicator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-progress>`.
 * @see https://ui-sdk.dev/docs/web-components/components/progress
 */
export const Label = CustomElement.define({
  tag: "ui-progress-label",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-progress>`.
 * @see https://ui-sdk.dev/docs/web-components/components/progress
 */
export const Track = CustomElement.define({
  tag: "ui-progress-track",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-progress>`.
 * @see https://ui-sdk.dev/docs/web-components/components/progress
 */
export const Value = CustomElement.define({
  tag: "ui-progress-value",
  properties: {
  },
  events: {
  },
})
