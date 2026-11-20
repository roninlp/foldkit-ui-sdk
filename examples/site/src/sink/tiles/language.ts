import { Option, Stream } from 'effect'
import * as Dom from 'foldkit/dom'
import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

import {
  announce,
  animateIn,
  ariaKeyshortcuts,
  cellsToText,
  formatShortcut,
  matchesShortcut,
  nearestInDirection,
  textToCells,
  toLocale,
  userLocale,
} from '@ui-sdk/core'
import {
  addDays,
  datePattern,
  daysBetween,
  firstDayOfWeek,
  formatDate,
  formatDateRange,
  monthGrid,
  monthNames,
  parseDate,
  weekdayNames,
} from '@ui-sdk/core/date'
import { formatNumber, numberFormatter } from '@ui-sdk/core/number'
import { fuzzyScore, matchRanges, matchSegments } from '@ui-sdk/core/text-match'
import { Calendar, DatePicker, Rating } from 'foldkit-ui-sdk'

import type { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './language.css'

/* Shared bits */

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

const Kbd = (h: HtmlBuilder<Message>, text: string) =>
  h.kbd([h.Class('lg-kbd')], [text])

const clockIn = (zone: string, now: number | null, locale?: string) => {
  if (now === null) {
    return { time: '--:--', offset: '' }
  }
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'shortOffset',
  }).formatToParts(now)
  const time = parts
    .filter(part => part.type !== 'timeZoneName')
    .map(part => part.value)
    .join('')
    .trim()
  return {
    time,
    offset: parts.find(part => part.type === 'timeZoneName')?.value ?? '',
  }
}

/** A focus move that also carries a state write, as the runtime's
 * `OnKeyDownFocus` wants it. */
const focusMove = (focusSelector: string, message: Message) =>
  Option.some({ focusSelector, message })

/* 1. Fuzzy city search */

const CITIES = [
  { name: 'Santiago', country: 'Chile', zone: 'America/Santiago' },
  { name: 'San Juan', country: 'Puerto Rico', zone: 'America/Puerto_Rico' },
  { name: 'Santorini', country: 'Greece', zone: 'Europe/Athens' },
  { name: 'Busan', country: 'South Korea', zone: 'Asia/Seoul' },
  { name: 'Santa Marta', country: 'Colombia', zone: 'America/Bogota' },
  { name: 'Saint Petersburg', country: 'Russia', zone: 'Europe/Moscow' },
  { name: 'Kyoto', country: 'Japan', zone: 'Asia/Tokyo' },
  { name: 'Reykjavík', country: 'Iceland', zone: 'Atlantic/Reykjavik' },
  { name: 'São Paulo', country: 'Brazil', zone: 'America/Sao_Paulo' },
  { name: 'Kraków', country: 'Poland', zone: 'Europe/Warsaw' },
  { name: 'Marrakesh', country: 'Morocco', zone: 'Africa/Casablanca' },
  { name: 'Tbilisi', country: 'Georgia', zone: 'Asia/Tbilisi' },
  { name: 'Vancouver', country: 'Canada', zone: 'America/Vancouver' },
  { name: 'Cape Town', country: 'South Africa', zone: 'Africa/Johannesburg' },
  { name: 'Kathmandu', country: 'Nepal', zone: 'Asia/Kathmandu' },
  { name: 'Hanoi', country: 'Vietnam', zone: 'Asia/Ho_Chi_Minh' },
  { name: 'Auckland', country: 'New Zealand', zone: 'Pacific/Auckland' },
  { name: 'Istanbul', country: 'Türkiye', zone: 'Europe/Istanbul' },
  { name: 'Oaxaca', country: 'Mexico', zone: 'America/Mexico_City' },
  { name: 'Tallinn', country: 'Estonia', zone: 'Europe/Tallinn' },
  { name: 'Zanzibar', country: 'Tanzania', zone: 'Africa/Dar_es_Salaam' },
  { name: 'Muscat', country: 'Oman', zone: 'Asia/Muscat' },
  { name: 'Honolulu', country: 'Hawaii', zone: 'Pacific/Honolulu' },
  { name: 'Montevideo', country: 'Uruguay', zone: 'America/Montevideo' },
]

const HQ = {
  name: 'Vercel HQ',
  country: 'San Francisco ▲',
  zone: 'America/Los_Angeles',
}

const citiesFor = (query: string) => {
  const typed = query.trim().toLowerCase()
  return typed.length >= 3 && 'vercel'.startsWith(typed)
    ? [HQ, ...CITIES]
    : CITIES
}

type MatchMode = 'fuzzy' | 'startsWith' | 'contains'
const MODES: ReadonlyArray<{ value: MatchMode; label: string }> = [
  { value: 'fuzzy', label: 'Fuzzy' },
  { value: 'startsWith', label: 'Starts with' },
  { value: 'contains', label: 'Contains' },
]

type CityState = {
  query: string
  mode: MatchMode
  active: number
  picked: string
}

const cityBase = 'sink-language-city'

const citySearch = {
  initial: { query: 'san', mode: 'fuzzy', active: 0, picked: 'Kyoto' } as CityState,
  render: ({ state, set, h }: TileContext<CityState>) => {
    // PORT NOTE: the reference ticks every second through a store subscription.
    // Here the clocks are read from the clock at render time, so they refresh
    // on the next interaction rather than on a timer.
    const now = Math.floor(Date.now() / 60_000) * 60_000
    const locale = userLocale()

    const results = citiesFor(state.query)
      .map(city => ({
        city,
        score: fuzzyScore(city.name, state.query),
        ranges: matchRanges(city.name, state.query, state.mode),
      }))
      .filter(({ score, ranges }) =>
        !state.query ? true : state.mode === 'fuzzy' ? score > 0 : ranges.length > 0,
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 7)

    const pickedCity = [HQ, ...CITIES].find(city => city.name === state.picked)
    const pickedClock = pickedCity ? clockIn(pickedCity.zone, now, locale) : null

    return h.div([h.Class('lg-find')], [
      h.div([h.Class('lg-find-top')], [
        h.div(
          [
            h.Class('lg-find-modes'),
            h.Role('group'),
            h.AriaLabel('Match mode'),
          ],
          MODES.map(option =>
            h.button(
              [
                h.Type('button'),
                h.Class('lg-find-mode'),
                h.AriaPressed(state.mode === option.value ? 'true' : 'false'),
                h.OnClick(
                  set(current => ({
                    ...current,
                    mode: option.value,
                    active: 0,
                  })),
                ),
              ],
              [option.label],
            ),
          ),
        ),
        pickedClock
          ? h.p([h.Class('lg-find-picked'), h.AriaLive('polite')], [
              'Next stop ',
              h.strong([], [state.picked]),
              ' ',
              h.span([], [pickedClock.time]),
            ])
          : '',
      ]),
      h.label([h.Class('lg-find-field')], [
        icon(h, 'magnifying-glass', 'bold'),
        h.input([
          h.Class('lg-find-input'),
          h.Role('combobox'),
          h.AriaLabel('Search cities'),
          h.AriaExpanded(true),
          h.AriaControls(`${cityBase}-list`),
          h.AriaAutocomplete('list'),
          ...(results[state.active]
            ? [h.AriaActiveDescendant(`${cityBase}-${state.active}`)]
            : []),
          h.Value(state.query),
          h.Spellcheck(false),
          h.OnInput(value =>
            set(current => ({ ...current, query: value, active: 0 })),
          ),
          h.OnKeyDownPreventDefault(key => {
            if (key === 'ArrowDown' || key === 'ArrowUp') {
              const by = key === 'ArrowDown' ? 1 : -1
              return Option.some(
                set(current => ({
                  ...current,
                  active: Math.max(
                    0,
                    Math.min(results.length - 1, current.active + by),
                  ),
                })),
              )
            }
            if (key === 'Enter' && results[state.active]) {
              const name = results[state.active].city.name
              return Option.some(
                set(current => ({ ...current, picked: name })),
              )
            }
            return Option.none()
          }),
        ]),
        h.span([h.Class('lg-find-count')], [
          `${results.length} of ${CITIES.length}`,
        ]),
      ]),
      h.ul(
        [h.Class('lg-find-list'), h.Role('listbox'), h.Id(`${cityBase}-list`), h.AriaLabel('Cities')],
        [
          ...results.map(({ city, score, ranges }, index) => {
            const clock = clockIn(city.zone, now, locale)
            return h.li(
              [
                h.Id(`${cityBase}-${index}`),
                h.Role('option'),
                h.AriaSelected(index === state.active),
                h.Class('lg-find-row'),
                ...(index === state.active ? [h.DataAttribute('highlighted', '')] : []),
                h.OnPointerMove(() =>
                  state.active === index
                    ? Option.none()
                    : Option.some(
                        set(current => ({ ...current, active: index })),
                      ),
                ),
                h.OnClick(set(current => ({ ...current, picked: city.name }))),
              ],
              [
                h.span([h.Class('lg-find-name')], [
                  ...matchSegments(city.name, ranges).map(segment =>
                    segment.match
                      ? h.mark([], [segment.text])
                      : h.span([], [segment.text]),
                  ),
                  h.span([h.Class('lg-find-country')], [city.country]),
                ]),
                h.span(
                  [
                    h.Class('lg-find-score'),
                    h.Attribute('aria-hidden', 'true'),
                    h.Style({ '--score': String(score) }),
                  ],
                  [],
                ),
                h.span([h.Class('lg-find-time')], [
                  clock.time,
                  h.small([], [clock.offset]),
                ]),
              ],
            )
          }),
          results.length === 0
            ? h.li([h.Class('lg-find-empty')], [`No city matches “${state.query}”.`])
            : '',
        ],
      ),
    ])
  },
}

/* 2. Typeahead: a currency list */

const CURRENCIES: ReadonlyArray<readonly [string, string]> = [
  ['Argentine peso', 'ARS'],
  ['Bulgarian lev', 'BGN'],
  ['Danish krone', 'DKK'],
  ['Hungarian forint', 'HUF'],
  ['Indian rupee', 'INR'],
  ['Japanese yen', 'JPY'],
  ['Korean won', 'KRW'],
  ['Norwegian krone', 'NOK'],
  ['Polish złoty', 'PLN'],
  ['Singapore dollar', 'SGD'],
  ['Swedish krona', 'SEK'],
  ['Swiss franc', 'CHF'],
  ['Thai baht', 'THB'],
  ['Turkish lira', 'TRY'],
]

