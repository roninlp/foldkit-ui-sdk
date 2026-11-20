import {
  bindFindable,
  createStickToBottom,
  createTreeCollection,
  createVirtualizer,
  hiddenAttrs,
  supportsHiddenUntilFound,
  toggleTreeChecked,
  treeCheckedStates,
  treeFromPaths,
  visibleTreeRows,
  type TreeItemData,
  type VirtualItem,
} from '@ui-sdk/core'
import { createAsyncOptions } from '@ui-sdk/core/async-options'
import { Effect, Stream } from 'effect'
import { Queue } from 'effect'

import type { Html, HtmlBuilder } from 'foldkit/html'
import type { MountAction } from 'foldkit/mount'

import {
  Accordion,
  Autocomplete,
  Avatar,
  Carousel,
  Collapsible,
  Combobox,
  Listbox,
  Meter,
  Pagination,
  Progress,
  ScrollArea,
  Separator,
  Tabs,
  TokenInput,
  Tree,
  TriggerMenu,
} from 'foldkit-ui-sdk'

import type { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './collections.css'

/* Shared helpers */

type Setter<S> = (next: S | ((current: S) => S)) => Message

const icon = (
  h: HtmlBuilder<Message>,
  name: string,
  weight: 'regular' | 'fill' | 'bold' = 'fill',
  size = 16,
  extra = '',
) =>
  h.i(
    [
      h.Class(
        `ph${weight === 'regular' ? '' : `-${weight}`} ph-${name}${extra ? ` ${extra}` : ''}`,
      ),
      h.Style({ fontSize: `${size}px` }),
      h.Attribute('aria-hidden', 'true'),
    ],
    [],
  )

const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

const prefersReducedMotion = () =>
  typeof matchMedia !== 'undefined' &&
  matchMedia('(prefers-reduced-motion: reduce)').matches

/** Album art and book covers: a gradient block with type, never a photo. */
const cover = (
  h: HtmlBuilder<Message>,
  hue: number,
  size: number,
  title?: string,
  className?: string,
) =>
  h.span(
    [
      h.Class(`cl-cover${className ? ` ${className}` : ''}`),
      h.Style({ '--hue': String(hue), '--size': `${size}px` }),
      h.Attribute('aria-hidden', 'true'),
    ],
    title ? [h.span([h.Class('cl-cover-type')], [title])] : [],
  )

/**
 * A mount that keeps native listeners alive for as long as the element is in
 * the page. The cleanup runs when the element unmounts.
 */
const mounted = (
  name: string,
  setup: (element: HTMLElement, emit: (message: Message) => void) => () => void,
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
        yield* Effect.never
      }),
    ),
})

/** A mount that does one piece of DOM work, then finishes. */
const mountedOnce = (
  name: string,
  run: (element: HTMLElement) => void,
): MountAction<Message> => ({
  name,
  f: element =>
    Stream.callback<Message>(() =>
      Effect.sync(() => {
        run(element as HTMLElement)
      }),
    ),
})

/* 1. Now playing: tabs with a moving indicator over three track lists, and live progress. */

type Track = {
  id: string
  title: string
  artist: string
  secs: number
  hue: number
}

const albumTracks: Track[] = [
  { id: 'sh-1', title: 'Harbour Bell', artist: 'The Low Orchard', secs: 214, hue: 210 },
  { id: 'sh-2', title: 'Kelp Forest', artist: 'The Low Orchard', secs: 251, hue: 210 },
  { id: 'sh-3', title: 'Undertow', artist: 'The Low Orchard', secs: 228, hue: 210 },
  { id: 'sh-4', title: 'Gull Song', artist: 'The Low Orchard', secs: 187, hue: 210 },
  { id: 'sh-5', title: 'Salt on the Window', artist: 'The Low Orchard', secs: 302, hue: 210 },
  { id: 'sh-6', title: 'Brine', artist: 'The Low Orchard', secs: 166, hue: 210 },
  { id: 'sh-7', title: 'Pier at Dusk', artist: 'The Low Orchard', secs: 274, hue: 210 },
  { id: 'sh-8', title: 'Lantern Rowing', artist: 'The Low Orchard', secs: 339, hue: 210 },
]

const queueTracks: Track[] = [
  { id: 'q-1', title: 'Glass Meridian', artist: 'Noor Sato', secs: 236, hue: 28 },
  { id: 'q-2', title: 'Copper Weather', artist: 'Field Hymnal', secs: 262, hue: 140 },
  { id: 'q-3', title: 'Slow Comet', artist: 'Ada Rune', secs: 198, hue: 330 },
  { id: 'q-4', title: 'Tin Can Telephone', artist: 'The Marigolds', secs: 171, hue: 75 },
  { id: 'q-5', title: 'Overpass Choir', artist: 'Sable Junction', secs: 289, hue: 250 },
  { id: 'q-6', title: 'Weathervane', artist: 'Holm & Ash', secs: 223, hue: 175 },
]

const playedTracks: Track[] = [
  { id: 'p-1', title: 'Paper Kite', artist: 'Hollis June', secs: 205, hue: 55 },
  { id: 'p-2', title: 'Sundial', artist: 'Marta Kell', secs: 244, hue: 12 },
  { id: 'p-3', title: 'Lemon Grove Static', artist: 'Cassette Coast', secs: 218, hue: 95 },
  { id: 'p-4', title: 'Orbital Lullaby', artist: 'Fen Okoye', secs: 312, hue: 230 },
]

const everyTrack = [...albumTracks, ...queueTracks, ...playedTracks]

type PlayerState = {
  current: string
  elapsed: number
  playing: boolean
}

// PORT NOTE: the tile API's `set` closes over the state of the render that made
// it. Long-lived timers and element listeners read the newest one from here so
// they never write a stale snapshot back over the Model.
let playerSet: Setter<PlayerState> | null = null
let playerLive: PlayerState = { current: 'sh-3', elapsed: 71, playing: false }

const mountPlayerClock = mounted('NowPlayingClock', (element, emit) => {
  let visible = false
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false
  })
  observer.observe(element)
  const timer = setInterval(() => {
    const live = playerLive
    if (!live.playing || !visible) {
      return
    }
    const track = everyTrack.find(item => item.id === live.current) ?? albumTracks[0]
    if (live.elapsed >= track.secs) {
      return
    }
    const set = playerSet
    if (!set) {
      return
    }
    emit(
      set(current => ({
        ...current,
        elapsed: Math.min(current.elapsed + 1, track.secs),
      })),
    )
  }, 1000)
  return () => {
    observer.disconnect()
    clearInterval(timer)
  }
})

const trackList = (
  h: HtmlBuilder<Message>,
  state: PlayerState,
  set: Setter<PlayerState>,
  label: string,
  tracks: ReadonlyArray<Track>,
  playing: boolean,
  numbered: boolean,
) => {
  const scrollArea = ScrollArea.Root.withMessage(h)
  const viewport = ScrollArea.Viewport.withMessage(h)
  const content = ScrollArea.Content.withMessage(h)
  const scrollbar = ScrollArea.Scrollbar.withMessage(h)
  const thumb = ScrollArea.Thumb.withMessage(h)
  const listbox = Listbox.Root.withMessage(h)
  const item = Listbox.Item.withMessage(h)
  return scrollArea([h.Class('cl-player-area')], [
    viewport(
      [h.Class('cl-player-viewport'), h.Attribute('aria-label', label)],
      [
        content([], [
          listbox(
            [
              h.Class('cl-tracks'),
              h.Attribute('aria-label', label),
              listbox.Activation('manual'),
              listbox.Value(state.current),
              listbox.OnValuechange(detail => {
                const value = detail.value
                if (typeof value !== 'string') {
                  return set(current => current)
                }
                return set({ current: value, elapsed: 0, playing: true })
              }),
            ],
            tracks.map((track, index) =>
              item(
                [
                  h.Class('cl-track'),
                  item.Value(track.id),
                  item.Label(track.title),
                ],
                [
                  h.span([h.Class('cl-track-lead')], [
                    track.id === state.current && playing
                      ? icon(h, 'speaker-high', 'fill')
                      : numbered
                        ? String(index + 1)
                        : cover(h, track.hue, 32),
                  ]),
                  h.span([h.Class('cl-stack')], [
                    h.span([h.Class('cl-track-title')], [track.title]),
                    h.span([h.Class('cl-sub')], [track.artist]),
                  ]),
                  h.span([h.Class('cl-mono cl-dim')], [clock(track.secs)]),
                ],
              ),
            ),
          ),
        ]),
      ],
    ),
    scrollbar([h.Class('cl-scrollbar'), scrollbar.Orientation('vertical')], [
      thumb([h.Class('cl-thumb')], []),
    ]),
  ])
}

const nowPlaying = {
  initial: { current: 'sh-3', elapsed: 71, playing: false } as PlayerState,
  render: ({ state, set, h }: TileContext<PlayerState>) => {
    playerSet = set
    playerLive = state
    const tabs = Tabs.Root.withMessage(h)
    const tabsList = Tabs.List.withMessage(h)
    const tab = Tabs.Tab.withMessage(h)
    const panel = Tabs.Panel.withMessage(h)
    const indicator = Tabs.Indicator.withMessage(h)
    const progress = Progress.Root.withMessage(h)
    const progressTrack = Progress.Track.withMessage(h)
    const progressFill = Progress.Indicator.withMessage(h)
    const track = everyTrack.find(item => item.id === state.current) ?? albumTracks[0]
    const done = state.elapsed >= track.secs
    const playing = state.playing && !done
    return h.div([h.Class('cl-player'), h.OnMount(mountPlayerClock)], [
      h.header([h.Class('cl-player-head')], [
        cover(h, 210, 92, 'Saltwater Hymns', 'cl-player-art'),
        h.div([h.Class('cl-stack')], [
          h.span([h.Class('cl-kicker')], ['Album']),
          h.span([h.Class('cl-player-title')], ['Saltwater Hymns']),
          h.span([h.Class('cl-sub')], ['The Low Orchard · 2026 · 8 songs, 32 min']),
        ]),
      ]),
      tabs([h.Class('cl-player-tabs'), tabs.DefaultValue('album')], [
        tabsList([h.Class('cl-tabs'), h.Attribute('aria-label', 'Track lists')], [
          tab([tab.Value('album')], [h.button([h.Type('button'), h.Class('cl-tab')], ['Album'])]),
          tab([tab.Value('next')], [h.button([h.Type('button'), h.Class('cl-tab')], ['Up next'])]),
          tab([tab.Value('played')], [h.button([h.Type('button'), h.Class('cl-tab')], ['Played'])]),
          indicator([h.Class('cl-tab-indicator')], []),
        ]),
        panel([panel.Value('album'), h.Class('cl-tab-panel')], [
          trackList(h, state, set, 'Album tracks', albumTracks, playing, true),
        ]),
        panel([panel.Value('next'), h.Class('cl-tab-panel')], [
          trackList(h, state, set, 'Up next', queueTracks, playing, false),
        ]),
        panel([panel.Value('played'), h.Class('cl-tab-panel')], [
          trackList(h, state, set, 'Recently played', playedTracks, playing, false),
        ]),
      ]),
      h.div([h.Class('cl-now')], [
        h.button(
          [
            h.Type('button'),
            h.Class('cl-play'),
            h.Attribute('aria-label', playing ? 'Pause' : 'Play'),
            h.OnClick(
              done
                ? set({ ...state, elapsed: 0, playing: true })
                : set({ ...state, playing: !state.playing }),
            ),
          ],
          [icon(h, playing ? 'pause' : 'play', 'fill')],
        ),
        h.div([h.Class('cl-now-main')], [
          h.div([h.Class('cl-now-line')], [
            h.span([h.Class('cl-track-title')], [track.title]),
            h.span([h.Class('cl-sub')], [track.artist]),
          ]),
          progress(
            [
              h.Class('cl-now-progress'),
              progress.Value(Math.min(state.elapsed, track.secs)),
              progress.Max(track.secs),
              h.Attribute('aria-label', 'Playback position'),
              progress.GetValueLabel(
                (value: unknown) =>
                  `${clock(typeof value === 'number' ? value : 0)} of ${clock(track.secs)}`,
              ),
            ],
            [
              progressTrack([h.Class('cl-now-track')], [
                progressFill([h.Class('cl-now-fill')], []),
              ]),
            ],
          ),
        ]),
        h.span([h.Class('cl-mono cl-dim cl-now-time')], [
          `${clock(Math.min(state.elapsed, track.secs))} / ${clock(track.secs)}`,
        ]),
      ]),
    ])
  },
}

