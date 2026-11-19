// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/separator"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Divide groups of content with a horizontal or vertical line.
 * @see https://ui-sdk.dev/docs/web-components/components/separator
 */
export const Root = CustomElement.define({
  tag: "ui-separator",
  properties: {
    orientation: Schema.Literals(["horizontal", "vertical"]),
    decorative: Schema.Boolean,
  },
  events: {
  },
})