type TypeaheadState = {
  focused: string | null
  chosen: string | null
  buffer: string
  bufferAt: number
}

const typeaheadBase = 'sink-language-typeahead'

const fold = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

const typeahead = {
  initial: {
    focused: null,
    chosen: null,
    buffer: '',
    bufferAt: 0,
  } as TypeaheadState,
  render: ({ state, set, h }: TileContext<TypeaheadState>) => {
    const codes = CURRENCIES.map(([, code]) => code)
    const indexOf = (code: string | null) =>
      code === null ? -1 : codes.indexOf(code)
    const at = (index: number) =>
      CURRENCIES[Math.max(0, Math.min(CURRENCIES.length - 1, index))]
    const currentIndex = () =>
      state.focused === null ? 0 : indexOf(state.focused)
    const tabIndex = (code: string) =>
      state.focused === null
        ? code === CURRENCIES[0][1]
          ? 0
          : -1
        : state.focused === code
          ? 0
          : -1

    return h.div([h.Class('lg-ta')], [
      h.div(
        [h.Class('lg-ta-list'), h.Role('listbox'), h.AriaLabel('Currencies')],
        CURRENCIES.map(([name, code]) => {
          const move = (by: number) => {
            const next = at(currentIndex() + by)
            return focusMove(
              `#${typeaheadBase}-item-${next[1]}`,
              set(current => ({ ...current, focused: next[1] })),
            )
          }
          return h.button(
            [
              h.Id(`${typeaheadBase}-item-${code}`),
              h.Type('button'),
              h.Role('option'),
              h.AriaSelected(state.chosen === code),
              h.Tabindex(tabIndex(code)),
              h.Class('lg-ta-item'),
              h.OnClick(set(current => ({ ...current, chosen: code }))),
              h.OnKeyDownFocus((key, modifiers) => {
                if (modifiers.ctrlKey || modifiers.metaKey || modifiers.altKey) {
                  return Option.none()
                }
                if (key === 'ArrowDown' || key === 'ArrowRight') return move(1)
                if (key === 'ArrowUp' || key === 'ArrowLeft') return move(-1)
                if (key === 'Home') {
                  const target = CURRENCIES[0][1]
                  return focusMove(
                    `#${typeaheadBase}-item-${target}`,
                    set(current => ({ ...current, focused: target })),
                  )
                }
                if (key === 'End') {
                  const target = CURRENCIES[CURRENCIES.length - 1][1]
                  return focusMove(
                    `#${typeaheadBase}-item-${target}`,
                    set(current => ({ ...current, focused: target })),
                  )
                }
                // PORT NOTE: `createTypeahead` is replaced with a local buffer.
                // A repeated letter within 500ms cycles the matches instead of
                // doubling the letter, which is the behaviour the primitive has.
                if (key.length !== 1) return Option.none()
                // Space keeps its native button press, which chooses the
                // focused currency.
                if (key === ' ') return Option.none()
                const now = Date.now()
                const typed = fold(key)
                const stale = now - state.bufferAt > 500
                const repeat =
                  !stale &&
                  state.buffer.length > 0 &&
                  state.buffer.endsWith(typed)
                const buffer = repeat
                  ? state.buffer
                  : stale
                    ? typed
                    : state.buffer + typed
                const matches = CURRENCIES.filter(([label]) =>
                  fold(label).startsWith(buffer),
                )
                if (matches.length === 0) {
                  const self = state.focused ?? CURRENCIES[0][1]
                  return focusMove(
                    `#${typeaheadBase}-item-${self}`,
                    set(current => ({
                      ...current,
                      buffer,
                      bufferAt: now,
                    })),
                  )
                }
                const start = repeat ? currentIndex() + 1 : 0
                const target = matches[start % matches.length] ?? matches[0]
                return focusMove(
                  `#${typeaheadBase}-item-${target[1]}`,
                  set(current => ({
                    ...current,
                    focused: target[1],
                    buffer,
                    bufferAt: now,
                  })),
                )
              }),
            ],
            [
              h.span([], [name]),
              h.span([h.Class('lg-ta-code'), h.Attribute('aria-hidden', 'true')], [
                code,
              ]),
            ],
          )
        }),
      ),
      h.p([h.Class('lg-hint')], [
        'Focus the list, type ',
        Kbd(h, 'S'),
        Kbd(h, 'W'),
        Kbd(h, 'I'),
      ]),
    ])
  },
}

/* 3. Roving focus: a number format picker */

const FORMATS = [
  {
    value: 'en-US',
    label: 'US',
    name: 'United States',
    currency: 'USD',
    rule: 'Commas, then a point',
  },
  {
    value: 'de-DE',
    label: 'DE',
    name: 'Germany',
    currency: 'EUR',
    rule: 'Points, then a comma',
  },
  {
    value: 'fr-FR',
    label: 'FR',
    name: 'France',
    currency: 'EUR',
    rule: 'Thin spaces, then a comma',
  },
  {
    value: 'en-IN',
    label: 'IN',
    name: 'India',
    currency: 'INR',
    rule: 'Lakh and crore grouping',
  },
  {
    value: 'de-CH',
    label: 'CH',
    name: 'Switzerland',
    currency: 'CHF',
    rule: 'Apostrophes, then a point',
  },
]

type FormatState = { format: string; focused: string | null }

const formats = {
  initial: { format: 'en-US', focused: null } as FormatState,
  render: ({ state, set, h }: TileContext<FormatState>) => {
    const current =
      FORMATS.find(item => item.value === state.format) ?? FORMATS[0]
    const amount = formatNumber(1234567.89, current.value, {
      style: 'currency',
      currency: current.currency,
    })
    const move = (by: number) => {
      const index = state.focused
        ? FORMATS.findIndex(item => item.value === state.focused)
        : FORMATS.findIndex(item => item.value === state.format)
      const next = (index + by + FORMATS.length) % FORMATS.length
      return FORMATS[next]
    }
    const choose = (item: (typeof FORMATS)[number]) =>
      focusMove(
        `#sink-language-format-${item.value}`,
        set(current => ({ ...current, format: item.value, focused: item.value })),
      )
    return h.div([h.Class('lg-nf')], [
      h.p([h.Class('lg-nf-amount')], [amount]),
      h.p([h.Class('lg-nf-rule')], [current.rule]),
      h.div(
        [
          h.Class('lg-nf-group'),
          h.Role('radiogroup'),
          h.AriaLabel('Number format'),
        ],
        FORMATS.map(item => {
          const selected = state.format === item.value
          const tabIndex =
            state.focused === null
              ? selected
                ? 0
                : -1
              : state.focused === item.value
                ? 0
                : -1
          return h.button(
            [
              h.Id(`sink-language-format-${item.value}`),
              h.Type('button'),
              h.Role('radio'),
              h.AriaChecked(selected),
              ...(selected ? [h.DataAttribute('checked', '')] : []),
              h.Tabindex(tabIndex),
              h.AriaLabel(item.name),
              h.Class('lg-nf-option'),
              h.OnClick(
                set(current => ({
                  ...current,
                  format: item.value,
                  focused: item.value,
                })),
              ),
              h.OnKeyDownFocus(key => {
                if (key === 'ArrowRight' || key === 'ArrowDown') {
                  return choose(move(1))
                }
                if (key === 'ArrowLeft' || key === 'ArrowUp') {
                  return choose(move(-1))
                }
                if (key === 'Home') return choose(FORMATS[0])
                if (key === 'End') return choose(FORMATS[FORMATS.length - 1])
                return Option.none()
              }),
            ],
            [item.label],
          )
        }),
      ),
    ])
  },
}

/* 4. Grid focus: a seat map */

const SEAT_ROWS = 12
const FIRST_ROW = 10
const SEAT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']
const TAKEN = new Set([
  '0:0',
  '0:1',
  '1:4',
  '1:5',
  '2:2',
  '3:0',
  '3:5',
  '4:3',
  '4:4',
  '5:1',
  '5:2',
  '6:4',
  '7:0',
  '7:3',
  '8:5',
  '9:2',
  '9:3',
  '10:1',
  '10:5',
  '11:0',
  '11:4',
])

type GridCell = { row: number; col: number }

const seatName = (row: number, col: number) =>
  `${row + FIRST_ROW}${SEAT_LETTERS[col]}`
const seatKind = (col: number) =>
  col === 0 || col === 5
    ? 'Window'
    : col === 2 || col === 3
      ? 'Aisle'
      : 'Middle'
const seatId = (row: number, col: number) =>
  `sink-language-seat-${row}-${col}`

const activeSeat = (state: SeatsState): GridCell => state.active ?? { row: 4, col: 2 }

const stepSeat = (from: GridCell, dr: number, dc: number): GridCell => {
  let row = from.row + dr
  let col = from.col + dc
  while (
    row >= 0 &&
    row < SEAT_ROWS &&
    col >= 0 &&
    col < SEAT_LETTERS.length
  ) {
    if (!TAKEN.has(`${row}:${col}`)) return { row, col }
    row += dr
    col += dc
  }
  return from
}

const edgeSeat = (from: GridCell, end: boolean): GridCell => {
  const columns = end ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5]
  const col = columns.find(candidate => !TAKEN.has(`${from.row}:${candidate}`))
  return col === undefined ? from : { row: from.row, col }
}

type SeatsState = { active: GridCell | null; seat: GridCell | null }

