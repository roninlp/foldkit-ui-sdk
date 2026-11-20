import { createColorScheme, createPreference } from '@ui-sdk/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

// The docs pages for the components the showcase's sixteen demos do not cover.
// Same shape as the demos in demos.ts: a slug and title for the sidebar, the
// entries the page documents, the prose, one code sample and a live example
// whose state lives in the Model.
import {
  AlertDialog,
  Autocomplete,
  Button,
  Calendar,
  Carousel,
  Collapsible,
  ColorPicker,
  Combobox,
  Command,
  DateInput,
  DatePicker,
  Drawer,
  Field,
  FileInput,
  HoverCard,
  ImageCropper,
  Input,
  Label,
  Listbox,
  Menu,
  Menubar,
  NavigationMenu,
  NumberInput,
  OTPInput,
  Overlays,
  Pagination,
  PasswordInput,
  Preferences,
  Resizable,
  ScrollArea,
  Separator,
  Textarea,
  TimeInput,
  Timeline,
  Toast,
  Toggle,
  TokenInput,
  Toolbar,
  Tree,
  TriggerMenu,
  Waterfall,
} from 'foldkit-ui-sdk'

import { Message, type Model } from './model'
import { demoToaster } from './toast'
import type { Demo } from './demos'

const listOf = (value: unknown): ReadonlyArray<string> =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []

const textOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? value : null

/* Data the demos share */

const books = [
  { value: 'salt-archive', label: 'The Salt Archive' },
  { value: 'quiet-engine', label: 'The Quiet Engine' },
  { value: 'lowland-psalms', label: 'Lowland Psalms' },
]

const genres = [
  { value: 'ambient', label: 'Ambient' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'soul', label: 'Soul' },
  { value: 'folk', label: 'Folk' },
]

const colors = ['#6e56cf', '#12a594', '#0090ff', '#d6409f']

const palette = [
  { value: 'open-settings', label: 'Open settings', hint: '⌘,' },
  { value: 'new-project', label: 'New project', hint: '⌘N' },
  { value: 'invite', label: 'Invite a teammate', hint: '⌘I' },
  { value: 'sign-out', label: 'Sign out', hint: '' },
]

const readers = [
  { value: 'priya', label: 'Priya Raman' },
  { value: 'oskar', label: 'Oskar Lind' },
  { value: 'hana', label: 'Hana Mori' },
]

const timelineItems = [
  { value: 'v3.5', label: 'v3.5', date: 'Nov 2026', status: 'current' as const },
  { value: 'v3.4', label: 'v3.4', date: 'Aug 2026', status: 'complete' as const },
  { value: 'v3.3', label: 'v3.3', date: 'May 2026', status: 'complete' as const },
]

const treeItems = [
  {
    value: 'src',
    label: 'src',
    children: [
      { value: 'src/route.ts', label: 'route.ts' },
      { value: 'src/model.ts', label: 'model.ts' },
    ],
  },
  {
    value: 'docs',
    label: 'docs',
    children: [{ value: 'docs/architecture.md', label: 'architecture.md' }],
  },
  { value: 'README.md', label: 'README.md' },
]

const waterfallItems = [
  { value: 'document', label: 'dashboard', start: 0, duration: 168 },
  { value: 'styles', label: 'app.css', start: 176, duration: 92 },
  {
    value: 'scripts',
    label: 'app.js',
    start: 180,
    duration: 386,
    children: [{ value: 'charts', label: 'charts.js', start: 590, duration: 174 }],
  },
  { value: 'api', label: 'api/usage', start: 620, duration: 412 },
]

const accent = createPreference({
  values: ['iris', 'moss', 'ember'],
  defaultValue: 'iris',
  attribute: 'data-accent',
})

const scheme = createColorScheme()

// A tiny tree flattener: the Tree element owns expansion, but the demo also
// mirrors it in the Model, so the rows are rendered from the same expanded
// list the element reports.
const flattenTree = (
  items: ReadonlyArray<{ value: string; label: string; children?: ReadonlyArray<{ value: string; label: string }> }>,
  expanded: ReadonlyArray<string>,
): ReadonlyArray<{ value: string; label: string; branch: boolean }> =>
  items.flatMap(item => [
    { value: item.value, label: item.label, branch: item.children !== undefined },
    ...(item.children !== undefined && expanded.includes(item.value)
      ? item.children.map(child => ({ value: child.value, label: child.label, branch: false }))
      : []),
  ])

const flattenWaterfall = (
  items: ReadonlyArray<{
    value: string
    label: string
    start: number
    duration: number
    children?: ReadonlyArray<{ value: string; label: string; start: number; duration: number }>
  }>,
  expanded: ReadonlyArray<string>,
): ReadonlyArray<{ value: string; label: string; start: number; duration: number; branch: boolean }> =>
  items.flatMap(item => [
    {
      value: item.value,
      label: item.label,
      start: item.start,
      duration: item.duration,
      branch: item.children !== undefined,
    },
    ...(item.children !== undefined && expanded.includes(item.value)
      ? item.children.map(child => ({ ...child, branch: false }))
      : []),
  ])

