// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/command"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Search commands, run actions, and open pages of more choices.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const Root = CustomElement.define({
  tag: "ui-command",
  properties: {
    value: Schema.NullOr(Schema.String),
    query: Schema.String,
    pages: Schema.Array(Schema.String),
    items: Schema.Unknown,
    emptyItems: Schema.Unknown,
    announcement: Schema.Unknown,
    filter: Schema.Unknown,
    defaultValue: Schema.NullOr(Schema.String),
    defaultQuery: Schema.String,
    defaultPages: Schema.Array(Schema.String),
    pendingAnnouncement: Schema.String,
    autoHighlight: Schema.Boolean,
    loop: Schema.Boolean,
    status: Schema.Literals(["error", "idle", "loading"]),
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.NullOr(Schema.String),
      reason: Schema.String,
      source: Schema.String,
    }),
    "querychange": Schema.Struct({
      value: Schema.String,
      reason: Schema.String,
      source: Schema.String,
    }),
    "pageschange": Schema.Struct({
      value: Schema.Array(Schema.String),
      reason: Schema.String,
      source: Schema.String,
    }),
    "action": Schema.Struct({ value: Schema.Unknown }),
    "loadmore": Schema.Struct({}),
  },
})

/**
 * Part of `<ui-command>`.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const Empty = CustomElement.define({
  tag: "ui-command-empty",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-command>`.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const Group = CustomElement.define({
  tag: "ui-command-group",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-command>`.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const GroupLabel = CustomElement.define({
  tag: "ui-command-group-label",
  properties: {
  },
  events: {
  },
})

/**
 * A wrapper, so the field stays a real input.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const Input = CustomElement.define({
  tag: "ui-command-input",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-command>`.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const Item = CustomElement.define({
  tag: "ui-command-item",
  properties: {
    value: Schema.String,
    label: Schema.String,
    keywords: Schema.Array(Schema.String),
    disabled: Schema.Boolean,
    shortcut: Schema.String,
    page: Schema.String,
    index: Schema.Number,
  },
  events: {
    "select": Schema.Struct({ value: Schema.Unknown }),
  },
})

/**
 * An icon inside a command. Screen readers and filtering skip it.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const ItemIcon = CustomElement.define({
  tag: "ui-command-item-icon",
  properties: {
    mirror: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Its text, with what the search matched in <mark>. It holds text only.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const ItemText = CustomElement.define({
  tag: "ui-command-item-text",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-command>`.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const List = CustomElement.define({
  tag: "ui-command-list",
  properties: {
  },
  events: {
  },
})

/**
 * A wrapper that doesn't split the list for assistive technology.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const Page = CustomElement.define({
  tag: "ui-command-page",
  properties: {
    value: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-command>`.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const Separator = CustomElement.define({
  tag: "ui-command-separator",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-command>`.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const Shortcut = CustomElement.define({
  tag: "ui-command-shortcut",
  properties: {
    shortcut: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-command>`.
 * @see https://ui-sdk.dev/docs/web-components/components/command
 */
export const Status = CustomElement.define({
  tag: "ui-command-status",
  properties: {
  },
  events: {
  },
})