/* 2. Ten thousand tracks, virtualized inside a custom scroll area. */

const LIBRARY_SIZE = 10_000
const libWordsA = [
  'Amber', 'Hollow', 'Silver', 'Velvet', 'Golden', 'Faded', 'Electric', 'Distant',
  'Gentle', 'Lucid', 'Crimson', 'Tender', 'Restless', 'Sunken', 'Bright',
  'Midnight', 'Northern', 'Borrowed', 'Second', 'Little',
]
const libWordsB = [
  'Avenue', 'Signal', 'Orbit', 'Garden', 'Mirror', 'Season', 'Echo', 'Harvest',
  'Satellite', 'Meadow', 'Station', 'Fever', 'Postcard', 'Canyon', 'Parade',
  'Telegram', 'Ballroom', 'Relay', 'Monsoon', 'Atlas', 'Hours', 'Departures',
  'Rooftops',
]
const libFirst = [
  'Noa', 'Elio', 'Saskia', 'Bruno', 'Yara', 'Idris', 'Lotte', 'Mateo', 'Ines',
  'Kenji', 'Aurelie', 'Tobias', 'Zadie', 'Ravi', 'Freya', 'Olu',
]
const libLast = [
  'Fenwick', 'Calder', 'Moreau', 'Achebe', 'Lindqvist', 'Okada', 'Varela',
  'Brandauer', 'Quill', 'Sorensen', 'Albright', 'Nakamura', 'Duarte',
]

const libraryTrack = (index: number) => {
  const a = libWordsA[(index * 7) % libWordsA.length]
  const b = libWordsB[(index * 13 + Math.floor(index / 23)) % libWordsB.length]
  const first = libFirst[(index * 5 + Math.floor(index / 16)) % libFirst.length]
  const last = libLast[(index * 3 + Math.floor(index / 13)) % libLast.length]
  return {
    title: `${a} ${b}`,
    artist: `${first} ${last}`,
    secs: 140 + ((index * 37) % 220),
    hue: (index * 47) % 360,
  }
}

type LibraryState = {
  rows: ReadonlyArray<VirtualItem>
  size: number
  jumped: number | null
}

let librarySet: Setter<LibraryState> | null = null
let libraryVirtual: ReturnType<typeof createVirtualizer> | null = null

// PORT NOTE: createVirtualizer owns the measurement; its subscription writes the
// rendered window into the Model so the view stays a pure function of it.
const mountLibrary = mounted('LibraryVirtualizer', (element, emit) => {
  const virtual = createVirtualizer({
    count: () => LIBRARY_SIZE,
    estimate: () => 52,
    overscan: 6,
  })
  libraryVirtual = virtual
  const publish = () => {
    const rows = virtual.items()
    const size = virtual.size()
    const set = librarySet
    if (!set) {
      return
    }
    emit(
      set(current =>
        current.rows === rows && current.size === size
          ? current
          : { ...current, rows, size },
      ),
    )
  }
  const unsubscribe = virtual.subscribe(publish)
  const disconnect = virtual.connect(element)
  publish()
  return () => {
    unsubscribe()
    disconnect()
    libraryVirtual = null
  }
})

const mountLibraryJump = mounted('LibraryJump', (element, emit) => {
  const listener = () => {
    if (!libraryVirtual) {
      return
    }
    const index = Math.floor(Math.random() * LIBRARY_SIZE)
    const set = librarySet
    if (set) {
      emit(set(current => ({ ...current, jumped: index })))
    }
    libraryVirtual.scrollToIndex(index, { align: 'center' })
  }
  element.addEventListener('click', listener)
  return () => element.removeEventListener('click', listener)
})

const tenThousand = {
  initial: { rows: [], size: 0, jumped: null } as LibraryState,
  render: ({ state, set, h }: TileContext<LibraryState>) => {
    librarySet = set
    const scrollArea = ScrollArea.Root.withMessage(h)
    const viewport = ScrollArea.Viewport.withMessage(h)
    const content = ScrollArea.Content.withMessage(h)
    const scrollbar = ScrollArea.Scrollbar.withMessage(h)
    const thumb = ScrollArea.Thumb.withMessage(h)
    return h.div([h.Class('cl-lib')], [
      h.header([h.Class('cl-lib-head')], [
        h.div([h.Class('cl-stack')], [
          h.span([h.Class('cl-lib-count')], ['10,000 ', h.span([], ['tracks'])]),
          h.span([h.Class('cl-mono cl-dim'), h.Attribute('aria-live', 'polite')], [
            `${state.rows.length} rows in the DOM`,
          ]),
        ]),
        h.button(
          [
            h.Type('button'),
            h.Class('b-btn cl-lib-jump'),
            h.OnMount(mountLibraryJump),
          ],
          [icon(h, 'shuffle', 'bold'), 'Jump'],
        ),
      ]),
      scrollArea([h.Class('cl-lib-area')], [
        viewport(
          [
            h.Class('cl-lib-viewport'),
            h.Attribute('aria-label', 'Library'),
            h.OnMount(mountLibrary),
          ],
          [
            content([], [
              h.div(
                [
                  h.Attribute('role', 'list'),
                  h.Attribute('aria-label', 'Tracks'),
                  h.Class('cl-lib-box'),
                  h.Style({ height: `${state.size}px` }),
                ],
                state.rows.map(row => {
                  const track = libraryTrack(row.index)
                  return h.div(
                    [
                      h.Attribute('role', 'listitem'),
                      h.Attribute('aria-setsize', String(LIBRARY_SIZE)),
                      h.Attribute('aria-posinset', String(row.index + 1)),
                      h.Class('cl-lib-row'),
                      ...(state.jumped === row.index
                        ? [h.DataAttribute('jumped', '')]
                        : []),
                      h.Style({
                        transform: `translateY(${row.start}px)`,
                        height: `${row.size}px`,
                      }),
                    ],
                    [
                      cover(h, track.hue, 34),
                      h.span([h.Class('cl-stack')], [
                        h.span([h.Class('cl-track-title')], [track.title]),
                        h.span([h.Class('cl-sub')], [track.artist]),
                      ]),
                      h.span([h.Class('cl-stack cl-lib-meta')], [
                        h.span([h.Class('cl-mono cl-dim')], [clock(track.secs)]),
                        h.span([h.Class('cl-mono cl-faint')], [
                          `#${(row.index + 1).toLocaleString('en-US')}`,
                        ]),
                      ]),
                    ],
                  )
                }),
              ),
            ]),
          ],
        ),
        h.div([h.Class('cl-fade cl-fade-bottom')], []),
        scrollbar([h.Class('cl-scrollbar'), scrollbar.Orientation('vertical')], [
          thumb([h.Class('cl-thumb')], []),
        ]),
      ]),
    ])
  },
}

/* 3. A music folder: Tree from file paths, with a preview beside a vertical separator. */

const filePaths = [
  'Music/Albums/Marsh Radio/01 Reedbed.flac',
  'Music/Albums/Marsh Radio/02 Heron Call.flac',
  'Music/Albums/Marsh Radio/03 Peat Fire.flac',
  'Music/Albums/Marsh Radio/cover.jpg',
  'Music/Albums/Quiet Hours/01 Vespers.flac',
  'Music/Albums/Quiet Hours/02 Night Porter.flac',
  'Music/Playlists/Gym rotation.m3u',
  'Audiobooks/The Iron Atlas/Part 1.m4b',
  'Audiobooks/The Iron Atlas/Part 2.m4b',
  'Books/Winter Botany.epub',
  'Books/Field Guide to Moss.pdf',
  'Podcasts/',
]

const fileItems = treeFromPaths(filePaths)

const fileMeta: Record<string, { kind: string; size: string; extra: string }> = {
  'Music/Albums/Marsh Radio/01 Reedbed.flac': {
    kind: 'FLAC audio',
    size: '38.4 MB',
    extra: '4:12 · 24-bit / 96 kHz',
  },
  'Music/Albums/Marsh Radio/02 Heron Call.flac': {
    kind: 'FLAC audio',
    size: '41.9 MB',
    extra: '4:37 · 24-bit / 96 kHz',
  },
  'Music/Albums/Marsh Radio/03 Peat Fire.flac': {
    kind: 'FLAC audio',
    size: '29.2 MB',
    extra: '3:15 · 24-bit / 96 kHz',
  },
  'Music/Albums/Marsh Radio/cover.jpg': {
    kind: 'JPEG image',
    size: '1.2 MB',
    extra: '1400 × 1400',
  },
  'Music/Albums/Quiet Hours/01 Vespers.flac': {
    kind: 'FLAC audio',
    size: '33.0 MB',
    extra: '3:48 · 16-bit / 44.1 kHz',
  },
  'Music/Albums/Quiet Hours/02 Night Porter.flac': {
    kind: 'FLAC audio',
    size: '45.7 MB',
    extra: '5:02 · 16-bit / 44.1 kHz',
  },
  'Music/Playlists/Gym rotation.m3u': {
    kind: 'Playlist',
    size: '2 KB',
    extra: '42 tracks',
  },
  'Audiobooks/The Iron Atlas/Part 1.m4b': {
    kind: 'Audiobook',
    size: '212 MB',
    extra: '6 h 41 min',
  },
  'Audiobooks/The Iron Atlas/Part 2.m4b': {
    kind: 'Audiobook',
    size: '188 MB',
    extra: '5 h 57 min',
  },
  'Books/Winter Botany.epub': {
    kind: 'EPUB book',
    size: '3.8 MB',
    extra: '312 pages',
  },
  'Books/Field Guide to Moss.pdf': {
    kind: 'PDF document',
    size: '18.1 MB',
    extra: '96 pages',
  },
}

