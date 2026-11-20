import {
  bindDrag,
  bindHold,
  bindRepeat,
  bindScrollPicker,
  isFocusFromKeyboard,
  sourceOf,
} from '@ui-sdk/core'
import { sheetPhysics } from '@ui-sdk/core/drawer'
import {
  createVelocityTracker,
  projectDistance,
  rubberBand,
  solveSpring,
} from '@ui-sdk/core/gesture'
import { clamp } from '@ui-sdk/core/number'
import { Effect, Queue, Stream } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { MountAction } from 'foldkit/mount'

import { Listbox } from 'foldkit-ui-sdk'

import type { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './gestures.css'

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

// PORT NOTE: the reference keeps each demo's live values in React state and
// refs, and its gesture effects re-run with them. Foldkit's view is pure and
// `OnMount` runs once, so a render publishes its `state`/`set` pair here and
// every native listener reads the latest pair before it writes. The Model stays
// the only source of truth; this map just routes the listener to it.
type LiveState = {
  state: any
  set: (next: any) => Message
}

const live = new Map<string, LiveState>()

const publish = (id: string, state: unknown, set: (next: any) => Message) => {
  live.set(id, { state, set })
}

const latest = <S>(id: string) =>
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
            setup(element as HTMLElement, message => {
              Queue.offerUnsafe(queue, message)
            }),
          ),
          cleanup => Effect.sync(cleanup),
        )
      }),
    ),
})

/* 1. Hold to delete: bindHold */

const HOLD_KEY = 'motion-hold'
const HOLD_DELAY = 1200

type HoldState = { deleted: boolean; early: boolean; refocus: boolean }

const holdMount = onGesture('HoldToDelete', (button, send) => {
  if (latest<HoldState>(HOLD_KEY).state.refocus) {
    button.focus()
  }
  return bindHold(button, {
    delay: HOLD_DELAY,
    onPress: () => {
      const { state, set } = latest<HoldState>(HOLD_KEY)
      send(set({ ...state, early: false }))
    },
    onHold: () => {
      const { state, set } = latest<HoldState>(HOLD_KEY)
      send(
        set({
          ...state,
          deleted: true,
          refocus: document.activeElement === button,
        }),
      )
    },
    onEnd: ({ held, canceled }) => {
      const { state, set } = latest<HoldState>(HOLD_KEY)
      send(set({ ...state, early: !held && !canceled }))
    },
  })
})

const hold = {
  initial: { deleted: false, early: false, refocus: false } as HoldState,
  render: ({ state, set, h }: TileContext<HoldState>) => {
    publish(HOLD_KEY, state, set)
    const hintId = 'gs-hold-hint'
    return h.div(
      [
        h.Class('gs-hold'),
        ...(state.deleted ? [h.Attribute('data-deleted', '')] : []),
      ],
      [
        h.div([h.Class('gs-hold-project')], [
          h.span(
            [h.Class('gs-hold-icon'), h.Attribute('aria-hidden', 'true')],
            [icon(h, 'trash', 'bold')],
          ),
          h.span([h.Class('gs-hold-name')], ['acme-storefront']),
          h.span([h.Class('gs-hold-meta')], ['Production · 128 deploys']),
        ]),
        state.deleted
          ? h.div([h.Class('gs-hold-done'), h.Attribute('role', 'status')], [
              h.span([], ['Project deleted.']),
              h.button(
                [
                  h.Type('button'),
                  h.Class('b-btn'),
                  h.DataAttribute('variant', 'ghost'),
                  // PORT NOTE: the reference moves focus back with a `refocus`
                  // flag read after the effect. Here the unmount of the hold
                  // button and the mount of this one are the signal, so the flag
                  // the last render published decides whether focus follows.
                  h.OnMount({
                    name: 'RefocusUndo',
                    f: element => {
                      if (latest<HoldState>(HOLD_KEY).state.refocus) {
                        if (element instanceof HTMLElement) element.focus()
                      }
                      return Stream.empty
                    },
                  }),
                  h.OnClick(
                    set({
                      ...state,
                      deleted: false,
                      early: false,
                      refocus: true,
                    }),
                  ),
                ],
                [icon(h, 'arrow-counter-clockwise', 'bold', 14), 'Undo'],
              ),
            ])
          : h.button(
              [
                h.Type('button'),
                h.Class('gs-hold-button'),
                h.Attribute('aria-describedby', hintId),
                h.OnMount(holdMount),
              ],
              [
                h.span(
                  [h.Class('gs-hold-fill'), h.Attribute('aria-hidden', 'true')],
                  [],
                ),
                h.span([h.Class('gs-hold-label')], ['Delete project']),
              ],
            ),
        state.deleted
          ? ''
          : h.span(
              [
                h.Id(hintId),
                h.Class('gs-hold-hint'),
                ...(state.early ? [h.Attribute('data-early', '')] : []),
              ],
              [
                state.early
                  ? 'Keep holding to delete.'
                  : 'Press and hold. Esc cancels.',
              ],
            ),
      ],
    )
  },
}

