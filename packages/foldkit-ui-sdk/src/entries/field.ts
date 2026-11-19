// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/field"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Connect a form control to its label, description, and validation errors.
 * @see https://ui-sdk.dev/docs/web-components/components/field
 */
export const Root = CustomElement.define({
  tag: "ui-field",
  properties: {
    invalid: Schema.Boolean,
    name: Schema.String,
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Describes the nearest field, or the whole field set when no field is closer.
 * @see https://ui-sdk.dev/docs/web-components/components/field
 */
export const Description = CustomElement.define({
  tag: "ui-field-description",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-field>`.
 * @see https://ui-sdk.dev/docs/web-components/components/field
 */
export const Error = CustomElement.define({
  tag: "ui-field-error",
  properties: {
    match: Schema.Union([Schema.Boolean, Schema.Literal("valueMissing"), Schema.Literal("rangeUnderflow"), Schema.Literal("rangeOverflow"), Schema.Literal("badInput"), Schema.Literal("customError"), Schema.Literal("typeMismatch"), Schema.Literal("patternMismatch"), Schema.Literal("tooLong"), Schema.Literal("tooShort"), Schema.Literal("stepMismatch")]),
  },
  events: {
  },
})

/**
 * <ui-field> ties the control inside it to its label and messages. The control can be any form control: a native input, or <ui-checkbox> and the others.
 * @see https://ui-sdk.dev/docs/web-components/components/field
 */
export const Group = CustomElement.define({
  tag: "ui-field-group",
  properties: {
  },
  events: {
  },
})

/**
 * Outside any field, a label is plain. With as-child on a native <label>, it labels the control inside it, like a card around a whole field.
 * @see https://ui-sdk.dev/docs/web-components/components/field
 */
export const Label = CustomElement.define({
  tag: "ui-field-label",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-field-set>`.
 * @see https://ui-sdk.dev/docs/web-components/components/field
 */
export const Legend = CustomElement.define({
  tag: "ui-field-legend",
  properties: {
  },
  events: {
  },
})

/**
 * Wraps a native <fieldset> and its <legend>, so `disabled` disables every control inside it the way the browser does.
 * @see https://ui-sdk.dev/docs/web-components/components/field
 */
export const Set = CustomElement.define({
  tag: "ui-field-set",
  properties: {
    disabled: Schema.Boolean,
  },
  events: {
  },
})