const seats = {
  initial: {
    active: { row: 4, col: 2 },
    seat: { row: 4, col: 2 },
  } as SeatsState,
  render: ({ state, set, h }: TileContext<SeatsState>) => {
    const choose = (cell: GridCell) =>
      set(current => ({ ...current, active: cell, seat: cell }))
    return h.div([h.Class('lg-seats')], [
      h.div([h.Class('lg-seats-head')], [
        h.p([h.Class('lg-seats-flight')], ['AY 131']),
        h.p([h.Class('lg-seats-route')], ['Helsinki → Singapore']),
      ]),
      h.div([h.Class('lg-seats-letters'), h.Attribute('aria-hidden', 'true')], [
        h.span([], []),
        ...SEAT_LETTERS.map(letter => h.span([], [letter])),
      ]),
      h.div(
        [
          h.Class('lg-seats-cabin'),
          h.Role('grid'),
          h.AriaLabel('Cabin seats'),
          h.OnKeyDownFocus(key => {
            const from = activeSeat(state)
            const target =
              key === 'ArrowRight'
                ? stepSeat(from, 0, 1)
                : key === 'ArrowLeft'
                  ? stepSeat(from, 0, -1)
                  : key === 'ArrowDown'
                    ? stepSeat(from, 1, 0)
                    : key === 'ArrowUp'
                      ? stepSeat(from, -1, 0)
                      : key === 'Home'
                        ? edgeSeat(from, false)
                        : key === 'End'
                          ? edgeSeat(from, true)
                          : null
            if (target === null) return Option.none()
            return focusMove(
              `#${seatId(target.row, target.col)}`,
              set(current => ({ ...current, active: target })),
            )
          }),
        ],
        Array.from({ length: SEAT_ROWS }, (_, row) =>
          h.div([h.Role('row'), h.Class('lg-seats-row')], [
            h.span([h.Class('lg-seats-num'), h.Attribute('aria-hidden', 'true')], [
              `${row + FIRST_ROW}`,
            ]),
            ...SEAT_LETTERS.map((letter, col) => {
              const taken = TAKEN.has(`${row}:${col}`)
              const mine =
                state.seat?.row === row && state.seat?.col === col
              const active =
                state.active?.row === row && state.active?.col === col
              return h.button(
                [
                  h.Id(seatId(row, col)),
                  h.Type('button'),
                  h.Role('gridcell'),
                  h.Tabindex(active ? 0 : -1),
                  h.AriaSelected(mine),
                  ...(taken ? [h.AriaDisabled(true)] : []),
                  h.AriaLabel(
                    `Seat ${seatName(row, col)}, ${seatKind(col)}${taken ? ', taken' : ''}`,
                  ),
                  h.Class('lg-seat'),
                  ...(taken ? [h.DataAttribute('taken', '')] : []),
                  ...(mine ? [h.DataAttribute('mine', '')] : []),
                  ...(active ? [h.DataAttribute('active', '')] : []),
                  ...(taken ? [] : [h.OnClick(choose({ row, col }))]),
                ],
                [],
              )
            }),
          ]),
        ),
      ),
      h.div([h.Class('lg-seats-foot')], [
        h.p([h.Class('lg-seats-pick')], [
          ...(state.seat
            ? [
                h.strong([], [seatName(state.seat.row, state.seat.col)]),
                ' ',
                seatKind(state.seat.col),
              ]
            : ['Choose a seat']),
        ]),
        h.p([h.Class('lg-hint')], [
          Kbd(h, '←'),
          Kbd(h, '→'),
          Kbd(h, '↑'),
          Kbd(h, '↓'),
          ' then ',
          Kbd(h, 'Enter'),
        ]),
      ]),
    ])
  },
}

/* 5. Cell range: a trip budget sheet */

const SHEET_COLS = ['A', 'B', 'C', 'D']
const SHEET_START = [
  ['Stop', 'Nights', 'Hotel €', 'Meals €'],
  ['Porto', '3', '276', '144'],
  ['Bologna', '2', '236', '122'],
  ['Ljubljana', '2', '172', '78'],
  ['Split', '4', '416', '220'],
]

type CellRange = { anchor: GridCell; end: GridCell }

type SheetState = {
  active: GridCell | null
  range: CellRange | null
  cells: string[][]
  note: string
}

const sheetBounds = (state: SheetState) => {
  const { range, active } = state
  if (range) {
    return {
      top: Math.min(range.anchor.row, range.end.row),
      bottom: Math.max(range.anchor.row, range.end.row),
      left: Math.min(range.anchor.col, range.end.col),
      right: Math.max(range.anchor.col, range.end.col),
    }
  }
  return active
    ? { top: active.row, bottom: active.row, left: active.col, right: active.col }
    : null
}

const sheetBase = 'sink-language-sheet'

const sheet = {
  initial: {
    active: null,
    range: { anchor: { row: 1, col: 2 }, end: { row: 3, col: 3 } },
    cells: SHEET_START.map(row => [...row]),
    note: '',
  } as SheetState,
  render: ({ state, set, h }: TileContext<SheetState>) => {
    const bounds = sheetBounds(state)
    const selectedText = bounds
      ? cellsToText(
          state.cells
            .slice(bounds.top, bounds.bottom + 1)
            .map(row => row.slice(bounds.left, bounds.right + 1)),
        )
      : ''
    const copiedRows = bounds ? bounds.bottom - bounds.top + 1 : 0
    const label = bounds
      ? (() => {
          const from = `${SHEET_COLS[bounds.left]}${bounds.top + 1}`
          const to = `${SHEET_COLS[bounds.right]}${bounds.bottom + 1}`
          return from === to ? from : `${from}:${to}`
        })()
      : '–'
    let sum = 0
    let count = 0
    if (bounds) {
      for (let r = bounds.top; r <= bounds.bottom; r++) {
        for (let c = bounds.left; c <= bounds.right; c++) {
          const value = Number(state.cells[r][c])
          if (r > 0 && state.cells[r][c] !== '' && Number.isFinite(value)) {
            sum += value
            count++
          }
        }
      }
    }

    const pasteInto = (text: string) => {
      const rowsIn = textToCells(text)
      const cellBounds = sheetBounds(state)
      if (!rowsIn.length || !cellBounds) return Option.none()
      const cells = state.cells.map(row => [...row])
      let bottom = cellBounds.top
      let right = cellBounds.left
      rowsIn.forEach((row, i) =>
        row.forEach((value, j) => {
          const r = cellBounds.top + i
          const c = cellBounds.left + j
          if (r >= cells.length || c >= SHEET_COLS.length) return
          cells[r][c] = value
          bottom = Math.max(bottom, r)
          right = Math.max(right, c)
        }),
      )
      return Option.some(
        set(current => ({
          ...current,
          cells,
          note: 'Pasted into the sheet',
          range: {
            anchor: { row: cellBounds.top, col: cellBounds.left },
            end: { row: bottom, col: right },
          },
        })),
      )
    }

    // PORT NOTE: `createCellRange` also handles Command+A and Page keys; the
    // arrows, Shift+arrows, Home/End and Escape it needs for this demo are
    // reimplemented on the cells' own focus positions.
    const navigate = (key: string, shiftKey: boolean, row: number, col: number) => {
      if (key === 'Escape') {
        return focusMove(
          `#${sheetBase}-cell-${row}-${col}`,
          set(current => ({ ...current, range: null })),
        )
      }
      const dr =
        key === 'ArrowDown' ? 1 : key === 'ArrowUp' ? -1 : 0
      const dc =
        key === 'ArrowRight' ? 1 : key === 'ArrowLeft' ? -1 : 0
      if (dr === 0 && dc === 0) return Option.none()
      const next = {
        row: Math.max(0, Math.min(state.cells.length - 1, row + dr)),
        col: Math.max(0, Math.min(SHEET_COLS.length - 1, col + dc)),
      }
      return focusMove(
        `#${sheetBase}-cell-${next.row}-${next.col}`,
        set(current =>
          shiftKey
            ? {
                ...current,
                active: next,
                range: {
                  anchor: current.range?.anchor ?? { row, col },
                  end: next,
                },
              }
            : { ...current, active: next, range: null },
        ),
      )
    }

    return h.div([h.Class('lg-sheet')], [
      h.div([h.Class('lg-sheet-main')], [
        h.div(
          [h.Class('lg-sheet-letters'), h.Attribute('aria-hidden', 'true')],
          [h.span([], []), ...SHEET_COLS.map(letter => h.span([], [letter]))],
        ),
        h.div(
          [
            h.Class('lg-sheet-board'),
            h.Role('grid'),
            h.AriaLabel('Trip budget'),
            ...(selectedText ? [h.OnCopyText(selectedText)] : []),
            ...(selectedText
              ? [
                  h.OnCopy(
                    set(current => ({
                      ...current,
                      note: `Copied ${copiedRows} rows`,
                    })),
                  ),
                ]
              : []),
            h.OnPastePreventDefault(text => pasteInto(text)),
          ],
          SHEET_START.map((_, row) =>
            h.div([h.Role('row'), h.Class('lg-sheet-row')], [
              h.span(
                [h.Class('lg-sheet-num'), h.Attribute('aria-hidden', 'true')],
                [`${row + 1}`],
              ),
              ...SHEET_COLS.map((letter, col) => {
                const text = state.cells[row]?.[col] ?? ''
                const selected =
                  bounds !== null &&
                  row >= bounds.top &&
                  row <= bounds.bottom &&
                  col >= bounds.left &&
                  col <= bounds.right
                const edges =
                  selected && bounds
                    ? [
                        row === bounds.top ? 'top' : '',
                        col === bounds.right ? 'right' : '',
                        row === bounds.bottom ? 'bottom' : '',
                        col === bounds.left ? 'left' : '',
                      ].filter(Boolean)
                    : []
                const active =
                  state.active?.row === row && state.active?.col === col
                const tabIndex =
                  state.active === null
                    ? row === 0 && col === 0
                      ? 0
                      : -1
                    : active
                      ? 0
                      : -1
                return h.div(
                  [
                    h.Id(`${sheetBase}-cell-${row}-${col}`),
                    h.Role('gridcell'),
                    h.Tabindex(tabIndex),
                    ...(selected ? [h.DataAttribute('selected', '')] : []),
                    ...(edges.length
                      ? [h.DataAttribute('range-edge', edges.join(' '))]
                      : []),
                    ...(row === 0 ? [h.DataAttribute('head', '')] : []),
                    ...(row > 0 && /^-?\d/.test(text)
                      ? [h.DataAttribute('number', '')]
                      : []),
                    ...(active ? [h.DataAttribute('active', '')] : []),
                    h.Class('lg-sheet-cell'),
                    h.OnKeyDownFocus((key, modifiers) =>
                      navigate(key, modifiers.shiftKey, row, col),
                    ),
                    h.OnPointerDown(() =>
                      Option.some(
                        set(current => ({
                          ...current,
                          active: { row, col },
                          range: null,
                        })),
                      ),
                    ),
                  ],
                  [text],
                )
              }),
            ]),
          ),
        ),
        h.p([h.Class('lg-hint lg-sheet-hint')], [
          Kbd(h, 'Shift'),
          '+',
          Kbd(h, 'arrows'),
          ' select, then copy or paste',
        ]),
      ]),
      h.aside([h.Class('lg-sheet-side'), h.AriaLive('polite')], [
        h.p([h.Class('lg-sheet-ref')], [label]),
        h.dl([h.Class('lg-sheet-stats')], [
          h.div([], [h.dt([], ['Sum']), h.dd([], [formatNumber(sum, 'en-GB')])]),
          h.div([], [h.dt([], ['Count']), h.dd([], [`${count}`])]),
        ]),
        h.p([h.Class('lg-sheet-note')], [
          state.note || 'Tab-separated, like any sheet',
        ]),
        h.div([h.Class('lg-sheet-actions')], [
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn lg-sheet-btn'),
              h.OnMount({
                name: 'sink-language-sheet-copy-all',
                f: element =>
                  Dom.streamFromEvent({
                    target: element,
                    type: 'click',
                    mapEvent: () => {
                      // PORT NOTE: the mount listener outlives a render, so the
                      // cells are read back from the sheet it sits in rather
                      // than from the state captured when it mounted.
                      const root = element.closest('.lg-sheet')
                      const rows = root
                        ? [...root.querySelectorAll('.lg-sheet-row')].map(row =>
                            [...row.querySelectorAll('.lg-sheet-cell')].map(
                              cell => cell.textContent ?? '',
                            ),
                          )
                        : state.cells
                      const text = cellsToText(rows)
                      navigator.clipboard?.writeText(text).catch(() => undefined)
                      return set(current => ({
                        ...current,
                        note: `Sheet copied, ${text.length} characters`,
                      }))
                    },
                  }),
              }),
            ],
            [icon(h, 'copy', 'bold', 14), 'Copy all'],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn lg-sheet-btn'),
              h.DataAttribute('variant', 'ghost'),
              h.AriaLabel('Reset sheet'),
              h.OnClick(
                set(current => ({
                  ...current,
                  cells: SHEET_START.map(row => [...row]),
                  note: '',
                })),
              ),
            ],
            [icon(h, 'arrow-counter-clockwise', 'bold', 14)],
          ),
        ]),
      ]),
    ])
  },
}

