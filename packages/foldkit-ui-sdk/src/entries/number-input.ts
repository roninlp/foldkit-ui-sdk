// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/number-input"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Enter numbers, step through values, and format them for a locale.
 * @see https://ui-sdk.dev/docs/web-components/components/number-input
 */
export const Root = CustomElement.define({
  tag: "ui-number-input",
  properties: {
    value: Schema.NullOr(Schema.Number),
    format: Schema.Unknown,
    name: Schema.String,
    defaultValue: Schema.NullOr(Schema.Number),
    min: Schema.Number,
    max: Schema.Number,
    step: Schema.Number,
    largeStep: Schema.Number,
    smallStep: Schema.Number,
    locale: Schema.String,
    wheel: Schema.Boolean,
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.NullOr(Schema.Number),
      reason: Schema.String,
      source: Schema.String,
    }),
    "valuecommit": Schema.Struct({
      value: Schema.NullOr(Schema.Number),
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * These wrap your own <input> and <button>s, so they keep their native behavior. `disabled` on a step button's element or on its <button> disables it.
 * @see https://ui-sdk.dev/docs/web-components/components/number-input
 */
export const Control = CustomElement.define({
  tag: "ui-number-input-control",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-number-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/number-input
 */
export const Decrement = CustomElement.define({
  tag: "ui-number-input-decrement",
  properties: {
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-number-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/number-input
 */
export const Group = CustomElement.define({
  tag: "ui-number-input-group",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-number-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/number-input
 */
export const Increment = CustomElement.define({
  tag: "ui-number-input-increment",
  properties: {
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Any number of scrub areas, anywhere inside, or anywhere on the page with `for="<number input id>"`, like an icon in a toolbar.
 * @see https://ui-sdk.dev/docs/web-components/components/number-input
 */
export const ScrubArea = CustomElement.define({
  tag: "ui-number-input-scrub-area",
  properties: {
    orientation: Schema.Literals(["horizontal", "vertical"]),
    pixelsPerStep: Schema.Number,
  },
  events: {
  },
})

/**
 * Part of `<ui-number-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/number-input
 */
export const ScrubAreaCursor = CustomElement.define({
  tag: "ui-number-input-scrub-area-cursor",
  properties: {
  },
  events: {
  },
})
