// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/calendar"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Choose one date, several dates, or a range from a month grid.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Root = CustomElement.define({
  tag: "ui-calendar",
  properties: {
    value: Schema.String,
    month: Schema.String,
    unavailable: Schema.Array(Schema.String),
    mode: Schema.Literals(["multiple", "single", "range"]),
    defaultValue: Schema.String,
    defaultMonth: Schema.String,
    min: Schema.String,
    max: Schema.String,
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    deselectable: Schema.Boolean,
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
    "focusedchange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
    "anchorchange": Schema.Struct({
      value: Schema.NullOr(Schema.String),
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-calendar>` or `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Day = CustomElement.define({
  tag: "ui-calendar-day",
  properties: {
    value: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-calendar>` or `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Grid = CustomElement.define({
  tag: "ui-calendar-grid",
  properties: {
    offset: Schema.Number,
  },
  events: {
  },
})

/**
 * Part of `<ui-calendar>` or `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Heading = CustomElement.define({
  tag: "ui-calendar-heading",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-calendar>` or `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const MonthSelect = CustomElement.define({
  tag: "ui-calendar-month-select",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-calendar>` or `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Next = CustomElement.define({
  tag: "ui-calendar-next",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-calendar>` or `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Previous = CustomElement.define({
  tag: "ui-calendar-previous",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-calendar>` or `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Week = CustomElement.define({
  tag: "ui-calendar-week",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-calendar>` or `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Weekday = CustomElement.define({
  tag: "ui-calendar-weekday",
  properties: {
    index: Schema.Number,
  },
  events: {
  },
})

/**
 * The weekdays are a row group, like a <thead>, around the header row that fills the slot.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Weekdays = CustomElement.define({
  tag: "ui-calendar-weekdays",
  properties: {
  },
  events: {
  },
})

/**
 * <ui-calendar-weeks> is a row group, like a <tbody>, of rows the calendar renders. The core has no slot for it, so it's a plain element. The header row and the empty cells the calendar renders get their display here too.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const Weeks = CustomElement.define({
  tag: "ui-calendar-weeks",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-calendar>` or `<ui-date-picker>`.
 * @see https://ui-sdk.dev/docs/web-components/components/calendar
 */
export const YearSelect = CustomElement.define({
  tag: "ui-calendar-year-select",
  properties: {
  },
  events: {
  },
})
