import type { HtmlBuilder } from 'foldkit/html'
import { Mount } from 'foldkit'
import { type Cause, Effect, Option, Queue, Stream } from 'effect'

import { isRTL } from '@ui-sdk/core'
import { createAgent, type AgentComponent } from '@ui-sdk/core/agent'
import {
  addDays,
  addMonths,
  addYears,
  clampDate,
  daysBetween,
  endOfMonth,
  endOfWeek,
  firstDayOfWeek,
  formatDate,
  formatDateRange,
  isSameMonth,
  monthGrid,
  startOfMonth,
  startOfWeek,
  todayDate,
  weekdayNames,
} from '@ui-sdk/core/date'
import {
  decimalsOf,
  formatNumber,
  formatNumberRange,
  formatNumberToParts,
  fractionOf,
  isPartialNumber,
  parseNumber,
  roundTo,
  scrubTo,
  stepBy,
  stepFromKey,
  valueAt,
  wrap,
} from '@ui-sdk/core/number'
import { elementOf } from '@ui-sdk/core/observe'
import {
  fromText,
  toText,
  type TokenCodec,
  type TokenInputValue,
} from '@ui-sdk/core/token-input'
import {
  Button,
  Field,
  Input,
  Radio,
  SegmentedControl,
  Select,
  Switch,
  TokenInput,
} from 'foldkit-ui-sdk'

import { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './locale.css'

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

const localeSwitch = (
  h: HtmlBuilder<Message>,
  locales: ReadonlyArray<string>,
  value: string,
  onChange: (next: string | null) => Message,
) => {
  const control = SegmentedControl.Root.withMessage(h)
  const indicator = SegmentedControl.Indicator.withMessage(h)
  const item = SegmentedControl.Item.withMessage(h)
  return control(
    [
      h.Class('lc-locales'),
      h.AriaLabel('Locale'),
      control.Value(value),
      control.OnValuechange(detail => onChange(detail.value)),
    ],
    [
      indicator([h.Class('lc-locales-indicator')], []),
      ...locales.map(tag =>
        item([item.Value(tag), h.Class('lc-locale')], [tag]),
      ),
    ],
  )
}

/* 1. An amount typed the local way */

const AMOUNT_LOCALES = ['en-US', 'de-DE', 'fr-FR', 'hi-IN'] as const
const CURRENCY_OF: Record<string, string> = {
  'en-US': 'USD',
  'de-DE': 'EUR',
  'fr-FR': 'EUR',
  'hi-IN': 'INR',
}

function separatorsOf(locale: string) {
  const parts = formatNumberToParts(1234567.5, locale)
  const shown = (type: string) => {
    const value = parts.find(part => part.type === type)?.value ?? ''
    return value.trim() ? value : 'space'
  }
  return { group: shown('group'), decimal: shown('decimal') }
}

type AmountState = {
  locale: string
  text: string
  rejected: string | null
}

const amount = {
  initial: {
    locale: 'de-DE',
    text: '1.234,5',
    rejected: null,
  } as AmountState,
  render: ({ state, set, h }: TileContext<AmountState>) => {
    const value = parseNumber(state.text, state.locale)
    const { group, decimal } = separatorsOf(state.locale)
    const currency = CURRENCY_OF[state.locale] ?? 'EUR'
    return h.div([h.Class('lc-amount')], [
      localeSwitch(h, AMOUNT_LOCALES, state.locale, next =>
        set(current => {
          if (next === null) return current
          const parsed = parseNumber(current.text, current.locale)
          return {
            locale: next,
            rejected: null,
            text:
              parsed === null
                ? current.text
                : formatNumber(parsed, next, { maximumFractionDigits: 2 }),
          }
        }),
      ),
      h.label(
        [
          h.Class('lc-amount-field'),
          ...(state.rejected === null
            ? []
            : [h.DataAttribute('rejected', state.rejected)]),
        ],
        [
          h.span([h.Class('b-label')], ['Transfer amount']),
          h.span([h.Class('lc-amount-box')], [
            h.input([
              h.Class('lc-amount-input'),
              h.InputMode('decimal'),
              h.Value(state.text),
              h.Spellcheck(false),
              h.Autocomplete('off'),
              h.AriaDescribedBy('lc-amount-out'),
              h.OnInput(next =>
                set(current =>
                  isPartialNumber(next, current.locale, {}, { allowNegative: false })
                    ? { ...current, text: next, rejected: null }
                    : { ...current, rejected: next.slice(-1) || null },
                ),
              ),
              h.OnBlur(
                set(current => {
                  const parsed = parseNumber(current.text, current.locale)
                  return parsed === null
                    ? current
                    : {
                        ...current,
                        text: formatNumber(parsed, current.locale, {
                          maximumFractionDigits: 2,
                        }),
                      }
                }),
              ),
            ]),
            h.span([h.Class('lc-amount-code')], [currency]),
          ]),
        ],
      ),
      h.p(
        [h.Class('lc-amount-seps')],
        state.rejected === null
          ? [
              'Groups ',
              h.kbd([], [group]),
              ' Decimal ',
              h.kbd([], [decimal]),
            ]
          : [
              h.span([], [
                `\u201c${state.rejected}\u201d has no place in a ${state.locale} number`,
              ]),
            ],
      ),
      h.p(
        [h.Class('lc-amount-out'), h.Id('lc-amount-out'), h.AriaLive('polite')],
        [
          h.code([], [value === null ? '\u2014' : String(value)]),
          h.span([], [
            value === null
              ? 'Keep typing'
              : formatNumber(value, state.locale, {
                  style: 'currency',
                  currency,
                }),
          ]),
        ],
      ),
    ])
  },
}

/* 2. A price styled from its parts */

const PRICES = [
  { locale: 'en-US', currency: 'USD', night: 1249.99, low: 120, high: 340 },
  { locale: 'de-DE', currency: 'EUR', night: 1149.5, low: 110, high: 315 },
  { locale: 'ja-JP', currency: 'JPY', night: 186400, low: 17900, high: 50800 },
  { locale: 'hi-IN', currency: 'INR', night: 104250, low: 9990, high: 28400 },
]

type PriceState = { locale: string }

const price = {
  initial: { locale: 'en-US' } as PriceState,
  render: ({ state, set, h }: TileContext<PriceState>) => {
    const entry =
      PRICES.find(candidate => candidate.locale === state.locale) ?? PRICES[0]!
    const format: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: entry.currency,
    }
    const parts = formatNumberToParts(entry.night, state.locale, format)
    let afterDecimal = false
    return h.div([h.Class('lc-price')], [
      localeSwitch(
        h,
        PRICES.map(candidate => candidate.locale),
        state.locale,
        next =>
          next === null
            ? set(current => current)
            : set(current => ({ ...current, locale: next })),
      ),
      h.div([h.Class('lc-price-card')], [
        h.p([h.Class('lc-price-room')], ['Ocean suite']),
        h.p(
          [
            h.Class('lc-price-amount'),
            h.AriaLabel(formatNumber(entry.night, state.locale, format)),
          ],
          [
            ...parts.map(part => {
              afterDecimal ||= part.type === 'decimal'
              return h.span(
                [
                  h.AriaHidden(true),
                  h.DataAttribute('part', part.type),
                  ...(afterDecimal || part.type === 'currency'
                    ? [h.DataAttribute('small', '')]
                    : []),
                ],
                [part.value],
              )
            }),
            h.span([h.Class('lc-price-per')], ['/ night']),
          ],
        ),
        h.p([h.Class('lc-price-range')], [
          'Other rooms ',
          h.strong([], [
            formatNumberRange(entry.low, entry.high, state.locale, {
              ...format,
              maximumFractionDigits: 0,
            }),
          ]),
        ]),
      ]),
    ])
  },
}