/* 6. Calendar: a range for a stay */

type StayState = { range: [string, string] | null }

const stay = {
  initial: { range: ['2026-11-12', '2026-11-16'] } as StayState,
  render: ({ state, set, h }: TileContext<StayState>) => {
    // PORT NOTE: the reference follows a media query through a store. Here the
    // query is sampled at render time, so the second month follows the window
    // on the next interaction rather than on a resize.
    const narrow =
      typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 640px)').matches
    const calendar = Calendar.Root.withMessage(h)
    const previous = Calendar.Previous.withMessage(h)
    const next = Calendar.Next.withMessage(h)
    const heading = Calendar.Heading.withMessage(h)
    const grid = Calendar.Grid.withMessage(h)
    const weekdays = Calendar.Weekdays.withMessage(h)
    const weeks = Calendar.Weeks.withMessage(h)
    const nights = state.range ? daysBetween(state.range[0], state.range[1]) : 0

    const month = (offset: number) =>
      grid([h.Class('lg-cal-grid'), grid.Offset(offset)], [
        weekdays([], [
          h.template(
            [
              h.InnerHTML(
                '<ui-calendar-weekday class="lg-cal-weekday"></ui-calendar-weekday>',
              ),
            ],
            [],
          ),
        ]),
        weeks([], [
          h.template(
            [h.InnerHTML('<ui-calendar-day class="lg-cal-day"></ui-calendar-day>')],
            [],
          ),
        ]),
      ])

    return h.div([h.Class('lg-stay')], [
      calendar(
        [
          h.Class('lg-cal'),
          calendar.Mode('range'),
          calendar.Months(narrow ? 1 : 2),
          calendar.Locale('en-GB'),
          calendar.WeekStartsOn(0),
          calendar.WeekdayFormat('narrow'),
          calendar.FixedWeeks(false),
          calendar.DefaultMonth('2026-11'),
          // PORT NOTE: a range is an array, which the generated `Value` factory
          // types as a string even though the element's property is the array
          // the schema describes. The factory writes the property as it is.
          calendar.Value(state.range as unknown as string),
          calendar.OnValuechange(detail => {
            const value = detail.value
            return set(current => ({
              ...current,
              range:
                Array.isArray(value) && value.length === 2
                  ? [String(value[0]), String(value[1])]
                  : null,
            }))
          }),
        ],
        [
          h.div([h.Class('lg-cal-head')], [
            previous([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('lg-cal-nav'),
                  h.AriaLabel('Previous month'),
                ],
                [icon(h, 'caret-left', 'bold', 14)],
              ),
            ]),
            heading([h.Class('lg-cal-heading')], []),
            next([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('lg-cal-nav'),
                  h.AriaLabel('Next month'),
                ],
                [icon(h, 'caret-right', 'bold', 14)],
              ),
            ]),
          ]),
          h.div([h.Class('lg-cal-months')], [
            month(0),
            narrow ? '' : month(1),
          ]),
        ],
      ),
      h.div([h.Class('lg-stay-sum'), h.AriaLive('polite')], [
        h.p([h.Class('lg-stay-place')], ['Alfama, Lisbon']),
        h.p([h.Class('lg-stay-nights')], [
          `${nights}`,
          h.span([], [nights === 1 ? ' night' : ' nights']),
        ]),
        h.p([h.Class('lg-stay-dates')], [
          state.range
            ? formatDateRange(state.range[0], state.range[1], 'en-GB')
            : 'Pick check-in, then check-out',
        ]),
      ]),
    ])
  },
}

/* 7. Date Picker */

const departure = {
  initial: {},
  render: ({ h }: TileContext<Record<string, never>>) => {
    const picker = DatePicker.Root.withMessage(h)
    const input = DatePicker.Input.withMessage(h)
    const trigger = DatePicker.Trigger.withMessage(h)
    const hint = DatePicker.Hint.withMessage(h)
    const content = DatePicker.Content.withMessage(h)
    const previous = Calendar.Previous.withMessage(h)
    const next = Calendar.Next.withMessage(h)
    const heading = Calendar.Heading.withMessage(h)
    const grid = Calendar.Grid.withMessage(h)
    const weekdays = Calendar.Weekdays.withMessage(h)
    const weeks = Calendar.Weeks.withMessage(h)
    const labelId = 'sink-language-departure-label'

    return picker(
      [
        h.Class('lg-dp'),
        picker.Locale('de-CH'),
        picker.DefaultValue('2026-12-18'),
      ],
      [
        h.p([h.Class('lg-dp-label'), h.Id(labelId)], ['Train from Zürich']),
        h.div([h.Class('lg-dp-field')], [
          input([], [
            h.input([
              h.Class('lg-dp-input'),
              h.AriaLabelledBy(labelId),
              h.Spellcheck(false),
            ]),
          ]),
          trigger([], [
            h.button(
              [
                h.Type('button'),
                h.Class('lg-dp-trigger'),
                h.AriaLabel('Open calendar'),
              ],
              [icon(h, 'calendar-blank', 'bold', 16)],
            ),
          ]),
        ]),
        // PORT NOTE: the reference's hint is a render prop over the part's
        // state. The element writes its own placeholder when empty, so the
        // example is spelled out from the same date pattern instead.
        hint([h.Class('lg-dp-hint')], [
          `Type it like ${datePattern('de-CH').example}`,
        ]),
        content([h.Class('b-pop lg-dp-pop')], [
          h.div([h.Class('lg-cal-head')], [
            previous([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('lg-cal-nav'),
                  h.AriaLabel('Previous month'),
                ],
                [icon(h, 'caret-left', 'bold', 16)],
              ),
            ]),
            heading([h.Class('lg-cal-heading')], []),
            next([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('lg-cal-nav'),
                  h.AriaLabel('Next month'),
                ],
                [icon(h, 'caret-right', 'bold', 16)],
              ),
            ]),
          ]),
          grid([h.Class('lg-cal-grid')], [
            weekdays([], [
              h.template(
                [
                  h.InnerHTML(
                    '<ui-calendar-weekday class="lg-cal-weekday"></ui-calendar-weekday>',
                  ),
                ],
                [],
              ),
            ]),
            weeks([], [
              h.template(
                [
                  h.InnerHTML(
                    '<ui-calendar-day class="lg-cal-day lg-dp-day"></ui-calendar-day>',
                  ),
                ],
                [],
              ),
            ]),
          ]),
        ]),
      ],
    )
  },
}

/* 8. Typing a date */

const PARSE_LOCALES = ['en-US', 'de-DE', 'fr-FR', 'ko-KR']

type ParseState = { locale: string; text: string }

const parseDateTile = {
  initial: { locale: 'en-US', text: '03.04.2027' } as ParseState,
  render: ({ state, set, h }: TileContext<ParseState>) => {
    const iso = parseDate(state.text, state.locale, {
      referenceDate: '2026-11-02',
    })
    const pattern = datePattern(state.locale)
    const id = 'sink-language-parse'
    return h.div([h.Class('lg-parse')], [
      h.div(
        [h.Class('lg-parse-locales'), h.Role('group'), h.AriaLabel('Locale')],
        PARSE_LOCALES.map(tag =>
          h.button(
            [
              h.Type('button'),
              h.Class('lg-parse-locale'),
              h.AriaPressed(tag === state.locale ? 'true' : 'false'),
              h.OnClick(set(current => ({ ...current, locale: tag }))),
            ],
            [tag],
          ),
        ),
      ),
      h.label([h.Class('b-label'), h.For(id)], ['Return flight']),
      h.input([
        h.Id(id),
        h.Class('b-input lg-parse-input'),
        h.Value(state.text),
        h.Placeholder(pattern.placeholder),
        h.Spellcheck(false),
        h.AriaDescribedBy(`${id}-out`),
        h.OnInput(value => set(current => ({ ...current, text: value }))),
      ]),
      h.p(
        [
          h.Class('lg-parse-out'),
          h.Id(`${id}-out`),
          h.AriaLive('polite'),
          ...(iso ? [] : [h.DataAttribute('invalid', '')]),
        ],
        iso
          ? [
              h.code([], [iso]),
              h.span([], [
                formatDate(iso, state.locale, {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                }),
              ]),
            ]
          : [h.span([], [`Not a date in ${pattern.placeholder}`])],
      ),
    ])
  },
}

/* 9. Month grids in three places */