/* 2. Guest stepper: bindRepeat */

const GUESTS_KEY = 'motion-guests'
const CAPACITY = 120

const isPaced = (count: number) => {
  const tick = count - 1
  const every = tick <= 12 ? 4 : tick <= 36 ? 2 : 1
  return tick % every === 0
}

type GuestsState = { guests: number }

// PORT NOTE: the reference keeps the live count in a ref because `bindRepeat`'s
// callback is fixed when the effect runs. The published `state` plays that role,
// and the bound is read back from `aria-disabled`, which every render writes.
const guestMount = (delta: number) =>
  onGesture('GuestStep', (button, send) =>
    bindRepeat(button, {
      repeat: 40,
      disabled: () => button.hasAttribute('aria-disabled'),
      onStep: ({ count }) => {
        if (!isPaced(count)) return true
        const { state, set } = latest<GuestsState>(GUESTS_KEY)
        const next = clamp(state.guests + delta, 0, CAPACITY)
        send(set({ guests: next }))
        return next > 0 && next < CAPACITY
      },
    }),
  )

const guests = {
  initial: { guests: 24 } as GuestsState,
  render: ({ state, set, h }: TileContext<GuestsState>) => {
    publish(GUESTS_KEY, state, set)
    const stepButton = (
      label: string,
      delta: number,
      atBound: boolean,
      child: Html,
    ) =>
      h.button(
        [
          h.Type('button'),
          h.Class('gs-step'),
          h.Attribute('aria-label', label),
          ...(atBound ? [h.AriaDisabled(true)] : []),
          h.OnMount(guestMount(delta)),
        ],
        [child],
      )

    return h.div([h.Class('gs-guests')], [
      h.div([h.Class('gs-guests-event')], [
        h.span([h.Class('gs-guests-name')], ['Rooftop launch']),
        h.span([h.Class('gs-guests-when')], ['Fri · 7 PM']),
      ]),
      h.div([h.Class('gs-guests-row')], [
        stepButton(
          'Remove guest',
          -1,
          state.guests === 0,
          icon(h, 'minus', 'bold', 18),
        ),
        h.output(
          [h.Class('gs-guests-count'), h.AriaLive('polite')],
          [
            h.span([h.Class('gs-guests-number')], [String(state.guests)]),
            h.span([h.Class('gs-guests-unit')], [
              icon(h, 'users', 'bold', 12),
              'guests',
            ]),
          ],
        ),
        stepButton(
          'Add guest',
          1,
          state.guests === CAPACITY,
          icon(h, 'plus', 'bold', 18),
        ),
      ]),
      h.div(
        [h.Class('gs-guests-capacity'), h.Attribute('aria-hidden', 'true')],
        [
          h.span(
            [
              h.Class('gs-guests-bar'),
              h.Style({ '--fill': String(state.guests / CAPACITY) }),
            ],
            [],
          ),
        ],
      ),
      h.span([h.Class('gs-guests-left')], [
        state.guests === CAPACITY
          ? 'Venue full'
          : `${CAPACITY - state.guests} spots left`,
      ]),
    ])
  },
}

/* 3. Alarm wheels: bindScrollPicker */

const WHEEL_KEY = 'motion-wheel'

const HOURS = Array.from({ length: 12 }, (_, index) => String(index + 1))
const MINUTES = Array.from({ length: 12 }, (_, index) =>
  String(index * 5).padStart(2, '0'),
)
const PERIODS = ['AM', 'PM']

type WheelState = { hour: string; minute: string; period: string }
type WheelKey = keyof WheelState

const withWheelValue = (
  state: WheelState,
  key: WheelKey,
  value: string,
): WheelState =>
  key === 'hour'
    ? { ...state, hour: value }
    : key === 'minute'
      ? { ...state, minute: value }
      : { ...state, period: value }

