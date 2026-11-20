import { Effect, Option, Queue, Stream } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { MountAction } from 'foldkit/mount'

import { Slider } from 'foldkit-ui-sdk'

import { bindDrag, dragThreshold, nearestInDirection } from '@ui-sdk/core'
import {
  createVelocityTracker,
  rubberBand,
  solveSpring,
} from '@ui-sdk/core/gesture'
import {
  clamp,
  scrubTo,
  stepBy,
  stepFromKey,
  type NumberRange,
} from '@ui-sdk/core/number'

import type { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './drag.css'

const icon = (
  h: HtmlBuilder<Message>,
  name: string,
  weight: 'regular' | 'fill' | 'bold' = 'regular',
  size = 16,
  // PORT NOTE: the reference's icons were SVGs, and drag.css tints some of them
  // through `... svg` rules. The port renders the web font instead, so the same
  // color is passed inline where a rule targeted the SVG.
  color?: string,
) =>
  h.i(
    [
      h.Class(`ph${weight === 'regular' ? '' : `-${weight}`} ph-${name}`),
      h.Style({
        fontSize: `${size}px`,
        ...(color ? { color, flex: 'none' } : {}),
      }),
      h.Attribute('aria-hidden', 'true'),
    ],
    [],
  )

const labelIcon = (
  h: HtmlBuilder<Message>,
  name: string,
  weight: 'regular' | 'fill' | 'bold',
  size: number,
  label: string,
  color?: string,
) =>
  h.i(
    [
      h.Class(`ph${weight === 'regular' ? '' : `-${weight}`} ph-${name}`),
      h.Style({
        fontSize: `${size}px`,
        ...(color ? { color, flex: 'none' } : {}),
      }),
      h.Attribute('role', 'img'),
      h.Attribute('aria-label', label),
    ],
    [],
  )

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Runs a 1D spring from `from` to `to`, painting each frame. Jumps to the end with reduced motion. */
const spring = (
  from: number,
  to: number,
  velocity: number,
  paint: (value: number) => void,
  { response = 0.42, damping = 0.82 } = {},
) => {
  if (reduced() || Math.abs(from - to) < 0.5) {
    paint(to)
    return () => {}
  }
  const solver = solveSpring(response, damping, from - to, velocity)
  const start = performance.now()
  let frame = 0
  const tick = (now: number) => {
    const t = now - start
    const offset = solver.position(t)
    if (
      (Math.abs(offset) < 0.3 && Math.abs(solver.velocity(t)) < 0.01) ||
      t > 1500
    ) {
      return paint(to)
    }
    paint(to + offset)
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

/*
 * Every gesture here starts from a native pointer event, and Foldkit's
 * `OnMount` is the only place a native listener can live. The Model still owns
 * every value: the listeners look up the latest `state`/`set` pair the render
 * published, then dispatch `set(next)` through the mount's stream.
 *
 * PORT NOTE: a Mount runs once, so the `set` captured by its closure would
 * resolve functional updates against the first render's state. The render
 * publishes its current pair here instead, and each listener reads the latest
 * pair before it dispatches a whole next state. `live` mirrors the Model; it
 * never becomes the source of truth.
 */
type LiveState = {
  state: any
  set: (next: any) => Message
}

const live = new Map<string, LiveState>()

// PORT NOTE: `definePrimitive`, `createConnect`, `createLasso` and
// `createResize` need a UI SDK primitive store; a Foldkit tile only has the
// Model. Their observable behavior is rebuilt below from `bindDrag` and plain
// state transitions, keeping the same geometry, thresholds and attributes.
const publish = (id: string, state: unknown, set: (next: any) => Message) => {
  live.set(id, { state, set })
}

const latest = <S,>(id: string) =>
  live.get(id) as unknown as { state: S; set: (next: S) => Message }

const onGesture = (
  name: string,
  setup: (
    element: HTMLElement,
    send: (message: Message) => void,
  ) => () => void,
): MountAction<Message> => ({
  name,
  f: element =>
    Stream.callback<Message>(queue =>
      Effect.gen(function* () {
        yield* Effect.acquireRelease(
          Effect.sync(() =>
            setup(element as HTMLElement, message =>
              Queue.offerUnsafe(queue, message),
            ),
          ),
          cleanup => Effect.sync(cleanup),
        )
      }),
    ),
})

/* 1. The dragging sidebar: resize between a min and max, ease into collapsing below it */

type SidebarState = {
  width: number
  opened: number
  draft: number | null
  landing: number | null
  room: number
}

const sidebarLimits = (room: number) =>
  room < 440
    ? { min: 112, max: clamp(room - 132, 128, 190) }
    : { min: 168, max: clamp(room - 236, 200, 300) }

type WidthAt = { value: number; point: number | undefined }

const widthAt = (
  pointer: number,
  { min, max }: { min: number; max: number },
): WidthAt =>
  pointer >= min
    ? { value: Math.min(max, Math.round(pointer)), point: undefined }
    : scrubTo(
        pointer,
        {
          min: 0,
          max: min,
          step: 1,
          snap: { points: [0, min], threshold: min / 2 },
        },
        { ease: true },
      )

const NAV = [
  { label: 'All notes', iconName: 'note-pencil', count: 24, active: false },
  { label: 'Field logs', iconName: 'notebook', count: 9, active: true },
  { label: 'Specimens', iconName: 'images', count: 31, active: false },
  { label: 'Site maps', iconName: 'map-trifold', count: 4, active: false },
]

const COUNTS = [3, 4, 4, 6, 8, 7, 11, 12, 14]

const sidebarHint = (
  shown: number,
  committed: number,
  landing: number | null,
  dragging: boolean,
  min: number,
) => {
  if (landing === 0) {
    return { text: 'Release to collapse', tone: 'fold' }
  }
  if (landing) {
    return {
      text: committed
        ? `Release to rest at ${min} px`
        : `Release to open at ${min} px`,
      tone: 'open',
    }
  }
  if (dragging) {
    return { text: `${shown} px`, tone: 'size' }
  }
  if (!committed) {
    return { text: 'Drag the edge right to open', tone: 'idle' }
  }
  return { text: 'Drag the edge, or press Enter on it', tone: 'idle' }
}

const sidebarMount = onGesture('DragSidebar', (root, send) => {
  let stop: (() => void) | undefined
  let first = true

  // The tile's own width decides the sidebar's limits. A phone-sized stage
  // starts narrower, so the note still reads.
  const write = () => {
    const room = root.clientWidth
    if (!room) {
      return
    }
    const { state, set } = latest<SidebarState>('drag-sidebar')
    const { min, max } = sidebarLimits(room)
    const start = first && room < 440 ? min + 28 : state.width
    const reopen = first && start ? start : state.opened
    first = false
    send(
      set({
        room,
        width: start ? clamp(start, min, max) : 0,
        opened: clamp(reopen, min, max),
        draft: state.draft,
        landing: state.landing,
      }),
    )
  }
  const observer = new ResizeObserver(write)
  observer.observe(root)
  write()

  const handle = root.querySelector<HTMLElement>('.dg-side-handle')

  const pointerdown = (event: PointerEvent) => {
    if (event.button !== 0 || !handle) {
      return
    }
    stop?.()
    const room = root.clientWidth
    const limits = sidebarLimits(room)
    const left = root.getBoundingClientRect().left + root.clientLeft
    // Where on the handle it was grabbed, so the edge doesn't jump to the pointer.
    const grab = event.clientX - left - latest<SidebarState>('drag-sidebar').state.width
    stop = bindDrag(handle, event, {
      threshold: dragThreshold,
      cancelOnEscape: true,
      onMove: ({ x }) => {
        const { state, set } = latest<SidebarState>('drag-sidebar')
        const { value, point } = widthAt(x - left - grab, limits)
        send(set({ ...state, room, draft: value, landing: point ?? null }))
      },
      onEnd: (_end, canceled) => {
        stop = undefined
        const { state, set } = latest<SidebarState>('drag-sidebar')
        const { draft, landing } = state
        const next: SidebarState = {
          ...state,
          room,
          draft: null,
          landing: null,
        }
        if (!canceled && draft !== null) {
          const width = Math.round(landing ?? draft)
          next.width = width
          if (width) {
            next.opened = width
          }
        }
        send(set(next))
      },
    })
  }

  handle?.addEventListener('pointerdown', pointerdown)
  return () => {
    stop?.()
    handle?.removeEventListener('pointerdown', pointerdown)
    observer.disconnect()
  }
})

const sidebar: Tile<SidebarState> = {
  id: 'drag-sidebar',
  title: 'Fold the sidebar.',
  blurb: 'Drag below its minimum and it eases shut.',
  size: 'large',
  initial: { width: 216, opened: 216, draft: null, landing: null, room: 560 },
  render: ({ state, set, h }) => {
    publish('drag-sidebar', state, set)
    const limits = sidebarLimits(state.room)
    const shown = Math.round(state.draft ?? state.width)
    const hint = sidebarHint(
      shown,
      state.width,
      state.landing,
      state.draft !== null,
      limits.min,
    )
    const resize = (width: number): SidebarState =>
      width
        ? { ...state, width, opened: width }
        : { ...state, width: 0 }

    const onEdgeKey = (key: string, modifiers: { shiftKey: boolean }) => {
      const { width, opened } = state
      const step = modifiers.shiftKey ? 48 : 16
      const next =
        key === 'Enter'
          ? width
            ? 0
            : opened
          : key === 'ArrowLeft'
            ? width - step < limits.min
              ? 0
              : width - step
            : key === 'ArrowRight'
              ? width
                ? Math.min(limits.max, width + step)
                : limits.min
              : key === 'Home'
                ? 0
                : key === 'End'
                  ? limits.max
                  : undefined
      return next === undefined
        ? Option.none()
        : Option.some(set(resize(next)))
    }

    return h.div([h.Class('dg-fill')], [
      h.div(
        [
          h.Class('dg-side'),
          h.Style({
            '--dg-side': `${shown}px`,
            '--dg-side-min': `${limits.min}px`,
          }),
          ...(shown === 0 ? [h.DataAttribute('collapsed', '')] : []),
          ...(state.draft !== null
            ? [h.DataAttribute('dragging', '')]
            : []),
          ...(state.landing === null
            ? []
            : [
                h.DataAttribute(
                  'data-landing',
                  state.landing ? 'open' : 'collapsed',
                ),
              ]),
          h.OnMount(sidebarMount),
        ],
        [
          h.nav(
            [
              h.Class('dg-side-nav'),
              h.Attribute('aria-label', 'Notebook'),
              h.Inert(state.width === 0 && state.draft === null),
            ],
            [
              h.div([h.Class('dg-side-inner')], [
                h.p([h.Class('dg-side-space')], [
                  h.span([h.Class('dg-side-mark'), h.Attribute('aria-hidden', 'true')], [
                    icon(h, 'waves', 'fill'),
                  ]),
                  'Cove survey',
                ]),
                h.ul(
                  [h.Class('dg-side-list')],
                  NAV.map(item =>
                    h.li(
                      [
                        h.Class('dg-side-item'),
                        ...(item.active
                          ? [h.DataAttribute('active', '')]
                          : []),
                      ],
                      [
                        icon(
                          h,
                          item.iconName,
                          'fill',
                          16,
                          item.active
                            ? 'var(--tile-accent)'
                            : 'var(--tile-ink-3)',
                        ),
                        h.span([h.Class('dg-side-label')], [item.label]),
                        h.span([h.Class('dg-side-count')], [String(item.count)]),
                      ],
                    ),
                  ),
                ),
              ]),
            ],
          ),
          h.div(
            [
              h.Class('dg-side-handle'),
              h.Attribute('role', 'separator'),
              h.Attribute('tabindex', '0'),
              h.Attribute('aria-label', 'Resize sidebar'),
              h.Attribute('aria-orientation', 'vertical'),
              h.Attribute('aria-valuenow', String(shown)),
              h.Attribute('aria-valuemin', '0'),
              h.Attribute('aria-valuemax', String(limits.max)),
              h.Attribute(
                'aria-valuetext',
                shown ? `${shown} pixels` : 'Collapsed',
              ),
              h.Attribute(
                'aria-keyshortcuts',
                'Enter ArrowLeft ArrowRight',
              ),
              ...(shown === 0
                ? [h.DataAttribute('edge', 'closed')]
                : shown >= limits.max
                  ? [h.DataAttribute('edge', 'max')]
                  : shown <= limits.min
                    ? [h.DataAttribute('edge', 'min')]
                    : []),
              h.Style({ touchAction: 'none' }),
              h.OnKeyDownPreventDefault(onEdgeKey),
            ],
            [h.span([h.Class('dg-side-grip'), h.Attribute('aria-hidden', 'true')], [])],
          ),
          h.section([h.Class('dg-side-main'), h.Attribute('aria-label', 'Note')], [
            h.header([h.Class('dg-side-bar')], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('dg-side-toggle'),
                  h.Attribute(
                    'aria-label',
                    state.width ? 'Hide sidebar' : 'Show sidebar',
                  ),
                  h.Attribute('aria-expanded', String(state.width > 0)),
                  h.OnClick(set(resize(state.width ? 0 : state.opened))),
                ],
                [icon(h, 'sidebar-simple', 'fill')],
              ),
              h.span([h.Class('dg-side-crumb')], ['Field logs']),
              h.span(
                [
                  h.Class('dg-side-width'),
                  ...(shown === 0 ? [h.DataAttribute('hidden', '')] : []),
                ],
                [shown ? `${shown} px` : 'Hidden'],
              ),
            ]),
            h.article([h.Class('dg-side-doc')], [
              h.p([h.Class('dg-side-meta')], ['Nov 3 · Low tide 06:42']),
              h.h3([h.Class('dg-side-title')], ['Ochre sea stars return']),
              h.p([h.Class('dg-side-text')], [
                'Fourteen adults on the north ledge of transect B, up from three in March. Most sit just under the kelp line, out of the afternoon sun.',
              ]),
              h.figure([h.Class('dg-side-chart')], [
                h.span([h.Class('dg-side-bars'), h.Attribute('aria-hidden', 'true')], [
                  ...COUNTS.map(count =>
                    h.span([h.Style({ height: `${(count / 14) * 100}%` })], []),
                  ),
                ]),
                h.figcaption([], ['Adults counted, March to November']),
              ]),
            ]),
            h.p(
              [
                h.Class('dg-side-hint'),
                h.DataAttribute('tone', hint.tone),
                h.Attribute('aria-live', 'polite'),
              ],
              [hint.text],
            ),
          ]),
        ],
      ),
    ])
  },
}

