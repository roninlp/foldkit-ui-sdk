import { Effect, Queue, Stream } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import type { MountAction } from 'foldkit/mount'

import {
  Dialog,
  Menu,
  Overlays,
  Popover,
  Preferences,
  Resizable,
  SegmentedControl,
} from 'foldkit-ui-sdk'

import {
  ariaKeyshortcuts,
  bindPersistentLayer,
  createColorScheme,
  createLocalStorage,
  createPreference,
  formatShortcut,
  supportsTopLayer,
} from '@ui-sdk/core'
import { createConfirm, createOverlays, resizableStorageKey } from '@ui-sdk/web'
import { registerShortcut } from 'foldkit-ui-sdk/shortcuts'

import { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './layers.css'

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

/*
 * Native listeners installed by `OnMount` need the latest render's `state` and
 * `set`, because the Model can change between the render that made the handler
 * and the interaction that runs it. Every tile publishes its current pair here;
 * the listeners read it back and dispatch through the mount's stream, so no
 * value leaves the Model.
 */
type Live<S> = {
  state: S
  set: (next: S | ((current: S) => S)) => Message
}

const liveStates = new Map<string, Live<any>>()

const publish = <S,>(key: string, state: S, set: Live<S>['set']) => {
  liveStates.set(key, { state, set })
}

const latestOf = <S,>(key: string) => liveStates.get(key) as Live<S> | undefined

/** The one place a native listener can live: Foldkit's `OnMount`. */
const onElement = (
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

// 1. Color scheme and accent, scoped to a preview

const accents = ['iris', 'moss', 'ember'] as const
type Accent = (typeof accents)[number]

const accentLabels: Record<Accent, string> = {
  iris: 'Iris',
  moss: 'Moss',
  ember: 'Ember',
}

const colorScheme = createColorScheme({
  storage: createLocalStorage('sink-layers-scheme'),
})

const accent = createPreference({
  values: accents,
  defaultValue: 'iris',
  attribute: 'data-accent',
  storage: createLocalStorage('sink-layers-accent'),
})

const isAccent = (value: string | null | undefined): value is Accent =>
  typeof value === 'string' && (accents as ReadonlyArray<string>).includes(value)

const schemeOptions = [
  { value: 'light', label: 'Light', iconName: 'sun' },
  { value: 'dark', label: 'Dark', iconName: 'moon' },
  { value: 'system', label: 'System', iconName: 'desktop' },
] as const

const revenueBars = [38, 52, 44, 61, 57, 72, 66, 84]

const appStats = [
  { label: 'Orders', value: '1,284' },
  { label: 'Refunds', value: '12' },
  { label: 'Avg. order', value: '$37.50' },
]

const THEME_KEY = 'overlays-theme'

type ThemeState = {
  scheme: 'system' | 'light' | 'dark'
  accent: Accent
}

const themeMount = onElement('SinkLayersTheme', (element, send) => {
  const stopScheme = colorScheme.subscribe(next => {
    send(
      latestOf<ThemeState>(THEME_KEY)?.set(current => ({
        ...current,
        scheme: next.value,
      })) ?? Message.SinkDone(),
    )
  })
  const stopAccent = accent.subscribe(next => {
    send(
      latestOf<ThemeState>(THEME_KEY)?.set(current => ({
        ...current,
        accent: next.value,
      })) ?? Message.SinkDone(),
    )
  })
  const onClick = (event: Event) => {
    const target = (event.target as Element | null)?.closest('.ly-swatch')
    const name = target?.getAttribute('data-accent')
    if (!isAccent(name)) return
    accent.set(name, { reason: 'press' })
    const live = latestOf<ThemeState>(THEME_KEY)
    if (live) {
      send(live.set(current => ({ ...current, accent: name })))
    }
  }
  element.addEventListener('click', onClick)
  return () => {
    stopScheme()
    stopAccent()
    element.removeEventListener('click', onClick)
  }
})

const Theme = ({ state, set, h }: TileContext<ThemeState>) => {
  publish(THEME_KEY, state, set)
  const segmented = SegmentedControl.Root.withMessage(h)
  const indicator = SegmentedControl.Indicator.withMessage(h)
  const segment = SegmentedControl.Item.withMessage(h)
  const preferences = Preferences.Root.withMessage(h)

  // PORT NOTE: `usePreference` is React-only. The color scheme reports its own
  // system value; the tile mirrors both preferences in state and the mount
  // above keeps them in step, so the status line stays live.
  const scheme = colorScheme.get()
  const status =
    state.scheme !== 'system'
      ? 'Saved in this browser'
      : scheme.system === 'unknown'
        ? 'Follows your system'
        : `Your system is ${scheme.system} right now`

  return h.div([h.Class('ly-theme'), h.OnMount(themeMount)], [
    h.div([h.Class('ly-theme-bar')], [
      segmented(
        [
          h.Class('ly-seg'),
          h.Attribute('aria-label', 'Theme'),
          segmented.Value(state.scheme),
          segmented.OnValuechange(detail => {
            const value = detail.value
            if (value === 'light' || value === 'dark' || value === 'system') {
              colorScheme.set(value, { reason: 'press' })
              return set(current => ({ ...current, scheme: value }))
            }
            return Message.SinkDone()
          }),
        ],
        [
          indicator([h.Class('ly-seg-indicator')], []),
          ...schemeOptions.map(option =>
            segment(
              [h.Class('ly-seg-item'), segment.Value(option.value)],
              [icon(h, option.iconName, 'bold', 14), option.label],
            ),
          ),
        ],
      ),
      h.div(
        [
          h.Class('ly-swatches'),
          h.Attribute('role', 'group'),
          h.Attribute('aria-label', 'Accent'),
        ],
        accents.map(name =>
          h.button(
            [
              h.Type('button'),
              h.Class('ly-swatch'),
              h.DataAttribute('accent', name),
              h.Attribute('aria-label', accentLabels[name]),
              h.Attribute('aria-pressed', String(state.accent === name)),
            ],
            [
              // PORT NOTE: the reference hides the check with `.ly-swatch svg`,
              // which the icon font does not match, so the opacity is inline.
              h.i(
                [
                  h.Class('ph-bold ph-check'),
                  h.Style({
                    fontSize: '11px',
                    opacity: state.accent === name ? '1' : '0',
                    transition: 'opacity 120ms',
                  }),
                  h.Attribute('aria-hidden', 'true'),
                ],
                [],
              ),
            ],
          ),
        ),
      ),
    ]),
    h.p(
      [
        h.Class('ly-theme-status'),
        h.Attribute('aria-live', 'polite'),
      ],
      [status],
    ),
    // PORT NOTE: the preferences are module-level and handed to
    // `<ui-preferences>` as its `preferences` property; the element subscribes
    // when it connects, so no React provider is needed.
    preferences([preferences.Preferences([colorScheme, accent])], [
      h.div(
        [
          h.Class('ly-app'),
          h.Attribute('aria-label', 'Preview'),
          h.Attribute('role', 'img'),
        ],
        [
          h.div([h.Class('ly-app-side'), h.AriaHidden(true)], [
            h.span([h.Class('ly-app-logo')], []),
            h.span([h.Class('ly-app-nav'), h.DataAttribute('current', '')], [
              h.i(
                [
                  h.Class('ph-fill ph-house'),
                  h.Style({ fontSize: '13px' }),
                  h.Attribute('aria-hidden', 'true'),
                ],
                [],
              ),
              'Home',
            ]),
            h.span([h.Class('ly-app-nav')], [
              h.i(
                [
                  h.Class('ph-bold ph-chart-bar'),
                  h.Style({ fontSize: '13px' }),
                  h.Attribute('aria-hidden', 'true'),
                ],
                [],
              ),
              'Reports',
            ]),
            h.span([h.Class('ly-app-nav')], [
              h.i(
                [
                  h.Class('ph-bold ph-users'),
                  h.Style({ fontSize: '13px' }),
                  h.Attribute('aria-hidden', 'true'),
                ],
                [],
              ),
              'Customers',
            ]),
            h.span([h.Class('ly-app-me')], [
              h.span([h.Class('ly-app-avatar')], ['JB']),
              'Jo Berg',
            ]),
          ]),
          h.div([h.Class('ly-app-main'), h.AriaHidden(true)], [
            h.span([h.Class('ly-app-head')], [
              h.span([], [
                h.span([h.Class('ly-app-kicker')], ['This quarter']),
                h.span([h.Class('ly-app-figure')], ['$48,210']),
              ]),
              h.span([h.Class('ly-app-delta')], ['+12.4%']),
            ]),
            h.span(
              [h.Class('ly-app-stats')],
              appStats.map(stat =>
                h.span([h.Class('ly-app-stat')], [
                  h.span([h.Class('ly-app-kicker')], [stat.label]),
                  h.span([h.Class('ly-app-stat-value')], [stat.value]),
                ]),
              ),
            ),
            h.span(
              [h.Class('ly-app-chart')],
              revenueBars.map(height =>
                h.span(
                  [
                    h.Class('ly-app-bar'),
                    h.Style({ height: `${height}%` }),
                  ],
                  [],
                ),
              ),
            ),
            h.span([h.Class('ly-app-rows')], [
              h.span([h.Class('ly-app-row')], [
                h.span([h.Class('ly-app-avatar')], ['MO']),
                'Mira Okafor',
                h.span([h.Class('ly-app-amount')], ['$1,240']),
              ]),
              h.span([h.Class('ly-app-row')], [
                h.span([h.Class('ly-app-avatar')], ['TL']),
                'Tomás Lindqvist',
                h.span([h.Class('ly-app-amount')], ['$860']),
              ]),
              h.span([h.Class('ly-app-row')], [
                h.span([h.Class('ly-app-avatar')], ['AS']),
                'Aiko Sato',
                h.span([h.Class('ly-app-amount')], ['$615']),
              ]),
            ]),
          ]),
        ],
      ),
    ]),
  ])
}

// 2. A split that saves its layout

const splitId = 'sink-layers-mail'
const splitDefault: ReadonlyArray<number> = [38, 62]

const readSavedWidth = (): number | undefined => {
  if (typeof window === 'undefined') return undefined
  try {
    const saved = JSON.parse(
      window.localStorage.getItem(resizableStorageKey(splitId)) ?? '{}',
    ) as Record<string, number[]>
    return Object.values(saved)[0]?.[0]
  } catch {
    return undefined
  }
}

const splitSavedWidth = readSavedWidth()

type SplitState = {
  layout: ReadonlyArray<number>
  savedWidth: number | null
}

const folders = [
  { label: 'Inbox', iconName: 'tray', count: 12 },
  { label: 'Starred', iconName: 'star', count: 3 },
  { label: 'Sent', iconName: 'paper-plane-tilt', count: 0 },
]

const splitMount = onElement('SinkLayersSplit', (element, send) => {
  const onClick = (event: Event) => {
    if (!(event.target as Element | null)?.closest('.ly-split-reset')) return
    try {
      window.localStorage.removeItem(resizableStorageKey(splitId))
    } catch {
      // Storage can be unavailable; the layout still resets in the Model.
    }
    const live = latestOf<SplitState>('overlays-split')
    if (live) {
      send(live.set({ layout: splitDefault, savedWidth: null }))
    }
  }
  element.addEventListener('click', onClick)
  return () => element.removeEventListener('click', onClick)
})

const Split = ({ state, set, h }: TileContext<SplitState>) => {
  publish('overlays-split', state, set)
  const resizable = Resizable.Root.withMessage(h)
  const panel = Resizable.Panel.withMessage(h)
  const handle = Resizable.Handle.withMessage(h)

  return h.div([h.Class('ly-split'), h.OnMount(splitMount)], [
    resizable(
      [
        h.Class('ly-split-group'),
        resizable.AutoSaveId(splitId),
        resizable.Layout(state.layout),
        resizable.OnLayoutcommit(detail =>
          set(current => ({
            ...current,
            layout: detail.value,
            savedWidth: readSavedWidth() ?? detail.value[0] ?? current.savedWidth,
          })),
        ),
      ],
      [
        panel(
          [
            h.Class('ly-split-pane ly-split-folders'),
            panel.Id('ly-folders'),
            panel.DefaultSize(38),
            panel.MinSize(24),
            panel.MaxSize(64),
          ],
          folders.map((folder, index) =>
            h.span(
              [
                h.Class('ly-folder'),
                ...(index === 0 ? [h.DataAttribute('current', '')] : []),
              ],
              [
                icon(h, folder.iconName, 'bold', 14),
                h.span([h.Class('ly-folder-label')], [folder.label]),
                folder.count > 0
                  ? h.span([h.Class('ly-folder-count')], [String(folder.count)])
                  : '',
              ],
            ),
          ),
        ),
        handle(
          [h.Class('ly-split-handle'), h.Attribute('aria-label', 'Resize folders')],
          [h.span([h.Class('ly-split-grip')], [])],
        ),
        panel([h.Class('ly-split-pane'), panel.Id('ly-message')], [
          h.span([h.Class('ly-mail-from')], [
            icon(h, 'envelope-simple', 'fill', 14),
            'Ines Moreau',
          ]),
          h.span([h.Class('ly-mail-subject')], ['Friday review moved']),
          h.span([h.Class('ly-mail-line')], []),
          h.span([h.Class('ly-mail-line')], []),
          h.span([h.Class('ly-mail-line'), h.DataAttribute('short', '')], []),
        ]),
      ],
    ),
    h.div([h.Class('ly-split-foot')], [
      h.span(
        [h.Class('ly-split-saved'), h.Attribute('aria-live', 'polite')],
        [
          state.savedWidth === null
            ? 'Default layout'
            : `Saved at ${Math.round(state.savedWidth)}%`,
        ],
      ),
      h.button(
        [
          h.Type('button'),
          h.Class('b-btn ly-split-reset'),
          h.Disabled(state.savedWidth === null),
        ],
        [icon(h, 'arrow-counter-clockwise', 'bold', 13), 'Reset'],
      ),
    ]),
  ])
}

// 3. A mini player that stays live above a modal

const episodeLength = 47 * 60 + 12
const playerElementId = 'sink-layers-player'

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

type LiftedRect = { top: number; left: number; width: number }

type PlayerState = {
  playing: boolean
  elapsed: number
  lifted: LiftedRect | null
}

const playerMount = onElement('SinkLayersPlayer', (element, send) => {
  const stop = bindPersistentLayer(element)
  const timer = window.setInterval(() => {
    const live = latestOf<PlayerState>('overlays-player')
    if (!live?.state.playing) return
    send(
      live.set(current => ({
        ...current,
        elapsed: Math.min(current.elapsed + 1, episodeLength),
      })),
    )
  }, 1000)
  return () => {
    window.clearInterval(timer)
    stop()
  }
})

const Player = ({ state, set, h }: TileContext<PlayerState>) => {
  publish('overlays-player', state, set)
  const dialog = Dialog.Root.withMessage(h)
  const trigger = Dialog.Trigger.withMessage(h)
  const backdrop = Dialog.Backdrop.withMessage(h)
  const content = Dialog.Content.withMessage(h)
  const title = Dialog.Title.withMessage(h)
  const description = Dialog.Description.withMessage(h)
  const close = Dialog.Close.withMessage(h)

  return h.div([h.Class('ly-listen')], [
    h.div([h.Class('ly-player-slot')], [
      h.div(
        [
          h.Id(playerElementId),
          h.Class('ly-player'),
          ...(state.playing ? [h.DataAttribute('playing', '')] : []),
          ...(state.lifted ? [h.Popover('manual')] : []),
          ...(state.lifted
            ? [
                h.Style({
                  top: `${state.lifted.top}px`,
                  left: `${state.lifted.left}px`,
                  width: `${state.lifted.width}px`,
                }),
              ]
            : []),
          h.OnMount(playerMount),
        ],
        [
          h.span([h.Class('ly-cover'), h.AriaHidden(true)], [
            h.span([h.Class('ly-eq')], [
              h.span([], []),
              h.span([], []),
              h.span([], []),
            ]),
          ]),
          h.span([h.Class('ly-track')], [
            h.span([h.Class('ly-track-title')], ['Shipping on Fridays']),
            h.span([h.Class('ly-track-show')], ['Changelog Radio · Ep. 112']),
          ]),
          h.span([h.Class('ly-transport')], [
            h.button(
              [
                h.Type('button'),
                h.Class('ly-icon-btn'),
                h.Attribute('aria-label', 'Back 15 seconds'),
                h.OnClick(
                  set(current => ({
                    ...current,
                    elapsed: Math.max(current.elapsed - 15, 0),
                  })),
                ),
              ],
              [icon(h, 'arrow-counter-clockwise', 'bold', 16)],
            ),
            h.button(
              [
                h.Type('button'),
                h.Class('ly-icon-btn ly-play'),
                h.Attribute('aria-label', state.playing ? 'Pause' : 'Play'),
                h.OnClick(
                  set(current => ({ ...current, playing: !current.playing })),
                ),
              ],
              [
                icon(
                  h,
                  state.playing ? 'pause' : 'play',
                  'fill',
                  16,
                ),
              ],
            ),
            h.button(
              [
                h.Type('button'),
                h.Class('ly-icon-btn'),
                h.Attribute('aria-label', 'Forward 30 seconds'),
                h.OnClick(
                  set(current => ({
                    ...current,
                    elapsed: Math.min(current.elapsed + 30, episodeLength),
                  })),
                ),
              ],
              [icon(h, 'arrow-clockwise', 'bold', 16)],
            ),
          ]),
          h.span([h.Class('ly-progress')], [
            h.span([h.Class('ly-time')], [clock(state.elapsed)]),
            h.span(
              [
                h.Class('ly-progress-track'),
                h.Attribute('role', 'progressbar'),
                h.Attribute('aria-label', 'Played'),
                h.Attribute('aria-valuemin', '0'),
                h.Attribute('aria-valuemax', String(episodeLength)),
                h.Attribute('aria-valuenow', String(state.elapsed)),
                h.Attribute('aria-valuetext', clock(state.elapsed)),
              ],
              [
                h.span(
                  [
                    h.Class('ly-progress-fill'),
                    h.Style({
                      width: `${(state.elapsed / episodeLength) * 100}%`,
                    }),
                  ],
                  [],
                ),
              ],
            ),
            h.span([h.Class('ly-time')], [
              `-${clock(episodeLength - state.elapsed)}`,
            ]),
          ]),
        ],
      ),
    ]),
    dialog(
      [
        dialog.OnOpenchange(detail => {
          if (detail.value) {
            if (!supportsTopLayer()) return Message.SinkDone()
            const element = document.getElementById(playerElementId)
            if (!element) return Message.SinkDone()
            const rect = element.getBoundingClientRect()
            // PORT NOTE: the reference uses a layout effect after the popover
            // attribute lands. A frame callback is the no-hook equivalent.
            requestAnimationFrame(() => {
              try {
                element.showPopover()
              } catch {
                // Already open, or no top layer support.
              }
            })
            return set(current => ({
              ...current,
              lifted: {
                top: rect.top,
                left: rect.left,
                width: rect.width,
              },
            }))
          }
          const element = document.getElementById(playerElementId)
          if (element) {
            try {
              element.hidePopover()
            } catch {
              // Not open.
            }
          }
          return set(current => ({ ...current, lifted: null }))
        }),
      ],
      [
        trigger([], [
          h.button([h.Type('button'), h.Class('b-btn ly-share')], [
            icon(h, 'share-network', 'bold', 15),
            'Share episode',
          ]),
        ]),
        backdrop([h.Class('ly-backdrop')], []),
        content([h.Class('ly-dialog')], [
          title([h.Class('ly-dialog-title')], ['Share episode']),
          description([h.Class('ly-dialog-desc')], [
            'The player keeps going. Pause or skip it while you’re here.',
          ]),
          h.div([h.Class('ly-link')], [
            icon(h, 'link', 'bold', 14),
            h.input([
              h.Class('ly-link-input'),
              h.Attribute('aria-label', 'Episode link'),
              h.Readonly(true),
              h.Value(`changelog.fm/112?t=${state.elapsed}`),
            ]),
          ]),
          h.div([h.Class('ly-actions')], [
            close([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('b-btn'),
                  h.Attribute('data-variant', 'primary'),
                ],
                ['Done'],
              ),
            ]),
          ]),
        ]),
      ],
    ),
  ])
}

