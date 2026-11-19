// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/overlays"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * <ui-overlay-host> renders what toast() and confirm() open, from anywhere. Mount it once. Set `toast` to `{ attributes, template }` for the toast regions it renders.
 * @see https://ui-sdk.dev/docs/web-components/components/overlays
 */
export const OverlayHost = CustomElement.define({
  tag: "ui-overlay-host",
  properties: {
    overlays: Schema.Unknown,
    toast: Schema.Unknown,
  },
  events: {
  },
})
