// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/avatar"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Show an image with a fallback while it loads or if it fails.
 * @see https://ui-sdk.dev/docs/web-components/components/avatar
 */
export const Root = CustomElement.define({
  tag: "ui-avatar",
  properties: {
  },
  events: {
    "loadingstatuschange": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-avatar>`.
 * @see https://ui-sdk.dev/docs/web-components/components/avatar
 */
export const Fallback = CustomElement.define({
  tag: "ui-avatar-fallback",
  properties: {
    delay: Schema.Number,
  },
  events: {
  },
})