const wheelMount = (key: WheelKey, options: ReadonlyArray<string>) =>
  onGesture('WheelPicker', (list, send) =>
    bindScrollPicker(list, {
      onSelect: index => {
        const option = options[index]
        if (option === undefined) return
        const { state, set } = latest<WheelState>(WHEEL_KEY)
        send(set(withWheelValue(state, key, option)))
      },
    }),
  )

const Wheel = (
  h: HtmlBuilder<Message>,
  set: (next: WheelState | ((current: WheelState) => WheelState)) => Message,
  key: WheelKey,
  label: string,
  options: ReadonlyArray<string>,
  value: string,
) => {
  const listbox = Listbox.Root.withMessage(h)
  const item = Listbox.Item.withMessage(h)
  return listbox(
    [
      h.Class('gs-wheel'),
      h.Attribute('aria-label', label),
      listbox.KeepInView(false),
      listbox.Value(value),
      listbox.OnValuechange(detail => {
        const next = detail.value
        return set(current =>
          typeof next === 'string'
            ? withWheelValue(current, key, next)
            : current,
        )
      }),
      h.OnMount(wheelMount(key, options)),
    ],
    options.map(option =>
      item([h.Class('gs-wheel-item'), item.Value(option)], [option]),
    ),
  )
}

const wheels = {
  initial: { hour: '7', minute: '30', period: 'AM' } as WheelState,
  render: ({ state, set, h }: TileContext<WheelState>) => {
    publish(WHEEL_KEY, state, set)
    return h.div([h.Class('gs-alarm')], [
      h.div([h.Class('gs-alarm-head')], [
        icon(h, 'alarm', 'bold', 14),
        h.span([], [
          'Wake up at ',
          h.strong([], [`${state.hour}:${state.minute} ${state.period}`]),
        ]),
      ]),
      h.div([h.Class('gs-wheels'), h.Attribute('dir', 'ltr')], [
        Wheel(h, set, 'hour', 'Hour', HOURS, state.hour),
        h.span(
          [h.Class('gs-wheels-colon'), h.Attribute('aria-hidden', 'true')],
          [':'],
        ),
        Wheel(h, set, 'minute', 'Minute', MINUTES, state.minute),
        Wheel(h, set, 'period', 'AM or PM', PERIODS, state.period),
      ]),
    ])
  },
}

/* 4. Bottom sheet: sheetPhysics */

const SHEET_KEY = 'motion-sheet'

const SNAPS = ['Peek', 'Half', 'Full']
const CAFES = [
  { name: 'Café Lumen', rating: '4.8', far: '2 min' },
  { name: 'Fábrica Coffee', rating: '4.7', far: '5 min' },
  { name: 'Copenhagen Coffee Lab', rating: '4.6', far: '7 min' },
  { name: 'Hello, Kristof', rating: '4.6', far: '9 min' },
  { name: 'Dear Breakfast', rating: '4.5', far: '11 min' },
  { name: 'Comoba', rating: '4.5', far: '12 min' },
  { name: 'Café Janis', rating: '4.4', far: '14 min' },
  { name: 'Heim Café', rating: '4.4', far: '15 min' },
]
const FILTERS = ['Open now', 'Wi-Fi', 'Outdoor seats', 'Oat milk']
const physics = sheetPhysics.ios

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const stopsFor = (height: number) => [
  64,
  Math.round(height * 0.5),
  height - 10,
]

const nearestStop = (stops: ReadonlyArray<number>, at: number) => {
  let best = 0
  for (let index = 1; index < stops.length; index++) {
    if (Math.abs(stops[index] - at) < Math.abs(stops[best] - at)) {
      best = index
    }
  }
  return best
}

const releaseStop = (
  stops: ReadonlyArray<number>,
  shown: number,
  velocity: number,
) => {
  if (Math.abs(velocity) < physics.minFlingVelocity) {
    return nearestStop(stops, shown)
  }
  const landing = nearestStop(
    stops,
    shown + projectDistance(velocity, physics.projectionRate),
  )
  let ahead = -1
  if (velocity > 0) {
    ahead = stops.findIndex(stop => stop > shown + 1)
  } else {
    for (let index = stops.length - 1; index >= 0; index--) {
      if (stops[index] < shown - 1) {
        ahead = index
        break
      }
    }
  }
  if (ahead === -1) {
    return landing
  }
  return velocity > 0 ? Math.max(landing, ahead) : Math.min(landing, ahead)
}

