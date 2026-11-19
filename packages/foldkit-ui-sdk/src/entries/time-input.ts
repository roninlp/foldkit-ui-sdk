// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/time-input"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Type a time one part at a time, on the clock your user's language uses.
 * @see https://ui-sdk.dev/docs/web-components/components/time-input
 */
export const Root = CustomElement.define({
  tag: "ui-time-input",
  properties: {
    value: Schema.NullOr(Schema.String),
    name: Schema.String,
    defaultValue: Schema.NullOr(Schema.String),
    granularity: Schema.Literals(["day", "hour", "minute", "second"]),
    hourCycle: Schema.Literals([12, 24]),
    min: Schema.String,
    max: Schema.String,
    locale: Schema.String,
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.NullOr(Schema.String),
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-time-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/time-input
 */
export const Segment = CustomElement.define({
  tag: "ui-time-input-segment",
  properties: {
    segment: Schema.Unknown,
  },
  events: {
  },
})
