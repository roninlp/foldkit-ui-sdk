// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/resizable"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Resize, collapse, and save panel layouts with pointer and keyboard controls.
 * @see https://ui-sdk.dev/docs/web-components/components/resizable
 */
export const Root = CustomElement.define({
  tag: "ui-resizable",
  properties: {
    layout: Schema.Array(Schema.Number),
    storage: Schema.Unknown,
    defaultLayout: Schema.Array(Schema.Number),
    orientation: Schema.Literals(["horizontal", "vertical"]),
    disabled: Schema.Boolean,
    step: Schema.Number,
    largeStep: Schema.Number,
    autoSaveId: Schema.String,
  },
  events: {
    "layoutchange": Schema.Struct({
      value: Schema.Array(Schema.Number),
      reason: Schema.String,
      source: Schema.String,
    }),
    "layoutcommit": Schema.Struct({
      value: Schema.Array(Schema.Number),
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-resizable>`.
 * @see https://ui-sdk.dev/docs/web-components/components/resizable
 */
export const Handle = CustomElement.define({
  tag: "ui-resizable-handle",
  properties: {
    disabled: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-resizable>`.
 * @see https://ui-sdk.dev/docs/web-components/components/resizable
 */
export const Panel = CustomElement.define({
  tag: "ui-resizable-panel",
  properties: {
    id: Schema.String,
    defaultSize: Schema.Unknown,
    minSize: Schema.Unknown,
    maxSize: Schema.Unknown,
    collapsible: Schema.Boolean,
    collapsedSize: Schema.Unknown,
  },
  events: {
  },
})