/* 3. A dial that snaps to quarter hours */

const HOURS = { min: 0, max: 8, step: 0.25, largeStep: 1 }
const SWEEP = 270
const TICKS = Array.from(
  { length: HOURS.max / HOURS.step + 1 },
  (_, index) => index * HOURS.step,
)

type HoursState = { value: number }

type MessageQueue = Queue.Queue<Message, Cause.Done>

// PORT NOTE: the reference attaches React pointer handlers to the dial. Here a
// Mount stream installs the same pointerdown/pointermove/pointerup listeners on
// the live element and dispatches through `set`; the keyboard path is a plain
// OnKeyDownPreventDefault handler.
const hoursDial = (set: TileContext<HoursState>['set']) =>
  Mount.defineStream('LocaleHoursDial', {
    messages: [Message],
    execute: ({ element }) =>
      Stream.callback<Message>(queue =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => {
              const dial = element as HTMLElement

              const valueAtPoint = (clientX: number, clientY: number) => {
                const box = dial.getBoundingClientRect()
                const x = clientX - box.left - box.width / 2
                const y = clientY - box.top - box.height / 2
                const angle = wrap(
                  (Math.atan2(x, -y) * 180) / Math.PI,
                  -180,
                  180,
                )
                if (Math.abs(angle) > SWEEP / 2) return null
                const raw = valueAt(angle / SWEEP + 0.5, HOURS)
                return scrubTo(raw, HOURS).value
              }

              const moveTo = (event: PointerEvent) => {
                const next = valueAtPoint(event.clientX, event.clientY)
                if (next !== null) {
                  Queue.offerUnsafe(queue, set({ value: next }))
                }
              }

              const onPointerDown = (event: PointerEvent) => {
                dial.setPointerCapture(event.pointerId)
                moveTo(event)
              }
              const onPointerMove = (event: PointerEvent) => {
                if (dial.hasPointerCapture(event.pointerId)) {
                  moveTo(event)
                }
              }
              const onPointerUp = (event: PointerEvent) => {
                if (dial.hasPointerCapture(event.pointerId)) {
                  dial.releasePointerCapture(event.pointerId)
                }
              }

              dial.addEventListener('pointerdown', onPointerDown)
              dial.addEventListener('pointermove', onPointerMove)
              dial.addEventListener('pointerup', onPointerUp)
              dial.addEventListener('pointercancel', onPointerUp)

              return () => {
                dial.removeEventListener('pointerdown', onPointerDown)
                dial.removeEventListener('pointermove', onPointerMove)
                dial.removeEventListener('pointerup', onPointerUp)
                dial.removeEventListener('pointercancel', onPointerUp)
              }
            }),
            cleanup => Effect.sync(cleanup),
          )
          return yield* Effect.never
        }),
      ),
  })()