const fileIcon = (path: string) => {
  if (/\.(flac|m4b|mp3)$/.test(path)) {
    return 'file-audio'
  }
  if (path.endsWith('.jpg')) {
    return 'file-image'
  }
  if (path.endsWith('.pdf')) {
    return 'file-pdf'
  }
  if (path.endsWith('.epub')) {
    return 'book-open-text'
  }
  return 'file-text'
}

const findItem = (
  items: ReadonlyArray<TreeItemData>,
  value: string,
): TreeItemData | undefined => {
  for (const item of items) {
    if (item.value === value) {
      return item
    }
    const inside = item.children && findItem(item.children, value)
    if (inside) {
      return inside
    }
  }
  return undefined
}

type FolderState = { selected: string | null; expanded: ReadonlyArray<string> }

const fileRows = (
  h: HtmlBuilder<Message>,
  items: ReadonlyArray<TreeItemData>,
  expanded: ReadonlyArray<string>,
): ReadonlyArray<Html> => {
  const item = Tree.Item.withMessage(h)
  const label = Tree.ItemLabel.withMessage(h)
  const group = Tree.Group.withMessage(h)
  const indicator = Tree.ItemIndicator.withMessage(h)
  return items.map(entry => {
    const branch = !!entry.children
    const open = expanded.includes(entry.value)
    const folderIcon = branch && open ? 'folder-open' : branch ? 'folder' : fileIcon(entry.value)
    return item(
      [
        h.Class('cl-ftree-item'),
        item.Value(entry.value),
        ...(branch ? [item.Branch(true)] : []),
      ],
      [
        label([h.Class('cl-ftree-row')], [
          branch
            ? indicator([h.Class('cl-ftree-caret')], [icon(h, 'caret-right', 'bold', 14)])
            : h.span([h.Class('cl-ftree-caret')], []),
          icon(h, folderIcon, 'fill', 14, 'cl-ftree-icon'),
          h.span([h.Class('cl-ellipsis')], [entry.label]),
        ]),
        branch
          ? group([h.Class('cl-ftree-group')], fileRows(h, entry.children ?? [], expanded))
          : '',
      ],
    )
  })
}

const musicFolder = {
  initial: {
    selected: 'Music/Albums/Marsh Radio/02 Heron Call.flac',
    expanded: ['Music', 'Music/Albums', 'Music/Albums/Marsh Radio'],
  } as FolderState,
  render: ({ state, set, h }: TileContext<FolderState>) => {
    const tree = Tree.Root.withMessage(h)
    const separator = Separator.Root.withMessage(h)
    const selected = state.selected
    const item = selected ? findItem(fileItems, selected) : undefined
    const meta = selected ? fileMeta[selected] : undefined
    const branch = !!item?.children
    const fileIconName = branch ? 'folder' : fileIcon(selected ?? '')
    const folder = selected?.split('/').slice(0, -1).join(' / ')
    return h.div([h.Class('cl-files')], [
      tree(
        [
          h.Class('cl-ftree'),
          h.Attribute('aria-label', 'Library folders'),
          tree.Items(fileItems),
          // PORT NOTE: the reference used defaultExpanded but read `expanded`
          // inside the label render-prop to swap the folder icon. Controlled
          // expansion keeps that observable.
          tree.Expanded([...state.expanded]),
          ...(state.selected ? [tree.Value(state.selected)] : []),
          tree.OnExpandedchange(detail =>
            set(current => ({ ...current, expanded: detail.value })),
          ),
          tree.OnValuechange(detail =>
            set(current => ({ ...current, selected: detail.value })),
          ),
        ],
        fileRows(h, fileItems, state.expanded),
      ),
      separator([h.Class('cl-files-sep'), separator.Orientation('vertical')], []),
      h.div([h.Class('cl-preview'), h.Attribute('aria-live', 'polite')], [
        item
          ? h.span([h.Class('cl-preview-icon')], [icon(h, fileIconName, 'fill', 14)])
          : '',
        item ? h.span([h.Class('cl-preview-name')], [item.label]) : '',
        item ? h.span([h.Class('cl-sub')], [folder || 'Library']) : '',
        item
          ? h.dl([h.Class('cl-preview-facts')], [
              h.dt([], ['Kind']),
              h.dd([], [meta?.kind ?? 'Folder']),
              h.dt([], ['Size']),
              h.dd([h.Class('cl-mono')], [
                meta?.size ?? `${item.children?.length ?? 0} items`,
              ]),
              ...(meta
                ? [
                    h.dt([], ['Details']),
                    h.dd([h.Class('cl-mono')], [meta.extra]),
                  ]
                : []),
            ])
          : h.span([h.Class('cl-sub')], ['Select a file to see its details.']),
      ]),
    ])
  },
}

/* 4. What syncs offline: a checkbox tree from createTreeCollection, with mixed folders. */

type SyncNode = {
  key: string
  parent: string | null
  label: string
  mb?: number
}

const syncNodes: SyncNode[] = [
  { key: 'road', parent: null, label: 'Road trip' },
  { key: 'road/1', parent: 'road', label: 'Coastline Drive', mb: 9.4 },
  { key: 'road/2', parent: 'road', label: 'Mile Marker', mb: 7.1 },
  { key: 'road/3', parent: 'road', label: 'Two-Lane Blacktop', mb: 11.6 },
  { key: 'focus', parent: null, label: 'Deep focus' },
  { key: 'focus/1', parent: 'focus', label: 'Grid Lines', mb: 14.3 },
  { key: 'focus/2', parent: 'focus', label: 'Low Hum', mb: 12.5 },
  { key: 'focus/3', parent: 'focus', label: 'Afterimage', mb: 10.9 },
]
const syncTree = createTreeCollection(syncNodes)
const syncInfo = new Map(syncNodes.map(node => [node.key, node]))

type SyncState = { checked: ReadonlyArray<string>; expanded: ReadonlyArray<string> }

const offlineSync = {
  initial: { checked: ['road/1', 'road/3', 'focus'], expanded: ['road'] } as SyncState,
  render: ({ state, set, h }: TileContext<SyncState>) => {
    const checkedState = treeCheckedStates(syncTree, state.checked)
    const visible = syncTree.visible(state.expanded)
    const total = syncNodes.reduce(
      (sum, node) => sum + (node.mb && checkedState(node.key) === true ? node.mb : 0),
      0,
    )
    const toggleOpen = (key: string) =>
      set({
        ...state,
        expanded: state.expanded.includes(key)
          ? state.expanded.filter(other => other !== key)
          : [...state.expanded, key],
      })
    return h.div([h.Class('cl-sync')], [
      h.div([h.Class('cl-sync-head')], [
        h.span([h.Class('cl-label')], ['Keep offline']),
        h.span([h.Class('cl-mono')], [`${total.toFixed(1)} MB`]),
      ]),
      h.ul([h.Class('cl-sync-list'), h.Attribute('aria-label', 'Playlists to keep offline')], [
        ...visible.map(key => {
          const node = syncInfo.get(key) as SyncNode
          const branch = syncTree.isBranch(key)
          const open = state.expanded.includes(key)
          const value = checkedState(key)
          const stateName = value === 'indeterminate' ? 'mixed' : value ? 'on' : 'off'
          return h.li(
            [
              h.Class('cl-sync-row'),
              h.Style({ '--level': String(syncTree.level(key)) }),
            ],
            [
              branch
                ? h.button(
                    [
                      h.Type('button'),
                      h.Class('cl-sync-caret'),
                      h.Attribute('aria-expanded', String(open)),
                      h.Attribute(
                        'aria-label',
                        `${open ? 'Collapse' : 'Expand'} ${node.label}`,
                      ),
                      h.OnClick(toggleOpen(key)),
                    ],
                    [icon(h, 'caret-right', 'bold', 14)],
                  )
                : h.span([h.Class('cl-sync-caret')], []),
              h.button(
                [
                  h.Type('button'),
                  h.Attribute('role', 'checkbox'),
                  h.Attribute(
                    'aria-checked',
                    value === 'indeterminate' ? 'mixed' : String(value),
                  ),
                  h.Class('cl-sync-check'),
                  h.OnClick(
                    set({
                      ...state,
                      checked: toggleTreeChecked(syncTree, state.checked, key),
                    }),
                  ),
                ],
                [
                  h.span(
                    [h.Class('cl-checkbox'), h.DataAttribute('state', stateName)],
                    [
                      value === 'indeterminate'
                        ? icon(h, 'minus', 'bold', 14)
                        : value
                          ? icon(h, 'check', 'bold', 14)
                          : '',
                    ],
                  ),
                  h.span([h.Class(branch ? 'cl-sync-name' : 'cl-sync-name cl-sync-leaf')], [
                    node.label,
                  ]),
                ],
              ),
              h.span([h.Class('cl-mono cl-faint')], [
                branch
                  ? `${syncTree.children(key).length} songs`
                  : `${node.mb?.toFixed(1)} MB`,
              ]),
            ],
          )
        }),
      ]),
    ])
  },
}

/* 5. A book's contents: Tree rendered as flat rows from visibleTreeRows. */

const contents: TreeItemData[] = [
  {
    value: 'part-1',
    label: 'Coast',
    children: [
      { value: 'ch-1', label: 'The Survey Ship' },
      { value: 'ch-2', label: 'Soundings' },
      { value: 'ch-3', label: 'A Map of Fog' },
    ],
  },
  {
    value: 'part-2',
    label: 'Interior',
    children: [
      { value: 'ch-4', label: 'Salt Roads' },
      { value: 'ch-5', label: 'The Borderless Room' },
    ],
  },
  {
    value: 'part-3',
    label: 'Return',
    children: [
      { value: 'ch-6', label: 'Homecoming Charts' },
      { value: 'ch-7', label: 'Legend and Scale' },
    ],
  },
]
const contentPages: Record<string, number> = {
  'part-1': 1,
  'ch-1': 3,
  'ch-2': 27,
  'ch-3': 52,
  'part-2': 81,
  'ch-4': 83,
  'ch-5': 118,
  'part-3': 151,
  'ch-6': 153,
  'ch-7': 189,
}
const partNames: Record<string, string> = {
  'part-1': 'Part one',
  'part-2': 'Part two',
  'part-3': 'Part three',
}

type ContentsState = { expanded: ReadonlyArray<string> }

