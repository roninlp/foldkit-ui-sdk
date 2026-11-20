import { Effect, Queue, Stream } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import type { MountAction } from 'foldkit/mount'

import {
  Button,
  Checkbox,
  Combobox,
  Field,
  FileInput,
  Input,
  NumberInput,
  OTPInput,
  PasswordInput,
  Radio,
  SegmentedControl,
  Select,
  Slider,
  Switch,
  Textarea,
  Toggle,
} from 'foldkit-ui-sdk'

import { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './forms.css'

const wait = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms)
  })

/**
 * A Mount that installs native listeners once and dispatches a Message for
 * every emission. The elements' async APIs (`action` with `details.waitUntil`,
 * `valuechange` followed by a timer) take the event itself, which a typed
 * binding's factory does not expose.
 */
const listen = <M>(
  name: string,
  setup: (element: Element, emit: (message: M) => void) => void,
): MountAction<M> => ({
  name,
  f: element =>
    Stream.callback<M>(queue => {
      setup(element, message => {
        // A timer can outlive the element; the queue is closed on unmount.
        if (element.isConnected) {
          Queue.offerUnsafe(queue, message)
        }
      })
      return Effect.never
    }),
})

const icon = (
  h: HtmlBuilder<Message>,
  name: string,
  weight: 'regular' | 'fill' | 'bold' = 'regular',
  size = 16,
) =>
  h.i(
    [
      h.Class(`ph${weight === 'regular' ? '' : `-${weight}`} ph-${name}`),
      h.Style({ fontSize: `${size}px` }),
      h.Attribute('aria-hidden', 'true'),
    ],
    [],
  )

/**
 * UI SDK's stylesheet draws a mask icon inside parts that hold no <svg>. The
 * port uses the Phosphor font instead, so zero the pseudo icon's size.
 */
const hideComponentIcon = (h: HtmlBuilder<Message>) =>
  h.Style({ '--ui-icon-size': '0px' })

const spinner = (h: HtmlBuilder<Message>, size = 16) =>
  h.i(
    [
      h.Class('ph-bold ph-circle-notch fm-spin'),
      h.Style({ fontSize: `${size}px` }),
      h.Attribute('aria-hidden', 'true'),
    ],
    [],
  )

/* 1. Checkout card form */

const countries = [
  { value: 'pt', label: 'Portugal' },
  { value: 'jp', label: 'Japan' },
  { value: 'us', label: 'United States' },
  { value: 'ca', label: 'Canada' },
  { value: 'de', label: 'Germany' },
]

type CheckoutState = Readonly<{
  card: string
  paid: boolean
  pending: boolean
}>

const checkoutInitial: CheckoutState = { card: '', paid: false, pending: false }
let checkoutLatest: CheckoutState = checkoutInitial