/* 2. Swipe to dismiss: a live state shows whether letting go dismisses */

type ToastKind = {
  id: string
  iconName: string
  hue: number
  title: string
  body: string
  time: string
}

const TOASTS: ReadonlyArray<ToastKind> = [
  {
    id: 'build',
    iconName: 'check-circle',
    hue: 150,
    title: 'Build passed',
    body: 'web-app · main · 2m 14s',
    time: 'now',
  },
  {
    id: 'comment',
    iconName: 'chat-circle',
    hue: 250,
    title: 'Mara Ilunga',
    body: 'Can we move the legend under the map?',
    time: '4m',
  },
  {
    id: 'payout',
    iconName: 'credit-card',
    hue: 75,
    title: 'Payout sent',
    body: '$2,316.40 to account ending 0932',
    time: '1h',
  },
]

const DISMISS_AT = 0.3

type ToastRow = {
  id: string
  offset: number
  dragging: boolean
  dismissing: boolean
  leaving: boolean
}

type ToastsState = {
  rows: ReadonlyArray<ToastRow>
  returned: boolean
  round: number
}

const initialToasts = (): ToastsState => ({
  rows: TOASTS.map(toast => ({
    id: toast.id,
    offset: 0,
    dragging: false,
    dismissing: false,
    leaving: false,
  })),
  returned: false,
  round: 0,
})

// PORT NOTE: the reference dismissed a toast from the component that owned it
// and re-focused its neighbour from a layout effect. Here the list's one mount
// owns the leave timers and the focus hand-off; the row itself is pure markup.
const toastMount = onGesture('DragToasts', (root, send) => {
  let stopDrag: (() => void) | undefined
  const timers = new Set<number>()
  const list = root.querySelector<HTMLElement>('.dg-toasts-list')!

  const rowIdAt = (row: Element | null) => {
    if (!row) {
      return undefined
    }
    const rows = Array.from(list.children).filter(child =>
      child.classList.contains('dg-toast-row'),
    )
    const index = rows.indexOf(row)
    const { state } = latest<ToastsState>('drag-toasts')
    return index < 0 ? undefined : state.rows[index]?.id
  }

  const patchRow = (id: string, patch: (row: ToastRow) => ToastRow) => {
    const { state, set } = latest<ToastsState>('drag-toasts')
    send(
      set({
        ...state,
        rows: state.rows.map(row => (row.id === id ? patch(row) : row)),
      }),
    )
  }

  const refocus = (index: number) => {
    window.setTimeout(() => {
      const buttons = list.querySelectorAll<HTMLButtonElement>('.dg-toast-close')
      const next = buttons[Math.min(index, buttons.length - 1)]
      const again = root.querySelector<HTMLButtonElement>('.dg-toasts-again')
      ;(next ?? again)?.focus()
    }, 0)
  }

  const dismiss = (
    id: string,
    side: number,
    byButton: boolean,
    width: number,
  ) => {
    const { state } = latest<ToastsState>('drag-toasts')
    const index = state.rows.findIndex(row => row.id === id)
    patchRow(id, row => ({
      ...row,
      offset: (side || 1) * (width + 16),
      dragging: false,
      dismissing: false,
      leaving: true,
    }))
    const timer = window.setTimeout(
      () => {
        timers.delete(timer)
        const { state: current, set } = latest<ToastsState>('drag-toasts')
        send(
          set({
            ...current,
            rows: current.rows.filter(row => row.id !== id),
          }),
        )
        if (byButton) {
          refocus(index)
        }
      },
      reduced() ? 0 : 440,
    )
    timers.add(timer)
  }

  const pointerdown = (event: PointerEvent) => {
    const target = event.target as Element | null
    if (!target || event.button !== 0 || target.closest('button')) {
      return
    }
    const card = target.closest<HTMLElement>('.dg-toast')
    if (!card) {
      return
    }
    const id = rowIdAt(card.closest('.dg-toast-row'))
    if (!id) {
      return
    }
    const row = latest<ToastsState>('drag-toasts').state.rows.find(
      candidate => candidate.id === id,
    )
    if (!row || row.leaving) {
      return
    }
    const width = card.offsetWidth
    // One snap point at 0: within 30% of the width there's a point to go back to; past it, none.
    const keeps: NumberRange = {
      min: -width * 2,
      max: width * 2,
      step: 1,
      snap: { points: [0], threshold: width * DISMISS_AT },
    }
    const startX = event.clientX
    let moved = 0
    stopDrag?.()
    stopDrag = bindDrag(card, event, {
      threshold: dragThreshold,
      cancelOnEscape: true,
      onStart: () => patchRow(id, current => ({ ...current, dragging: true })),
      onMove: ({ x }) => {
        moved = x - startX
        const dismissing = scrubTo(moved, keeps).point === undefined
        patchRow(id, current => ({
          ...current,
          offset: moved,
          dismissing,
        }))
      },
      onEnd: (_end, canceled) => {
        stopDrag = undefined
        patchRow(id, current => ({
          ...current,
          dragging: false,
          dismissing: false,
        }))
        if (!canceled && scrubTo(moved, keeps).point === undefined) {
          dismiss(id, Math.sign(moved), false, width)
        } else {
          patchRow(id, current => ({ ...current, offset: 0 }))
        }
      },
    })
  }

  const showAgain = () => {
    for (const timer of timers) {
      window.clearTimeout(timer)
    }
    timers.clear()
    const { state, set } = latest<ToastsState>('drag-toasts')
    send(set({ ...initialToasts(), returned: true, round: state.round + 1 }))
  }

  const click = (event: MouseEvent) => {
    const target = event.target as Element | null
    if (!target) {
      return
    }
    if (target.closest('.dg-toasts-again')) {
      showAgain()
      return
    }
    const close = target.closest('.dg-toast-close')
    if (!close) {
      return
    }
    const card = close.closest<HTMLElement>('.dg-toast')
    const id = rowIdAt(close.closest('.dg-toast-row'))
    if (!id) {
      return
    }
    dismiss(id, 1, true, card?.offsetWidth ?? 260)
  }

  list.addEventListener('pointerdown', pointerdown)
  root.addEventListener('click', click)
  return () => {
    stopDrag?.()
    for (const timer of timers) {
      window.clearTimeout(timer)
    }
    timers.clear()
    list.removeEventListener('pointerdown', pointerdown)
    root.removeEventListener('click', click)
  }
})