const bookContents = {
  initial: { expanded: ['part-1'] } as ContentsState,
  render: ({ state, set, h }: TileContext<ContentsState>) => {
    const tree = Tree.Root.withMessage(h)
    const item = Tree.Item.withMessage(h)
    const label = Tree.ItemLabel.withMessage(h)
    const indicator = Tree.ItemIndicator.withMessage(h)
    const rows = visibleTreeRows(contents, state.expanded)
    return h.div([h.Class('cl-toc')], [
      h.div([h.Class('cl-toc-head')], [
        h.span([h.Class('cl-toc-title')], ['The Cartographer’s Daughter']),
        h.span([h.Class('cl-sub')], ['Ines Varga · 204 pages']),
      ]),
      tree(
        [
          h.Class('cl-toc-tree'),
          h.Attribute('aria-label', 'Contents'),
          tree.Items(contents),
          tree.Expanded([...state.expanded]),
          tree.OnExpandedchange(detail => set({ expanded: detail.value })),
          tree.DefaultValue('ch-2'),
          tree.ExpandOnPress(true),
        ],
        rows.map(({ item: entry }) =>
          item(
            [
              h.Class('cl-toc-item'),
              item.Value(entry.value),
              ...(entry.children ? [item.Branch(true)] : []),
            ],
            [
              label([h.Class('cl-toc-row')], [
                entry.children
                  ? indicator([h.Class('cl-toc-caret')], [icon(h, 'caret-right', 'bold', 14)])
                  : h.span([h.Class('cl-toc-num')], [entry.value.slice(3)]),
                h.span([h.Class('cl-ellipsis')], [
                  ...(entry.children
                    ? [
                        h.span([h.Class('cl-toc-part')], [partNames[entry.value] ?? '']),
                        ' ',
                        entry.label,
                      ]
                    : [entry.label]),
                ]),
                h.span([h.Class('cl-toc-page')], [String(contentPages[entry.value] ?? '')]),
              ]),
            ],
          ),
        ),
      ),
    ])
  },
}

/* 6. A podcast's seasons in an accordion. */

const seasons = [
  {
    value: 's3',
    label: 'Season 3',
    meta: '2026 · 8 episodes',
    episodes: [
      ['Night Market Recipes', '38 min'],
      ['The Ferry Strike', '44 min'],
    ],
  },
  {
    value: 's2',
    label: 'Season 2',
    meta: '2025 · 10 episodes',
    episodes: [
      ['Ice Road Choir', '51 min'],
      ['Shortwave Hobbyists', '36 min'],
    ],
  },
  {
    value: 's1',
    label: 'Season 1',
    meta: '2024 · 6 episodes',
    episodes: [
      ['Pilot: Slack Water', '29 min'],
      ['The Eel Fishers', '42 min'],
    ],
  },
]

const seasonList = {
  initial: {},
  render: ({ h }: TileContext<{}>) => {
    const accordion = Accordion.Root.withMessage(h)
    const item = Accordion.Item.withMessage(h)
    const header = Accordion.Header.withMessage(h)
    const trigger = Accordion.Trigger.withMessage(h)
    const panel = Accordion.Panel.withMessage(h)
    return h.div([h.Class('cl-seasons')], [
      h.span([h.Class('cl-label')], ['Low Tide Radio']),
      accordion([h.Class('cl-acc'), accordion.DefaultValue(['s3'])], [
        ...seasons.map(season =>
          item([h.Class('cl-acc-item'), item.Value(season.value)], [
            header([], [
              h.h3([h.Class('cl-acc-header')], [
                trigger([], [
                  h.button([h.Type('button'), h.Class('cl-acc-trigger')], [
                    h.span([h.Class('cl-acc-name')], [season.label]),
                    h.span([h.Class('cl-sub')], [season.meta]),
                    h.i(
                      [
                        h.Class('ph-bold ph-caret-down cl-acc-caret'),
                        h.Style({ fontSize: '14px' }),
                        h.Attribute('aria-hidden', 'true'),
                      ],
                      [],
                    ),
                  ]),
                ]),
              ]),
            ]),
            panel([h.Class('cl-acc-panel')], [
              h.ul([h.Class('cl-acc-eps')], [
                ...season.episodes.map(([title, length]) =>
                  h.li([], [
                    h.span([h.Class('cl-ellipsis')], [title ?? '']),
                    h.span([h.Class('cl-mono cl-faint')], [length ?? '']),
                  ]),
                ),
              ]),
            ]),
          ]),
        ),
      ]),
    ])
  },
}

/* 7. Album credits fold away; avatars fall back to initials. */