const hours = {
  initial: { value: 6.75 } as HoursState,
  render: ({ state, set, h }: TileContext<HoursState>) => {
    const turn = fractionOf(state.value, HOURS) * SWEEP - SWEEP / 2
    const whole = Math.floor(state.value)
    const minutes = roundTo((state.value - whole) * 60, 0)
    const rtl = isRTL(typeof document === 'undefined' ? null : document.body)

    return h.div([h.Class('lc-hours')], [
      h.p([h.Class('lc-hours-task')], [
        'Lantern redesign ',
        h.span([], ['Tue']),
      ]),
      h.div(
        [
          h.Class('lc-dial'),
          h.Role('slider'),
          h.Tabindex(0),
          h.AriaLabel('Hours on Lantern redesign'),
          h.AriaValuemin(HOURS.min),
          h.AriaValuemax(HOURS.max),
          h.AriaValuenow(state.value),
          h.AriaValuetext(`${whole} hours ${minutes} minutes`),
          h.Style({ '--turn': `${turn}deg` }),
          h.OnMount(hoursDial(set)),
          h.OnKeyDownPreventDefault((key, modifiers) => {
            const move = stepFromKey(
              {
                key,
                shiftKey: modifiers.shiftKey,
                altKey: modifiers.altKey,
                isComposing: false,
              },
              { dir: rtl ? 'rtl' : 'ltr' },
            )
            return move === null
              ? Option.none()
              : Option.some(
                  set(current => ({
                    value: stepBy(current.value, move, HOURS),
                  })),
                )
          }),
        ],
        [
          ...TICKS.map(tick =>
            h.span(
              [
                h.Class('lc-dial-tick'),
                ...(Number.isInteger(tick) ? [h.DataAttribute('hour', '')] : []),
                ...(tick <= state.value ? [h.DataAttribute('on', '')] : []),
                h.Style({
                  '--at': `${fractionOf(tick, HOURS) * SWEEP - SWEEP / 2}deg`,
                }),
              ],
              [],
            ),
          ),
          h.span([h.Class('lc-dial-pointer'), h.AriaHidden(true)], []),
          h.span([h.Class('lc-dial-face'), h.AriaHidden(true)], [
            h.span([h.Class('lc-dial-read')], [
              String(whole),
              h.small([], ['h']),
              String(minutes).padStart(2, '0'),
              h.small([], ['m']),
            ]),
          ]),
        ],
      ),
      h.p([h.Class('lc-hours-note')], [
        `${state.value.toFixed(decimalsOf(HOURS.step))} of 8.00 h`,
      ]),
    ])
  },
}

/* 4. Quick date ranges */

const RANGE_LOCALES = ['en-US', 'en-GB', 'ar-EG'] as const

type Preset = {
  label: string
  range: (today: string, first: number) => [string, string]
}

const PRESETS: ReadonlyArray<Preset> = [
  {
    label: 'This week',
    range: (today, first) => [
      clampDate(startOfWeek(today, first), today),
      endOfWeek(today, first),
    ],
  },
  {
    label: 'Next week',
    range: (today, first) => [
      startOfWeek(addDays(today, 7), first),
      endOfWeek(addDays(today, 7), first),
    ],
  },
  {
    label: 'This month',
    range: today => [today, endOfMonth(today)],
  },
  {
    label: 'Next month',
    range: today => [
      startOfMonth(addMonths(today, 1)),
      endOfMonth(addMonths(today, 1)),
    ],
  },
  {
    label: 'A year out',
    range: (today, first) => [
      startOfWeek(addYears(today, 1), first),
      endOfWeek(addYears(today, 1), first),
    ],
  },
]