const WEEK_PLACES = [
  { city: 'New York', locale: 'en-US' },
  { city: 'Berlin', locale: 'de-DE' },
  { city: 'Cairo', locale: 'ar-EG' },
]
const WEEK_MONTH = '2026-12-01'

type WeeksState = { place: number }

const weeksTile = {
  initial: { place: 1 } as WeeksState,
  render: ({ state, set, h }: TileContext<WeeksState>) => {
    const place = WEEK_PLACES[state.place] ?? WEEK_PLACES[1]
    const locale = place.locale
    const first = firstDayOfWeek(locale)
    const weeks = monthGrid(WEEK_MONTH, {
      weekStartsOn: first,
      fixedWeeks: false,
    })
    const names = weekdayNames(locale, 'narrow', first)
    const digits = numberFormatter(locale)
    const rtl = locale.startsWith('ar')
    return h.div([h.Class('lg-weeks')], [
      h.div(
        [h.Class('lg-weeks-places'), h.Role('group'), h.AriaLabel('Place')],
        WEEK_PLACES.map((item, index) =>
          h.button(
            [
              h.Type('button'),
              h.Class('lg-weeks-place'),
              h.AriaPressed(index === state.place ? 'true' : 'false'),
              h.OnClick(set(current => ({ ...current, place: index }))),
            ],
            [item.city],
          ),
        ),
      ),
      h.div(
        [
          h.Class('lg-weeks-cal'),
          h.Lang(locale),
          h.Dir(rtl ? 'rtl' : 'ltr'),
        ],
        [
          h.div([h.Class('lg-weeks-top')], [
            h.p([h.Class('lg-weeks-month')], [
              monthNames(locale)[11],
              ' ',
              new Intl.DateTimeFormat(locale, { year: 'numeric' }).format(
                new Date(2026, 11, 1),
              ),
            ]),
            h.p([h.Class('lg-weeks-start'), h.Lang('en'), h.Dir('ltr')], [
              `Starts ${weekdayNames('en-US', 'long')[first]}`,
            ]),
          ]),
          h.table([h.Class('lg-weeks-grid')], [
            h.thead([], [
              h.tr(
                [],
                names.map(name =>
                  h.th([h.Scope('col')], [name]),
                ),
              ),
            ]),
            h.tbody(
              [],
              weeks.map(week =>
                h.tr(
                  [],
                  week.map(date =>
                    h.td(
                      [
                        ...(date.slice(5, 7) !== '12'
                          ? [h.DataAttribute('outside', '')]
                          : []),
                      ],
                      [digits.format(Number(date.slice(8)))],
                    ),
                  ),
                ),
              ),
            ),
          ]),
        ],
      ),
    ])
  },
}

/* 10. A stepper primitive with date math */

const ARRIVAL = '2026-10-03'

type NightsState = { days: number }

