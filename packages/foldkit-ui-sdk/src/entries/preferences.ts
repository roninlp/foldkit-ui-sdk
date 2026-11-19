// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/preferences"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Apply user preferences to data attributes so your styles can follow them.
 * @see https://ui-sdk.dev/docs/web-components/components/preferences
 */
export const Root = CustomElement.define({
  tag: "ui-preferences",
  properties: {
    preferences: Schema.Array(Schema.Unknown),
  },
  events: {
  },
})
