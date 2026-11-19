// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/pagination"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Navigate pages with buttons, links, or your router.
 * @see https://ui-sdk.dev/docs/web-components/components/pagination
 */
export const Root = CustomElement.define({
  tag: "ui-pagination",
  properties: {
    page: Schema.Number,
    getHref: Schema.Unknown,
    defaultPage: Schema.Number,
    pageCount: Schema.Number,
    total: Schema.Number,
    pageSize: Schema.Number,
    siblings: Schema.Number,
    boundaries: Schema.Number,
    disabled: Schema.Boolean,
  },
  events: {
    "pagechange": Schema.Struct({
      value: Schema.Number,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-pagination>`.
 * @see https://ui-sdk.dev/docs/web-components/components/pagination
 */
export const Ellipsis = CustomElement.define({
  tag: "ui-pagination-ellipsis",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-pagination>`.
 * @see https://ui-sdk.dev/docs/web-components/components/pagination
 */
export const First = CustomElement.define({
  tag: "ui-pagination-first",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-pagination>`.
 * @see https://ui-sdk.dev/docs/web-components/components/pagination
 */
export const Item = CustomElement.define({
  tag: "ui-pagination-item",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-pagination>`.
 * @see https://ui-sdk.dev/docs/web-components/components/pagination
 */
export const Last = CustomElement.define({
  tag: "ui-pagination-last",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-pagination>`.
 * @see https://ui-sdk.dev/docs/web-components/components/pagination
 */
export const Link = CustomElement.define({
  tag: "ui-pagination-link",
  properties: {
    page: Schema.Number,
  },
  events: {
  },
})

/**
 * Part of `<ui-pagination>`.
 * @see https://ui-sdk.dev/docs/web-components/components/pagination
 */
export const List = CustomElement.define({
  tag: "ui-pagination-list",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-pagination>`.
 * @see https://ui-sdk.dev/docs/web-components/components/pagination
 */
export const Next = CustomElement.define({
  tag: "ui-pagination-next",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-pagination>`.
 * @see https://ui-sdk.dev/docs/web-components/components/pagination
 */
export const Previous = CustomElement.define({
  tag: "ui-pagination-previous",
  properties: {
  },
  events: {
  },
})
