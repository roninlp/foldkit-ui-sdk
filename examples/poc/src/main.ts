import { Schema } from 'effect'
import { Runtime, type Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// The root entry registers every UI SDK element and exports one namespace per
// component. A production app can import only what it renders:
//
//   import * as Toggle from 'foldkit-ui-sdk/toggle'
import { Popover, Tabs, Toggle } from 'foldkit-ui-sdk'

// MODEL

export const Model = Schema.Struct({
  bookmarked: Schema.Boolean,
  tab: Schema.String,
  detailsOpen: Schema.Boolean,
  readCount: Schema.Number,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ChangedBookmarked: { bookmarked: Schema.Boolean },
  ChangedTab: { tab: Schema.String },
  ChangedDetailsOpen: { open: Schema.Boolean },
  ClickedMarkAllRead: {},
})
export type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedBookmarked: ({ bookmarked }) => ({
      model: modifyFields(model, { bookmarked: () => bookmarked }),
    }),
    ChangedTab: ({ tab }) => ({
      model: modifyFields(model, { tab: () => tab }),
    }),
    ChangedDetailsOpen: ({ open }) => ({
      model: modifyFields(model, { detailsOpen: () => open }),
    }),
    ClickedMarkAllRead: () => ({
      model: modifyFields(model, {
        readCount: count => count + 1,
        bookmarked: () => true,
      }),
    }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: { bookmarked: false, tab: 'account', detailsOpen: false, readCount: 0 },
})

// VIEW

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const toggle = Toggle.Root.withMessage(h)
  const tabs = Tabs.Root.withMessage(h)
  const list = Tabs.List.withMessage(h)
  const tab = Tabs.Tab.withMessage(h)
  const panel = Tabs.Panel.withMessage(h)
  const popover = Popover.Root.withMessage(h)
  const trigger = Popover.Trigger.withMessage(h)
  const content = Popover.Content.withMessage(h)
  const title = Popover.Title.withMessage(h)
  const close = Popover.Close.withMessage(h)

  return {
    title: 'Foldkit + ui-sdk',
    body: h.div(
      [h.Class('p-8 flex flex-col gap-8 max-w-md')],
      [
        h.h1([h.Class('text-xl font-semibold')], ['Foldkit + ui-sdk']),
        toggle(
          [
            toggle.Pressed(model.bookmarked),
            toggle.OnPressedchange(detail =>
              Message.ChangedBookmarked({ bookmarked: detail.value })
            ),
          ],
          [h.button([h.Type('button')], ['Bookmark'])]
        ),
        tabs(
          [
            tabs.DefaultValue(model.tab),
            tabs.OnValuechange(detail =>
              Message.ChangedTab({ tab: detail.value ?? 'account' })
            ),
          ],
          [
            list([], [
              tab([tab.Value('account')], [
                h.button([h.Type('button')], ['Account']),
              ]),
              tab([tab.Value('password')], [
                h.button([h.Type('button')], ['Password']),
              ]),
            ]),
            panel([panel.Value('account')], ['Manage your profile.']),
            panel([panel.Value('password')], ['Choose a new password.']),
          ]
        ),
        popover(
          [
            popover.Open(model.detailsOpen),
            popover.OnOpenchange(detail =>
              Message.ChangedDetailsOpen({ open: detail.value })
            ),
          ],
          [
            trigger([], [h.button([h.Type('button')], ['Details'])]),
            content([], [
              title([], ['Project Details']),
              h.p([], [`Marked read ${model.readCount} times.`]),
              h.button(
                [
                  h.Type('button'),
                  h.Id('mark-read'),
                  h.OnClick(Message.ClickedMarkAllRead()),
                ],
                ['Mark all read']
              ),
              close([], [h.button([h.Type('button')], ['Done'])]),
            ]),
          ]
        ),
      ]
    ),
  }
}
