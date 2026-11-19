// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/file-input"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Choose, drop, or paste files, validate them, and submit them with a form.
 * @see https://ui-sdk.dev/docs/web-components/components/file-input
 */
export const Root = CustomElement.define({
  tag: "ui-file-input",
  properties: {
    value: Schema.Array(Schema.Unknown),
    validate: Schema.Unknown,
    defaultValue: Schema.Array(Schema.Unknown),
    announcement: Schema.Unknown,
    name: Schema.String,
    accept: Schema.Array(Schema.String),
    maxFiles: Schema.Number,
    maxSize: Schema.Number,
    minSize: Schema.Number,
    multiple: Schema.Boolean,
    directory: Schema.Boolean,
    capture: Schema.Union([Schema.Boolean, Schema.Literal("user"), Schema.Literal("environment")]),
    required: Schema.Boolean,
    disabled: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.Array(Schema.Unknown),
      reason: Schema.String,
      source: Schema.String,
    }),
    "reject": Schema.Struct({
      value: Schema.Array(Schema.Unknown),
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * `paste-target` is "document" or a CSS selector.
 * @see https://ui-sdk.dev/docs/web-components/components/file-input
 */
export const Dropzone = CustomElement.define({
  tag: "ui-file-input-dropzone",
  properties: {
    target: Schema.Literals(["document", "element"]),
    pasteTarget: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-file-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/file-input
 */
export const Item = CustomElement.define({
  tag: "ui-file-input-item",
  properties: {
    file: Schema.Unknown,
  },
  events: {
  },
})

/**
 * Part of `<ui-file-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/file-input
 */
export const ItemRemove = CustomElement.define({
  tag: "ui-file-input-item-remove",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-file-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/file-input
 */
export const List = CustomElement.define({
  tag: "ui-file-input-list",
  properties: {
  },
  events: {
  },
})

/**
 * Wraps your own <button>, so it keeps its native behavior.
 * @see https://ui-sdk.dev/docs/web-components/components/file-input
 */
export const Trigger = CustomElement.define({
  tag: "ui-file-input-trigger",
  properties: {
  },
  events: {
  },
})