const checkout: Tile<CheckoutState> = {
  id: 'forms-checkout',
  title: 'Pay for the trip.',
  blurb: 'Every field checks itself before you pay.',
  size: 'large',
  initial: checkoutInitial,
  render: ({ state, set, h }: TileContext<CheckoutState>) => {
    checkoutLatest = state
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const fieldError = Field.Error.withMessage(h)
    const input = Input.Root.withMessage(h)
    const inputGroup = Input.Group.withMessage(h)
    const select = Select.Root.withMessage(h)
    const selectTrigger = Select.Trigger.withMessage(h)
    const selectValue = Select.Value.withMessage(h)
    const selectContent = Select.Content.withMessage(h)
    const selectItem = Select.Item.withMessage(h)
    const selectItemIndicator = Select.ItemIndicator.withMessage(h)
    const checkbox = Checkbox.Root.withMessage(h)
    const checkboxIndicator = Checkbox.Indicator.withMessage(h)
    const button = Button.Root.withMessage(h)

    return h.form(
      [h.Class('fm-pay'), h.OnSubmit(Message.SinkDone())],
      [
        h.header([h.Class('fm-pay-head')], [
          h.div([], [
            h.p([h.Class('fm-pay-route')], [
              'Lisbon ',
              icon(h, 'arrow-right', 'bold', 14),
              ' Tokyo',
            ]),
            h.p([h.Class('fm-pay-meta')], ['2 travelers · Oct 9 – 23']),
          ]),
          h.p([h.Class('fm-pay-total')], ['$1,284.60']),
        ]),
        field([field.Name('cardholder'), h.Class('fm-field')], [
          h.div([h.Class('fm-field-head')], [
            fieldLabel([h.Class('b-label')], ['Name on card']),
            fieldError([fieldError.Match('valueMissing'), h.Class('fm-error')], [
              'Required',
            ]),
          ]),
          input([], [
            h.input(
              [
                h.Class('b-input fm-input'),
                h.Autocomplete('cc-name'),
                h.Placeholder('Maya Okafor'),
                h.Required(true),
              ],
            ),
          ]),
        ]),
        field([field.Name('card'), h.Class('fm-field')], [
          h.div([h.Class('fm-field-head')], [
            fieldLabel([h.Class('b-label')], ['Card number']),
            fieldError([fieldError.Match('valueMissing'), h.Class('fm-error')], [
              'Required',
            ]),
            fieldError([fieldError.Match('patternMismatch'), h.Class('fm-error')], [
              'Needs 16 digits',
            ]),
          ]),
          inputGroup([h.Class('b-input fm-input-group')], [
            icon(h, 'credit-card', 'fill', 14),
            input(
              [
                input.Value(state.card),
                input.OnValuechange(detail => {
                  const digits = detail.value.replace(/\D/g, '')
                  // PORT NOTE: the element's valuechange detail has no
                  // `cancel()`, so a 17th digit is clamped in the Model value
                  // instead of refusing the keystroke in the DOM.
                  const next = digits.slice(0, 16)
                  return set(current => ({
                    ...current,
                    card: next.replace(/(\d{4})(?=\d)/g, '$1 '),
                  }))
                }),
              ],
              [
                h.input(
                  [
                    h.Class('fm-bare-input fm-mono'),
                    h.InputMode('numeric'),
                    h.Autocomplete('cc-number'),
                    h.Placeholder('1234 1234 1234 1234'),
                    h.Pattern('\\d{4} \\d{4} \\d{4} \\d{4}'),
                    h.Required(true),
                  ],
                ),
              ],
            ),
          ]),
        ]),
        h.div([h.Class('fm-pay-row')], [
          field([field.Name('expiry'), h.Class('fm-field')], [
            h.div([h.Class('fm-field-head')], [
              fieldLabel([h.Class('b-label')], ['Expires']),
              fieldError([h.Class('fm-error')], ['Invalid']),
            ]),
            input([], [
              h.input(
                [
                  h.Class('b-input fm-input fm-mono'),
                  h.Autocomplete('cc-exp'),
                  h.Placeholder('MM / YY'),
                  h.Pattern('(0[1-9]|1[0-2]) ?/ ?\\d{2}'),
                  h.Maxlength(7),
                  h.Required(true),
                ],
              ),
            ]),
          ]),
          field([field.Name('cvc'), h.Class('fm-field')], [
            h.div([h.Class('fm-field-head')], [
              fieldLabel([h.Class('b-label')], ['CVC']),
              fieldError([h.Class('fm-error')], ['Invalid']),
            ]),
            input([], [
              h.input(
                [
                  h.Class('b-input fm-input fm-mono'),
                  h.Autocomplete('cc-csc'),
                  h.InputMode('numeric'),
                  h.Placeholder('123'),
                  h.Pattern('\\d{3,4}'),
                  h.Maxlength(4),
                  h.Required(true),
                ],
              ),
            ]),
          ]),
          field([field.Name('country'), h.Class('fm-field fm-pay-country')], [
            h.div([h.Class('fm-field-head')], [
              fieldLabel([h.Class('b-label')], ['Billing country']),
              fieldError([fieldError.Match('valueMissing'), h.Class('fm-error')], [
                'Required',
              ]),
            ]),
            select(
              [
                select.Items(countries),
                select.Required(true),
                select.Placeholder('Choose'),
              ],
              [
                selectTrigger([], [
                  h.button([h.Type('button'), h.Class('b-input fm-trigger')], [
                    selectValue([h.Class('fm-trigger-value')], []),
                    icon(h, 'caret-down', 'bold', 14),
                  ]),
                ]),
                selectContent(
                  [h.Class('b-pop fm-pop'), selectContent.SideOffset(6)],
                  countries.map(country =>
                    selectItem(
                      [
                        selectItem.Value(country.value),
                        h.Class('b-item fm-option'),
                      ],
                      [
                        country.label,
                        selectItemIndicator(
                          [h.Class('fm-option-check'), hideComponentIcon(h)],
                          [icon(h, 'check', 'bold', 14)],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ]),
        ]),
        h.label([h.Class('fm-check-row')], [
          checkbox(
            [checkbox.Name('save-card'), checkbox.DefaultChecked(true), h.Class('fm-box')],
            [
              checkboxIndicator(
              [h.Class('fm-box-mark'), hideComponentIcon(h)],
              [icon(h, 'check', 'bold', 14)],
            ),
            ],
          ),
          'Save card for future bookings',
        ]),
        button(
          [
            button.PendingAnnouncement('Processing payment'),
            h.OnMount(
              listen('FormsCheckoutPay', (element, emit) => {
                element.addEventListener('action', event => {
                  const form = element.closest('form')
                  if (form && !form.checkValidity()) {
                    return
                  }
                  const action = event as CustomEvent<{
                    waitUntil: (promise: Promise<unknown>) => void
                  }>
                  const work = (async () => {
                    emit(set({ ...checkoutLatest, pending: true, paid: false }))
                    await wait(1200)
                    emit(set({ ...checkoutLatest, pending: false, paid: true }))
                    await wait(2400)
                    emit(set({ ...checkoutLatest, paid: false }))
                  })()
                  action.detail.waitUntil(work)
                })
              }),
            ),
          ],
          [
            h.button(
              [
                h.Type('submit'),
                h.Class('b-btn fm-pay-btn'),
                h.DataAttribute('variant', 'primary'),
                ...(state.paid ? [h.DataAttribute('done', '')] : []),
              ],
              [
                ...(state.pending
                  ? [spinner(h, 14), ' Processing…']
                  : state.paid
                    ? [icon(h, 'check', 'bold', 14), ' Payment approved']
                    : [icon(h, 'lock-simple', 'fill', 14), ' Pay now']),
              ],
            ),
          ],
        ),
      ],
    )
  },
}

/* 2. Flight search: two airport comboboxes, a trip type and a search button */

const airports = [
  { code: 'SFO', city: 'San Francisco', country: 'United States' },
  { code: 'SEA', city: 'Seattle', country: 'United States' },
  { code: 'JFK', city: 'New York', country: 'United States' },
  { code: 'MEX', city: 'Mexico City', country: 'Mexico' },
  { code: 'CDG', city: 'Paris', country: 'France' },
  { code: 'AMS', city: 'Amsterdam', country: 'Netherlands' },
  { code: 'KEF', city: 'Reykjavík', country: 'Iceland' },
  { code: 'CPT', city: 'Cape Town', country: 'South Africa' },
  { code: 'ICN', city: 'Seoul', country: 'South Korea' },
  { code: 'SYD', city: 'Sydney', country: 'Australia' },
]

const airportLabel = (value: unknown) => {
  const code = typeof value === 'string' ? value : null
  const airport = airports.find(item => item.code === code)
  return airport ? `${airport.city} (${airport.code})` : ''
}

type FlightState = Readonly<{
  trip: string
  from: string | null
  fromQuery: string
  to: string | null
  toQuery: string
  result: string
  searching: boolean
}>

const flightInitial: FlightState = {
  trip: 'round',
  from: 'SFO',
  fromQuery: airportLabel('SFO'),
  to: null,
  toQuery: '',
  result: '',
  searching: false,
}
let flightLatest: FlightState = flightInitial

const flightSearch: Tile<FlightState> = {
  id: 'forms-flight-search',
  title: 'Plan the route.',
  blurb: 'Type a city or a code to find airports.',
  size: 'wide',
  tone: 'paper',
  initial: flightInitial,
  render: ({ state, set, h }: TileContext<FlightState>) => {
    flightLatest = state
    const segmented = SegmentedControl.Root.withMessage(h)
    const segmentedIndicator = SegmentedControl.Indicator.withMessage(h)
    const segmentedItem = SegmentedControl.Item.withMessage(h)
    const combobox = Combobox.Root.withMessage(h)
    const comboboxLabel = Combobox.Label.withMessage(h)
    const comboboxInput = Combobox.Input.withMessage(h)
    const comboboxContent = Combobox.Content.withMessage(h)
    const comboboxEmpty = Combobox.Empty.withMessage(h)
    const comboboxList = Combobox.List.withMessage(h)
    const comboboxItem = Combobox.Item.withMessage(h)
    const button = Button.Root.withMessage(h)

    const airportField = (
      rootId: string,
      boxId: string,
      anchor: string,
      label: string,
      iconName: string,
      value: string | null,
      query: string,
      onValue: (next: string | null) => Message,
      onQuery: (next: string) => Message,
    ) =>
      combobox(
        [
          h.Id(rootId),
          combobox.Value(value),
          combobox.Query(query),
          combobox.ItemToLabel(airportLabel),
          combobox.AutoHighlight(true),
          combobox.OnValuechange(detail => {
            const next = typeof detail.value === 'string' ? detail.value : null
            return onValue(next)
          }),
          combobox.OnQuerychange(detail => onQuery(detail.value)),
        ],
        [
          h.div([h.Class('fm-ap'), h.Id(boxId)], [
            icon(h, iconName, 'fill', 16),
            h.div([h.Class('fm-ap-text')], [
              comboboxLabel([h.Class('fm-ap-label')], [label]),
              comboboxInput([], [
                h.input([
                  h.Class('fm-ap-input'),
                  h.Placeholder('City or airport'),
                ]),
              ]),
            ]),
          ]),
          comboboxContent(
            [
              h.Class('b-pop fm-ap-pop'),
              comboboxContent.Anchor(anchor),
              comboboxContent.SideOffset(6),
              comboboxContent.Align('start'),
            ],
            [
              comboboxEmpty([h.Class('fm-empty')], ['No airports match.']),
              comboboxList([h.Class('fm-list')], [
                ...airports.map(airport =>
                  comboboxItem(
                    [
                      comboboxItem.Value(airport.code),
                      comboboxItem.Label(airportLabel(airport.code)),
                      comboboxItem.Keywords([airport.code, airport.country]),
                      h.Class('b-item fm-ap-item'),
                    ],
                    [
                      h.span([h.Class('fm-ap-code')], [airport.code]),
                      h.span([h.Class('fm-ap-city')], [
                        airport.city,
                        h.span([], [airport.country]),
                      ]),
                    ],
                  ),
                ),
              ]),
            ],
          ),
        ],
      )

    return h.div([h.Class('fm-search')], [
      segmented(
        [
          segmented.Value(state.trip),
          segmented.OnValuechange(detail => {
            const next = detail.value
            return set(current =>
              next ? { ...current, trip: next } : current,
            )
          }),
          h.Class('fm-seg'),
          h.Attribute('aria-label', 'Trip type'),
        ],
        [
          segmentedIndicator([h.Class('fm-seg-indicator')], []),
          segmentedItem([segmentedItem.Value('round'), h.Class('fm-seg-item')], [
            'Round trip',
          ]),
          segmentedItem([segmentedItem.Value('oneway'), h.Class('fm-seg-item')], [
            'One way',
          ]),
          segmentedItem([segmentedItem.Value('multi'), h.Class('fm-seg-item')], [
            'Multi-city',
          ]),
        ],
      ),
      h.div([h.Class('fm-search-bar')], [
        airportField(
          'forms-flight-from',
          'forms-flight-from-box',
          '#forms-flight-from-box',
          'From',
          'airplane-takeoff',
          state.from,
          state.fromQuery,
          next =>
            set(current => ({ ...current, from: next, result: '' })),
          next => set(current => ({ ...current, fromQuery: next })),
        ),
        h.button(
          [
            h.Type('button'),
            h.Class('fm-swap'),
            h.Attribute('aria-label', 'Swap origin and destination'),
            h.OnClick(
              set(current => ({
                ...current,
                from: current.to,
                to: current.from,
                fromQuery: current.toQuery,
                toQuery: current.fromQuery,
                result: '',
              })),
            ),
          ],
          [icon(h, 'arrows-left-right', 'bold', 16)],
        ),
        airportField(
          'forms-flight-to',
          'forms-flight-to-box',
          '#forms-flight-to-box',
          'To',
          'airplane-landing',
          state.to,
          state.toQuery,
          next => set(current => ({ ...current, to: next, result: '' })),
          next => set(current => ({ ...current, toQuery: next })),
        ),
        button(
          [
            button.PendingAnnouncement('Searching flights'),
            h.OnMount(
              listen('FormsFlightSearch', (element, emit) => {
                element.addEventListener('action', event => {
                  const { from, to, trip } = flightLatest
                  if (!from || !to) {
                    emit(
                      set({
                        ...flightLatest,
                        result: 'Choose both airports first.',
                      }),
                    )
                    if (!to) {
                      const target = document.getElementById('forms-flight-to') as
                        | (HTMLElement & { api?: { focus?: () => void } })
                        | null
                      target?.api?.focus?.()
                    }
                    return
                  }
                  const action = event as CustomEvent<{
                    waitUntil: (promise: Promise<unknown>) => void
                  }>
                  const work = (async () => {
                    emit(
                      set({ ...flightLatest, searching: true, result: '' }),
                    )
                    await wait(1000)
                    const seed = [...from, ...to].reduce(
                      (sum, char) => sum + char.charCodeAt(0),
                      0,
                    )
                    const way =
                      trip === 'oneway'
                        ? 'one-way'
                        : trip === 'multi'
                          ? 'multi-city'
                          : 'round-trip'
                    emit(
                      set({
                        ...flightLatest,
                        searching: false,
                        result: `${(seed % 40) + 14} ${way} fares from $${300 + ((seed * 7) % 520)}`,
                      }),
                    )
                  })()
                  action.detail.waitUntil(work)
                })
              }),
            ),
          ],
          [
            h.button(
              [
                h.Class('b-btn fm-search-btn'),
                h.DataAttribute('variant', 'primary'),
              ],
              [
                ...(state.searching
                  ? [spinner(h, 16), ' Searching']
                  : [icon(h, 'magnifying-glass', 'bold', 16), ' Search']),
              ],
            ),
          ],
        ),
      ]),
      h.p([h.Class('fm-search-status'), h.Attribute('role', 'status')], [
        state.result,
      ]),
    ])
  },
}

/* 3. Seat map: a single-select toggle group laid out like a cabin */

const seatRows = Array.from({ length: 14 }, (_, index) => index + 11)
const seatLetters = ['A', 'B', 'C', 'D', 'E', 'F']
const takenSeats = new Set(
  '11A 11B 12C 12D 13B 13F 14A 14B 15E 16F 17C 17D 17E 18A 18F 19B 19F 20A 20C 21D 21E 22A 22F 23B 23C 24D 24E'.split(
    ' ',
  ),
)
const legroomRows = new Set([11, 16])
const seatInfo = (id: string) => {
  const row = Number(id.slice(0, -1))
  const letter = id.slice(-1)
  const kind = 'AF'.includes(letter)
    ? 'Window'
    : 'CD'.includes(letter)
      ? 'Aisle'
      : 'Middle'
  const price = legroomRows.has(row) ? 46 : kind === 'Middle' ? 18 : 24
  return { kind, price, legroom: legroomRows.has(row) }
}

type SeatMapState = Readonly<{
  seat: ReadonlyArray<string>
  held: string
  holding: boolean
}>

const seatMapInitial: SeatMapState = {
  seat: ['16C'],
  held: '',
  holding: false,
}
let seatMapLatest: SeatMapState = seatMapInitial

const seatMap: Tile<SeatMapState> = {
  id: 'forms-seat-map',
  title: 'Pick a seat.',
  blurb: 'Arrow through the cabin, press to choose.',
  size: 'wide',
  initial: seatMapInitial,
  render: ({ state, set, h }: TileContext<SeatMapState>) => {
    seatMapLatest = state
    const group = Toggle.Group.withMessage(h)
    const toggle = Toggle.Root.withMessage(h)
    const button = Button.Root.withMessage(h)
    const chosen = state.seat[0]
    const info = chosen ? seatInfo(chosen) : null

    return h.div([h.Class('fm-cabin-map')], [
      h.div([h.Class('fm-plane')], [
        group(
          [
            group.Value(state.seat),
            group.OnValuechange(detail =>
              set(current => ({
                ...current,
                seat: detail.value,
                held: '',
              })),
            ),
            h.Class('fm-seats'),
            h.Attribute('aria-label', 'Seats, rows 11 to 24'),
          ],
          [
            ...seatLetters.map((letter, line) =>
              h.span(
                [
                  h.Class('fm-seat-letter'),
                  h.Attribute('aria-hidden', 'true'),
                  h.Style({
                    gridRow: String(line < 3 ? line + 1 : line + 2),
                  }),
                ],
                [letter],
              ),
            ),
            ...seatRows.map(row =>
              h.span(
                [
                  h.Class('fm-seat-row'),
                  h.Attribute('aria-hidden', 'true'),
                  ...(row > 16 ? [h.DataAttribute('far', '')] : []),
                  h.Style({ gridColumn: String(row - 9), gridRow: '4' }),
                ],
                [String(row)],
              ),
            ),
            ...seatLetters.flatMap((letter, line) =>
              seatRows.map(row => {
                const id = `${row}${letter}`
                const taken = takenSeats.has(id)
                return toggle(
                  [toggle.Value(id), toggle.Disabled(taken)],
                  [
                    h.button([
                      h.Class('fm-seat'),
                      h.Attribute(
                        'aria-label',
                        `Seat ${id}, ${seatInfo(id).kind.toLowerCase()}${taken ? ', taken' : ''}`,
                      ),
                      h.Style({
                        gridColumn: String(row - 9),
                        gridRow: String(line < 3 ? line + 1 : line + 2),
                      }),
                      ...(legroomRows.has(row)
                        ? [h.DataAttribute('legroom', '')]
                        : []),
                      ...(row > 16 ? [h.DataAttribute('far', '')] : []),
                    ]),
                  ],
                )
              }),
            ),
          ],
        ),
      ]),
      h.div([h.Class('fm-seat-panel')], [
        h.p([h.Class('fm-seat-id')], [chosen ?? '—']),
        h.p([h.Class('fm-seat-kind')], [
          info
            ? `${info.kind}${info.legroom ? ' · extra legroom' : ''}`
            : 'Pick an open seat',
        ]),
        h.p([h.Class('fm-seat-price')], [info ? `$${info.price}` : '']),
        button(
          [
            button.Disabled(!chosen),
            h.OnMount(
              listen('FormsSeatHold', (element, emit) => {
                element.addEventListener('action', event => {
                  const seat = seatMapLatest.seat[0] ?? ''
                  const action = event as CustomEvent<{
                    waitUntil: (promise: Promise<unknown>) => void
                  }>
                  const work = (async () => {
                    emit(set({ ...seatMapLatest, holding: true }))
                    await wait(900)
                    emit(
                      set({
                        ...seatMapLatest,
                        holding: false,
                        held: seat,
                      }),
                    )
                  })()
                  action.detail.waitUntil(work)
                })
              }),
            ),
          ],
          [
            h.button(
              [
                h.Class('b-btn fm-seat-btn'),
                h.DataAttribute('variant', 'primary'),
              ],
              [
                ...(state.holding
                  ? [spinner(h, 16), ' Holding']
                  : state.held && state.held === chosen
                    ? [icon(h, 'check', 'bold', 16), ' Seat held']
                    : ['Hold seat']),
              ],
            ),
          ],
        ),
      ]),
    ])
  },
}

/* 4. Alerts: checkbox groups with a parent, a switch and an async save */

type Option = Readonly<{ value: string; label: string }>

const tripAlerts: ReadonlyArray<Option> = [
  { value: 'gate', label: 'Gate changes' },
  { value: 'delay', label: 'Delays over 30 min' },
  { value: 'boarding', label: 'Boarding calls' },
  { value: 'belt', label: 'Baggage belt' },
]

const priceAlerts: ReadonlyArray<Option> = [
  { value: 'routes', label: 'Watched routes' },
  { value: 'stays', label: 'Hotels on your list' },
]

type AlertsState = Readonly<{
  trip: ReadonlyArray<string>
  price: ReadonlyArray<string>
  quiet: boolean
  saved: boolean
  saving: boolean
}>

const alertsInitial: AlertsState = {
  trip: ['gate', 'delay', 'boarding'],
  price: [],
  quiet: true,
  saved: false,
  saving: false,
}
let alertsLatest: AlertsState = alertsInitial

const alerts: Tile<AlertsState> = {
  id: 'forms-alerts',
  title: 'Choose your alerts.',
  blurb: 'One parent box checks its whole group.',
  size: 'tall',
  initial: alertsInitial,
  render: ({ state, set, h }: TileContext<AlertsState>) => {
    alertsLatest = state
    const group = Checkbox.Group.withMessage(h)
    const checkbox = Checkbox.Root.withMessage(h)
    const indicator = Checkbox.Indicator.withMessage(h)
    const switchRoot = Switch.Root.withMessage(h)
    const switchThumb = Switch.Thumb.withMessage(h)
    const button = Button.Root.withMessage(h)

    const alertGroup = (
      title: string,
      items: ReadonlyArray<Option>,
      value: ReadonlyArray<string>,
      onChange: (next: ReadonlyArray<string>) => Message,
    ) =>
      group(
        [
          group.Value(value),
          group.AllValues(items.map(item => item.value)),
          group.OnValuechange(detail => onChange(detail.value)),
          h.Class('fm-al-group'),
          h.Attribute('aria-label', title),
        ],
        [
          h.label([h.Class('fm-al-parent')], [
            checkbox([checkbox.Parent(true), h.Class('fm-box')], [
              indicator([h.Class('fm-box-mark'), hideComponentIcon(h)], [
                value.length > 0 && value.length < items.length
                  ? icon(h, 'minus', 'bold', 14)
                  : icon(h, 'check', 'bold', 14),
              ]),
            ]),
            h.span([h.Class('fm-al-title')], [title]),
            h.span([h.Class('fm-al-count')], [
              `${value.length} of ${items.length}`,
            ]),
          ]),
          h.div([h.Class('fm-al-children')], [
            ...items.map(item =>
              h.label([h.Class('fm-al-row')], [
                checkbox([checkbox.Value(item.value), h.Class('fm-box')], [
                  indicator([h.Class('fm-box-mark'), hideComponentIcon(h)], [
                    icon(h, 'check', 'bold', 14),
                  ]),
                ]),
                item.label,
              ]),
            ),
          ]),
        ],
      )

    return h.div([h.Class('fm-alerts')], [
      h.div([h.Class('fm-alerts-head')], [
        h.p([h.Class('fm-alerts-title')], ['Notifications']),
        h.p([h.Class('fm-alerts-sub')], ['Sent to your phone and inbox']),
      ]),
      alertGroup('Trip updates', tripAlerts, state.trip, next =>
        set(current => ({ ...current, trip: next })),
      ),
      alertGroup('Price drops', priceAlerts, state.price, next =>
        set(current => ({ ...current, price: next })),
      ),
      h.label([h.Class('fm-quiet')], [
        h.span([h.Class('fm-quiet-text')], [
          h.span([], ['Quiet hours']),
          h.span([h.Class('fm-quiet-detail')], ['Hold alerts 10 pm – 7 am']),
        ]),
        switchRoot(
          [
            switchRoot.Checked(state.quiet),
            switchRoot.OnCheckedchange(detail =>
              set(current => ({
                ...current,
                quiet: detail.value,
                saved: false,
              })),
            ),
            h.Class('fm-sq-switch'),
          ],
          [
            switchThumb([h.Class('fm-sq-thumb')], [
              icon(h, 'moon', 'fill', 14),
            ]),
          ],
        ),
      ]),
      button(
        [
          h.OnMount(
            listen('FormsAlertsSave', (element, emit) => {
              element.addEventListener('action', event => {
                const action = event as CustomEvent<{
                  waitUntil: (promise: Promise<unknown>) => void
                }>
                const work = (async () => {
                  emit(set({ ...alertsLatest, saving: true }))
                  await wait(900)
                  emit(set({ ...alertsLatest, saving: false, saved: true }))
                })()
                action.detail.waitUntil(work)
              })
            }),
          ),
        ],
        [
          h.button(
            [
              h.Class('b-btn fm-alerts-save'),
              h.DataAttribute('variant', 'primary'),
            ],
            [
              ...(state.saving
                ? [spinner(h, 14), ' Saving']
                : state.saved
                  ? [icon(h, 'check', 'bold', 14), ' Preferences saved']
                  : ['Save preferences']),
            ],
          ),
        ],
      ),
    ])
  },
}

/* 5. Cabin: card radios */

const cabins = [
  { value: 'economy', label: 'Economy', price: '$412', iconName: 'seat' },
  { value: 'premium', label: 'Premium', price: '$689', iconName: 'armchair' },
  { value: 'business', label: 'Business', price: '$1,940', iconName: 'bed' },
]

const cabin: Tile = {
  id: 'forms-cabin',
  title: 'Choose your cabin.',
  blurb: 'Whole cards select, arrows included.',
  initial: {},
  render: ({ h }) => {
    const group = Radio.Group.withMessage(h)
    const radio = Radio.Root.withMessage(h)
    const indicator = Radio.Indicator.withMessage(h)
    return group(
      [
        group.DefaultValue('premium'),
        h.Class('fm-cabins'),
        h.Attribute('aria-label', 'Cabin'),
      ],
      cabins.map(({ value, label, price, iconName }) =>
        h.label([h.Class('fm-cabin')], [
          h.span([h.Class('fm-cabin-top')], [
            icon(h, iconName, 'fill', 16),
            radio([radio.Value(value), h.Class('fm-dot')], [
              indicator([h.Class('fm-dot-in')], []),
            ]),
          ]),
          h.span([h.Class('fm-cabin-name')], [label]),
          h.span([h.Class('fm-cabin-price')], [price]),
        ]),
      ),
    )
  },
}

/* 6. Verify: OTP with auto-check on complete and an async resend */

type VerifyState = Readonly<{
  status: 'idle' | 'checking' | 'ok'
  resending: boolean
}>

const verifyInitial: VerifyState = { status: 'idle', resending: false }
let verifyLatest: VerifyState = verifyInitial

const verify: Tile<VerifyState> = {
  id: 'forms-verify',
  title: 'Prove it’s you.',
  blurb: 'Paste or type; it checks itself.',
  tone: 'sky',
  initial: verifyInitial,
  render: ({ state, set, h }: TileContext<VerifyState>) => {
    verifyLatest = state
    const otp = OTPInput.Root.withMessage(h)
    const otpGroup = OTPInput.Group.withMessage(h)
    const otpSlot = OTPInput.Slot.withMessage(h)
    const otpSeparator = OTPInput.Separator.withMessage(h)
    const button = Button.Root.withMessage(h)
    return h.div([h.Class('fm-otp')], [
      h.p([h.Class('fm-otp-lead')], ['Code sent to +1 415 ••• 0192']),
      otp(
        [
          otp.MaxLength(6),
          h.Class('fm-otp-root'),
          h.Attribute('aria-label', 'Verification code'),
          h.OnMount(
            listen('FormsVerifyOtp', (element, emit) => {
              element.addEventListener('valuechange', () => {
                if (verifyLatest.status !== 'idle') {
                  emit(set({ ...verifyLatest, status: 'idle' }))
                }
              })
              element.addEventListener('valuecommit', () => {
                emit(set({ ...verifyLatest, status: 'checking' }))
                setTimeout(() => {
                  if (verifyLatest.status === 'checking') {
                    emit(set({ ...verifyLatest, status: 'ok' }))
                  }
                }, 900)
              })
            }),
          ),
        ],
        [
          otpGroup([h.Class('fm-otp-group')], [
            ...[0, 1, 2].map(index =>
              otpSlot([otpSlot.Index(index), h.Class('fm-slot')], []),
            ),
          ]),
          otpSeparator(
            [h.Class('fm-otp-sep'), hideComponentIcon(h)],
            [],
          ),
          otpGroup([h.Class('fm-otp-group')], [
            ...[3, 4, 5].map(index =>
              otpSlot([otpSlot.Index(index), h.Class('fm-slot')], []),
            ),
          ]),
        ],
      ),
      h.div([h.Class('fm-otp-foot')], [
        h.p(
          [
            h.Class('fm-otp-status'),
            h.Attribute('role', 'status'),
            h.DataAttribute('state', state.status),
          ],
          [
            ...(state.status === 'checking'
              ? [spinner(h, 14), ' Checking']
              : state.status === 'ok'
                ? [icon(h, 'check-circle', 'fill', 14), ' Verified']
                : ['Didn’t get it?']),
          ],
        ),
        button(
          [
            h.OnMount(
              listen('FormsVerifyResend', (element, emit) => {
                element.addEventListener('action', event => {
                  const action = event as CustomEvent<{
                    waitUntil: (promise: Promise<unknown>) => void
                  }>
                  const work = (async () => {
                    emit(set({ ...verifyLatest, resending: true }))
                    await wait(900)
                    emit(set({ ...verifyLatest, resending: false }))
                  })()
                  action.detail.waitUntil(work)
                })
              }),
            ),
          ],
          [
            h.button(
              [
                h.Class('b-btn fm-otp-resend'),
                h.DataAttribute('variant', 'ghost'),
              ],
              [
                ...(state.resending
                  ? [spinner(h, 14), ' Sending']
                  : ['Resend code']),
              ],
            ),
          ],
        ),
      ]),
    ])
  },
}

/* 7. New password */

const passwordRules = [
  { label: '8+ characters', test: (value: string) => value.length >= 8 },
  { label: 'A number', test: (value: string) => /\d/.test(value) },
  { label: 'A symbol', test: (value: string) => /[^\w\s]/.test(value) },
]
const strengthWords = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']

type NewPasswordState = Readonly<{ password: string; visible: boolean }>

const newPasswordInitial: NewPasswordState = {
  password: 'lagos2026',
  visible: false,
}

const newPassword: Tile<NewPasswordState> = {
  id: 'forms-new-password',
  title: 'Make it strong.',
  blurb: 'Rules tick off as you type.',
  tone: 'paper',
  initial: newPasswordInitial,
  render: ({ state, set, h }: TileContext<NewPasswordState>) => {
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const password = PasswordInput.Root.withMessage(h)
    const toggle = PasswordInput.Toggle.withMessage(h)
    const passed = passwordRules.filter(rule => rule.test(state.password)).length
    const score = state.password
      ? Math.min(4, passed + (state.password.length >= 12 ? 1 : 0))
      : 0
    return field([field.Name('new-password'), h.Class('fm-pw')], [
      h.div([h.Class('fm-field-head')], [
        fieldLabel([h.Class('b-label')], ['New password']),
        h.span([h.Class('fm-pw-word'), h.DataAttribute('score', String(score))], [
          strengthWords[score],
        ]),
      ]),
      password(
        [
          password.Value(state.password),
          password.Visible(state.visible),
          password.OnValuechange(detail =>
            set(current => ({ ...current, password: detail.value })),
          ),
          password.OnVisiblechange(detail =>
            set(current => ({ ...current, visible: detail.value })),
          ),
          h.Class('fm-pw-box'),
        ],
        [
          h.input(
            [
              h.Class('fm-bare-input fm-pw-input'),
              h.Autocomplete('new-password'),
            ],
          ),
          toggle([], [
            h.button(
              [
                h.Type('button'),
                h.Class('fm-pw-eye'),
                h.Attribute('aria-label', 'Show password'),
                hideComponentIcon(h),
              ],
              [
                state.visible
                  ? icon(h, 'eye-slash', 'bold', 16)
                  : icon(h, 'eye', 'bold', 16),
              ],
            ),
          ]),
        ],
      ),
      h.div(
        [
          h.Class('fm-pw-meter'),
          h.DataAttribute('score', String(score)),
          h.Attribute('aria-hidden', 'true'),
        ],
        [h.i([], []), h.i([], []), h.i([], []), h.i([], [])],
      ),
      h.ul([h.Class('fm-pw-rules'), h.Attribute('aria-label', 'Password rules')], [
        ...passwordRules.map(rule => {
          const met = rule.test(state.password)
          return h.li(
            [
              ...(met ? [h.DataAttribute('met', '')] : []),
            ],
            [
              met
                ? icon(h, 'check', 'bold', 16)
                : h.span([h.Class('fm-pw-dot'), h.Attribute('aria-hidden', 'true')], []),
              h.span([h.Class('fm-sr')], [met ? 'Done: ' : 'To do: ']),
              rule.label,
            ],
          )
        }),
      ]),
    ])
  },
}

/* 8. Nights: a big stepper */

const checkIn = new Date(2026, 7, 14)
const shortDate = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

type NightsState = Readonly<{ nights: number | null }>

const nights: Tile<NightsState> = {
  id: 'forms-nights',
  title: 'Stay a little longer.',
  blurb: 'A stepper that clamps to your stay.',
  tone: 'butter',
  initial: { nights: 3 },
  render: ({ state, set, h }: TileContext<NightsState>) => {
    const numberInput = NumberInput.Root.withMessage(h)
    const group = NumberInput.Group.withMessage(h)
    const control = NumberInput.Control.withMessage(h)
    const decrement = NumberInput.Decrement.withMessage(h)
    const increment = NumberInput.Increment.withMessage(h)
    const checkOut = new Date(checkIn)
    checkOut.setDate(checkIn.getDate() + (state.nights ?? 0))
    return h.div([h.Class('fm-nights')], [
      numberInput(
        [
          numberInput.Value(state.nights),
          numberInput.Min(1),
          numberInput.Max(21),
          numberInput.OnValuechange(detail =>
            set(current => ({ ...current, nights: detail.value })),
          ),
          h.Class('fm-nights-root'),
        ],
        [
          group([h.Class('fm-nights-group')], [
            decrement([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('fm-round'),
                  h.Attribute('aria-label', 'One night fewer'),
                  hideComponentIcon(h),
                ],
                [icon(h, 'minus', 'bold', 16)],
              ),
            ]),
            h.span([h.Class('fm-nights-num')], [
              control([], [
                h.input(
                  [
                    h.Class('fm-nights-input'),
                    h.Attribute('aria-label', 'Nights'),
                  ],
                ),
              ]),
              h.span([h.Class('fm-nights-unit')], [
                state.nights === 1 ? 'night' : 'nights',
              ]),
            ]),
            increment([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('fm-round'),
                  h.Attribute('aria-label', 'One more night'),
                  hideComponentIcon(h),
                ],
                [icon(h, 'plus', 'bold', 16)],
              ),
            ]),
          ]),
        ],
      ),
      h.p([h.Class('fm-nights-dates')], [
        `${shortDate(checkIn)} → ${state.nights ? shortDate(checkOut) : '…'}`,
      ]),
    ])
  },
}

/* 9. Fare range: a two-thumb slider over a histogram */

const fareBuckets = [
  3, 6, 11, 18, 26, 31, 28, 34, 30, 24, 21, 17, 19, 14, 11, 9, 8, 6, 7, 5, 4, 3,
  4, 2, 2, 1, 1, 1,
]
const fareMin = 100
const fareStep = 50

type FareState = Readonly<{ range: ReadonlyArray<number> }>

const fareRange: Tile<FareState> = {
  id: 'forms-fare-range',
  title: 'Set a price window.',
  blurb: 'Two thumbs frame the fares you want.',
  tone: 'ink',
  initial: { range: [300, 850] },
  render: ({ state, set, h }: TileContext<FareState>) => {
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const fieldDescription = Field.Description.withMessage(h)
    const slider = Slider.Root.withMessage(h)
    const sliderValue = Slider.Value.withMessage(h)
    const control = Slider.Control.withMessage(h)
    const track = Slider.Track.withMessage(h)
    const fill = Slider.Indicator.withMessage(h)
    const thumb = Slider.Thumb.withMessage(h)
    const inRange = (index: number) => {
      const price = fareMin + index * fareStep
      return price >= state.range[0] && price < state.range[1]
    }
    const shown = fareBuckets.reduce(
      (sum, count, index) => sum + (inRange(index) ? count : 0),
      0,
    )
    const total = fareBuckets.reduce((sum, count) => sum + count, 0)
    const peak = Math.max(...fareBuckets)
    return field([h.Class('fm-fare')], [
      slider(
        [
          slider.Value(state.range),
          slider.Min(fareMin),
          slider.Max(fareMin + fareBuckets.length * fareStep),
          slider.Step(fareStep),
          slider.MinStepsBetweenThumbs(2),
          slider.Format({
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
          }),
          slider.Locale('en-US'),
          slider.OnValuechange(detail =>
            set(current => ({ ...current, range: detail.value.map(Number) })),
          ),
          h.Class('fm-fare-slider'),
        ],
        [
          h.div([h.Class('fm-field-head')], [
            fieldLabel([h.Class('b-label')], ['Fare per person']),
            sliderValue([h.Class('fm-fare-value')], []),
          ]),
          h.div([h.Class('fm-hist'), h.Attribute('aria-hidden', 'true')], [
            ...fareBuckets.map((count, index) =>
              h.i(
                [
                  h.Style({ height: `${(count / peak) * 100}%` }),
                  ...(inRange(index) ? [h.DataAttribute('in', '')] : []),
                ],
              ),
            ),
          ]),
          control([h.Class('fm-fare-control')], [
            track([h.Class('fm-fare-track')], [
              fill([h.Class('fm-fare-fill')], []),
              thumb(
                [
                  thumb.Index(0),
                  h.Class('fm-fare-thumb'),
                  h.Attribute('aria-label', 'Lowest fare'),
                ],
              ),
              thumb(
                [
                  thumb.Index(1),
                  h.Class('fm-fare-thumb'),
                  h.Attribute('aria-label', 'Highest fare'),
                ],
              ),
            ]),
          ]),
        ],
      ),
      fieldDescription([h.Class('fm-fare-count')], [
        `${shown} of ${total} flights in range`,
      ]),
    ])
  },
}

/* 10. Requests: a growing textarea with a counter and quick adds */

const requestChips = ['Late check-in', 'Quiet room', 'Extra pillows']

type RequestsState = Readonly<{ note: string }>

const requests: Tile<RequestsState> = {
  id: 'forms-requests',
  title: 'Note for the hotel.',
  blurb: 'Grows with your text and counts it.',
  initial: { note: 'Arriving on the 23:40 train from Milan.' },
  render: ({ state, set, h }: TileContext<RequestsState>) => {
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const fieldDescription = Field.Description.withMessage(h)
    const textarea = Textarea.Root.withMessage(h)
    return field([field.Name('requests'), h.Class('fm-req')], [
      h.div([h.Class('fm-field-head')], [
        fieldLabel([h.Class('b-label')], ['Special requests']),
        fieldDescription(
          [
            h.Class('fm-req-count'),
            ...(state.note.length >= 180 ? [h.DataAttribute('full', '')] : []),
          ],
          [`${state.note.length}/200`],
        ),
      ]),
      textarea(
        [
          textarea.Value(state.note),
          textarea.AutoResize(true),
          textarea.OnValuechange(detail =>
            set(current => ({ ...current, note: detail.value })),
          ),
        ],
        [
          h.textarea([
            h.Class('b-input fm-req-area'),
            h.Maxlength(200),
            h.Placeholder('Anything that helps the hotel prepare'),
          ]),
        ],
      ),
      h.div([h.Class('fm-req-chips')], [
        ...requestChips.map(chip => {
          const added = state.note.includes(chip)
          return h.button(
            [
              h.Type('button'),
              h.Class('fm-chip'),
              ...(added ? [h.Disabled(true)] : []),
              h.OnClick(
                set(current => ({
                  ...current,
                  note: `${current.note.trim()} ${chip}.`
                    .trim()
                    .slice(0, 200),
                })),
              ),
            ],
            [
              added
                ? icon(h, 'check', 'bold', 14)
                : icon(h, 'plus', 'bold', 14),
              chip,
            ],
          )
        }),
      ]),
    ])
  },
}

/* 11. Passport upload */

type PassportState = Readonly<{
  file: Readonly<{ name: string; size: number }> | null
}>

const passport: Tile<PassportState> = {
  id: 'forms-passport',
  title: 'Add your passport.',
  blurb: 'Drop a scan or browse for one.',
  initial: { file: null },
  render: ({ state, set, h }: TileContext<PassportState>) => {
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const fieldDescription = Field.Description.withMessage(h)
    const fileInput = FileInput.Root.withMessage(h)
    const list = FileInput.List.withMessage(h)
    const dropzone = FileInput.Dropzone.withMessage(h)
    const trigger = FileInput.Trigger.withMessage(h)
    return field([h.Class('fm-doc')], [
      fieldLabel([h.Class('b-label')], ['Passport photo page']),
      fileInput(
        [
          fileInput.Name('passport'),
          fileInput.Accept(['image/*', '.pdf']),
          fileInput.MaxSize(10_000_000),
          fileInput.OnValuechange(detail => {
            const first = detail.value[0]
            if (
              first !== null &&
              typeof first === 'object' &&
              'name' in first &&
              'size' in first
            ) {
              const file = first as File
              return set({ file: { name: file.name, size: file.size } })
            }
            return set({ file: null })
          }),
          h.Class('fm-doc-root'),
        ],
        [
          // The list stays mounted so the element can fill it when a file
          // arrives; the component hides an empty list itself.
          list(
            [
              h.Class('fm-doc-list'),
              h.Attribute('aria-label', 'Passport scan'),
            ],
            [
              h.template(
                [
                  h.InnerHTML(
                    `<ui-file-input-item class="fm-doc-file">` +
                      `<span class="fm-doc-icon"><i class="ph-fill ph-file-pdf" style="font-size:16px" aria-hidden="true"></i></span>` +
                      `<span class="fm-doc-name"><span data-file="name" style="display:block;font-size:14px;font-weight:500;color:inherit"></span><span><span data-file="size" style="display:inline"></span> · ready to send</span></span>` +
                      `<ui-file-input-item-remove><button type="button" class="fm-icon-btn" style="--ui-icon-size:0px"><i class="ph-bold ph-x" style="font-size:16px" aria-hidden="true"></i></button></ui-file-input-item-remove>` +
                      `</ui-file-input-item>`,
                  ),
                ],
                [],
              ),
            ],
          ),
          ...(state.file
            ? []
            : [
                dropzone([h.Class('fm-doc-drop')], [
                  h.span([h.Class('fm-doc-glyph')], [
                    icon(h, 'identification-card', 'fill', 16),
                  ]),
                  h.span([h.Class('fm-doc-hint')], ['Drop a scan here']),
                  trigger([], [
                    h.button(
                      [h.Type('button'), h.Class('b-btn fm-doc-browse')],
                      ['Browse'],
                    ),
                  ]),
                ]),
              ]),
        ],
      ),
      fieldDescription([h.Class('fm-doc-desc')], [
        'JPG, PNG or PDF, up to 10 MB.',
      ]),
    ])
  },
}

/* 12. Amenities: a multiple select */

const amenities = [
  { value: 'breakfast', label: 'Breakfast included', iconName: 'coffee', share: 0.58 },
  { value: 'pool', label: 'Pool', iconName: 'swimming-pool', share: 0.34 },
  { value: 'gym', label: 'Gym', iconName: 'barbell', share: 0.61 },
  { value: 'pets', label: 'Pets welcome', iconName: 'paw-print', share: 0.27 },
  { value: 'shuttle', label: 'Airport shuttle', iconName: 'van', share: 0.22 },
]

type AmenitiesState = Readonly<{ value: ReadonlyArray<string> }>

const amenitiesInitial: AmenitiesState = { value: ['breakfast', 'pool'] }

const amenitiesTile: Tile<AmenitiesState> = {
  id: 'forms-amenities',
  title: 'Must-haves only.',
  blurb: 'Pick several; the trigger sums them up.',
  tone: 'sage',
  initial: amenitiesInitial,
  render: ({ state, set, h }: TileContext<AmenitiesState>) => {
    const select = Select.Root.withMessage(h)
    const selectLabel = Select.Label.withMessage(h)
    const selectTrigger = Select.Trigger.withMessage(h)
    const selectValue = Select.Value.withMessage(h)
    const selectContent = Select.Content.withMessage(h)
    const selectItem = Select.Item.withMessage(h)
    const selectItemIcon = Select.ItemIcon.withMessage(h)
    const selectItemIndicator = Select.ItemIndicator.withMessage(h)
    const count = Math.round(
      amenities.reduce(
        (total, item) =>
          state.value.includes(item.value) ? total * item.share : total,
        640,
      ),
    )
    const labels = amenities
      .filter(item => state.value.includes(item.value))
      .map(item => item.label)
    const valueText =
      labels.length === 0
        ? 'Any amenities'
        : labels.length > 2
          ? `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
          : labels.join(', ')
    return h.div([h.Class('fm-am')], [
      select(
        [
          select.Multiple(true),
          select.Items(
            amenities.map(({ value, label }) => ({ value, label })),
          ),
          select.Value(state.value),
          select.OnValuechange(detail => {
            const next = detail.value
            return set({
              value: Array.isArray(next)
                ? next.map(item => String(item))
                : [],
            })
          }),
          select.Placeholder('Any amenities'),
        ],
        [
          selectLabel([h.Class('b-label')], ['Hotel amenities']),
          selectTrigger([], [
            h.button([h.Type('button'), h.Class('fm-am-trigger')], [
              selectValue([h.Class('fm-trigger-value')], [valueText]),
              icon(h, 'caret-down', 'bold', 16),
            ]),
          ]),
          selectContent(
            [h.Class('b-pop fm-pop'), selectContent.SideOffset(6)],
            amenities.map(item =>
              selectItem(
                [
                  selectItem.Value(item.value),
                  selectItem.Label(item.label),
                  h.Class('b-item fm-option'),
                ],
                [
                  selectItemIcon([h.Class('fm-option-icon')], [
                    icon(h, item.iconName, 'fill', 16),
                  ]),
                  item.label,
                  selectItemIndicator(
                    [h.Class('fm-option-check'), hideComponentIcon(h)],
                    [icon(h, 'check', 'bold', 16)],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
      h.p([h.Class('fm-am-count')], [
        h.strong([], [String(count)]),
        ' stays in Kyoto match',
      ]),
    ])
  },
}

/* 13. Save a hotel: a lone toggle */

type SaveHotelState = Readonly<{ saved: boolean }>

const saveHotel: Tile<SaveHotelState> = {
  id: 'forms-save-hotel',
  title: 'Save it for later.',
  blurb: 'A pressed state that stays put.',
  tone: 'paper',
  initial: { saved: false },
  render: ({ state, set, h }: TileContext<SaveHotelState>) => {
    const toggle = Toggle.Root.withMessage(h)
    return h.article([h.Class('fm-hotel')], [
      h.div([h.Class('fm-hotel-top')], [
        h.div([], [
          h.p([h.Class('fm-hotel-name')], ['Casa Albergaria Dona Sofia']),
          h.p([h.Class('fm-hotel-place')], [
            'Porto, Ribeira · ',
            icon(h, 'star', 'fill', 16),
            ' 4.8',
          ]),
        ]),
        toggle(
          [
            toggle.Pressed(state.saved),
            toggle.OnPressedchange(detail =>
              set(current => ({ ...current, saved: detail.value })),
            ),
          ],
          [
            h.button(
              [
                h.Type('button'),
                h.Class('fm-heart'),
                h.Attribute('aria-label', 'Save hotel'),
              ],
              [icon(h, 'heart', state.saved ? 'fill' : 'bold', 16)],
            ),
          ],
        ),
      ]),
      h.div([h.Class('fm-hotel-foot')], [
        h.p([h.Class('fm-hotel-price')], [
          '€186',
          h.span([], [' / night']),
        ]),
        h.p([h.Class('fm-hotel-status'), h.Attribute('role', 'status')], [
          state.saved ? 'Saved to Summer in Portugal' : '',
        ]),
      ]),
    ])
  },
}

/* 14. Name on ticket: a native form with submit and reset */

type TicketState = Readonly<{ status: string }>

const ticketName: Tile<TicketState> = {
  id: 'forms-ticket-name',
  title: 'Match your passport.',
  blurb: 'Reset brings back the saved name.',
  initial: { status: '' },
  render: ({ state, set, h }: TileContext<TicketState>) => {
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const fieldError = Field.Error.withMessage(h)
    const fieldDescription = Field.Description.withMessage(h)
    const input = Input.Root.withMessage(h)
    return h.form(
      [
        h.Class('fm-stub'),
        h.OnSubmit(set(current => ({ ...current, status: 'Saved' }))),
        h.OnReset(set(current => ({ ...current, status: '' }))),
      ],
      [
        field([field.Name('ticket-name'), h.Class('fm-field')], [
          h.div([h.Class('fm-field-head')], [
            fieldLabel([h.Class('b-label')], ['Name on ticket']),
            fieldError([fieldError.Match('valueMissing'), h.Class('fm-error')], [
              'Required',
            ]),
            fieldError([fieldError.Match('patternMismatch'), h.Class('fm-error')], [
              'Letters only',
            ]),
          ]),
          input(
            [
              input.DefaultValue('AMARA J NWOSU'),
              input.OnValuechange(() =>
                set(current => ({ ...current, status: '' })),
              ),
            ],
            [
              h.input(
                [
                  h.Class('b-input fm-stub-input'),
                  h.Pattern('[A-Za-z ]+'),
                  h.Autocomplete('name'),
                  h.Spellcheck(false),
                  h.Required(true),
                ],
              ),
            ],
          ),
          fieldDescription([h.Class('fm-stub-desc')], [
            'Exactly as printed in your passport.',
          ]),
        ]),
        h.div([h.Class('fm-stub-actions')], [
          h.span([h.Class('fm-stub-status'), h.Attribute('role', 'status')], [
            ...(state.status
              ? [icon(h, 'check', 'bold', 14), state.status]
              : []),
          ]),
          h.button(
            [
              h.Type('reset'),
              h.Class('b-btn'),
              h.DataAttribute('variant', 'ghost'),
            ],
            ['Reset'],
          ),
          h.button(
            [
              h.Type('submit'),
              h.Class('b-btn'),
              h.DataAttribute('variant', 'primary'),
            ],
            ['Save'],
          ),
        ]),
      ],
    )
  },
}

/* 15. Promo code: Field validation from an async check */

type PromoState = Readonly<{
  code: string
  error: string | null
  applied: boolean
  pending: boolean
}>

const promoInitial: PromoState = {
  code: 'SPRING10',
  error: null,
  applied: false,
  pending: false,
}
let promoLatest: PromoState = promoInitial

const promo: Tile<PromoState> = {
  id: 'forms-promo',
  title: 'Apply a promo code.',
  blurb: 'Bad codes explain themselves inline.',
  tone: 'blueprint',
  initial: promoInitial,
  render: ({ state, set, h }: TileContext<PromoState>) => {
    promoLatest = state
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const fieldError = Field.Error.withMessage(h)
    const input = Input.Root.withMessage(h)
    const inputGroup = Input.Group.withMessage(h)
    const clear = Input.Clear.withMessage(h)
    const button = Button.Root.withMessage(h)
    return h.form(
      [h.Class('fm-promo'), h.OnSubmit(Message.SinkDone())],
      [
        field(
          [
            field.Name('promo'),
            ...(state.error ? [field.Invalid(true)] : []),
            h.Class('fm-field'),
          ],
          [
            h.div([h.Class('fm-field-head')], [
              fieldLabel([h.Class('b-label')], ['Promo code']),
              fieldError(
                [fieldError.Match('valueMissing'), h.Class('fm-error')],
                ['Enter a code'],
              ),
              ...(state.error
                ? [
                    fieldError(
                      [fieldError.Match(true), h.Class('fm-error')],
                      [state.error],
                    ),
                  ]
                : []),
            ]),
            h.div([h.Class('fm-promo-row')], [
              inputGroup([h.Class('b-input fm-input-group fm-promo-group')], [
                icon(h, 'ticket', 'fill', 16),
                input(
                  [
                    input.Value(state.code),
                    input.OnValuechange(detail => {
                      const value = detail.value.toUpperCase()
                      return set(current => ({
                        ...current,
                        code: value,
                        error: null,
                        applied: false,
                      }))
                    }),
                  ],
                  [
                    h.input(
                      [
                        h.Class('fm-bare-input fm-mono'),
                        h.Autocomplete('off'),
                        h.Spellcheck(false),
                        h.Placeholder('CODE'),
                        h.Required(true),
                      ],
                    ),
                  ],
                ),
                clear([], [
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('fm-icon-btn'),
                      h.Attribute('aria-label', 'Clear code'),
                    ],
                    [icon(h, 'x', 'bold', 16)],
                  ),
                ]),
              ]),
              button(
                [
                  button.PendingAnnouncement('Checking code'),
                  h.OnMount(
                    listen('FormsPromoApply', (element, emit) => {
                      element.addEventListener('action', event => {
                        const form = element.closest('form')
                        if (form && !form.checkValidity()) {
                          return
                        }
                        const action = event as CustomEvent<{
                          waitUntil: (promise: Promise<unknown>) => void
                        }>
                        const work = (async () => {
                          emit(set({ ...promoLatest, pending: true }))
                          await wait(900)
                          if (promoLatest.code === 'WANDER15') {
                            emit(
                              set({
                                ...promoLatest,
                                pending: false,
                                applied: true,
                                error: null,
                              }),
                            )
                          } else {
                            emit(
                              set({
                                ...promoLatest,
                                pending: false,
                                error:
                                  promoLatest.code === 'SPRING10'
                                    ? 'Expired Apr 30'
                                    : 'Not a valid code',
                              }),
                            )
                          }
                        })()
                        action.detail.waitUntil(work)
                      })
                    }),
                  ),
                ],
                [
                  h.button(
                    [
                      h.Type('submit'),
                      h.Class('b-btn fm-promo-btn'),
                      h.DataAttribute('variant', 'primary'),
                    ],
                    [state.pending ? spinner(h, 16) : 'Apply'],
                  ),
                ],
              ),
            ]),
          ],
        ),
        h.p(
          [
            h.Class('fm-promo-result'),
            ...(state.applied ? [h.DataAttribute('applied', '')] : []),
          ],
          [
            ...(state.applied
              ? [
                  icon(h, 'check-circle', 'fill', 16),
                  ' 15% off · −$63.30',
                ]
              : [
                  'Try ',
                  h.span([h.Class('fm-mono')], ['WANDER15']),
                ]),
          ],
        ),
      ],
    )
  },
}

/* 16. Automatic check-in: a big switch in a Field */

type AutoCheckInState = Readonly<{ on: boolean }>

const autoCheckIn: Tile<AutoCheckInState> = {
  id: 'forms-auto-check-in',
  title: 'Check in on time.',
  blurb: 'Flip it by tap, label or Space.',
  tone: 'signal',
  initial: { on: true },
  render: ({ state, set, h }: TileContext<AutoCheckInState>) => {
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const fieldDescription = Field.Description.withMessage(h)
    const switchRoot = Switch.Root.withMessage(h)
    const switchThumb = Switch.Thumb.withMessage(h)
    return field([h.Class('fm-auto')], [
      h.div([h.Class('fm-auto-text')], [
        fieldLabel([h.Class('fm-auto-label')], ['Automatic check-in']),
        fieldDescription([h.Class('fm-auto-desc')], [
          state.on
            ? 'Boarding pass lands 24 h before takeoff.'
            : 'You’ll check in yourself at the desk.',
        ]),
      ]),
      switchRoot(
        [
          switchRoot.Checked(state.on),
          switchRoot.OnCheckedchange(detail =>
            set(current => ({ ...current, on: detail.value })),
          ),
          h.Class('fm-big-switch'),
        ],
        [
          switchThumb([h.Class('fm-big-thumb')], [
            state.on
              ? icon(h, 'check', 'bold', 16)
              : icon(h, 'x', 'bold', 16),
          ]),
        ],
      ),
    ])
  },
}

/* 17. Room type: a single select in a Field */

const rooms = [
  { value: 'king', label: 'Deluxe king', note: 'City view', price: 289 },
  { value: 'twin', label: 'Twin garden', note: 'Ground floor', price: 264 },
  { value: 'suite', label: 'Junior suite', note: 'Soaking tub', price: 412 },
  {
    value: 'loft',
    label: 'Family loft',
    note: 'Sold out',
    price: 455,
    disabled: true,
  },
]

type RoomState = Readonly<{ room: string | null }>

const roomType: Tile<RoomState> = {
  id: 'forms-room-type',
  title: 'Choose a room.',
  blurb: 'Prices ride along in the list.',
  tone: 'paper',
  initial: { room: 'king' },
  render: ({ state, set, h }: TileContext<RoomState>) => {
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const select = Select.Root.withMessage(h)
    const selectTrigger = Select.Trigger.withMessage(h)
    const selectValue = Select.Value.withMessage(h)
    const selectContent = Select.Content.withMessage(h)
    const selectItem = Select.Item.withMessage(h)
    const chosen = rooms.find(item => item.value === state.room)
    return h.div([h.Class('fm-room')], [
      field([field.Name('room'), h.Class('fm-field')], [
        fieldLabel([h.Class('b-label')], ['Room type']),
        select(
          [
            select.Items(rooms),
            select.Value(state.room),
            select.OnValuechange(detail => {
              const next = detail.value
              return set(current => ({
                ...current,
                room: typeof next === 'string' ? next : null,
              }))
            }),
          ],
          [
            selectTrigger([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('b-input fm-trigger fm-room-trigger'),
                ],
                [
                  selectValue([h.Class('fm-trigger-value')], []),
                  h.span([h.Class('fm-room-price')], [
                    chosen ? `$${chosen.price}` : '',
                  ]),
                  icon(h, 'caret-down', 'bold', 16),
                ],
              ),
            ]),
            selectContent(
              [h.Class('b-pop fm-pop fm-room-pop'), selectContent.SideOffset(6)],
              rooms.map(item =>
                selectItem(
                  [
                    selectItem.Value(item.value),
                    selectItem.Label(item.label),
                    selectItem.Disabled(item.disabled === true),
                    h.Class('b-item fm-room-item'),
                  ],
                  [
                    h.span([h.Class('fm-room-text')], [
                      item.label,
                      h.span([], [item.note]),
                    ]),
                    h.span([h.Class('fm-room-item-price')], [`$${item.price}`]),
                  ],
                ),
              ),
            ),
          ],
        ),
      ]),
      h.p([h.Class('fm-room-total')], [
        h.span([], ['2 nights']),
        h.strong([], [chosen ? `$${chosen.price * 2}` : '—']),
      ]),
    ])
  },
}

/* 18. Bags: a compact stepper and a checkbox that price as they change */

type BagsState = Readonly<{ bags: number | null; priority: boolean }>

const bags: Tile<BagsState> = {
  id: 'forms-bags',
  title: 'Add checked bags.',
  blurb: 'Extras price themselves as you count.',
  initial: { bags: 1, priority: false },
  render: ({ state, set, h }: TileContext<BagsState>) => {
    const numberInput = NumberInput.Root.withMessage(h)
    const group = NumberInput.Group.withMessage(h)
    const control = NumberInput.Control.withMessage(h)
    const decrement = NumberInput.Decrement.withMessage(h)
    const increment = NumberInput.Increment.withMessage(h)
    const checkbox = Checkbox.Root.withMessage(h)
    const indicator = Checkbox.Indicator.withMessage(h)
    const total = (state.bags ?? 0) * 35 + (state.priority ? 18 : 0)
    return h.div([h.Class('fm-bags')], [
      h.div([h.Class('fm-bags-row')], [
        h.span([h.Class('fm-bags-icon')], [
          icon(h, 'suitcase-rolling', 'fill', 16),
        ]),
        h.span([h.Class('fm-bags-text')], [
          'Checked bags',
          h.span([], ['23 kg each · $35']),
        ]),
        numberInput(
          [
            numberInput.Value(state.bags),
            numberInput.Min(0),
            numberInput.Max(3),
            numberInput.OnValuechange(detail =>
              set(current => ({ ...current, bags: detail.value })),
            ),
            h.Class('fm-mini'),
          ],
          [
            group([h.Class('fm-mini-group')], [
              decrement([], [
                h.button(
                  [
                    h.Type('button'),
                    h.Class('fm-mini-btn'),
                    h.Attribute('aria-label', 'Remove a bag'),
                    hideComponentIcon(h),
                  ],
                  [icon(h, 'minus', 'bold', 16)],
                ),
              ]),
              control([], [
                h.input(
                  [
                    h.Class('fm-mini-input'),
                    h.Attribute('aria-label', 'Checked bags'),
                  ],
                ),
              ]),
              increment([], [
                h.button(
                  [
                    h.Type('button'),
                    h.Class('fm-mini-btn'),
                    h.Attribute('aria-label', 'Add a bag'),
                    hideComponentIcon(h),
                  ],
                  [icon(h, 'plus', 'bold', 16)],
                ),
              ]),
            ]),
          ],
        ),
      ]),
      h.label([h.Class('fm-bags-row fm-bags-check')], [
        checkbox(
          [
            checkbox.Checked(state.priority),
            checkbox.OnCheckedchange(detail =>
              set(current => ({
                ...current,
                priority: detail.value === true,
              })),
            ),
            h.Class('fm-box'),
          ],
          [
            indicator([h.Class('fm-box-mark'), hideComponentIcon(h)], [
              icon(h, 'check', 'bold', 16),
            ]),
          ],
        ),
        h.span([h.Class('fm-bags-text')], ['Priority boarding']),
        h.span([h.Class('fm-bags-add')], ['+$18']),
      ]),
      h.p([h.Class('fm-bags-total')], [
        h.span([], ['Extras']),
        h.strong([], [`$${total}`]),
      ]),
    ])
  },
}

/* 19. Payment method: a required radio group in a Field */

const methods = [
  {
    value: 'card',
    label: 'Card ending 4417',
    detail: 'Exp 08/28',
    iconName: 'credit-card',
  },
  {
    value: 'credit',
    label: 'Travel credit',
    detail: '$120 left',
    iconName: 'coins',
  },
  {
    value: 'bank',
    label: 'Bank transfer',
    detail: '2–3 days',
    iconName: 'bank',
  },
]

type PaymentState = Readonly<{ done: boolean; pending: boolean }>

const paymentInitial: PaymentState = { done: false, pending: false }
let paymentLatest: PaymentState = paymentInitial

const paymentMethod: Tile<PaymentState> = {
  id: 'forms-payment-method',
  title: 'Pick how to pay.',
  blurb: 'Skipping a required choice gets flagged.',
  tone: 'paper',
  initial: paymentInitial,
  render: ({ state, set, h }: TileContext<PaymentState>) => {
    paymentLatest = state
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const fieldError = Field.Error.withMessage(h)
    const radioGroup = Radio.Group.withMessage(h)
    const radio = Radio.Root.withMessage(h)
    const indicator = Radio.Indicator.withMessage(h)
    const button = Button.Root.withMessage(h)
    return h.form(
      [h.Class('fm-pm'), h.OnSubmit(Message.SinkDone())],
      [
        field([field.Name('method'), h.Class('fm-field')], [
          fieldLabel([h.Class('b-label')], ['Pay with']),
          radioGroup(
            [
              radioGroup.Required(true),
              radioGroup.OnValuechange(() =>
                set(current => ({ ...current, done: false })),
              ),
              h.Class('fm-pm-list'),
            ],
            [
              ...methods.map(method =>
                h.label([h.Class('fm-pm-row')], [
                  icon(h, method.iconName, 'fill', 14),
                  h.span([h.Class('fm-pm-label')], [method.label]),
                  h.span([h.Class('fm-pm-detail')], [method.detail]),
                  radio([radio.Value(method.value), h.Class('fm-dot')], [
                    indicator([h.Class('fm-dot-in')], []),
                  ]),
                ]),
              ),
            ],
          ),
          h.div([h.Class('fm-pm-foot')], [
            fieldError(
              [fieldError.Match('valueMissing'), h.Class('fm-error')],
              ['Choose how to pay'],
            ),
            button(
              [
                h.OnMount(
                  listen('FormsPaymentContinue', (element, emit) => {
                    element.addEventListener('action', event => {
                      const form = element.closest('form')
                      if (form && !form.checkValidity()) {
                        return
                      }
                      const action = event as CustomEvent<{
                        waitUntil: (promise: Promise<unknown>) => void
                      }>
                      const work = (async () => {
                        emit(set({ ...paymentLatest, pending: true }))
                        await wait(900)
                        emit(
                          set({
                            ...paymentLatest,
                            pending: false,
                            done: true,
                          }),
                        )
                      })()
                      action.detail.waitUntil(work)
                    })
                  }),
                ),
              ],
              [
                h.button(
                  [
                    h.Type('submit'),
                    h.Class('b-btn fm-pm-btn'),
                    h.DataAttribute('variant', 'primary'),
                  ],
                  [
                    ...(state.pending
                      ? [spinner(h, 14)]
                      : state.done
                        ? [icon(h, 'check', 'bold', 14), ' Confirmed']
                        : ['Continue']),
                  ],
                ),
              ],
            ),
          ]),
        ]),
      ],
    )
  },
}

/* 20. Preferred airlines: a multiple combobox with chips */

const airlines = [
  { value: 'aer-lingus', label: 'Aer Lingus' },
  { value: 'air-nz', label: 'Air New Zealand' },
  { value: 'alaska', label: 'Alaska Airlines' },
  { value: 'emirates', label: 'Emirates' },
  { value: 'finnair', label: 'Finnair' },
  { value: 'klm', label: 'KLM' },
  { value: 'qantas', label: 'Qantas' },
  { value: 'singapore', label: 'Singapore Airlines' },
  { value: 'turkish', label: 'Turkish Airlines' },
]

const airlineLabel = (value: unknown) => {
  const key = typeof value === 'string' ? value : String(value)
  return airlines.find(item => item.value === key)?.label ?? key
}

type AirlinesState = Readonly<{ value: ReadonlyArray<string> }>

const airlinesTile: Tile<AirlinesState> = {
  id: 'forms-airlines',
  title: 'Fly who you like.',
  blurb: 'Type to add airlines as chips.',
  initial: { value: ['finnair', 'qantas'] },
  render: ({ state, set, h }: TileContext<AirlinesState>) => {
    const combobox = Combobox.Root.withMessage(h)
    const comboboxLabel = Combobox.Label.withMessage(h)
    const comboboxChips = Combobox.Chips.withMessage(h)
    const comboboxInput = Combobox.Input.withMessage(h)
    const comboboxContent = Combobox.Content.withMessage(h)
    const comboboxEmpty = Combobox.Empty.withMessage(h)
    const comboboxList = Combobox.List.withMessage(h)
    const comboboxItem = Combobox.Item.withMessage(h)
    const comboboxItemText = Combobox.ItemText.withMessage(h)
    const comboboxItemIndicator = Combobox.ItemIndicator.withMessage(h)
    return h.div([h.Class('fm-air')], [
      combobox(
        [
          combobox.Multiple(true),
          combobox.Value(state.value),
          combobox.OnValuechange(detail => {
            const next = detail.value
            return set({
              value: Array.isArray(next)
                ? next.map(item => String(item))
                : [],
            })
          }),
          combobox.ItemToLabel(airlineLabel),
          combobox.MaxSelected(4),
        ],
        [
          h.div([h.Class('fm-field-head')], [
            comboboxLabel([h.Class('b-label')], ['Preferred airlines']),
            h.span([h.Class('fm-air-count')], [
              `${state.value.length} of 4`,
            ]),
          ]),
          comboboxChips([h.Class('b-input fm-chips')], [
            comboboxInput([], [
              h.input(
                [
                  h.Class('fm-chips-input'),
                  h.Placeholder(
                    state.value.length >= 4 ? '' : 'Add an airline',
                  ),
                ],
              ),
            ]),
          ]),
          comboboxContent(
            [h.Class('b-pop fm-pop'), comboboxContent.SideOffset(6)],
            [
              comboboxEmpty([h.Class('fm-empty')], [
                'No airline by that name.',
              ]),
              comboboxList([h.Class('fm-list')], [
                ...airlines.map(airline =>
                  comboboxItem(
                    [
                      comboboxItem.Value(airline.value),
                      comboboxItem.Label(airline.label),
                      h.Class('b-item fm-option'),
                    ],
                    [
                      comboboxItemText([h.Class('fm-match')], []),
                      comboboxItemIndicator(
                        [h.Class('fm-option-check'), hideComponentIcon(h)],
                        [icon(h, 'check', 'bold', 14)],
                      ),
                    ],
                  ),
                ),
              ]),
            ],
          ),
          // The element renders one chip per value and fills its label in.
          // The reference rendered the chips itself; the template keeps the
          // same classes and remove button.
          h.template(
            [
              h.InnerHTML(
                `<ui-combobox-chip class="fm-air-chip">` +
                  `<ui-combobox-chip-remove><button type="button" class="fm-air-remove" aria-label="Remove airline"><i class="ph-bold ph-x" style="font-size:14px" aria-hidden="true"></i></button></ui-combobox-chip-remove>` +
                  `</ui-combobox-chip>`,
              ),
            ],
          ),
        ],
      ),
      h.p([h.Class('fm-air-note')], ['Their fares show first in results.']),
    ])
  },
}

export const tiles: ReadonlyArray<Tile> = [
  checkout,
  cabin,
  verify,
  flightSearch,
  alerts,
  newPassword,
  nights,
  fareRange,
  seatMap,
  requests,
  passport,
  amenitiesTile,
  saveHotel,
  ticketName,
  promo,
  autoCheckIn,
  roomType,
  bags,
  paymentMethod,
  airlinesTile,
]
