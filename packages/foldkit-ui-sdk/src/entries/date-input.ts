// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/date-input"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Type a date one part at a time, in the order your user's language writes it.
 * @see https://ui-sdk.dev/docs/web-components/components/date-input
 */
export const Root = CustomElement.define({
  tag: "ui-date-input",
  properties: {
    value: Schema.NullOr(Schema.String),
    unavailable: Schema.Array(Schema.String),
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
 * Part of `<ui-date-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/date-input
 */
export const Segment = CustomElement.define({
  tag: "ui-date-input-segment",
  properties: {
    segment: Schema.Unknown,
  },
  events: {
  },
})
