// Generated from @ui-sdk/web/custom-elements.json by scripts/generate.mjs.
// Do not edit. Run `npm run generate` after upgrading ui-sdk.
import "@ui-sdk/web/timeline"
import { Schema } from "effect"
import { CustomElement } from "foldkit"

/**
 * Show dated events in order, like an activity feed, a changelog or an order's progress, with arrow keys between them.
 * @see https://ui-sdk.dev/docs/web-components/components/timeline
 */
export const Root = CustomElement.define({
  tag: "ui-timeline",
  properties: {
    orientation: Schema.Literals(["horizontal", "vertical"]),
    loop: Schema.Boolean,
    feed: Schema.Boolean,
    busy: Schema.Boolean,
  },
  events: {
  },
})

/**
 * Part of `<ui-timeline>`.
 * @see https://ui-sdk.dev/docs/web-components/components/timeline
 */
export const Connector = CustomElement.define({
  tag: "ui-timeline-connector",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-timeline>`.
 * @see https://ui-sdk.dev/docs/web-components/components/timeline
 */
export const Description = CustomElement.define({
  tag: "ui-timeline-description",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-timeline>`.
 * @see https://ui-sdk.dev/docs/web-components/components/timeline
 */
export const Item = CustomElement.define({
  tag: "ui-timeline-item",
  properties: {
    value: Schema.String,
    status: Schema.Literals(["complete", "current", "upcoming"]),
  },
  events: {
  },
})

/**
 * Part of `<ui-timeline>`.
 * @see https://ui-sdk.dev/docs/web-components/components/timeline
 */
export const Marker = CustomElement.define({
  tag: "ui-timeline-marker",
  properties: {
  },
  events: {
  },
})

/**
 * Binds to the `<time>` inside it, so its `datetime` stays machine readable.
 * @see https://ui-sdk.dev/docs/web-components/components/timeline
 */
export const Time = CustomElement.define({
  tag: "ui-timeline-time",
  properties: {
  },
  events: {
  },
})

/**
 * Part of `<ui-timeline>`.
 * @see https://ui-sdk.dev/docs/web-components/components/timeline
 */
export const Title = CustomElement.define({
  tag: "ui-timeline-title",
  properties: {
  },
  events: {
  },
})