// 4. A draft that asks before a dismissal discards it

type NoteState = {
  note: string
  draft: string
  asking: boolean
}

const noteMount = onElement('SinkLayersNote', (element, send) => {
  const onChange = (event: Event) => {
    const open = Boolean(
      (event as CustomEvent<{ value: boolean }>).detail?.value,
    )
    element
      .querySelector('.ly-note-trigger')
      ?.toggleAttribute('data-open', open)
    if (!open) return
    const live = latestOf<NoteState>('overlays-discard')
    if (live) {
      send(
        live.set(current => ({
          ...current,
          draft: current.note,
          asking: false,
        })),
      )
    }
  }
  const onClick = (event: Event) => {
    const target = (event.target as Element | null)?.closest(
      '[data-keep-editing]',
    )
    if (!target) return
    const live = latestOf<NoteState>('overlays-discard')
    if (live) {
      send(live.set(current => ({ ...current, asking: false })))
    }
    requestAnimationFrame(() => {
      element.querySelector('textarea')?.focus()
    })
  }
  element.addEventListener('openchange', onChange)
  element.addEventListener('click', onClick)
  return () => {
    element.removeEventListener('openchange', onChange)
    element.removeEventListener('click', onClick)
  }
})

const Note = ({ state, set, h }: TileContext<NoteState>) => {
  publish('overlays-discard', state, set)
  const popover = Popover.Root.withMessage(h)
  const trigger = Popover.Trigger.withMessage(h)
  const content = Popover.Content.withMessage(h)
  const arrow = Popover.Arrow.withMessage(h)
  const title = Popover.Title.withMessage(h)
  const description = Popover.Description.withMessage(h)
  const close = Popover.Close.withMessage(h)

  return h.div([h.Class('ly-task')], [
    h.div([h.Class('ly-task-head')], [
      h.span([h.Class('ly-task-check'), h.AriaHidden(true)], []),
      h.span([h.Class('ly-task-text')], [
        h.span([h.Class('ly-task-title')], ['Rotate the staging keys']),
        h.span([h.Class('ly-task-meta')], ['Due today · Infra']),
      ]),
    ]),
    popover(
      [
        // The reference cancels the dismissal in `onOpenChange`. The web
        // element's equivalent is `dismissible`: while the draft differs,
        // Escape and outside presses only fire `dismissattempt`.
        popover.Dismissible(state.draft === state.note),
        popover.OnDismissattempt(() =>
          set(current => ({ ...current, asking: true })),
        ),
        h.OnMount(noteMount),
      ],
      [
        trigger([], [
          h.button([h.Type('button'), h.Class('ly-note-trigger')], [
            icon(h, 'pencil-simple', 'bold', 13),
            h.span([h.Class('ly-note-text')], [
              state.note || 'Add a note',
            ]),
          ]),
        ]),
        content(
          [
            h.Class('b-pop ly-note-pop'),
            content.SideOffset(10),
            content.CollisionPadding(12),
          ],
          [
            arrow([h.Class('ly-arrow')], []),
            title([h.Class('ly-note-title')], ['Edit note']),
            description([h.Class('ly-note-desc')], [
              'Only your team sees it.',
            ]),
            h.textarea([
              h.Class('b-input ly-note-field'),
              h.Attribute('aria-label', 'Note'),
              h.Attribute('rows', '3'),
              h.Value(state.draft),
              h.OnInput(value =>
                set(current => ({
                  ...current,
                  draft: value,
                  asking: false,
                })),
              ),
            ]),
            state.asking
              ? h.div(
                  [h.Class('ly-discard'), h.Attribute('role', 'alert')],
                  [
                    h.span([], ['Discard changes?']),
                    h.span([h.Class('ly-discard-actions')], [
                      h.button(
                        [
                          h.Type('button'),
                          h.Class('b-btn'),
                          h.DataAttribute('keep-editing', ''),
                        ],
                        ['Keep editing'],
                      ),
                      close([], [
                        h.button(
                          [h.Type('button'), h.Class('b-btn ly-destroy')],
                          [
                            'Discard',
                          ],
                        ),
                      ]),
                    ]),
                  ],
                )
              : h.div([h.Class('ly-note-actions')], [
                  close([], [
                    h.button([h.Type('button'), h.Class('b-btn')], [
                      'Cancel',
                    ]),
                  ]),
                  close([], [
                    h.button(
                      [
                        h.Type('button'),
                        h.Class('b-btn'),
                        h.Attribute('data-variant', 'primary'),
                        h.OnClick(
                          set(current => ({
                            ...current,
                            note: current.draft.trim(),
                          })),
                        ),
                      ],
                      ['Save'],
                    ),
                  ]),
                ]),
          ],
        ),
      ],
    ),
  ])
}