const portrait = (a: string, b: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="26" r="11" fill="#fff" fill-opacity=".55"/><rect x="14" y="42" width="36" height="22" rx="11" fill="#fff" fill-opacity=".55"/></svg>`,
  )}`

const credits = [
  { name: 'Mira Okafor', role: 'Vocals, piano', image: portrait('#e0a96d', '#b5523b') },
  { name: 'Dev Anand', role: 'Producer' },
  { name: 'June Halloran', role: 'Mixing engineer' },
]

const initialsOf = (name: string) =>
  name
    .split(' ')
    .map(part => part[0])
    .join('')

const creditsCard = {
  initial: {},
  render: ({ h }: TileContext<{}>) => {
    const collapsible = Collapsible.Root.withMessage(h)
    const trigger = Collapsible.Trigger.withMessage(h)
    const panel = Collapsible.Panel.withMessage(h)
    const avatar = Avatar.Root.withMessage(h)
    const avatarFallback = Avatar.Fallback.withMessage(h)
    return collapsible([h.Class('cl-credits'), collapsible.DefaultOpen(true)], [
      h.div([h.Class('cl-credits-head')], [
        h.span([h.Class('cl-stack')], [
          h.span([h.Class('cl-track-title')], ['Paper Lanterns']),
          h.span([h.Class('cl-sub')], ['Mira Okafor · 11 songs']),
        ]),
        trigger([], [
          h.button([h.Type('button'), h.Class('cl-credits-trigger')], [
            'Credits',
            h.i(
              [
                h.Class('ph-bold ph-caret-down'),
                h.Style({ fontSize: '14px' }),
                h.Attribute('aria-hidden', 'true'),
              ],
              [],
            ),
          ]),
        ]),
      ]),
      panel([h.Class('cl-credits-panel')], [
        h.ul([h.Class('cl-credits-list')], [
          ...credits.map(person =>
            h.li([], [
              avatar([h.Class('cl-avatar')], [
                person.image
                  ? h.img([
                      h.Src(person.image),
                      h.Alt(person.name),
                      h.Class('cl-avatar-img'),
                    ])
                  : '',
                avatarFallback([h.Class('cl-avatar-fallback')], [initialsOf(person.name)]),
              ]),
              h.span([h.Class('cl-ellipsis')], [person.name]),
              h.span([h.Class('cl-sub cl-ellipsis')], [person.role]),
            ]),
          ),
        ]),
      ]),
    ])
  },
}

/* 8. A podcast backlog: multiple selection kept across pages. */

const episodeTitles = [
  'The last bookshop in Tromsø',
  'Ghostwriters, unmasked',
  'Why paperbacks won',
  'Marginalia of famous readers',
  'A year of reading slowly',
  'The translator’s choice',
  'Libraries after midnight',
  'Fan fiction goes to court',
  'Serial novels, again',
  'The hardest first line',
  'Audiobooks and the ear',
  'Banned in three countries',
  'The editor’s red pen',
  'Reading on the night train',
  'Poetry that sells',
  'Inside a printing plant',
  'Short stories, long tails',
  'The cover redesign wars',
  'Letters to dead authors',
  'Bestseller lists, decoded',
  'The secondhand economy',
  'Bookbinding by hand',
  'Unfinished novels',
  'The reader’s diary',
]
const episodes = episodeTitles.map((title, index) => ({
  id: `ep-${24 - index}`,
  number: 24 - index,
  title,
  length: 28 + ((index * 11) % 30),
}))
const EPISODES_PER_PAGE = 3

const pageTemplate = `<ui-pagination-item><ui-pagination-link><button type="button" class="cl-page"></button></ui-pagination-link></ui-pagination-item>`
const ellipsisTemplate = `<ui-pagination-item><ui-pagination-ellipsis class="cl-page-gap">…</ui-pagination-ellipsis></ui-pagination-item>`

type BacklogState = { page: number; picked: ReadonlyArray<string> }

const backlog = {
  initial: { page: 1, picked: ['ep-24', 'ep-22', 'ep-17'] } as BacklogState,
  render: ({ state, set, h }: TileContext<BacklogState>) => {
    const listbox = Listbox.Root.withMessage(h)
    const item = Listbox.Item.withMessage(h)
    const indicator = Listbox.ItemIndicator.withMessage(h)
    const pagination = Pagination.Root.withMessage(h)
    const paginationList = Pagination.List.withMessage(h)
    const paginationItem = Pagination.Item.withMessage(h)
    const previous = Pagination.Previous.withMessage(h)
    const next = Pagination.Next.withMessage(h)
    const onPage = episodes.slice(
      (state.page - 1) * EPISODES_PER_PAGE,
      state.page * EPISODES_PER_PAGE,
    )
    const pageIds = onPage.map(episode => episode.id)
    const toList = (value: unknown) =>
      Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string') : []
    return h.div([h.Class('cl-backlog')], [
      h.div([h.Class('cl-backlog-head')], [
        h.span([h.Class('cl-label')], ['The Margin Notes']),
        h.span([h.Class('cl-mono cl-dim'), h.Attribute('aria-live', 'polite')], [
          `${state.picked.length} selected`,
        ]),
      ]),
      listbox(
        [
          h.Class('cl-eps'),
          h.Attribute('aria-label', 'Episodes to download'),
          listbox.Multiple(true),
          listbox.Value(state.picked.filter(id => pageIds.includes(id))),
          listbox.OnValuechange(detail => {
            const value = toList(detail.value)
            return set({
              ...state,
              picked: [...state.picked.filter(id => !pageIds.includes(id)), ...value],
            })
          }),
        ],
        onPage.map(episode =>
          item(
            [
              h.Class('cl-ep'),
              item.Value(episode.id),
              item.Label(episode.title),
            ],
            [
              h.span([h.Class('cl-mono cl-faint')], [String(episode.number)]),
              h.span([h.Class('cl-ellipsis')], [episode.title]),
              h.span([h.Class('cl-mono cl-faint')], [`${episode.length}m`]),
              h.span([h.Class('cl-ep-box')], [
                indicator([h.Class('cl-ep-check')], [icon(h, 'check', 'bold', 14)]),
              ]),
            ],
          ),
        ),
      ),
      // PORT NOTE: the range and its ellipses are cloned from templates by the
      // element. The element marks the current link with `data-current`; the
      // copied React CSS styles `[data-active]`, so the active pill is unstyled.
      pagination(
        [
          h.Class('cl-pages'),
          h.Attribute('aria-label', 'Episode pages'),
          pagination.Page(state.page),
          pagination.PageCount(episodes.length / EPISODES_PER_PAGE),
          pagination.Siblings(0),
          pagination.Boundaries(1),
          pagination.OnPagechange(detail => set({ ...state, page: detail.value })),
        ],
        [
          paginationList([h.Class('cl-pages-list')], [
            paginationItem([], [
              previous([], [
                h.button(
                  [h.Type('button'), h.Class('cl-page'), h.Attribute('aria-label', 'Previous page')],
                  [icon(h, 'caret-left', 'bold', 14)],
                ),
              ]),
            ]),
            h.template([h.InnerHTML(pageTemplate)]),
            h.template([h.Attribute('data-ellipsis', ''), h.InnerHTML(ellipsisTemplate)]),
            paginationItem([], [
              next([], [
                h.button(
                  [h.Type('button'), h.Class('cl-page'), h.Attribute('aria-label', 'Next page')],
                  [icon(h, 'caret-right', 'bold', 14)],
                ),
              ]),
            ]),
          ]),
        ],
      ),
    ])
  },
}

/* 9. Lyrics in a scroll area with edge fades, a custom thumb and a reading line. */

const lyrics = [
  [
    'The freight yard hums in a minor key',
    'Sodium light on the overpass',
    'You fold the map the wrong way round',
    'And we laugh till the windows fog',
  ],
  [
    'Four in the morning, northbound',
    'Every town just a name and a bell',
    'Keep the radio low, keep the heater on',
    'We’ll be home before the gulls',
  ],
  [
    'Somewhere a baker lifts the shutters',
    'Somewhere a ferry starts its turn',
    'I count the poles like rosary beads',
    'You sleep with your boots still on',
  ],
  [
    'Four in the morning, northbound',
    'Nothing ahead but the long white line',
    'If the road runs out, we’ll walk it',
    'We’ll be home before the gulls',
  ],
]

const lyricsCard = {
  initial: {},
  render: ({ h }: TileContext<{}>) => {
    const scrollArea = ScrollArea.Root.withMessage(h)
    const viewport = ScrollArea.Viewport.withMessage(h)
    const content = ScrollArea.Content.withMessage(h)
    const scrollbar = ScrollArea.Scrollbar.withMessage(h)
    const thumb = ScrollArea.Thumb.withMessage(h)
    return h.div([h.Class('cl-lyrics')], [
      h.div([h.Class('cl-lyrics-head')], [
        h.i(
          [
            h.Class('ph-fill ph-music-note'),
            h.Style({ fontSize: '16px', color: 'var(--tile-accent)' }),
            h.Attribute('aria-hidden', 'true'),
          ],
          [],
        ),
        h.span([h.Class('cl-ellipsis')], [
          'Four in the Morning, Northbound ',
          h.span([h.Class('cl-dim')], ['· Wren & the Tidelines']),
        ]),
      ]),
      scrollArea([h.Class('cl-lyrics-area')], [
        viewport(
          [h.Class('cl-lyrics-viewport'), h.Attribute('aria-label', 'Lyrics')],
          [
            content([h.Class('cl-lyrics-content')], [
              ...lyrics.map(verse =>
                h.p([], verse.map(line => h.span([], [line]))),
              ),
            ]),
          ],
        ),
        h.div([h.Class('cl-fade cl-fade-top')], []),
        h.div([h.Class('cl-fade cl-fade-bottom')], []),
        h.div([h.Class('cl-lyrics-line'), h.Attribute('aria-hidden', 'true')], []),
        scrollbar([h.Class('cl-scrollbar'), scrollbar.Orientation('vertical')], [
          thumb([h.Class('cl-thumb')], []),
        ]),
      ]),
    ])
  },
}

/* 10. New releases in a carousel of covers. */

const releases = [
  { title: 'Soft Machinery', artist: 'Lumen Ward', hue: 200 },
  { title: 'Blue Hour Club', artist: 'Okra & Lime', hue: 245 },
  { title: 'Northern Rooms', artist: 'Saga Holm', hue: 165 },
  { title: 'Midnight Bakery', artist: 'The Pastry Saints', hue: 40 },
  { title: 'Concrete Garden', artist: 'Juno Vale', hue: 120 },
  { title: 'Heat Haze', artist: 'Marisol', hue: 18 },
  { title: 'Second Summer', artist: 'Ferris Day', hue: 85 },
  { title: 'Dial Tone Love', artist: 'Pip Arroyo', hue: 350 },
]

type NewReleasesState = { page: number }

const newReleases = {
  initial: { page: 0 } as NewReleasesState,
  render: ({ state, set, h }: TileContext<NewReleasesState>) => {
    const carousel = Carousel.Root.withMessage(h)
    const previous = Carousel.Previous.withMessage(h)
    const next = Carousel.Next.withMessage(h)
    const viewport = Carousel.Viewport.withMessage(h)
    const content = Carousel.Content.withMessage(h)
    const item = Carousel.Item.withMessage(h)
    return carousel(
      [
        h.Class('cl-carousel'),
        h.Attribute('aria-label', 'New releases'),
        carousel.Page(state.page),
        carousel.Align('start'),
        carousel.OnPagechange(detail =>
          set(current => ({ ...current, page: detail.value })),
        ),
      ],
      [
        h.div([h.Class('cl-carousel-head')], [
          h.span([h.Class('cl-stack')], [
            h.span([h.Class('cl-track-title')], ['New this Friday']),
            h.span([h.Class('cl-sub')], ['8 albums from artists you follow']),
          ]),
          h.span([h.Class('cl-carousel-nav')], [
            previous([], [
              h.button(
                [h.Type('button'), h.Class('cl-round'), h.Attribute('aria-label', 'Previous albums')],
                [icon(h, 'caret-left', 'bold')],
              ),
            ]),
            next([], [
              h.button(
                [h.Type('button'), h.Class('cl-round'), h.Attribute('aria-label', 'Next albums')],
                [icon(h, 'caret-right', 'bold')],
              ),
            ]),
          ]),
        ]),
        viewport([h.Class('cl-carousel-viewport')], [
          content([h.Class('cl-carousel-content')], [
            ...releases.map(album =>
              item(
                [
                  h.Class('cl-slide'),
                  h.Attribute('aria-label', `${album.title} by ${album.artist}`),
                ],
                [
                  cover(h, album.hue, 108, album.title),
                  h.span([h.Class('cl-slide-title cl-ellipsis')], [album.title]),
                  h.span([h.Class('cl-sub cl-ellipsis')], [album.artist]),
                ],
              ),
            ),
          ]),
        ]),
      ],
    )
  },
}

/* 11. Importing a folder: determinate bars fill, an unknown count pulses. */

const importFiles = [
  { id: 'dawn', name: 'Dawn chorus, Øresund.wav', size: '212 MB', rate: 3 },
  { id: 'rain', name: 'Rain on a tin roof.wav', size: '96 MB', rate: 5 },
  { id: 'photos', name: 'Sleeve photos', size: 'Folder', rate: 6 },
]
const importStart: Record<string, number | null> = {
  dawn: 62,
  rain: 18,
  photos: null,
}

type ImportState = { values: Record<string, number | null>; running: boolean }

let importSet: Setter<ImportState> | null = null
let importLive: ImportState = { values: importStart, running: false }

const mountImport = mounted('FolderImportTicker', (_element, emit) => {
  const timer = setInterval(() => {
    if (!importLive.running) {
      return
    }
    if (importFiles.every(file => importLive.values[file.id] === 100)) {
      return
    }
    const set = importSet
    if (!set) {
      return
    }
    emit(
      set(current => {
        if (!current.running) {
          return current
        }
        const next = { ...current.values }
        const audioDone = next.dawn === 100 && next.rain === 100
        for (const file of importFiles) {
          const value = next[file.id]
          if (value === null) {
            next[file.id] = audioDone ? 0 : null
          } else {
            next[file.id] = Math.min(100, value + file.rate)
          }
        }
        return { ...current, values: next }
      }),
    )
  }, 140)
  return () => clearInterval(timer)
})

const folderImport = {
  initial: { values: importStart, running: false } as ImportState,
  render: ({ state, set, h }: TileContext<ImportState>) => {
    importSet = set
    importLive = state
    const progress = Progress.Root.withMessage(h)
    const track = Progress.Track.withMessage(h)
    const fill = Progress.Indicator.withMessage(h)
    const complete = importFiles.every(file => state.values[file.id] === 100)
    return h.div([h.Class('cl-import'), h.OnMount(mountImport)], [
      h.div([h.Class('cl-import-head')], [
        h.span([h.Class('cl-stack')], [
          h.span([h.Class('cl-track-title')], ['Field Recordings 2025']),
          h.span([h.Class('cl-sub')], [
            complete ? 'Imported to Library' : state.running ? 'Importing…' : 'Paused',
          ]),
        ]),
        h.button(
          [
            h.Type('button'),
            h.Class('b-btn'),
            h.DataAttribute('variant', 'primary'),
            h.OnClick(
              complete
                ? set({ values: { ...importStart }, running: false })
                : set({ ...state, running: !state.running }),
            ),
          ],
          [complete ? 'Again' : state.running ? 'Pause' : 'Resume'],
        ),
      ]),
      h.ul([h.Class('cl-import-list')], [
        ...importFiles.map(file => {
          const value = complete ? 100 : state.values[file.id]
          return h.li([], [
            progress(
              [
                h.Class('cl-import-progress'),
                progress.Value(value),
                h.Attribute('aria-label', file.name),
              ],
              [
                h.span([h.Class('cl-import-line')], [
                  h.span([h.Class('cl-ellipsis')], [file.name]),
                  h.span([h.Class('cl-mono cl-dim')], [
                    value === null ? 'Counting files' : value === 100 ? 'Done' : `${value}%`,
                  ]),
                ]),
                track([h.Class('cl-import-track')], [
                  fill([h.Class('cl-import-fill')], []),
                ]),
              ],
            ),
          ])
        }),
      ]),
    ])
  },
}

/* 12. A yearly reading goal drawn as a ring meter. */

const GOAL = 52

type GoalState = { read: number }

const readingGoal = {
  initial: { read: 34 } as GoalState,
  render: ({ state, set, h }: TileContext<GoalState>) => {
    const meter = Meter.Root.withMessage(h)
    const meterValue = Meter.Value.withMessage(h)
    return h.div([h.Class('cl-goal')], [
      meter(
        [
          h.Class('cl-ring'),
          meter.Value(state.read),
          meter.Max(GOAL),
          h.Attribute('aria-label', '2026 reading goal'),
          meter.Format((value: unknown) => String(value)),
          meter.GetValueLabel((value: unknown) => `${value} of ${GOAL} books`),
        ],
        [
          h.span([h.Class('cl-ring-face')], [
            meterValue([h.Class('cl-ring-num')], []),
            h.span([h.Class('cl-sub')], [`of ${GOAL} books`]),
          ]),
        ],
      ),
      h.div([h.Class('cl-goal-side')], [
        h.span([h.Class('cl-label')], ['2026 reading goal']),
        h.span([h.Class('cl-goal-left')], [
          state.read >= GOAL ? 'Goal met' : `${GOAL - state.read} to go`,
        ]),
        h.span([h.Class('cl-sub')], [
          state.read >= GOAL ? 'Every book now is a bonus.' : 'Ahead of pace for December.',
        ]),
        h.div([h.Class('cl-goal-actions')], [
          h.button(
            [
              h.Type('button'),
              h.Class('cl-goal-minus'),
              h.Attribute('aria-label', 'Remove a book'),
              h.Disabled(state.read <= 0),
              h.OnClick(set({ read: Math.max(0, state.read - 1) })),
            ],
            [icon(h, 'minus', 'bold', 14)],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn'),
              h.DataAttribute('variant', 'primary'),
              h.Disabled(state.read >= GOAL),
              h.OnClick(set({ read: Math.min(GOAL, state.read + 1) })),
            ],
            [icon(h, 'plus', 'bold', 14), 'Log a book'],
          ),
        ]),
      ]),
    ])
  },
}

/* 13. @mentions in a book club note. */

