// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `pnpm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/token-input"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Mix editable text with tokens for files, people, tags, and other references.
 * @see https://ui-sdk.dev/docs/web-components/components/token-input
 */
export const Root = CustomElement.define({
  tag: "ui-token-input",
  properties: {
    value: Schema.Unknown,
    defaultValue: Schema.Unknown,
    codec: Schema.Unknown,
    getTokenDescription: Schema.Unknown,
    history: Schema.Unknown,
    renderToken: Schema.Unknown,
    name: Schema.String,
    submitShortcut: Schema.Literals(["enter", "mod+enter"]),
    tokenDeletion: Schema.Literals(["select", "whole", "revert"]),
    copy: Schema.Literals(["label", "codec"]),
    disabled: Schema.Boolean,
    readOnly: Schema.Boolean,
    required: Schema.Boolean,
  },
  events: {
    "valuechange": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-token-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/token-input
 */
export const Editor = CustomElement.define({
  tag: "ui-token-input-editor",
  properties: {
    placeholder: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-token-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/token-input
 */
export const Token = CustomElement.define({
  tag: "ui-token-input-token",
  properties: {
    token: Schema.String,
  },
  events: {
  },
})

/**
 * Part of `<ui-token-input>`.
 * @see https://ui-sdk.dev/docs/web-components/components/token-input
 */
export const TokenRemove = CustomElement.define({
  tag: "ui-token-input-token-remove",
  properties: {
    token: Schema.String,
  },
  events: {
  },
})