// 5. Receipts whose panels animate their height

type ReceiptState = {
  open: Record<string, boolean>
  heights: Record<string, number>
}

const receiptMount = onElement('SinkLayersReceipt', (element, send) => {
  const measure = () => {
    const heights: Record<string, number> = {}
    element
      .querySelectorAll<HTMLElement>('[data-receipt-panel]')
      .forEach(panel => {
        const orderId = panel.getAttribute('data-order')
        const inner = panel.firstElementChild as HTMLElement | null
        const height = inner?.scrollHeight ?? panel.scrollHeight
        if (orderId && height) heights[orderId] = height
      })
    const live = latestOf<ReceiptState>('overlays-receipt')
    if (live) {
      send(live.set(current => ({ ...current, heights })))
    }
  }
  measure()
  window.addEventListener('resize', measure)
  return () => window.removeEventListener('resize', measure)
})

const orders = [
  {
    id: '4821',
    date: 'Nov 14',
    status: 'Delivered',
    lines: [
      { item: 'Ceramic pour-over', qty: 1, price: 38 },
      { item: 'Paper filters', qty: 2, price: 7.5 },
      { item: 'Single-origin, 250 g', qty: 1, price: 19 },
    ],
  },
  {
    id: '4790',
    date: 'Oct 30',
    status: 'Delivered',
    lines: [
      { item: 'Gooseneck kettle', qty: 1, price: 64 },
      { item: 'Descaler', qty: 1, price: 9 },
    ],
  },
  {
    id: '4702',
    date: 'Oct 3',
    status: 'Refunded',
    lines: [{ item: 'Burr grinder', qty: 1, price: 129 }],
  },
  {
    id: '4655',
    date: 'Sep 12',
    status: 'Delivered',
    lines: [
      { item: 'Glass carafe', qty: 1, price: 24 },
      { item: 'Cork coasters', qty: 4, price: 3 },
    ],
  },
]