const readers = [
  { value: 'priya', label: 'Priya Raman', hue: 20 },
  { value: 'oskar', label: 'Oskar Lind', hue: 200 },
  { value: 'hana', label: 'Hana Mori', hue: 330 },
  { value: 'leo', label: 'Leo Brandt', hue: 120 },
  { value: 'ama', label: 'Ama Owusu', hue: 60 },
]
const readerHue = new Map(readers.map(reader => [reader.value, reader.hue]))

const clubNote = {
  initial: {},
  render: ({ h }: TileContext<{}>) => {
    const menu = TriggerMenu.Root.withMessage(h)
    const input = TriggerMenu.Input.withMessage(h)
    const status = TriggerMenu.Status.withMessage(h)
    const content = TriggerMenu.Content.withMessage(h)
    const empty = TriggerMenu.Empty.withMessage(h)
    const list = TriggerMenu.List.withMessage(h)
    const item = TriggerMenu.Item.withMessage(h)
    return h.div([h.Class('cl-club')], [
      h.div([h.Class('cl-club-head')], [
        h.label([h.For('cl-club-note'), h.Class('cl-label')], ['Tuesday book club']),
        h.span([h.Class('cl-sub')], ['The Salt Archive · ch. 9']),
      ]),
      menu([menu.Triggers([{ char: '@', items: readers }])], [
        input([], [
          h.textarea(
            [
              h.Id('cl-club-note'),
              h.Class('cl-club-input'),
              h.Placeholder('Type @ to mention a reader'),
              // PORT NOTE: the reference's defaultValue is uncontrolled; set it
              // on the live textarea once so re-renders never rewrite typing.
              h.OnMount(
                mountedOnce('ClubNoteDefault', element => {
                  ;(element as HTMLTextAreaElement).value =
                    'Finished the lighthouse chapter. '
                }),
              ),
            ],
          ),
        ]),
        status([h.Class('cl-sr')], []),
        content([h.Class('b-pop cl-menu')], [
          empty([h.Class('cl-menu-empty')], ['No reader by that name.']),
          list([], [
            ...readers.map(reader =>
              item(
                [
                  h.Class('b-item cl-menu-item'),
                  item.Value(reader.value),
                  item.Label(reader.label),
                ],
                [
                  h.span(
                    [
                      h.Class('cl-initials'),
                      h.Style({ '--hue': String(readerHue.get(reader.value) ?? 0) }),
                      h.Attribute('aria-hidden', 'true'),
                    ],
                    [initialsOf(reader.label)],
                  ),
                  reader.label,
                ],
              ),
            ),
          ]),
        ]),
      ]),
      h.span([h.Class('cl-sub')], ['Type @ to mention · 5 readers']),
    ])
  },
}

/* 14. A question with chapter tokens: TokenInput with a TriggerMenu inside. */

const chapters = [
  { value: 'ch-1', label: 'Barometer' },
  { value: 'ch-2', label: 'The Long Fog' },
  { value: 'ch-3', label: 'Hailstones' },
  { value: 'ch-4', label: 'Thaw' },
  { value: 'ch-5', label: 'Lightning Rods' },
  { value: 'epilogue', label: 'Clear Skies' },
]

type PromptToken = { type: string; value: string; label: string }
type PromptValue = ReadonlyArray<string | PromptToken>

const promptStart: PromptValue = [
  'Compare ',
  { type: 'chapter', value: 'ch-2', label: 'The Long Fog' },
  ' with ',
  { type: 'chapter', value: 'ch-4', label: 'Thaw' },
  ' ',
]

const tokenTemplate = `<ui-token-input-token class="cl-token"><i class="ph-fill ph-bookmark-simple" style="font-size:14px;color:var(--tile-accent)" aria-hidden="true"></i><span data-token-label></span><ui-token-input-token-remove class="cl-token-remove"><i class="ph-bold ph-x" style="font-size:14px" aria-hidden="true"></i></ui-token-input-token-remove></ui-token-input-token>`

type PromptState = { asked: string | null }

type PromptApi = {
  getValue: () => PromptValue
  getLabel: () => string
  clear: () => void
}

let promptApi: PromptApi | null = null
let promptSet: Setter<PromptState> | null = null

// PORT NOTE: the reference kept a TokenInput controller. The web element's
// `api` is the same controller, so it is captured on mount and used by the
// send button instead.
const mountPromptApi = mounted('ChapterPromptApi', (element, _emit) => {
  promptApi = (element as unknown as { api: PromptApi }).api
  return () => {
    promptApi = null
  }
})

const mountPromptSend = mounted('ChapterPromptSend', (element, emit) => {
  const listener = () => {
    if (!promptApi) {
      return
    }
    const value = promptApi.getValue()
    const count = value.filter(part => typeof part !== 'string').length
    if (!promptApi.getLabel().trim()) {
      return
    }
    const set = promptSet
    if (!set) {
      return
    }
    emit(
      set({
        asked:
          count === 1 ? 'Asked about 1 chapter.' : `Asked about ${count} chapters.`,
      }),
    )
    promptApi.clear()
  }
  element.addEventListener('click', listener)
  return () => element.removeEventListener('click', listener)
})

const chapterPrompt = {
  initial: { asked: null } as PromptState,
  render: ({ state, set, h }: TileContext<PromptState>) => {
    promptSet = set
    const tokenInput = TokenInput.Root.withMessage(h)
    const editor = TokenInput.Editor.withMessage(h)
    const menu = TriggerMenu.Root.withMessage(h)
    const content = TriggerMenu.Content.withMessage(h)
    const empty = TriggerMenu.Empty.withMessage(h)
    const list = TriggerMenu.List.withMessage(h)
    const item = TriggerMenu.Item.withMessage(h)
    return h.div([h.Class('cl-prompt')], [
      h.span([h.Class('cl-label')], ['A Thousand Small Weathers']),
      tokenInput(
        [
          tokenInput.DefaultValue(promptStart),
          h.OnMount(mountPromptApi),
        ],
        [
          h.div([h.Class('cl-prompt-box')], [
            editor(
              [
                h.Class('cl-prompt-editor'),
                h.Attribute('aria-label', 'Question about the book'),
                editor.Placeholder('Ask about a chapter'),
              ],
              [],
            ),
            h.div([h.Class('cl-prompt-foot')], [
              h.span([h.Class('cl-sub'), h.Attribute('aria-live', 'polite')], [
                state.asked ?? '@ adds a chapter',
              ]),
              // PORT NOTE: Enter-to-send relied on the React onSubmit callback;
              // the element has no submit event, so the Ask button sends.
              h.button(
                [
                  h.Type('button'),
                  h.Class('cl-send'),
                  h.Attribute('aria-label', 'Ask'),
                  h.OnMount(mountPromptSend),
                ],
                [icon(h, 'paper-plane-right', 'fill', 14)],
              ),
            ]),
          ]),
          h.template([h.InnerHTML(tokenTemplate)]),
          menu(
            [menu.Triggers([{ char: '@', type: 'chapter', items: chapters }])],
            [
              content([h.Class('b-pop cl-menu')], [
                empty([h.Class('cl-menu-empty')], ['No chapter matches.']),
                list([], [
                  ...chapters.map(chapter =>
                    item(
                      [
                        h.Class('b-item cl-menu-item'),
                        item.Value(chapter.value),
                        item.Label(chapter.label),
                      ],
                      [icon(h, 'bookmark-simple', 'fill', 14), chapter.label],
                    ),
                  ),
                ]),
              ]),
            ],
          ),
        ],
      ),
    ])
  },
}

/* 15. Book search with results that load as you type. */

type Book = {
  value: string
  label: string
  author: string
  year: number
  hue: number
}

const catalog: Book[] = (
  [
    ['The Quiet Engine', 'Rhea Castellan', 2019, 210],
    ['Salt & Saffron', 'Omar Haddad', 2021, 35],
    ['A Field Guide to Leaving', 'Bea Lindgren', 2017, 150],
    ['The Clockmaker’s Garden', 'Eamon Pryce', 2023, 95],
    ['Moth Season', 'Ines Tal', 2020, 300],
    ['Lowland Psalms', 'Kofi Mensah', 2015, 60],
    ['The Ninth Lantern', 'Clara Whitlock', 2022, 15],
    ['Every River Ends', 'Arjun Mehta', 2018, 190],
    ['Quarry Light', 'Sunniva Berg', 2024, 120],
    ['The Understudy', 'Paloma Reyes', 2016, 340],
    ['Small Gods of August', 'Theo Nakashima', 2021, 50],
    ['The Weight of Feathers', 'Mae Abernathy', 2014, 260],
    ['Station Eleven Minutes', 'Joss Kerrigan', 2023, 230],
    ['House of Echoing Tiles', 'Leila Farahani', 2019, 175],
    ['Glasswing', 'Ronan Voss', 2020, 280],
    ['The Orchard Keeper’s Wife', 'Hedda Strand', 2012, 80],
  ] as ReadonlyArray<readonly [string, string, number, number]>
).map(([label, author, year, hue]) => ({
  value: label.toLowerCase().replace(/\W+/g, '-'),
  label,
  author,
  year,
  hue,
}))

type BookStatus = 'idle' | 'loading' | 'error'

const searchCatalog = (query: string, { signal }: { signal: AbortSignal }) =>
  new Promise<Book[]>((resolve, reject) => {
    const timer = setTimeout(() => {
      const needle = query.trim().toLowerCase()
      resolve(
        catalog
          .filter(
            book =>
              !needle || `${book.label} ${book.author}`.toLowerCase().includes(needle),
          )
          .slice(0, 6),
      )
    }, 450)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })

type SearchState = {
  items: ReadonlyArray<Book>
  status: BookStatus
  query: string
  chosen: Book
}

let searchSet: Setter<SearchState> | null = null

// PORT NOTE: useAsyncOptions became createAsyncOptions, driven by the element's
// own valuechange listener; its snapshot is mirrored into the tile state.
const mountBookSearch = mounted('BookSearchOptions', (element, emit) => {
  const options = createAsyncOptions<Book>(searchCatalog, {
    debounce: 250,
    immediate: true,
  })
  const publish = () => {
    const next = options.getState()
    const set = searchSet
    if (!set) {
      return
    }
    emit(
      set(current =>
        current.items === next.items &&
        current.status === next.status &&
        current.query === next.query
          ? current
          : {
              ...current,
              items: next.items,
              status: next.status,
              query: next.query,
            },
      ),
    )
  }
  const onValue = (event: Event) => {
    const detail = (event as CustomEvent<{ value: string; reason: string }>).detail
    options.setQuery(detail.value)
    if (detail.reason === 'item-press') {
      const match = catalog.find(book => book.label === detail.value)
      const set = searchSet
      if (match && set) {
        emit(set(current => ({ ...current, chosen: match })))
      }
    }
  }
  const unsubscribe = options.subscribe(publish)
  element.addEventListener('valuechange', onValue)
  publish()
  return () => {
    unsubscribe()
    element.removeEventListener('valuechange', onValue)
    options.cancel()
  }
})

