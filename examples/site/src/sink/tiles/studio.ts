import { bindDrag, dragThreshold } from '@ui-sdk/core'
import { Effect, Option, Stream } from 'effect'
import type { Attribute, HtmlBuilder } from 'foldkit/html'
import type { MountAction } from 'foldkit/mount'

import type { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './studio.css'

/*
 * PORT NOTE: the reference drives these nine tiles with `definePrimitive` +
 * `createParts` React primitives. Here the observable state lives in the
 * tile's Model slice, markup is plain elements, and the imperative leftovers
 * (timers, pointer drags, resize/scroll observers) are module-level
 * controllers attached through `h.OnMount`. Each controller keeps a mirror of
 * the rendered state so native listeners read current values instead of the
 * closure captured at mount.
 */

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

const keys = (h: HtmlBuilder<Message>, caps: ReadonlyArray<string>) =>
  h.span(
    [h.Class('st-keys'), h.Attribute('aria-hidden', 'true')],
    caps.map(cap => h.kbd([h.Class('st-kbd')], [cap])),
  )

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

const clock = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`

const onMount = (
  name: string,
  setup: (element: HTMLElement) => void | (() => void),
): MountAction<Message, never> =>
  ({
    name,
    f: (element: Element) =>
      Stream.fromEffectDrain(
        Effect.scoped(
          Effect.acquireRelease(
            Effect.sync(() => setup(element as HTMLElement)),
            cleanup => Effect.sync(() => cleanup?.()),
          ).pipe(Effect.andThen(Effect.never)),
        ),
      ),
  }) as MountAction<Message, never>

/**
 * PORT NOTE: native listeners (timers, pointer drags, scroll observers) update
 * the Model by dispatching a custom event on the element that declares the
 * matching `OnCustomEvent` handler. That keeps the view the only place a
 * Message is built while letting the controller live outside a render.
 */
const notify = (element: Element | null, name: string, detail: unknown) => {
  element?.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }))
}

/**
 * `OnCustomEvent` ships on the builder's attribute union but, like the other
 * attribute constructors, is not re-exported from the public entry. Building
 * the tagged value directly keeps this file on the public API.
 */
const onCustomEvent = <M>(
  name: string,
  f: (event: CustomEvent<unknown>) => Option.Option<M>,
): Attribute<M> => ({ _tag: 'OnCustomEvent', name, f })

/**
 * `OnClick` carries a Message built during the render. Buttons whose press
 * must read the latest state, touch the DOM, or start a timer use this lazy
 * handler instead: pointer up, or Enter/Space for the keyboard.
 */
const onPress = (
  h: HtmlBuilder<Message>,
  run: () => Message,
): ReadonlyArray<Attribute<Message>> => [
  h.OnPointerUp(() => Option.some(run())),
  h.OnKeyDownPreventDefault(key =>
    key === 'Enter' || key === ' ' ? Option.some(run()) : Option.none(),
  ),
]

/* 1. History: a note with undo and redo */

const NOTE_SEED = [
  '',
  'Water the ferns',
  'Water the ferns, return the library books',
  'Water the ferns, return the library books, buy oat milk',
]
const NOTE_LIMIT = 12

type NotesState = {
  history: ReadonlyArray<string>
  at: number
  open: boolean
}

const notes = {
  initial: {
    history: NOTE_SEED,
    at: NOTE_SEED.length - 1,
    open: false,
  } as NotesState,
  render: ({ state, set, h }: TileContext<NotesState>) => {
    const back = state.at
    const ahead = state.history.length - 1 - state.at
    const text = state.history[state.at] ?? ''

    const undo = () =>
      set(current =>
        current.at > 0
          ? { ...current, at: current.at - 1, open: false }
          : current,
      )
    const redo = () =>
      set(current =>
        current.at < current.history.length - 1
          ? { ...current, at: current.at + 1, open: false }
          : current,
      )

    return h.div([h.Class('st-notes')], [
      h.header([h.Class('st-notes-head')], [
        h.span([h.Class('st-notes-title')], ['Before Saturday']),
        // PORT NOTE: useShortcutHint's platform text is replaced by a static
        // Ctrl+Z cap pair.
        keys(h, ['Ctrl', 'Z']),
      ]),
      h.textarea([
        h.Class('st-notes-input'),
        h.Attribute('aria-label', 'Note'),
        h.Attribute('aria-keyshortcuts', 'Control+Z Shift+Control+Z'),
        h.Rows(3),
        h.Spellcheck(false),
        h.Autocomplete('off'),
        h.Value(text),
        h.OnInput(value =>
          set(current => {
            // PORT NOTE: the reference groups keystrokes within 800ms and
            // seals on pointerup. Without timers we keep one run open until
            // blur, undo or redo.
            const past = current.history.slice(0, current.at + 1)
            const next = current.open
              ? past.map((entry, index) => (index === current.at ? value : entry))
              : [...past, value]
            const capped =
              next.length > NOTE_LIMIT ? next.slice(next.length - NOTE_LIMIT) : next
            return { ...current, history: capped, at: capped.length - 1, open: true }
          }),
        ),
        h.OnKeyDownPreventDefault((key, modifiers) => {
          if (!(modifiers.metaKey || modifiers.ctrlKey)) return Option.none()
          const name = key.toLowerCase()
          if (name !== 'z') return Option.none()
          return Option.some(modifiers.shiftKey ? redo() : undo())
        }),
        h.OnBlur(set(current => ({ ...current, open: false }))),
      ]),
      h.footer([h.Class('st-notes-foot')], [
        h.button(
          [
            h.Type('button'),
            h.Class('st-notes-btn'),
            h.Attribute(
              'aria-label',
              `Undo, ${back} ${back === 1 ? 'step' : 'steps'}`,
            ),
            h.Disabled(back === 0),
            h.OnClick(undo()),
          ],
          [
            icon(h, 'arrow-u-up-left', 'bold'),
            h.span([h.Class('st-notes-count')], [String(back)]),
          ],
        ),
        h.button(
          [
            h.Type('button'),
            h.Class('st-notes-btn'),
            h.Attribute(
              'aria-label',
              `Redo, ${ahead} ${ahead === 1 ? 'step' : 'steps'}`,
            ),
            h.Disabled(ahead === 0),
            h.OnClick(redo()),
          ],
          [
            icon(h, 'arrow-u-up-right', 'bold'),
            h.span([h.Class('st-notes-count')], [String(ahead)]),
          ],
        ),
        h.span(
          [h.Class('st-notes-trail'), h.Attribute('aria-hidden', 'true')],
          state.history.map((_, index) =>
            h.i(
              [
                h.DataAttribute(
                  'at',
                  index < back ? 'past' : index === back ? 'now' : 'ahead',
                ),
              ],
              [],
            ),
          ),
        ),
      ]),
    ])
  },
}

/* 2. A confirm button: a custom primitive that arms, then acts */

// PORT NOTE: the reference swaps the armed button for an undo button and moves
// focus. Here the confirm button keeps its identity and only its labels and
// `data-armed` change, so focus stays put.
const TRASH_TIMEOUT = 3000
let trashTimer: ReturnType<typeof setTimeout> | undefined
let trashRoot: HTMLElement | null = null
let trashState: TrashState | null = null

type TrashState = { armed: boolean; emptied: boolean }

const trash = {
  initial: { armed: false, emptied: false } as TrashState,
  render: ({ state, set, h }: TileContext<TrashState>) => {
    trashState = state
    const press = () => {
      clearTimeout(trashTimer)
      if (state.armed) return set({ armed: false, emptied: true })
      trashTimer = setTimeout(() => {
        notify(trashRoot, 'st-trash-state', { armed: false, emptied: false })
      }, TRASH_TIMEOUT)
      return set({ armed: true, emptied: false })
    }

    return h.div(
      [
        h.Class('st-trash'),
        ...(state.emptied ? [h.DataAttribute('emptied', '')] : []),
        onCustomEvent('st-trash-state', event =>
          Option.some(set(event.detail as TrashState)),
        ),
        h.OnMount(
          onMount('StudioTrash', element => {
            trashRoot = element
            // A remount loses the arm timer, so drop a stale armed state.
            if (trashState?.armed) {
              notify(element, 'st-trash-state', { ...trashState, armed: false })
            }
            return () => {
              clearTimeout(trashTimer)
              trashRoot = null
            }
          }),
        ),
      ],
      [
        h.div([h.Class('st-trash-card')], [
          h.div([h.Class('st-trash-head')], [
            h.span([h.Class('st-trash-icon')], [icon(h, 'trash', 'fill')]),
            h.span([h.Class('st-trash-text')], [
              h.span([h.Class('st-trash-name')], ['Trash']),
              h.span([h.Class('st-trash-meta')], [
                state.emptied ? 'Nothing in here' : '38 items · 1.2 GB',
              ]),
            ]),
          ]),
          h.div(
            [
              h.Class('st-trash-files'),
              ...(state.emptied ? [h.Attribute('aria-hidden', 'true')] : []),
            ],
            [
              h.ul([], [
                h.li([], [
                  icon(h, 'file-pdf', 'fill'),
                  h.span([], ['invoice-0923.pdf']),
                  h.span([h.Class('st-trash-size')], ['2.1 MB']),
                ]),
                h.li([], [
                  icon(h, 'image', 'fill'),
                  h.span([], ['IMG_4471.heic']),
                  h.span([h.Class('st-trash-size')], ['3.8 MB']),
                ]),
              ]),
            ],
          ),
        ]),
        state.emptied
          ? h.button(
              [
                h.Type('button'),
                h.Class('b-btn st-trash-undo'),
                h.OnClick(set({ armed: false, emptied: false })),
              ],
              [icon(h, 'arrow-counter-clockwise', 'bold'), 'Put back 38 items'],
            )
          : h.button(
              [
                h.Type('button'),
                h.Class('st-confirm'),
                h.Style({ '--st-timeout': `${TRASH_TIMEOUT}ms` }),
                ...(state.armed ? [h.DataAttribute('armed', '')] : []),
                ...onPress(h, press),
              ],
              [
                h.span([h.Class('st-confirm-fill'), h.Attribute('aria-hidden', 'true')], []),
                h.span([h.Class('st-confirm-labels')], [
                  h.span(
                    [
                      h.Class('st-confirm-label'),
                      ...(state.armed ? [h.Attribute('aria-hidden', 'true')] : []),
                    ],
                    ['Empty trash'],
                  ),
                  h.span(
                    [
                      h.Class('st-confirm-label'),
                      h.DataAttribute('second', ''),
                      ...(state.armed ? [] : [h.Attribute('aria-hidden', 'true')]),
                    ],
                    ['Press again to empty'],
                  ),
                ]),
              ],
            ),
      ],
    )
  },
}

/* 3. A controller: a brew timer run by buttons outside it */

const BREW = 240
const TIMER_CELLS = 24

// PORT NOTE: createController/createChange are replaced by this module-level
// clock driven by a 200ms interval and reported through a custom event.
let timerTick: ReturnType<typeof setInterval> | undefined
let timerRemaining = BREW * 1000
let timerDeadline = 0
let timerRunning = false

type TimerState = { left: number; running: boolean }

let timerFace: HTMLElement | null = null
let timerState: TimerState | null = null

const timer = {
  initial: { left: BREW, running: false } as TimerState,
  render: ({ state, set, h }: TileContext<TimerState>) => {
    timerState = state
    const start = () => {
      if (state.running) return set(current => current)
      if (timerRemaining <= 0) timerRemaining = BREW * 1000
      timerDeadline = Date.now() + timerRemaining
      timerRunning = true
      return set({
        running: true,
        left: Math.max(0, Math.ceil(timerRemaining / 1000)),
      })
    }
    const pause = () => {
      if (!timerRunning) return set(current => current)
      timerRemaining = timerDeadline - Date.now()
      timerRunning = false
      return set({
        running: false,
        left: Math.max(0, Math.ceil(timerRemaining / 1000)),
      })
    }
    const reset = () => {
      timerRunning = false
      timerRemaining = BREW * 1000
      return set({ left: BREW, running: false })
    }

    const done = state.left === 0
    const readout = `${String(Math.floor(state.left / 60)).padStart(2, '0')}:${String(state.left % 60).padStart(2, '0')}`
    const lit = Math.round(((BREW - state.left) / BREW) * TIMER_CELLS)
    const digits = (value: string, ghost: boolean) =>
      h.span(
        [
          h.Class(`st-timer-digits${ghost ? ' st-timer-ghost' : ''}`),
          ...(ghost ? [h.Attribute('aria-hidden', 'true')] : []),
        ],
        [...value].map(char =>
          h.span(
            [...(char === ':' ? [h.DataAttribute('colon', '')] : [])],
            [char],
          ),
        ),
      )

    return h.div([h.Class('st-timer')], [
      h.div(
        [
          h.Class('st-timer-face'),
          h.Attribute('role', 'timer'),
          h.Attribute('aria-label', 'French press timer'),
          ...(state.running ? [h.DataAttribute('running', '')] : []),
          onCustomEvent('st-timer-state', event =>
            Option.some(set(event.detail as TimerState)),
          ),
          h.OnMount(
            onMount('StudioBrewTimer', element => {
              timerFace = element
              // Continue the Model's countdown after a remount instead of
              // freezing a running face.
              if (timerState) {
                timerRemaining = timerState.left * 1000
                if (timerState.running) {
                  timerDeadline = Date.now() + timerRemaining
                  timerRunning = true
                }
              }
              timerTick = setInterval(() => {
                if (!timerRunning) return
                timerRemaining = timerDeadline - Date.now()
                const left = Math.max(0, Math.ceil(timerRemaining / 1000))
                if (timerRemaining <= 0) timerRunning = false
                notify(timerFace, 'st-timer-state', { left, running: timerRunning })
              }, 200)
              return () => {
                clearInterval(timerTick)
                timerRunning = false
                timerFace = null
              }
            }),
          ),
        ],
        [
          h.div([h.Class('st-timer-top')], [
            icon(h, 'coffee', 'fill'),
            h.span([], ['French press']),
            h.span(
              [
                h.Class('st-timer-state'),
                ...(done ? [h.DataAttribute('done', '')] : []),
              ],
              [
                done
                  ? 'Ready to pour'
                  : state.running
                    ? 'Steeping'
                    : state.left === BREW
                      ? '4 min steep'
                      : 'Paused',
              ],
            ),
          ]),
          h.p(
            [
              h.Class('st-timer-readout'),
              ...(done ? [h.DataAttribute('done', '')] : []),
            ],
            [digits('88:88', true), digits(readout, false)],
          ),
          h.div(
            [h.Class('st-timer-bar'), h.Attribute('aria-hidden', 'true')],
            Array.from({ length: TIMER_CELLS }, (_, index) =>
              h.i(
                [...(index < lit ? [h.DataAttribute('lit', '')] : [])],
                [],
              ),
            ),
          ),
        ],
      ),
      h.div(
        [h.Class('st-timer-remote'), h.Attribute('role', 'group'), h.Attribute('aria-label', 'Timer controls')],
        [
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn st-timer-go'),
              h.DataAttribute('variant', 'primary'),
              ...onPress(h, () => (state.running ? pause() : start())),
            ],
            [
              icon(h, state.running ? 'pause' : 'play', 'fill'),
              state.running ? 'Pause' : 'Start',
            ],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn st-timer-reset'),
              ...onPress(h, reset),
            ],
            [icon(h, 'arrow-counter-clockwise', 'bold'), 'Reset'],
          ),
        ],
      ),
    ])
  },
}

/* 4. Fuzzy search and grid focus: an emoji picker */

type EmojiEntry = readonly [string, string, string]

const EMOJI: ReadonlyArray<EmojiEntry> = [
  ['😀', 'grinning face', 'smile happy'],
  ['😂', 'face with tears of joy', 'laugh lol'],
  ['🥹', 'face holding back tears', 'grateful touched'],
  ['😍', 'smiling face with heart eyes', 'love crush'],
  ['😎', 'smiling face with sunglasses', 'cool'],
  ['🤔', 'thinking face', 'hmm wonder'],
  ['🫡', 'saluting face', 'yes sir ok'],
  ['😴', 'sleeping face', 'tired zzz'],
  ['🥳', 'partying face', 'party celebrate birthday'],
  ['😭', 'loudly crying face', 'sad sob'],
  ['😤', 'face with steam from nose', 'proud determined'],
  ['🤯', 'exploding head', 'mind blown shocked'],
  ['👍', 'thumbs up', 'yes approve like'],
  ['👎', 'thumbs down', 'no dislike'],
  ['👏', 'clapping hands', 'applause bravo'],
  ['🙌', 'raising hands', 'hooray celebrate'],
  ['🙏', 'folded hands', 'please thanks'],
  ['💪', 'flexed biceps', 'strong'],
  ['👀', 'eyes', 'look see watching'],
  ['🫶', 'heart hands', 'love thanks'],
  ['❤️', 'red heart', 'love'],
  ['🔥', 'fire', 'hot lit'],
  ['⭐', 'star', 'favorite'],
  ['🎉', 'party popper', 'celebrate tada party'],
  ['🚀', 'rocket', 'ship launch fast'],
  ['✅', 'check mark button', 'done yes complete'],
  ['❌', 'cross mark', 'no wrong'],
  ['💯', 'hundred points', 'perfect score'],
  ['💡', 'light bulb', 'idea'],
  ['🐛', 'bug', 'insect issue'],
  ['🧪', 'test tube', 'experiment test'],
  ['📌', 'pushpin', 'pin important'],
  ['⏰', 'alarm clock', 'time late reminder'],
  ['☕', 'hot beverage', 'coffee tea'],
  ['🍕', 'pizza', 'food'],
  ['🌮', 'taco', 'food'],
  ['🍩', 'doughnut', 'donut food sweet'],
  ['🐶', 'dog face', 'puppy pet'],
  ['🐱', 'cat face', 'kitten pet'],
  ['🌈', 'rainbow', 'pride colors'],
  ['☀️', 'sun', 'sunny weather'],
  ['🌧️', 'cloud with rain', 'rain weather'],
  ['🌊', 'water wave', 'ocean sea'],
  ['🌱', 'seedling', 'plant grow new'],
  ['🎯', 'bullseye', 'target goal'],
  ['🏆', 'trophy', 'win award'],
]
const EMOJI_COLS = 7

const HIDDEN_EMOJI: ReadonlyArray<EmojiEntry> = [
  ['▲', 'vercel', 'triangle deploy ship'],
]

/**
 * PORT NOTE: a local subsequence matcher replaces @ui-sdk/core's fuzzyScore.
 * Grid focus uses querySelector instead of createGridFocus, and announce() has
 * no live region here.
 */
const fuzzyScore = (text: string, query: string) => {
  const target = text.toLowerCase()
  const typed = query.trim().toLowerCase()
  if (!typed) return 0
  let score = 0
  let at = 0
  let streak = 0
  for (const char of typed) {
    const found = target.indexOf(char, at)
    if (found === -1) return 0
    streak = found === at ? streak + 1 : 0
    score += 10 + streak * 2 - Math.min(found - at, 6)
    at = found + 1
  }
  return score
}

const findsHidden = (query: string) => {
  const typed = query.trim().toLowerCase()
  return HIDDEN_EMOJI.filter(
    ([, name, keywords]) =>
      typed.length >= 3 &&
      `${name} ${keywords}`.split(' ').some(word => word.startsWith(typed)),
  )
}

const rankEmoji = (query: string) => {
  if (!query.trim()) return EMOJI
  return [...findsHidden(query), ...EMOJI]
    .map(entry => ({
      entry,
      score: Math.max(fuzzyScore(entry[1], query), fuzzyScore(entry[2], query) * 0.9),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ entry }) => entry)
}

let emojiRoot: HTMLElement | null = null

type EmojiState = {
  query: string
  hovered: number | null
  focused: number | null
  active: number | null
  picked: string | null
}

const emoji = {
  initial: {
    query: '',
    hovered: null,
    focused: null,
    active: null,
    picked: '🎉',
  } as EmojiState,
  render: ({ state, set, h }: TileContext<EmojiState>) => {
    const results = rankEmoji(state.query)
    const rows = Array.from(
      { length: Math.ceil(results.length / EMOJI_COLS) },
      (_, row) => results.slice(row * EMOJI_COLS, row * EMOJI_COLS + EMOJI_COLS),
    )
    const preview = state.hovered ?? state.focused
    const shown = preview !== null ? results[preview] : undefined
    const pickedName = [...EMOJI, ...HIDDEN_EMOJI].find(
      entry => entry[0] === state.picked,
    )?.[1]

    const focusCell = (index: number) => {
      emojiRoot
        ?.querySelector<HTMLElement>(`[data-emoji-index="${index}"]`)
        ?.focus()
    }
    const focusSearch = () => {
      emojiRoot?.querySelector<HTMLInputElement>('.st-emoji-input')?.focus()
    }
    const moveTo = (index: number) => {
      const next = Math.max(0, Math.min(index, results.length - 1))
      focusCell(next)
      return set(current => ({ ...current, active: next, focused: next }))
    }
    const pick = (index: number) => {
      const entry = results[index]
      if (!entry) return set(current => current)
      return set(current => ({ ...current, picked: entry[0] }))
    }

    const cellKeydown = (index: number) =>
      (key: string, modifiers: { shiftKey: boolean }) => {
        if (key === 'ArrowLeft') return Option.some(moveTo(index - 1))
        if (key === 'ArrowRight') return Option.some(moveTo(index + 1))
        if (key === 'ArrowUp') {
          if (index < EMOJI_COLS) {
            focusSearch()
            return Option.none()
          }
          return Option.some(moveTo(index - EMOJI_COLS))
        }
        if (key === 'ArrowDown') return Option.some(moveTo(index + EMOJI_COLS))
        if (key.length === 1 && key !== ' ' && !modifiers.shiftKey) {
          // PORT NOTE: typing jumps back to the search field, like the grid's
          // type-to-search behavior in the reference.
          focusSearch()
        }
        return Option.none()
      }

    return h.div(
      [
        h.Class('st-emoji'),
        h.OnMount(
          onMount('StudioEmojiRoot', element => {
            emojiRoot = element
            return () => {
              emojiRoot = null
            }
          }),
        ),
      ],
      [
        h.label([h.Class('st-emoji-search')], [
          icon(h, 'magnifying-glass', 'bold'),
          h.input([
            h.Type('search'),
            h.Class('st-emoji-input'),
            h.Attribute('aria-label', 'Search emoji'),
            h.Placeholder('Search emoji'),
            h.Autocomplete('off'),
            h.Value(state.query),
            h.OnInput(value =>
              set(current => ({
                ...current,
                query: value,
                hovered: null,
                focused: null,
                active: null,
              })),
            ),
            h.OnKeyDownPreventDefault((key) => {
              if (!results.length) return Option.none()
              if (key === 'ArrowDown') return Option.some(moveTo(0))
              if (key === 'Enter') {
                const entry = results[0]
                return Option.some(
                  entry
                    ? set(current => ({ ...current, picked: entry[0] }))
                    : set(current => current),
                )
              }
              return Option.none()
            }),
          ]),
        ]),
        h.div(
          [
            h.Class('st-emoji-grid'),
            h.Attribute('role', 'grid'),
            h.Attribute('aria-label', 'Emoji'),
            h.OnMouseLeave(set(current => ({ ...current, hovered: null }))),
          ],
          [
            ...rows.map((row, rowIndex) =>
              h.div(
                [h.Class('st-emoji-row'), h.Attribute('role', 'row')],
                row.map(([emojiChar, name], col) => {
                  const index = rowIndex * EMOJI_COLS + col
                  return h.button(
                    [
                      h.Type('button'),
                      h.Id(`st-emoji-${rowIndex}-${col}`),
                      h.Class('st-emoji-cell'),
                      h.Attribute('role', 'gridcell'),
                      h.Attribute('aria-label', name),
                      h.DataAttribute('emoji-index', String(index)),
                      h.Tabindex(state.active === index ? 0 : -1),
                      ...(state.active === index
                        ? [h.DataAttribute('active', '')]
                        : []),
                      h.OnClick(pick(index)),
                      h.OnMouseEnter(
                        set(current => ({ ...current, hovered: index })),
                      ),
                      h.OnFocus(
                        set(current => ({ ...current, focused: index })),
                      ),
                      h.OnBlur(set(current => ({ ...current, focused: null }))),
                      h.OnKeyDownPreventDefault(cellKeydown(index)),
                    ],
                    [emojiChar],
                  )
                }),
              ),
            ),
            results.length === 0
              ? h.p([h.Class('st-emoji-none')], [`No emoji for “${state.query}”`])
              : '',
          ],
        ),
        h.div([h.Class('st-emoji-foot'), h.Attribute('aria-live', 'off')], [
          shown
            ? h.span([h.Class('st-emoji-big')], [shown[0]])
            : state.picked
              ? h.span([h.Class('st-emoji-big')], [state.picked])
              : '',
          shown
            ? h.span([h.Class('st-emoji-name')], [shown[1]])
            : state.picked
              ? h.span([h.Class('st-emoji-name')], [
                  h.span([h.Class('st-emoji-dim')], ['Reacted with']),
                  ' ',
                  pickedName ?? '',
                ])
              : '',
        ]),
      ],
    )
  },
}

/* 5. A viewport: a map that fits everything, or just the selection */

type Sight = {
  key: string
  name: string
  kind: 'temple' | 'market' | 'nature' | 'street'
  x: number
  y: number
}

const SIGHTS: ReadonlyArray<Sight> = [
  { key: 'bamboo', name: 'Bamboo Grove', kind: 'nature', x: 92, y: 318 },
  { key: 'kinkaku', name: 'Kinkaku-ji', kind: 'temple', x: 352, y: 96 },
  { key: 'nijo', name: 'Nijō Castle', kind: 'temple', x: 452, y: 282 },
  { key: 'nishiki', name: 'Nishiki Market', kind: 'market', x: 554, y: 346 },
  { key: 'gion', name: 'Gion', kind: 'street', x: 716, y: 384 },
  { key: 'kiyomizu', name: 'Kiyomizu-dera', kind: 'temple', x: 742, y: 460 },
  { key: 'path', name: 'Philosopher’s Path', kind: 'nature', x: 792, y: 196 },
  { key: 'inari', name: 'Fushimi Inari', kind: 'temple', x: 676, y: 618 },
]

type Viewport = { x: number; y: number; zoom: number }

const MAP_MIN_ZOOM = 0.3
const MAP_MAX_ZOOM = 2.5

let mapFrame: HTMLElement | null = null
let mapState: MapState | null = null
let mapDrag: {
  screenX: number
  screenY: number
  viewport: Viewport
} | null = null

const boundsOf = (keys: ReadonlyArray<string>) => {
  const points = SIGHTS.filter(sight => keys.includes(sight.key))
  return {
    left: Math.min(...points.map(point => point.x)),
    top: Math.min(...points.map(point => point.y)),
    right: Math.max(...points.map(point => point.x)),
    bottom: Math.max(...points.map(point => point.y)),
  }
}

const fitViewport = (
  keysToFit: ReadonlyArray<string>,
  padding: number,
  maxZoom: number,
): Viewport | null => {
  if (!mapFrame || keysToFit.length === 0) return null
  const width = mapFrame.clientWidth
  const height = mapFrame.clientHeight
  if (!width || !height) return null
  const bounds = boundsOf(keysToFit)
  const spanX = Math.max(bounds.right - bounds.left, 1)
  const spanY = Math.max(bounds.bottom - bounds.top, 1)
  const zoom = Math.max(
    MAP_MIN_ZOOM,
    Math.min(
      maxZoom,
      (width - padding * 2) / spanX,
      (height - padding * 2) / spanY,
    ),
  )
  return {
    zoom,
    x: (width - spanX * zoom) / 2 - bounds.left * zoom,
    y: (height - spanY * zoom) / 2 - bounds.top * zoom,
  }
}

const zoomBy = (viewport: Viewport, factor: number, width: number, height: number): Viewport => {
  const zoom = Math.max(
    MAP_MIN_ZOOM,
    Math.min(MAP_MAX_ZOOM, viewport.zoom * factor),
  )
  const cx = width / 2
  const cy = height / 2
  return {
    zoom,
    x: cx - (cx - viewport.x) * (zoom / viewport.zoom),
    y: cy - (cy - viewport.y) * (zoom / viewport.zoom),
  }
}

const mapWorldStyle = (viewport: Viewport) => ({
  transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
  transformOrigin: '0 0',
  '--canvas-zoom': String(viewport.zoom),
})

const glide = () => {
  if (!mapFrame || reduced()) return
  mapFrame.setAttribute('data-glide', '')
  setTimeout(() => mapFrame?.removeAttribute('data-glide'), 480)
}

type MapState = { viewport: Viewport; selected: ReadonlyArray<string> }

const MapArt = (h: HtmlBuilder<Message>) =>
  h.svg(
    [
      h.Class('st-map-art'),
      h.Width('2600'),
      h.Height('2000'),
      h.ViewBox('-850 -650 2600 2000'),
      h.Style({ position: 'absolute', left: '-850px', top: '-650px' }),
      h.Attribute('aria-hidden', 'true'),
    ],
    [
      h.defs([], [
        h.pattern(
          [
            h.Id('st-map-blocks'),
            h.Width('40'),
            h.Height('40'),
            h.Attribute('patternUnits', 'userSpaceOnUse'),
            h.X('296'),
            h.Y('112'),
          ],
          [
            h.rect(
              [
                h.X('3'),
                h.Y('3'),
                h.Width('34'),
                h.Height('34'),
                h.Rx('2'),
                h.Class('st-map-block'),
              ],
              [],
            ),
          ],
        ),
      ]),
      h.rect(
        [
          h.X('-850'),
          h.Y('-650'),
          h.Width('2600'),
          h.Height('2000'),
          h.Class('st-map-land'),
        ],
        [],
      ),
      h.path(
        [
          h.Class('st-map-hill'),
          h.D('M-850 -650H1750V40C1500 70 1200 20 900 58S300 30 200 58 -300 30 -850 70Z'),
        ],
        [],
      ),
      h.path(
        [
          h.Class('st-map-hill'),
          h.D('M-850 100C-200 140 60 160 170 260S120 420 150 520 90 700 -60 1350H-850Z'),
        ],
        [],
      ),
      h.path(
        [
          h.Class('st-map-hill'),
          h.D('M1750 60C1100 100 840 160 846 300S800 460 842 560 860 760 1000 1350H1750Z'),
        ],
        [],
      ),
      h.rect(
        [
          h.X('296'),
          h.Y('112'),
          h.Width('484'),
          h.Height('540'),
          h.Fill('url(#st-map-blocks)'),
        ],
        [],
      ),
      h.g([h.Class('st-map-avenues')], [
        h.line([h.X1('296'), h.Y1('352'), h.X2('780'), h.Y2('352')], []),
        h.line([h.X1('516'), h.Y1('112'), h.X2('516'), h.Y2('652')], []),
        h.line([h.X1('436'), h.Y1('112'), h.X2('436'), h.Y2('652')], []),
        h.line([h.X1('296'), h.Y1('192'), h.X2('780'), h.Y2('192')], []),
      ]),
      h.rect(
        [
          h.Class('st-map-park'),
          h.X('482'),
          h.Y('150'),
          h.Width('84'),
          h.Height('104'),
          h.Rx('6'),
        ],
        [],
      ),
      h.path(
        [
          h.Class('st-map-river'),
          h.D('M612 -650C600 120 628 210 616 320S640 520 628 1350'),
        ],
        [],
      ),
      h.path(
        [
          h.Class('st-map-river'),
          h.DataAttribute('wide', ''),
          h.D('M-400 -100C0 100 90 230 150 380S220 560 300 1350'),
        ],
        [],
      ),
      h.text(
        [
          h.Class('st-map-label'),
          h.X('600'),
          h.Y('560'),
          h.Transform('rotate(-86 600 560)'),
        ],
        ['Kamo River'],
      ),
      h.text([h.Class('st-map-label'), h.X('10'), h.Y('430')], ['Arashiyama']),
      h.text(
        [
          h.Class('st-map-label'),
          h.X('872'),
          h.Y('250'),
          h.Transform('rotate(90 872 250)'),
        ],
        ['Higashiyama'],
      ),
    ],
  )

const map = {
  initial: {
    viewport: { x: 0, y: 0, zoom: 1 },
    selected: ['gion', 'kiyomizu'],
  } as MapState,
  render: ({ state, set, h }: TileContext<MapState>) => {
    mapState = state
    const selected = state.selected
    const size = () => ({
      width: mapFrame?.clientWidth ?? 0,
      height: mapFrame?.clientHeight ?? 0,
    })

    const fitAll = (animate = true) => {
      if (animate) glide()
      const viewport = fitViewport(SIGHTS.map(sight => sight.key), 64, 1)
      return viewport
        ? set(current => ({ ...current, viewport }))
        : set(current => current)
    }
    const fitSelection = () => {
      if (!selected.length) return set(current => current)
      glide()
      const viewport = fitViewport(selected, 88, 1.6)
      return viewport
        ? set(current => ({ ...current, viewport }))
        : set(current => current)
    }
    const toggle = (key: string) =>
      set(current => ({
        ...current,
        selected: current.selected.includes(key)
          ? current.selected.filter(other => other !== key)
          : [...current.selected, key],
      }))
    const zoom = (factor: number) => {
      const { width, height } = size()
      if (!width || !height) return set(current => current)
      glide()
      return set(current => ({
        ...current,
        viewport: zoomBy(current.viewport, factor, width, height),
      }))
    }
    const pan = (dx: number, dy: number) =>
      set(current => ({
        ...current,
        viewport: { ...current.viewport, x: current.viewport.x + dx, y: current.viewport.y + dy },
      }))
    const resetZoom = () => {
      const { width, height } = size()
      if (!width || !height) return set(current => current)
      const factor = 1 / state.viewport.zoom
      return set(current => ({
        ...current,
        viewport: zoomBy(current.viewport, factor, width, height),
      }))
    }

    return h.div([h.Class('st-map')], [
      h.div(
        [
          h.Class('st-map-frame'),
          h.Attribute('aria-label', 'Sights map'),
          h.Tabindex(0),
          h.Attribute('role', 'application'),
          h.Attribute('aria-roledescription', 'map'),
          h.Attribute('aria-keyshortcuts', 'Shift+1 Shift+2 + - 0'),
          h.Style({ position: 'relative', overflow: 'clip', touchAction: 'none' }),
          ...(state.viewport.zoom < 0.45 ? [h.DataAttribute('far', '')] : []),
          onCustomEvent('st-map-state', event =>
            Option.some(set(event.detail as MapState)),
          ),
          h.OnMount(
            onMount('StudioSightMap', element => {
              mapFrame = element
              let width = 0
              const fit = () => {
                const viewport = fitViewport(
                  SIGHTS.map(sight => sight.key),
                  64,
                  1,
                )
                if (viewport && mapState) {
                  notify(element, 'st-map-state', { ...mapState, viewport })
                }
              }
              const frame = requestAnimationFrame(fit)
              const observer = new ResizeObserver(() => {
                if (width && Math.abs(element.clientWidth - width) > 1) {
                  fit()
                }
                width = element.clientWidth
              })
              observer.observe(element)
              return () => {
                cancelAnimationFrame(frame)
                observer.disconnect()
                mapFrame = null
              }
            }),
          ),
          h.OnPointerDown((_pointerType, _button, screenX, screenY, _time, _clientX, _clientY, _id, target) => {
            const element = target as Element | null
            if (element?.closest?.('button')) return Option.none()
            mapDrag = { screenX, screenY, viewport: state.viewport }
            return Option.none()
          }),
          h.OnPointerMove((screenX, screenY) => {
            if (!mapDrag) return Option.none()
            const next: Viewport = {
              ...mapDrag.viewport,
              x: mapDrag.viewport.x + (screenX - mapDrag.screenX),
              y: mapDrag.viewport.y + (screenY - mapDrag.screenY),
            }
            return Option.some(set(current => ({ ...current, viewport: next })))
          }),
          h.OnPointerUp(() => {
            mapDrag = null
            return Option.none()
          }),
          h.OnPointerLeave(() => {
            mapDrag = null
            return Option.none()
          }),
          // PORT NOTE: wheel/pinch zoom is left out; the strong zoom targets
          // are the +/- buttons and the keyboard.
          h.OnKeyDownPreventDefault((key, modifiers) => {
            if (modifiers.shiftKey && (key === '1' || key === '!')) {
              return Option.some(fitAll())
            }
            if (modifiers.shiftKey && (key === '2' || key === '@')) {
              return Option.some(fitSelection())
            }
            if (key === 'Escape' && state.selected.length) {
              return Option.some(set(current => ({ ...current, selected: [] })))
            }
            if (key === 'ArrowLeft') return Option.some(pan(60, 0))
            if (key === 'ArrowRight') return Option.some(pan(-60, 0))
            if (key === 'ArrowUp') return Option.some(pan(0, 60))
            if (key === 'ArrowDown') return Option.some(pan(0, -60))
            if (key === '+' || key === '=') return Option.some(zoom(1.25))
            if (key === '-' || key === '_') return Option.some(zoom(0.8))
            if (key === '0') return Option.some(resetZoom())
            return Option.none()
          }),
        ],
        [
          h.div(
            [h.Class('st-map-world'), h.Style(mapWorldStyle(state.viewport))],
            [
              MapArt(h),
              ...SIGHTS.map(sight =>
                h.div(
                  [
                    h.Class('st-pin-anchor'),
                    h.Style({ left: `${sight.x}px`, top: `${sight.y}px` }),
                  ],
                  [
                    h.button(
                      [
                        h.Type('button'),
                        h.Class('st-pin'),
                        h.DataAttribute('kind', sight.kind),
                        h.Attribute('aria-pressed', String(selected.includes(sight.key))),
                        // PORT NOTE: the reference pans to a pin when it takes
                        // focus; focus pans are left out here.
                        h.OnClick(toggle(sight.key)),
                      ],
                      [
                        h.span([h.Class('st-pin-dot'), h.Attribute('aria-hidden', 'true')], []),
                        h.span([h.Class('st-pin-name')], [sight.name]),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
          h.div([h.Class('st-map-title')], [
            icon(h, 'map-trifold', 'fill'),
            h.span([], ['Day 3']),
            h.span([h.Class('st-map-sub')], [`${SIGHTS.length} sights`]),
          ]),
          h.div(
            [
              h.Class('st-map-tools'),
              h.Attribute('role', 'toolbar'),
              h.Attribute('aria-label', 'View'),
            ],
            [
              h.button(
                [
                  h.Type('button'),
                  h.Class('st-map-tool'),
                  h.Attribute('title', 'Fit all (Shift+1)'),
                  ...onPress(h, () => fitAll()),
                ],
                [icon(h, 'corners-out', 'bold'), 'Fit all'],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.Class('st-map-tool'),
                  h.Attribute('title', 'Zoom to selection (Shift+2)'),
                  h.Disabled(selected.length === 0),
                  ...onPress(h, fitSelection),
                ],
                [
                  icon(h, 'crosshair-simple', 'bold'),
                  'Selection',
                  selected.length > 0
                    ? h.span([h.Class('st-map-badge')], [String(selected.length)])
                    : '',
                ],
              ),
            ],
          ),
          h.p([h.Class('st-map-status')], [
            selected.length
              ? `${selected.length} selected`
              : 'Click sights to select',
            selected.length
              ? h.span([h.Class('st-map-esc')], ['\u00a0· Esc clears'])
              : '',
          ]),
          h.div(
            [
              h.Class('st-map-zoom'),
              h.Attribute('role', 'group'),
              h.Attribute('aria-label', 'Zoom'),
            ],
            [
              h.button(
                [
                  h.Type('button'),
                  h.Class('st-map-tool'),
                  h.Attribute('aria-label', 'Zoom out'),
                  ...onPress(h, () => zoom(0.8)),
                ],
                [icon(h, 'magnifying-glass-minus', 'bold')],
              ),
              h.span(
                [
                  h.Class('st-map-percent'),
                  h.DataAttribute('zoom', `${Math.round(state.viewport.zoom * 100)}%`),
                ],
                [],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.Class('st-map-tool'),
                  h.Attribute('aria-label', 'Zoom in'),
                  ...onPress(h, () => zoom(1.25)),
                ],
                [icon(h, 'magnifying-glass-plus', 'bold')],
              ),
            ],
          ),
        ],
      ),
    ])
  },
}

/* 6. Spans: a week you draw on */

type Plan = {
  id: string
  track: string
  start: number
  end: number
  title: string
  hue: number
}

const WEEK = [
  { key: 'mon', name: 'Mon', long: 'Monday', date: 2 },
  { key: 'tue', name: 'Tue', long: 'Tuesday', date: 3 },
  { key: 'wed', name: 'Wed', long: 'Wednesday', date: 4 },
  { key: 'thu', name: 'Thu', long: 'Thursday', date: 5 },
  { key: 'fri', name: 'Fri', long: 'Friday', date: 6 },
]
const W_START = 8 * 60
const W_END = 18 * 60
const HOUR_PX = 36
const dayLong = (key: string) => WEEK.find(day => day.key === key)?.long ?? key

const WEEK_PLANS: ReadonlyArray<Plan> = [
  { id: 'yoga', track: 'mon', start: 9 * 60, end: 10 * 60, title: 'Yoga', hue: 150 },
  { id: 'sync', track: 'mon', start: 9 * 60 + 30, end: 11 * 60, title: 'Sync', hue: 255 },
  { id: 'ramen', track: 'tue', start: 12 * 60, end: 13 * 60, title: 'Ramen', hue: 40 },
  { id: 'portfolio', track: 'wed', start: 10 * 60, end: 11 * 60 + 30, title: 'Folio review', hue: 300 },
  { id: 'dentist', track: 'thu', start: 9 * 60 + 15, end: 10 * 60, title: 'Dentist', hue: 200 },
  { id: 'demo', track: 'fri', start: 10 * 60 + 30, end: 12 * 60, title: 'Demo day', hue: 20 },
]

const stackSpans = (plans: ReadonlyArray<Plan>) => {
  const result = new Map<string, { lane: number; lanes: number }>()
  const sorted = [...plans].sort((a, b) => a.start - b.start || b.end - a.end)
  let group: Plan[] = []
  let lanes: number[] = []
  let groupEnd = -Infinity
  const close = () => {
    for (const plan of group) {
      const entry = result.get(plan.id)
      if (entry) entry.lanes = lanes.length
    }
    group = []
    lanes = []
  }
  for (const plan of sorted) {
    if (plan.start >= groupEnd) close()
    let lane = lanes.findIndex(end => end <= plan.start)
    if (lane === -1) lane = lanes.push(plan.end) - 1
    else lanes[lane] = plan.end
    result.set(plan.id, { lane, lanes: 0 })
    group.push(plan)
    groupEnd = Math.max(groupEnd === -Infinity ? plan.end : groupEnd, plan.end)
  }
  close()
  return result
}

const percent = (n: number) => `${Math.round(n * 1e4) / 100}%`

let weekRoot: HTMLElement | null = null
let weekState: WeekState | null = null
let weekMade = 0
let weekDraw: { track: string; start: number } | null = null
let weekSpanStop: (() => void) | undefined

const snap = (value: number, step = 15) => Math.round(value / step) * step

const W_MIN = 30
const W_MAX = 240

const valueAt = (track: string, clientY: number) => {
  const element = weekRoot?.querySelector<HTMLElement>(
    `[data-week-track="${track}"]`,
  )
  if (!element) return W_START
  const rect = element.getBoundingClientRect()
  if (!rect.height) return W_START
  const raw = W_START + ((clientY - rect.top) / rect.height) * (W_END - W_START)
  return Math.max(W_START, Math.min(W_END, snap(raw)))
}

/** The visible day column a pointer is closest to, as `createSpans.trackAt` finds it. */
const weekTrackAt = (x: number) => {
  let best: { key: string; distance: number } | undefined
  weekRoot?.querySelectorAll<HTMLElement>('[data-week-track]').forEach(track => {
    const rect = track.getBoundingClientRect()
    const distance = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0
    if (!best || distance < best.distance) {
      best = { key: track.dataset.weekTrack ?? '', distance }
    }
  })
  return best?.key
}

type WeekState = {
  plans: ReadonlyArray<Plan>
  draft: { track: string; start: number; end: number } | null
  hover: { track: string; at: number } | null
  days: number
  dragging: { id: string; action: 'move' | 'resize' } | null
}

const week = {
  initial: {
    plans: WEEK_PLANS,
    draft: null,
    hover: null,
    days: 5,
    dragging: null,
  } as WeekState,
  render: ({ state, set, h }: TileContext<WeekState>) => {
    weekState = state
    const apply = (next: WeekState) => {
      weekState = next
      notify(weekRoot, 'st-week-state', next)
    }
    const shown = WEEK.slice(0, state.days)
    const columns = { gridTemplateColumns: `44px repeat(${state.days}, minmax(0, 1fr))` }
    const lanes = (plans: ReadonlyArray<Plan>) => stackSpans(plans)

    return h.div(
      [
        h.Class('st-week'),
        onCustomEvent('st-week-state', event =>
          Option.some(set(event.detail as WeekState)),
        ),
        h.OnMount(
          onMount('StudioWeek', element => {
            weekRoot = element
            const scroller = element.querySelector<HTMLElement>('.st-week-scroll')
            let scrolled = false
            const startAtNine = () => {
              if (scrolled || !scroller || !scroller.scrollHeight) return
              scroller.scrollTop = HOUR_PX - 12
              scrolled = true
            }
            startAtNine()
            const observer = new ResizeObserver(() => {
              startAtNine()
              const days = element.clientWidth < 440 ? 3 : 5
              if (weekState && weekState.days !== days) {
                apply({ ...weekState, days })
              }
            })
            observer.observe(element)

            // PORT NOTE: drawing lives on delegated native pointer listeners so
            // the drawn range can follow the real clientY; the reference gets
            // that from createSpans' bindTrack.
            const trackAt = (target: EventTarget | null) =>
              (target as Element | null)?.closest?.('[data-week-track]') as
                | HTMLElement
                | null

            const down = (event: PointerEvent) => {
              const track = trackAt(event.target)
              if (!track || !weekState) return
              const key = track.dataset.weekTrack ?? ''
              const spanEl = (event.target as Element | null)?.closest?.(
                '[data-span-id]',
              ) as HTMLElement | null
              if (spanEl) {
                // PORT NOTE: the reference moves a span from its body and
                // resizes it from its `data-span-edge` handles through
                // createSpans. The same geometry runs here on bindDrag: the
                // grabbed minute offset is kept, a move snaps to the nearest
                // day column, and a resize keeps the far end fixed with a
                // 30-minute minimum and the 4-hour maximum.
                const id = spanEl.dataset.spanId ?? ''
                const plan = weekState.plans.find(item => item.id === id)
                if (!plan) return
                const edge =
                  (event.target as Element | null)?.closest?.(
                    '[data-span-edge]',
                  )?.getAttribute('data-span-edge') ?? ''
                const action: 'move' | 'resize' =
                  edge === 'start' || edge === 'end' ? 'resize' : 'move'
                const grabbed = valueAt(plan.track, event.clientY) - plan.start
                weekSpanStop?.()
                const stop = bindDrag(element, event, {
                  threshold: dragThreshold,
                  cancelOnEscape: true,
                  onStart: () => {
                    if (weekState) apply({ ...weekState, dragging: { id, action } })
                  },
                  onMove: sample => {
                    if (!weekState) return
                    const next =
                      action === 'resize'
                        ? edge === 'start'
                          ? {
                              ...plan,
                              start: Math.max(
                                W_START,
                                plan.end - W_MAX,
                                Math.min(valueAt(plan.track, sample.y), plan.end - W_MIN),
                              ),
                            }
                          : {
                              ...plan,
                              end: Math.min(
                                W_END,
                                plan.start + W_MAX,
                                Math.max(valueAt(plan.track, sample.y), plan.start + W_MIN),
                              ),
                            }
                        : (() => {
                            const to = weekTrackAt(sample.x) ?? plan.track
                            const start = Math.max(
                              W_START,
                              Math.min(
                                valueAt(to, sample.y) - grabbed,
                                W_END - (plan.end - plan.start),
                              ),
                            )
                            return { ...plan, track: to, start, end: start + (plan.end - plan.start) }
                          })()
                    apply({
                      ...weekState,
                      plans: weekState.plans.map(item => (item.id === id ? next : item)),
                    })
                  },
                  onEnd: () => {
                    if (weekState?.dragging) apply({ ...weekState, dragging: null })
                    if (weekSpanStop === stop) weekSpanStop = undefined
                  },
                })
                weekSpanStop = stop
                return
              }
              const at = Math.min(valueAt(key, event.clientY), W_END - 60)
              weekDraw = { track: key, start: at }
              apply({
                ...weekState,
                draft: { track: key, start: at, end: at + 60 },
                hover: { track: key, at },
              })
            }
            const move = (event: PointerEvent) => {
              if (!weekState) return
              if (weekDraw) {
                const at = Math.max(
                  W_START + 30,
                  Math.min(W_END, valueAt(weekDraw.track, event.clientY)),
                )
                const start = Math.min(weekDraw.start, at - 30)
                apply({
                  ...weekState,
                  draft: { track: weekDraw.track, start, end: Math.max(at, start + 30) },
                  hover: { track: weekDraw.track, at },
                })
                return
              }
              if ((event.target as Element | null)?.closest?.('[data-span-id]')) {
                if (weekState.hover) apply({ ...weekState, hover: null })
                return
              }
              const track = trackAt(event.target)
              if (!track) return
              const key = track.dataset.weekTrack ?? ''
              const at = Math.min(valueAt(key, event.clientY), W_END - 60)
              if (weekState.hover?.track !== key || weekState.hover.at !== at) {
                apply({ ...weekState, hover: { track: key, at } })
              }
            }
            const up = () => {
              if (!weekState) return
              if (weekDraw) {
                const draft = weekState.draft
                if (draft) {
                  weekMade += 1
                  apply({
                    ...weekState,
                    plans: [
                      ...weekState.plans,
                      {
                        id: `st-block-${weekMade}`,
                        track: draft.track,
                        start: draft.start,
                        end: draft.end,
                        title: 'Focus time',
                        hue: 85,
                      },
                    ],
                    draft: null,
                  })
                }
                weekDraw = null
              }
            }
            const leave = () => {
              if (!weekState || weekDraw) return
              apply({ ...weekState, hover: null })
            }
            element.addEventListener('pointerdown', down)
            element.addEventListener('pointermove', move)
            element.addEventListener('pointerleave', leave)
            window.addEventListener('pointerup', up)

            return () => {
              observer.disconnect()
              element.removeEventListener('pointerdown', down)
              element.removeEventListener('pointermove', move)
              element.removeEventListener('pointerleave', leave)
              window.removeEventListener('pointerup', up)
              weekSpanStop?.()
              weekSpanStop = undefined
              weekDraw = null
              weekRoot = null
            }
          }),
        ),
      ],
      [
        h.header([h.Class('st-week-head')], [
          h.span([h.Class('st-week-range')], [
            'November ',
            h.span([], [`2 – ${shown[shown.length - 1]?.date ?? 6}`]),
          ]),
          h.span([h.Class('st-week-hint')], [
            state.hover
              ? `${dayLong(state.hover.track)} ${clock(state.hover.at)}`
              : 'Drag on a day to add',
          ]),
        ]),
        h.div([h.Class('st-week-scroll')], [
          h.div(
            [h.Class('st-week-days'), h.Style(columns), h.Attribute('aria-hidden', 'true')],
            [
              h.span([], []),
              ...shown.map(day =>
                h.span([h.Class('st-week-day')], [
                  `${day.name} `,
                  h.b([], [String(day.date)]),
                ]),
              ),
            ],
          ),
          h.div([h.Class('st-week-body'), h.Style(columns)], [
            h.div([h.Class('st-week-hours'), h.Attribute('aria-hidden', 'true')], [
              ...Array.from(
                { length: (W_END - W_START) / 60 - 1 },
                (_, index) => 9 + index,
              ).map(hour =>
                h.span(
                  [h.Style({ top: `${(hour * 60 - W_START) * (HOUR_PX / 60)}px` })],
                  [`${hour}:00`],
                ),
              ),
            ]),
            ...shown.map(day => {
              const dayPlans = state.plans.filter(plan => plan.track === day.key)
              const dayLanes = lanes(dayPlans)
              return h.div(
                [
                  h.Class('st-week-track'),
                  h.DataAttribute('week-track', day.key),
                  h.Attribute('role', 'group'),
                  h.Attribute(
                    'aria-label',
                    `${day.long}, November ${WEEK.find(other => other.key === day.key)?.date ?? day.date}`,
                  ),
                  h.Style({
                    position: 'relative',
                    touchAction: 'none',
                    userSelect: 'none',
                  }),
                ],
                [
                  state.hover?.track === day.key && !state.draft
                    ? h.span(
                        [
                          h.Class('st-week-ghost'),
                          h.Attribute('aria-hidden', 'true'),
                          h.Style({
                            top: `${((state.hover.at - W_START) / (W_END - W_START)) * 100}%`,
                            height: `${(60 / (W_END - W_START)) * 100}%`,
                          }),
                        ],
                        [clock(state.hover.at)],
                      )
                    : '',
                  state.draft?.track === day.key
                    ? h.div(
                        [
                          h.Class('st-plan'),
                          h.DataAttribute('drawing', ''),
                          h.Style({
                            position: 'absolute',
                            top: percent(
                              (state.draft.start - W_START) / (W_END - W_START),
                            ),
                            height: percent(
                              (state.draft.end - state.draft.start) /
                                (W_END - W_START),
                            ),
                            '--hue': '85',
                          }),
                        ],
                        [
                          h.span([h.Class('st-plan-title')], ['Focus time']),
                          h.span([h.Class('st-plan-time')], [
                            `${clock(state.draft.start)}–${clock(state.draft.end)}`,
                          ]),
                        ],
                      )
                    : '',
                  ...dayPlans.map(plan => {
                    const lane = dayLanes.get(plan.id)
                    const from = (plan.start - W_START) / (W_END - W_START)
                    const size = (plan.end - plan.start) / (W_END - W_START)
                    const short = plan.end - plan.start < 60
                    return h.div(
                      [
                        h.Class('st-plan'),
                        h.DataAttribute('span-id', plan.id),
                        h.Attribute('tabindex', '0'),
                        h.Attribute('role', 'button'),
                        h.Attribute('aria-roledescription', 'event'),
                        h.Attribute(
                          'aria-label',
                          `${plan.title}, ${dayLong(plan.track)} ${clock(plan.start)} to ${clock(plan.end)}`,
                        ),
                        ...(short ? [h.DataAttribute('short', '')] : []),
                        ...(state.dragging?.id === plan.id
                          ? [
                              state.dragging.action === 'move'
                                ? h.DataAttribute('dragging', '')
                                : h.DataAttribute('resizing', ''),
                            ]
                          : []),
                        h.Style({
                          position: 'absolute',
                          top: percent(from),
                          height: percent(size),
                          // As createSpans' spanStyle, the lane place is always
                          // set — a lone plan takes the whole column instead
                          // of shrinking to its text.
                          ...(lane
                            ? {
                                insetInlineStart: percent(lane.lane / lane.lanes),
                                width: percent(1 / lane.lanes),
                              }
                            : {}),
                          '--hue': String(plan.hue),
                        }),
                        // PORT NOTE: the reference drags bodies and edges
                        // through createSpans; the arrow keys keep the
                        // reference's keyboard side of that.
                        h.OnKeyDownPreventDefault((key, modifiers) => {
                          if (key === 'Delete' || key === 'Backspace') {
                            return Option.some(
                              set(current => ({
                                ...current,
                                plans: current.plans.filter(
                                  other => other.id !== plan.id,
                                ),
                              })),
                            )
                          }
                          if (key === 'ArrowLeft' || key === 'ArrowRight') {
                            const index = WEEK.findIndex(
                              day => day.key === plan.track,
                            )
                            const next = WEEK[index + (key === 'ArrowRight' ? 1 : -1)]
                            const shownKeys = WEEK.slice(0, state.days).map(
                              day => day.key,
                            )
                            if (!next || !shownKeys.includes(next.key)) {
                              return Option.none()
                            }
                            return Option.some(
                              set(current => ({
                                ...current,
                                plans: current.plans.map(other =>
                                  other.id === plan.id
                                    ? { ...other, track: next.key }
                                    : other,
                                ),
                              })),
                            )
                          }
                          const step = 15
                          const move = key === 'ArrowUp' ? -step : key === 'ArrowDown' ? step : 0
                          if (!move) return Option.none()
                          return Option.some(
                            set(current => ({
                              ...current,
                              plans: current.plans.map(other => {
                                if (other.id !== plan.id) return other
                                if (modifiers.shiftKey) {
                                  return {
                                    ...other,
                                    end: Math.max(
                                      other.start + 15,
                                      Math.min(W_END, other.end + move),
                                    ),
                                  }
                                }
                                const delta = Math.max(
                                  W_START - other.start,
                                  Math.min(W_END - other.end, move),
                                )
                                return {
                                  ...other,
                                  start: other.start + delta,
                                  end: other.end + delta,
                                }
                              }),
                            })),
                          )
                        }),
                      ],
                      [
                        h.span(
                          [
                            h.DataAttribute('span-edge', 'start'),
                            h.Class('st-plan-edge'),
                            h.DataAttribute('edge', 'start'),
                          ],
                          [],
                        ),
                        h.span([h.Class('st-plan-title')], [plan.title]),
                        h.span([h.Class('st-plan-time')], [
                          `${clock(plan.start)}–${clock(plan.end)}`,
                        ]),
                        h.span(
                          [
                            h.DataAttribute('span-edge', 'end'),
                            h.Class('st-plan-edge'),
                            h.DataAttribute('edge', 'end'),
                          ],
                          [],
                        ),
                      ],
                    )
                  }),
                ],
              )
            }),
          ]),
        ]),
      ],
    )
  },
}

/* 7. Stick to bottom: a chat that follows until you scroll up */

type ChatItem = {
  id: number
  from: 'me' | 'them'
  text: string
  time: string
  fresh?: boolean
}

const CHAT: ReadonlyArray<ChatItem> = [
  { id: 1, from: 'them', text: 'Kiln’s loaded. Firing starts at 6 tomorrow.', time: '17:42' },
  { id: 2, from: 'me', text: 'Did the celadon test tiles go in?', time: '17:44' },
  { id: 3, from: 'them', text: 'Top shelf, left side. Fingers crossed.', time: '17:45' },
  { id: 4, from: 'me', text: 'I’ll bring boards for the open day.', time: '17:51' },
  { id: 5, from: 'them', text: 'Can you grab 20 kg of buff stoneware?', time: '17:52' },
  { id: 6, from: 'them', text: 'The speckled clay bloated last time.', time: '17:52' },
  { id: 7, from: 'me', text: 'On it. See you at 9?', time: '17:58' },
  { id: 8, from: 'them', text: '9 works. Doors open to visitors at 11.', time: '18:01' },
]
const REPLIES = [
  'Cone 6 reached. Holding for 15 minutes.',
  'Cooling now. Don’t open it before noon!',
  'Peeked anyway. The celadon came out glassy.',
  'One tile cracked, the rest are perfect.',
  'Bring the wide shelf for the display.',
]

const nowTime = () =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(
    new Date(),
  )

let chatLog: HTMLElement | null = null
let chatState: ChatState | null = null
let chatNextId = CHAT.length

const scrollChat = (smooth: boolean) => {
  if (!chatLog) return
  chatLog.scrollTo({
    top: chatLog.scrollHeight,
    behavior: smooth && !reduced() ? 'smooth' : 'auto',
  })
}

const chatAtBottom = () => {
  if (!chatLog) return true
  return chatLog.scrollHeight - chatLog.scrollTop - chatLog.clientHeight < 48
}

type ChatState = {
  messages: ReadonlyArray<ChatItem>
  draft: string
  replies: number
  newBelow: number
  following: boolean
  atBottom: boolean
}

const chat = {
  initial: {
    messages: CHAT,
    draft: '',
    replies: 0,
    newBelow: 0,
    following: true,
    atBottom: true,
  } as ChatState,
  render: ({ state, set, h }: TileContext<ChatState>) => {
    chatState = state
    const send = () => {
      const text = state.draft.trim()
      if (!text) return set(current => current)
      chatNextId += 1
      return set(current => ({
        ...current,
        draft: '',
        newBelow: current.following ? 0 : current.newBelow + 1,
        messages: [
          ...current.messages,
          { id: chatNextId, from: 'me', text, time: nowTime(), fresh: true },
        ],
      }))
    }
    const reply = () =>
      set(current => {
        const text = REPLIES[current.replies % REPLIES.length] ?? ''
        chatNextId += 1
        return {
          ...current,
          replies: current.replies + 1,
          newBelow: current.following ? 0 : current.newBelow + 1,
          messages: [
            ...current.messages,
            { id: chatNextId, from: 'them', text, time: nowTime(), fresh: true },
          ],
        }
      })
    const jump = () => {
      setTimeout(() => scrollChat(true), 0)
      return set(current => ({
        ...current,
        newBelow: 0,
        following: true,
        atBottom: true,
      }))
    }

    return h.div([h.Class('st-chat')], [
      h.header([h.Class('st-chat-head')], [
        h.span([h.Class('st-chat-avatar'), h.Attribute('aria-hidden', 'true')], ['ID']),
        h.span([h.Class('st-chat-who')], [
          h.span([h.Class('st-chat-name')], ['Inês Duarte']),
          h.span([h.Class('st-chat-sub')], ['Clay studio']),
        ]),
      ]),
      h.div([h.Class('st-chat-wrap')], [
        h.div(
          [
            h.Class('st-chat-log'),
            h.Attribute('role', 'log'),
            h.Tabindex(0),
            h.Attribute('aria-label', 'Messages with Inês'),
            h.Style({ overflow: 'auto' }),
            onCustomEvent('st-chat-state', event =>
              Option.some(set(event.detail as ChatState)),
            ),
            h.OnMount(
              onMount('StudioChatLog', element => {
                chatLog = element
                element.scrollTop = element.scrollHeight
                // PORT NOTE: stickiness is derived from the live element so it
                // matches createStickToBottom's 48px threshold.
                const scroll = () => {
                  if (!chatState) return
                  const bottom = chatAtBottom()
                  if (
                    chatState.following === bottom &&
                    chatState.atBottom === bottom
                  ) {
                    return
                  }
                  const next = { ...chatState, following: bottom, atBottom: bottom }
                  chatState = next
                  notify(element, 'st-chat-state', next)
                }
                element.addEventListener('scroll', scroll, { passive: true })
                // A hidden tile mounts with no height; follow the bottom once
                // it has one, like the reference's stick-to-bottom resize.
                const observer = new ResizeObserver(() => {
                  if (chatState?.following) {
                    element.scrollTop = element.scrollHeight
                  }
                })
                observer.observe(element)
                return () => {
                  element.removeEventListener('scroll', scroll)
                  observer.disconnect()
                  chatLog = null
                }
              }),
            ),
          ],
          state.messages.map((message, index) => {
            const next = state.messages[index + 1]
            const last = !next || next.from !== message.from
            return h.div(
              [
                h.Class('st-msg'),
                h.DataAttribute('from', message.from),
                ...(last ? [h.DataAttribute('last', '')] : []),
                ...(message.fresh ? [h.DataAttribute('fresh', '')] : []),
              ],
              [
                h.p([h.Class('st-bubble')], [message.text]),
                last ? h.span([h.Class('st-msg-time')], [message.time]) : '',
              ],
            )
          }),
        ),
        h.button(
          [
            h.Type('button'),
            h.Class('st-chat-jump'),
            h.Tabindex(state.newBelow ? 0 : -1),
            ...(state.newBelow
              ? [h.DataAttribute('visible', '')]
              : [h.Attribute('aria-hidden', 'true')]),
            ...onPress(h, jump),
          ],
          [
            icon(h, 'arrow-down', 'bold', 14),
            `${state.newBelow} new ${state.newBelow === 1 ? 'message' : 'messages'}`,
          ],
        ),
      ]),
      h.div([h.Class('st-chat-compose')], [
        h.input([
          h.Type('text'),
          h.Class('st-chat-input'),
          h.Attribute('aria-label', 'Message'),
          h.Placeholder('Message Inês'),
          h.Autocomplete('off'),
          h.Value(state.draft),
          h.OnInput(value => set(current => ({ ...current, draft: value }))),
          h.OnKeyDownPreventDefault((key) => {
            if (key !== 'Enter') return Option.none()
            const message = send()
            setTimeout(() => scrollChat(false), 0)
            return Option.some(message)
          }),
        ]),
        h.button(
          [
            h.Type('button'),
            h.Class('st-chat-send'),
            h.Attribute('aria-label', 'Send'),
            h.Disabled(!state.draft.trim()),
            ...onPress(h, () => {
              const message = send()
              setTimeout(() => scrollChat(false), 0)
              return message
            }),
          ],
          [icon(h, 'paper-plane-right', 'fill')],
        ),
      ]),
      h.div([h.Class('st-chat-foot')], [
        h.span(
          [
            h.Class('st-chat-follow'),
            ...(state.following ? [h.DataAttribute('following', '')] : []),
          ],
          [state.following ? 'Following' : 'Paused'],
        ),
        h.button(
          [
            h.Type('button'),
            h.Class('b-btn st-chat-reply'),
            h.DataAttribute('variant', 'ghost'),
            ...onPress(h, () => {
              const message = reply()
              if (state.following) setTimeout(() => scrollChat(false), 0)
              return message
            }),
          ],
          ['Simulate reply'],
        ),
      ]),
    ])
  },
}

/* 8. Move: a group of layers that travel together */

const SLIDE = { w: 246, h: 138 }
const LAYERS: Record<
  string,
  { label: string; w: number; h: number; locked?: boolean }
> = {
  title: { label: 'Title, Q4 revenue', w: 116, h: 24 },
  chart: { label: 'Bar chart', w: 96, h: 62 },
  callout: { label: 'Callout, up 18 percent', w: 78, h: 24 },
  stripe: { label: 'Brand stripe, locked', w: 44, h: 16, locked: true },
}

type Point = { x: number; y: number }

type SlideState = {
  positions: Record<string, Point>
  selected: ReadonlyArray<string>
  focused: string | null
}

const groupBox = (state: SlideState) => {
  if (!state.selected.length) return null
  const boxes = state.selected.map(key => {
    const at = state.positions[key] ?? { x: 0, y: 0 }
    return { x: at.x, y: at.y, r: at.x + LAYERS[key].w, b: at.y + LAYERS[key].h }
  })
  const x = Math.min(...boxes.map(box => box.x))
  const y = Math.min(...boxes.map(box => box.y))
  return {
    x,
    y,
    w: Math.max(...boxes.map(box => box.r)) - x,
    h: Math.max(...boxes.map(box => box.b)) - y,
  }
}

let slideBoard: HTMLElement | null = null
let slideState: SlideState | null = null
let slideDrag: {
  ids: ReadonlyArray<string>
  origins: Record<string, Point>
  screenX: number
  screenY: number
} | null = null

const SLIDE_INITIAL: SlideState = {
  positions: {
    title: { x: 16, y: 14 },
    chart: { x: 16, y: 54 },
    callout: { x: 124, y: 70 },
    stripe: { x: 186, y: 16 },
  },
  selected: ['chart', 'callout'],
  focused: null,
}

const slide = {
  initial: SLIDE_INITIAL as SlideState,
  render: ({ state, set, h }: TileContext<SlideState>) => {
    slideState = state
    const apply = (next: SlideState) => {
      slideState = next
      notify(slideBoard, 'st-slide-state', next)
    }
    const box = groupBox(state)

    return h.div([h.Class('st-slide')], [
      h.div(
        [
          h.Class('st-slide-board'),
          h.Attribute('role', 'listbox'),
          h.Attribute('aria-multiselectable', 'true'),
          h.Attribute('aria-roledescription', 'slide'),
          h.Attribute('aria-label', 'Slide layers'),
          h.Style({ position: 'relative' }),
          onCustomEvent('st-slide-state', event =>
            Option.some(set(event.detail as SlideState)),
          ),
          h.OnMount(
            onMount('StudioSlideBoard', element => {
              slideBoard = element
              const layerAt = (target: EventTarget | null) =>
                (target as Element | null)?.closest?.('[data-layer-id]') as
                  | HTMLElement
                  | null

              // PORT NOTE: shift-click grouping needs the native event, so the
              // board owns the pointer listeners and createMove's group drag.
              // Arrow-key roving between layers is left to the tab order.
              const down = (event: PointerEvent) => {
                const current = slideState
                if (!current) return
                const layer = layerAt(event.target)
                if (!layer) {
                  apply({ ...current, selected: [], focused: null })
                  return
                }
                const key = layer.dataset.layerId ?? ''
                if (LAYERS[key]?.locked) return
                let selected: ReadonlyArray<string>
                if (event.shiftKey) {
                  selected = current.selected.includes(key)
                    ? current.selected.filter(other => other !== key)
                    : [...current.selected, key]
                } else {
                  selected = current.selected.includes(key)
                    ? current.selected
                    : [key]
                }
                const origins: Record<string, Point> = {}
                for (const id of selected) {
                  origins[id] = current.positions[id] ?? { x: 0, y: 0 }
                }
                slideDrag = { ids: selected, origins, screenX: event.screenX, screenY: event.screenY }
                apply({ ...current, selected, focused: key })
                layer.setPointerCapture?.(event.pointerId)
              }
              const move = (event: PointerEvent) => {
                const current = slideState
                if (!current || !slideDrag) return
                const { ids, origins } = slideDrag
                const boxes = ids.map(id => {
                  const at = origins[id]
                  return {
                    x: at.x,
                    y: at.y,
                    r: at.x + LAYERS[id].w,
                    b: at.y + LAYERS[id].h,
                  }
                })
                const minX = Math.min(...boxes.map(item => item.x))
                const maxX = Math.max(...boxes.map(item => item.r))
                const minY = Math.min(...boxes.map(item => item.y))
                const maxY = Math.max(...boxes.map(item => item.b))
                const dx = Math.max(-minX, Math.min(SLIDE.w - maxX, event.screenX - slideDrag.screenX))
                const dy = Math.max(-minY, Math.min(SLIDE.h - maxY, event.screenY - slideDrag.screenY))
                const positions = { ...current.positions }
                for (const id of ids) {
                  positions[id] = { x: origins[id].x + dx, y: origins[id].y + dy }
                }
                apply({ ...current, positions })
              }
              const up = () => {
                if (!slideDrag) return
                slideDrag = null
                // Clear the dragging outline without waiting for the next move.
                if (slideState) apply({ ...slideState })
              }
              const keydown = (event: KeyboardEvent) => {
                const current = slideState
                if (!current) return
                if (event.key === 'Escape') {
                  event.preventDefault()
                  apply({ ...current, selected: [] })
                  return
                }
                const focused =
                  current.focused ??
                  (event.target as Element | null)?.closest?.('[data-layer-id]')?.getAttribute('data-layer-id')
                if (!focused) return
                if (event.key === ' ') {
                  event.preventDefault()
                  const selected = current.selected.includes(focused)
                    ? current.selected.filter(other => other !== focused)
                    : [...current.selected, focused]
                  apply({ ...current, selected })
                  return
                }
                if (event.altKey && event.key.startsWith('Arrow')) {
                  event.preventDefault()
                  const step = 2
                  const dx = event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0
                  const dy = event.key === 'ArrowUp' ? -step : event.key === 'ArrowDown' ? step : 0
                  const ids = current.selected.includes(focused)
                    ? current.selected
                    : [focused]
                  const positions = { ...current.positions }
                  for (const id of ids) {
                    const at = positions[id]
                    positions[id] = {
                      x: Math.max(0, Math.min(SLIDE.w - LAYERS[id].w, at.x + dx)),
                      y: Math.max(0, Math.min(SLIDE.h - LAYERS[id].h, at.y + dy)),
                    }
                  }
                  apply({ ...current, positions })
                }
              }
              element.addEventListener('pointerdown', down)
              window.addEventListener('pointermove', move)
              window.addEventListener('pointerup', up)
              element.addEventListener('keydown', keydown)
              return () => {
                element.removeEventListener('pointerdown', down)
                window.removeEventListener('pointermove', move)
                window.removeEventListener('pointerup', up)
                element.removeEventListener('keydown', keydown)
                slideDrag = null
                slideBoard = null
              }
            }),
          ),
        ],
        [
          ...Object.entries(LAYERS).map(([key, layer]) => {
            const at = state.positions[key] ?? { x: 0, y: 0 }
            const dragging = slideDrag?.ids.includes(key) ?? false
            const content =
              key === 'chart'
                ? [38, 52, 46, 70, 88].map(height =>
                    h.i([h.Style({ height: `${height}%` })], []),
                  )
                : key === 'stripe'
                  ? [icon(h, 'lock-simple', 'fill', 14)]
                  : key === 'callout'
                    ? ['+18% vs Q3']
                    : ['Q4 revenue']
            return h.div(
              [
                h.Class(`st-layer st-layer-${key}`),
                h.DataAttribute('layer-id', key),
                h.Attribute('role', 'option'),
                h.Attribute('aria-label', layer.label),
                h.Attribute('aria-selected', String(state.selected.includes(key))),
                ...(layer.locked ? [h.Attribute('aria-disabled', 'true')] : []),
                h.Attribute(
                  'aria-keyshortcuts',
                  'Space Shift+Space Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight',
                ),
                h.Tabindex(
                  state.focused === key ||
                    (state.focused === null && key === 'title')
                    ? 0
                    : -1,
                ),
                ...(dragging ? [h.DataAttribute('dragging', '')] : []),
                h.Style({
                  position: 'absolute',
                  left: `${at.x}px`,
                  top: `${at.y}px`,
                  width: `${layer.w}px`,
                  height: `${layer.h}px`,
                  touchAction: 'none',
                }),
                h.OnFocus(
                  set(current => ({ ...current, focused: key })),
                ),
              ],
              content,
            )
          }),
          h.div(
            [
              h.Class('st-slide-bounds'),
              h.Attribute('aria-hidden', 'true'),
              h.Style(
                box
                  ? {
                      left: `${box.x}px`,
                      top: `${box.y}px`,
                      width: `${box.w}px`,
                      height: `${box.h}px`,
                    }
                  : { display: 'none' },
              ),
            ],
            [
              h.i([h.DataAttribute('corner', 'nw')], []),
              h.i([h.DataAttribute('corner', 'ne')], []),
              h.i([h.DataAttribute('corner', 'sw')], []),
              h.i([h.DataAttribute('corner', 'se')], []),
            ],
          ),
        ],
      ),
      h.p([h.Class('st-slide-foot')], [
        h.span([], [
          state.selected.length
            ? `${state.selected.length} selected`
            : 'Shift-click to group',
        ]),
        h.span(
          [
            h.Class('st-slide-xy'),
            h.DataAttribute('x', box ? String(Math.round(box.x)) : '–'),
            h.DataAttribute('y', box ? String(Math.round(box.y)) : '–'),
          ],
          [],
        ),
      ]),
    ])
  },
}

/* 9. A horizontal virtualizer: a year of film frames */

// PORT NOTE: createVirtualizer is replaced by the scroll-driven window below,
// keeping its three-frame overscan and its scrollToIndex centering.
const FRAME_W = 66
const DAYS = 365
const LATEST = 306
const OVERSCAN = 3
const frameDate = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC',
})

/** A small deterministic landscape per day: winter blues into spring greens, summer gold, autumn rust. */
const frameLook = (index: number) => {
  const random = (seed: number) => {
    const noise = Math.sin(index * 12.9898 + seed * 78.233) * 43758.5453
    return noise - Math.floor(noise)
  }
  const ground =
    [215, 135, 95, 45][Math.floor(((index + 20) % 365) / 91.25)] ?? 95
  const base = ground + random(1) * 24
  const dusk = random(2) > 0.72
  const sky = dusk ? 40 + random(3) * 30 : 225 + random(3) * 25
  const light = 0.62 + random(4) * 0.22
  const horizon = 42 + random(5) * 30
  const sun = random(6) > 0.4
  return {
    background: [
      sun
        ? `radial-gradient(circle at ${18 + random(7) * 64}% ${horizon - 14}%, oklch(0.97 0.07 85 / 0.9) 0 6%, transparent 8%)`
        : 'linear-gradient(transparent, transparent)',
      `linear-gradient(to bottom, oklch(${light} ${dusk ? 0.1 : 0.07} ${sky}) 0, oklch(${light + 0.08} 0.05 ${sky + 10}) ${horizon}%, oklch(${light - 0.26} 0.09 ${base}) ${horizon}% 100%)`,
    ].join(','),
  }
}

let filmReel: HTMLElement | null = null
let filmState: FilmState | null = null

const clampFrame = (index: number) => Math.max(0, Math.min(DAYS - 1, index))

const filmWindow = (element: HTMLElement) => {
  const first = clampFrame(Math.floor(element.scrollLeft / FRAME_W) - OVERSCAN)
  const last = clampFrame(
    Math.ceil((element.scrollLeft + element.clientWidth) / FRAME_W) + OVERSCAN,
  )
  return { first, last }
}

type FilmState = { first: number; last: number }

const film = {
  initial: {
    first: clampFrame(LATEST - OVERSCAN),
    last: clampFrame(LATEST + OVERSCAN),
  } as FilmState,
  render: ({ state, set, h }: TileContext<FilmState>) => {
    filmState = state
    const apply = (next: FilmState) => {
      filmState = next
      notify(filmReel, 'st-film-state', next)
    }
    const act = (action: string) => {
      const element = filmReel
      if (!element) return set(current => current)
      if (action === 'latest') {
        element.scrollTo({
          left: LATEST * FRAME_W - (element.clientWidth - FRAME_W) / 2,
          behavior: reduced() ? 'auto' : 'smooth',
        })
        return set(current => current)
      }
      element.scrollBy({
        left: (action === 'next' ? 1 : -1) * element.clientWidth * 0.8,
        behavior: reduced() ? 'auto' : 'smooth',
      })
      return set(current => current)
    }
    const count = state.last - state.first + 1

    return h.div([h.Class('st-film')], [
      h.header([h.Class('st-film-head')], [
        h.span([h.Class('st-film-title')], [
          icon(h, 'film-strip', 'fill'),
          h.span([h.Class('st-film-name')], ['One frame a day']),
        ]),
        h.span([h.Class('st-film-count')], [
          h.b([], [String(count)]),
          ` of ${DAYS} rendered`,
        ]),
        h.span([h.Class('st-film-nav')], [
          h.button(
            [
              h.Type('button'),
              h.Class('st-film-btn'),
              h.Attribute('aria-label', 'Earlier frames'),
              ...onPress(h, () => act('prev')),
            ],
            [icon(h, 'caret-left', 'bold')],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class('st-film-btn'),
              h.DataAttribute('wide', ''),
              ...onPress(h, () => act('latest')),
            ],
            ['Latest'],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class('st-film-btn'),
              h.Attribute('aria-label', 'Later frames'),
              ...onPress(h, () => act('next')),
            ],
            [icon(h, 'caret-right', 'bold')],
          ),
        ]),
      ]),
      h.div(
        [
          h.Class('st-film-reel'),
          h.Tabindex(0),
          h.Attribute('role', 'region'),
          h.Attribute('aria-label', 'Frames, January to December'),
          h.Style({ overflow: 'auto hidden' }),
          onCustomEvent('st-film-state', event =>
            Option.some(set(event.detail as FilmState)),
          ),
          h.OnMount(
            onMount('StudioFilmReel', element => {
              filmReel = element
              const frame = requestAnimationFrame(() => {
                element.scrollLeft =
                  LATEST * FRAME_W - (element.clientWidth - FRAME_W) / 2
                if (filmState) apply(filmWindow(element))
              })
              const scroll = () => {
                if (!filmState) return
                const next = filmWindow(element)
                if (next.first !== filmState.first || next.last !== filmState.last) {
                  apply(next)
                }
              }
              element.addEventListener('scroll', scroll, { passive: true })
              const resize = () => scroll()
              const observer = new ResizeObserver(resize)
              observer.observe(element)
              return () => {
                cancelAnimationFrame(frame)
                element.removeEventListener('scroll', scroll)
                observer.disconnect()
                filmReel = null
              }
            }),
          ),
          h.OnKeyDownPreventDefault((key) => {
            const element = filmReel
            if (!element) return Option.none()
            const used = Option.some(set(current => current))
            if (key === 'ArrowRight') {
              element.scrollBy({ left: FRAME_W })
              return used
            }
            if (key === 'ArrowLeft') {
              element.scrollBy({ left: -FRAME_W })
              return used
            }
            if (key === 'PageDown') {
              element.scrollBy({ left: element.clientWidth })
              return used
            }
            if (key === 'PageUp') {
              element.scrollBy({ left: -element.clientWidth })
              return used
            }
            if (key === 'Home') {
              element.scrollTo({ left: 0 })
              return used
            }
            if (key === 'End') {
              element.scrollTo({ left: element.scrollWidth })
              return used
            }
            return Option.none()
          }),
        ],
        [
          h.div(
            [
              h.Class('st-film-body'),
              h.Attribute('role', 'list'),
              h.Attribute('aria-label', 'Frames'),
              h.Style({
                position: 'relative',
                width: `${DAYS * FRAME_W}px`,
                height: '100%',
              }),
            ],
            Array.from(
              { length: count },
              (_, offset) => state.first + offset,
            ).map(index => {
              const blank = index > LATEST
              const date = frameDate.format(Date.UTC(2026, 0, index + 1))
              return h.keyed('div')(index, [
                h.Class('st-frame'),
                h.Attribute('role', 'listitem'),
                h.Attribute(
                  'aria-label',
                  blank ? `${date}, not shot yet` : date,
                ),
                ...(blank ? [h.DataAttribute('blank', '')] : []),
                ...(index === LATEST ? [h.DataAttribute('latest', '')] : []),
                h.Style({
                  position: 'absolute',
                  top: '0',
                  bottom: '0',
                  left: '0',
                  width: `${FRAME_W}px`,
                  transform: `translateX(${index * FRAME_W}px)`,
                }),
              ], [
                h.span([h.Class('st-frame-no'), h.Attribute('aria-hidden', 'true')], [
                  String(index + 1),
                ]),
                h.span([
                  h.Class('st-frame-photo'),
                  h.Style(blank ? {} : frameLook(index)),
                ]),
                h.span([h.Class('st-frame-date'), h.Attribute('aria-hidden', 'true')], [
                  date,
                ]),
              ])
            }),
          ),
        ],
      ),
    ])
  },
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'studio-map',
    title: 'Fit the whole city.',
    blurb: 'Zoom to fit all, or just your picks.',
    size: 'large',
    initial: map.initial,
    render: map.render,
  },
  {
    id: 'studio-notes',
    title: 'Take it back.',
    blurb: 'Typing undoes in runs, not letters.',
    tone: 'paper',
    initial: notes.initial,
    render: notes.render,
  },
  {
    id: 'studio-trash',
    title: 'Press twice.',
    blurb: 'It arms first, then disarms itself.',
    initial: trash.initial,
    render: trash.render,
  },
  {
    id: 'studio-timer',
    title: 'Run it from outside.',
    blurb: 'Buttons drive it through a controller.',
    tone: 'ink',
    initial: timer.initial,
    render: timer.render,
  },
  {
    id: 'studio-week',
    title: 'Block out the week.',
    blurb: 'Draw, move and stretch across days.',
    size: 'wide',
    tone: 'paper',
    initial: week.initial,
    render: week.render,
  },
  {
    id: 'studio-chat',
    title: 'Follow the thread.',
    blurb: 'Scroll up and new replies wait.',
    size: 'tall',
    tone: 'sky',
    initial: chat.initial,
    render: chat.render,
  },
  {
    id: 'studio-emoji',
    title: 'React in a word.',
    blurb: 'Fuzzy search, then arrows through the grid.',
    tone: 'butter',
    initial: emoji.initial,
    render: emoji.render,
  },
  {
    id: 'studio-film',
    title: 'A year on one strip.',
    blurb: 'Only the frames in view exist.',
    size: 'wide',
    initial: film.initial,
    render: film.render,
  },
  {
    id: 'studio-slide',
    title: 'Move them together.',
    blurb: 'Shift-click to group, then drag one.',
    tone: 'blueprint',
    initial: slide.initial,
    render: slide.render,
  },
]