const money = (amount: number) => `$${amount.toFixed(2)}`

const Receipts = ({ state, set, h }: TileContext<ReceiptState>) => {
  publish('overlays-receipt', state, set)

  return h.div([h.Class('ly-orders'), h.OnMount(receiptMount)], [
    h.p([h.Class('ly-orders-head')], ['Orders']),
    ...orders.map(order => {
      const subtotal = order.lines.reduce(
        (sum, line) => sum + line.qty * line.price,
        0,
      )
      const tax = subtotal * 0.08
      const isOpen = state.open[order.id] === true
      const triggerId = `ly-order-${order.id}-trigger`
      const panelId = `ly-order-${order.id}-panel`
      // PORT NOTE: the React receipt primitive measures with `bindPanel`.
      // Here the container measures every panel on mount and on resize, and
      // the inline height uses the CSS transition on `.ly-receipt`.
      const height = isOpen ? `${state.heights[order.id] ?? 0}px` : '0px'
      return h.section([h.Class('ly-order')], [
        h.button(
          [
            h.Type('button'),
            h.Id(triggerId),
            h.Class('ly-order-trigger'),
            h.Attribute('aria-expanded', String(isOpen)),
            h.Attribute('aria-controls', panelId),
            ...(isOpen ? [h.DataAttribute('open', '')] : []),
            h.OnClick(
              set(current => ({
                ...current,
                open: { ...current.open, [order.id]: !isOpen },
              })),
            ),
          ],
          [
            h.span([h.Class('ly-order-text')], [
              h.span([h.Class('ly-order-id')], [`Order #${order.id}`]),
              h.span([h.Class('ly-order-meta')], [
                `${order.date} · `,
                h.span(
                  [h.DataAttribute('status', order.status.toLowerCase())],
                  [order.status],
                ),
              ]),
            ]),
            h.span([h.Class('ly-order-total')], [
              money(subtotal + tax),
            ]),
            icon(h, 'caret-down', 'bold', 14),
          ],
        ),
        h.div(
          [
            h.Id(panelId),
            h.Class('ly-receipt'),
            h.DataAttribute('receipt-panel', ''),
            h.DataAttribute('order', order.id),
            h.Attribute('aria-hidden', String(!isOpen)),
            h.Style({ height, '--ly-panel': height }),
          ],
          [
            h.dl([h.Class('ly-receipt-lines')], [
              ...order.lines.map(line =>
                h.div([h.Class('ly-receipt-line')], [
                  h.dt([], [
                    line.item,
                    line.qty > 1
                      ? h.span([h.Class('ly-receipt-qty')], [
                          ` × ${line.qty}`,
                        ])
                      : '',
                  ]),
                  h.dd([], [money(line.qty * line.price)]),
                ]),
              ),
              h.div(
                [h.Class('ly-receipt-line'), h.DataAttribute('kind', 'sum')],
                [h.dt([], ['Subtotal']), h.dd([], [money(subtotal)])],
              ),
              h.div(
                [h.Class('ly-receipt-line'), h.DataAttribute('kind', 'sum')],
                [h.dt([], ['Tax']), h.dd([], [money(tax)])],
              ),
              h.div(
                [h.Class('ly-receipt-line'), h.DataAttribute('kind', 'total')],
                [h.dt([], ['Total']), h.dd([], [money(subtotal + tax)])],
              ),
            ]),
          ],
        ),
      ])
    }),
  ])
}