const nightsTile = {
  initial: { days: 30 } as NightsState,
  render: ({ state, set, h }: TileContext<NightsState>) => {
    const MIN = 1
    const MAX = 90
    const days = Math.min(MAX, Math.max(MIN, state.days))
    const leave = addDays(ARRIVAL, days)
    const short = (date: string) =>
      formatDate(date, 'en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      })
    const write = (next: number) =>
      set(current => ({
        ...current,
        days: Math.min(MAX, Math.max(MIN, next)),
      }))
    return h.div([h.Class('lg-nights')], [
      h.p([h.Class('lg-nights-label')], ['Days in the Schengen area']),
      h.div(
        [
          h.Class('lg-stepper'),
          h.Role('group'),
          h.AriaLabel('Schengen days'),
        ],
        [
          h.button(
            [
              h.Type('button'),
              h.Tabindex(-1),
              ...(days <= MIN
                ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
                : []),
              h.Class('lg-stepper-btn'),
              h.AriaLabel('One day fewer'),
              h.OnClick(write(days - 1)),
            ],
            [icon(h, 'minus', 'bold', 16)],
          ),
          h.output(
            [
              h.Class('lg-stepper-count'),
              h.Role('spinbutton'),
              h.Tabindex(0),
              h.AriaLabel('Days'),
              h.AriaValuenow(days),
              h.AriaValuemin(MIN),
              h.AriaValuemax(MAX),
              h.AriaValuetext(`${days} days`),
              h.OnKeyDownPreventDefault(key => {
                if (key === 'Home') return Option.some(write(MIN))
                if (key === 'End') return Option.some(write(MAX))
                const by =
                  key === 'ArrowUp'
                    ? 1
                    : key === 'ArrowDown'
                      ? -1
                      : key === 'PageUp'
                        ? 7
                        : key === 'PageDown'
                          ? -7
                          : 0
                if (by === 0) return Option.none()
                return Option.some(write(days + by))
              }),
            ],
            [`${days}`],
          ),
          h.button(
            [
              h.Type('button'),
              h.Tabindex(-1),
              ...(days >= MAX
                ? [h.AriaDisabled(true), h.DataAttribute('disabled', '')]
                : []),
              h.Class('lg-stepper-btn'),
              h.AriaLabel('One day more'),
              h.OnClick(write(days + 1)),
            ],
            [icon(h, 'plus', 'bold', 16)],
          ),
        ],
      ),
      h.p([h.Class('lg-nights-out')], [
        `In ${short(ARRIVAL)} `,
        h.span([h.Attribute('aria-hidden', 'true')], ['→']),
        ` out ${short(leave)}`,
      ]),
    ])
  },
}

/* 11. A star rating primitive */

const VERDICTS = ['Not rated yet', 'Poor', 'Fair', 'Good', 'Great', 'Wonderful']

type RatingState = { value: number }

const ratingTile = {
  initial: { value: 4 } as RatingState,
  render: ({ state, set, h }: TileContext<RatingState>) => {
    const rating = Rating.Root.withMessage(h)
    return h.div([h.Class('lg-rate')], [
      h.p([h.Class('lg-rate-place')], ['Ryokan Kikuya, Kanazawa']),
      rating(
        [
          h.Class('lg-rate-stars'),
          h.AriaLabel('Rate your stay'),
          rating.Max(5),
          rating.Step(1),
          rating.Value(state.value),
          rating.OnValuechange(detail =>
            set(current => ({
              ...current,
              value: detail.value ?? 0,
            })),
          ),
        ],
        [
          // PORT NOTE: the reference styles its own star buttons and puts the
          // verdict in each star's aria-label. The element generates the radios
          // and their labels, so the verdict stays in the live paragraph.
          h.template(
            [
              h.InnerHTML(
                '<ui-rating-item class="lg-rate-star"><i class="ph-fill ph-star" aria-hidden="true" style="font-size:30px"></i></ui-rating-item>',
              ),
            ],
            [],
          ),
        ],
      ),
      h.p([h.Class('lg-rate-word'), h.AriaLive('polite')], [
        VERDICTS[state.value] ?? VERDICTS[0],
      ]),
    ])
  },
}

/* 12. nearestInDirection: a map where focus stays put */

const PINS = [
  { name: 'Anchorage', lon: -149.9, lat: 61.2, zone: 'America/Anchorage' },
  { name: 'Mexico City', lon: -99.1, lat: 19.4, zone: 'America/Mexico_City' },
  { name: 'Lima', lon: -77.0, lat: -12.0, zone: 'America/Lima' },
  { name: 'Dakar', lon: -17.4, lat: 14.7, zone: 'Africa/Dakar' },
  { name: 'Oslo', lon: 10.7, lat: 59.9, zone: 'Europe/Oslo' },
  { name: 'Nairobi', lon: 36.8, lat: -1.3, zone: 'Africa/Nairobi' },
  { name: 'Mumbai', lon: 72.9, lat: 19.1, zone: 'Asia/Kolkata' },
  { name: 'Seoul', lon: 127.0, lat: 37.6, zone: 'Asia/Seoul' },
  { name: 'Perth', lon: 115.9, lat: -32.0, zone: 'Australia/Perth' },
].map(pin => ({ ...pin, x: (pin.lon + 165) / 315, y: (70 - pin.lat) / 110 }))

const DIRECTIONS: Record<string, readonly [number, number]> = {
  ArrowRight: [1, 0],
  ArrowLeft: [-1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

const mapBase = 'sink-language-map'

type MapState = { current: string }

const mapTile = {
  initial: { current: 'Dakar' } as MapState,
  render: ({ state, set, h }: TileContext<MapState>) => {
    const now = Math.floor(Date.now() / 60_000) * 60_000
    const pin = PINS.find(item => item.name === state.current) ?? PINS[0]
    const clock = clockIn(pin.zone, now, 'en-GB')
    const rect = (item: (typeof PINS)[number]) => {
      const x = item.x * 1000
      const y = item.y * 1000
      return { left: x, right: x, top: y, bottom: y }
    }
    return h.div([h.Class('lg-map')], [
      h.div(
        [
          h.Class('lg-map-board'),
          h.Role('listbox'),
          h.Tabindex(0),
          h.AriaLabel('World cities'),
          h.AriaActiveDescendant(`${mapBase}-${pin.name}`),
          h.OnKeyDownPreventDefault(key => {
            const direction = DIRECTIONS[key]
            if (!direction) return Option.none()
            const next = nearestInDirection(
              rect(pin),
              PINS.filter(item => item !== pin).map(item => ({
                key: item.name,
                rect: rect(item),
              })),
              direction,
            )
            if (!next) return Option.none()
            return Option.some(set(current => ({ ...current, current: next })))
          }),
        ],
        PINS.map(item =>
          h.div(
            [
              h.Id(`${mapBase}-${item.name}`),
              h.Role('option'),
              h.AriaSelected(item === pin),
              h.Class('lg-map-pin'),
              ...(item.x > 0.62 ? [h.DataAttribute('side', 'start')] : []),
              h.Style({
                left: `${item.x * 100}%`,
                top: `${item.y * 100}%`,
              }),
              h.OnClick(set(current => ({ ...current, current: item.name }))),
            ],
            [
              h.span([h.Class('lg-map-dot')], []),
              h.span([h.Class('lg-map-name')], [item.name]),
            ],
          ),
        ),
      ),
      h.div([h.Class('lg-map-foot'), h.AriaLive('polite')], [
        h.p([h.Class('lg-map-city')], [
          pin.name,
          ' ',
          h.span([], [clock.time]),
        ]),
        h.p([h.Class('lg-hint')], [
          Kbd(h, '←'),
          Kbd(h, '↑'),
          Kbd(h, '↓'),
          Kbd(h, '→'),
        ]),
      ]),
    ])
  },
}

/* 13. spatialMove: a QWERTZ keyboard */

const KEY_ROWS = ['QWERTZUIOP', 'ASDFGHJKLÖ', 'YXCVBNM']
const KEY_PAD = [0, 7, 18]
const KEY_W = 21
const KEY_GAP = 3
const KEY_H = 27
const ROW_GAP = 4

type KeyRect = { key: string; rect: { left: number; right: number; top: number; bottom: number } }

const keyRects: ReadonlyArray<KeyRect> = KEY_ROWS.flatMap((row, rowIndex) => {
  const keys = [...row].map((letter, colIndex) => {
    const left = KEY_PAD[rowIndex] + colIndex * (KEY_W + KEY_GAP)
    return {
      key: letter,
      rect: {
        left,
        right: left + KEY_W,
        top: rowIndex * (KEY_H + ROW_GAP),
        bottom: rowIndex * (KEY_H + ROW_GAP) + KEY_H,
      },
    }
  })
  if (rowIndex === 2) {
    const left = KEY_PAD[rowIndex] + 7 * (KEY_W + KEY_GAP)
    keys.push({
      key: 'back',
      rect: {
        left,
        right: left + 36,
        top: rowIndex * (KEY_H + ROW_GAP),
        bottom: rowIndex * (KEY_H + ROW_GAP) + KEY_H,
      },
    })
  }
  return keys
})

const KEY_ORDER = keyRects.map(item => item.key)
const keyBase = 'sink-language-key'

type KeyboardState = { focused: string | null; typed: string }

const keyboardTile = {
  initial: { focused: null, typed: 'Grüß' } as KeyboardState,
  render: ({ state, set, h }: TileContext<KeyboardState>) => {
    const tabIndex = (key: string) =>
      state.focused === null
        ? key === KEY_ORDER[0]
          ? 0
          : -1
        : state.focused === key
          ? 0
          : -1
    const press = (key: string) =>
      set(current =>
        key === 'back'
          ? { ...current, typed: current.typed.slice(0, -1) }
          : {
              ...current,
              typed:
                (current.typed.length >= 12 ? '' : current.typed) +
                key.toLowerCase(),
            },
      )
    const keyButton = (
      key: string,
      children: ReadonlyArray<Html | string>,
      extra: ReadonlyArray<Attribute<Message>> = [],
    ): Html =>
      h.button(
        [
          h.Id(`${keyBase}-${key}`),
          h.Type('button'),
          h.Tabindex(tabIndex(key)),
          h.Class('lg-key'),
          ...extra,
          h.OnClick(press(key)),
          h.OnKeyDownFocus((pressed, modifiers) => {
            if (pressed === 'Home') {
              return focusMove(
                `#${keyBase}-${KEY_ORDER[0]}`,
                set(current => ({ ...current, focused: KEY_ORDER[0] })),
              )
            }
            if (pressed === 'End') {
              const last = KEY_ORDER[KEY_ORDER.length - 1]
              return focusMove(
                `#${keyBase}-${last}`,
                set(current => ({ ...current, focused: last })),
              )
            }
            if (modifiers.ctrlKey || modifiers.metaKey || modifiers.altKey) {
              return Option.none()
            }
            const direction = DIRECTIONS[pressed]
            if (!direction) return Option.none()
            const from = keyRects.find(item => item.key === key)
            if (!from) return Option.none()
            const next = nearestInDirection(
              from.rect,
              keyRects
                .filter(item => item.key !== key)
                .map(item => ({ key: item.key, rect: item.rect })),
              direction,
            )
            if (!next) return Option.none()
            return focusMove(
              `#${keyBase}-${next}`,
              set(current => ({ ...current, focused: next })),
            )
          }),
        ],
        children,
      )

    return h.div([h.Class('lg-keys')], [
      h.p([h.Class('lg-keys-typed'), h.AriaLive('polite')], [
        state.typed,
        h.span([h.Class('lg-keys-caret'), h.Attribute('aria-hidden', 'true')], []),
      ]),
      h.div(
        [
          h.Class('lg-keys-board'),
          h.Role('group'),
          h.AriaLabel('QWERTZ keyboard'),
        ],
        KEY_ROWS.map((row, index) =>
          h.div(
            [h.Class('lg-keys-row'), h.DataAttribute('row', `${index}`)],
            [
              ...[...row].map(letter => keyButton(letter, [letter])),
              index === 2
                ? keyButton('back', [icon(h, 'backspace', 'fill', 14)], [
                    h.DataAttribute('wide', ''),
                    h.AriaLabel('Backspace'),
                  ])
                : '',
            ],
          ),
        ),
      ),
      h.p([h.Class('lg-hint')], [
        'Focus ',
        Kbd(h, 'B'),
        ' and press ',
        Kbd(h, '↑'),
      ]),
    ])
  },
}

/* 14. Focus recovery: delete a stop */

const STOPS = [
  { name: 'Bruges', day: 'Mon' },
  { name: 'Ghent', day: 'Tue' },
  { name: 'Antwerp', day: 'Thu' },
  { name: 'Delft', day: 'Fri' },
  { name: 'Utrecht', day: 'Sun' },
]

type StopsState = { stops: ReadonlyArray<{ name: string; day: string }>; focused: string | null }

const stopId = (name: string) => `sink-language-stop-${name}`

const stopsTile = {
  initial: { stops: STOPS, focused: null } as StopsState,
  render: ({ state, set, h }: TileContext<StopsState>) => {
    const remove = (name: string) =>
      set(current => {
        const index = current.stops.findIndex(stop => stop.name === name)
        const next = current.stops.filter(stop => stop.name !== name)
        const target = next[Math.min(index, next.length - 1)]
        return { ...current, stops: next, focused: target?.name ?? null }
      })
    return h.div([h.Class('lg-stops')], [
      h.div(
        [
          h.Class('lg-stops-list'),
          h.Role('listbox'),
          h.AriaLabel('Itinerary'),
        ],
        state.stops.map((stop, position) => {
          const tabIndex =
            state.focused === null
              ? stop === state.stops[0]
                ? 0
                : -1
              : state.focused === stop.name
                ? 0
                : -1
          // PORT NOTE: `createFocusRecovery` focuses the next stop after a
          // removal. `OnClick`'s focus selector does that for the cross: the
          // list is patched in place, so the pressed row's element becomes the
          // next stop (or the previous one when the last is removed).
          const nextStop =
            state.stops[position + 1] ?? state.stops[position - 1]
          const focusSelector = state.stops[position + 1]
            ? stopId(stop.name)
            : nextStop
              ? stopId(nextStop.name)
              : undefined
          return h.div(
            [
              h.Id(stopId(stop.name)),
              h.Role('option'),
              h.AriaSelected(false),
              h.AriaKeyshortcuts('Delete'),
              h.Tabindex(tabIndex),
              h.Class('lg-stops-item'),
              h.OnKeyDownPreventDefault(key => {
                if (key === 'Delete' || key === 'Backspace') {
                  return Option.some(remove(stop.name))
                }
                return Option.none()
              }),
              h.OnKeyDownFocus(key => {
                const index = state.stops.findIndex(item => item.name === stop.name)
                const target =
                  key === 'ArrowDown'
                    ? state.stops[index + 1]
                    : key === 'ArrowUp'
                      ? state.stops[index - 1]
                      : key === 'Home'
                        ? state.stops[0]
                        : key === 'End'
                          ? state.stops[state.stops.length - 1]
                          : undefined
                if (!target) return Option.none()
                return focusMove(
                  `#${stopId(target.name)}`,
                  set(current => ({ ...current, focused: target.name })),
                )
              }),
            ],
            [
              h.span([h.Class('lg-stops-day')], [stop.day]),
              h.span([h.Class('lg-stops-name')], [stop.name]),
              h.span(
                [
                  h.Class('lg-stops-x'),
                  h.Attribute('aria-hidden', 'true'),
                  h.OnClick(
                    remove(stop.name),
                    focusSelector
                      ? { focusSelector: `#${focusSelector}` }
                      : undefined,
                  ),
                ],
                [icon(h, 'x', 'bold', 14)],
              ),
            ],
          )
        }),
      ),
      state.stops.length > 0
        ? h.p([h.Class('lg-hint')], [
            'Focus a stop, press ',
            Kbd(h, 'Delete'),
          ])
        : h.button(
            [
              h.Type('button'),
              h.Class('b-btn lg-stops-reset'),
              h.OnClick(set(current => ({ ...current, stops: STOPS, focused: null }))),
            ],
            [icon(h, 'arrow-counter-clockwise', 'bold', 14), 'Restore the route'],
          ),
      state.stops.length > 0 && state.stops.length < STOPS.length
        ? h.button(
            [
              h.Type('button'),
              h.Class('lg-stops-undo'),
              h.OnClick(set(current => ({ ...current, stops: STOPS, focused: null }))),
            ],
            ['Restore'],
          )
        : '',
    ])
  },
}

/* 15. keepFocus: words move between lists */

const WORDS = [
  { word: 'Obrigado', language: 'Portuguese' },
  { word: 'Kiitos', language: 'Finnish' },
  { word: 'Gracias', language: 'Spanish' },
  { word: 'Grazie', language: 'Italian' },
  { word: 'Takk', language: 'Norwegian' },
]

const wordId = (word: string) => `sink-language-word-${word}`

type WordsState = { known: ReadonlyArray<string> }

const wordsTile = {
  initial: { known: ['Gracias', 'Grazie'] } as WordsState,
  render: ({ state, set, h }: TileContext<WordsState>) => {
    const move = (word: string) =>
      set(current => ({
        ...current,
        known: current.known.includes(word)
          ? current.known.filter(item => item !== word)
          : [...current.known, word],
      }))
    const column = (title: string, items: typeof WORDS) =>
      h.section([h.Class('lg-words-col'), h.AriaLabel(title)], [
        h.p([h.Class('lg-words-title')], [
          title,
          ' ',
          h.span([], [`${items.length}`]),
        ]),
        h.ul(
          [],
          items.map(({ word, language }) =>
            h.li([], [
              h.button(
                [
                  h.Type('button'),
                  h.Id(wordId(word)),
                  h.Class('lg-words-word'),
                  h.Attribute('lang', ''),
                  h.OnClick(move(word)),
                ],
                [h.span([], [word]), h.small([], [language])],
              ),
            ]),
          ),
        ),
      ])
    return h.div(
      [
        h.Class('lg-words'),
        // PORT NOTE: `keepFocus` re-focuses a word in its new column after the
        // render. A click listener watching the tile does that: it reads the
        // pressed button, which keeps its id, and focuses it on the next frame.
        // The Model stays the only source of state; only focus is DOM work.
        h.OnMount({
          name: 'sink-language-words-focus',
          f: element =>
            Dom.streamFromEventFilterMap({
              target: element,
              type: 'click',
              filterMapEvent: event => {
                const target = event.target
                const button =
                  target instanceof Element
                    ? target.closest('.lg-words-word')
                    : null
                if (button) {
                  const id = button.id
                  requestAnimationFrame(() => {
                    document.getElementById(id)?.focus()
                  })
                }
                return Option.none()
              },
            }),
        }),
      ],
      [
        h.div([h.Class('lg-words-cols')], [
          column(
            'Learning',
            WORDS.filter(({ word }) => !state.known.includes(word)),
          ),
          column(
            'Known',
            WORDS.filter(({ word }) => state.known.includes(word)),
          ),
        ]),
        h.p([h.Class('lg-hint')], [
          Kbd(h, 'Enter'),
          ' moves a word, focus follows',
        ]),
      ],
    )
  },
}

/* 16. Shortcuts per platform */

const SHORTCUTS = [
  { keys: 'mod+d', label: 'Fill down' },
  { keys: 'mod+;', label: 'Insert today' },
  { keys: 'mod+shift+l', label: 'Toggle filters' },
]

const capsOf = (shortcut: string, apple: boolean) => {
  const label = formatShortcut(shortcut, apple).replace(
    /[\u200e\u200f\u2066-\u2069]/g,
    '',
  )
  return (apple ? [...label] : label.split('+')).filter(Boolean)
}

type ShortcutState = { chosen: boolean | null; hit: string | null }

const shortcutsTile = {
  initial: { chosen: null, hit: null } as ShortcutState,
  render: ({ state, set, h }: TileContext<ShortcutState>) => {
    // PORT NOTE: `useShortcutHint("mod+k").ariaKeyshortcuts` is the same string
    // this reads directly, without the hook.
    const detected = ariaKeyshortcuts('mod+k').startsWith('Meta')
    const apple = state.chosen ?? detected
    return h.div(
      [
        h.Class('lg-sc'),
        h.OnKeyDownPreventDefault((key, modifiers) => {
          // PORT NOTE: `matchesShortcut` reads a native KeyboardEvent; the
          // builder hands over the key and its modifiers, so they are shaped
          // back into the fields it reads. The reference clears the match
          // after 900ms; without a timer the flash lasts until the next
          // shortcut or platform choice.
          const event = {
            key,
            metaKey: modifiers.metaKey,
            ctrlKey: modifiers.ctrlKey,
            altKey: modifiers.altKey,
            shiftKey: modifiers.shiftKey,
          } as unknown as KeyboardEvent
          const match = SHORTCUTS.find(item =>
            matchesShortcut(event, item.keys, apple),
          )
          if (!match) return Option.none()
          return Option.some(
            set(current => ({ ...current, hit: match.label })),
          )
        }),
      ],
      [
        h.div(
          [h.Class('lg-sc-platforms'), h.Role('group'), h.AriaLabel('Platform')],
          [
            h.button(
              [
                h.Type('button'),
                h.Class('lg-sc-platform'),
                h.AriaPressed(apple ? 'true' : 'false'),
                h.OnClick(set(current => ({ ...current, chosen: true }))),
              ],
              ['Mac'],
            ),
            h.button(
              [
                h.Type('button'),
                h.Class('lg-sc-platform'),
                h.AriaPressed(!apple ? 'true' : 'false'),
                h.OnClick(set(current => ({ ...current, chosen: false }))),
              ],
              ['Windows'],
            ),
          ],
        ),
        h.ul(
          [h.Class('lg-sc-list')],
          SHORTCUTS.map(item =>
            h.li([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('lg-sc-row'),
                  h.AriaKeyshortcuts(ariaKeyshortcuts(item.keys, apple)),
                  ...(state.hit === item.label
                    ? [h.DataAttribute('hit', '')]
                    : []),
                  h.OnClick(
                    set(current => ({ ...current, hit: item.label })),
                  ),
                ],
                [
                  h.span([], [item.label]),
                  h.span(
                    [h.Class('lg-sc-caps'), h.Attribute('aria-hidden', 'true')],
                    capsOf(item.keys, apple).map(cap => Kbd(h, cap)),
                  ),
                ],
              ),
            ]),
          ),
        ),
        h.p([h.Class('lg-hint'), h.AriaLive('polite')], [
          state.hit
            ? `${state.hit} matched`
            : 'Focus a row, then press its keys',
        ]),
      ],
    )
  },
}

/* 17. announce, with lines that animate in and out */

const RATE = 10.38
const AMOUNTS = [50, 100, 250]

type AnnounceLine = { id: number; text: string }
type AnnounceState = { fromPounds: boolean; amount: number; log: ReadonlyArray<AnnounceLine>; nextId: number }

const money = (value: number, currency: string) =>
  formatNumber(value, 'en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  })

const announceTile = {
  initial: {
    fromPounds: true,
    amount: 100,
    log: [],
    nextId: 0,
  } as AnnounceState,
  render: ({ state, set, h }: TileContext<AnnounceState>) => {
    const from = state.fromPounds ? 'GBP' : 'HKD'
    const to = state.fromPounds ? 'HKD' : 'GBP'
    const converted = (value: number, pounds: boolean) =>
      pounds ? value * RATE : value / RATE
    const lineText = (value: number, pounds: boolean) =>
      `${money(value, pounds ? 'GBP' : 'HKD')} is about ${money(
        converted(value, pounds),
        pounds ? 'HKD' : 'GBP',
      )}`
    const withLine = (current: AnnounceState, text: string): AnnounceState => {
      const nextId = current.nextId + 1
      return {
        ...current,
        nextId,
        log: [...current.log, { id: nextId, text }].slice(-2),
      }
    }
    const chooseAmount = (value: number) => {
      const text = lineText(value, state.fromPounds)
      return set(current => ({
        ...withLine(current, text),
        amount: value,
      }))
    }
    const swap = () => {
      const nextPounds = !state.fromPounds
      const text = lineText(state.amount, nextPounds)
      return set(current => ({
        ...withLine(current, text),
        fromPounds: nextPounds,
      }))
    }
    return h.div([h.Class('lg-say')], [
      h.p([h.Class('lg-say-value')], [
        money(converted(state.amount, state.fromPounds), to),
        h.span([], [`from ${money(state.amount, from)}`]),
      ]),
      h.div([h.Class('lg-say-controls')], [
        ...AMOUNTS.map(value =>
          h.button(
            [
              h.Type('button'),
              h.Class('lg-say-amount'),
              h.AriaPressed(value === state.amount ? 'true' : 'false'),
              h.OnClick(chooseAmount(value)),
            ],
            [money(value, from)],
          ),
        ),
        h.button(
          [
            h.Type('button'),
            h.Class('lg-say-swap'),
            h.AriaLabel(`Convert from ${to} instead`),
            h.OnClick(swap()),
          ],
          [icon(h, 'arrows-left-right', 'bold', 14)],
        ),
      ]),
      h.div([h.Class('lg-say-log')], [
        h.p([h.Class('lg-say-head')], [
          h.span([], ['Screen reader hears']),
          state.log.length > 0
            ? h.button(
                [
                  h.Type('button'),
                  h.Class('lg-say-clear'),
                  h.OnClick(set(current => ({ ...current, log: [] }))),
                ],
                ['Clear'],
              )
            : '',
        ]),
        h.ul(
          [],
          [
            ...state.log.map(line =>
              h.keyed('li')(line.id, [
                h.Class('lg-say-line'),
                // PORT NOTE: the reference announces on the click and animates
                // lines out when clearing. The newest line announces itself as
                // it mounts; clearing removes the lines at once.
                h.OnMount({
                  name: 'sink-language-say-line',
                  f: element => {
                    animateIn(element as HTMLElement)
                    announce(line.text)
                    return Stream.empty
                  },
                }),
              ], [line.text]),
            ),
            state.log.length === 0
              ? h.li([h.Class('lg-say-empty')], ['Press an amount to hear it'])
              : '',
          ],
        ),
      ]),
    ])
  },
}

/* 18. Direction and page language: a phrasebook */

const PHRASES = [
  {
    tag: 'ar_EG',
    name: 'العربية',
    text: 'أين المحطة؟',
    dir: 'rtl',
    currency: 'EGP',
    fare: 30,
  },
  {
    tag: 'pt_BR',
    name: 'Português',
    text: 'Onde fica a estação?',
    dir: 'ltr',
    currency: 'BRL',
    fare: 5.2,
  },
  {
    tag: 'he_IL',
    name: 'עברית',
    text: 'איפה התחנה?',
    dir: 'rtl',
    currency: 'ILS',
    fare: 8.5,
  },
  {
    tag: 'ja_JP',
    name: '日本語',
    text: '駅はどこですか？',
    dir: 'ltr',
    currency: 'JPY',
    fare: 210,
  },
  {
    tag: 'en_GB',
    name: 'English',
    text: 'Where is the station?',
    dir: 'ltr',
    currency: 'GBP',
    fare: 2.8,
  },
] as const

type PhraseState = { index: number }

const phrasebook = {
  initial: { index: 0 } as PhraseState,
  render: ({ state, set, h }: TileContext<PhraseState>) => {
    const phrase = PHRASES[state.index] ?? PHRASES[0]
    const locale = toLocale(phrase.tag)
    const go = (by: number) =>
      set(current => ({
        ...current,
        index: (current.index + by + PHRASES.length) % PHRASES.length,
      }))
    const forward = phrase.dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
    return h.div([h.Class('lg-phrase')], [
      h.div(
        [
          h.Class('lg-phrase-card'),
          ...(locale ? [h.Lang(locale)] : []),
          h.Dir(phrase.dir),
          h.Tabindex(0),
          h.Role('group'),
          h.AriaRoleDescription('phrase'),
          h.AriaLabel(`Phrase ${state.index + 1} of ${PHRASES.length}`),
          h.OnKeyDownPreventDefault(key => {
            if (key !== 'ArrowLeft' && key !== 'ArrowRight') {
              return Option.none()
            }
            return Option.some(go(key === forward ? 1 : -1))
          }),
        ],
        [
          h.p([h.Class('lg-phrase-lang')], [phrase.name]),
          h.p([h.Class('lg-phrase-text')], [phrase.text]),
          h.p([h.Class('lg-phrase-fare')], [
            // PORT NOTE: the reference formats from `pageLocale` of the live
            // fare node; the card's language is the same value.
            h.span([], [
              formatNumber(phrase.fare, locale, {
                style: 'currency',
                currency: phrase.currency,
              }),
            ]),
          ]),
        ],
      ),
      h.div([h.Class('lg-phrase-nav')], [
        h.button(
          [
            h.Type('button'),
            h.Class('lg-phrase-btn'),
            h.AriaLabel('Previous phrase'),
            h.OnClick(go(-1)),
          ],
          [icon(h, 'caret-left', 'bold', 14)],
        ),
        h.p([h.Class('lg-phrase-tag')], [
          h.code([], [phrase.tag]),
          ' ',
          h.span([h.Attribute('aria-hidden', 'true')], ['→']),
          ' ',
          h.code([], [locale ?? '']),
          h.span([h.Class('lg-phrase-dir')], [
            phrase.dir === 'rtl' ? 'RTL' : 'LTR',
          ]),
        ]),
        h.button(
          [
            h.Type('button'),
            h.Class('lg-phrase-btn'),
            h.AriaLabel('Next phrase'),
            h.OnClick(go(1)),
          ],
          [icon(h, 'caret-right', 'bold', 14)],
        ),
      ]),
    ])
  },
}

/* 19. A light, dark or system scope, remembered on this device */

type Scheme = 'light' | 'dark' | 'system'
const SCHEME_KEY = 'lg-scheme'

const SCHEMES = [
  { value: 'light', label: 'Light', icon: 'sun' },
  { value: 'dark', label: 'Dark', icon: 'moon' },
  { value: 'system', label: 'Auto', icon: 'desktop' },
] as const

const readScheme = (): Scheme => {
  try {
    const saved = localStorage.getItem(SCHEME_KEY)
    return saved === 'light' || saved === 'dark' || saved === 'system'
      ? saved
      : 'dark'
  } catch {
    return 'dark'
  }
}

const systemDark = () =>
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false

type SchemeState = {
  scheme: Scheme
  focused: string | null
}

const schemeTile = {
  // PORT NOTE: `useState(readScheme)` runs on the first render. `initial` is a
  // value, so the saved choice is read when the tile module loads. The system
  // theme is re-sampled on each render, so a system change shows up on the
  // next interaction.
  initial: {
    scheme: readScheme(),
    focused: null,
  } as SchemeState,
  render: ({ state, set, h }: TileContext<SchemeState>) => {
    const resolved =
      state.scheme === 'system'
        ? systemDark()
          ? 'dark'
          : 'light'
        : state.scheme
    const persist = (next: string) => {
      try {
        localStorage.setItem(SCHEME_KEY, next)
      } catch {
        // Storage can be unavailable, like in a private window. The choice still applies.
      }
    }
    // PORT NOTE: `choose` in the reference both applied and saved the choice.
    // A click's Message is built while rendering, so the save happens in a
    // click listener on the tile (below); the arrow keys save it in their
    // handler, which runs with the key press.
    const choose = (next: string) =>
      set(current => ({
        ...current,
        scheme: next as Scheme,
        focused: next,
      }))
    const move = (by: number) => {
      const index = state.focused
        ? SCHEMES.findIndex(item => item.value === state.focused)
        : SCHEMES.findIndex(item => item.value === state.scheme)
      const next = (index + by + SCHEMES.length) % SCHEMES.length
      return SCHEMES[next]
    }
    return h.div(
      [
        h.Class('lg-scheme'),
        h.DataAttribute('scheme', resolved),
        h.OnMount({
          name: 'sink-language-scheme-save',
          f: element =>
            Dom.streamFromEventFilterMap({
              target: element,
              type: 'click',
              filterMapEvent: event => {
                const target = event.target
                const option =
                  target instanceof Element
                    ? target.closest('.lg-scheme-option')
                    : null
                const value = option?.id.replace('sink-language-scheme-', '')
                if (
                  value === 'light' ||
                  value === 'dark' ||
                  value === 'system'
                ) {
                  persist(value)
                }
                return Option.none()
              },
            }),
        }),
      ],
      [
        h.div([h.Class('lg-scheme-ticket')], [
          h.p([h.Class('lg-scheme-train')], ['Nightjet 466']),
          h.p([h.Class('lg-scheme-route')], ['Wien Hbf → Venezia']),
          h.p([h.Class('lg-scheme-meta')], ['Couchette 4 · 21:27']),
        ]),
        h.div(
          [
            h.Class('lg-scheme-picker'),
            h.Role('radiogroup'),
            h.AriaLabel('Color scheme'),
          ],
          SCHEMES.map(item => {
            const selected = state.scheme === item.value
            const tabIndex =
              state.focused === null
                ? selected
                  ? 0
                  : -1
                : state.focused === item.value
                  ? 0
                  : -1
            return h.button(
              [
                h.Id(`sink-language-scheme-${item.value}`),
                h.Type('button'),
                h.Role('radio'),
                h.AriaChecked(selected),
                ...(selected ? [h.DataAttribute('checked', '')] : []),
                h.Tabindex(tabIndex),
                h.Class('lg-scheme-option'),
                h.OnClick(choose(item.value)),
                h.OnKeyDownFocus(key => {
                  const target =
                    key === 'ArrowRight' || key === 'ArrowDown'
                      ? move(1)
                      : key === 'ArrowLeft' || key === 'ArrowUp'
                        ? move(-1)
                        : key === 'Home'
                          ? SCHEMES[0]
                          : key === 'End'
                            ? SCHEMES[SCHEMES.length - 1]
                            : undefined
                  if (!target) return Option.none()
                  persist(target.value)
                  return focusMove(
                    `#sink-language-scheme-${target.value}`,
                    choose(target.value),
                  )
                }),
              ],
              [icon(h, item.icon, 'fill', 14), item.label],
            )
          }),
        ),
      ],
    )
  },
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'language-city-search',
    title: 'Find any city.',
    blurb: 'Ranked as you type, matches marked, accents ignored.',
    size: 'large',
    initial: citySearch.initial,
    render: citySearch.render,
  },
  {
    id: 'language-typeahead',
    title: 'Type to jump.',
    blurb: 'Letters find the currency.',
    tone: 'paper',
    initial: typeahead.initial,
    render: typeahead.render,
  },
  {
    id: 'language-number-format',
    title: 'Pick a format.',
    blurb: 'Arrows move, Tab leaves the group.',
    initial: formats.initial,
    render: formats.render,
  },
  {
    id: 'language-seats',
    title: 'Choose a seat.',
    blurb: 'A keyboard grid that skips taken seats.',
    size: 'tall',
    tone: 'blueprint',
    initial: seats.initial,
    render: seats.render,
  },
  {
    id: 'language-sheet',
    title: 'Copy a block.',
    blurb: 'Shift-select cells, paste back as rows.',
    size: 'wide',
    initial: sheet.initial,
    render: sheet.render,
  },
  {
    id: 'language-stay',
    title: 'Book the stay.',
    blurb: 'A two-month range with a live night count.',
    size: 'wide',
    tone: 'sky',
    initial: stay.initial,
    render: stay.render,
  },
  {
    id: 'language-departure',
    title: 'Type or pick.',
    blurb: 'Swiss date order, calendar on demand.',
    initial: departure.initial,
    render: departure.render,
  },
  {
    id: 'language-parse-date',
    title: 'Same digits, new date.',
    blurb: 'Each locale reads its own order.',
    tone: 'paper',
    initial: parseDateTile.initial,
    render: parseDateTile.render,
  },
  {
    id: 'language-weeks',
    title: 'Weeks start elsewhere.',
    blurb: 'One month, three local grids.',
    tone: 'sage',
    initial: weeksTile.initial,
    render: weeksTile.render,
  },
  {
    id: 'language-nights',
    title: 'Count the days.',
    blurb: 'A stepper primitive doing date math.',
    tone: 'signal',
    initial: nightsTile.initial,
    render: nightsTile.render,
  },
  {
    id: 'language-rating',
    title: 'Rate the ryokan.',
    blurb: 'Stars built from scratch.',
    tone: 'butter',
    initial: ratingTile.initial,
    render: ratingTile.render,
  },
  {
    id: 'language-map',
    title: 'Arrows follow the map.',
    blurb: 'The nearest city that way wins.',
    tone: 'paper',
    initial: mapTile.initial,
    render: mapTile.render,
  },
  {
    id: 'language-keyboard',
    title: 'Keys by position.',
    blurb: 'Up from B lands where it looks.',
    tone: 'ink',
    initial: keyboardTile.initial,
    render: keyboardTile.render,
  },
  {
    id: 'language-stops',
    title: 'Delete, stay put.',
    blurb: 'Focus lands on the next stop.',
    initial: stopsTile.initial,
    render: stopsTile.render,
  },
  {
    id: 'language-words',
    title: 'Focus follows.',
    blurb: 'Move a word, keep your place.',
    tone: 'paper',
    initial: wordsTile.initial,
    render: wordsTile.render,
  },
  {
    id: 'language-shortcuts',
    title: 'Shortcuts per platform.',
    blurb: '⌘ on a Mac, Ctrl elsewhere.',
    initial: shortcutsTile.initial,
    render: shortcutsTile.render,
  },
  {
    id: 'language-announce',
    title: 'Heard, not seen.',
    blurb: 'What a screen reader is told.',
    tone: 'ink',
    initial: announceTile.initial,
    render: announceTile.render,
  },
  {
    id: 'language-phrasebook',
    title: 'Read right to left.',
    blurb: "Arrows follow each language's direction.",
    tone: 'paper',
    initial: phrasebook.initial,
    render: phrasebook.render,
  },
  {
    id: 'language-scheme',
    title: 'Light, dark or auto.',
    blurb: "One tile's scheme, remembered here.",
    initial: schemeTile.initial,
    render: schemeTile.render,
  },
]
