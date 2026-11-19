// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/toggle"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Keep a button pressed, or group toggles with a shared value and arrow-key navigation.
 * @see https://ui-sdk.dev/docs/web-components/components/toggle
 */
export const Root = CustomElement.define({
  tag: "ui-toggle",
  properties: {
    pressed: Schema.Boolean,
    defaultPressed: Schema.Boolean,
    value: Schema.String,
    disabled: Schema.Boolean,
    focusableWhenDisabled: Schema.Boolean,
  },
  events: {
    "pressedchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * <ui-toggle-group> holds toggles that share one value, with one tab stop and arrow keys between them. `value` and `default-value` take comma-separated values.
 * @see https://ui-sdk.dev/docs/web-components/components/toggle
 */
export const Group = CustomElement.define({
  tag: "ui-toggle-group",
  properties: {
    value: Schema.Array(Schema.String),
    defaultValue: Schema.Array(Schema.String),
    multiple: Schema.Boolean,
    deselectable: Schema.Boolean,
    disabled: Schema.Boolean,
    orientation: Schema.Literals(["horizontal", "vertical"]),
    loop: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.Array(Schema.String),
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * An icon inside the toggle's button. Screen readers skip it.
 * @see https://ui-sdk.dev/docs/web-components/components/toggle
 */
export const Icon = CustomElement.define({
  tag: "ui-toggle-icon",
  properties: {
    mirror: Schema.Boolean,
  },
  events: {
  },
})