const toasts: Tile<ToastsState> = {
  id: 'drag-toasts',
  title: 'Swipe a toast away.',
  blurb: 'Past a third, letting go dismisses it.',
  size: 'tall',
  tone: 'sky',
  initial: initialToasts(),
  render: ({ state, set, h }) => {
    publish('drag-toasts', state, set)
    const missing = TOASTS.length - state.rows.length
    const rowChildren = (current: ToastRow) => {
      const toast = TOASTS.find(candidate => candidate.id === current.id)!
      const side = current.offset < 0 ? 'end' : 'start'
      return [
        h.div([h.Class('dg-toast-slot')], [
          h.div(
            [
              h.Class('dg-toast-behind'),
              h.Attribute('aria-hidden', 'true'),
              h.DataAttribute('side', side),
              ...(current.dismissing || current.leaving
                ? [h.DataAttribute('dismissing', '')]
                : []),
              h.Style({
                width: `${Math.abs(current.offset) + 18}px`,
                ...(current.offset === 0 && !current.dragging
                  ? { visibility: 'hidden' }
                  : {}),
              }),
            ],
            [
              h.span([], [
                current.dismissing || current.leaving
                  ? 'Release to dismiss'
                  : 'Dismiss',
              ]),
            ],
          ),
          h.div(
            [
              h.Class('dg-toast'),
              ...(current.dragging
                ? [h.DataAttribute('dragging', '')]
                : []),
              ...(current.dismissing
                ? [h.DataAttribute('dismissing', '')]
                : []),
              h.Style({ translate: `${current.offset}px 0` }),
            ],
            [
              h.span(
                [
                  h.Class('dg-toast-icon'),
                  h.Style({ '--dg-hue': String(toast.hue) }),
                  h.Attribute('aria-hidden', 'true'),
                ],
                [icon(h, toast.iconName, 'fill')],
              ),
              h.span([h.Class('dg-toast-text')], [
                h.span([h.Class('dg-toast-head')], [
                  h.span([h.Class('dg-toast-title')], [toast.title]),
                  h.span([h.Class('dg-toast-time')], [toast.time]),
                ]),
                h.span([h.Class('dg-toast-body')], [toast.body]),
              ]),
              h.button(
                [
                  h.Type('button'),
                  h.Class('dg-toast-close'),
                  h.Attribute('aria-label', `Dismiss ${toast.title}`),
                ],
                [icon(h, 'x', 'bold', 14)],
              ),
            ],
          ),
        ]),
      ]
    }
    return h.div(
      [
        h.Class('dg-toasts'),
        ...(state.returned ? [h.DataAttribute('round', '')] : []),
        h.OnMount(toastMount),
      ],
      [
        h.header([h.Class('dg-toasts-head')], [
          h.p([h.Class('dg-toasts-time')], ['8:15']),
          h.p([h.Class('dg-toasts-date')], ['Tuesday, November 3']),
        ]),
        h.ul(
          [h.Class('dg-toasts-list'), h.Attribute('aria-label', 'Notifications')],
          [
            ...state.rows.map(current =>
              h.keyed('li')(
                `${current.id}-${state.round}`,
                [
                  h.Class('dg-toast-row'),
                  ...(current.leaving
                    ? [h.DataAttribute('leaving', '')]
                    : []),
                ],
                rowChildren(current),
              ),
            ),
            state.rows.length === 0
              ? h.keyed('li')('empty', [h.Class('dg-toasts-empty')], [
                  'Nothing new since 8:00',
                ])
              : '',
          ],
        ),
        h.button(
          [
            h.Type('button'),
            h.Class('b-btn dg-toasts-again'),
            ...(missing ? [h.DataAttribute('shown', '')] : []),
            h.Attribute('tabindex', missing ? '0' : '-1'),
            ...(missing ? [] : [h.Attribute('aria-hidden', 'true')]),
          ],
          [icon(h, 'arrow-counter-clockwise', 'bold'), ' Show again'],
        ),
      ],
    )
  },
}

/* 3. Reorder tabs: slot edges are snap points, the others slide aside */

const FILES = {
  button: {
    name: 'Button.tsx',
    iconName: 'file-tsx',
    path: 'src/components',
    line: 'export function Button({ tone = "neutral" }) {',
  },
  tokens: {
    name: 'tokens.css',
    iconName: 'file-css',
    path: 'src/styles',
    line: '--radius-control: 10px;',
  },
  changelog: {
    name: 'CHANGES.md',
    iconName: 'file-md',
    path: 'docs',
    line: '## 2.4.0 · Focus rings follow the accent',
  },
  vite: {
    name: 'index.ts',
    iconName: 'file-ts',
    path: 'src',
    line: 'export { Button } from "./components/Button"',
  },
  tsconfig: {
    name: 'tsconfig.json',
    iconName: 'brackets-curly',
    path: 'app',
    line: '"moduleResolution": "bundler",',
  },
}

type FileKey = keyof typeof FILES

type TabDrag = {
  key: FileKey
  left: number
  target: number
  others: FileKey[]
  widths: Record<string, number>
}

type TabsState = {
  order: FileKey[]
  selected: FileKey
  drag: TabDrag | null
}

const TAB_GAP = 2
const TAB_PAD = 3

const insert = <T,>(others: T[], key: T, at: number): T[] => [
  ...others.slice(0, at),
  key,
  ...others.slice(at),
]

const nearestIndex = (points: number[], value: number) =>
  points.reduce(
    (best, point, index) =>
      Math.abs(point - value) < Math.abs(points[best] - value) ? index : best,
    0,
  )

const lefts = (order: ReadonlyArray<FileKey>, widths: Record<string, number>) =>
  order.reduce<number[]>(
    (all, _key, index) => [
      ...all,
      index ? all[index - 1] + widths[order[index - 1]] + TAB_GAP : 0,
    ],
    [],
  )

/** A line of code, with strings and a few keywords tinted. */
const code = (h: HtmlBuilder<Message>, text: string) => {
  const pieces: Array<Html | string> = []
  text.split(/("[^"]*")/).forEach(piece => {
    if (piece.startsWith('"')) {
      pieces.push(h.span([h.Class('dg-code-string')], [piece]))
    } else {
      piece.split(/\b(export|default|function)\b/).forEach(word => {
        pieces.push(
          /^(export|default|function)$/.test(word)
            ? h.span([h.Class('dg-code-key')], [word])
            : word,
        )
      })
    }
  })
  return h.code([h.Class('dg-code')], pieces)
}

const tabKeyOf = (element: Element) =>
  element.id.startsWith('dg-tab-')
    ? (element.id.slice('dg-tab-'.length) as FileKey)
    : undefined

const tabMount = onGesture('DragTabs', (list, send) => {
  let stop: (() => void) | undefined

  const widthsOf = (root: HTMLElement) => {
    const widths: Record<string, number> = {}
    root.querySelectorAll<HTMLElement>('.dg-tab').forEach(element => {
      const key = tabKeyOf(element)
      if (key) {
        widths[key] = element.getBoundingClientRect().width
      }
    })
    return widths
  }

  const measure = () => {
    const found = new Map<FileKey, number>()
    list.querySelectorAll<HTMLElement>('.dg-tab').forEach(element => {
      const key = tabKeyOf(element)
      if (key) {
        found.set(key, element.offsetLeft)
      }
    })
    return found
  }

  // Tabs that changed place slide there, so a drop or an Alt+arrow move settles instead of jumping.
  const commit = (
    nextOrder: FileKey[],
    focus?: FileKey,
    before = measure(),
  ) => {
    const { state, set } = latest<TabsState>('drag-tabs')
    send(set({ ...state, order: nextOrder, drag: null }))
    requestAnimationFrame(() => {
      list.querySelectorAll<HTMLElement>('.dg-tab').forEach(element => {
        const key = tabKeyOf(element)
        if (!key) {
          return
        }
        if (focus === key) {
          element.focus()
        }
        const was = before.get(key)
        const at = element.offsetLeft
        if (reduced() || was === undefined || Math.abs(was - at) < 0.5) {
          return
        }
        element.animate([{ translate: `${was - at}px 0` }, { translate: '0 0' }], {
          duration: 220,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
        })
      })
    })
  }

  const pointerdown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return
    }
    const tab = (event.target as Element | null)?.closest<HTMLElement>('.dg-tab')
    if (!tab) {
      return
    }
    const key = tabKeyOf(tab)
    if (!key) {
      return
    }
    const { state } = latest<TabsState>('drag-tabs')
    const order = state.order
    const widths = widthsOf(list)
    const others = order.filter(candidate => candidate !== key)
    const slots = lefts([...others, key], widths)
    const start = lefts(order, widths)[order.indexOf(key)] - event.clientX
    // Before the tabs turn absolute, remember where they rested so a drop can slide from there.
    const flow = measure()
    let latestDrag: TabDrag | null = null
    stop?.()
    stop = bindDrag(tab, event, {
      threshold: dragThreshold,
      cancelOnEscape: true,
      onMove: ({ x, event: move }) => {
        const { value: left } = scrubTo(
          start + x,
          {
            min: 0,
            max: slots[slots.length - 1],
            step: 1,
            snap: { points: slots, threshold: 12 },
          },
          { snap: !(move.metaKey || move.ctrlKey) },
        )
        latestDrag = {
          key,
          left,
          target: nearestIndex(slots, left),
          others,
          widths,
        }
        const { state: current, set } = latest<TabsState>('drag-tabs')
        send(set({ ...current, drag: latestDrag }))
      },
      onEnd: (_end, canceled) => {
        stop = undefined
        const dragState = latestDrag
        if (dragState && !canceled) {
          commit(
            insert(dragState.others, dragState.key, dragState.target),
            undefined,
            flow,
          )
        } else {
          const { state: current, set } = latest<TabsState>('drag-tabs')
          send(set({ ...current, drag: null }))
        }
      },
    })
  }

  const keydown = (event: KeyboardEvent) => {
    const tab = (event.target as Element | null)?.closest<HTMLElement>('.dg-tab')
    if (!tab) {
      return
    }
    const key = tabKeyOf(tab)
    if (!key) {
      return
    }
    const dir =
      getComputedStyle(tab).direction === 'rtl' ? 'rtl' : 'ltr'
    const move = stepFromKey(event, { arrows: 'horizontal', dir })
    if (!move) {
      return
    }
    event.preventDefault()
    const { state } = latest<TabsState>('drag-tabs')
    const index = stepBy(state.order.indexOf(key), move, {
      min: 0,
      max: state.order.length - 1,
      step: 1,
    })
    if (event.altKey) {
      commit(
        insert(
          state.order.filter(candidate => candidate !== key),
          key,
          index,
        ),
        key,
      )
      return
    }
    const next = state.order[index]
    const { state: current, set } = latest<TabsState>('drag-tabs')
    send(set({ ...current, selected: next }))
    list.querySelector<HTMLElement>(`#dg-tab-${next}`)?.focus()
  }

  list.addEventListener('pointerdown', pointerdown)
  list.addEventListener('keydown', keydown)
  return () => {
    stop?.()
    list.removeEventListener('pointerdown', pointerdown)
    list.removeEventListener('keydown', keydown)
  }
})

