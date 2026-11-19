import { Schema } from 'effect'
import { Runtime, type Update } from 'foldkit'
import { type Document, type Html, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// The root entry registers every UI SDK element and exports one namespace per
// component. A production app imports only what it renders:
//
//   import * as Switch from 'foldkit-ui-sdk/switch'
//
import {
  Accordion,
  Avatar,
  Checkbox,
  Dialog,
  Field,
  Input,
  Menu,
  Meter,
  Popover,
  Progress,
  Radio,
  Rating,
  SegmentedControl,
  Select,
  Separator,
  Slider,
  Switch,
  Tabs,
  Toggle,
  Tooltip,
  uiSdkVersion,
} from 'foldkit-ui-sdk'

// MODEL

export const Model = Schema.Struct({
  bookmarked: Schema.Boolean,
  emailsOn: Schema.Boolean,
  notify: Schema.Array(Schema.String),
  plan: Schema.String,
  tab: Schema.String,
  openFaqs: Schema.Array(Schema.String),
  budget: Schema.Number,
  rating: Schema.NullOr(Schema.Number),
  view: Schema.NullOr(Schema.String),
  upload: Schema.Number,
  dialogOpen: Schema.Boolean,
  deleted: Schema.Boolean,
  detailsOpen: Schema.Boolean,
  readCount: Schema.Number,
  pinned: Schema.Boolean,
  role: Schema.NullOr(Schema.String),
  username: Schema.String,
  lastAction: Schema.NullOr(Schema.String),
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  ChangedBookmarked: { bookmarked: Schema.Boolean },
  ChangedEmails: { checked: Schema.Boolean },
  ChangedNotify: { values: Schema.Array(Schema.String) },
  ChangedPlan: { plan: Schema.String },
  ChangedTab: { tab: Schema.String },
  ChangedFaqs: { open: Schema.Array(Schema.String) },
  ChangedBudget: { value: Schema.Number },
  ChangedRating: { value: Schema.NullOr(Schema.Number) },
  ChangedView: { value: Schema.NullOr(Schema.String) },
  ClickedUpload: {},
  ChangedDialogOpen: { open: Schema.Boolean },
  ClickedDeleteProject: {},
  ChangedDetailsOpen: { open: Schema.Boolean },
  ClickedMarkAllRead: {},
  ChangedPinned: { checked: Schema.Boolean },
  SelectedMenuAction: { action: Schema.String },
  ChangedRole: { value: Schema.NullOr(Schema.String) },
  ChangedUsername: { value: Schema.String },
})
export type Message = typeof Message.Type

// UPDATE

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    ChangedBookmarked: ({ bookmarked }) => ({
      model: modifyFields(model, { bookmarked: () => bookmarked }),
    }),
    ChangedEmails: ({ checked }) => ({
      model: modifyFields(model, { emailsOn: () => checked }),
    }),
    ChangedNotify: ({ values }) => ({
      model: modifyFields(model, { notify: () => values }),
    }),
    ChangedPlan: ({ plan }) => ({
      model: modifyFields(model, { plan: () => plan }),
    }),
    ChangedTab: ({ tab }) => ({
      model: modifyFields(model, { tab: () => tab }),
    }),
    ChangedFaqs: ({ open }) => ({
      model: modifyFields(model, { openFaqs: () => open }),
    }),
    ChangedBudget: ({ value }) => ({
      model: modifyFields(model, { budget: () => value }),
    }),
    ChangedRating: ({ value }) => ({
      model: modifyFields(model, { rating: () => value }),
    }),
    ChangedView: ({ value }) => ({
      model: modifyFields(model, { view: () => value }),
    }),
    ClickedUpload: () => ({
      model: modifyFields(model, {
        upload: value => Math.min(100, value + 20),
      }),
    }),
    ChangedDialogOpen: ({ open }) => ({
      model: modifyFields(model, { dialogOpen: () => open }),
    }),
    ClickedDeleteProject: () => ({
      model: modifyFields(model, {
        dialogOpen: () => false,
        deleted: () => true,
      }),
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
    ChangedPinned: ({ checked }) => ({
      model: modifyFields(model, { pinned: () => checked }),
    }),
    SelectedMenuAction: ({ action }) => ({
      model: modifyFields(model, { lastAction: () => action }),
    }),
    ChangedRole: ({ value }) => ({
      model: modifyFields(model, { role: () => value }),
    }),
    ChangedUsername: ({ value }) => ({
      model: modifyFields(model, { username: () => value }),
    }),
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    bookmarked: false,
    emailsOn: true,
    notify: ['email', 'releases'],
    plan: 'pro',
    tab: 'account',
    openFaqs: ['what'],
    budget: 240,
    rating: 4,
    view: 'week',
    upload: 40,
    dialogOpen: false,
    deleted: false,
    detailsOpen: false,
    readCount: 0,
    pinned: false,
    role: null,
    username: 'ada',
    lastAction: null,
  },
})

