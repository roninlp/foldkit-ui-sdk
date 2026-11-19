// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/toast"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Part of `<ui-toast-region>`.
 * @see https://ui-sdk.dev/docs/web-components/components/toast
 */
export const Root = CustomElement.define({
  tag: "ui-toast",
  properties: {
  },
  events: {
  },
})

/**
 * Runs the toast's action. Without one, an `action` attribute fires a cancelable `action` event; pass a Promise to `event.detail.waitUntil()` to keep the toast open, and the button pending, until it settles.
 * @see https://ui-sdk.dev/docs/web-components/components/toast
 */
export const Action = CustomElement.define({
  tag: "ui-toast-action",
  properties: {
    dismiss: Schema.Boolean,
  },
  events: {
    "action": Schema.Unknown,
  },
})

/**
 * Closes the toast. With an `action` attribute, fires `action` first, like the action part.
 * @see https://ui-sdk.dev/docs/web-components/components/toast
 */
export const Close = CustomElement.define({
  tag: "ui-toast-close",
  properties: {
  },
  events: {
    "action": Schema.Unknown,
  },
})

/**
 * Part of `<ui-toast-region>`.
 * @see https://ui-sdk.dev/docs/web-components/components/toast
 */
export const Description = CustomElement.define({
  tag: "ui-toast-description",
  properties: {
  },
  events: {
  },
})

/**
 * <ui-toast-region> shows a toaster's toasts. Place it once. Without children it renders each toast from its data. With a <template> holding a <ui-toast>, it clones that for each toast, and parts without content of thei...
 * @see https://ui-sdk.dev/docs/web-components/components/toast
 */
export const Region = CustomElement.define({
  tag: "ui-toast-region",
  properties: {
    toaster: Schema.Unknown,
    renderToast: Schema.Unknown,
    side: Schema.Literals(["top", "bottom"]),
    align: Schema.Literals(["center", "start", "end"]),
    maxVisible: Schema.Number,
    expanded: Schema.Boolean,
    shortcut: Schema.NullOr(Schema.String),
    pendingAnnouncement: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-toast-region>`.
 * @see https://ui-sdk.dev/docs/web-components/components/toast
 */
export const Title = CustomElement.define({
  tag: "ui-toast-title",
  properties: {
  },
  events: {
  },
})