// 6. Stacked layers that Escape closes from the top

const stackOverlays = createOverlays()
const confirmRemoval = createConfirm({ overlays: stackOverlays })

type Person = { name: string; initials: string; role: string }

type StackState = {
  people: ReadonlyArray<Person>
  sharing: boolean
  menuFor: string | null
  asking: string | null
}

const peopleSeed: ReadonlyArray<Person> = [
  { name: 'Amara Diallo', initials: 'AD', role: 'Can edit' },
  { name: 'Kenji Sato', initials: 'KS', role: 'Can view' },
  { name: 'Elif Kaya', initials: 'EK', role: 'Can view' },
]

const STACK_KEY = 'overlays-stack'
const stackContentId = 'sink-layers-share-content'

const removePerson = async (
  root: Element,
  name: string,
  send: (message: Message) => void,
) => {
  const live = latestOf<StackState>(STACK_KEY)
  if (!live) return
  send(live.set(current => ({ ...current, asking: name })))

  const removed = await confirmRemoval({
    title: `Remove ${name}?`,
    description: 'They lose access to Q3 report.pdf right away.',
    confirmLabel: 'Remove',
  })

  if (!removed) {
    const after = latestOf<StackState>(STACK_KEY)
    if (after) {
      send(after.set(current => ({ ...current, asking: null })))
    }
    return
  }

  // Focus a neighboring row before the Model removes this one.
  const row = root.querySelector(`[data-person="${CSS.escape(name)}"]`)
  const next = (
    row?.nextElementSibling ?? row?.previousElementSibling
  )?.querySelector('button')
  if (next instanceof HTMLElement) next.focus()

  const after = latestOf<StackState>(STACK_KEY)
  if (!after) return
  send(
    after.set(current => ({
      ...current,
      asking: null,
      people: current.people.filter(person => person.name !== name),
    })),
  )
}