const tabs: Tile<TabsState> = {
  id: 'drag-tabs',
  title: 'Reorder the tabs.',
  blurb: 'Each slot snaps the tab in as it nears.',
  size: 'wide',
  tone: 'paper',
  initial: {
    order: Object.keys(FILES) as FileKey[],
    selected: 'button',
    drag: null,
  },
  render: ({ state, set, h }) => {
    publish('drag-tabs', state, set)
    const drag = state.drag
    const shown = drag ? insert(drag.others, drag.key, drag.target) : state.order
    const placed = drag ? lefts(shown, drag.widths) : []
    const file = FILES[state.selected]
    return h.div([h.Class('dg-tabs')], [
      h.div([h.Class('dg-tabs-scroll')], [
        h.div(
          [
            h.Class('dg-tablist'),
            h.Attribute('role', 'tablist'),
            h.Attribute('aria-label', 'Open files'),
            ...(drag ? [h.DataAttribute('dragging', '')] : []),
            ...(drag
              ? [
                  h.Style({
                    width: `${
                      placed[placed.length - 1] +
                      drag.widths[shown[shown.length - 1]] +
                      TAB_PAD * 2
                    }px`,
                  }),
                ]
              : []),
            h.OnMount(tabMount),
          ],
          shown.map((key, index) =>
            h.keyed('button')(key, [
              h.Type('button'),
              h.Class('dg-tab'),
              h.Attribute('role', 'tab'),
              h.Id(`dg-tab-${key}`),
              h.Attribute('aria-selected', String(key === state.selected)),
              h.Attribute('aria-controls', 'dg-tab-panel'),
              h.Attribute(
                'aria-keyshortcuts',
                'Alt+ArrowLeft Alt+ArrowRight',
              ),
              h.Attribute('tabindex', key === state.selected ? '0' : '-1'),
              ...(drag?.key === key ? [h.DataAttribute('moving', '')] : []),
              h.OnClick(set({ ...state, selected: key })),
              ...(drag
                ? [
                    h.Style({
                      left: `${
                        (drag.key === key ? drag.left : placed[index]) + TAB_PAD
                      }px`,
                    }),
                  ]
                : []),
            ], [
              icon(
                h,
                FILES[key].iconName,
                'fill',
                14,
                key === state.selected
                  ? 'var(--tile-accent)'
                  : 'var(--tile-ink-3)',
              ),
              FILES[key].name,
            ]),
          ),
        ),
      ]),
      h.div(
        [
          h.Class('dg-tabs-panel'),
          h.Attribute('role', 'tabpanel'),
          h.Id('dg-tab-panel'),
          h.Attribute('aria-labelledby', `dg-tab-${state.selected}`),
        ],
        [
          h.p([h.Class('dg-tabs-path')], [
            icon(h, file.iconName, 'fill', 14, 'var(--tile-accent)'),
            h.span([], [
              `${file.path} / `,
              h.strong([], [file.name]),
            ]),
            h.span([h.Class('dg-tabs-pos')], [
              `Tab ${state.order.indexOf(state.selected) + 1} of ${
                state.order.length
              }`,
            ]),
          ]),
          h.p([h.Class('dg-tabs-line')], [
            h.span([h.Class('dg-tabs-num'), h.Attribute('aria-hidden', 'true')], [
              '1',
            ]),
            code(h, file.line),
          ]),
        ],
      ),
      h.p([h.Class('dg-tabs-hint')], [
        h.span([], [h.kbd([], ['⌘']), ' while dragging places a tab freely']),
        h.span([], [
          h.kbd([], ['⌥']),
          h.kbd([], ['←']),
          h.kbd([], ['→']),
          ' moves the focused tab',
        ]),
      ]),
    ])
  },
}

/* 4. Song timeline: the playhead snaps to section starts within 1.5 s */

const SECTIONS = [
  { at: 0, label: 'Intro', hue: 250 },
  { at: 9.5, label: 'Verse', hue: 195 },
  { at: 24, label: 'Chorus', hue: 70 },
  { at: 38.5, label: 'Bridge', hue: 150 },
  { at: 52, label: 'Outro', hue: 25 },
]

const SONG = 60
const songRange: NumberRange = {
  min: 0,
  max: SONG,
  step: 0.1,
  largeStep: 5,
  snap: { points: SECTIONS.map(section => section.at), threshold: 1.5 },
}

const clock = (time: number) =>
  `${Math.floor(time / 60)}:${(time % 60).toFixed(1).padStart(4, '0')}`

const sectionAt = (time: number) =>
  SECTIONS.reduce(
    (found, section) => (section.at <= time ? section : found),
    SECTIONS[0],
  )

const percent = (time: number) => `${(time / SONG) * 100}%`

// A waveform that reads like the arrangement: quiet intro, a loud chorus, a fading outro.
const BARS = Array.from({ length: 120 }, (_, index) => {
  const time = ((index + 0.5) / 120) * SONG
  const section = sectionAt(time)
  const energy = {
    Intro: 0.32,
    Verse: 0.56,
    Chorus: 0.9,
    Bridge: 0.48,
    Outro: 0.5 - (time - 52) / 20,
  }[section.label]!
  const noise = Math.abs(Math.sin(index * 12.9898) * 43758.5453) % 1
  const pulse = 0.72 + 0.28 * Math.sin(index * 0.9)
  return {
    height: Math.max(0.08, energy * (0.55 + 0.45 * noise) * pulse),
    hue: section.hue,
  }
})

const waveform = (h: HtmlBuilder<Message>) =>
  h.svg(
    [
      h.Class('dg-wave'),
      h.ViewBox('0 0 120 40'),
      h.PreserveAspectRatio('none'),
      h.Attribute('aria-hidden', 'true'),
    ],
    BARS.map((bar, index) =>
      h.rect(
        [
          h.X(String(index + 0.18)),
          h.Width('0.64'),
          h.Y((20 - bar.height * 19).toFixed(3)),
          h.Height((bar.height * 38).toFixed(3)),
          h.Style({ fill: `oklch(0.78 0.12 ${bar.hue})` }),
        ],
        [],
      ),
    ),
  )

type TimelineState = { time: number }

const timeline: Tile<TimelineState> = {
  id: 'drag-timeline',
  title: 'Scrub to the chorus.',
  blurb: 'The playhead snaps to each section.',
  size: 'wide',
  tone: 'ink',
  initial: { time: 17 },
  render: ({ state, set, h }) => {
    const slider = Slider.Root.withMessage(h)
    const control = Slider.Control.withMessage(h)
    const track = Slider.Track.withMessage(h)
    const indicator = Slider.Indicator.withMessage(h)
    const thumb = Slider.Thumb.withMessage(h)
    const section = SECTIONS.find(candidate => candidate.at === state.time)
    const current = sectionAt(state.time)
    return slider(
      [
        h.Class('dg-tl'),
        h.Style({ '--dg-played': percent(state.time) }),
        slider.Value([state.time]),
        slider.Min(0),
        slider.Max(SONG),
        slider.Step(0.1),
        slider.LargeStep(5),
        slider.Format((value: unknown) => {
          const time = typeof value === 'number' ? value : 0
          const on = SECTIONS.find(candidate => candidate.at === time)
          return on ? `${clock(time)}, ${on.label}` : clock(time)
        }),
        slider.OnValuechange(detail => {
          const first = detail.value[0]
          const value = typeof first === 'number' ? first : state.time
          // PORT NOTE: the binding's valuechange detail has no `event`, so a
          // held Cmd can't be seen; the scrub always snaps and a step-key's
          // direction is read from where the slider landed.
          const next =
            detail.reason === 'step-key'
              ? stepBy(
                  state.time,
                  {
                    direction: value >= state.time ? 1 : -1,
                    size: Math.abs(value - state.time) > 0.11 ? 'large' : 'step',
                  },
                  songRange,
                )
              : scrubTo(value, songRange).value
          return set({ time: next })
        }),
      ],
      [
        h.div([h.Class('dg-tl-head')], [
          h.p([h.Class('dg-tl-lcd'), h.Attribute('aria-hidden', 'true')], [
            h.span([h.Class('dg-tl-clock')], [clock(state.time)]),
            h.span([h.Class('dg-tl-total')], ['/ 1:00.0']),
          ]),
          h.p(
            [
              h.Class('dg-tl-section'),
              ...(section ? [h.DataAttribute('on', '')] : []),
            ],
            [
              h.span(
                [
                  h.Class('dg-tl-dot'),
                  h.Style({ '--dg-hue': String(current.hue) }),
                  h.Attribute('aria-hidden', 'true'),
                ],
                [],
              ),
              section ? section.label : `In ${current.label}`,
            ],
          ),
          h.p([h.Class('dg-tl-meta')], [
            h.span([h.Class('dg-tl-track')], ['Glasshouse · demo 3']),
            h.span([h.Class('dg-tl-free')], [
              h.kbd([], ['⌘']),
              ' scrubs freely',
            ]),
          ]),
        ]),
        control([h.Class('dg-tl-control')], [
          h.div([h.Class('dg-tl-art'), h.Attribute('aria-hidden', 'true')], [
            h.div(
              [h.Class('dg-tl-lanes')],
              SECTIONS.map((candidate, index) =>
                h.span(
                  [
                    h.Class('dg-tl-lane'),
                    ...(candidate === section
                      ? [h.DataAttribute('active', '')]
                      : []),
                    h.Style({
                      left: percent(candidate.at),
                      width: percent(
                        (SECTIONS[index + 1]?.at ?? SONG) - candidate.at,
                      ),
                      '--dg-hue': String(candidate.hue),
                    }),
                  ],
                  [candidate.label],
                ),
              ),
            ),
            h.div([h.Class('dg-tl-waves')], [
              waveform(h),
              h.div([h.Class('dg-tl-played')], [waveform(h)]),
            ]),
          ]),
          track([h.Class('dg-tl-track-rail')], [
            indicator([h.Class('dg-tl-fill')], []),
            thumb(
              [
                h.Class('dg-tl-head-thumb'),
                h.Attribute('aria-label', 'Playhead'),
              ],
              [
                h.span(
                  [h.Class('dg-tl-cap'), h.Attribute('aria-hidden', 'true')],
                  [],
                ),
              ],
            ),
          ]),
        ]),
        h.div(
          [h.Class('dg-tl-ruler'), h.Attribute('aria-hidden', 'true')],
          ['0:00', '0:15', '0:30', '0:45', '1:00'].map(mark =>
            h.span([], [mark]),
          ),
        ),
      ],
    )
  },
}

