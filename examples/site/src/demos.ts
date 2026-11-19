import type { Html, HtmlBuilder } from 'foldkit/html'

// The site is the docs, rendered with the thing it documents: the navigation
// is a SegmentedControl, the FAQ is an Accordion, the version chip is a
// Tooltip, and the agents page drives a Switch through the real agent bridge.
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
} from 'foldkit-ui-sdk'

import { Message, type Model } from './model'
// Every live demo on the site: the showcase grid renders all of them, and
// each component's docs page renders its own. One entry per demo, so the two
// pages can never drift apart.

export type Demo = {
  /** Sidebar and docs-article slug. */
  slug: string
  /** Card and docs-page title. */
  title: string
  /** The namespaces the demo uses; docs pages look their parts up from these. */
  namespaces: ReadonlyArray<string>
  /** The one-line note under the showcase card title. */
  note: string
  /** The docs page overview paragraph. */
  overview: string
  /** The docs page code snippet. */
  code: string
  render: (model: Model, h: HtmlBuilder<Message>) => ReadonlyArray<Html | string>
}

const faqs = [
  {
    value: 'what',
    question: 'What is this page built from?',
    answer:
      'Every control on the showcase is a UI SDK Web Component, bound to a Foldkit Model through foldkit-ui-sdk. Properties flow in, *change events flow back as Messages.',
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

// Buttons inside trigger parts are styled by UI SDK's layer, which the part
// hands its data-slot to. Only bare buttons need the .btn class in styles.css.
const actionButton = (h: HtmlBuilder<Message>, text: string) =>
  h.button([h.Type('button')], [text])

export const demos: ReadonlyArray<Demo> = [
  {
    slug: 'toggle',
    title: 'Toggle',
    namespaces: ['Toggle'],
    note: 'A bookmark button. aria-pressed follows the Model.',
    overview:
      'A two-state button: pressed or not. The Toggle.Root part wraps your own button and reports pressedchange, decoded to { value, source }, back to the Model. aria-pressed and the data-pressed styling hook follow automatically.',
    code: `import { Toggle } from 'foldkit-ui-sdk/toggle'

const toggle = Toggle.Root.withMessage(h)

toggle(
  [
    toggle.Pressed(model.bookmarked),
    toggle.OnPressedchange(detail =>
      Message.ChangedBookmarked({ bookmarked: detail.value }),
    ),
  ],
  [h.button([h.Type('button')], [model.bookmarked ? 'Bookmarked' : 'Bookmark'])],
)`,
    render: (model, h) => {
      const toggle = Toggle.Root.withMessage(h)
      return [
        toggle(
          [
            toggle.Pressed(model.bookmarked),
            toggle.OnPressedchange(detail =>
              Message.ChangedBookmarked({ bookmarked: detail.value }),
            ),
          ],
          [h.button([h.Type('button')], [model.bookmarked ? 'Bookmarked' : 'Bookmark'])],
        ),
      ]
    },
  },
  {
    slug: 'switch',
    title: 'Switch',
    namespaces: ['Switch'],
    note: 'Email notifications, on by default.',
    overview:
      'An on/off control for an immediate setting. Switch.Root carries checked and fires checkedchange with { value, source }; Switch.Thumb is the moving part. The label around it is your own markup.',
    code: `import { Switch } from 'foldkit-ui-sdk/switch'

const switchRoot = Switch.Root.withMessage(h)
const switchThumb = Switch.Thumb.withMessage(h)

switchRoot(
  [
    switchRoot.Checked(model.emailsOn),
    switchRoot.OnCheckedchange(detail =>
      Message.ChangedEmails({ checked: detail.value }),
    ),
  ],
  [switchThumb([], [])],
)`,
    render: (model, h) => {
      const switchRoot = Switch.Root.withMessage(h)
      const switchThumb = Switch.Thumb.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'checkbox',
    title: 'Checkbox group',
    namespaces: ['Checkbox'],
    note: 'The Model holds the checked values as a list.',
    overview:
      'Checkbox.Group owns the list of checked values and fires one valuechange per interaction; each Checkbox.Root inside declares its Value. The indicator is your own markup — text, an icon, or the check the stylesheet draws when you leave it empty.',
    code: `import { Checkbox } from 'foldkit-ui-sdk/checkbox'

const checkboxGroup = Checkbox.Group.withMessage(h)
const checkbox = Checkbox.Root.withMessage(h)
const checkboxIndicator = Checkbox.Indicator.withMessage(h)

checkboxGroup(
  [
    checkboxGroup.Value(model.notify),
    checkboxGroup.AllValues(['email', 'push', 'releases']),
    checkboxGroup.OnValuechange(detail =>
      Message.ChangedNotify({ values: detail.value }),
    ),
  ],
  options.map(option =>
    h.label([h.Class('row')], [
      checkbox([checkbox.Value(option.value)], [
        checkboxIndicator([h.Attribute('aria-hidden', 'true')], ['✓']),
      ]),
      h.span([], [option.label]),
    ]),
  ),
)`,
    render: (model, h) => {
      const checkboxGroup = Checkbox.Group.withMessage(h)
      const checkbox = Checkbox.Root.withMessage(h)
      const checkboxIndicator = Checkbox.Indicator.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'radio',
    title: 'Radio group',
    namespaces: ['Radio'],
    note: 'Arrow keys move, the Model holds the plan.',
    overview:
      'One value from a small set. Radio.Group carries the value and fires valuechange with { value, reason }; arrow keys move between the Radio.Root parts, and the selection is form-associated like a native radio group.',
    code: `import { Radio } from 'foldkit-ui-sdk/radio'

const radioGroup = Radio.Group.withMessage(h)
const radio = Radio.Root.withMessage(h)
const radioIndicator = Radio.Indicator.withMessage(h)

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
    ]),
  ),
)`,
    render: (model, h) => {
      const radioGroup = Radio.Group.withMessage(h)
      const radio = Radio.Root.withMessage(h)
      const radioIndicator = Radio.Indicator.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'tabs',
    title: 'Tabs',
    namespaces: ['Tabs'],
    note: 'Selection is a Model field, panels stay mounted.',
    overview:
      'Tabs.Root holds the selected value and fires valuechange; Tabs.List wraps the Tabs.Tab triggers and each Tabs.Panel stays in the DOM, hidden unless selected. Arrow keys move through the tabs and focus follows, exactly as in UI SDK’s other adapters.',
    code: `import { Tabs } from 'foldkit-ui-sdk/tabs'

const tabs = Tabs.Root.withMessage(h)
const tabList = Tabs.List.withMessage(h)
const tab = Tabs.Tab.withMessage(h)
const panel = Tabs.Panel.withMessage(h)

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
    ]),
    panel([panel.Value('account')], ['Manage your public profile.']),
    panel([panel.Value('password')], ['Choose a new password.']),
  ],
)`,
    render: (model, h) => {
      const tabs = Tabs.Root.withMessage(h)
      const tabList = Tabs.List.withMessage(h)
      const tab = Tabs.Tab.withMessage(h)
      const panel = Tabs.Panel.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'accordion',
    title: 'Accordion',
    namespaces: ['Accordion'],
    note: 'Multiple sections can stay open at once.',
    overview:
      'A list of collapsible sections. Accordion.Root carries the open values as a list — with Multiple(true) several stay open, with Collapsible(true) the last one can close too. Each Accordion.Item wraps a header, its trigger and a panel.',
    code: `import { Accordion } from 'foldkit-ui-sdk/accordion'

const accordion = Accordion.Root.withMessage(h)
const accordionItem = Accordion.Item.withMessage(h)
const accordionTrigger = Accordion.Trigger.withMessage(h)
const accordionPanel = Accordion.Panel.withMessage(h)

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
      accordionTrigger([], [h.button([h.Type('button')], [faq.question])]),
      accordionPanel([], [faq.answer]),
    ]),
  ),
)`,
    render: (model, h) => {
      const accordion = Accordion.Root.withMessage(h)
      const accordionItem = Accordion.Item.withMessage(h)
      const accordionHeader = Accordion.Header.withMessage(h)
      const accordionTrigger = Accordion.Trigger.withMessage(h)
      const accordionPanel = Accordion.Panel.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'slider',
    title: 'Slider',
    namespaces: ['Slider'],
    note: 'Drag the thumb, or focus it and use the arrow keys.',
    overview:
      'One or more numbers between min and max. Slider.Value in is an array; the Slider.Value part formats and renders the readout with the same Intl options you pass to Format. Dragging, clicking the track and the arrow keys all come back as one valuechange.',
    code: `import { Slider } from 'foldkit-ui-sdk/slider'

const slider = Slider.Root.withMessage(h)
const sliderValue = Slider.Value.withMessage(h)
const sliderControl = Slider.Control.withMessage(h)
const sliderTrack = Slider.Track.withMessage(h)
const sliderIndicator = Slider.Indicator.withMessage(h)
const sliderThumb = Slider.Thumb.withMessage(h)

slider(
  [
    slider.Value([model.budget]),
    slider.Min(0),
    slider.Max(500),
    slider.Step(10),
    slider.Format({ style: 'currency', currency: 'USD' }),
    slider.OnValuechange(detail =>
      Message.ChangedBudget({ value: detail.value[0] ?? model.budget }),
    ),
  ],
  [
    h.div([h.Class('row')], [h.span([], ['Budget']), sliderValue([], [])]),
    sliderControl([], [
      sliderTrack([], [
        sliderIndicator([], []),
        sliderThumb([h.Attribute('aria-label', 'Budget')], []),
      ]),
    ]),
  ],
)`,
    render: (model, h) => {
      const slider = Slider.Root.withMessage(h)
      const sliderValue = Slider.Value.withMessage(h)
      const sliderControl = Slider.Control.withMessage(h)
      const sliderTrack = Slider.Track.withMessage(h)
      const sliderIndicator = Slider.Indicator.withMessage(h)
      const sliderThumb = Slider.Thumb.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'rating',
    title: 'Rating',
    namespaces: ['Rating'],
    note: 'Whole and half stars, previewed as the pointer moves.',
    overview:
      'A value out of five, half steps included. You provide one template — the Rating.Item inside a template element — and the component clones it per star, painting the fill from --rating-fill so halves work. Pointer moves preview the score before the click commits it.',
    code: `import { Rating } from 'foldkit-ui-sdk/rating'

const rating = Rating.Root.withMessage(h)
const ratingItem = Rating.Item.withMessage(h)

rating(
  [
    rating.Value(model.rating),
    rating.OnValuechange(detail =>
      Message.ChangedRating({ value: detail.value }),
    ),
  ],
  [h.template([], [ratingItem([], [starIcon(h)])])],
)`,
    render: (model, h) => {
      const rating = Rating.Root.withMessage(h)
      const ratingItem = Rating.Item.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'segmented-control',
    title: 'Segmented control',
    namespaces: ['SegmentedControl'],
    note: 'A row of buttons for a small set of views.',
    overview:
      'A compact picker for two to four choices. SegmentedControl.Root holds the value, SegmentedControl.Indicator is the part that slides to the selected item, and each SegmentedControl.Item is one choice. The site’s own top navigation is one.',
    code: `import { SegmentedControl } from 'foldkit-ui-sdk/segmented-control'

const segmented = SegmentedControl.Root.withMessage(h)
const segmentedIndicator = SegmentedControl.Indicator.withMessage(h)
const segmentedItem = SegmentedControl.Item.withMessage(h)

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
)`,
    render: (model, h) => {
      const segmented = SegmentedControl.Root.withMessage(h)
      const segmentedIndicator = SegmentedControl.Indicator.withMessage(h)
      const segmentedItem = SegmentedControl.Item.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'progress-meter',
    title: 'Progress and meter',
    namespaces: ['Progress', 'Meter'],
    note: 'Progress from the Model, a meter that just reads.',
    overview:
      'Two read-only bars. Progress.Root reports how far a task has come; Meter.Root reads a value against min and max. Both take their number as a property, so a Model change is all it takes to move them — the bare button below adds twenty to the Model.',
    code: `import { Meter, Progress } from 'foldkit-ui-sdk'

const progress = Progress.Root.withMessage(h)
const progressTrack = Progress.Track.withMessage(h)
const progressIndicator = Progress.Indicator.withMessage(h)
const meter = Meter.Root.withMessage(h)
const meterTrack = Meter.Track.withMessage(h)
const meterIndicator = Meter.Indicator.withMessage(h)

progress(
  [progress.Value(model.upload)],
  [progressTrack([], [progressIndicator([], [])])],
)

meter([meter.Value(62)], [meterTrack([], [meterIndicator([], [])])]`,
    render: (model, h) => {
      const progress = Progress.Root.withMessage(h)
      const progressTrack = Progress.Track.withMessage(h)
      const progressIndicator = Progress.Indicator.withMessage(h)
      const meter = Meter.Root.withMessage(h)
      const meterTrack = Meter.Track.withMessage(h)
      const meterIndicator = Meter.Indicator.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'avatar-tooltip',
    title: 'Avatar and tooltip',
    namespaces: ['Avatar', 'Tooltip'],
    note: 'A fallback while the image loads, a hint on hover.',
    overview:
      'Two presentation parts. Avatar.Root clips its image and shows the Avatar.Fallback until it loads; Tooltip.Root wraps a trigger and shows its Tooltip.Content on hover and on focus, dismissing on Escape. Neither needs a Model field unless you want one.',
    code: `import { Avatar, Tooltip } from 'foldkit-ui-sdk'

const avatar = Avatar.Root.withMessage(h)
const avatarFallback = Avatar.Fallback.withMessage(h)
const tooltip = Tooltip.Root.withMessage(h)
const tooltipTrigger = Tooltip.Trigger.withMessage(h)
const tooltipContent = Tooltip.Content.withMessage(h)

avatar([], [avatarFallback([], ['AL'])])

tooltip([], [
  tooltipTrigger([], [h.button([h.Type('button')], ['Share'])]),
  tooltipContent([], ['Anyone with the link can view.']),
])`,
    render: (model, h) => {
      const avatar = Avatar.Root.withMessage(h)
      const avatarFallback = Avatar.Fallback.withMessage(h)
      const tooltip = Tooltip.Root.withMessage(h)
      const tooltipTrigger = Tooltip.Trigger.withMessage(h)
      const tooltipContent = Tooltip.Content.withMessage(h)
      return [
        h.div([h.Class('row')], [
          avatar([], [avatarFallback([], ['AL'])]),
          h.div([], [
            h.strong([], ['Ada Lovelace']),
            h.div([h.Class('muted')], ['Analytical Engine team']),
          ]),
          tooltip(
            [],
            [
              tooltipTrigger([], [actionButton(h, 'Share')]),
              tooltipContent([], ['Anyone with the link can view.']),
            ],
          ),
        ]),
      ]
    },
  },
  {
    slug: 'popover',
    title: 'Popover',
    namespaces: ['Popover'],
    note: 'Open, dispatch a Message, stay open on the re-render.',
    overview:
      'A floating panel anchored to its trigger. Popover.Open is a property, so the Model can own it: the demo opens it, dispatches a Message from inside, and the Foldkit re-render leaves the popup alone. Popover.Close is a part that dismisses it.',
    code: `import { Popover } from 'foldkit-ui-sdk/popover'

const popover = Popover.Root.withMessage(h)
const popoverTrigger = Popover.Trigger.withMessage(h)
const popoverContent = Popover.Content.withMessage(h)

popover(
  [
    popover.Open(model.detailsOpen),
    popover.OnOpenchange(detail =>
      Message.ChangedDetailsOpen({ open: detail.value }),
    ),
  ],
  [
    popoverTrigger([], [h.button([h.Type('button')], ['Details'])]),
    popoverContent([], ['Mark all read…']),
  ],
)`,
    render: (model, h) => {
      const popover = Popover.Root.withMessage(h)
      const popoverTrigger = Popover.Trigger.withMessage(h)
      const popoverContent = Popover.Content.withMessage(h)
      const popoverTitle = Popover.Title.withMessage(h)
      const popoverClose = Popover.Close.withMessage(h)
      return [
        popover(
          [
            popover.Open(model.detailsOpen),
            popover.OnOpenchange(detail =>
              Message.ChangedDetailsOpen({ open: detail.value }),
            ),
          ],
          [
            popoverTrigger([], [actionButton(h, 'Details')]),
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
      ]
    },
  },
  {
    slug: 'dialog',
    title: 'Dialog',
    namespaces: ['Dialog'],
    note: 'A confirm step before the destructive action.',
    overview:
      'A focused task over the page: Dialog.Open is a property the Model owns, the Dialog.Backdrop dims the page, and Dialog.Content traps focus and closes on Escape. Dialog.Trigger and Dialog.Close are both parts, so the demo confirms the destructive action from inside.',
    code: `import { Dialog } from 'foldkit-ui-sdk/dialog'

const dialog = Dialog.Root.withMessage(h)
const dialogTrigger = Dialog.Trigger.withMessage(h)
const dialogBackdrop = Dialog.Backdrop.withMessage(h)
const dialogContent = Dialog.Content.withMessage(h)
const dialogTitle = Dialog.Title.withMessage(h)
const dialogDescription = Dialog.Description.withMessage(h)
const dialogClose = Dialog.Close.withMessage(h)

dialog(
  [
    dialog.Open(model.dialogOpen),
    dialog.OnOpenchange(detail =>
      Message.ChangedDialogOpen({ open: detail.value }),
    ),
  ],
  [
    dialogTrigger([], [h.button([h.Type('button')], ['Delete project…'])]),
    dialogBackdrop([], []),
    dialogContent([], [
      dialogTitle([], ['Delete this project?']),
      dialogDescription([], ['This cannot be undone.']),
      dialogClose([], [h.button([h.Type('button')], ['Cancel'])]),
    ]),
  ],
)`,
    render: (model, h) => {
      const dialog = Dialog.Root.withMessage(h)
      const dialogTrigger = Dialog.Trigger.withMessage(h)
      const dialogBackdrop = Dialog.Backdrop.withMessage(h)
      const dialogContent = Dialog.Content.withMessage(h)
      const dialogTitle = Dialog.Title.withMessage(h)
      const dialogDescription = Dialog.Description.withMessage(h)
      const dialogClose = Dialog.Close.withMessage(h)
      return [
        dialog(
          [
            dialog.Open(model.dialogOpen),
            dialog.OnOpenchange(detail =>
              Message.ChangedDialogOpen({ open: detail.value }),
            ),
          ],
          [
            dialogTrigger([], [actionButton(h, model.deleted ? 'Delete again…' : 'Delete project…')]),
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
      ]
    },
  },
  {
    slug: 'menu',
    title: 'Menu',
    namespaces: ['Menu'],
    note: 'Keyboard, typeahead and a checkbox item that reports back.',
    overview:
      'An actions dropdown: Menu.Item fires select with the selecting event, Menu.CheckboxItem adds a checked property and checkedchange, Menu.Separator draws the line. Typeahead, arrow keys and focus all come from UI SDK’s tested behavior — nothing is reimplemented here.',
    code: `import { Menu } from 'foldkit-ui-sdk/menu'

const menu = Menu.Root.withMessage(h)
const menuTrigger = Menu.Trigger.withMessage(h)
const menuContent = Menu.Content.withMessage(h)
const menuItem = Menu.Item.withMessage(h)
const menuCheckboxItem = Menu.CheckboxItem.withMessage(h)

menu([], [
  menuTrigger([], [h.button([h.Type('button')], ['Actions'])]),
  menuContent([], [
    menuItem(
      [
        menuItem.Value('rename'),
        menuItem.OnSelect(() => Message.SelectedMenuAction({ action: 'rename' })),
      ],
      ['Rename'],
    ),
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
  ]),
])`,
    render: (model, h) => {
      const menu = Menu.Root.withMessage(h)
      const menuTrigger = Menu.Trigger.withMessage(h)
      const menuContent = Menu.Content.withMessage(h)
      const menuItem = Menu.Item.withMessage(h)
      const menuSeparator = Menu.Separator.withMessage(h)
      const menuCheckboxItem = Menu.CheckboxItem.withMessage(h)
      return [
        menu(
          [],
          [
            menuTrigger([], [actionButton(h, 'Actions')]),
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
      ]
    },
  },
  {
    slug: 'select',
    title: 'Select',
    namespaces: ['Select'],
    note: 'Choose a role; the Model holds the value.',
    overview:
      'One value from a popup list. Select.Trigger holds the button and Select.Value renders the chosen label — or the placeholder while the value is null. Select.Item fires valuechange with { value, reason }, and the Model keeps the choice.',
    code: `import { Select } from 'foldkit-ui-sdk/select'

const select = Select.Root.withMessage(h)
const selectTrigger = Select.Trigger.withMessage(h)
const selectValue = Select.Value.withMessage(h)
const selectContent = Select.Content.withMessage(h)
const selectItem = Select.Item.withMessage(h)

select(
  [
    select.Placeholder('Choose a role'),
    select.Value(model.role),
    select.OnValuechange(detail =>
      Message.ChangedRole({ value: detail.value }),
    ),
  ],
  [
    selectTrigger([], [h.button([h.Type('button')], [selectValue([], [])])]),
    selectContent([], [
      selectItem([selectItem.Value('viewer'), selectItem.Label('Viewer')], ['Viewer']),
      selectItem([selectItem.Value('editor'), selectItem.Label('Editor')], ['Editor']),
    ]),
  ],
)`,
    render: (model, h) => {
      const select = Select.Root.withMessage(h)
      const selectLabel = Select.Label.withMessage(h)
      const selectTrigger = Select.Trigger.withMessage(h)
      const selectValue = Select.Value.withMessage(h)
      const selectContent = Select.Content.withMessage(h)
      const selectItem = Select.Item.withMessage(h)
      return [
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
      ]
    },
  },
  {
    slug: 'field-input',
    title: 'Field and input',
    namespaces: ['Field', 'Input', 'Separator'],
    note: 'The field wires the label and description to the control.',
    overview:
      'Field.Root wires its Field.Label and Field.Description to the control between them — ids, aria-describedby, the lot. Input.Root wraps the native input and fires valuechange with { value, reason } on every keystroke, so the Model sees typing as it happens. Separator.Root is the rule between.',
    code: `import { Field, Input, Separator } from 'foldkit-ui-sdk'

const field = Field.Root.withMessage(h)
const fieldLabel = Field.Label.withMessage(h)
const fieldDescription = Field.Description.withMessage(h)
const input = Input.Root.withMessage(h)

field([], [
  fieldLabel([], ['Username']),
  input(
    [
      input.Value(model.username),
      input.OnValuechange(detail =>
        Message.ChangedUsername({ value: detail.value }),
      ),
    ],
    [
      h.input([
        h.Type('text'),
        h.Value(model.username),
        h.Placeholder('ada'),
        h.Autocomplete('username'),
      ]),
    ],
  ),
  fieldDescription([], ['This is your public name on the page.']),
])`,
    render: (model, h) => {
      const field = Field.Root.withMessage(h)
      const fieldLabel = Field.Label.withMessage(h)
      const fieldDescription = Field.Description.withMessage(h)
      const input = Input.Root.withMessage(h)
      const separator = Separator.Root.withMessage(h)
      return [
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
      ]
    },
  },
]

// The docs pages look demos up by slug; the sidebar walks the same array, so
// the navigation and the pages cannot drift apart either.
export const findDemo = (slug: string): Demo | undefined =>
  demos.find(demo => demo.slug === slug)