const stackMount = onElement('SinkLayersStack', (element, send) => {
  return registerShortcut(
    'mod+backspace',
    () => {
      const name = document.activeElement
        ?.closest('[data-person]')
        ?.getAttribute('data-person')
      if (name) void removePerson(element, name, send)
    },
    {
      layer: () => element.querySelector('.ly-share-pop'),
      description: 'Remove person',
    },
  )
})

const personMenuMount = (person: Person) =>
  onElement(`SinkLayersMenu-${person.initials}`, (element, send) => {
    const onAction = (event: Event) => {
      const value = (event as CustomEvent<{ value: unknown }>).detail?.value
      if (value === 'remove') {
        const root = element.closest('.ly-stack')
        if (root) void removePerson(root, person.name, send)
        return
      }
      if (value === 'Can edit' || value === 'Can view') {
        const role: string = value
        const live = latestOf<StackState>(STACK_KEY)
        if (!live) return
        send(
          live.set(current => ({
            ...current,
            menuFor: null,
            people: current.people.map(other =>
              other.name === person.name ? { ...other, role } : other,
            ),
          })),
        )
      }
    }
    const onOpen = (event: Event) => {
      const open = Boolean(
        (event as CustomEvent<{ value: boolean }>).detail?.value,
      )
      if (open) {
        const live = latestOf<StackState>(STACK_KEY)
        if (live) {
          send(live.set(current => ({ ...current, menuFor: person.name })))
        }
        return
      }
      // PORT NOTE: an item press fires `action` and `openchange` in the same
      // task. Waiting a task lets the action's state land first, so clearing
      // `menuFor` cannot undo a role change.
      window.setTimeout(() => {
        const live = latestOf<StackState>(STACK_KEY)
        if (!live) return
        send(
          live.set(current => ({
            ...current,
            menuFor: current.menuFor === person.name ? null : current.menuFor,
          })),
        )
      }, 0)
    }
    element.addEventListener('action', onAction)
    element.addEventListener('openchange', onOpen)
    return () => {
      element.removeEventListener('action', onAction)
      element.removeEventListener('openchange', onOpen)
    }
  })

