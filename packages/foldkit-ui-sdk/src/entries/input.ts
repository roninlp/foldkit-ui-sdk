// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/input"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Enter text, add a clear button, and connect the value to your form or state.
 * @see https://ui-sdk.dev/docs/web-components/components/input
 */
export const Root = CustomElement.define({
  tag: "ui-input",
  properties: {
    value: Schema.String,
    defaultValue: Schema.String,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-input-group>`.
 * @see https://ui-sdk.dev/docs/web-components/components/input
 */
export const Clear = CustomElement.define({
  tag: "ui-input-clear",
  properties: {
  },
  events: {
  },
})

/**
 * <ui-input-group> holds a field with icons, text and buttons around it. Presses on its text and icons focus the field. <ui-input-clear> wraps a button that empties the field, shown while there's text to clear.
 * @see https://ui-sdk.dev/docs/web-components/components/input
 */
export const Group = CustomElement.define({
  tag: "ui-input-group",
  properties: {
  },
  events: {
  },
})