type RangesState = { locale: string; preset: string }

const ranges = {
  initial: { locale: 'en-GB', preset: 'Next week' } as RangesState,
  // PORT NOTE: the reference reads today through useSyncExternalStore with a
  // no-op subscribe, which only defers it to the client. The site renders on
  // the client only, so todayDate() is read directly on each render.
  render: ({ state, set, h }: TileContext<RangesState>) => {
    const today = todayDate()
    const first = firstDayOfWeek(state.locale)
    const rtl = state.locale.startsWith('ar')
    const chosen =
      PRESETS.find(entry => entry.label === state.preset) ?? PRESETS[0]!
    const [start, end] = chosen.range(today, first)
    const weeks = monthGrid(start, {
      weekStartsOn: first,
      fixedWeeks: true,
    })

    return h.div([h.Class('lc-ranges')], [
      localeSwitch(h, RANGE_LOCALES, state.locale, next =>
        next === null
          ? set(current => current)
          : set(current => ({ ...current, locale: next })),
      ),
      h.div(
        [h.Class('lc-chips'), h.Role('group'), h.AriaLabel('Out of office')],
        PRESETS.map(entry =>
          h.button(
            [
              h.Type('button'),
              h.Class('lc-chip'),
              h.AriaPressed(entry.label === state.preset ? 'true' : 'false'),
              h.OnClick(set(current => ({ ...current, preset: entry.label }))),
            ],
            [entry.label],
          ),
        ),
      ),
      h.div([h.Class('lc-ranges-out'), h.AriaLive('polite')], [
        h.p(
          [
            h.Class('lc-ranges-dates'),
            ...(rtl ? [h.Dir('rtl')] : []),
          ],
          [
            formatDateRange(start, end, state.locale, {
              weekday: 'short',
              day: 'numeric',
              month: 'short',
            }),
          ],
        ),
        h.p([h.Class('lc-ranges-meta')], [
          [
            `${daysBetween(start, end) + 1} days`,
            isSameMonth(start, end)
              ? formatDate(start, state.locale, { month: 'long' })
              : 'Across two months',
            start === today ? 'From today' : null,
          ]
            .filter((part): part is string => part !== null)
            .join(' \u00b7 '),
        ]),
      ]),
      h.div(
        [
          h.Class('lc-month'),
          h.Dir(rtl ? 'rtl' : 'ltr'),
          h.AriaHidden(true),
        ],
        [
          ...weekdayNames(state.locale, 'narrow', first).map(name =>
            h.span([h.Class('lc-month-weekday')], [name]),
          ),
          ...weeks.flat().map(day =>
            h.span(
              [
                h.Class('lc-month-day'),
                ...(!isSameMonth(day, start)
                  ? [h.DataAttribute('outside', '')]
                  : []),
                ...(day >= start && day <= end
                  ? [h.DataAttribute('in', '')]
                  : []),
                ...(day === start || day === end
                  ? [h.DataAttribute('edge', '')]
                  : []),
                ...(day === today ? [h.DataAttribute('today', '')] : []),
              ],
              [formatDate(day, state.locale, { day: 'numeric' })],
            ),
          ),
        ],
      ),
    ])
  },
}

/* 5. Pasted emails become tokens */

const EMAIL = /^(?:"?([^"<]*?)"?\s*<)?([^\s<>@,;]+@[^\s<>@,;]+\.[a-z]{2,})>?$/i

const emailCodec: TokenCodec = {
  format: token =>
    token.label === token.value
      ? token.value
      : `${token.label} <${token.value}>`,
  escape: (text, next) => (text.trim() ? text : next ? ', ' : ''),
  parse(text) {
    const value: TokenInputValue = []
    for (const piece of text.split(/[,;\n\t]+/)) {
      const trimmed = piece.trim()
      const match = EMAIL.exec(trimmed)
      if (match) {
        const [, name, address] = match
        value.push(
          { type: 'email', value: address!, label: name?.trim() || address! },
          ' ',
        )
      } else if (trimmed) {
        value.push(`${trimmed} `)
      }
    }
    return value
  },
}

const SHEET = `Grace Hopper <grace@navy.mil>
Katherine Johnson <kj@nasa.gov>, alan@bletchley.uk
not-an-email; margaret@apollo.org`

type RecipientsState = { value: TokenInputValue }

const recipientTokenMarkup =
  '<ui-token-input-token class="lc-mail-token">' +
  '<span data-token-label></span>' +
  '<ui-token-input-token-remove class="lc-mail-remove">' +
  '<i class="ph-bold ph-x" style="font-size:11px" aria-hidden="true"></i>' +
  '</ui-token-input-token-remove>' +
  '</ui-token-input-token>'

