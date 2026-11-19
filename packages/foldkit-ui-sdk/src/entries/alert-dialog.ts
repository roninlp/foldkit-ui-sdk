// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/alert-dialog"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Ask someone to confirm an action before you continue.
 * @see https://ui-sdk.dev/docs/web-components/components/alert-dialog
 */
export const Root = CustomElement.define({
  tag: "ui-alert-dialog",
  properties: {
    open: Schema.Boolean,
    persistentElements: Schema.Array(Schema.Unknown),
    container: Schema.Unknown,
    defaultOpen: Schema.Boolean,
    dismissible: Schema.Boolean,
    pendingAnnouncement: Schema.String,
  },
  events: {
    "openchangecomplete": Schema.Struct({ value: Schema.Boolean }),
    "dismissattempt": Schema.Unknown,
    "openchange": Schema.Struct({
      value: Schema.Boolean,
      reason: Schema.String,
      source: Schema.String,
    }),
    "payloadchange": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-alert-dialog>`.
 * @see https://ui-sdk.dev/docs/web-components/components/alert-dialog
 */
export const Backdrop = CustomElement.define({
  tag: "ui-alert-dialog-backdrop",
  properties: {
  },
  events: {
  },
})

/**
 * With an `action` attribute, pressing it fires a cancelable `action` event. Pass a Promise to `event.detail.waitUntil()` to keep the dialog open, and the part pending, until it settles.
 * @see https://ui-sdk.dev/docs/web-components/components/alert-dialog
 */
export const Close = CustomElement.define({
  tag: "ui-alert-dialog-close",
  properties: {
    value: Schema.String,
  },
  events: {
    "action": Schema.Unknown,
  },
})

/**
 * Part of `<ui-alert-dialog>`.
 * @see https://ui-sdk.dev/docs/web-components/components/alert-dialog
 */
export const Content = CustomElement.define({
  tag: "ui-alert-dialog-content",
  properties: {
    container: Schema.Unknown,
    initialFocus: Schema.Unknown,
    finalFocus: Schema.Unknown,
    keepMounted: Schema.Boolean,
    inline: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-alert-dialog>`.
 * @see https://ui-sdk.dev/docs/web-components/components/alert-dialog
 */
export const Description = CustomElement.define({
  tag: "ui-alert-dialog-description",
  properties: {
  },
  events: {
  },
})

/**
 * Shows the shortcut of the trigger it's in, or its own `shortcut`, when it has no text of its own.
 * @see https://ui-sdk.dev/docs/web-components/components/alert-dialog
 */
export const Shortcut = CustomElement.define({
  tag: "ui-alert-dialog-shortcut",
  properties: {
    shortcut: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-alert-dialog>`.
 * @see https://ui-sdk.dev/docs/web-components/components/alert-dialog
 */
export const Title = CustomElement.define({
  tag: "ui-alert-dialog-title",
  properties: {
  },
  events: {
  },
})

/**
 * With `for="dialog-id"`, it opens that dialog from anywhere on the page.
 * @see https://ui-sdk.dev/docs/web-components/components/alert-dialog
 */
export const Trigger = CustomElement.define({
  tag: "ui-alert-dialog-trigger",
  properties: {
    payload: Schema.Unknown,
    disabled: Schema.Boolean,
    focusableWhenDisabled: Schema.Boolean,
    shortcut: Schema.String,
  },
  events: {
  },
})