const Stack = ({ state, set, h }: TileContext<StackState>) => {
  publish(STACK_KEY, state, set)
  const popover = Popover.Root.withMessage(h)
  const popoverTrigger = Popover.Trigger.withMessage(h)
  const popoverContent = Popover.Content.withMessage(h)
  const popoverTitle = Popover.Title.withMessage(h)
  const popoverDescription = Popover.Description.withMessage(h)
  const menu = Menu.Root.withMessage(h)
  const menuTrigger = Menu.Trigger.withMessage(h)
  const menuContent = Menu.Content.withMessage(h)
  const menuItem = Menu.Item.withMessage(h)
  const menuItemIcon = Menu.ItemIcon.withMessage(h)
  const menuSeparator = Menu.Separator.withMessage(h)
  const host = Overlays.OverlayHost.withMessage(h)

  const layers = [
    state.sharing ? 'Share popover' : null,
    state.menuFor ? `Role menu · ${state.menuFor.split(' ')[0]}` : null,
    state.asking ? `Confirm · Remove ${state.asking.split(' ')[0]}?` : null,
  ].filter((layer): layer is string => layer !== null)

  return h.div([h.Class('ly-stack'), h.OnMount(stackMount)], [
    h.div([h.Class('ly-file')], [
      h.span([h.Class('ly-file-icon'), h.AriaHidden(true)], [
        icon(h, 'file-pdf', 'fill', 20),
      ]),
      h.span([h.Class('ly-file-text')], [
        h.span([h.Class('ly-file-name')], ['Q3 report.pdf']),
        h.span([h.Class('ly-file-meta')], [
          `Shared with ${state.people.length} ${
            state.people.length === 1 ? 'person' : 'people'
          }`,
        ]),
      ]),
      popover(
        [
          popover.OnOpenchange(detail =>
            detail.value
              ? set(current => ({ ...current, sharing: true }))
              : set(current => ({
                  ...current,
                  sharing: false,
                  menuFor: null,
                })),
          ),
        ],
        [
          popoverTrigger([], [
            h.button(
              [
                h.Type('button'),
                h.Class('b-btn ly-trigger'),
                h.Attribute('data-variant', 'primary'),
                ...(state.sharing ? [h.DataAttribute('open', '')] : []),
              ],
              ['Share'],
            ),
          ]),
          popoverContent(
            [
              h.Id(stackContentId),
              h.Class('b-pop ly-share-pop'),
              popoverContent.Align('end'),
              popoverContent.SideOffset(8),
              popoverContent.CollisionPadding(12),
            ],
            [
              popoverTitle([h.Class('ly-share-title')], ['Share report']),
              popoverDescription([h.Class('ly-share-desc')], [
                `${formatShortcut('mod+backspace')} removes the focused person.`,
              ]),
              state.people.length
                ? h.ul(
                    [h.Class('ly-people')],
                    state.people.map(person =>
                      h.li(
                        [
                          h.Class('ly-person'),
                          h.DataAttribute('person', person.name),
                        ],
                        [
                          h.span(
                            [h.Class('ly-avatar'), h.AriaHidden(true)],
                            [person.initials],
                          ),
                          h.span([h.Class('ly-person-name')], [person.name]),
                          menu([h.OnMount(personMenuMount(person))], [
                            menuTrigger([], [
                              h.button(
                                [
                                  h.Type('button'),
                                  h.Class('ly-role'),
                                  h.Attribute(
                                    'aria-label',
                                    `${person.name}: ${person.role}`,
                                  ),
                                  h.Attribute(
                                    'aria-keyshortcuts',
                                    ariaKeyshortcuts('mod+backspace'),
                                  ),
                                  ...(state.menuFor === person.name
                                    ? [h.DataAttribute('open', '')]
                                    : []),
                                ],
                                [
                                  person.role,
                                  icon(h, 'caret-down', 'bold', 12),
                                ],
                              ),
                            ]),
                            menuContent(
                              [
                                h.Class('b-pop ly-menu'),
                                menuContent.Align('end'),
                                menuContent.SideOffset(4),
                                menuContent.CollisionPadding(12),
                              ],
                              [
                                menuItem(
                                  [h.Class('b-item'), menuItem.Value('Can edit')],
                                  ['Can edit'],
                                ),
                                menuItem(
                                  [h.Class('b-item'), menuItem.Value('Can view')],
                                  ['Can view'],
                                ),
                                menuSeparator([h.Class('ly-menu-sep')], []),
                                menuItem(
                                  [
                                    h.Class('b-item ly-danger'),
                                    menuItem.Value('remove'),
                                  ],
                                  [
                                    menuItemIcon([], [
                                      icon(h, 'trash', 'bold', 14),
                                    ]),
                                    'Remove access',
                                  ],
                                ),
                              ],
                            ),
                          ]),
                        ],
                      ),
                    ),
                  )
                : h.button(
                    [
                      h.Type('button'),
                      h.Class('b-btn ly-people-reset'),
                      h.OnClick(
                        set(current => ({
                          ...current,
                          people: peopleSeed.map(person => ({ ...person })),
                        })),
                      ),
                    ],
                    ['Invite everyone back'],
                  ),
              h.div([h.Class('ly-host')], [
                host([host.Overlays(stackOverlays)], []),
              ]),
            ],
          ),
        ],
      ),
    ]),
    h.div([h.Class('ly-layers')], [
      h.p([h.Class('ly-layers-label')], ['Open layers']),
      h.ol([h.Class('ly-layers-list'), h.Attribute('aria-live', 'polite')], [
        ...(layers.length
          ? layers.map((layer, index) =>
              h.li(
                [
                  h.Class('ly-layer'),
                  ...(index === layers.length - 1
                    ? [h.DataAttribute('top', '')]
                    : []),
                ],
                [
                  layer,
                  index === layers.length - 1
                    ? h.kbd([h.Class('ly-esc')], ['Esc'])
                    : '',
                ],
              ),
            )
          : [
              h.li([h.Class('ly-layer'), h.DataAttribute('empty', '')], [
                'Nothing open',
              ]),
            ]),
      ]),
    ]),
  ])
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'overlays-theme',
    title: 'Light, dark or system.',
    blurb: 'Themes its preview, and remembers after a reload.',
    size: 'large',
    tone: 'paper',
    initial: {
      scheme: colorScheme.get().value,
      accent: accent.get().value,
    } as ThemeState,
    render: Theme,
  },
  {
    id: 'overlays-split',
    title: 'The split remembers.',
    blurb: 'Drag it, reload, and it stays put.',
    initial: {
      layout:
        splitSavedWidth === undefined
          ? splitDefault
          : [splitSavedWidth, 100 - splitSavedWidth],
      savedWidth: splitSavedWidth ?? null,
    } as SplitState,
    render: Split,
  },
  {
    id: 'overlays-player',
    title: 'Plays under a modal.',
    blurb: 'The player stays live above the dialog.',
    tone: 'ink',
    initial: {
      playing: false,
      elapsed: 12 * 60 + 34,
      lifted: null,
    } as PlayerState,
    render: Player,
  },
  {
    id: 'overlays-discard',
    title: 'Discard changes?',
    blurb: 'Escape asks first. Save and Cancel don’t.',
    tone: 'butter',
    initial: {
      note: 'Rotate after the 14:00 deploy.',
      draft: 'Rotate after the 14:00 deploy.',
      asking: false,
    } as NoteState,
    render: Note,
  },
  {
    id: 'overlays-receipt',
    title: 'Expand the receipt.',
    blurb: 'Each panel animates to its own height.',
    size: 'tall',
    initial: {
      open: { '4821': true },
      heights: {},
    } as ReceiptState,
    render: Receipts,
  },
  {
    id: 'overlays-stack',
    title: 'Escape closes the top.',
    blurb: 'Stacked layers close from the top down.',
    size: 'wide',
    tone: 'sky',
    initial: {
      people: peopleSeed.map(person => ({ ...person })),
      sharing: false,
      menuFor: null,
      asking: null,
    } as StackState,
    render: Stack,
  },
]
