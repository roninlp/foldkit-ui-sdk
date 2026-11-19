// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/date-picker"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Type a date or choose one from a calendar, with support for ranges and forms.
 * @see https://ui-sdk.dev/docs/web-components/components/date-picker
 */
export const Root = CustomElement.define({
  tag: "ui-date-picker",
  properties: {
    value: Schema.String,
    month: Schema.String,
    open: Schema.Boolean,
    unavailable: Schema.Array(Schema.String),
    name: Schema.String,
    defaultMonth: Schema.String,
    min: Schema.String,
    max: Schema.String,
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    months: Schema.Number,
    pageBy: Schema.Literals(["month", "page"]),
    locale: Schema.String,
    weekStartsOn: Schema.Number,
    weekdayFormat: Schema.Literals(["narrow", "short", "long"]),
    monthFormat: Schema.Literals(["narrow", "short", "long"]),
    fixedWeeks: Schema.Boolean,
    showOutsideDays: Schema.Boolean,
    today: Schema.String,
    timeZone: Schema.String,
    minDays: Schema.Number,
    maxDays: Schema.Number,
    allowUnavailable: Schema.Boolean,
    container: Schema.Unknown,
    mode: Schema.Literals(["single", "range"]),
    defaultValue: Schema.String,
    defaultOpen: Schema.Boolean,
    closeOnSelect: Schema.Boolean,
    presentation: Schema.Literals(["popover", "sheet", "auto"]),
    startName: Schema.String,
    endName: Schema.String,
    required: Schema.Boolean,
    dismissible: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
    "monthchange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
    "openchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
    "openchangecomplete": Schema.Struct({ value: Schema.Boolean }),
    "dismissattempt": Schema.Struct({ reason: Schema.String }),
  },
})

/**
 * Part of `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/date-picker
 */
export const Clear = CustomElement.define({
  tag: "ui-date-picker-clear",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/date-picker
 */
export const Content = CustomElement.define({
  tag: "ui-date-picker-content",
  properties: {
    side: Schema.Literals(["top", "bottom", "left", "right", "start", "end"]),
    align: Schema.Literals(["center", "start", "end"]),
    sideOffset: Schema.Number,
    alignOffset: Schema.Number,
    collisionPadding: Schema.Number,
    arrowPadding: Schema.Number,
    container: Schema.Unknown,
    anchor: Schema.String,
    finalFocus: Schema.Unknown,
    keepMounted: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/date-picker
 */
export const Hint = CustomElement.define({
  tag: "ui-date-picker-hint",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/date-picker
 */
export const Input = CustomElement.define({
  tag: "ui-date-picker-input",
  properties: {
    end: Schema.Boolean,
  },
  events: {
  },
})

/**
 * `value` is a date, or a range's two dates separated by a comma.
 * @see https://ui-sdk.dev/docs/web-components/components/date-picker
 */
export const Preset = CustomElement.define({
  tag: "ui-date-picker-preset",
  properties: {
    value: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/date-picker
 */
export const Trigger = CustomElement.define({
  tag: "ui-date-picker-trigger",
  properties: {
  },
  events: {
  },
})