/* 5. Rubber band: a day-by-day pager that resists past its ends and springs home */

const DAYS = [
  {
    day: 'Day 1 · Fri',
    title: 'Ballarò market',
    detail: 'Arancine by 10:00',
    art: 'a',
  },
  {
    day: 'Day 2 · Sat',
    title: 'Scala dei Turchi',
    detail: 'Swim before the crowds',
    art: 'b',
  },
  {
    day: 'Day 3 · Sun',
    title: 'Etna at dusk',
    detail: 'Cable car up at 16:30',
    art: 'c',
  },
]

const PEEK = 18
const CARD_GAP = 10

type BandState = {
  page: number
  x: number
  dragging: boolean
  speed: number | null
  width: number
}

const cardWidth = (width: number) => Math.max(120, width - PEEK * 2)

const bandMount = onGesture('DragBand', (viewport, send) => {
  let stop: (() => void) | undefined
  let cancelSpring: () => void = () => {}
  const tracker = createVelocityTracker({ maxSpeed: 4 })

  const pitchOf = (width: number) => cardWidth(width) + CARD_GAP
  const restAt = (index: number, width: number) =>
    PEEK - index * pitchOf(width)

  // PORT NOTE: the reference painted `--dg-x` straight onto the track each
  // frame. Here each frame dispatches the position into the Model, and the
  // render repaints the track's custom property from it.
  const paint = (x: number) => {
    const { state, set } = latest<BandState>('drag-band')
    send(set({ ...state, x }))
  }

  const settle = (index: number, velocity: number) => {
    cancelSpring()
    const { state } = latest<BandState>('drag-band')
    cancelSpring = spring(state.x, restAt(index, state.width), velocity, paint)
  }

  const go = (index: number, velocity: number) => {
    const { state, set } = latest<BandState>('drag-band')
    send(set({ ...state, page: index }))
    settle(index, velocity)
  }

  // Keep the page in place when the tile changes size.
  const write = () => {
    const width = viewport.clientWidth
    if (!width) {
      return
    }
    cancelSpring()
    const { state, set } = latest<BandState>('drag-band')
    send(set({ ...state, width, x: restAt(state.page, width) }))
  }
  const observer = new ResizeObserver(write)
  observer.observe(viewport)
  write()

  const pointerdown = (event: PointerEvent) => {
    if (event.button !== 0) {
      return
    }
    cancelSpring()
    tracker.reset()
    const { state } = latest<BandState>('drag-band')
    const from = state.x
    const startX = event.clientX
    const startPage = state.page
    stop?.()
    stop = bindDrag(viewport, event, {
      threshold: dragThreshold,
      cancelOnEscape: true,
      onStart: () => {
        const { state: current, set } = latest<BandState>('drag-band')
        send(set({ ...current, dragging: true }))
      },
      onMove: ({ x, event: move }) => {
        const width = viewport.clientWidth
        const raw = from + x - startX
        const first = restAt(0, width)
        const final = restAt(DAYS.length - 1, width)
        // Past either end, the pull shows less and less of itself.
        const shown =
          raw > first
            ? first + rubberBand(raw - first, width)
            : raw < final
              ? final - rubberBand(final - raw, width)
              : raw
        tracker.add(move.timeStamp, shown)
        const { state: current, set } = latest<BandState>('drag-band')
        send(set({ ...current, width, x: shown }))
      },
      onEnd: (end, canceled) => {
        stop = undefined
        const { state: current, set } = latest<BandState>('drag-band')
        const width = viewport.clientWidth
        const velocity = canceled ? 0 : tracker.velocity(end.timeStamp)
        const moved = current.x - restAt(startPage, width)
        const flick = Math.abs(velocity) > 0.35 ? -Math.sign(velocity) : 0
        const far =
          Math.abs(moved) > pitchOf(width) / 2 ? -Math.sign(moved) : 0
        const next = canceled
          ? startPage
          : clamp(startPage + (flick || far), 0, DAYS.length - 1)
        send(
          set({
            ...current,
            width,
            dragging: false,
            speed: canceled ? current.speed : velocity,
            page: next,
          }),
        )
        settle(next, velocity)
      },
    })
  }

  const keydown = (event: KeyboardEvent) => {
    const step =
      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) {
      return
    }
    event.preventDefault()
    const { state } = latest<BandState>('drag-band')
    const next = state.page + step
    // At an end, a key nudges past it, so the edge still answers.
    if (next < 0 || next >= DAYS.length) {
      settle(state.page, -step * 1.1)
    } else {
      go(next, 0)
    }
  }

  viewport.addEventListener('pointerdown', pointerdown)
  viewport.addEventListener('keydown', keydown)
  return () => {
    cancelSpring()
    stop?.()
    observer.disconnect()
    viewport.removeEventListener('pointerdown', pointerdown)
    viewport.removeEventListener('keydown', keydown)
  }
})

const band: Tile<BandState> = {
  id: 'drag-band',
  title: 'Pull past the end.',
  blurb: 'It resists, then springs home.',
  tone: 'signal',
  initial: { page: 0, x: PEEK, dragging: false, speed: null, width: 0 },
  render: ({ state, set, h }) => {
    publish('drag-band', state, set)
    return h.div([h.Class('dg-band')], [
      h.div(
        [
          h.Class('dg-band-view'),
          h.Attribute('role', 'group'),
          h.Attribute('aria-roledescription', 'carousel'),
          h.Attribute('aria-label', 'Sicily itinerary'),
          h.Attribute('tabindex', '0'),
          ...(state.dragging
            ? [h.DataAttribute('dragging', '')]
            : []),
          h.OnMount(bandMount),
        ],
        [
          h.div(
            [
              h.Class('dg-band-track'),
              h.Style({
                '--dg-card': `${cardWidth(state.width)}px`,
                '--dg-x': `${state.x}px`,
              }),
            ],
            DAYS.map((day, index) =>
              h.keyed('article')(day.title, [
                h.Class('dg-band-card'),
                h.Attribute('aria-roledescription', 'slide'),
                h.Attribute('aria-label', `${index + 1} of ${DAYS.length}`),
                h.Attribute('aria-hidden', String(index !== state.page)),
              ], [
                h.span([
                  h.Class('dg-band-art'),
                  h.DataAttribute('art', day.art),
                  h.Attribute('aria-hidden', 'true'),
                ], []),
                h.span([h.Class('dg-band-day')], [day.day]),
                h.span([h.Class('dg-band-title')], [day.title]),
                h.span([h.Class('dg-band-detail')], [day.detail]),
              ]),
            ),
          ),
        ],
      ),
      h.div([h.Class('dg-band-foot')], [
        h.span([h.Class('dg-band-dots'), h.Attribute('aria-hidden', 'true')], [
          ...DAYS.map(day =>
            h.span(
              [...(day === DAYS[state.page] ? [h.DataAttribute('on', '')] : [])],
              [],
            ),
          ),
        ]),
        h.span([h.Class('dg-band-speed'), h.Attribute('aria-live', 'polite')], [
          state.speed === null
            ? 'Drag past the last day'
            : `Let go at ${Math.abs(state.speed).toFixed(2)} px/ms`,
        ]),
      ]),
    ])
  },
}

/* 6. Patch bay: drag cables from sources into channels */

type Cable = { from: string; to: string }

type ConnectDraft = {
  from: string
  to: string | null
  x: number
  y: number
  keyboard: boolean
}

type BayState = { cables: ReadonlyArray<Cable>; drawing: ConnectDraft | null }

const SOURCES = ['mic', 'gtr', 'bass']
const CHANNELS = ['ch1', 'ch2', 'ch3']
const PORTS: Record<string, { label: string; name: string }> = {
  mic: { label: 'MIC', name: 'Mic' },
  gtr: { label: 'GTR', name: 'Guitar' },
  bass: { label: 'BASS', name: 'Bass' },
  ch1: { label: 'CH 1', name: 'Channel 1' },
  ch2: { label: 'CH 2', name: 'Channel 2' },
  ch3: { label: 'CH 3', name: 'Channel 3' },
}

const PORT_ORDER = [...SOURCES, ...CHANNELS]

const jackAt = (port: string) => {
  const source = SOURCES.includes(port)
  const row = (source ? SOURCES : CHANNELS).indexOf(port)
  return { x: source ? 92 : 150, y: 52 + row * 38 }
}

/** A cable hangs: both handles sit below the lower end, deeper the farther it reaches. */
const cablePath = (
  from: { x: number; y: number },
  to: { x: number; y: number },
) => {
  const dx = to.x - from.x
  const sag = 12 + Math.abs(dx) * 0.12 + Math.abs(to.y - from.y) * 0.2
  const low = Math.max(from.y, to.y) + sag
  return `M${from.x},${from.y} C${from.x + dx * 0.3},${low} ${
    to.x - dx * 0.3
  },${low} ${to.x},${to.y}`
}