const recipients = {
  initial: {
    value: fromText('Ada Lovelace <ada@engine.org>', emailCodec),
  } as RecipientsState,
  // PORT NOTE: the reference drives paste and clear through the React
  // TokenInput controller's `insert`/`clear` (one undoable step). The web
  // component's value is controlled here, so both actions rewrite `value`
  // directly; the resulting tokens and text are identical, but the editor's
  // internal undo stack is not involved. Token chips come from a cloned
  // `<template>`, so they lack the reference's per-token `title` tooltip.
  render: ({ state, set, h }: TileContext<RecipientsState>) => {
    const tokenInput = TokenInput.Root.withMessage(h)
    const editor = TokenInput.Editor.withMessage(h)
    const tokens = state.value.filter(part => typeof part !== 'string')
    const stray = state.value
      .filter((part): part is string => typeof part === 'string')
      .join('')
      .trim()

    return h.div([h.Class('lc-mail')], [
      h.div([h.Class('lc-mail-sheet')], [
        h.pre([h.Class('lc-mail-text'), h.Dir('ltr')], [SHEET]),
        h.button(
          [
            h.Type('button'),
            h.Class('b-btn lc-mail-paste'),
            h.OnClick(
              set(current => ({
                value: [...current.value, ...fromText(SHEET, emailCodec)],
              })),
            ),
          ],
          [icon(h, 'clipboard-text', 'bold', 14), 'Paste these'],
        ),
      ]),
      tokenInput(
        [
          tokenInput.Value(state.value),
          tokenInput.Codec(emailCodec),
          tokenInput.OnValuechange(detail =>
            set({
              value: Array.isArray(detail.value)
                ? (detail.value as TokenInputValue)
                : [],
            }),
          ),
        ],
        [
          h.div([h.Class('lc-mail-box')], [
            h.span([h.Class('lc-mail-to'), h.AriaHidden(true)], ['To']),
            editor(
              [
                h.AriaLabel('Recipients'),
                editor.Placeholder('Paste names and emails'),
                h.Class('lc-mail-editor'),
              ],
              [],
            ),
          ]),
          h.template([h.InnerHTML(recipientTokenMarkup)]),
        ],
      ),
      h.p([h.Class('lc-mail-foot'), h.AriaLive('polite')], [
        h.span([], [
          `${tokens.length} ${tokens.length === 1 ? 'recipient' : 'recipients'}`,
          ...(stray
            ? [h.em([], [` \u00b7 \u201c${stray}\u201d isn\u2019t an email`])]
            : []),
        ]),
        h.button(
          [
            h.Type('button'),
            h.Class('lc-mail-clear'),
            h.Disabled(state.value.length === 0),
            h.OnClick(set({ value: [] })),
          ],
          ['Clear'],
        ),
      ]),
      h.p([h.Class('lc-mail-sends'), h.Dir('ltr')], [
        toText(state.value, emailCodec) || ' ',
      ]),
    ])
  },
}

/* 6. An agent fills the form through snapshot and act */

const TEAMS = [
  { value: 'research', label: 'Research' },
  { value: 'design', label: 'Design' },
  { value: 'platform', label: 'Platform' },
  { value: 'growth', label: 'Growth' },
]

const ROLES = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'editor', label: 'Editor' },
  { value: 'admin', label: 'Admin' },
]

const TASK = 'Invite ada@engine.org to Research as an editor, with a welcome.'

type ScriptStep = {
  label: string
  action: string
  args: unknown[]
}

const SCRIPT: ReadonlyArray<ScriptStep> = [
  { label: 'Teammate email', action: 'setValue', args: ['ada@engine.org'] },
  { label: 'Team', action: 'setValue', args: ['Research'] },
  { label: 'Role', action: 'setValue', args: ['Editor'] },
  { label: 'Send welcome email', action: 'setChecked', args: [true] },
  { label: 'Send invite', action: 'press', args: [] },
]

type LogLine = {
  kind: 'task' | 'call' | 'seen' | 'done' | 'error'
  text: string
}

type Agent = ReturnType<typeof createAgent>

// The agent bridge is a live UI SDK object, not app state. Like the reference,
// it is created once and reused, so refs stay stable across runs.
let pageAgent: Agent | undefined
const agentOf = (): Agent => (pageAgent ??= createAgent())

const quoted = (value: unknown) =>
  typeof value === 'string' ? `"${value}"` : String(value)

const snapshotLine = (component: AgentComponent) => {
  const value =
    'checked' in component
      ? quoted(component.checked)
      : 'value' in component
        ? quoted(component.value)
        : null
  return [component.ref, component.component, quoted(component.label), value]
    .filter(Boolean)
    .join(' ')
}

