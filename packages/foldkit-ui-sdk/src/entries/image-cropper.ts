// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/image-cropper"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Choose the part of an image to keep by moving and resizing a selection, or by panning and zooming the image under it.
 * @see https://ui-sdk.dev/docs/web-components/components/image-cropper
 */
export const Root = CustomElement.define({
  tag: "ui-image-cropper",
  properties: {
    crop: Schema.Unknown,
    defaultCrop: Schema.Unknown,
    src: Schema.String,
    mode: Schema.Literals(["frame", "box"]),
    aspectRatio: Schema.Number,
    shape: Schema.Literals(["circle", "rectangle"]),
    minWidth: Schema.Number,
    minHeight: Schema.Number,
    maxZoom: Schema.Number,
    disabled: Schema.Boolean,
  },
  events: {
    "cropchange": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
    "cropcommit": Schema.Struct({
      value: Schema.Unknown,
      reason: Schema.String,
      source: Schema.String,
    }),
  },
})

/**
 * Part of `<ui-image-cropper>`.
 * @see https://ui-sdk.dev/docs/web-components/components/image-cropper
 */
export const Flip = CustomElement.define({
  tag: "ui-image-cropper-flip",
  properties: {
    direction: Schema.Literals(["horizontal", "vertical"]),
  },
  events: {
  },
})

/**
 * Part of `<ui-image-cropper>`.
 * @see https://ui-sdk.dev/docs/web-components/components/image-cropper
 */
export const Grid = CustomElement.define({
  tag: "ui-image-cropper-grid",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-image-cropper>`.
 * @see https://ui-sdk.dev/docs/web-components/components/image-cropper
 */
export const Handle = CustomElement.define({
  tag: "ui-image-cropper-handle",
  properties: {
    position: Schema.Literals(["s", "e", "n", "w", "ne", "nw", "se", "sw"]),
  },
  events: {
  },
})

/**
 * Part of `<ui-image-cropper>`.
 * @see https://ui-sdk.dev/docs/web-components/components/image-cropper
 */
export const Image = CustomElement.define({
  tag: "ui-image-cropper-image",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-image-cropper>`.
 * @see https://ui-sdk.dev/docs/web-components/components/image-cropper
 */
export const Rotate = CustomElement.define({
  tag: "ui-image-cropper-rotate",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-image-cropper>`.
 * @see https://ui-sdk.dev/docs/web-components/components/image-cropper
 */
export const Selection = CustomElement.define({
  tag: "ui-image-cropper-selection",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-image-cropper>`.
 * @see https://ui-sdk.dev/docs/web-components/components/image-cropper
 */
export const Viewport = CustomElement.define({
  tag: "ui-image-cropper-viewport",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-image-cropper>`.
 * @see https://ui-sdk.dev/docs/web-components/components/image-cropper
 */
export const Zoom = CustomElement.define({
  tag: "ui-image-cropper-zoom",
  properties: {
  },
  events: {
  },
})
