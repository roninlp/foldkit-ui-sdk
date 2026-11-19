// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/radio"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Choose one option, move the selection with arrow keys, and submit it with a form.
 * @see https://ui-sdk.dev/docs/web-components/components/radio
 */
export const Root = CustomElement.define({
  tag: "ui-radio",
  properties: {
    value: Schema.String,
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * <ui-radio-group> takes part in forms like native radios that share a name, with no hidden inputs. Each item is a radio, and labels work like they do for native ones.
 * @see https://ui-sdk.dev/docs/web-components/components/radio
 */
export const Group = CustomElement.define({
  tag: "ui-radio-group",
  properties: {
    value: Schema.NullOr(Schema.String),
    name: Schema.String,
    defaultValue: Schema.NullOr(Schema.String),
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
    loop: Schema.Boolean,
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
 * Part of `<ui-radio-group>`.
 * @see https://ui-sdk.dev/docs/web-components/components/radio
 */
export const Indicator = CustomElement.define({
  tag: "ui-radio-indicator",
  properties: {
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})