type AgentState = {
  log: ReadonlyArray<LogLine>
  target: string | null
  running: boolean
  sent: string | null
  email: string
  team: string | null
  role: string
  welcome: boolean
}

const emptyAgentState: AgentState = {
  log: [],
  target: null,
  running: false,
  sent: null,
  email: '',
  team: null,
  role: 'viewer',
  welcome: false,
}

const valueOf = (element: Element | null) => {
  const value = (element as { value?: unknown } | null)?.value
  return typeof value === 'string' ? value : null
}

/** Select's value is unknown by contract; the reference only uses strings. */
const valueOfType = (value: unknown) =>
  typeof value === 'string' ? value : null

const checkedOf = (element: Element | null) =>
  (element as { checked?: unknown } | null)?.checked === true

const startAgentRun = (
  element: Element,
  queue: MessageQueue,
  { state, set }: Pick<TileContext<AgentState>, 'state' | 'set'>,
): (() => void) => {
  const host = element.closest('.lc-agent')
  const form = host?.querySelector('form') ?? null
  const log: LogLine[] = [...state.log]
  let target = state.target
  let running = true
  let sent = state.sent
  let cancelled = false
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const wake = new Set<() => void>()

  const pause = (ms: number) =>
    new Promise<void>(resolve => {
      const finish = () => {
        wake.delete(finish)
        resolve()
      }
      const timer = setTimeout(finish, ms)
      timers.add(timer)
      wake.add(finish)
    })

  const readFields = () => {
    const input = host?.querySelector<HTMLInputElement>('input[type="email"]')
    const select = host?.querySelector('ui-select')
    const radio = host?.querySelector('ui-radio-group')
    const toggle = host?.querySelector('ui-switch')
    const sentElement = host?.querySelector('.lc-agent-sent')
    return {
      email: input?.value ?? '',
      team: valueOf(select ?? null),
      role: valueOf(radio ?? null) ?? 'viewer',
      welcome: checkedOf(toggle ?? null),
      sent: sentElement?.textContent?.trim() || null,
    }
  }

  const scrollToEnd = () => {
    requestAnimationFrame(() => {
      const list = host?.querySelector('.lc-agent-log')
      if (list) list.scrollTop = list.scrollHeight
    })
  }

  const emit = () => {
    if (cancelled) return
    const fields = readFields()
    if (fields.sent !== null) sent = fields.sent
    Queue.offerUnsafe(
      queue,
      set({
        log: [...log],
        target,
        running,
        sent,
        email: fields.email,
        team: fields.team,
        role: fields.role,
        welcome: fields.welcome,
      }),
    )
    scrollToEnd()
  }

  const say = (line: LogLine) => {
    log.push(line)
    emit()
  }

  const run = async () => {
    await pause(500)
    if (cancelled) return
    const agent = agentOf()
    say({ kind: 'call', text: 'snapshot()' })
    await pause(350)
    if (cancelled) return

    const mine = new Map<string, AgentComponent>()
    const keep = (found: AgentComponent[]) => {
      for (const component of found) {
        const foundElement = elementOf(component.ref)
        if (
          foundElement &&
          form?.contains(foundElement) &&
          component.label
        ) {
          mine.set(component.label, component)
          say({ kind: 'seen', text: snapshotLine(component) })
        }
      }
    }

    const page = agent.snapshot()
    keep(page)
    const more = page.find(component => component.ref === 'more')
    if (more) {
      say({ kind: 'seen', text: `\u2026${String(more.more)} more on the page` })
    }

    for (const { label } of SCRIPT) {
      if (cancelled) return
      if (!mine.has(label)) {
        say({ kind: 'call', text: `query({ text: ${quoted(label)} })` })
        const found = await agent.query({ text: label })
        keep(Array.isArray(found) ? found : [])
      }
    }

    let completed = true
    for (const step of SCRIPT) {
      await pause(700)
      if (cancelled) return
      const ref = mine.get(step.label)?.ref ?? step.label
      target = step.label
      say({
        kind: 'call',
        text: `act ${ref}.${step.action}(${step.args.map(quoted).join(', ')})`,
      })
      const result = await agent.act({
        steps: [{ ref, action: step.action, args: step.args }],
      })
      if (!result.ok) {
        say({ kind: 'error', text: result.error?.message ?? 'Failed' })
        completed = false
        break
      }
      const changes = result.steps[0]?.changes ?? []
      say({
        kind: 'seen',
        text: changes.length
          ? changes
              .map(change => `${change.key} \u2192 ${quoted(change.value)}`)
              .join(', ')
          : 'pressed',
      })
    }

    await pause(500)
    if (cancelled) return
    if (completed) {
      say({ kind: 'done', text: 'Done. The invite is on its way.' })
    }
    target = null
    running = false
    emit()
  }

  void run()

  return () => {
    cancelled = true
    for (const timer of timers) clearTimeout(timer)
    timers.clear()
    for (const finish of wake) finish()
    wake.clear()
  }
}