type SheetState = { snap: number }

// PORT NOTE: the reference keeps the height, stops, drag and spring in refs and
// re-renders only the live label. This mount keeps the same machinery on the
// element: the sheet's inline translate and the frame's `--sheet-progress` are
// imperative, and only the resting snap is written to the Model.
const sheetMount = onGesture('MapSheet', (frame, send) => {
  const surface = frame.querySelector('.gs-sheet')
  const handle = frame.querySelector('.gs-sheet-handle')
  if (!(surface instanceof HTMLElement) || !(handle instanceof HTMLElement)) {
    return () => {}
  }
  let shown = 0
  let stops = [0, 0, 0]
  let snapIndex = 0
  let cancel = () => {}
  let stopDrag: (() => void) | undefined

  const paint = (height: number) => {
    shown = height
    const [low, , high] = stops
    surface.style.translate = `0 ${high - height}px`
    const span = high - low
    frame.style.setProperty(
      '--sheet-progress',
      String(span > 0 ? clamp((height - low) / span, 0, 1) : 0),
    )
  }

  const settle = (index: number, velocity = 0) => {
    cancel()
    snapIndex = index
    send(latest<SheetState>(SHEET_KEY).set({ snap: index }))
    const to = stops[index]
    if (reduced()) {
      paint(to)
      return
    }
    const damping =
      Math.abs(velocity) >= physics.minFlingVelocity
        ? physics.momentumDampingRatio
        : physics.dampingRatio
    const spring = solveSpring(
      physics.response,
      damping,
      shown - to,
      velocity,
    )
    const start = performance.now()
    let frameId = 0
    const tick = (now: number) => {
      const offset = spring.position(now - start)
      if (
        Math.abs(offset) < 0.5 &&
        Math.abs(spring.velocity(now - start)) < 0.01
      ) {
        paint(to)
        return
      }
      paint(to + offset)
      frameId = requestAnimationFrame(tick)
    }
    frameId = requestAnimationFrame(tick)
    cancel = () => cancelAnimationFrame(frameId)
  }

  const observer = new ResizeObserver(() => {
    stops = stopsFor(frame.clientHeight)
    surface.style.height = `calc(${stops[2]}px + var(--gs-sheet-bleed))`
    cancel()
    paint(stops[snapIndex])
  })
  observer.observe(frame)

  const down = (event: PointerEvent) => {
    if (event.button !== 0) {
      return
    }
    cancel()
    const startY = event.clientY
    const from = shown
    const tracker = createVelocityTracker()
    tracker.add(event.timeStamp, from)
    const [low, , high] = stops
    const stretch = physics.rubberBandDimension ?? high
    const band = (raw: number) =>
      raw > high
        ? high + rubberBand(raw - high, stretch, physics.rubberBand)
        : raw < low
          ? low - rubberBand(low - raw, stretch, physics.rubberBand)
          : raw
    stopDrag?.()
    stopDrag = bindDrag(surface, event, {
      threshold:
        event.pointerType === 'mouse' ? physics.mouseSlop : physics.touchSlop,
      cancelOnEscape: true,
      onStart: () => surface.setAttribute('data-dragging', ''),
      onMove: ({ y, event: move }) => {
        const raw = from + startY - y
        tracker.add(move.timeStamp, raw)
        paint(band(raw))
      },
      onEnd: (up, canceled) => {
        surface.removeAttribute('data-dragging')
        if (canceled) {
          settle(snapIndex)
          return
        }
        const velocity = tracker.velocity(up.timeStamp)
        settle(releaseStop(stops, shown, velocity), velocity)
      },
    })
  }

  const click = () => {
    settle((snapIndex + 1) % SNAPS.length)
  }

  const key = (event: KeyboardEvent) => {
    const last = SNAPS.length - 1
    const next =
      event.key === 'ArrowUp'
        ? Math.min(snapIndex + 1, last)
        : event.key === 'ArrowDown'
          ? Math.max(snapIndex - 1, 0)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? last
              : undefined
    if (next === undefined) {
      return
    }
    event.preventDefault()
    settle(next)
  }

  surface.addEventListener('pointerdown', down)
  handle.addEventListener('click', click)
  handle.addEventListener('keydown', key)

  return () => {
    observer.disconnect()
    cancel()
    stopDrag?.()
    surface.removeEventListener('pointerdown', down)
    handle.removeEventListener('click', click)
    handle.removeEventListener('keydown', key)
  }
})

