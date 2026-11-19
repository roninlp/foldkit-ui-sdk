// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/switch"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Turn a setting on or off.
 * @see https://ui-sdk.dev/docs/web-components/components/switch
 */
export const Root = CustomElement.define({
  tag: "ui-switch",
  properties: {
    checked: Schema.Boolean,
    name: Schema.String,
    defaultChecked: Schema.Boolean,
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
    value: Schema.String,
  },
  events: {
    "checkedchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-switch>`.
 * @see https://ui-sdk.dev/docs/web-components/components/switch
 */
export const Thumb = CustomElement.define({
  tag: "ui-switch-thumb",
  properties: {
  },
  events: {
  },
})