export const componentDemos: ReadonlyArray<Demo> = [
  {
    slug: 'alert-dialog',
    title: 'Alert dialog',
    namespaces: ['AlertDialog'],
    note: 'A destructive question that cannot be dismissed by accident.',
    overview:
      'An interruptive confirm. AlertDialog.Root holds the open state, the Backdrop dims the page, and AlertDialog.Content traps focus and ignores outside presses, so only the explicit actions resolve it. Dialog is the same shell with a dismissible option; AlertDialog is the one for irreversible actions.',
    code: `import { AlertDialog } from 'foldkit-ui-sdk/alert-dialog'

const alert = AlertDialog.Root.withMessage(h)
const alertTrigger = AlertDialog.Trigger.withMessage(h)
const alertBackdrop = AlertDialog.Backdrop.withMessage(h)
const alertContent = AlertDialog.Content.withMessage(h)

alert(
  [
    alert.Open(model.alertOpen),
    alert.OnOpenchange(detail =>
      Message.ChangedAlertOpen({ open: detail.value }),
    ),
  ],
  [
    alertTrigger([], [h.button([h.Type('button')], ['Delete workspace'])]),
    alertBackdrop([], []),
    alertContent([], [
      h.h2([], ['Delete this workspace?']),
      h.button([h.OnClick(Message.ClickedAlertConfirm())], ['Delete']),
    ]),
  ],
)`,
    render: (model, h) => {
      const alert = AlertDialog.Root.withMessage(h)
      const trigger = AlertDialog.Trigger.withMessage(h)
      const backdrop = AlertDialog.Backdrop.withMessage(h)
      const content = AlertDialog.Content.withMessage(h)
      const title = AlertDialog.Title.withMessage(h)
      const description = AlertDialog.Description.withMessage(h)
      const close = AlertDialog.Close.withMessage(h)
      return [
        alert(
          [
            alert.Open(model.alertOpen),
            alert.OnOpenchange(detail =>
              Message.ChangedAlertOpen({ open: detail.value }),
            ),
          ],
          [
            trigger([], [h.button([h.Type('button'), h.Class('btn')], ['Delete workspace'])]),
            backdrop([], []),
            content([], [
              title([], ['Delete this workspace?']),
              description([], [
                'Every project and deployment inside it is removed permanently.',
              ]),
              h.div([h.Class('row')], [
                close([], [h.button([h.Type('button'), h.Class('btn')], ['Cancel'])]),
                h.button(
                  [
                    h.Type('button'),
                    h.Class('btn btn-danger'),
                    h.OnClick(Message.ClickedAlertConfirm()),
                  ],
                  ['Delete workspace'],
                ),
              ]),
            ]),
          ],
        ),
        h.p([h.Class('muted')], [
          model.alertConfirmed
            ? 'Deleted. The alert cannot be dismissed by clicking outside.'
            : 'Click, then confirm.',
        ]),
      ]
    },
  },
  {
    slug: 'autocomplete',
    title: 'Autocomplete',
    namespaces: ['Autocomplete'],
    note: 'Type to filter; the Model holds the text.',
    overview:
      'A text input with a filtered suggestion list. Autocomplete.Value is the input text and valuechange reports it as it changes; Autocomplete.Items hands the element the data and it filters and renders only what matches. Arrow keys and Enter work from the element’s own behavior.',
    code: `import { Autocomplete } from 'foldkit-ui-sdk/autocomplete'

const autocomplete = Autocomplete.Root.withMessage(h)
const autocompleteInput = Autocomplete.Input.withMessage(h)
const autocompleteContent = Autocomplete.Content.withMessage(h)
const autocompleteList = Autocomplete.List.withMessage(h)
const autocompleteItem = Autocomplete.Item.withMessage(h)

autocomplete(
  [
    autocomplete.Items(books),
    autocomplete.Value(model.autocompleteValue),
    autocomplete.OnValuechange(detail =>
      Message.ChangedAutocomplete({ value: detail.value }),
    ),
  ],
  [
    autocompleteInput([], [h.input([h.Placeholder('Find a book')])]),
    autocompleteContent([], [
      autocompleteList([], books.map(book =>
        autocompleteItem(
          [autocompleteItem.Value(book.value), autocompleteItem.Label(book.label)],
          [book.label],
        ),
      )),
    ]),
  ],
)`,
    render: (model, h) => {
      const autocomplete = Autocomplete.Root.withMessage(h)
      const label = Autocomplete.Label.withMessage(h)
      const input = Autocomplete.Input.withMessage(h)
      const content = Autocomplete.Content.withMessage(h)
      const list = Autocomplete.List.withMessage(h)
      const item = Autocomplete.Item.withMessage(h)
      const itemText = Autocomplete.ItemText.withMessage(h)
      return [
        autocomplete(
          [
            autocomplete.Items(books),
            autocomplete.Value(model.autocompleteValue),
            autocomplete.OnValuechange(detail =>
              Message.ChangedAutocomplete({ value: detail.value }),
            ),
          ],
          [
            label([], ['Find a book']),
            input([], [
              h.input([h.Type('text'), h.Placeholder('Start typing')]),
            ]),
            content([], [
              list([], books.map(book =>
                item(
                  [
                    item.Value(book.value),
                    item.Label(book.label),
                  ],
                  [itemText([], [book.label])],
                ),
              )),
            ]),
          ],
        ),
        h.p([h.Class('muted')], [
          model.autocompleteValue
            ? `The input says “${model.autocompleteValue}”.`
            : 'The input is empty.',
        ]),
      ]
    },
  },
  {
    slug: 'button',
    title: 'Button',
    namespaces: ['Button'],
    note: 'One button element, with the behavior states the platform forgets.',
    overview:
      'The styled button UI SDK ships, with disabled and focusable-when-disabled handled for you. It is a single part: Button.Root wraps your own button content. There are no events to bind because a button’s click is your own Message — the part only owns the presentation and the disabled semantics.',
    code: `import { Button } from 'foldkit-ui-sdk/button'

const button = Button.Root.withMessage(h)

button([], [h.button([h.Type('button')], ['Save changes'])])

// Disabled buttons stay out of the tab order unless you opt in.
button([button.Disabled(true)], [h.button([h.Type('button')], ['Saving…'])])`,
    render: (_model, h) => {
      const button = Button.Root.withMessage(h)
      return [
        h.div([h.Class('row')], [
          button([], [h.button([h.Type('button'), h.Class('btn btn-solid')], ['Save changes'])]),
          button([button.Disabled(true)], [
            h.button([h.Type('button'), h.Class('btn')], ['Saving…']),
          ]),
          button([button.FocusableWhenDisabled(true)], [
            h.button([h.Type('button'), h.Class('btn')], ['Focusable when disabled']),
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'calendar',
    title: 'Calendar',
    namespaces: ['Calendar'],
    note: 'One month, single selection, state in the Model.',
    overview:
      'A month grid. Calendar.Root owns the value, Calendar.Grid lays out one month per offset, and Calendar.Weekdays/Calendar.Weeks clone the templates you provide for the repeated cells. Calendar.Previous and Calendar.Next move the month, and MonthSelect/YearSelect add jump selectors when you want them.',
    code: `import { Calendar } from 'foldkit-ui-sdk/calendar'

const calendar = Calendar.Root.withMessage(h)
const grid = Calendar.Grid.withMessage(h)
const weekdays = Calendar.Weekdays.withMessage(h)
const weeks = Calendar.Weeks.withMessage(h)
const previous = Calendar.Previous.withMessage(h)
const heading = Calendar.Heading.withMessage(h)
const next = Calendar.Next.withMessage(h)

calendar(
  [
    calendar.Mode('single'),
    calendar.Value(model.calendarDate ?? ''),
    calendar.DefaultMonth('2026-11'),
    calendar.OnValuechange(detail =>
      Message.ChangedCalendarDate({ value: typeof detail.value === 'string' ? detail.value : null }),
    ),
  ],
  [
    h.div([h.Class('row')], [
      previous([], [h.button([h.Type('button')], ['‹'])]),
      heading([], []),
      next([], [h.button([h.Type('button')], ['›'])]),
    ]),
    grid([], [
      weekdays([], [h.template([h.InnerHTML('<ui-calendar-weekday></ui-calendar-weekday>')])]),
      weeks([], [h.template([h.InnerHTML('<ui-calendar-day></ui-calendar-day>')])]),
    ]),
  ],
)`,
    render: (model, h) => {
      const calendar = Calendar.Root.withMessage(h)
      const grid = Calendar.Grid.withMessage(h)
      const weekdays = Calendar.Weekdays.withMessage(h)
      const weeks = Calendar.Weeks.withMessage(h)
      const previous = Calendar.Previous.withMessage(h)
      const heading = Calendar.Heading.withMessage(h)
      const next = Calendar.Next.withMessage(h)
      return [
        calendar(
          [
            calendar.Mode('single'),
            calendar.Value(model.calendarDate ?? ''),
            calendar.DefaultMonth('2026-11'),
            calendar.WeekStartsOn(0),
            calendar.OnValuechange(detail =>
              Message.ChangedCalendarDate({ value: textOrNull(detail.value) }),
            ),
          ],
          [
            h.div([h.Class('row cal-head')], [
              previous([], [h.button([h.Type('button'), h.Class('btn')], ['‹'])]),
              heading([h.Class('cal-heading')], []),
              next([], [h.button([h.Type('button'), h.Class('btn')], ['›'])]),
            ]),
            grid([h.Class('cal-grid')], [
              weekdays([], [
                h.template([h.InnerHTML('<ui-calendar-weekday></ui-calendar-weekday>')]),
              ]),
              weeks([], [
                h.template([h.InnerHTML('<ui-calendar-day></ui-calendar-day>')]),
              ]),
            ]),
          ],
        ),
        h.p([h.Class('muted')], [`Selected: ${model.calendarDate ?? 'none'}`]),
      ]
    },
  },
  {
    slug: 'carousel',
    title: 'Carousel',
    namespaces: ['Carousel'],
    note: 'Pages slide from the Model, not from a ref.',
    overview:
      'A paged strip. Carousel.Root carries the page (zero-based) and reports pagechange; Carousel.Viewport and Carousel.Content do the scrolling, and every Carousel.Item is one slide. Previous/Next and Indicator/IndicatorGroup render from the same page value, and the element handles drag and keyboard.',
    code: `import { Carousel } from 'foldkit-ui-sdk/carousel'

const carousel = Carousel.Root.withMessage(h)
const viewport = Carousel.Viewport.withMessage(h)
const content = Carousel.Content.withMessage(h)
const item = Carousel.Item.withMessage(h)

carousel(
  [
    carousel.Page(model.carouselPage),
    carousel.Align('start'),
    carousel.OnPagechange(detail =>
      Message.ChangedCarouselPage({ page: detail.value }),
    ),
  ],
  [
    viewport([], [
      content([], slides.map(slide => item([], [slide]))),
    ]),
    previous([], [h.button([h.Type('button')], ['‹'])]),
    next([], [h.button([h.Type('button')], ['›'])]),
  ],
)`,
    render: (model, h) => {
      const carousel = Carousel.Root.withMessage(h)
      const previous = Carousel.Previous.withMessage(h)
      const next = Carousel.Next.withMessage(h)
      const viewport = Carousel.Viewport.withMessage(h)
      const content = Carousel.Content.withMessage(h)
      const item = Carousel.Item.withMessage(h)
      const slides = ['One', 'Two', 'Three']
      return [
        carousel(
          [
            h.Attribute('aria-label', 'Release highlights'),
            carousel.Page(model.carouselPage),
            carousel.Align('start'),
            carousel.OnPagechange(detail =>
              Message.ChangedCarouselPage({ page: detail.value }),
            ),
          ],
          [
            viewport([h.Class('carousel-viewport')], [
              content([], slides.map(slide =>
                item([h.Class('carousel-slide')], [slide]),
              )),
            ]),
            h.div([h.Class('row')], [
              previous([], [h.button([h.Type('button'), h.Class('btn')], ['‹'])]),
              h.span([h.Class('muted')], [`Page ${model.carouselPage + 1} of ${slides.length}`]),
              next([], [h.button([h.Type('button'), h.Class('btn')], ['›'])]),
            ]),
          ],
        ),
      ]
    },
  },
  {
    slug: 'collapsible',
    title: 'Collapsible',
    namespaces: ['Collapsible'],
    note: 'The single-section accordion, with its open state in the Model.',
    overview:
      'One section that opens and closes. Collapsible.Root carries open, Collapsible.Trigger is the button, and Collapsible.Panel is the region the element reveals. Use it where Accordion would be a list of one; the panel’s height animation is the element’s own.',
    code: `import { Collapsible } from 'foldkit-ui-sdk/collapsible'

const collapsible = Collapsible.Root.withMessage(h)
const trigger = Collapsible.Trigger.withMessage(h)
const panel = Collapsible.Panel.withMessage(h)

collapsible(
  [
    collapsible.Open(model.collapsibleOpen),
    collapsible.OnOpenchange(detail =>
      Message.ChangedCollapsibleOpen({ open: detail.value }),
    ),
  ],
  [
    trigger([], [h.button([h.Type('button')], ['Shipping details'])]),
    panel([], ['Ships in 2–4 working days.']),
  ],
)`,
    render: (model, h) => {
      const collapsible = Collapsible.Root.withMessage(h)
      const trigger = Collapsible.Trigger.withMessage(h)
      const panel = Collapsible.Panel.withMessage(h)
      return [
        collapsible(
          [
            collapsible.Open(model.collapsibleOpen),
            collapsible.OnOpenchange(detail =>
              Message.ChangedCollapsibleOpen({ open: detail.value }),
            ),
          ],
          [
            h.div([h.Class('row')], [
              trigger([], [
                h.button([h.Type('button'), h.Class('btn')], ['Shipping details']),
              ]),
              h.span([h.Class('muted')], [model.collapsibleOpen ? 'Open' : 'Closed']),
            ]),
            panel([], [h.p([], ['Ships in 2–4 working days; tracking arrives by email.'])]),
          ],
        ),
      ]
    },
  },
  {
    slug: 'color-picker',
    title: 'Color picker',
    namespaces: ['ColorPicker'],
    note: 'Hex in, hex out; the area and sliders are parts.',
    overview:
      'A full picker: ColorPicker.Area is the saturation/value square, ColorPicker.Slider paints one channel, ColorPicker.Input is the text field, and Swatches/SwatchItem are presets. Root carries the value in the format you choose (hex here) and reports every change, so the Model keeps the color and any preview re-renders from it.',
    code: `import { ColorPicker } from 'foldkit-ui-sdk/color-picker'

const picker = ColorPicker.Root.withMessage(h)
const area = ColorPicker.Area.withMessage(h)
const areaThumb = ColorPicker.AreaThumb.withMessage(h)
const slider = ColorPicker.Slider.withMessage(h)
const sliderThumb = ColorPicker.SliderThumb.withMessage(h)

picker(
  [
    picker.Format('hex'),
    picker.Value(model.colorValue),
    picker.OnValuechange(detail =>
      Message.ChangedColor({ value: detail.value }),
    ),
  ],
  [
    area([], [areaThumb([], [])]),
    slider([slider.Channel('hue')], [sliderThumb([], [])]),
  ],
)`,
    render: (model, h) => {
      const picker = ColorPicker.Root.withMessage(h)
      const area = ColorPicker.Area.withMessage(h)
      const areaThumb = ColorPicker.AreaThumb.withMessage(h)
      const slider = ColorPicker.Slider.withMessage(h)
      const sliderThumb = ColorPicker.SliderThumb.withMessage(h)
      const hexInput = ColorPicker.Input.withMessage(h)
      const swatches = ColorPicker.Swatches.withMessage(h)
      const swatchItem = ColorPicker.SwatchItem.withMessage(h)
      return [
        picker(
          [
            picker.Format('hex'),
            picker.Value(model.colorValue),
            picker.OnValuechange(detail =>
              Message.ChangedColor({ value: detail.value }),
            ),
          ],
          [
            area([], [areaThumb([], [])]),
            slider([slider.Channel('hue')], [sliderThumb([], [])]),
            hexInput([], [
              h.input([h.Type('text'), h.Value(model.colorValue), h.Class('mono')]),
            ]),
            swatches([], colors.map(color =>
              swatchItem([swatchItem.Value(color)], [
                h.button([h.Type('button'), h.Style({ background: color })], []),
              ]),
            )),
          ],
        ),
        h.p([h.Class('muted')], [`The Model holds ${model.colorValue}.`]),
      ]
    },
  },
  {
    slug: 'combobox',
    title: 'Combobox',
    namespaces: ['Combobox'],
    note: 'Several values, chips in the input, filtering in the element.',
    overview:
      'A multi-value picker. Combobox.Root carries the selected values; Combobox.Chips holds the input and renders one chip per value from the template you provide; the Content/List/Item parts render the options. Typing filters, Backspace removes a chip, and valuechange reports the whole list.',
    code: `import { Combobox } from 'foldkit-ui-sdk/combobox'

const combobox = Combobox.Root.withMessage(h)
const chips = Combobox.Chips.withMessage(h)
const input = Combobox.Input.withMessage(h)
const content = Combobox.Content.withMessage(h)
const list = Combobox.List.withMessage(h)
const item = Combobox.Item.withMessage(h)

combobox(
  [
    combobox.Multiple(true),
    combobox.Value(model.genreValues),
    combobox.OnValuechange(detail =>
      Message.ChangedGenres({ values: detail.value }),
    ),
  ],
  [
    chips([], [input([], [h.input([h.Placeholder('Add a genre')])])]),
    content([], [
      list([], genres.map(genre =>
        item([item.Value(genre.value), item.Label(genre.label)], [genre.label]),
      )),
    ]),
  ],
)`,
    render: (model, h) => {
      const combobox = Combobox.Root.withMessage(h)
      const label = Combobox.Label.withMessage(h)
      const chips = Combobox.Chips.withMessage(h)
      const input = Combobox.Input.withMessage(h)
      const content = Combobox.Content.withMessage(h)
      const empty = Combobox.Empty.withMessage(h)
      const list = Combobox.List.withMessage(h)
      const item = Combobox.Item.withMessage(h)
      const indicator = Combobox.ItemIndicator.withMessage(h)
      return [
        combobox(
          [
            combobox.Multiple(true),
            combobox.Value([...model.genreValues]),
            combobox.OnValuechange(detail =>
              Message.ChangedGenres({ values: listOf(detail.value) }),
            ),
          ],
          [
            label([], ['Genres']),
            chips([], [
              input([], [
                h.input([h.Type('text'), h.Placeholder('Add a genre')]),
              ]),
            ]),
            content([], [
              empty([], ['No genre by that name.']),
              list([], genres.map(genre =>
                item(
                  [item.Value(genre.value), item.Label(genre.label)],
                  [genre.label, indicator([], ['✓'])],
                ),
              )),
            ]),
            h.template([
              h.InnerHTML(
                '<ui-combobox-chip><ui-combobox-chip-remove><button type="button">×</button></ui-combobox-chip-remove></ui-combobox-chip>',
              ),
            ]),
          ],
        ),
        h.p([h.Class('muted')], [
          model.genreValues.length > 0
            ? `Model: ${model.genreValues.join(', ')}`
            : 'No genres picked.',
        ]),
      ]
    },
  },
  {
    slug: 'command',
    title: 'Command',
    namespaces: ['Command'],
    note: 'A palette: query in the Model, items selected with the keyboard.',
    overview:
      'A command palette. Command.Root carries the query and the value; Command.Input is the search field, Command.List/Group/Item render the results with Shortcut badges, and Command.Empty shows when nothing matches. Item selection is the item’s own select event, so the Message carries whatever action the item names.',
    code: `import { Command } from 'foldkit-ui-sdk/command'

const command = Command.Root.withMessage(h)
const input = Command.Input.withMessage(h)
const list = Command.List.withMessage(h)
const item = Command.Item.withMessage(h)

command(
  [
    command.Query(model.commandQuery),
    command.OnQuerychange(detail =>
      Message.ChangedCommandQuery({ query: detail.value }),
    ),
    // A chosen item reports through Root's action event.
    command.OnAction(detail =>
      Message.SelectedMenuAction({ action: String(detail.value) }),
    ),
  ],
  [
    input([], [h.input([h.Placeholder('Type a command')])]),
    list([], palette.map(entry =>
      item(
        [item.Value(entry.value), item.Label(entry.label)],
        [entry.label],
      ),
    )),
  ],
)`,
    render: (model, h) => {
      const command = Command.Root.withMessage(h)
      const input = Command.Input.withMessage(h)
      const empty = Command.Empty.withMessage(h)
      const list = Command.List.withMessage(h)
      const item = Command.Item.withMessage(h)
      const text = Command.ItemText.withMessage(h)
      const shortcut = Command.Shortcut.withMessage(h)
      const query = model.commandQuery.trim().toLowerCase()
      const shown = palette.filter(entry => entry.label.toLowerCase().includes(query))
      return [
        command(
          [
            command.Query(model.commandQuery),
            command.OnQuerychange(detail =>
              Message.ChangedCommandQuery({ query: detail.value }),
            ),
            command.OnAction(detail =>
              Message.SelectedMenuAction({ action: String(detail.value) }),
            ),
          ],
          [
            input([], [
              h.input([
                h.Type('text'),
                h.Placeholder('Type a command'),
                h.Attribute('aria-label', 'Command'),
              ]),
            ]),
            empty([], ['Nothing matches.']),
            list([], shown.map(entry =>
              item(
                [
                  item.Value(entry.value),
                  item.Label(entry.label),
                ],
                [
                  text([], [entry.label]),
                  entry.hint ? shortcut([], [entry.hint]) : '',
                ],
              ),
            )),
          ],
        ),
        h.p([h.Class('muted')], [
          model.lastAction ? `Picked ${model.lastAction}.` : 'Press ⌘K in your own app; here, click.',
        ]),
      ]
    },
  },
  {
    slug: 'date-input',
    title: 'Date input',
    namespaces: ['DateInput'],
    note: 'A date typed segment by segment, no popup.',
    overview:
      'A segmented date field. DateInput.Root renders one editable segment per part of the date (day, month, year) and reports a full value once it is complete. Min, Max and Unavailable bound the selectable dates; the Model holds the ISO string, or null while the field is empty.',
    code: `import { DateInput } from 'foldkit-ui-sdk/date-input'

const dateInput = DateInput.Root.withMessage(h)

dateInput(
  [
    dateInput.Value(model.dateInputValue ?? ''),
    dateInput.Min('2026-01-01'),
    dateInput.OnValuechange(detail =>
      Message.ChangedDateInput({ value: detail.value }),
    ),
  ],
  [],
)`,
    render: (model, h) => {
      const dateInput = DateInput.Root.withMessage(h)
      return [
        h.div([h.Class('row')], [
          dateInput(
            [
              dateInput.Value(model.dateInputValue ?? ''),
              dateInput.Min('2026-01-01'),
              dateInput.OnValuechange(detail =>
                Message.ChangedDateInput({ value: detail.value }),
              ),
            ],
            [],
          ),
          h.span([h.Class('muted')], [model.dateInputValue ?? 'empty']),
        ]),
      ]
    },
  },
  {
    slug: 'date-picker',
    title: 'Date picker',
    namespaces: ['DatePicker'],
    note: 'A typed input plus a calendar popup, one value.',
    overview:
      'The calendar in a popup. DatePicker.Root owns the value and the open state; DatePicker.Input is the typed field, DatePicker.Trigger opens the popup, and DatePicker.Content is where you compose Calendar parts — the demo reuses Calendar.Previous/Heading/Next/Grid and the day templates. The element keeps the typed text and the selected day in step.',
    code: `import { DatePicker } from 'foldkit-ui-sdk/date-picker'
import { Calendar } from 'foldkit-ui-sdk/calendar'

const picker = DatePicker.Root.withMessage(h)
const input = DatePicker.Input.withMessage(h)
const trigger = DatePicker.Trigger.withMessage(h)
const content = DatePicker.Content.withMessage(h)

picker(
  [
    picker.Value(model.datePickerValue ?? ''),
    picker.DefaultMonth('2026-11'),
    picker.OnValuechange(detail =>
      Message.ChangedDatePicker({ value: detail.value }),
    ),
  ],
  [
    input([], [h.input([h.Placeholder('2026-11-20')])]),
    trigger([], [h.button([h.Type('button')], ['Open calendar'])]),
    content([], [
      // Calendar.Previous / Heading / Next / Grid inside the popup
    ]),
  ],
)`,
    render: (model, h) => {
      const picker = DatePicker.Root.withMessage(h)
      const input = DatePicker.Input.withMessage(h)
      const trigger = DatePicker.Trigger.withMessage(h)
      const content = DatePicker.Content.withMessage(h)
      const previous = Calendar.Previous.withMessage(h)
      const heading = Calendar.Heading.withMessage(h)
      const next = Calendar.Next.withMessage(h)
      const grid = Calendar.Grid.withMessage(h)
      const weekdays = Calendar.Weekdays.withMessage(h)
      const weeks = Calendar.Weeks.withMessage(h)
      return [
        h.div([h.Class('row')], [
          picker(
            [
              picker.Value(model.datePickerValue ?? ''),
              picker.DefaultMonth('2026-11'),
              picker.OnValuechange(detail =>
                Message.ChangedDatePicker({ value: textOrNull(detail.value) }),
              ),
            ],
            [
              input([], [h.input([h.Type('text'), h.Placeholder('2026-11-20')])]),
              trigger([], [
                h.button([h.Type('button'), h.Class('btn')], ['Open calendar']),
              ]),
              content([], [
                h.div([h.Class('row')], [
                  previous([], [h.button([h.Type('button'), h.Class('btn')], ['‹'])]),
                  heading([], []),
                  next([], [h.button([h.Type('button'), h.Class('btn')], ['›'])]),
                ]),
                grid([], [
                  weekdays([], [
                    h.template([h.InnerHTML('<ui-calendar-weekday></ui-calendar-weekday>')]),
                  ]),
                  weeks([], [
                    h.template([h.InnerHTML('<ui-calendar-day></ui-calendar-day>')]),
                  ]),
                ]),
              ]),
            ],
          ),
          h.span([h.Class('muted')], [model.datePickerValue ?? 'empty']),
        ]),
      ]
    },
  },
  {
    slug: 'drawer',
    title: 'Drawer',
    namespaces: ['Drawer'],
    note: 'A sheet from the edge, with snap points.',
    overview:
      'A panel that slides in from an edge. Drawer.Root owns open and the snap point, Drawer.Content is the sheet, and Drawer.Handle is the grabber that expands and collapses it. SnapPoints/DefaultSnapPoint place it; the element handles drag, focus and dismissal.',
    code: `import { Drawer } from 'foldkit-ui-sdk/drawer'

const drawer = Drawer.Root.withMessage(h)
const trigger = Drawer.Trigger.withMessage(h)
const backdrop = Drawer.Backdrop.withMessage(h)
const content = Drawer.Content.withMessage(h)
const handle = Drawer.Handle.withMessage(h)

drawer(
  [
    drawer.Open(model.drawerOpen),
    drawer.SnapPoints([0.5, 0.9]),
    drawer.DefaultSnapPoint(0.5),
    drawer.OnOpenchange(detail =>
      Message.ChangedDrawerOpen({ open: detail.value }),
    ),
  ],
  [
    trigger([], [h.button([h.Type('button')], ['Build log'])]),
    backdrop([], []),
    content([], [
      handle([], []),
      h.h2([], ['Build 4821']),
      h.p([], ['48s, no warnings.']),
    ]),
  ],
)`,
    render: (model, h) => {
      const drawer = Drawer.Root.withMessage(h)
      const trigger = Drawer.Trigger.withMessage(h)
      const backdrop = Drawer.Backdrop.withMessage(h)
      const content = Drawer.Content.withMessage(h)
      const handle = Drawer.Handle.withMessage(h)
      const title = Drawer.Title.withMessage(h)
      const description = Drawer.Description.withMessage(h)
      return [
        drawer(
          [
            drawer.Open(model.drawerOpen),
            drawer.SnapPoints([0.5, 0.9]),
            drawer.DefaultSnapPoint(0.5),
            drawer.OnOpenchange(detail =>
              Message.ChangedDrawerOpen({ open: detail.value }),
            ),
          ],
          [
            trigger([], [h.button([h.Type('button'), h.Class('btn')], ['Open build log'])]),
            backdrop([], []),
            content([], [
              handle(
                [
                  h.Class('drawer-handle'),
                  h.Attribute('aria-label', 'Expand the build log'),
                ],
                [h.span([], [])],
              ),
              title([], ['Build 4821']),
              description([], ['Built in 48s from the latest commit.']),
              h.p([], ['No warnings. Two edge functions were bundled.']),
            ]),
          ],
        ),
      ]
    },
  },
  {
    slug: 'file-input',
    title: 'File input',
    namespaces: ['FileInput'],
    note: 'Drop or browse; the Model sees the picked file.',
    overview:
      'A dropzones and file list. FileInput.Root validates against Accept, MaxSize and MaxFiles, FileInput.Dropzone is the drop target, and FileInput.Trigger opens the picker. The List clones your Item template per file, with ItemRemove in it; valuechange reports real File objects, so the Model stores names or counts, not blobs.',
    code: `import { FileInput } from 'foldkit-ui-sdk/file-input'

const fileInput = FileInput.Root.withMessage(h)
const dropzone = FileInput.Dropzone.withMessage(h)
const trigger = FileInput.Trigger.withMessage(h)
const list = FileInput.List.withMessage(h)

fileInput(
  [
    fileInput.Accept(['image/*', '.pdf']),
    fileInput.MaxSize(10_000_000),
    fileInput.OnValuechange(detail => {
      const first = detail.value[0]
      return Message.ChangedFile({
        name: first instanceof File ? first.name : null,
      })
    }),
  ],
  [
    dropzone([], [
      h.span([], ['Drop a scan here']),
      trigger([], [h.button([h.Type('button')], ['Browse'])]),
    ]),
    list([], [
      h.template([h.InnerHTML('<ui-file-input-item>…</ui-file-input-item>')]),
    ]),
  ],
)`,
    render: (model, h) => {
      const field = Field.Root.withMessage(h)
      const fieldLabel = Field.Label.withMessage(h)
      const fieldDescription = Field.Description.withMessage(h)
      const fileInput = FileInput.Root.withMessage(h)
      const dropzone = FileInput.Dropzone.withMessage(h)
      const trigger = FileInput.Trigger.withMessage(h)
      const list = FileInput.List.withMessage(h)
      return [
        field([h.Class('row')], [
          fieldLabel([], ['Passport scan']),
          fileInput(
            [
              fileInput.Name('passport'),
              fileInput.Accept(['image/*', '.pdf']),
              fileInput.MaxSize(10_000_000),
              fileInput.OnValuechange(detail => {
                const first = detail.value[0]
                return Message.ChangedFile({
                  name: first instanceof File ? first.name : null,
                })
              }),
            ],
            [
              list([], [
                h.template([
                  h.InnerHTML(
                    '<ui-file-input-item><span data-file="name"></span><ui-file-input-item-remove><button type="button">×</button></ui-file-input-item-remove></ui-file-input-item>',
                  ),
                ]),
              ]),
              dropzone([], [
                h.span([], ['Drop a scan here']),
                trigger([], [h.button([h.Type('button'), h.Class('btn')], ['Browse'])]),
              ]),
            ],
          ),
          fieldDescription([], [
            model.fileName
              ? `The Model sees ${model.fileName}.`
              : 'JPG, PNG or PDF, up to 10 MB.',
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'hover-card',
    title: 'Hover card',
    namespaces: ['HoverCard'],
    note: 'A preview on hover and focus, with a delay you control.',
    overview:
      'A rich preview attached to a trigger, opening on hover and focus after a delay and closing when the pointer leaves both. HoverCard.Content is the popup and HoverCard.Arrow the pointer. Nothing needs the Model unless the preview is data the Model owns — the open state belongs to the element.',
    code: `import { HoverCard } from 'foldkit-ui-sdk/hover-card'

const hoverCard = HoverCard.Root.withMessage(h)
const trigger = HoverCard.Trigger.withMessage(h)
const content = HoverCard.Content.withMessage(h)

hoverCard([hoverCard.Delay(200)], [
  trigger([], [h.a([h.Href('/people/lena')], ['@lena'])]),
  content([], [
    h.strong([], ['Lena Fischer']),
    h.p([], ['Platform engineer, works on the build cache.']),
  ]),
])`,
    render: (_model, h) => {
      const hoverCard = HoverCard.Root.withMessage(h)
      const trigger = HoverCard.Trigger.withMessage(h)
      const content = HoverCard.Content.withMessage(h)
      return [
        h.p([], [
          'Hover ',
          hoverCard([hoverCard.Delay(200)], [
            trigger([], [
              h.a([h.Href('#hover-card'), h.Class('link')], ['@lena']),
            ]),
            content([], [
              h.strong([], ['Lena Fischer']),
              h.p([h.Class('muted')], ['Platform engineer, works on the build cache.']),
            ]),
          ]),
          ' for the preview.',
        ]),
      ]
    },
  },
  {
    slug: 'image-cropper',
    title: 'Image cropper',
    namespaces: ['ImageCropper'],
    note: 'Drag, zoom and rotate a crop over an image.',
    overview:
      'Crop an image in the browser. ImageCropper.Root takes Src, AspectRatio and Shape and reports cropchange/cropcommit with a crop rectangle; Viewport/Image/Selection are the canvas, the image and the visible crop, and Zoom/Rotate/Flip are the controls. Crop the file, then upload it from your own Command — the binding never touches the network.',
    code: `import { ImageCropper } from 'foldkit-ui-sdk/image-cropper'

const cropper = ImageCropper.Root.withMessage(h)
const viewport = ImageCropper.Viewport.withMessage(h)
const image = ImageCropper.Image.withMessage(h)
const selection = ImageCropper.Selection.withMessage(h)

cropper(
  [
    cropper.Src(imageUrl),
    cropper.AspectRatio(1),
    cropper.Shape('circle'),
    cropper.OnCropchange(detail => Message.Cropped({ crop: detail.value })),
  ],
  [
    viewport([], [
      image([], [h.img([h.Alt('Portrait at sunset')])]),
      selection([], []),
    ]),
  ],
)`,
    render: (_model, h) => {
      const cropper = ImageCropper.Root.withMessage(h)
      const viewport = ImageCropper.Viewport.withMessage(h)
      const image = ImageCropper.Image.withMessage(h)
      const selection = ImageCropper.Selection.withMessage(h)
      return [
        cropper(
          [
            cropper.Src(portrait),
            cropper.AspectRatio(1),
            cropper.Shape('circle'),
            cropper.MaxZoom(4),
          ],
          [
            viewport([h.Class('crop-viewport')], [
              image([], [h.img([h.Alt('A portrait at sunset')])]),
              selection([], []),
            ]),
          ],
        ),
        h.p([h.Class('muted')], ['Drag the selection, then crop it from your own Command.']),
      ]
    },
  },
  {
    slug: 'label',
    title: 'Label',
    namespaces: ['Label'],
    note: 'A label with the focus and press behavior native ones lack.',
    overview:
      'A label that forwards a click to its control and activates the control from the keyboard. Label.Root takes For, the id of the control it names, and renders whatever you put inside. Native labels work for simple fields; this one also handles the press behavior WAI-ARIA asks for.',
    code: `import { Label } from 'foldkit-ui-sdk/label'

const label = Label.Root.withMessage(h)

label([label.For('workspace-name')], ['Workspace name'])`,
    render: (_model, h) => {
      const label = Label.Root.withMessage(h)
      return [
        h.div([h.Class('row')], [
          label([h.For('docs-label-demo')], ['Workspace name']),
          h.input([
            h.Id('docs-label-demo'),
            h.Type('text'),
            h.Value('foldkit-ui-sdk'),
            h.Class('mono'),
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'listbox',
    title: 'Listbox',
    namespaces: ['Listbox'],
    note: 'A list with selection, typeahead and a roving tab stop.',
    overview:
      'A list of options where one (or several) is selected. Listbox.Root owns the value and reports valuechange; Listbox.Item declares its Value and Label, Listbox.Group binds a GroupLabel to its items, and ItemIndicator marks the selected row. Arrows, Home/End and typeahead are the element’s tested behavior.',
    code: `import { Listbox } from 'foldkit-ui-sdk/listbox'

const listbox = Listbox.Root.withMessage(h)
const item = Listbox.Item.withMessage(h)
const indicator = Listbox.ItemIndicator.withMessage(h)

listbox(
  [
    listbox.Value(model.listboxValue ?? ''),
    listbox.OnValuechange(detail =>
      Message.ChangedListbox({ value: detail.value as string | null }),
    ),
  ],
  inbox.map(mail =>
    item([item.Value(mail.value), item.Label(mail.label)], [
      mail.label,
      indicator([], ['✓']),
    ]),
  ),
)`,
    render: (model, h) => {
      const listbox = Listbox.Root.withMessage(h)
      const item = Listbox.Item.withMessage(h)
      const indicator = Listbox.ItemIndicator.withMessage(h)
      const mail = [
        { value: 'inbox', label: 'Inbox', count: '18' },
        { value: 'starred', label: 'Starred', count: '4' },
        { value: 'drafts', label: 'Drafts', count: '2' },
        { value: 'archive', label: 'Archive', count: '126' },
      ]
      return [
        h.div([h.Class('row')], [
          listbox(
            [
              h.Attribute('aria-label', 'Mail folders'),
              listbox.Value(model.listboxValue ?? ''),
              listbox.OnValuechange(detail =>
                Message.ChangedListbox({ value: textOrNull(detail.value) }),
              ),
            ],
            mail.map(folder =>
              item([item.Value(folder.value), item.Label(folder.label)], [
                h.span([], [folder.label]),
                h.span([h.Class('muted')], [folder.count]),
                indicator([], ['✓']),
              ]),
            ),
          ),
          h.span([h.Class('muted')], [`Open: ${model.listboxValue ?? 'none'}`]),
        ]),
      ]
    },
  },
  {
    slug: 'menubar',
    title: 'Menubar',
    namespaces: ['Menubar'],
    note: 'A row of menus that behave as one keyboard surface.',
    overview:
      'A desktop-style menu bar: Menubar.Root holds several Menu.Root parts and the arrow keys move between them and into their content. Each menu reuses the Menu parts you already know — Trigger, Content, Item, CheckboxItem, RadioGroup — so the only new piece is the bar that ties them together.',
    code: `import { Menubar, Menu } from 'foldkit-ui-sdk'

const menubar = Menubar.Root.withMessage(h)
const menu = Menu.Root.withMessage(h)
const trigger = Menu.Trigger.withMessage(h)
const content = Menu.Content.withMessage(h)
const menuItem = Menu.Item.withMessage(h)

menubar([], ['File', 'Edit'].map(label =>
  menu([], [
    trigger([], [h.button([h.Type('button')], [label])]),
    content([], [
      menuItem([menuItem.Value('new')], ['New']),
      menuItem([menuItem.Value('open')], ['Open…']),
    ]),
  ]),
))`,
    render: (model, h) => {
      const menubar = Menubar.Root.withMessage(h)
      const menu = Menu.Root.withMessage(h)
      const trigger = Menu.Trigger.withMessage(h)
      const content = Menu.Content.withMessage(h)
      const item = Menu.Item.withMessage(h)
      const separator = Menu.Separator.withMessage(h)
      const menus = [
        { label: 'File', entries: ['New', 'Open…', 'Save'] },
        { label: 'Edit', entries: ['Undo', 'Redo'] },
        { label: 'View', entries: ['Zoom in', 'Zoom out'] },
      ]
      return [
        h.div([h.Class('row')], [
          menubar(
            [],
            menus.map(entry =>
              menu([], [
                trigger([], [
                  h.button([h.Type('button'), h.Class('btn')], [entry.label]),
                ]),
                content([], [
                  ...entry.entries.flatMap((label, index) => [
                    ...(index === entry.entries.length - 1
                      ? [separator([], [])]
                      : []),
                    item(
                      [
                        item.Value(label),
                        item.OnSelect(() =>
                          Message.SelectedMenubarAction({ action: label }),
                        ),
                      ],
                      [label],
                    ),
                  ]),
                ]),
              ]),
            ),
          ),
          h.span([h.Class('muted')], [
            model.menubarAction ?? 'Pick a menu entry.',
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'navigation-menu',
    title: 'Navigation menu',
    namespaces: ['NavigationMenu'],
    note: 'A site nav with disclosure panels, one value at a time.',
    overview:
      'The docs-style navigation menu: a list of triggers that open a shared viewport with links inside. NavigationMenu.Root holds the open item’s value and reports valuechange; NavigationMenu.Item wraps a Trigger and Content, and NavigationMenu.Viewport is the single panel area that animates between them.',
    code: `import { NavigationMenu } from 'foldkit-ui-sdk/navigation-menu'

const nav = NavigationMenu.Root.withMessage(h)
const navList = NavigationMenu.List.withMessage(h)
const navItem = NavigationMenu.Item.withMessage(h)
const navTrigger = NavigationMenu.Trigger.withMessage(h)
const navContent = NavigationMenu.Content.withMessage(h)
const navLink = NavigationMenu.Link.withMessage(h)

nav(
  [
    nav.Value(model.navMenuValue),
    nav.OnValuechange(detail => Message.SelectedNavMenu({ value: detail.value })),
  ],
  [
    navList([], sections.map(section =>
      navItem([navItem.Value(section.id)], [
        navTrigger([], [h.button([h.Type('button')], [section.label])]),
        navContent([], section.links.map(link =>
          navLink([], [h.a([h.Href(link.href)], [link.label])]),
        )),
      ]),
    )),
    viewport([], []),
  ],
)`,
    render: (model, h) => {
      const nav = NavigationMenu.Root.withMessage(h)
      const list = NavigationMenu.List.withMessage(h)
      const item = NavigationMenu.Item.withMessage(h)
      const trigger = NavigationMenu.Trigger.withMessage(h)
      const content = NavigationMenu.Content.withMessage(h)
      const link = NavigationMenu.Link.withMessage(h)
      const viewport = NavigationMenu.Viewport.withMessage(h)
      const sections = [
        {
          id: 'components',
          label: 'Components',
          links: [
            { label: 'Docs', href: '/docs/introduction' },
            { label: 'Showcase', href: '/showcase' },
          ],
        },
        {
          id: 'guides',
          label: 'Guides',
          links: [
            { label: 'Routing', href: '/docs/commands' },
            { label: 'Sink', href: '/sink' },
          ],
        },
      ]
      return [
        nav(
          [
            nav.Value(model.navMenuValue),
            nav.OnValuechange(detail =>
              Message.SelectedNavMenu({ value: detail.value }),
            ),
          ],
          [
            list([], sections.map(section =>
              item([item.Value(section.id)], [
                trigger([], [
                  h.button([h.Type('button'), h.Class('btn')], [section.label]),
                ]),
                content([], section.links.map(entry =>
                  link([], [h.a([h.Href(entry.href), h.Class('link')], [entry.label])]),
                )),
              ]),
            )),
            viewport([], []),
          ],
        ),
      ]
    },
  },
  {
    slug: 'number-input',
    title: 'Number input',
    namespaces: ['NumberInput'],
    note: 'A stepper with a typed value and real bounds.',
    overview:
      'A number field with increment/decrement controls. NumberInput.Root carries the value, Min/Max clamp it, Step/SmallStep/LargeStep tune the arrows and Page keys, and NumberInput.Control is the input inside a Group with Decrement and Increment. Typing, arrows, the wheel and a scrub area all report through valuechange.',
    code: `import { NumberInput } from 'foldkit-ui-sdk/number-input'

const numberInput = NumberInput.Root.withMessage(h)
const group = NumberInput.Group.withMessage(h)
const control = NumberInput.Control.withMessage(h)
const decrement = NumberInput.Decrement.withMessage(h)
const increment = NumberInput.Increment.withMessage(h)

numberInput(
  [
    numberInput.Value(model.numberValue),
    numberInput.Min(0),
    numberInput.Max(10),
    numberInput.OnValuechange(detail =>
      Message.ChangedNumber({ value: detail.value ?? 0 }),
    ),
  ],
  [
    group([], [
      decrement([], [h.button([h.Type('button')], ['−'])]),
      control([], [h.input([h.Attribute('aria-label', 'Seats')])]),
      increment([], [h.button([h.Type('button')], ['+'])]),
    ]),
  ],
)`,
    render: (model, h) => {
      const numberInput = NumberInput.Root.withMessage(h)
      const group = NumberInput.Group.withMessage(h)
      const control = NumberInput.Control.withMessage(h)
      const decrement = NumberInput.Decrement.withMessage(h)
      const increment = NumberInput.Increment.withMessage(h)
      return [
        h.div([h.Class('row')], [
          numberInput(
            [
              numberInput.Value(model.numberValue),
              numberInput.Min(0),
              numberInput.Max(10),
              numberInput.OnValuechange(detail =>
                Message.ChangedNumber({ value: detail.value ?? 0 }),
              ),
            ],
            [
              group([], [
                decrement([], [h.button([h.Type('button'), h.Class('btn')], ['−'])]),
                control([], [
                  h.input([h.Attribute('aria-label', 'Seats'), h.Class('mono')]),
                ]),
                increment([], [h.button([h.Type('button'), h.Class('btn')], ['+'])]),
              ]),
            ],
          ),
          h.span([h.Class('muted')], [`${model.numberValue} seats`]),
        ]),
      ]
    },
  },
  {
    slug: 'otp-input',
    title: 'OTP input',
    namespaces: ['OTPInput'],
    note: 'One code, many slots, paste included.',
    overview:
      'A one-time-code field. OTPInput.Root takes MaxLength and reports the whole string; OTPInput.Group clusters Slot parts (OTPInput.Slot with an Index), and OTPInput.Separator draws the gap between groups. Typing advances, Backspace retreats, arrows move and a paste fills every slot.',
    code: `import { OTPInput } from 'foldkit-ui-sdk/otp-input'

const otp = OTPInput.Root.withMessage(h)
const group = OTPInput.Group.withMessage(h)
const slot = OTPInput.Slot.withMessage(h)
const separator = OTPInput.Separator.withMessage(h)

otp(
  [
    otp.MaxLength(6),
    otp.Value(model.otpValue),
    otp.OnValuechange(detail =>
      Message.ChangedOtp({ value: detail.value }),
    ),
  ],
  [
    group([], [0, 1, 2].map(index => slot([slot.Index(index)], []))),
    separator([], []),
    group([], [3, 4, 5].map(index => slot([slot.Index(index)], []))),
  ],
)`,
    render: (model, h) => {
      const otp = OTPInput.Root.withMessage(h)
      const group = OTPInput.Group.withMessage(h)
      const slot = OTPInput.Slot.withMessage(h)
      const separator = OTPInput.Separator.withMessage(h)
      return [
        h.div([h.Class('row')], [
          otp(
            [
              otp.MaxLength(6),
              otp.Value(model.otpValue),
              otp.OnValuechange(detail =>
                Message.ChangedOtp({ value: detail.value }),
              ),
              h.Attribute('aria-label', 'Verification code'),
            ],
            [
              group([h.Class('row')], [0, 1, 2].map(index => slot([slot.Index(index)], []))),
              separator([], []),
              group([h.Class('row')], [3, 4, 5].map(index => slot([slot.Index(index)], []))),
            ],
          ),
          h.span([h.Class('mono muted')], [model.otpValue || '······']),
        ]),
      ]
    },
  },
  {
    slug: 'overlays',
    title: 'Overlays',
    namespaces: ['Overlays'],
    note: 'The host that keeps popups above the page’s own stacking contexts.',
    overview:
      'A portal host for top-layer layers. Overlays.OverlayHost renders one container where UI SDK’s overlay-managing primitives mount their popups, so a popup opened inside a transformed or overflow-hidden ancestor still paints above the page. Mount it once, as high in your tree as the layer is: the site mounts it at the app root.',
    code: `import { Overlays } from 'foldkit-ui-sdk/overlays'

const host = Overlays.OverlayHost.withMessage(h)

// Once, at the root of the app: popups opened anywhere inside mount here.
host([], [])`,
    render: (_model, h) => {
      const host = Overlays.OverlayHost.withMessage(h)
      return [
        h.div([h.Class('row')], [
          host([], []),
          h.p([h.Class('muted')], [
            'The host is empty until a popup above it opens; popups paint above every stacking context on the page.',
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'pagination',
    title: 'Pagination',
    namespaces: ['Pagination'],
    note: 'Page links with a range the element computes.',
    overview:
      'Page navigation. Pagination.Root takes Page, PageCount (or Total/PageSize) and reports pagechange; Pagination.List holds Item parts around Previous and Next. The numbered links, the ellipses and the disabled edges come from templates the element clones, so the range and its siblings/boundaries never drift from the Model’s page.',
    code: `import { Pagination } from 'foldkit-ui-sdk/pagination'

const pagination = Pagination.Root.withMessage(h)
const list = Pagination.List.withMessage(h)
const pageItem = Pagination.Item.withMessage(h)
const previous = Pagination.Previous.withMessage(h)
const next = Pagination.Next.withMessage(h)

pagination(
  [
    pagination.Page(model.pageNumber),
    pagination.PageCount(5),
    pagination.Siblings(1),
    pagination.Boundaries(1),
    pagination.OnPagechange(detail =>
      Message.ChangedPageNumber({ page: detail.value }),
    ),
  ],
  [
    list([], [
      pageItem([], [previous([], [h.button([h.Type('button')], ['‹'])])]),
      h.template([h.InnerHTML('<ui-pagination-item><ui-pagination-link><button type="button"></button></ui-pagination-link></ui-pagination-item>')]),
      pageItem([], [next([], [h.button([h.Type('button')], ['›'])])]),
    ]),
  ],
)`,
    render: (model, h) => {
      const pagination = Pagination.Root.withMessage(h)
      const list = Pagination.List.withMessage(h)
      const pageItem = Pagination.Item.withMessage(h)
      const previous = Pagination.Previous.withMessage(h)
      const next = Pagination.Next.withMessage(h)
      return [
        h.div([h.Class('row')], [
          pagination(
            [
              h.Attribute('aria-label', 'Results pages'),
              pagination.Page(model.pageNumber),
              pagination.PageCount(5),
              pagination.Siblings(1),
              pagination.Boundaries(1),
              pagination.OnPagechange(detail =>
                Message.ChangedPageNumber({ page: detail.value }),
              ),
            ],
            [
              list([], [
                pageItem([], [
                  previous([], [
                    h.button([h.Type('button'), h.Class('btn')], ['‹']),
                  ]),
                ]),
                h.template([
                  h.InnerHTML(
                    '<ui-pagination-item><ui-pagination-link><button type="button" class="btn"></button></ui-pagination-link></ui-pagination-item>',
                  ),
                ]),
                pageItem([], [
                  next([], [h.button([h.Type('button'), h.Class('btn')], ['›'])]),
                ]),
              ]),
            ],
          ),
          h.span([h.Class('muted')], [`Page ${model.pageNumber} of 5`]),
        ]),
      ]
    },
  },
  {
    slug: 'password-input',
    title: 'Password input',
    namespaces: ['PasswordInput'],
    note: 'A masked field with a reveal toggle that reports its state.',
    overview:
      'A password field. PasswordInput.Root owns the value and the visible flag; valuechange reports every keystroke and visiblechange reports the toggle, so the Model can decide whether a reveal is allowed. PasswordInput.Toggle is the button that reveals the text.',
    code: `import { PasswordInput } from 'foldkit-ui-sdk/password-input'

const password = PasswordInput.Root.withMessage(h)
const toggle = PasswordInput.Toggle.withMessage(h)

password(
  [
    password.Value(model.passwordValue),
    password.Visible(model.passwordVisible),
    password.OnValuechange(detail =>
      Message.ChangedPassword({ value: detail.value }),
    ),
    password.OnVisiblechange(detail =>
      Message.ChangedPasswordVisible({ visible: detail.value }),
    ),
  ],
  [
    h.input([h.Type('password'), h.Autocomplete('current-password')]),
    toggle([], [h.button([h.Type('button')], ['Show'])]),
  ],
)`,
    render: (model, h) => {
      const password = PasswordInput.Root.withMessage(h)
      const toggle = PasswordInput.Toggle.withMessage(h)
      return [
        h.div([h.Class('row')], [
          password(
            [
              password.Value(model.passwordValue),
              password.Visible(model.passwordVisible),
              password.OnValuechange(detail =>
                Message.ChangedPassword({ value: detail.value }),
              ),
              password.OnVisiblechange(detail =>
                Message.ChangedPasswordVisible({ visible: detail.value }),
              ),
            ],
            [
              h.input([
                h.Type('password'),
                h.Autocomplete('current-password'),
                h.Attribute('aria-label', 'Password'),
              ]),
              toggle([], [
                h.button([h.Type('button'), h.Class('btn')], [
                  model.passwordVisible ? 'Hide' : 'Show',
                ]),
              ]),
            ],
          ),
          h.span([h.Class('muted')], [
            model.passwordVisible ? 'visible' : `${model.passwordValue.length} characters, masked`,
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'preferences',
    title: 'Preferences',
    namespaces: ['Preferences'],
    note: 'Publish chosen preferences to a subtree as attributes and CSS vars.',
    overview:
      'The container that turns preference objects into attributes and CSS variables for its subtree. Preferences.Root takes Preferences([...]) — a color scheme and an accent, say — and every descendant can style itself from the values without prop-drilling. The preference objects are plain @ui-sdk/core preferences, so the same ones work outside the component.',
    code: `import { createColorScheme, createPreference } from '@ui-sdk/core'
import { Preferences } from 'foldkit-ui-sdk/preferences'

const scheme = createColorScheme()
const accent = createPreference({
  values: ['iris', 'moss', 'ember'],
  defaultValue: 'iris',
  attribute: 'data-accent',
})

const preferences = Preferences.Root.withMessage(h)

preferences([preferences.Preferences([scheme, accent])], [
  h.div([h.Class('pref-preview')], ['This panel inherits both preferences.']),
])`,
    render: (_model, h) => {
      const preferences = Preferences.Root.withMessage(h)
      return [
        preferences([preferences.Preferences([scheme, accent])], [
          h.div([h.Class('pref-preview')], [
            h.p([], ['This panel inherits both preferences.']),
            h.p([h.Class('muted')], [
              'The color scheme and the accent are published as attributes and custom properties on the subtree, not threaded through props.',
            ]),
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'resizable',
    title: 'Resizable',
    namespaces: ['Resizable'],
    note: 'Draggable splits whose layout is a Model number pair.',
    overview:
      'Two or more panes with draggable handles. Resizable.Root carries Layout (percentages) and reports layoutcommit when a drag ends; Resizable.Panel takes DefaultSize/MinSize/MaxSize and an id, and Resizable.Handle is the divider. With AutoSaveId the element persists the layout, and the Model still holds the committed value.',
    code: `import { Resizable } from 'foldkit-ui-sdk/resizable'

const resizable = Resizable.Root.withMessage(h)
const panel = Resizable.Panel.withMessage(h)
const handle = Resizable.Handle.withMessage(h)

resizable(
  [
    resizable.Layout(model.resizableLayout),
    resizable.OnLayoutcommit(detail =>
      Message.ChangedResizableLayout({ layout: detail.value }),
    ),
  ],
  [
    panel([panel.Id('files'), panel.DefaultSize(38), panel.MinSize(20)], ['Files']),
    handle([], []),
    panel([panel.Id('preview'), panel.DefaultSize(62)], ['Preview']),
  ],
)`,
    render: (model, h) => {
      const resizable = Resizable.Root.withMessage(h)
      const panel = Resizable.Panel.withMessage(h)
      const handle = Resizable.Handle.withMessage(h)
      return [
        resizable(
          [
            resizable.Layout(model.resizableLayout),
            resizable.OnLayoutcommit(detail =>
              Message.ChangedResizableLayout({ layout: detail.value }),
            ),
          ],
          [
            panel(
              [panel.Id('docs-files'), panel.DefaultSize(38), panel.MinSize(20)],
              [h.p([], ['Files'])],
            ),
            handle([], []),
            panel(
              [panel.Id('docs-preview'), panel.DefaultSize(62)],
              [h.p([], ['Preview'])],
            ),
          ],
        ),
        h.p([h.Class('muted')], [
          `Layout: ${model.resizableLayout.map(value => `${Math.round(value)}%`).join(' / ')}`,
        ]),
      ]
    },
  },
  {
    slug: 'scroll-area',
    title: 'Scroll area',
    namespaces: ['ScrollArea'],
    note: 'A native scroller with a styled scrollbar you own.',
    overview:
      'A scroll container with a real scrollbar element. ScrollArea.Root wraps Viewport and Content; Scrollbar and Thumb are the visible track, and Corner fills the bottom-right gap. ScrollToEnd is the part that sticks to the newest content. The Model holds what is selected inside, not the scroll offset.',
    code: `import { ScrollArea } from 'foldkit-ui-sdk/scroll-area'

const scrollArea = ScrollArea.Root.withMessage(h)
const viewport = ScrollArea.Viewport.withMessage(h)
const content = ScrollArea.Content.withMessage(h)
const scrollbar = ScrollArea.Scrollbar.withMessage(h)
const thumb = ScrollArea.Thumb.withMessage(h)

scrollArea([h.Class('scroll-area')], [
  viewport([], [content([], rows.map(row => h.p([], [row])))]),
  scrollbar([], [thumb([], [])]),
])`,
    render: (model, h) => {
      const scrollArea = ScrollArea.Root.withMessage(h)
      const viewport = ScrollArea.Viewport.withMessage(h)
      const content = ScrollArea.Content.withMessage(h)
      const scrollbar = ScrollArea.Scrollbar.withMessage(h)
      const thumb = ScrollArea.Thumb.withMessage(h)
      const tracks = ['Low Season', 'Paper Moon Motel', 'Cold Open', 'Tram Lines', 'Smoke Signals', 'Tidepool']
      return [
        h.div([h.Class('row')], [
          scrollArea([h.Class('scroll-area')], [
            viewport([h.Class('scroll-viewport')], [
              content([], tracks.map(track =>
                h.button(
                  [
                    h.Type('button'),
                    h.Class(model.scrollTrack === track ? 'btn btn-solid' : 'btn'),
                    h.OnClick(Message.ChangedScrollTrack({ value: track })),
                  ],
                  [track],
                ),
              )),
            ]),
            scrollbar([h.Class('scroll-bar')], [thumb([], [])]),
          ]),
          h.span([h.Class('muted')], [model.scrollTrack ?? 'Pick a track']),
        ]),
      ]
    },
  },
  {
    slug: 'textarea',
    title: 'Textarea',
    namespaces: ['Textarea'],
    note: 'Grows with its content; typing is a Message.',
    overview:
      'A multiline field. Textarea.Root wraps your textarea and reports valuechange on every keystroke. AutoResize keeps the box as tall as its content, SubmitShortcut lets a chord submit, and MaxLength stays native. The Model holds the draft — the element never does.',
    code: `import { Textarea } from 'foldkit-ui-sdk/textarea'

const textarea = Textarea.Root.withMessage(h)

textarea(
  [
    textarea.Value(model.textareaValue),
    textarea.AutoResize(true),
    textarea.OnValuechange(detail =>
      Message.ChangedTextarea({ value: detail.value }),
    ),
  ],
  [h.textarea([h.Maxlength(200), h.Placeholder('Special requests')])],
)`,
    render: (model, h) => {
      const textarea = Textarea.Root.withMessage(h)
      return [
        h.div([h.Class('stack')], [
          textarea(
            [
              textarea.Value(model.textareaValue),
              textarea.AutoResize(true),
              textarea.OnValuechange(detail =>
                Message.ChangedTextarea({ value: detail.value }),
              ),
            ],
            [h.textarea([h.Maxlength(200), h.Placeholder('Special requests')])],
          ),
          h.p([h.Class('muted')], [`${model.textareaValue.length}/200 characters`]),
        ]),
      ]
    },
  },
  {
    slug: 'time-input',
    title: 'Time input',
    namespaces: ['TimeInput'],
    note: 'Hour and minute segments, bounded by min and max.',
    overview:
      'A segmented time field. TimeInput.Root renders a segment per hour and minute, in the granularity and hour cycle you ask for, and reports the whole value. Min/Max bound the selectable times. The Model keeps the "HH:mm" string.',
    code: `import { TimeInput } from 'foldkit-ui-sdk/time-input'

const timeInput = TimeInput.Root.withMessage(h)

timeInput(
  [
    timeInput.Value(model.timeValue ?? ''),
    timeInput.Min('06:00'),
    timeInput.Max('23:00'),
    timeInput.OnValuechange(detail =>
      Message.ChangedTime({ value: detail.value }),
    ),
  ],
  [],
)`,
    render: (model, h) => {
      const timeInput = TimeInput.Root.withMessage(h)
      return [
        h.div([h.Class('row')], [
          timeInput(
            [
              timeInput.Value(model.timeValue ?? ''),
              timeInput.Min('06:00'),
              timeInput.Max('23:00'),
              timeInput.OnValuechange(detail =>
                Message.ChangedTime({ value: detail.value }),
              ),
            ],
            [],
          ),
          h.span([h.Class('muted')], [model.timeValue ?? 'empty']),
        ]),
      ]
    },
  },
  {
    slug: 'timeline',
    title: 'Timeline',
    namespaces: ['Timeline'],
    note: 'Events on a line, with a selected value.',
    overview:
      'A release or activity line. Timeline.Root holds Orientation/Loop/Busy and the selected value; Timeline.Item declares its Value and Status, and Marker, Connector, Title and Time render one event. The element moves the roving focus; the selection is yours to keep in the Model.',
    code: `import { Timeline } from 'foldkit-ui-sdk/timeline'

const timeline = Timeline.Root.withMessage(h)
const item = Timeline.Item.withMessage(h)
const marker = Timeline.Marker.withMessage(h)
const connector = Timeline.Connector.withMessage(h)
const title = Timeline.Title.withMessage(h)
const time = Timeline.Time.withMessage(h)

timeline([timeline.Orientation('vertical')], releases.map(release =>
  item([item.Value(release.version), item.Status(release.status)], [
    marker([], []),
    connector([], []),
    title([], [release.version]),
    time([], [release.date]),
  ]),
))`,
    render: (model, h) => {
      const timeline = Timeline.Root.withMessage(h)
      const item = Timeline.Item.withMessage(h)
      const marker = Timeline.Marker.withMessage(h)
      const connector = Timeline.Connector.withMessage(h)
      const title = Timeline.Title.withMessage(h)
      const time = Timeline.Time.withMessage(h)
      return [
        timeline(
          [
            h.Attribute('aria-label', 'Releases'),
            timeline.Orientation('vertical'),
          ],
          timelineItems.map(entry =>
            item(
              [
                item.Value(entry.value),
                item.Status(entry.status),
                ...(model.timelineValue === entry.value
                  ? [h.DataAttribute('selected', '')]
                  : []),
                h.OnFocus(
                  Message.SelectedTimeline({ value: entry.value }),
                ),
              ],
              [
                marker([], []),
                connector([], []),
                title([], [entry.label]),
                time([], [entry.date]),
              ],
            ),
          ),
        ),
        h.p([h.Class('muted')], [
          model.timelineValue ? `Selected ${model.timelineValue}.` : 'Focus an event.',
        ]),
      ]
    },
  },
  {
    slug: 'toast',
    title: 'Toast',
    namespaces: ['Toast'],
    note: 'A queued notification with an action, fired from a Command.',
    overview:
      'Toasts come from a toaster, not from markup you render conditionally. createToaster returns a function; calling it queues a toast that Toast.Region renders with Toast.Title/Description/Action/Close. Because the call is async work with a side effect, the demo fires it from a Foldkit Command.',
    code: `import { createToaster } from '@ui-sdk/web'
import { Toast } from 'foldkit-ui-sdk/toast'

const toaster = createToaster({ duration: 5000 })

// update:
ClickedShowToast: () => ({ model, commands: [ShowToast()] }),

const ShowToast = Command.define('ShowToast', {
  messages: [Message.FinishedShowToast],
  execute: Effect.sync(() => {
    toaster('Saved to your library', {
      description: 'The card is on the shelf.',
      action: { label: 'Undo', dismiss: true, onAction: () => {} },
    })
    return Message.FinishedShowToast()
  }),
})`,
    render: (_model, h) => {
      const region = Toast.Region.withMessage(h)
      return [
        h.div([h.Class('row')], [
          h.button(
            [
              h.Type('button'),
              h.Class('btn btn-solid'),
              h.OnClick(Message.ClickedShowToast()),
            ],
            ['Show a toast'],
          ),
          h.span([h.Class('muted')], ['Fired through a Command, rendered by the region.']),
        ]),
        region([region.Toaster(demoToaster)], [
          h.template([
            h.InnerHTML(
              '<ui-toast><ui-toast-title></ui-toast-title><ui-toast-description></ui-toast-description><ui-toast-action><button type="button"></button></ui-toast-action><ui-toast-close><button type="button" aria-label="Dismiss">×</button></ui-toast-close></ui-toast>',
            ),
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'token-input',
    title: 'Token input',
    namespaces: ['TokenInput'],
    note: 'Rich tokens inside an editable field.',
    overview:
      'An editor where some runs are tokens. TokenInput.Root carries the value as a segment array — text segments and token segments — and reports every edit; TokenInput.Editor is the editable region and Token/TokenRemove render one token. The editor keeps the caret and the DOM while the Model keeps the document.',
    code: `import { TokenInput } from 'foldkit-ui-sdk/token-input'

const tokenInput = TokenInput.Root.withMessage(h)
const editor = TokenInput.Editor.withMessage(h)

tokenInput(
  [
    tokenInput.DefaultValue('Ask about @route.ts'),
    tokenInput.OnValuechange(detail =>
      Message.ChangedTokens({ values: segments(detail.value) }),
    ),
  ],
  [
    editor([h.Attribute('aria-label', 'Question')], []),
  ],
)`,
    render: (model, h) => {
      const tokenInput = TokenInput.Root.withMessage(h)
      const editor = TokenInput.Editor.withMessage(h)
      return [
        h.div([h.Class('stack')], [
          tokenInput(
            [
              tokenInput.DefaultValue([
                'Ask about ',
                { type: 'file', value: 'route', label: 'route.ts' },
                ' and ',
                { type: 'file', value: 'model', label: 'model.ts' },
                ' ',
              ]),
              tokenInput.OnValuechange(detail =>
                Message.ChangedTokens({ values: listOf(detail.value) }),
              ),
            ],
            [
              editor(
                [
                  h.Attribute('aria-label', 'Question about the codebase'),
                  h.Class('token-editor'),
                ],
                [],
              ),
              h.template([
                h.InnerHTML(
                  '<ui-token-input-token><span data-token-label></span><ui-token-input-token-remove><button type="button">×</button></ui-token-input-token-remove></ui-token-input-token>',
                ),
              ]),
            ],
          ),
          h.p([h.Class('muted')], [
            model.tokenValues.length > 0
              ? `Model text: ${model.tokenValues.join('').replace(/\s+/g, ' ').trim()}`
              : 'The editor keeps the tokens; the Model sees the text segments.',
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'toolbar',
    title: 'Toolbar',
    namespaces: ['Toolbar'],
    note: 'A roving-focus bar for grouped controls.',
    overview:
      'A toolbar groups related controls and gives the whole bar one tab stop: arrows move between the groups and buttons, Home/End jump to the ends. Toolbar.Root wraps Toolbar.Group, Toolbar.Button, Toolbar.Link, Toolbar.Input and Toolbar.Separator. The controls inside keep their own values in the Model.',
    code: `import { Toolbar, Toggle } from 'foldkit-ui-sdk'

const toolbar = Toolbar.Root.withMessage(h)
const separator = Toolbar.Separator.withMessage(h)
const group = Toggle.Group.withMessage(h)
const toggle = Toggle.Root.withMessage(h)

toolbar([h.Attribute('aria-label', 'Formatting')], [
  group(
    [
      group.Multiple(true),
      group.Value(model.toolbarMarks),
      group.OnValuechange(detail =>
        Message.ChangedToolbarMarks({ marks: detail.value }),
      ),
    ],
    marks.map(mark =>
      toggle([toggle.Value(mark)], [
        h.button([h.Type('button')], [mark]),
      ]),
    ),
  ),
  separator([], []),
])`,
    render: (model, h) => {
      const toolbar = Toolbar.Root.withMessage(h)
      const separator = Toolbar.Separator.withMessage(h)
      const group = Toggle.Group.withMessage(h)
      const toggle = Toggle.Root.withMessage(h)
      const marks = ['bold', 'italic', 'underline']
      return [
        h.div([h.Class('row')], [
          toolbar([h.Attribute('aria-label', 'Formatting')], [
            group(
              [
                group.Multiple(true),
                group.Value(model.toolbarMarks),
                group.OnValuechange(detail =>
                  Message.ChangedToolbarMarks({ marks: detail.value }),
                ),
              ],
              marks.map(mark =>
                toggle([toggle.Value(mark)], [
                  h.button([h.Type('button'), h.Class('btn')], [
                    mark[0].toUpperCase() + mark.slice(1),
                  ]),
                ]),
              ),
            ),
            separator([], []),
          ]),
          h.span([h.Class('muted')], [
            model.toolbarMarks.length > 0 ? model.toolbarMarks.join(', ') : 'none',
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'tree',
    title: 'Tree',
    namespaces: ['Tree'],
    note: 'A nested list with expansion, selection and typeahead.',
    overview:
      'A hierarchy as a tree. Tree.Root takes Items (the data) plus Expanded and Value; Tree.Item declares Value and Branch, Tree.ItemLabel wraps the row, Tree.ItemIndicator is the caret, and Tree.Group nests children. The demo renders rows from the expansion the element reports, so the Model and the DOM agree.',
    code: `import { Tree } from 'foldkit-ui-sdk/tree'

const tree = Tree.Root.withMessage(h)
const item = Tree.Item.withMessage(h)
const label = Tree.ItemLabel.withMessage(h)
const group = Tree.Group.withMessage(h)

tree(
  [
    tree.Items(treeItems),
    tree.Expanded(model.treeExpanded),
    tree.OnExpandedchange(detail =>
      Message.ChangedTreeExpanded({ expanded: detail.value }),
    ),
    tree.Value(model.treeSelected ?? ''),
    tree.OnValuechange(detail =>
      Message.ChangedTreeSelected({ value: detail.value }),
    ),
  ],
  treeItems.map(entry =>
    item([item.Value(entry.value), item.Branch(entry.children !== undefined)], [
      label([], [entry.label]),
      entry.children ? group([], rows(entry.children)) : '',
    ]),
  ),
)`,
    render: (model, h) => {
      const tree = Tree.Root.withMessage(h)
      const item = Tree.Item.withMessage(h)
      const label = Tree.ItemLabel.withMessage(h)
      const indicator = Tree.ItemIndicator.withMessage(h)
      const rows = flattenTree(treeItems, model.treeExpanded)
      return [
        h.div([h.Class('row')], [
          tree(
            [
              h.Attribute('aria-label', 'Project files'),
              tree.Items(treeItems),
              tree.Expanded([...model.treeExpanded]),
              tree.OnExpandedchange(detail =>
                Message.ChangedTreeExpanded({ expanded: detail.value }),
              ),
              tree.Value(model.treeSelected ?? ''),
              tree.OnValuechange(detail =>
                Message.ChangedTreeSelected({ value: textOrNull(detail.value) }),
              ),
            ],
            rows.map(entry =>
              item(
                [
                  item.Value(entry.value),
                  ...(entry.branch ? [item.Branch(true)] : []),
                  h.DataAttribute('depth', String(entry.value.split('/').length - 1)),
                ],
                [
                  label([h.Class('row')], [
                    entry.branch ? indicator([], ['▸']) : '',
                    h.span([], [entry.label]),
                  ]),
                ],
              ),
            ),
          ),
          h.span([h.Class('muted')], [model.treeSelected ?? 'nothing selected']),
        ]),
      ]
    },
  },
  {
    slug: 'trigger-menu',
    title: 'Trigger menu',
    namespaces: ['TriggerMenu'],
    note: 'A menu that opens on a typed trigger character.',
    overview:
      'The mention or slash menu: root declares its Triggers (a character and the items it offers), TriggerMenu.Input wraps the field, and TriggerMenu.Content/List/Item render the filtered choices. Typing the trigger character opens it, typing filters, Enter selects, and Escape closes. Pair it with TokenInput for a rich editor.',
    code: `import { TriggerMenu } from 'foldkit-ui-sdk/trigger-menu'

const menu = TriggerMenu.Root.withMessage(h)
const input = TriggerMenu.Input.withMessage(h)
const content = TriggerMenu.Content.withMessage(h)
const list = TriggerMenu.List.withMessage(h)
const item = TriggerMenu.Item.withMessage(h)

menu(
  [menu.Triggers([{ char: '@', items: readers }])],
  [
    input([], [h.textarea([h.Placeholder('Type @ to mention a reader')])]),
    content([], [
      list([], readers.map(reader =>
        item([item.Value(reader.value), item.Label(reader.label)], [reader.label]),
      )),
    ]),
  ],
)`,
    render: (model, h) => {
      const menu = TriggerMenu.Root.withMessage(h)
      const input = TriggerMenu.Input.withMessage(h)
      const status = TriggerMenu.Status.withMessage(h)
      const content = TriggerMenu.Content.withMessage(h)
      const empty = TriggerMenu.Empty.withMessage(h)
      const list = TriggerMenu.List.withMessage(h)
      const item = TriggerMenu.Item.withMessage(h)
      return [
        h.div([h.Class('stack')], [
          menu(
            [
              menu.Triggers([{ char: '@', items: readers }]),
              menu.OnItemselect(() =>
                Message.SelectedMenuAction({ action: 'mention' }),
              ),
            ],
            [
              input([], [
                h.textarea([
                  h.Placeholder('Type @ to mention a reader'),
                  h.Class('token-editor'),
                ]),
              ]),
              status([], []),
              content([], [
                empty([], ['No reader by that name.']),
                list([], readers.map(reader =>
                  item(
                    [item.Value(reader.value), item.Label(reader.label)],
                    [reader.label],
                  ),
                )),
              ]),
            ],
          ),
          h.p([h.Class('muted')], [
            model.lastAction === 'mention'
              ? 'A mention was selected; the textarea was edited in place.'
              : 'Type @ to open the mention menu.',
          ]),
        ]),
      ]
    },
  },
  {
    slug: 'waterfall',
    title: 'Waterfall',
    namespaces: ['Waterfall'],
    note: 'A timing chart whose rows and bars come from item data.',
    overview:
      'A network-style waterfall. Waterfall.Root takes Items (each with start and duration) plus Range, Expanded and Value; HeaderRow/ColumnHeader/Axis/Mark draw the ruler, and Row/RowHeader/Cell/Bar render one request. Indicators mark expandable rows, and the element sizes every bar from the same data the Model holds.',
    code: `import { Waterfall } from 'foldkit-ui-sdk/waterfall'

const waterfall = Waterfall.Root.withMessage(h)
const row = Waterfall.Row.withMessage(h)
const rowHeader = Waterfall.RowHeader.withMessage(h)
const cell = Waterfall.Cell.withMessage(h)
const bar = Waterfall.Bar.withMessage(h)

waterfall(
  [
    waterfall.Items(requests),
    waterfall.Range([0, 1200]),
    waterfall.Expanded(model.waterfallExpanded),
    waterfall.Value(model.waterfallSelected ?? ''),
    waterfall.OnValuechange(detail =>
      Message.ChangedWaterfallSelected({ value: detail.value }),
    ),
  ],
  rows.map(entry =>
    row([row.Value(entry.value)], [
      rowHeader([], [entry.label]),
      cell([], [\`\${entry.duration} ms\`]),
      bar([], []),
    ]),
  ),
)`,
    render: (model, h) => {
      const waterfall = Waterfall.Root.withMessage(h)
      const headerRow = Waterfall.HeaderRow.withMessage(h)
      const columnHeader = Waterfall.ColumnHeader.withMessage(h)
      const axis = Waterfall.Axis.withMessage(h)
      const mark = Waterfall.Mark.withMessage(h)
      const row = Waterfall.Row.withMessage(h)
      const rowHeader = Waterfall.RowHeader.withMessage(h)
      const indicator = Waterfall.Indicator.withMessage(h)
      const cell = Waterfall.Cell.withMessage(h)
      const bar = Waterfall.Bar.withMessage(h)
      const rows = flattenWaterfall(waterfallItems, model.waterfallExpanded)
      return [
        waterfall(
          [
            h.Attribute('aria-label', 'Network requests'),
            waterfall.Items(waterfallItems),
            waterfall.Range([0, 1200]),
            waterfall.Expanded([...model.waterfallExpanded]),
            waterfall.OnExpandedchange(detail =>
              Message.ChangedWaterfallExpanded({ expanded: detail.value }),
            ),
            waterfall.Value(model.waterfallSelected ?? ''),
            waterfall.OnValuechange(detail =>
              Message.ChangedWaterfallSelected({ value: detail.value }),
            ),
          ],
          [
            headerRow([h.Class('row')], [
              columnHeader([], ['Name']),
              columnHeader([], ['Time']),
              columnHeader([], [
                axis([axis.MaxTicks(4)], []),
                mark([mark.Time(572)], ['DCL']),
              ]),
            ]),
            ...rows.map(entry =>
              row(
                [
                  row.Value(entry.value),
                  ...(model.waterfallExpanded.includes(entry.value)
                    ? [h.DataAttribute('expanded', '')]
                    : []),
                ],
                [
                  rowHeader([h.Class('row')], [
                    entry.branch ? indicator([], ['▸']) : '',
                    h.span([], [entry.label]),
                  ]),
                  cell([], [`${entry.duration} ms`]),
                  bar([], []),
                ],
              ),
            ),
          ],
        ),
        h.p([h.Class('muted')], [`Selected: ${model.waterfallSelected ?? 'none'}`]),
      ]
    },
  },
]

// The illustrations the demos embed. A data URI keeps them self-contained.

const portrait = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb38a"/><stop offset="1" stop-color="#c2410c"/></linearGradient></defs><rect width="480" height="480" fill="url(#s)"/><circle cx="380" cy="90" r="40" fill="#fff4e6" opacity=".85"/><path d="M0 360 120 270l100 60 120-90 140 100v140H0z" fill="#9a3412" opacity=".55"/><path d="M170 480c8-70 50-110 90-118 40 8 82 48 90 118z" fill="#1e3a8a"/><ellipse cx="260" cy="210" rx="52" ry="62" fill="#f2b591"/><path d="M208 206c-4-50 26-82 58-82 36 0 60 28 55 80-8-25-23-38-41-43-25 13-50 20-72 45z" fill="#1c130e"/><circle cx="242" cy="214" r="4" fill="#2a1a12"/><circle cx="280" cy="214" r="4" fill="#2a1a12"/></svg>`,
)}`