const sheet = {
  initial: { snap: 0 } as SheetState,
  render: ({ state, set, h }: TileContext<SheetState>) => {
    publish(SHEET_KEY, state, set)
    return h.div([h.Class('gs-map'), h.OnMount(sheetMount)], [
      h.div(
        [h.Class('gs-map-ground'), h.Attribute('aria-hidden', 'true')],
        [
          h.span([h.Class('gs-map-road'), h.DataAttribute('road', 'a')], []),
          h.span([h.Class('gs-map-road'), h.DataAttribute('road', 'b')], []),
          h.span([h.Class('gs-map-road'), h.DataAttribute('road', 'c')], []),
          h.span([h.Class('gs-map-park')], []),
          ...[0, 1, 2, 3, 4].map(index =>
            h.span(
              [h.Class('gs-map-pin'), h.DataAttribute('pin', String(index))],
              [icon(h, 'coffee', 'fill', 11)],
            ),
          ),
        ],
      ),
      h.span(
        [h.Class('gs-map-scrim'), h.Attribute('aria-hidden', 'true')],
        [],
      ),
      h.div([h.Class('gs-sheet')], [
        h.button(
          [
            h.Type('button'),
            h.Class('gs-sheet-handle'),
            h.Attribute('aria-label', 'Resize results'),
            h.Attribute('aria-describedby', 'gs-sheet-height'),
          ],
          [],
        ),
        h.span(
          [h.Id('gs-sheet-height'), h.Class('sr-only'), h.AriaLive('polite')],
          [`${SNAPS[state.snap] ?? 'Peek'} height`],
        ),
        h.div([h.Class('gs-sheet-head')], [
          h.span([h.Class('gs-sheet-title')], ['Coffee nearby']),
          h.span([h.Class('gs-sheet-sub')], ['8 open now · walking']),
        ]),
        h.div(
          [h.Class('gs-sheet-filters')],
          FILTERS.map(filter => h.span([], [filter])),
        ),
        h.ul(
          [h.Class('gs-sheet-list')],
          CAFES.map(cafe =>
            h.li([], [
              h.span(
                [h.Class('gs-sheet-cup'), h.Attribute('aria-hidden', 'true')],
                [icon(h, 'coffee', 'fill', 14)],
              ),
              h.span([h.Class('gs-sheet-name')], [cafe.name]),
              h.span([h.Class('gs-sheet-rating')], [
                icon(h, 'star', 'fill', 10),
                cafe.rating,
              ]),
              h.span([h.Class('gs-sheet-far')], [cafe.far]),
            ]),
          ),
        ),
      ]),
    ])
  },
}

/* 5. Mention previews: createPointerKind, isFocusFromKeyboard */

const MENTION_KEY = 'motion-mentions'

const PEOPLE: Record<string, { name: string; role: string; time: string }> = {
  maya: { name: 'Maya Chen', role: 'Design lead', time: '4:12 PM in Lisbon' },
  jonas: {
    name: 'Jonas Weber',
    role: 'Infrastructure',
    time: '5:12 PM in Berlin',
  },
  priya: { name: 'Priya Raman', role: 'Product', time: '8:42 PM in Pune' },
}

const SOURCES: Record<string, string> = {
  mouse: 'Opened by hover',
  touch: 'Opened by tap',
  pen: 'Opened by pen',
  keyboard: 'Opened from the keyboard',
  virtual: 'Opened by a virtual click',
}

// PORT NOTE: the reference reads the pointer preference with `usePreference` and
// re-renders when it changes. The tile reads the same media queries at render
// time, so a device that swaps pointers picks the new hint up on its next
// interaction instead of immediately.
const pointerHover = (): 'hover' | 'none' | 'some' => {
  if (typeof window === 'undefined' || window.matchMedia === undefined) {
    return 'some'
  }
  if (window.matchMedia('(hover: hover)').matches) return 'hover'
  if (window.matchMedia('(hover: none)').matches) return 'none'
  return 'some'
}

type MentionPlace = { x: number; y: number; fresh: boolean }