const bookSearch = {
  initial: {
    items: catalog.slice(0, 6),
    status: 'idle',
    query: '',
    chosen: catalog[0],
  } as SearchState,
  render: ({ state, set, h }: TileContext<SearchState>) => {
    searchSet = set
    const autocomplete = Autocomplete.Root.withMessage(h)
    const label = Autocomplete.Label.withMessage(h)
    const input = Autocomplete.Input.withMessage(h)
    const content = Autocomplete.Content.withMessage(h)
    const status = Autocomplete.Status.withMessage(h)
    const empty = Autocomplete.Empty.withMessage(h)
    const list = Autocomplete.List.withMessage(h)
    const item = Autocomplete.Item.withMessage(h)
    const statusText =
      state.status === 'error'
        ? 'Couldn’t reach the catalog.'
        : state.status === 'loading'
          ? 'Searching…'
          : `${state.items.length} ${state.items.length === 1 ? 'book' : 'books'}`
    return h.div([h.Class('cl-search')], [
      autocomplete(
        [
          autocomplete.Items([...state.items]),
          autocomplete.Filter(false),
          autocomplete.Status(state.status),
          h.OnMount(mountBookSearch),
        ],
        [
          label([h.Class('cl-label')], ['Find a book']),
          h.div([h.Class('cl-search-field')], [
            h.i(
              [
                h.Class('ph-bold ph-magnifying-glass cl-search-icon'),
                h.Style({ fontSize: '14px' }),
                h.Attribute('aria-hidden', 'true'),
              ],
              [],
            ),
            input([], [
              h.input([
                h.Class('b-input cl-search-input'),
                h.Placeholder('Title or author'),
              ]),
            ]),
          ]),
          content([h.Class('b-pop cl-search-pop'), content.SideOffset(6)], [
            status([h.Class('cl-menu-status')], [statusText]),
            empty([h.Class('cl-menu-empty')], [
              state.items.length === 0 ? `No books match “${state.query}”.` : '',
            ]),
            list([h.Class('cl-search-list')], [
              ...state.items.map(book =>
                item(
                  [
                    h.Class('b-item cl-search-item'),
                    item.Value(book.value),
                    item.Label(book.label),
                  ],
                  [
                    cover(h, book.hue, 22),
                    h.span([h.Class('cl-ellipsis')], [book.label]),
                    h.span([h.Class('cl-sub cl-ellipsis')], [book.author]),
                  ],
                ),
              ),
            ]),
          ]),
        ],
      ),
      h.div([h.Class('cl-search-card'), h.Attribute('aria-live', 'polite')], [
        cover(h, state.chosen.hue, 44),
        h.span([h.Class('cl-stack')], [
          h.span([h.Class('cl-track-title cl-ellipsis')], [state.chosen.label]),
          h.span([h.Class('cl-sub')], [
            `${state.chosen.author} · ${state.chosen.year}`,
          ]),
        ]),
      ]),
    ])
  },
}

/* 16. Genres for a playlist, as chips in a multi-select combobox. */

const genres = [
  { value: 'dream-pop', label: 'Dream pop' },
  { value: 'post-rock', label: 'Post-rock' },
  { value: 'shoegaze', label: 'Shoegaze' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'jazz-fusion', label: 'Jazz fusion' },
  { value: 'krautrock', label: 'Krautrock' },
  { value: 'bossa-nova', label: 'Bossa nova' },
  { value: 'neo-soul', label: 'Neo-soul' },
  { value: 'chamber-pop', label: 'Chamber pop' },
  { value: 'synthwave', label: 'Synthwave' },
  { value: 'folk', label: 'Folk' },
]
const genreLabel = (value: string) =>
  genres.find(genre => genre.value === value)?.label ?? value

const chipTemplate = `<ui-combobox-chip class="cl-chip"><ui-combobox-chip-remove><button type="button" class="cl-chip-remove"><i class="ph-bold ph-x" style="font-size:14px" aria-hidden="true"></i></button></ui-combobox-chip-remove></ui-combobox-chip>`

type GenresState = { picked: ReadonlyArray<string> }

const playlistGenres = {
  initial: { picked: ['dream-pop', 'post-rock'] } as GenresState,
  render: ({ state, set, h }: TileContext<GenresState>) => {
    const combobox = Combobox.Root.withMessage(h)
    const label = Combobox.Label.withMessage(h)
    const chips = Combobox.Chips.withMessage(h)
    const input = Combobox.Input.withMessage(h)
    const content = Combobox.Content.withMessage(h)
    const empty = Combobox.Empty.withMessage(h)
    const list = Combobox.List.withMessage(h)
    const item = Combobox.Item.withMessage(h)
    const indicator = Combobox.ItemIndicator.withMessage(h)
    return h.div([h.Class('cl-genres')], [
      h.div([h.Class('cl-genres-head')], [
        cover(h, 265, 36),
        h.span([h.Class('cl-stack')], [
          h.span([h.Class('cl-track-title')], ['Night Bus Mix']),
          h.span([h.Class('cl-sub')], [
            state.picked.length
              ? `About ${state.picked.length * 37 + 12} songs match`
              : 'Add a genre to fill it',
          ]),
        ]),
      ]),
      combobox(
        [
          combobox.Multiple(true),
          combobox.Value([...state.picked]),
          combobox.ItemToLabel(genreLabel),
          combobox.OnValuechange(detail =>
            set({
              picked: Array.isArray(detail.value)
                ? detail.value.filter(
                    (value): value is string => typeof value === 'string',
                  )
                : [],
            }),
          ),
        ],
        [
          label([h.Class('cl-label')], ['Genres']),
          chips([h.Class('cl-chips')], [
            input([], [
              h.input([
                h.Class('cl-chips-input'),
                h.Placeholder(
                  state.picked.length ? 'Add more' : 'Add a genre',
                ),
              ]),
            ]),
          ]),
          content([h.Class('b-pop cl-genre-pop'), content.SideOffset(6)], [
            empty([h.Class('cl-menu-empty')], ['No genre by that name.']),
            list([], [
              ...genres.map(genre =>
                item(
                  [
                    h.Class('b-item cl-genre-item'),
                    item.Value(genre.value),
                    item.Label(genre.label),
                  ],
                  [
                    genre.label,
                    indicator([h.Class('cl-genre-check')], [
                      icon(h, 'check', 'bold', 14),
                    ]),
                  ],
                ),
              ),
            ]),
          ]),
          // PORT NOTE: the element renders chips from this template, sets each
          // chip's label and the remove button's aria-label itself.
          h.template([h.InnerHTML(chipTemplate)]),
        ],
      ),
    ])
  },
}

/* 17. A copy log that follows its newest line until you scroll up. */

const logFiles = [
  ['Disc 1/01 Low Season.flac', '41.8 MB'],
  ['Disc 1/02 Paper Moon Motel.flac', '37.2 MB'],
  ['Disc 1/03 Cold Open.flac', '29.6 MB'],
  ['Disc 1/04 Tram Lines.flac', '44.0 MB'],
  ['Disc 2/01 Smoke Signals.flac', '35.5 MB'],
  ['Disc 2/02 The Long Way Down.flac', '48.3 MB'],
  ['Disc 2/03 Tidepool.flac', '31.9 MB'],
  ['Disc 2/04 Allotment.flac', '26.7 MB'],
  ['booklet.pdf', '12.4 MB'],
]