const canPatch = (from: string, to: string) =>
  from !== to && SOURCES.includes(from) && CHANNELS.includes(to)

const jackElements = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('.dg-bay-jack')).map(
    (el, index) => ({ key: PORT_ORDER[index], el }),
  )

const centerOf = (el: HTMLElement) => {
  const box = el.getBoundingClientRect()
  return { x: box.left + box.width / 2, y: box.top + box.height / 2 }
}

const patched = (state: BayState, from: string, to: string): BayState => {
  const has = state.cables.some(cable => cable.from === from && cable.to === to)
  return {
    ...state,
    cables: has
      ? state.cables.filter(cable => cable.from !== from || cable.to !== to)
      : [...state.cables.filter(cable => cable.to !== to), { from, to }],
  }
}

const bayPortRole = (state: BayState, key: string) => {
  const draft = state.drawing
  if (!draft) {
    return undefined
  }
  if (draft.from === key) {
    return 'source'
  }
  if (draft.to === key) {
    return 'target'
  }
  return canPatch(draft.from, key) ? 'candidate' : undefined
}

const patchJackMount = (port: string) =>
  onGesture(`DragPatchJack-${port}`, (jack, send) => {
    let stop: (() => void) | undefined
    const pointerdown = (event: PointerEvent) => {
      if (event.button !== 0) {
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const root = jack.closest<HTMLElement>('.dg-bay')
      if (!root) {
        return
      }
      const box = root.getBoundingClientRect()
      const local = (x: number, y: number) => ({ x: x - box.left, y: y - box.top })
      const at = local(event.clientX, event.clientY)
      const targets = jackElements(root).filter(target =>
        canPatch(port, target.key),
      )
      const { state, set } = latest<BayState>('drag-patch')
      send(
        set({
          ...state,
          drawing: { from: port, to: null, ...at, keyboard: false },
        }),
      )
      stop?.()
      stop = bindDrag(jack, event, {
        cancelOnEscape: true,
        onMove: ({ x, y }) => {
          let best: { key: string; el: HTMLElement; distance: number } | undefined
          for (const target of targets) {
            const center = centerOf(target.el)
            const distance = Math.hypot(center.x - x, center.y - y)
            if (distance <= 30 && (!best || distance < best.distance)) {
              best = { ...target, distance }
            }
          }
          const point = best ? centerOf(best.el) : { x, y }
          const { state: current, set: write } = latest<BayState>('drag-patch')
          send(
            write({
              ...current,
              drawing: {
                from: port,
                to: best?.key ?? null,
                ...local(point.x, point.y),
                keyboard: false,
              },
            }),
          )
        },
        onEnd: (_end, canceled) => {
          stop = undefined
          const { state: current, set: write } = latest<BayState>('drag-patch')
          const draft = current.drawing
          if (canceled || !draft || !draft.to) {
            send(write({ ...current, drawing: null }))
            return
          }
          send(write({ ...patched(current, draft.from, draft.to), drawing: null }))
        },
      })
    }
    jack.addEventListener('pointerdown', pointerdown)
    return () => {
      stop?.()
      jack.removeEventListener('pointerdown', pointerdown)
    }
  })

const patchSourceMount = (source: string) =>
  onGesture(`DragPatchSource-${source}`, (button, send) => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return
      }
      event.preventDefault()
      const root = button.closest<HTMLElement>('.dg-bay')
      if (!root) {
        return
      }
      const box = root.getBoundingClientRect()
      const center = centerOf(button)
      const { state, set } = latest<BayState>('drag-patch')
      send(
        set({
          ...state,
          drawing: {
            from: source,
            to: null,
            x: center.x - box.left,
            y: center.y - box.top,
            keyboard: true,
          },
        }),
      )
    }
    button.addEventListener('keydown', keydown)
    return () => button.removeEventListener('keydown', keydown)
  })

const ARROWS: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

const patchMount = onGesture('DragPatchBay', (root, send) => {
  const keydown = (event: KeyboardEvent) => {
    const { state, set } = latest<BayState>('drag-patch')
    const draft = state.drawing
    if (!draft || !draft.keyboard) {
      return
    }
    const direction = ARROWS[event.key]
    if (direction) {
      event.preventDefault()
      const ports = jackElements(root)
      const fromEl = ports.find(
        port => port.key === (draft.to ?? draft.from),
      )?.el
      if (!fromEl) {
        return
      }
      const candidates = ports
        .filter(port => port.key !== draft.to && canPatch(draft.from, port.key))
        .map(port => ({ key: port.key, rect: port.el.getBoundingClientRect() }))
      const next = nearestInDirection(
        fromEl.getBoundingClientRect(),
        candidates,
        direction,
      )
      if (!next) {
        return
      }
      const el = ports.find(port => port.key === next)?.el
      if (!el) {
        return
      }
      const box = root.getBoundingClientRect()
      const center = centerOf(el)
      send(
        set({
          ...state,
          drawing: {
            ...draft,
            to: next,
            x: center.x - box.left,
            y: center.y - box.top,
          },
        }),
      )
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (draft.to) {
        send(set({ ...patched(state, draft.from, draft.to), drawing: null }))
      }
      return
    }
    if (event.key === 'Escape' || event.key === 'Tab') {
      if (event.key === 'Escape') {
        event.preventDefault()
      }
      send(set({ ...state, drawing: null }))
    }
  }
  root.addEventListener('keydown', keydown)
  return () => root.removeEventListener('keydown', keydown)
})

const patch: Tile<BayState> = {
  id: 'drag-patch',
  title: 'Patch a cable.',
  blurb: 'Drag from a source into a channel.',
  tone: 'paper',
  initial: {
    cables: [{ from: 'mic', to: 'ch2' }],
    drawing: null,
  },
  render: ({ state, set, h }) => {
    publish('drag-patch', state, set)
    const draft = state.drawing
    return h.div(
      [
        h.Class('dg-bay'),
        h.Attribute('role', 'group'),
        h.Attribute('aria-label', 'Patch bay'),
        h.OnMount(patchMount),
      ],
      [
        h.span([h.Class('dg-bay-screw'), h.DataAttribute('at', 'tl'), h.Attribute('aria-hidden', 'true')], []),
        h.span([h.Class('dg-bay-screw'), h.DataAttribute('at', 'tr'), h.Attribute('aria-hidden', 'true')], []),
        h.span([h.Class('dg-bay-screw'), h.DataAttribute('at', 'bl'), h.Attribute('aria-hidden', 'true')], []),
        h.span([h.Class('dg-bay-screw'), h.DataAttribute('at', 'br'), h.Attribute('aria-hidden', 'true')], []),
        h.p([h.Class('dg-bay-rail'), h.Attribute('aria-hidden', 'true')], [
          h.span([], ['SOURCE']),
          h.span([], ['CHANNEL']),
        ]),
        ...SOURCES.map((source, index) => {
          const into = state.cables
            .filter(cable => cable.from === source)
            .map(cable => PORTS[cable.to].name)
          return h.button(
            [
              h.Type('button'),
              h.Class('dg-bay-source'),
              h.DataAttribute('source', source),
              h.Style({ top: `${40 + index * 38}px` }),
              h.Attribute('aria-label', PORTS[source].name),
              h.Attribute(
                'aria-description',
                `${into.length ? `Into ${into.join(', ')}. ` : ''}Press Enter to patch.`,
              ),
              h.OnMount(patchSourceMount(source)),
            ],
            [
              h.span([h.Class('dg-bay-swatch'), h.Attribute('aria-hidden', 'true')], []),
              PORTS[source].label,
            ],
          )
        }),
        ...CHANNELS.map((channel, index) => {
          const on = state.cables.find(cable => cable.to === channel)
          return h.span(
            [
              h.Class('dg-bay-channel'),
              h.Style({ top: `${40 + index * 38}px` }),
              ...(on ? [h.DataAttribute('on', '')] : []),
            ],
            [
              PORTS[channel].label,
              h.span([h.Class('dg-bay-led'), h.Attribute('aria-hidden', 'true')], []),
            ],
          )
        }),
        ...PORT_ORDER.map(port => {
          const { x, y } = jackAt(port)
          return h.span(
            [
              h.Class('dg-bay-jack'),
              h.Attribute('aria-hidden', 'true'),
              h.Style({
                left: `${x}px`,
                top: `${y}px`,
                touchAction: 'none',
              }),
              ...(bayPortRole(state, port)
                ? [h.DataAttribute('connect', bayPortRole(state, port)!)]
                : []),
              h.OnMount(patchJackMount(port)),
            ],
            [],
          )
        }),
        h.svg(
          [h.Class('dg-bay-cables'), h.Attribute('aria-hidden', 'true')],
          [
            ...state.cables.map(cable =>
              h.keyed('g')(`${cable.from}-${cable.to}`, [
                h.Class('dg-cable'),
                h.DataAttribute('source', cable.from),
              ], [
                h.path([h.D(cablePath(jackAt(cable.from), jackAt(cable.to)))], []),
                h.path([
                  h.Class('dg-cable-shine'),
                  h.D(cablePath(jackAt(cable.from), jackAt(cable.to))),
                ], []),
              ]),
            ),
            ...state.cables.map(cable =>
              h.keyed('g')(`plugs-${cable.from}-${cable.to}`, [], [
                h.g(
                  [
                    h.Class('dg-plug'),
                    h.DataAttribute('source', cable.from),
                    h.Transform(
                      `translate(${jackAt(cable.from).x} ${jackAt(cable.from).y})`,
                    ),
                  ],
                  [
                    h.circle([h.R('7')], []),
                    h.circle([h.R('3.2'), h.Class('dg-plug-core')], []),
                  ],
                ),
                h.g(
                  [
                    h.Class('dg-plug'),
                    h.DataAttribute('source', cable.from),
                    h.Transform(
                      `translate(${jackAt(cable.to).x} ${jackAt(cable.to).y})`,
                    ),
                  ],
                  [
                    h.circle([h.R('7')], []),
                    h.circle([h.R('3.2'), h.Class('dg-plug-core')], []),
                  ],
                ),
              ]),
            ),
            h.keyed('path')(
              'cable-draft',
              [
                h.Class('dg-cable dg-cable-draft'),
                ...(draft ? [h.DataAttribute('source', draft.from)] : []),
                h.D(
                  draft
                    ? cablePath(
                        jackAt(draft.from),
                        draft.to ? jackAt(draft.to) : { x: draft.x, y: draft.y },
                      )
                    : '',
                ),
              ],
              [],
            ),
            h.keyed('g')(
              'plug-tip',
              [
                h.Class('dg-plug dg-plug-tip'),
                ...(draft ? [h.DataAttribute('source', draft.from)] : []),
                h.Transform(
                  draft
                    ? `translate(${
                        draft.to ? jackAt(draft.to).x : draft.x
                      } ${draft.to ? jackAt(draft.to).y : draft.y})`
                    : 'translate(-40 -40)',
                ),
              ],
              [
                h.circle([h.R('7')], []),
                h.circle([h.R('3.2'), h.Class('dg-plug-core')], []),
              ],
            ),
          ],
        ),
      ],
    )
  },
}