type MentionState = {
  open: string | null
  pinned: boolean
  person: string
  place: MentionPlace
  source: string | null
}

// PORT NOTE: hover, focus and click all happen on elements that survive every
// render, so one mount on `.gs-thread` delegates them. The reference's 320ms
// hover delay and 220ms close grace live here; each timer reads the published
// state when it fires, so a pin between scheduling and firing is respected.
const mentionsMount = onGesture('MentionPreviews', (thread, send) => {
  const card = thread.querySelector<HTMLElement>('.gs-card')
  let openTimer = 0
  let closeTimer = 0

  const read = () => latest<MentionState>(MENTION_KEY)
  const commit = (next: MentionState) => send(read().set(next))
  const clearOpen = () => window.clearTimeout(openTimer)
  const clearClose = () => window.clearTimeout(closeTimer)

  const placeOf = (target: HTMLElement) => {
    const width = Math.min(232, thread.clientWidth)
    return {
      x: clamp(target.offsetLeft, 0, thread.clientWidth - width),
      y: target.offsetTop + target.offsetHeight + 6,
    }
  }
  const mentionOf = (node: EventTarget | null) =>
    node instanceof Element
      ? (node.closest('.gs-mention') as HTMLElement | null)
      : null

  const show = (
    target: HTMLElement,
    id: string,
    how: string,
    pin: boolean,
  ) => {
    clearOpen()
    clearClose()
    const current = read().state
    commit({
      ...current,
      open: id,
      pinned: pin,
      person: id,
      place: { ...placeOf(target), fresh: current.open === null },
      source: how,
    })
  }
  const close = () => {
    const current = read().state
    if (current.open === null) return
    clearOpen()
    clearClose()
    commit({ ...current, open: null, pinned: false })
  }
  const closeSoon = () => {
    clearClose()
    closeTimer = window.setTimeout(() => {
      if (!read().state.pinned) close()
    }, 220)
  }

  const onOver = (event: MouseEvent) => {
    const target = mentionOf(event.target)
    const from = event.relatedTarget
    if (target === null || (from instanceof Node && target.contains(from))) {
      return
    }
    if (pointerHover() !== 'hover') return
    const current = read().state
    if (current.pinned) return
    clearClose()
    clearOpen()
    openTimer = window.setTimeout(
      () => {
        const now = read().state
        if (now.pinned) return
        show(target, target.dataset.mention ?? '', 'mouse', false)
      },
      current.open === null ? 320 : 0,
    )
  }
  const onOut = (event: MouseEvent) => {
    const target = mentionOf(event.target)
    const to = event.relatedTarget
    if (target === null || (to instanceof Node && target.contains(to))) {
      return
    }
    clearOpen()
    closeSoon()
  }
  const onFocusIn = (event: FocusEvent) => {
    const target = mentionOf(event.target)
    if (target === null) return
    if (!isFocusFromKeyboard()) return
    show(target, target.dataset.mention ?? '', 'keyboard', false)
  }
  const onFocusOut = (event: FocusEvent) => {
    if (mentionOf(event.target) === null) return
    const next = event.relatedTarget
    if (next instanceof Element && next.closest('.gs-mention') !== null) return
    close()
  }
  const onClick = (event: MouseEvent) => {
    const target = mentionOf(event.target)
    if (target === null) return
    const id = target.dataset.mention ?? ''
    const current = read().state
    if (current.open === id && current.pinned) {
      close()
      return
    }
    show(target, id, sourceOf(event), true)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return
    close()
  }
  const onCardOver = () => {
    clearOpen()
    clearClose()
  }
  const onCardOut = (event: MouseEvent) => {
    const to = event.relatedTarget
    if (card !== null && to instanceof Node && card.contains(to)) return
    closeSoon()
  }

  thread.addEventListener('mouseover', onOver)
  thread.addEventListener('mouseout', onOut)
  thread.addEventListener('focusin', onFocusIn)
  thread.addEventListener('focusout', onFocusOut)
  thread.addEventListener('click', onClick)
  thread.addEventListener('keydown', onKeyDown)
  card?.addEventListener('mouseenter', onCardOver)
  card?.addEventListener('mouseleave', onCardOut)

  return () => {
    clearOpen()
    clearClose()
    thread.removeEventListener('mouseover', onOver)
    thread.removeEventListener('mouseout', onOut)
    thread.removeEventListener('focusin', onFocusIn)
    thread.removeEventListener('focusout', onFocusOut)
    thread.removeEventListener('click', onClick)
    thread.removeEventListener('keydown', onKeyDown)
    card?.removeEventListener('mouseenter', onCardOver)
    card?.removeEventListener('mouseleave', onCardOut)
  }
})