// VIEW

const faqs = [
  {
    value: 'what',
    question: 'What is this page built from?',
    answer:
      'Every control below is a UI SDK Web Component, bound to a Foldkit Model through foldkit-ui-sdk. Properties flow in, *change events flow back as Messages.',
  },
  {
    value: 'state',
    question: 'Who owns the state?',
    answer:
      'The app does. No primitive store lives in the Model and no Foldkit state lives in the element. The bindings only translate properties and events.',
  },
  {
    value: 'keyboard',
    question: 'Does the keyboard work?',
    answer:
      'Yes, exactly as in UI SDK’s React, Vue, Svelte and Solid adapters: arrows move the slider and tabs, Escape closes the popups, and focus follows the popup that opens.',
  },
]

const notifyOptions = [
  { value: 'email', label: 'Email digests' },
  { value: 'push', label: 'Push notifications' },
  { value: 'releases', label: 'Release notes' },
]

const plans = [
  { value: 'free', label: 'Free', note: '1 project' },
  { value: 'pro', label: 'Pro', note: 'Unlimited projects' },
  { value: 'team', label: 'Team', note: 'Shared workspace' },
]

const star = (h: HtmlBuilder<Message>) =>
  // web.css paints the star itself from --rating-fill; the item only needs to
  // exist in the template the component clones per star.
  h.svg(
    [h.ViewBox('0 0 24 24'), h.Fill('none'), h.Stroke('currentColor'), h.StrokeWidth('2'), h.Attribute('aria-hidden', 'true'), h.Class('star-icon')],
    [
      h.path(
        [h.D(
          'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z'
        )],
        [],
      ),
    ],
  )

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  // One builder per part, bound to this view's Message universe.
  const toggle = Toggle.Root.withMessage(h)
  const switchRoot = Switch.Root.withMessage(h)
  const switchThumb = Switch.Thumb.withMessage(h)
  const checkbox = Checkbox.Root.withMessage(h)
  const checkboxIndicator = Checkbox.Indicator.withMessage(h)
  const checkboxGroup = Checkbox.Group.withMessage(h)
  const radio = Radio.Root.withMessage(h)
  const radioIndicator = Radio.Indicator.withMessage(h)
  const radioGroup = Radio.Group.withMessage(h)
  const tabs = Tabs.Root.withMessage(h)
  const tabList = Tabs.List.withMessage(h)
  const tab = Tabs.Tab.withMessage(h)
  const panel = Tabs.Panel.withMessage(h)
  const accordion = Accordion.Root.withMessage(h)
  const accordionItem = Accordion.Item.withMessage(h)
  const accordionHeader = Accordion.Header.withMessage(h)
  const accordionTrigger = Accordion.Trigger.withMessage(h)
  const accordionPanel = Accordion.Panel.withMessage(h)
  const slider = Slider.Root.withMessage(h)
  const sliderValue = Slider.Value.withMessage(h)
  const sliderControl = Slider.Control.withMessage(h)
  const sliderTrack = Slider.Track.withMessage(h)
  const sliderIndicator = Slider.Indicator.withMessage(h)
  const sliderThumb = Slider.Thumb.withMessage(h)
  const rating = Rating.Root.withMessage(h)
  const ratingItem = Rating.Item.withMessage(h)
  const segmented = SegmentedControl.Root.withMessage(h)
  const segmentedIndicator = SegmentedControl.Indicator.withMessage(h)
  const segmentedItem = SegmentedControl.Item.withMessage(h)
  const progress = Progress.Root.withMessage(h)
  const progressTrack = Progress.Track.withMessage(h)
  const progressIndicator = Progress.Indicator.withMessage(h)
  const meter = Meter.Root.withMessage(h)
  const meterTrack = Meter.Track.withMessage(h)
  const meterIndicator = Meter.Indicator.withMessage(h)
  const avatar = Avatar.Root.withMessage(h)
  const avatarFallback = Avatar.Fallback.withMessage(h)
  const tooltip = Tooltip.Root.withMessage(h)
  const tooltipTrigger = Tooltip.Trigger.withMessage(h)
  const tooltipContent = Tooltip.Content.withMessage(h)
  const popover = Popover.Root.withMessage(h)
  const popoverTrigger = Popover.Trigger.withMessage(h)
  const popoverContent = Popover.Content.withMessage(h)
  const popoverTitle = Popover.Title.withMessage(h)
  const popoverClose = Popover.Close.withMessage(h)
  const dialog = Dialog.Root.withMessage(h)
  const dialogTrigger = Dialog.Trigger.withMessage(h)
  const dialogBackdrop = Dialog.Backdrop.withMessage(h)
  const dialogContent = Dialog.Content.withMessage(h)
  const dialogTitle = Dialog.Title.withMessage(h)
  const dialogDescription = Dialog.Description.withMessage(h)
  const dialogClose = Dialog.Close.withMessage(h)
  const menu = Menu.Root.withMessage(h)
  const menuTrigger = Menu.Trigger.withMessage(h)
  const menuContent = Menu.Content.withMessage(h)
  const menuItem = Menu.Item.withMessage(h)
  const menuSeparator = Menu.Separator.withMessage(h)
  const menuCheckboxItem = Menu.CheckboxItem.withMessage(h)
  const select = Select.Root.withMessage(h)
  const selectLabel = Select.Label.withMessage(h)
  const selectTrigger = Select.Trigger.withMessage(h)
  const selectValue = Select.Value.withMessage(h)
  const selectContent = Select.Content.withMessage(h)
  const selectItem = Select.Item.withMessage(h)
  const field = Field.Root.withMessage(h)
  const fieldLabel = Field.Label.withMessage(h)
  const fieldDescription = Field.Description.withMessage(h)
  const input = Input.Root.withMessage(h)
  const separator = Separator.Root.withMessage(h)

  const card = (title: string, note: string, children: ReadonlyArray<Html | string>) =>
    h.section([h.Class('card')], [
      h.h3([], [title]),
      h.p([h.Class('card-note')], [note]),
      h.div([h.Class('card-demo')], children),
    ])

  // Buttons inside trigger parts are styled by UI SDK's layer, which the part
  // hands its data-slot to. Only bare buttons need the .btn class below.
  const actionButton = (text: string) => h.button([h.Type('button')], [text])

  return {
    title: 'foldkit-ui-sdk — component showcase',
    body: h.div([h.Class('page')], [
      h.header([h.Class('header')], [
        h.h1([], ['foldkit-ui-sdk']),
        h.p([h.Class('lede')], [
          'UI SDK’s Web Components, bound to a Foldkit app. Every control on this page holds its state in the Model above, through the same ',
          h.code([], ['CustomElement.define']),
          ' seam.',
        ]),
        h.p([h.Class('meta')], [
          `UI SDK ${uiSdkVersion} · 56 entries · click, drag and type anywhere`,
        ]),
      ]),

      h.main([h.Class('grid')], [
        // Toggle — pressed state in the Model.
        card(
          'Toggle',
          'A bookmark button. aria-pressed follows the Model.',
          [
            toggle(
              [
                toggle.Pressed(model.bookmarked),
                toggle.OnPressedchange(detail =>
                  Message.ChangedBookmarked({ bookmarked: detail.value }),
                ),
              ],
              [h.button([h.Type('button')], [model.bookmarked ? 'Bookmarked' : 'Bookmark'])],
            ),
          ],
        ),

        // Switch — a settings row.
        card(
          'Switch',
          'Email notifications, on by default.',
          [
            h.label([h.Class('row')], [
              switchRoot(
                [
                  switchRoot.Checked(model.emailsOn),
                  switchRoot.OnCheckedchange(detail =>
                    Message.ChangedEmails({ checked: detail.value }),
                  ),
                ],
                [switchThumb([], [])],
              ),
              h.span([], ['Email notifications']),
            ]),
          ],
        ),

        // Checkbox group — the group owns the list of checked values.
        card(
          'Checkbox group',
          'The Model holds the checked values as a list.',
          [
            checkboxGroup(
              [
                checkboxGroup.Value(model.notify),
                checkboxGroup.AllValues(notifyOptions.map(option => option.value)),
                checkboxGroup.OnValuechange(detail =>
                  Message.ChangedNotify({ values: detail.value }),
                ),
              ],
              notifyOptions.map(option =>
                h.label([h.Class('row')], [
                  checkbox(
                    [checkbox.Value(option.value)],
                    [
                      checkboxIndicator(
                        [h.Attribute('aria-hidden', 'true')],
                        ['✓'],
                      ),
                    ],
                  ),
                  h.span([], [option.label]),
                ]),
              ),
            ),
          ],
        ),

        // Radio group — one plan, arrows move, form-associated.
        card(
          'Radio group',
          'Arrow keys move, the Model holds the plan.',
          [
            radioGroup(
              [
                radioGroup.Value(model.plan),
                radioGroup.OnValuechange(detail =>
                  Message.ChangedPlan({ plan: detail.value ?? 'pro' }),
                ),
              ],
              plans.map(plan =>
                h.label([h.Class('row')], [
                  radio([radio.Value(plan.value)], [radioIndicator([], [])]),
                  h.span([], [plan.label]),
                  h.span([h.Class('muted')], [plan.note]),
                ]),
              ),
            ),
          ],
        ),

        // Tabs — controlled by the Model.
        card(
          'Tabs',
          'Selection is a Model field, panels stay mounted.',
          [
            tabs(
              [
                tabs.Value(model.tab),
                tabs.OnValuechange(detail =>
                  Message.ChangedTab({ tab: detail.value ?? 'account' }),
                ),
              ],
              [
                tabList([], [
                  tab([tab.Value('account')], [h.button([h.Type('button')], ['Account'])]),
                  tab([tab.Value('password')], [h.button([h.Type('button')], ['Password'])]),
                  tab([tab.Value('team')], [h.button([h.Type('button')], ['Team'])]),
                ]),
                panel([panel.Value('account')], ['Manage your public profile.']),
                panel([panel.Value('password')], ['Choose a new password.']),
                panel([panel.Value('team')], ['Invite people to your workspace.']),
              ],
            ),
          ],
        ),

        // Accordion — an open list in the Model.
        card(
          'Accordion',
          'Multiple sections can stay open at once.',
          [
            accordion(
              [
                accordion.Value(model.openFaqs),
                accordion.Multiple(true),
                accordion.Collapsible(true),
                accordion.OnValuechange(detail =>
                  Message.ChangedFaqs({ open: detail.value }),
                ),
              ],
              faqs.map(faq =>
                accordionItem([accordionItem.Value(faq.value)], [
                  accordionHeader(
                    [],
                    [h.h3([], [accordionTrigger([], [h.button([h.Type('button')], [faq.question])])])],
                  ),
                  accordionPanel([], [faq.answer]),
                ]),
              ),
            ),
          ],
        ),

        // Slider — the value readout is UI SDK's own value part.
        card(
          'Slider',
          'Drag the thumb, or focus it and use the arrow keys.',
          [
            slider(
              [
                slider.Value([model.budget]),
                slider.Min(0),
                slider.Max(500),
                slider.Step(10),
                slider.Format({
                  style: 'currency',
                  currency: 'USD',
                  maximumFractionDigits: 0,
                }),
                slider.OnValuechange(detail => {
                  const first = detail.value[0]
                  return Message.ChangedBudget({
                    value: typeof first === 'number' ? first : model.budget,
                  })
                }),
              ],
              [
                h.div([h.Class('row')], [
                  h.span([], ['Budget']),
                  sliderValue([], []),
                ]),
                sliderControl([], [
                  sliderTrack([], [
                    sliderIndicator([], []),
                    sliderThumb(
                      [h.Attribute('aria-label', 'Budget')],
                      [],
                    ),
                  ]),
                ]),
              ],
            ),
          ],
        ),

        // Rating — items cloned from the template by the component.
        card(
          'Rating',
          'Whole and half stars, previewed as the pointer moves.',
          [
            h.div([h.Class('row')], [
              rating(
                [
                  rating.Value(model.rating),
                  rating.OnValuechange(detail =>
                    Message.ChangedRating({ value: detail.value }),
                  ),
                ],
                [h.template([], [ratingItem([], [star(h)])])],
              ),
              h.span([h.Class('muted')], [
                model.rating === null ? 'No score yet' : `${model.rating} of 5`,
              ]),
            ]),
          ],
        ),

        // Segmented control — the indicator slides to the choice.
        card(
          'Segmented control',
          'A row of buttons for a small set of views.',
          [
            segmented(
              [
                segmented.Value(model.view),
                segmented.OnValuechange(detail =>
                  Message.ChangedView({ value: detail.value }),
                ),
              ],
              [
                segmentedIndicator([], []),
                segmentedItem([segmentedItem.Value('day')], ['Day']),
                segmentedItem([segmentedItem.Value('week')], ['Week']),
                segmentedItem([segmentedItem.Value('month')], ['Month']),
              ],
            ),
          ],
        ),

        // Progress + Meter — one moves, one reads.
        card(
          'Progress and meter',
          'Progress from the Model, a meter that just reads.',
          [
            h.div([h.Class('row')], [
              h.span([], ['Uploading assets']),
              h.span([h.Class('muted')], [`${model.upload}%`]),
            ]),
            progress(
              [progress.Value(model.upload)],
              [progressTrack([], [progressIndicator([], [])])],
            ),
            h.div([h.Class('row')], [
              h.span([], ['Storage']),
              h.span([h.Class('muted')], ['62%']),
            ]),
            meter([meter.Value(62)], [meterTrack([], [meterIndicator([], [])])]),
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('btn'),
                      h.Id('upload-next'),
                      h.OnClick(Message.ClickedUpload()),
                    ],
                    ['Upload the next chunk'],
                  ),
          ],
        ),

        // Avatar + Tooltip — presentation parts.
        card(
          'Avatar and tooltip',
          'A fallback while the image loads, a hint on hover.',
          [
            h.div([h.Class('row')], [
              avatar([], [avatarFallback([], ['AL'])]),
              h.div([], [
                h.strong([], ['Ada Lovelace']),
                h.div([h.Class('muted')], ['Analytical Engine team']),
              ]),
              tooltip(
                [],
                [
                  tooltipTrigger([], [actionButton('Share')]),
                  tooltipContent([], ['Anyone with the link can view.']),
                ],
              ),
            ]),
          ],
        ),

        // Popover — open across Foldkit re-renders.
        card(
          'Popover',
          'Open, dispatch a Message, stay open on the re-render.',
          [
            popover(
              [
                popover.Open(model.detailsOpen),
                popover.OnOpenchange(detail =>
                  Message.ChangedDetailsOpen({ open: detail.value }),
                ),
              ],
              [
                popoverTrigger([], [actionButton('Details')]),
                popoverContent([], [
                  popoverTitle([], ['Project details']),
                  h.p([], [`Marked read ${model.readCount} times.`]),
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('btn'),
                      h.Id('mark-read'),
                      h.OnClick(Message.ClickedMarkAllRead()),
                    ],
                    ['Mark all read'],
                  ),
                  popoverClose([], [h.button([h.Type('button'), h.Class('btn')], ['Done'])]),
                ]),
              ],
            ),
          ],
        ),

        // Dialog — a focused task over the page.
        card(
          'Dialog',
          'A confirm step before the destructive action.',
          [
            dialog(
              [
                dialog.Open(model.dialogOpen),
                dialog.OnOpenchange(detail =>
                  Message.ChangedDialogOpen({ open: detail.value }),
                ),
              ],
              [
                dialogTrigger([], [actionButton(model.deleted ? 'Delete again…' : 'Delete project…')]),
                dialogBackdrop([], []),
                dialogContent([], [
                  dialogTitle([], ['Delete this project?']),
                  dialogDescription([], [
                    'The project and its deployments are removed permanently. This cannot be undone.',
                  ]),
                  h.div([h.Class('row')], [
                    dialogClose([], [h.button([h.Type('button'), h.Class('btn')], ['Cancel'])]),
                    h.button(
                      [
                        h.Type('button'),
                        h.Class('btn btn-danger'),
                        h.Id('confirm-delete'),
                        h.OnClick(Message.ClickedDeleteProject()),
                      ],
                      ['Delete'],
                    ),
                  ]),
                ]),
              ],
            ),
            model.deleted
              ? h.p([h.Class('muted')], ['Project deleted. The Model remembers.'])
              : '',
          ],
        ),

        // Menu — items, a separator, a checkbox item.
        card(
          'Menu',
          'Keyboard, typeahead and a checkbox item that reports back.',
          [
            menu(
              [],
              [
                menuTrigger([], [actionButton('Actions')]),
                menuContent([], [
                  menuItem(
                    [
                      menuItem.Value('rename'),
                      // The select detail is the selecting DOM event, so the
                      // known value is closed over instead of decoded.
                      menuItem.OnSelect(() => Message.SelectedMenuAction({ action: 'rename' })),
                    ],
                    ['Rename'],
                  ),
                  menuItem(
                    [
                      menuItem.Value('duplicate'),
                      menuItem.OnSelect(() => Message.SelectedMenuAction({ action: 'duplicate' })),
                    ],
                    ['Duplicate'],
                  ),
                  menuSeparator([], []),
                  menuCheckboxItem(
                    [
                      menuCheckboxItem.Value('pinned'),
                      menuCheckboxItem.Label('Pin to sidebar'),
                      menuCheckboxItem.Checked(model.pinned),
                      menuCheckboxItem.OnCheckedchange(detail =>
                        Message.ChangedPinned({ checked: detail.value }),
                      ),
                    ],
                    ['Pin to sidebar'],
                  ),
                  menuSeparator([], []),
                  menuItem(
                    [
                      menuItem.Value('delete'),
                      menuItem.Destructive(true),
                      menuItem.OnSelect(() => Message.SelectedMenuAction({ action: 'delete' })),
                    ],
                    ['Delete'],
                  ),
                ]),
              ],
            ),
            h.p([h.Class('muted')], [
              model.lastAction === null
                ? 'Nothing picked yet.'
                : `Last action: ${model.lastAction}`,
            ]),
          ],
        ),

        // Select — one value from a popup list.
        card(
          'Select',
          'Choose a role; the Model holds the value.',
          [
            select(
              [
                select.Placeholder('Choose a role'),
                select.Value(model.role),
                select.OnValuechange(detail => {
                  const value = detail.value
                  return Message.ChangedRole({
                    value: typeof value === 'string' ? value : null,
                  })
                }),
              ],
              [
                selectLabel([], ['Role']),
                selectTrigger(
                  [],
                  [h.button([h.Type('button')], [selectValue([], [])])],
                ),
                selectContent([], [
                  selectItem([selectItem.Value('viewer'), selectItem.Label('Viewer')], ['Viewer']),
                  selectItem([selectItem.Value('editor'), selectItem.Label('Editor')], ['Editor']),
                  selectItem([selectItem.Value('admin'), selectItem.Label('Admin')], ['Admin']),
                ]),
              ],
            ),
          ],
        ),

        // Field + Input + Separator.
        card(
          'Field and input',
          'The field wires the label and description to the control.',
          [
            field(
              [],
              [
                fieldLabel([], ['Username']),
                input(
                  [
                    input.Value(model.username),
                    input.OnValuechange(detail =>
                      Message.ChangedUsername({ value: detail.value }),
                    ),
                  ],
                  [
                    h.input(
                      [
                        h.Type('text'),
                        h.Value(model.username),
                        h.Placeholder('ada'),
                        h.Autocomplete('username'),
                      ],
                    ),
                  ],
                ),
                fieldDescription([], ['This is your public name on the page.']),
              ],
            ),
            separator([], []),
            h.p([h.Class('muted')], [`Hello, ${model.username}.`]),
          ],
        ),
      ]),

      h.footer([h.Class('footer')], [
        h.span([], ['foldkit-ui-sdk · a binding layer, not a reimplementation · ']),
        h.a([h.Href('https://ui-sdk.dev'), h.Class('link')], ['UI SDK']),
        h.span([], [' behaviors, ']),
        h.a([h.Href('https://foldkit.dev'), h.Class('link')], ['Foldkit']),
        h.span([], [' runtime']),
      ]),
    ]),
  }
}
