// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/waterfall"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Show a trace or a page's requests as bars on a shared time axis, with spans that expand to show what they started.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const Root = CustomElement.define({
  tag: "ui-waterfall",
  properties: {
    value: Schema.NullOr(Schema.String),
    expanded: Schema.Array(Schema.String),
    items: Schema.Array(Schema.Unknown),
    range: Schema.Unknown,
    format: Schema.Unknown,
    getBarLabel: Schema.Unknown,
    defaultValue: Schema.NullOr(Schema.String),
    defaultExpanded: Schema.Array(Schema.String),
    locale: Schema.String,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.NullOr(Schema.String),
      reason: Schema.String,
      source: Schema.String,
    }),
    "expandedchange": Schema.Struct({
      value: Schema.Array(Schema.String),
      reason: Schema.String,
      source: Schema.String,
    }),
    "highlight": Schema.Struct({ value: Schema.String, index: Schema.Number, event: Schema.optional(Schema.Unknown) }),
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const Axis = CustomElement.define({
  tag: "ui-waterfall-axis",
  properties: {
    maxTicks: Schema.Number,
  },
  events: {
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const Bar = CustomElement.define({
  tag: "ui-waterfall-bar",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const Cell = CustomElement.define({
  tag: "ui-waterfall-cell",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const ColumnHeader = CustomElement.define({
  tag: "ui-waterfall-column-header",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const HeaderRow = CustomElement.define({
  tag: "ui-waterfall-header-row",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const Indicator = CustomElement.define({
  tag: "ui-waterfall-indicator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const Mark = CustomElement.define({
  tag: "ui-waterfall-mark",
  properties: {
    time: Schema.Number,
  },
  events: {
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const Row = CustomElement.define({
  tag: "ui-waterfall-row",
  properties: {
    value: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const RowHeader = CustomElement.define({
  tag: "ui-waterfall-row-header",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-waterfall>`.
 * @see https://ui-sdk.dev/docs/web-components/components/waterfall
 */
export const Tick = CustomElement.define({
  tag: "ui-waterfall-tick",
  properties: {
    time: Schema.Number,
  },
  events: {
  },
})