const logLine = (index: number) => {
  const [name, size] = logFiles[index % logFiles.length]
  const seconds = 14 * 3600 + 2 * 60 + index * 3
  const time = [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map(part => String(part).padStart(2, '0'))
    .join(':')
  const skipped = index % 7 === 5
  return { id: index, time, name, size: skipped ? 'exists' : size, skipped }
}

type LogState = { count: number; following: boolean; live: boolean }

let logSet: Setter<LogState> | null = null
let logLive: LogState = { count: 9, following: true, live: true }
let logStick: ReturnType<typeof createStickToBottom> | null = null

// PORT NOTE: createStickToBottom's subscription drives `following`; the same
// mount runs the countdown and the "live" dot from an IntersectionObserver.
const mountSyncLog = mounted('SyncLogFollow', (element, emit) => {
  const scroller = element.querySelector<HTMLElement>('.cl-log-scroller')
  const stick = createStickToBottom({
    onChange: next => {
      const set = logSet
      if (!set) {
        return
      }
      emit(
        set(current =>
          current.following === next.following
            ? current
            : { ...current, following: next.following },
        ),
      )
    },
  })
  logStick = stick
  const disconnect = scroller ? stick.connect(scroller) : () => {}
  const observer = new IntersectionObserver(([entry]) => {
    const live = entry?.isIntersecting ?? false
    const set = logSet
    if (!set) {
      return
    }
    emit(set(current => (current.live === live ? current : { ...current, live })))
  })
  observer.observe(element)
  const timer = setInterval(() => {
    if (!logLive.live) {
      return
    }
    const set = logSet
    if (!set) {
      return
    }
    emit(set(current => ({ ...current, count: current.count + 1 })))
  }, 1100)
  return () => {
    disconnect()
    observer.disconnect()
    clearInterval(timer)
    logStick = null
  }
})

const syncLog = {
  initial: { count: 9, following: true, live: true } as LogState,
  render: ({ state, set, h }: TileContext<LogState>) => {
    logSet = set
    logLive = state
    const lines = Array.from({ length: Math.min(state.count, 120) }, (_, index) =>
      logLine(state.count - Math.min(state.count, 120) + index),
    )
    return h.div([h.Class('cl-log'), h.OnMount(mountSyncLog)], [
      h.div([h.Class('cl-log-head')], [
        h.span(
          [
            h.Class('cl-log-live'),
            ...(state.live ? [h.DataAttribute('live', '')] : []),
          ],
          ['Copying to pocket player'],
        ),
        h.span([h.Class('cl-mono cl-dim')], [`${state.count} files`]),
      ]),
      h.div([h.Class('cl-log-wrap')], [
        h.div(
          [
            h.Class('cl-log-scroller'),
            h.Tabindex(0),
            h.Attribute('role', 'log'),
            h.Attribute('aria-label', 'Copy log'),
          ],
          lines.map(line =>
            h.div(
              [
                h.Class('cl-log-line'),
                ...(line.skipped ? [h.DataAttribute('skipped', '')] : []),
              ],
              [
                h.span([], [line.time]),
                h.span([h.Class('cl-ellipsis')], [line.name ?? '']),
                h.span([], [line.size ?? '']),
              ],
            ),
          ),
        ),
        h.button(
          [
            h.Type('button'),
            h.Class('cl-log-jump'),
            ...(state.following ? [] : [h.DataAttribute('visible', '')]),
            h.Tabindex(state.following ? -1 : 0),
            h.Attribute('aria-hidden', String(state.following)),
            // PORT NOTE: scrolling is imperative, so the listener is attached
            // on mount rather than through a Message-only click handler.
            h.OnMount(
              mountedOnce('SyncLogJump', element => {
                element.addEventListener('click', () => {
                  logStick?.scrollToBottom({
                    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
                  })
                })
              }),
            ),
          ],
          [icon(h, 'arrow-down', 'bold', 14), 'Jump to latest'],
        ),
      ]),
    ])
  },
}

/* 18. Rename playlists in place with createInlineEdit. */

const playlistRows = [
  { id: 'morning', count: 24, hue: 50 },
  { id: 'commute', count: 61, hue: 190 },
  { id: 'rainy', count: 18, hue: 230 },
  { id: 'kitchen', count: 33, hue: 10 },
]

type RenameState = {
  editing: string | null
  names: Record<string, string>
  draft: string
}

// PORT NOTE: createInlineEdit was React glue around store.get/set. Its observable
// behavior (Enter and F2 start, a printable key seeds, Enter/Tab save, Escape
// reverts) is implemented with the tile state and key handlers instead.
// `renamePendingFocus` mirrors its put-focus-back step: only an edit that ended
// from the keyboard focuses the replacement button, never the first render.
let renamePendingFocus: string | null = null
let renameCaretAtEnd = false

const renamePlaylists = {
  initial: {
    editing: null,
    names: {
      morning: 'Morning pages',
      commute: 'Commute (long)',
      rainy: 'Rainy Sunday',
      kitchen: 'Kitchen dancing',
    },
    draft: '',
  } as RenameState,
  render: ({ state, set, h }: TileContext<RenameState>) => {
    const start = (id: string, text: string) =>
      set({ ...state, editing: id, draft: text })
    const commit = (id: string) => {
      const name = state.draft.trim()
      if (!name) {
        return set(current => current)
      }
      return set({
        ...state,
        editing: null,
        names: { ...state.names, [id]: name },
      })
    }
    const cancel = () => set({ ...state, editing: null })
    return h.div([h.Class('cl-rename')], [
      h.ul([h.Class('cl-rename-list')], [
        ...playlistRows.map(row => {
          const name = state.names[row.id] ?? ''
          return h.li(
            [
              h.Class('cl-rename-row'),
              h.DataAttribute('row', row.id),
              ...(state.editing === row.id ? [h.DataAttribute('editing', '')] : []),
            ],
            [
              cover(h, row.hue, 30),
              state.editing === row.id
                ? h.input([
                    h.Class('cl-rename-input'),
                    h.Attribute('aria-label', `Rename ${name}`),
                    h.Value(state.draft),
                    h.OnInput(value => set({ ...state, draft: value })),
                    h.OnKeyDown((key, modifiers) => {
                      if (key === 'Enter' || key === 'Tab') {
                        renamePendingFocus = row.id
                        return commit(row.id)
                      }
                      if (key === 'Escape') {
                        renamePendingFocus = row.id
                        return cancel()
                      }
                      return set(current => current)
                    }),
                    h.OnBlur(commit(row.id)),
                    h.OnMount(
                      mountedOnce(`RenameFocus-${row.id}`, element => {
                        const input = element as HTMLInputElement
                        input.focus()
                        if (renameCaretAtEnd) {
                          renameCaretAtEnd = false
                          input.setSelectionRange(input.value.length, input.value.length)
                        } else {
                          input.select()
                        }
                      }),
                    ),
                  ])
                : h.button(
                    [
                      h.Type('button'),
                      h.Class('cl-rename-name'),
                      h.Attribute('aria-describedby', 'cl-rename-hint'),
                      h.OnKeyDown((key, modifiers) => {
                        if (key === 'Enter' || key === 'F2') {
                          return start(row.id, name)
                        }
                        if (
                          key.length === 1 &&
                          !modifiers.metaKey &&
                          !modifiers.ctrlKey &&
                          !modifiers.altKey
                        ) {
                          renameCaretAtEnd = true
                          return start(row.id, key)
                        }
                        return set(current => current)
                      }),
                      h.OnDoubleClick(start(row.id, name)),
                      // PORT NOTE: the reference put focus back on the name
                      // button when an edit ended on <body>; doing it on the
                      // button's (re)insert is the same observable result.
                      h.OnMount(
                        mountedOnce(`RenameRefocus-${row.id}`, element => {
                          if (renamePendingFocus !== row.id) {
                            return
                          }
                          renamePendingFocus = null
                          element.focus()
                        }),
                      ),
                    ],
                    [
                      h.span([h.Class('cl-ellipsis')], [name]),
                      h.span([h.Class('cl-mono cl-faint')], [String(row.count)]),
                    ],
                  ),
              h.button(
                [
                  h.Type('button'),
                  h.Class('cl-rename-pen'),
                  h.Attribute('aria-label', `Rename ${name}`),
                  h.Tabindex(-1),
                  h.OnClick(start(row.id, name)),
                ],
                [icon(h, 'pencil-simple', 'fill', 14)],
              ),
            ],
          )
        }),
      ]),
      h.p([h.Id('cl-rename-hint'), h.Class('cl-sub cl-rename-hint')], [
        'Double-click, Enter or F2 to rename',
      ]),
    ])
  },
}

/* 19. A passage that find in page can open: bindFindable with hiddenAttrs. */

type PassageState = { shown: boolean; found: boolean }

let passageSet: Setter<PassageState> | null = null
let passageShown = false

// PORT NOTE: bindFindable keeps a closed panel findable with
// hidden="until-found" and reports a find-in-page reveal; the view owns the
// hidden attribute through hiddenAttrs.
const mountPassage = mounted('PassageFindable', (element, emit) => {
  const findable = bindFindable(element, {
    shown: () => passageShown,
    findable: () => true,
    reveal: () => {
      const set = passageSet
      if (set) {
        emit(set(current => ({ ...current, shown: true, found: true })))
      }
    },
  })
  return () => findable()
})

const hiddenPassage = {
  initial: { shown: false, found: false } as PassageState,
  render: ({ state, set, h }: TileContext<PassageState>) => {
    passageSet = set
    passageShown = state.shown
    const supported = supportsHiddenUntilFound()
    const { hidden } = hiddenAttrs(state.shown, true)
    return h.div([h.Class('cl-passage')], [
      h.span([h.Class('cl-label')], ['Chapter 7 · The Lamplighter’s Ledger']),
      h.p([h.Class('cl-passage-text')], [
        'Every evening Maren climbed the ninety steps and lit the lamp by hand.',
      ]),
      h.div(
        [
          h.Class('cl-passage-hidden'),
          ...(state.found ? [h.DataAttribute('found', '')] : []),
          ...(hidden === undefined ? [] : [h.Attribute('hidden', hidden)]),
          h.OnMount(mountPassage),
        ],
        [
          h.p([h.Class('cl-passage-text')], [
            'Under the logbook she found a brass key, cold as river stone, and a second ledger in her mother’s hand.',
          ]),
        ],
      ),
      h.div([h.Class('cl-passage-foot')], [
        h.button(
          [
            h.Type('button'),
            h.Class('b-btn'),
            h.Attribute('aria-expanded', String(state.shown)),
            h.OnClick(set({ shown: !state.shown, found: false })),
          ],
          [state.shown ? 'Hide passage' : 'Show passage'],
        ),
        h.span([h.Class('cl-sub')], [
          state.found
            ? 'Opened by find in page.'
            : supported
              ? 'Or find “brass key” on this page.'
              : 'Find in page can’t open it here.',
        ]),
      ]),
    ])
  },
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'collections-now-playing',
    title: 'Now playing.',
    blurb: 'Tabs over three lists, with live progress.',
    size: 'large',
    initial: nowPlaying.initial,
    render: nowPlaying.render,
  },
  {
    id: 'collections-ten-thousand',
    title: 'Ten thousand tracks.',
    blurb: 'Only the rows in view render.',
    size: 'tall',
    tone: 'paper',
    initial: tenThousand.initial,
    render: tenThousand.render,
  },
  {
    id: 'collections-music-folder',
    title: 'Your music folder.',
    blurb: 'A file tree built from plain paths.',
    size: 'wide',
    initial: musicFolder.initial,
    render: musicFolder.render,
  },
  {
    id: 'collections-offline-sync',
    title: 'Pick what syncs.',
    blurb: 'Mixed when partly checked.',
    tone: 'sage',
    initial: offlineSync.initial,
    render: offlineSync.render,
  },
  {
    id: 'collections-book-contents',
    title: 'Contents, flattened.',
    blurb: 'Nested chapters rendered as flat rows.',
    tone: 'paper',
    initial: bookContents.initial,
    render: bookContents.render,
  },
  {
    id: 'collections-seasons',
    title: 'Season by season.',
    blurb: 'One season open at a time.',
    initial: seasonList.initial,
    render: seasonList.render,
  },
  {
    id: 'collections-credits',
    title: 'Read the credits.',
    blurb: 'Liner notes fold away; initials stand in.',
    tone: 'butter',
    initial: creditsCard.initial,
    render: creditsCard.render,
  },
  {
    id: 'collections-backlog',
    title: 'Queue a backlog.',
    blurb: 'Selection holds across every page.',
    initial: backlog.initial,
    render: backlog.render,
  },
  {
    id: 'collections-lyrics',
    title: 'Scroll the lyrics.',
    blurb: 'Custom thumb, fades at both edges.',
    tone: 'ink',
    initial: lyricsCard.initial,
    render: lyricsCard.render,
  },
  {
    id: 'collections-new-releases',
    title: 'Fresh this Friday.',
    blurb: 'Swipe, use the arrow keys or the buttons.',
    size: 'wide',
    tone: 'paper',
    initial: newReleases.initial,
    render: newReleases.render,
  },
  {
    id: 'collections-folder-import',
    title: 'Import in progress.',
    blurb: 'Known sizes fill; unknown ones pulse.',
    tone: 'blueprint',
    initial: folderImport.initial,
    render: folderImport.render,
  },
  {
    id: 'collections-reading-goal',
    title: 'Reading goal.',
    blurb: 'A meter drawn as a ring.',
    tone: 'signal',
    initial: readingGoal.initial,
    render: readingGoal.render,
  },
  {
    id: 'collections-club-note',
    title: 'Tag the club.',
    blurb: 'Type @ to mention a reader.',
    tone: 'sky',
    initial: clubNote.initial,
    render: clubNote.render,
  },
  {
    id: 'collections-chapter-prompt',
    title: 'Ask about chapters.',
    blurb: 'Chapters drop in as tokens.',
    initial: chapterPrompt.initial,
    render: chapterPrompt.render,
  },
  {
    id: 'collections-book-search',
    title: 'Search the stacks.',
    blurb: 'Results load as you type.',
    initial: bookSearch.initial,
    render: bookSearch.render,
  },
  {
    id: 'collections-playlist-genres',
    title: 'Tag a playlist.',
    blurb: 'Each genre you pick becomes a chip.',
    tone: 'paper',
    initial: playlistGenres.initial,
    render: playlistGenres.render,
  },
  {
    id: 'collections-sync-log',
    title: 'Follows the tail.',
    blurb: 'New lines stay in view until you scroll.',
    tone: 'ink',
    initial: syncLog.initial,
    render: syncLog.render,
  },
  {
    id: 'collections-rename',
    title: 'Rename in place.',
    blurb: 'Enter saves, Escape puts it back.',
    tone: 'paper',
    initial: renamePlaylists.initial,
    render: renamePlaylists.render,
  },
  {
    id: 'collections-hidden-passage',
    title: 'Found when searched.',
    blurb: 'Find in page opens the hidden passage.',
    initial: hiddenPassage.initial,
    render: hiddenPassage.render,
  },
]