// PORT NOTE: the reference remounts the form with a fresh React key at the
// start of each run. Here the form's fields are controlled by this tile's
// state, so the run-start Message writes the same defaults back through the
// bindings. Everything after that runs the real createAgent snapshot/query/act
// script from the reference, with the log and highlight target in the Model.
const agentRun = (context: Pick<TileContext<AgentState>, 'state' | 'set'>) =>
  Mount.defineStream('LocaleAgentRun', {
    messages: [Message],
    execute: ({ element }) =>
      Stream.callback<Message>(queue =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() => startAgentRun(element, queue, context)),
            cleanup => Effect.sync(cleanup),
          )
          return yield* Effect.never
        }),
      ),
  })()

const agent = {
  initial: emptyAgentState as AgentState,
  render: ({ state, set, h }: TileContext<AgentState>) => {
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const input = Input.Root.withMessage(h)
    const select = Select.Root.withMessage(h)
    const selectLabel = Select.Label.withMessage(h)
    const selectTrigger = Select.Trigger.withMessage(h)
    const selectValue = Select.Value.withMessage(h)
    const selectContent = Select.Content.withMessage(h)
    const selectItem = Select.Item.withMessage(h)
    const selectItemIndicator = Select.ItemIndicator.withMessage(h)
    const radioGroup = Radio.Group.withMessage(h)
    const radio = Radio.Root.withMessage(h)
    const radioIndicator = Radio.Indicator.withMessage(h)
    const switchRoot = Switch.Root.withMessage(h)
    const switchThumb = Switch.Thumb.withMessage(h)
    const uiButton = Button.Root.withMessage(h)

    return h.div([h.Class('lc-agent')], [
      h.form(
        [h.Class('lc-agent-form'), h.OnSubmit(set(current => current))],
        [
          h.p([h.Class('lc-agent-title')], ['Invite a teammate']),
          field(
            [
              field.Name('email'),
              h.Class('lc-agent-field'),
              ...(state.target === 'Teammate email'
                ? [h.DataAttribute('target', '')]
                : []),
            ],
            [
              fieldLabel([h.Class('b-label')], ['Teammate email']),
              input(
                [
                  input.Value(state.email),
                  input.OnValuechange(detail =>
                    set(current => ({ ...current, email: detail.value })),
                  ),
                ],
                [
                  h.input([
                    h.Class('b-input'),
                    h.Type('email'),
                    h.Placeholder('name@company.com'),
                    h.Autocomplete('off'),
                  ]),
                ],
              ),
            ],
          ),
          h.div(
            [
              h.Class('lc-agent-field'),
              ...(state.target === 'Team'
                ? [h.DataAttribute('target', '')]
                : []),
            ],
            [
              select(
                [
                  select.Name('team'),
                  select.Items(TEAMS),
                  select.Placeholder('Choose a team'),
                  select.Value(state.team),
                  select.OnValuechange(detail =>
                    set(current => ({ ...current, team: valueOfType(detail.value) })),
                  ),
                ],
                [
                  selectLabel([h.Class('b-label')], ['Team']),
                  selectTrigger([], [
                    h.button(
                      [h.Type('button'), h.Class('b-input lc-agent-trigger')],
                      [
                        selectValue([], []),
                        icon(h, 'caret-down', 'bold', 14),
                      ],
                    ),
                  ]),
                  selectContent(
                    [h.Class('b-pop lc-agent-pop'), selectContent.SideOffset(6)],
                    TEAMS.map(team =>
                      selectItem(
                        [
                          selectItem.Value(team.value),
                          h.Class('b-item lc-agent-option'),
                        ],
                        [
                          team.label,
                          selectItemIndicator([h.Class('lc-agent-check')], [
                            icon(h, 'check', 'bold', 14),
                          ]),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          h.div(
            [
              h.Class('lc-agent-field'),
              ...(state.target === 'Role'
                ? [h.DataAttribute('target', '')]
                : []),
            ],
            [
              h.span([h.Class('b-label'), h.Id('lc-agent-role-label')], ['Role']),
              radioGroup(
                [
                  radioGroup.Name('role'),
                  radioGroup.Value(state.role),
                  h.Class('lc-agent-roles'),
                  h.AriaLabelledBy('lc-agent-role-label'),
                  radioGroup.OnValuechange(detail =>
                    set(current => ({
                      ...current,
                      role: detail.value ?? current.role,
                    })),
                  ),
                ],
                ROLES.map(entry =>
                  h.label([h.Class('lc-agent-role')], [
                    radio(
                      [radio.Value(entry.value), h.Class('lc-agent-radio')],
                      [radioIndicator([h.Class('lc-agent-radio-dot')], [])],
                    ),
                    entry.label,
                  ]),
                ),
              ),
            ],
          ),
          h.label(
            [
              h.Class('lc-agent-field lc-agent-welcome'),
              ...(state.target === 'Send welcome email'
                ? [h.DataAttribute('target', '')]
                : []),
            ],
            [
              'Send welcome email',
              switchRoot(
                [
                  switchRoot.Name('welcome'),
                  switchRoot.Checked(state.welcome),
                  h.Class('lc-agent-switch'),
                  switchRoot.OnCheckedchange(detail =>
                    set(current => ({ ...current, welcome: detail.value })),
                  ),
                ],
                [switchThumb([h.Class('lc-agent-thumb')], [])],
              ),
            ],
          ),
          h.div(
            [
              h.Class('lc-agent-submit'),
              ...(state.target === 'Send invite'
                ? [h.DataAttribute('target', '')]
                : []),
            ],
            [
              uiButton([], [
                h.button(
                  [
                    h.Type('button'),
                    h.Class('b-btn'),
                    h.DataAttribute('variant', 'primary'),
                    h.OnClick(
                      set(current => ({
                        ...current,
                        sent: current.email
                          ? `Sent to ${current.email}`
                          : 'Add an email first',
                      })),
                    ),
                  ],
                  ['Send invite'],
                ),
              ]),
              h.span([h.Class('lc-agent-sent'), h.AriaLive('polite')], [
                state.sent ?? '',
              ]),
            ],
          ),
        ],
      ),
      h.section([h.Class('lc-agent-console'), h.AriaLabel('Agent')], [
        h.header([h.Class('lc-agent-head')], [
          icon(h, 'robot', 'fill'),
          h.span([], ['Scripted agent']),
          h.button(
            [
              h.Type('button'),
              h.Class('lc-agent-run'),
              h.Disabled(state.running),
              h.OnClick(
                set({
                  log: [{ kind: 'task', text: TASK }],
                  target: null,
                  running: true,
                  sent: null,
                  email: '',
                  team: null,
                  role: 'viewer',
                  welcome: false,
                }),
              ),
            ],
            [
              state.log.length
                ? icon(h, 'arrow-counter-clockwise', 'bold', 13)
                : icon(h, 'play', 'fill', 13),
              state.running
                ? 'Running'
                : state.log.length
                  ? 'Run again'
                  : 'Run',
            ],
          ),
        ]),
        h.ol(
          [
            h.Class('lc-agent-log'),
            h.Dir('ltr'),
            h.AriaLive('polite'),
          ],
          state.log.length
            ? state.log.map(line =>
                h.li([h.DataAttribute('kind', line.kind)], [line.text]),
              )
            : [
                h.li([h.DataAttribute('kind', 'hint')], [
                  'Run reads the form with snapshot(), then fills it with act().',
                ]),
              ],
        ),
      ]),
      state.running
        ? h.div(
            [
              h.Style({ display: 'none' }),
              h.OnMount(agentRun({ state, set })),
            ],
            [],
          )
        : '',
    ])
  },
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'language-amount',
    title: 'Type 1.234,5 in German.',
    blurb: 'Each locale reads its own separators.',
    initial: amount.initial,
    render: amount.render,
  },
  {
    id: 'language-price',
    title: 'Big dollars, small cents.',
    blurb: 'A price styled from its parts.',
    tone: 'butter',
    initial: price.initial,
    render: price.render,
  },
  {
    id: 'language-hours',
    title: 'Snap to a quarter.',
    blurb: 'A dial on the step grid, by drag or arrows.',
    tone: 'ink',
    initial: hours.initial,
    render: hours.render,
  },
  {
    id: 'language-ranges',
    title: 'This week, next month.',
    blurb: "Quick ranges that start where the locale's week does.",
    size: 'tall',
    tone: 'sage',
    initial: ranges.initial,
    render: ranges.render,
  },
  {
    id: 'language-recipients',
    title: 'Paste a list of emails.',
    blurb: 'A codec turns pasted text into tokens.',
    size: 'wide',
    tone: 'sky',
    initial: recipients.initial,
    render: recipients.render,
  },
  {
    id: 'language-agent',
    title: 'Let the agent fill it.',
    blurb: 'A scripted agent reads the form and acts through its api.',
    size: 'large',
    initial: agent.initial,
    render: agent.render,
  },
]
