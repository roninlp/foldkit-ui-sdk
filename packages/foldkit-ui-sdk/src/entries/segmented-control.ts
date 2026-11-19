// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/segmented-control"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Pick one of a few options from a row of buttons, with an indicator that slides to the choice.
 * @see https://ui-sdk.dev/docs/web-components/components/segmented-control
 */
export const Root = CustomElement.define({
  tag: "ui-segmented-control",
  properties: {
    value: Schema.NullOr(Schema.String),
    name: Schema.String,
    defaultValue: Schema.NullOr(Schema.String),
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
    loop: Schema.Boolean,
    orientation: Schema.Literals(["horizontal", "vertical"]),
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
 * Part of `<ui-segmented-control>`.
 * @see https://ui-sdk.dev/docs/web-components/components/segmented-control
 */
export const Indicator = CustomElement.define({
  tag: "ui-segmented-control-indicator",
  properties: {
  },
  events: {
  },
})

/**
 * Form-associated, so a <label> around or pointing at an item checks it.
 * @see https://ui-sdk.dev/docs/web-components/components/segmented-control
 */
export const Item = CustomElement.define({
  tag: "ui-segmented-control-item",
  properties: {
    value: Schema.String,
    disabled: Schema.Boolean,
  },
  events: {
  },
})
