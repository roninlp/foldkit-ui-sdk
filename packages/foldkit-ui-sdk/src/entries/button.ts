// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/button"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Run an action, show that it's working, and keep it reachable when disabled.
 * @see https://ui-sdk.dev/docs/web-components/components/button
 */
export const Root = CustomElement.define({
  tag: "ui-button",
  properties: {
    disabled: Schema.Boolean,
    focusableWhenDisabled: Schema.Boolean,
    pendingAnnouncement: Schema.String,
  },
  events: {
  },
})
