// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/password-input"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Enter a password, show or hide it, and use it in a native form.
 * @see https://ui-sdk.dev/docs/web-components/components/password-input
 */
export const Root = CustomElement.define({
  tag: "ui-password-input",
  properties: {
    value: Schema.String,
    visible: Schema.Boolean,
    defaultValue: Schema.String,
    defaultVisible: Schema.Boolean,
    name: Schema.String,
    form: Schema.String,
    required: Schema.Boolean,
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
    "visiblechange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-password-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/password-input
 */
export const Toggle = CustomElement.define({
  tag: "ui-password-input-toggle",
  properties: {
  },
  events: {
  },
})