/* 7. Lasso: draw a rectangle across photos; locked ones stay out */

type LassoDraft = {
  left: number
  top: number
  right: number
  bottom: number
  keys: string[]
}

type PhotosState = { selected: string[]; lasso: LassoDraft | null }

const PHOTOS = ['Dunes', 'Fjord', 'Lagoon', 'Glacier', 'Mesa', 'Aurora']
const LOCKED = ['Lagoon', 'Mesa']

const lassoMount = onGesture('DragLasso', (root, send) => {
  let stop: (() => void) | undefined
  const pointerdown = (event: PointerEvent) => {
    if (event.button !== 0 || event.target !== root) {
      return
    }
    const box = root.getBoundingClientRect()
    const x0 = event.clientX - box.left
    const y0 = event.clientY - box.top
    const { state } = latest<PhotosState>('drag-lasso')
    const base = event.shiftKey ? state.selected : []
    const items = PHOTOS.map((key, index) => {
      const el = root.querySelectorAll<HTMLElement>('.dg-photo')[index]
      const r = el.getBoundingClientRect()
      return {
        key,
        rect: {
          left: r.left - box.left,
          top: r.top - box.top,
          right: r.right - box.left,
          bottom: r.bottom - box.top,
        },
      }
    }).filter(item => !LOCKED.includes(item.key))
    stop?.()
    stop = bindDrag(root, event, {
      threshold: dragThreshold,
      cancelOnEscape: true,
      onMove: ({ x, y }) => {
        const x1 = x - box.left
        const y1 = y - box.top
        const rect = {
          left: Math.min(x0, x1),
          top: Math.min(y0, y1),
          right: Math.max(x0, x1),
          bottom: Math.max(y0, y1),
        }
        const hit = items
          .filter(
            item =>
              rect.left < item.rect.right &&
              rect.right > item.rect.left &&
              rect.top < item.rect.bottom &&
              rect.bottom > item.rect.top,
          )
          .map(item => item.key)
        const { state: current, set } = latest<PhotosState>('drag-lasso')
        send(set({ ...current, lasso: { ...rect, keys: [...new Set([...base, ...hit])] } }))
      },
      onEnd: (_end, canceled) => {
        const { state: current, set } = latest<PhotosState>('drag-lasso')
        const draft = current.lasso
        send(
          set({
            ...current,
            lasso: null,
            selected: !draft || canceled ? current.selected : draft.keys,
          }),
        )
      },
    })
  }
  root.addEventListener('pointerdown', pointerdown)
  return () => {
    stop?.()
    root.removeEventListener('pointerdown', pointerdown)
  }
})

const lasso: Tile<PhotosState> = {
  id: 'drag-lasso',
  title: 'Lasso a few photos.',
  blurb: 'Locked ones stay out; Shift adds more.',
  initial: { selected: ['Fjord'], lasso: null },
  render: ({ state, set, h }) => {
    publish('drag-lasso', state, set)
    return h.div(
      [
        h.Class('dg-photos'),
        h.Attribute('role', 'group'),
        h.Attribute('aria-label', 'Photos'),
        h.Style({ touchAction: 'none' }),
        h.OnMount(lassoMount),
      ],
      [
        h.p([h.Class('dg-photos-head')], [
          h.span([h.Attribute('aria-live', 'polite')], [
            state.selected.length
              ? `${state.selected.length} ${
                  state.selected.length === 1 ? 'photo' : 'photos'
                } selected`
              : 'Drag across the photos',
          ]),
          h.button(
            [
              h.Type('button'),
              h.Class('dg-photos-clear'),
              ...(state.selected.length
                ? [h.DataAttribute('shown', '')]
                : []),
              h.OnClick(set({ ...state, selected: [] })),
            ],
            ['Clear'],
          ),
        ]),
        ...PHOTOS.map(name => {
          const selected = state.selected.includes(name)
          const locked = LOCKED.includes(name)
          return h.keyed('div')(name, [
            h.Class('dg-photo'),
            h.Attribute('role', 'img'),
            h.Attribute(
              'aria-label',
              `${name}${locked ? ', locked' : ''}${selected ? ', selected' : ''}`,
            ),
            ...(selected ? [h.DataAttribute('selected', '')] : []),
            ...(locked ? [h.DataAttribute('locked', '')] : []),
            h.DataAttribute('photo', name.toLowerCase()),
            ...(state.lasso?.keys.includes(name)
              ? [h.DataAttribute('lassoed', '')]
              : []),
          ], [
            h.span([h.Class('dg-photo-name')], [name]),
            h.span([h.Class('dg-photo-badge'), h.Attribute('aria-hidden', 'true')], [
              locked
                ? icon(h, 'lock-simple', 'fill', 14)
                : icon(h, 'check', 'bold', 14),
            ]),
          ])
        }),
        h.keyed('div')(
          'lasso',
          [
            h.Class('dg-lasso'),
            h.Attribute('aria-hidden', 'true'),
            ...(state.lasso
              ? [
                  h.Style({
                    position: 'absolute',
                    pointerEvents: 'none',
                    left: `${state.lasso.left}px`,
                    top: `${state.lasso.top}px`,
                    width: `${state.lasso.right - state.lasso.left}px`,
                    height: `${state.lasso.bottom - state.lasso.top}px`,
                  }),
                ]
              : [h.Style({ display: 'none' })]),
          ],
          [],
        ),
      ],
    )
  },
}

/* 8. Desktop windows: resize from any edge or corner, move by the title bar */

type Box = { x: number; y: number; width: number; height: number }
type ResizeHandle = 'move' | 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'sw' | 'se'

type DesktopState = {
  windows: Record<string, Box>
  draft: { key: string; handle: ResizeHandle; box: Box } | null
  stack: string[]
  active: string
  area: { w: number; h: number }
}

const WINDOWS: Record<string, { title: string; locked?: boolean }> = {
  reminders: { title: 'Reminders' },
  console: { title: 'Console' },
  timer: { title: 'Timer', locked: true },
}

const WINDOW_KEYS = Object.keys(WINDOWS)

const EDGES: ReadonlyArray<Exclude<ResizeHandle, 'move' | 'se'>> = [
  'n',
  'e',
  's',
  'w',
  'ne',
  'nw',
  'sw',
]

const RESIZE_CURSORS: Record<ResizeHandle, string> = {
  n: 'ns-resize',
  s: 'ns-resize',
  e: 'ew-resize',
  w: 'ew-resize',
  ne: 'nesw-resize',
  sw: 'nesw-resize',
  nw: 'nwse-resize',
  se: 'nwse-resize',
  move: 'move',
}

const WINDOW_ARROWS: Record<string, readonly [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
}

// PORT NOTE: `resizeBox` is not part of @ui-sdk/core's public entry, so this is
// the same geometry, copied and kept local to the tile.
const resizeBox = (
  from: Box,
  handle: ResizeHandle,
  dx: number,
  dy: number,
  limits: {
    bounds?: { left: number; top: number; right: number; bottom: number }
    min?: { width: number; height: number }
    aspect?: number
  } = {},
): Box => {
  const area = limits.bounds
  const left = area?.left ?? -Infinity
  const top = area?.top ?? -Infinity
  const right = area?.right ?? Infinity
  const bottom = area?.bottom ?? Infinity
  if (handle === 'move') {
    return {
      ...from,
      x: clamp(from.x + dx, left, Math.max(left, right - from.width)),
      y: clamp(from.y + dy, top, Math.max(top, bottom - from.height)),
    }
  }
  const min = limits.min ?? { width: 1, height: 1 }
  const west = handle.includes('w')
  const east = handle.includes('e')
  const north = handle.includes('n')
  const south = handle.includes('s')
  const anchorX = west ? from.x + from.width : from.x
  const anchorY = north ? from.y + from.height : from.y
  const roomX = west ? anchorX - left : right - anchorX
  const roomY = north ? anchorY - top : bottom - anchorY
  let width = west ? from.width - dx : east ? from.width + dx : from.width
  let height = north ? from.height - dy : south ? from.height + dy : from.height
  const ratio = limits.aspect
  if (ratio) {
    if ((west || east) && (north || south)) {
      if (Math.abs(width / from.width - 1) >= Math.abs(height / from.height - 1)) {
        height = width / ratio
      } else {
        width = height * ratio
      }
    } else if (west || east) {
      height = width / ratio
    } else {
      width = height * ratio
    }
    const middleY = from.y + from.height / 2
    const middleX = from.x + from.width / 2
    const fitY =
      north || south
        ? roomY
        : 2 * Math.min(middleY - top, bottom - middleY)
    const fitX =
      west || east
        ? roomX
        : 2 * Math.min(middleX - left, right - middleX)
    width = clamp(width, Math.max(min.width, min.height * ratio), Math.min(fitX, fitY * ratio))
    height = width / ratio
  } else {
    width = clamp(width, min.width, Math.max(min.width, roomX))
    height = clamp(height, min.height, Math.max(min.height, roomY))
  }
  const x = west ? anchorX - width : east ? anchorX : from.x + (from.width - width) / 2
  const y = north ? anchorY - height : south ? anchorY : from.y + (from.height - height) / 2
  return { x, y, width, height }
}