const mentionButton = (
  h: HtmlBuilder<Message>,
  state: MentionState,
  id: string,
) =>
  h.button(
    [
      h.Type('button'),
      h.Class('gs-mention'),
      h.DataAttribute('mention', id),
      h.AriaExpanded(state.open === id),
      h.AriaControls('gs-mention-card'),
    ],
    [`@${(PEOPLE[id]?.name ?? id).split(' ')[0]}`],
  )

const mentions = {
  initial: {
    open: null,
    pinned: false,
    person: 'maya',
    place: { x: 0, y: 0, fresh: true },
    source: null,
  } as MentionState,
  render: ({ state, set, h }: TileContext<MentionState>) => {
    publish(MENTION_KEY, state, set)
    const hover = pointerHover()
    const hint =
      hover === 'hover'
        ? 'Hover a name to preview it. Click to pin.'
        : hover === 'none'
          ? 'Tap a name to open it.'
          : 'Point at a name, tap it, or Tab to it.'
    const shown = PEOPLE[state.person] ?? PEOPLE.maya

    return h.div([h.Class('gs-thread'), h.OnMount(mentionsMount)], [
      h.p([h.Class('gs-thread-hint')], [
        h.span([], [hint]),
        state.source !== null
          ? h.span([h.Class('gs-thread-source')], [SOURCES[state.source] ?? ''])
          : '',
      ]),
      h.div([h.Class('gs-message')], [
        h.span(
          [h.Class('gs-message-avatar'), h.Attribute('aria-hidden', 'true')],
          ['AL'],
        ),
        h.div([h.Class('gs-message-body')], [
          h.span([h.Class('gs-message-meta')], [
            h.strong([], ['Alex Lindqvist']),
            ' 10:24',
          ]),
          h.p([h.Class('gs-message-text')], [
            mentionButton(h, state, 'maya'),
            ' can you check the new onboarding with ',
            mentionButton(h, state, 'jonas'),
            ' before Friday? ',
            mentionButton(h, state, 'priya'),
            ' has the launch checklist.',
          ]),
        ]),
      ]),
      h.div(
        [
          h.Id('gs-mention-card'),
          h.Class('gs-card'),
          ...(state.open !== null ? [h.Attribute('data-open', '')] : []),
          ...(state.place.fresh ? [h.Attribute('data-fresh', '')] : []),
          h.AriaHidden(state.open === null),
          h.Style({ translate: `${state.place.x}px ${state.place.y}px` }),
        ],
        [
          h.span(
            [h.Class('gs-card-avatar'), h.Attribute('aria-hidden', 'true')],
            [
              shown.name
                .split(' ')
                .map(part => part[0] ?? '')
                .join(''),
            ],
          ),
          h.span([h.Class('gs-card-name')], [shown.name]),
          h.span([h.Class('gs-card-role')], [shown.role]),
          h.span([h.Class('gs-card-time')], [shown.time]),
        ],
      ),
    ])
  },
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'motion-hold',
    title: 'Hold to delete.',
    blurb: 'Let go early and nothing happens.',
    tone: 'paper',
    initial: hold.initial,
    render: hold.render,
  },
  {
    id: 'motion-sheet',
    title: 'Pull the sheet up.',
    blurb: 'Three resting heights; a flick can skip one.',
    size: 'tall',
    tone: 'sky',
    initial: sheet.initial,
    render: sheet.render,
  },
  {
    id: 'motion-guests',
    title: 'Add guests quickly.',
    blurb: 'Hold a button and the count speeds up.',
    tone: 'butter',
    initial: guests.initial,
    render: guests.render,
  },
  {
    id: 'motion-wheel',
    title: 'Spin to the hour.',
    blurb: 'Flick a wheel, or use the arrow keys.',
    tone: 'ink',
    initial: wheels.initial,
    render: wheels.render,
  },
  {
    id: 'motion-mentions',
    title: 'Tap opens, hover previews.',
    blurb: 'Mentions adapt to a mouse, a finger or the keys.',
    size: 'wide',
    initial: mentions.initial,
    render: mentions.render,
  },
]
