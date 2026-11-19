// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/menubar"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Move between an application’s menus with one tab stop.
 * @see https://ui-sdk.dev/docs/web-components/components/menubar
 */
export const Root = CustomElement.define({
  tag: "ui-menubar",
  properties: {
    orientation: Schema.Literals(["horizontal", "vertical"]),
    loop: Schema.Boolean,
    disabled: Schema.Boolean,
    modal: Schema.Union([Schema.Boolean, Schema.Literal("pointer")]),
  },
  events: {
  },
})
