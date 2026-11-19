// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/textarea"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * <ui-input> and <ui-textarea> wrap a native field. They mark it `data-filled` and fire `valuechange` with a reason. Put them in a <ui-field> to wire the field to its label and messages.
 * @see https://ui-sdk.dev/docs/web-components/components/textarea
 */
export const Root = CustomElement.define({
  tag: "ui-textarea",
  properties: {
    value: Schema.String,
    defaultValue: Schema.String,
    autoResize: Schema.Boolean,
    submitShortcut: Schema.Literals(["enter", "mod+enter"]),
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})