const roundBox = (box: Box, size: number): Box => ({
  x: Math.round(box.x / size) * size,
  y: Math.round(box.y / size) * size,
  width: Math.round(box.width / size) * size,
  height: Math.round(box.height / size) * size,
})

const raiseStack = (stack: ReadonlyArray<string>, key: string) =>
  stack[stack.length - 1] === key
    ? [...stack]
    : [...stack.filter(candidate => candidate !== key), key]

const deskMount = onGesture('DragDesktop', (desk, send) => {
  let stop: (() => void) | undefined
  const areaEl = desk.querySelector<HTMLElement>('.dg-desk-area')

  const write = () => {
    if (!areaEl || !areaEl.clientWidth) {
      return
    }
    const { state, set } = latest<DesktopState>('drag-desktop')
    send(
      set({
        ...state,
        area: { w: areaEl.clientWidth, h: areaEl.clientHeight },
      }),
    )
  }
  const observer = new ResizeObserver(write)
  if (areaEl) {
    observer.observe(areaEl)
  }
  write()

  const windowKeyAt = (element: Element | null) => {
    if (!element) {
      return undefined
    }
    const windows = Array.from(desk.querySelectorAll('.dg-win'))
    const index = windows.indexOf(element)
    return index < 0 ? undefined : WINDOW_KEYS[index]
  }

  const pointerdown = (event: PointerEvent) => {
    const target = event.target as Element | null
    const winEl = target?.closest<HTMLElement>('.dg-win')
    if (!winEl) {
      return
    }
    const key = windowKeyAt(winEl)
    if (!key) {
      return
    }
    const { state, set } = latest<DesktopState>('drag-desktop')
    send(
      set({
        ...state,
        active: key,
        stack: raiseStack(state.stack, key),
      }),
    )
    if (event.button !== 0 || WINDOWS[key].locked) {
      return
    }
    const handle: ResizeHandle | undefined = target?.closest('.dg-win-grip')
      ? 'se'
      : target?.closest('.dg-win-title')
        ? 'move'
        : (target?.closest('.dg-win-edge')?.getAttribute('data-at') as
            | ResizeHandle
            | null) ?? undefined
    if (!handle) {
      return
    }
    const dragEl = target!.closest<HTMLElement>('.dg-win-grip, .dg-win-title, .dg-win-edge')!
    const from = { ...state.windows[key] }
    const startX = event.clientX
    const startY = event.clientY
    stop?.()
    stop = bindDrag(dragEl, event, {
      threshold: dragThreshold,
      cancelOnEscape: true,
      onStart: () => {
        const { state: current, set: writeState } = latest<DesktopState>('drag-desktop')
        send(
          writeState({
            ...current,
            draft: { key, handle, box: from },
          }),
        )
      },
      onMove: ({ x, y, event: move }) => {
        const { state: current, set: writeState } = latest<DesktopState>('drag-desktop')
        const box = resizeBox(from, handle, x - startX, y - startY, {
          bounds: {
            left: 0,
            top: 0,
            right: current.area.w,
            bottom: current.area.h,
          },
          min: { width: 96, height: 56 },
          aspect:
            handle === 'move'
              ? undefined
              : move.shiftKey
                ? from.width / from.height
                : undefined,
        })
        send(writeState({ ...current, draft: { key, handle, box } }))
      },
      onEnd: (_end, canceled) => {
        stop = undefined
        const { state: current, set: writeState } = latest<DesktopState>('drag-desktop')
        const draft = current.draft
        if (draft && !canceled) {
          send(
            writeState({
              ...current,
              draft: null,
              windows: {
                ...current.windows,
                [key]: roundBox(draft.box, 8),
              },
            }),
          )
        } else {
          send(writeState({ ...current, draft: null }))
        }
      },
    })
  }

  desk.addEventListener('pointerdown', pointerdown)
  return () => {
    stop?.()
    observer.disconnect()
    desk.removeEventListener('pointerdown', pointerdown)
  }
})

const windowBox = (state: DesktopState, key: string): Box =>
  state.draft?.key === key ? state.draft.box : state.windows[key]

const windowBody = (h: HtmlBuilder<Message>, id: string) => {
  if (id === 'reminders') {
    return h.ul([h.Class('dg-win-todo')], [
      h.li([h.DataAttribute('done', '')], ['Renew passport']),
      h.li([], ['Call the vet']),
    ])
  }
  if (id === 'console') {
    return h.p([h.Class('dg-win-shell')], [
      h.span([], ['$ npm run build']),
      h.span([h.Class('dg-win-ok')], ['built in 1.84s']),
    ])
  }
  return h.p([h.Class('dg-win-timer')], ['24:59'])
}

const desktop: Tile<DesktopState> = {
  id: 'drag-windows',
  title: 'Resize the windows.',
  blurb: 'Grab any edge or corner.',
  tone: 'sage',
  initial: {
    windows: {
      reminders: { x: 8, y: 8, width: 122, height: 82 },
      console: { x: 108, y: 60, width: 134, height: 80 },
      timer: { x: 142, y: 8, width: 100, height: 46 },
    },
    draft: null,
    stack: ['timer', 'reminders', 'console'],
    active: 'console',
    area: { w: 250, h: 150 },
  },
  render: ({ state, set, h }) => {
    publish('drag-desktop', state, set)
    const activeBox = windowBox(state, state.active)

    const resizeKey = (
      key: string,
      handle: ResizeHandle,
      keyName: string,
      modifiers: { shiftKey: boolean; altKey: boolean; metaKey: boolean; ctrlKey: boolean },
    ) => {
      const direction = WINDOW_ARROWS[keyName]
      if (
        !direction ||
        modifiers.altKey ||
        modifiers.metaKey ||
        modifiers.ctrlKey
      ) {
        return Option.none()
      }
      const [x, y] = direction
      if ((x && (handle === 'n' || handle === 's')) || (y && (handle === 'e' || handle === 'w'))) {
        return Option.none()
      }
      const from = state.windows[key]
      if (!from) {
        return Option.none()
      }
      const step = modifiers.shiftKey ? 80 : 8
      return Option.some(
        set({
          ...state,
          windows: {
            ...state.windows,
            [key]: resizeBox(from, handle, x * step, y * step, {
              bounds: {
                left: 0,
                top: 0,
                right: state.area.w,
                bottom: state.area.h,
              },
              min: { width: 96, height: 56 },
            }),
          },
        }),
      )
    }

    return h.div(
      [
        h.Class('dg-desk'),
        h.Attribute('role', 'group'),
        h.Attribute('aria-label', 'Desktop'),
        h.OnMount(deskMount),
      ],
      [
        h.p([h.Class('dg-desk-menu')], [
          h.strong([], [WINDOWS[state.active].title]),
          h.span([], [
            `${Math.round(activeBox.width)} × ${Math.round(activeBox.height)}`,
          ]),
        ]),
        h.div([h.Class('dg-desk-area')], [
          ...WINDOW_KEYS.map(id => {
            const win = WINDOWS[id]
            const box = windowBox(state, id)
            const front = state.stack[state.stack.length - 1] === id
            return h.keyed('div')(id, [
              h.Class('dg-win'),
              h.Attribute('role', 'group'),
              h.Attribute('aria-label', win.title),
              ...(win.locked ? [h.Attribute('aria-disabled', 'true')] : []),
              ...(state.draft && state.draft.key === id
                ? [h.DataAttribute('resizing', state.draft.handle)]
                : []),
              ...(front ? [h.DataAttribute('front', '')] : []),
              h.Style({
                position: 'absolute',
                left: `${box.x}px`,
                top: `${box.y}px`,
                width: `${box.width}px`,
                height: `${box.height}px`,
                zIndex: String(state.stack.indexOf(id) + 1),
              }),
            ], [
              h.div(
                [
                  h.Class('dg-win-title'),
                  ...(win.locked
                    ? []
                    : [
                        h.Attribute('tabindex', '0'),
                        h.Attribute('role', 'button'),
                        h.Attribute('aria-label', `Move ${win.title}`),
                        h.Attribute(
                          'aria-keyshortcuts',
                          'ArrowLeft ArrowRight ArrowUp ArrowDown',
                        ),
                        h.Style({ touchAction: 'none' }),
                        h.OnFocus(
                          set({
                            ...state,
                            active: id,
                            stack: raiseStack(state.stack, id),
                          }),
                        ),
                        h.OnKeyDownPreventDefault((keyName, modifiers) =>
                          resizeKey(id, 'move', keyName, modifiers),
                        ),
                      ]),
                ],
                [
                  h.span(
                    [h.Class('dg-win-lights'), h.Attribute('aria-hidden', 'true')],
                    [h.span([], []), h.span([], []), h.span([], [])],
                  ),
                  h.span([h.Class('dg-win-name')], [win.title]),
                  ...(win.locked
                    ? [
                        labelIcon(
                          h,
                          'lock-simple',
                          'fill',
                          14,
                          'Locked',
                          'oklch(0.5 0.02 160)',
                        ),
                      ]
                    : []),
                ],
              ),
              windowBody(h, id),
              ...(win.locked
                ? []
                : [
                    ...EDGES.map(handle =>
                      h.span(
                        [
                          h.Class('dg-win-edge'),
                          h.DataAttribute('at', handle),
                          h.DataAttribute('resize-handle', handle),
                          h.Style({
                            cursor: RESIZE_CURSORS[handle],
                            touchAction: 'none',
                          }),
                        ],
                        [],
                      ),
                    ),
                    h.button(
                      [
                        h.Type('button'),
                        h.Class('dg-win-grip'),
                        h.Attribute('aria-label', `Resize ${win.title}`),
                        h.DataAttribute('resize-handle', 'se'),
                        h.Style({
                          cursor: RESIZE_CURSORS.se,
                          touchAction: 'none',
                        }),
                        h.OnKeyDownPreventDefault((keyName, modifiers) =>
                          resizeKey(id, 'se', keyName, modifiers),
                        ),
                        h.OnFocus(
                          set({
                            ...state,
                            active: id,
                            stack: raiseStack(state.stack, id),
                          }),
                        ),
                      ],
                      [],
                    ),
                  ]),
            ])
          }),
        ]),
      ],
    )
  },
}

export const tiles: ReadonlyArray<Tile> = [
  sidebar,
  toasts,
  tabs,
  timeline,
  band,
  patch,
  lasso,
  desktop,
]
