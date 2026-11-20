import type { HtmlBuilder } from 'foldkit/html'
import { Option } from 'effect'

import { createInputHistory } from '@ui-sdk/core'
import { describeEntry } from '@ui-sdk/core/history'
import {
  visibleWaterfallRows,
  type WaterfallData,
  type WaterfallDataItem,
} from '@ui-sdk/core/waterfall'

import {
  Pagination,
  SegmentedControl,
  Slider,
  Switch,
  Timeline,
  Waterfall,
} from 'foldkit-ui-sdk'

import type { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './records.css'

const icon = (
  h: HtmlBuilder<Message>,
  name: string,
  weight: 'regular' | 'fill' | 'bold' = 'regular',
  size = 16,
  className?: string,
) =>
  h.i(
    [
      h.Class(
        `ph${weight === 'regular' ? '' : `-${weight}`} ph-${name}${className ? ` ${className}` : ''}`,
      ),
      h.Style({ fontSize: `${size}px` }),
      h.Attribute('aria-hidden', 'true'),
    ],
    [],
  )

/* Release history */

type ReleaseStatus = 'complete' | 'current' | 'upcoming'

const releases: ReadonlyArray<{
  version: string
  dateTime: string
  date: string
  name: string
  summary: string
  commits: number
  status: ReleaseStatus
}> = [
  {
    version: '3.0',
    dateTime: '2026-03-04',
    date: 'Mar 4',
    name: 'The rewrite',
    summary: 'A new sync engine and a sidebar you can collapse.',
    commits: 1204,
    status: 'complete',
  },
  {
    version: '3.1',
    dateTime: '2026-04-15',
    date: 'Apr 15',
    name: 'Shared links',
    summary: 'Links remember the folder they were opened from.',
    commits: 318,
    status: 'complete',
  },
  {
    version: '3.2',
    dateTime: '2026-06-02',
    date: 'Jun 2',
    name: 'Search in files',
    summary: "Search matches what's inside a file, not only its name.",
    commits: 402,
    status: 'complete',
  },
  {
    version: '3.3',
    dateTime: '2026-07-21',
    date: 'Jul 21',
    name: 'Resumable uploads',
    summary: 'Uploads pick up where they stopped after the network drops.',
    commits: 276,
    status: 'complete',
  },
  {
    version: '3.4',
    dateTime: '2026-09-08',
    date: 'Sep 8',
    name: 'Dark mode',
    summary: 'Follows your system, with sharper avatars and icons.',
    commits: 189,
    status: 'complete',
  },
  {
    version: '3.5',
    dateTime: '2026-11-12',
    date: 'Nov 12',
    name: 'Offline drafts',
    summary: "Write without a connection. Drafts sync when you're back.",
    commits: 441,
    status: 'current',
  },
  {
    version: '3.6',
    dateTime: '2027-01-20',
    date: 'Jan 20',
    name: 'Comments',
    summary: 'Threads on any line, with mentions and email replies.',
    commits: 97,
    status: 'upcoming',
  },
]

const latestRelease = '3.5'

type ReleaseState = { selected: string; scrubbing: boolean }

const releaseHistory = {
  initial: {
    selected: latestRelease,
    scrubbing: false,
  } as ReleaseState,
  render: ({ state, set, h }: TileContext<ReleaseState>) => {
    const timeline = Timeline.Root.withMessage(h)
    const item = Timeline.Item.withMessage(h)
    const marker = Timeline.Marker.withMessage(h)
    const connector = Timeline.Connector.withMessage(h)
    const title = Timeline.Title.withMessage(h)
    const time = Timeline.Time.withMessage(h)
    const release =
      releases.find(candidate => candidate.version === state.selected) ??
      releases[0]
    const status =
      release.status === 'current'
        ? 'Latest'
        : release.status === 'upcoming'
          ? 'Planned'
          : 'Shipped'

    // PORT NOTE: the reference focuses the latest event through the React
    // timeline controller. A Foldkit OnClick carries a Message, so the button
    // selects the latest release; focus stays where the user clicked.
    const focusLatest = set(current => ({
      ...current,
      selected: latestRelease,
    }))

    // PORT NOTE: drag scrubbing is tracked in the Model, because Foldkit's
    // pointermove carries no `buttons` flag. Pointerdown starts it, the item
    // under the pointer selects itself with OnPointerMove, and up or leave
    // stops it; focus is not dragged along the roving tab stop.
    const startScrub = (
      _pointerType: string,
      _button: number,
      _screenX: number,
      _screenY: number,
      _timeStamp: number,
      clientX: number,
      clientY: number,
    ) => {
      if (typeof document !== 'undefined') {
        const target = document
          .elementFromPoint(clientX, clientY)
          ?.closest<HTMLElement>('[data-slot="timeline-item"]')
        if (target && target !== document.activeElement) {
          target.focus({ preventScroll: true })
        }
      }
      return Option.some(set(current => ({ ...current, scrubbing: true })))
    }

    const stopScrub = () =>
      Option.some(set(current => ({ ...current, scrubbing: false })))

    return h.div([h.Class('rc-releases')], [
      h.div([h.Class('rc-release'), h.DataAttribute('status', release.status)], [
        h.div([h.Class('rc-release-head')], [
          h.span([h.Class('rc-release-version')], [`v${release.version}`]),
          h.span([h.Class('rc-release-status')], [status]),
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn rc-release-latest'),
              h.DataAttribute('variant', 'ghost'),
              h.Hidden(state.selected === latestRelease),
              h.OnClick(focusLatest),
            ],
            ['Jump to latest'],
          ),
        ]),
        h.p([h.Class('rc-release-name'), h.Key(release.version)], [release.name]),
        h.p([h.Class('rc-release-summary')], [release.summary]),
        h.p([h.Class('rc-release-meta')], [
          `${release.date} · ${release.commits.toLocaleString('en-US')} commits`,
        ]),
      ]),
      timeline(
        [
          h.Class('rc-timeline'),
          h.Attribute('aria-label', 'Releases'),
          timeline.Orientation('horizontal'),
          timeline.Loop(false),
          h.OnPointerDown(startScrub),
          h.OnPointerUp(stopScrub),
          h.OnPointerLeave(stopScrub),
        ],
        releases.map(entry =>
          item(
            [
              h.Class('rc-tl-item'),
              h.DataAttribute('slot', 'timeline-item'),
              item.Value(entry.version),
              item.Status(entry.status),
              ...(entry.version === state.selected
                ? [h.DataAttribute('selected', '')]
                : []),
              h.OnFocus(set(current => ({ ...current, selected: entry.version }))),
              ...(state.scrubbing
                ? [
                    h.OnPointerMove(() =>
                      Option.some(
                        set(current => ({
                          ...current,
                          selected: entry.version,
                        })),
                      ),
                    ),
                  ]
                : []),
            ],
            [
              marker([h.Class('rc-tl-marker')], []),
              connector([h.Class('rc-tl-connector')], []),
              title([h.Class('rc-tl-title')], [entry.version]),
              time([h.Class('rc-tl-time')], [
                h.time([h.Attribute('datetime', entry.dateTime)], [entry.date]),
              ]),
            ],
          ),
        ),
      ),
    ])
  },
}

/* Request waterfall */

const requests: WaterfallData = [
  { value: 'document', label: 'dashboard', start: 0, duration: 168 },
  { value: 'styles', label: 'app.css', start: 176, duration: 92 },
  {
    value: 'script',
    label: 'app.js',
    start: 180,
    duration: 386,
    children: [
      { value: 'charts', label: 'charts.js', start: 590, duration: 174 },
      { value: 'table', label: 'table.js', start: 598, duration: 122 },
    ],
  },
  { value: 'font', label: 'geist.woff2', start: 284, duration: 196 },
  {
    value: 'projects',
    label: 'api/projects',
    start: 612,
    duration: 248,
    children: [
      { value: 'avatar-1', label: 'ada.webp', start: 872, duration: 96 },
      { value: 'avatar-2', label: 'linus.webp', start: 878, duration: 132 },
    ],
  },
  { value: 'usage', label: 'api/usage', start: 620, duration: 412 },
  { value: 'analytics', label: 'insights.js', start: 1046, duration: 150 },
]

const requestInfo: Record<
  string,
  { type: string; size: string; status: number; initiator: string }
> = {
  document: { type: 'doc', size: '14 kB', status: 200, initiator: 'Other' },
  styles: { type: 'css', size: '9 kB', status: 200, initiator: 'dashboard' },
  script: { type: 'js', size: '212 kB', status: 200, initiator: 'dashboard' },
  charts: { type: 'js', size: '88 kB', status: 200, initiator: 'app.js' },
  table: { type: 'js', size: '41 kB', status: 200, initiator: 'app.js' },
  font: { type: 'font', size: '48 kB', status: 200, initiator: 'app.css' },
  projects: { type: 'api', size: '3 kB', status: 200, initiator: 'app.js' },
  'avatar-1': { type: 'img', size: '6 kB', status: 200, initiator: 'app.js' },
  'avatar-2': { type: 'img', size: '7 kB', status: 304, initiator: 'app.js' },
  usage: { type: 'api', size: '1 kB', status: 200, initiator: 'app.js' },
  analytics: { type: 'js', size: '22 kB', status: 200, initiator: 'app.js' },
}

const milliseconds = {
  style: 'unit',
  unit: 'millisecond',
  unitDisplay: 'narrow',
} as const

const requestFilters = [
  { value: 'all', label: 'All' },
  { value: 'js', label: 'JS' },
  { value: 'api', label: 'Fetch' },
  { value: 'img', label: 'Img' },
]

const requestsOfType = (type: string): WaterfallData =>
  type === 'all'
    ? requests
    : requests.flatMap(item => {
        const children = item.children?.filter(
          child => requestInfo[child.value].type === type,
        )
        const kept =
          requestInfo[item.value].type === type || (children?.length ?? 0) > 0
        return kept
          ? [{ ...item, ...(children?.length ? { children } : {}) }]
          : []
      })

type WaterfallState = {
  filter: string
  expanded: ReadonlyArray<string>
  selected: string | null
}

const requestWaterfall = {
  initial: {
    filter: 'all',
    expanded: ['script', 'projects'],
    selected: 'usage',
  } as WaterfallState,
  render: ({ state, set, h }: TileContext<WaterfallState>) => {
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
    const control = SegmentedControl.Root.withMessage(h)
    const segIndicator = SegmentedControl.Indicator.withMessage(h)
    const segItem = SegmentedControl.Item.withMessage(h)

    const shown = requestsOfType(state.filter)
    const rows = visibleWaterfallRows(shown, state.expanded)
    const chosen = rows.find(entry => entry.item.value === state.selected)?.item
    const info = chosen && requestInfo[chosen.value]

    return h.div([h.Class('rc-network')], [
      h.div([h.Class('rc-wf-toolbar')], [
        h.span([h.Class('rc-wf-title')], ['Network']),
        control(
          [
            h.Class('rc-seg'),
            h.Attribute('aria-label', 'Request type'),
            control.Value(state.filter),
            control.OnValuechange(detail => {
              if (!detail.value) return set(current => current)
              const filter = detail.value
              return set(current => ({ ...current, filter }))
            }),
          ],
          [
            segIndicator([h.Class('rc-seg-indicator')], []),
            ...requestFilters.map(option =>
              segItem(
                [
                  h.Class('rc-seg-item'),
                  segItem.Value(option.value),
                ],
                [option.label],
              ),
            ),
          ],
        ),
      ]),
      waterfall(
        [
          h.Class('rc-wf'),
          h.Attribute('aria-label', 'Network requests'),
          waterfall.Items(shown),
          waterfall.Range([0, 1200]),
          waterfall.Expanded(state.expanded),
          waterfall.OnExpandedchange(detail =>
            set(current => ({ ...current, expanded: detail.value })),
          ),
          waterfall.Value(state.selected),
          waterfall.OnValuechange(detail =>
            set(current => ({ ...current, selected: detail.value })),
          ),
          waterfall.Format(milliseconds),
          waterfall.Locale('en-US'),
          waterfall.GetBarLabel(
            (request: WaterfallDataItem, timing: { start: number; duration: number }) =>
              `${requestInfo[request.value].size}, starts at ${timing.start}, takes ${timing.duration}`,
          ),
        ],
        [
          headerRow([h.Class('rc-wf-head')], [
            columnHeader([h.Class('rc-wf-name')], ['Name']),
            columnHeader([h.Class('rc-wf-size')], ['Size']),
            columnHeader(
              [h.Class('rc-wf-axis'), h.Attribute('aria-label', 'Timeline')],
              [
                axis([h.Class('rc-wf-ticks'), axis.MaxTicks(5)], []),
                mark(
                  [h.Class('rc-wf-mark'), h.DataAttribute('kind', 'dcl'), mark.Time(572)],
                  ['DCL'],
                ),
                mark(
                  [
                    h.Class('rc-wf-mark'),
                    h.DataAttribute('kind', 'load'),
                    mark.Time(1032),
                  ],
                  ['Load'],
                ),
              ],
            ),
          ]),
          ...rows.map(entry =>
            row(
              [
                h.Key(entry.item.value),
                h.Class('rc-wf-row'),
                row.Value(entry.item.value),
                h.DataAttribute('type', requestInfo[entry.item.value].type),
              ],
              [
                rowHeader([h.Class('rc-wf-name')], [
                  ...(entry.item.children
                    ? [
                        indicator([h.Class('rc-wf-caret')], [
                          h.i(
                            [
                              h.Class('ph-bold ph-caret-right'),
                              h.Style({
                                fontSize: '11px',
                                transition: 'rotate 160ms',
                                ...(state.expanded.includes(entry.item.value)
                                  ? { rotate: '90deg' }
                                  : {}),
                              }),
                              h.Attribute('aria-hidden', 'true'),
                            ],
                            [],
                          ),
                        ]),
                      ]
                    : []),
                  h.span([h.Class('rc-wf-type'), h.Attribute('aria-hidden', 'true')], []),
                  h.span([h.Class('rc-wf-label')], [entry.item.label]),
                ]),
                cell([h.Class('rc-wf-size')], [requestInfo[entry.item.value].size]),
                bar([h.Class('rc-wf-bar')], []),
              ],
            ),
          ),
        ],
      ),
      h.p([h.Class('rc-wf-detail'), h.Attribute('aria-live', 'polite')], [
        ...(chosen && info
          ? [
              h.span([h.Class('rc-wf-detail-name')], [chosen.label]),
              h.span([h.DataAttribute('status', String(info.status))], [
                String(info.status),
              ]),
              h.span([], [info.type]),
              h.span([], [`${chosen.duration} ms`]),
              h.span([h.Class('rc-wf-detail-from')], [`from ${info.initiator}`]),
            ]
          : [h.span([], ['Select a request.'])]),
      ]),
      h.p([h.Class('rc-wf-summary')], [
        h.span([], [
          `${shown.flatMap(entry => [entry, ...(entry.children ?? [])]).length} requests`,
        ]),
        h.span([h.DataAttribute('kind', 'dcl')], ['DOMContentLoaded 572 ms']),
        h.span([h.DataAttribute('kind', 'load')], ['Load 1.03 s']),
      ]),
    ])
  },
}

/* Invoices */

const INVOICES = 1269
const PER_PAGE = 6
const PAGE_COUNT = Math.ceil(INVOICES / PER_PAGE)

const customers = [
  'Northwind',
  'Acme Corp',
  'Globex',
  'Initech',
  'Umbrella',
  'Hooli',
  'Stark & Co',
  'Wayne Ent.',
  'Soylent',
  'Tyrell',
  'Cyberdyne',
]

const invoiceStatuses = ['Paid', 'Paid', 'Paid', 'Due', 'Overdue'] as const

const invoicesOn = (page: number) => {
  const first = (page - 1) * PER_PAGE
  return Array.from(
    { length: Math.min(PER_PAGE, INVOICES - first) },
    (_, offset) => {
      const index = first + offset
      return {
        number: `INV-${String(24180 - index).padStart(5, '0')}`,
        customer: customers[(index * 7) % customers.length] ?? '',
        amount: 120 + ((index * 937) % 4800),
        status:
          invoiceStatuses[(index * 3 + page) % invoiceStatuses.length] ?? 'Paid',
      }
    },
  )
}

const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

type InvoiceState = { page: number }

const invoices = {
  initial: { page: 4 } as InvoiceState,
  render: ({ state, set, h }: TileContext<InvoiceState>) => {
    const pagination = Pagination.Root.withMessage(h)
    const list = Pagination.List.withMessage(h)
    const item = Pagination.Item.withMessage(h)
    const previous = Pagination.Previous.withMessage(h)
    const next = Pagination.Next.withMessage(h)
    const { page } = state
    const first = (page - 1) * PER_PAGE + 1

    return h.div([h.Class('rc-invoices')], [
      h.div([h.Class('rc-inv-head')], [
        h.span([h.Class('rc-inv-title')], ['Invoices']),
        h.span([h.Class('rc-inv-count')], [
          `${first}–${Math.min(first + PER_PAGE - 1, INVOICES)} of ${INVOICES.toLocaleString('en-US')}`,
        ]),
      ]),
      h.ul(
        [
          h.Key(`page-${page}`),
          h.Class('rc-inv-list'),
          h.Attribute('aria-label', `Invoices, page ${page}`),
        ],
        invoicesOn(page).map(invoice =>
          h.li([h.Key(invoice.number), h.Class('rc-inv-row')], [
            h.span([h.Class('rc-inv-who')], [
              h.span([h.Class('rc-inv-customer')], [invoice.customer]),
              h.span([h.Class('rc-inv-number')], [invoice.number]),
            ]),
            h.span([h.Class('rc-inv-right')], [
              h.span([h.Class('rc-inv-amount')], [currency.format(invoice.amount)]),
              h.span(
                [h.Class('rc-inv-status'), h.DataAttribute('status', invoice.status)],
                [invoice.status],
              ),
            ]),
          ]),
        ),
      ),
      h.p([h.Class('rc-inv-page'), h.Attribute('aria-hidden', 'true')], [
        `Page ${page} of ${PAGE_COUNT}`,
      ]),
      pagination(
        [
          h.Class('rc-pages'),
          h.Attribute('aria-label', 'Invoice pages'),
          pagination.Page(page),
          pagination.PageCount(PAGE_COUNT),
          pagination.Siblings(0),
          pagination.OnPagechange(detail => set({ page: detail.value })),
        ],
        [
          list([h.Class('rc-pages-list')], [
            item([], [
              previous([], [
                h.button(
                  [
                    h.Type('button'),
                    h.Class('rc-page'),
                    h.Attribute('aria-label', 'Previous page'),
                  ],
                  [icon(h, 'caret-left', 'bold', 13)],
                ),
              ]),
            ]),
            // The web element clones its range from these templates, so the
            // markup inside has to be real content, not a callback.
            h.template([
              h.InnerHTML(
                '<ui-pagination-item><ui-pagination-link><button type="button" class="rc-page"></button></ui-pagination-link></ui-pagination-item>',
              ),
            ]),
            h.template([
              h.DataAttribute('ellipsis', ''),
              h.InnerHTML(
                '<ui-pagination-item><ui-pagination-ellipsis class="rc-page-gap">…</ui-pagination-ellipsis></ui-pagination-item>',
              ),
            ]),
            item([], [
              next([], [
                h.button(
                  [
                    h.Type('button'),
                    h.Class('rc-page'),
                    h.Attribute('aria-label', 'Next page'),
                  ],
                  [icon(h, 'caret-right', 'bold', 13)],
                ),
              ]),
            ]),
          ]),
        ],
      ),
    ])
  },
}

/* Board history */

const columns = ['To do', 'Doing', 'Done'] as const
const priorities = ['Low', 'Medium', 'High'] as const
type BoardStatus = (typeof columns)[number]
type BoardPriority = (typeof priorities)[number]

const otherCards: Record<BoardStatus, string> = {
  'To do': 'Empty states',
  Doing: 'Keyboard map',
  Done: 'Dark mode',
}

const undoKeys =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)
    ? '⌘Z'
    : 'Ctrl+Z'

type BoardEntry = Readonly<{
  id: string
  field: 'status' | 'priority' | 'blocked'
  label: string
  value: string | boolean
  previous: string | boolean
  source: string
  reason: string
}>

type BoardState = {
  status: BoardStatus
  priority: BoardPriority
  blocked: boolean
  entries: ReadonlyArray<BoardEntry>
  position: number
  next: number
  stagedAt: number | null
}

const boardAt = (
  entries: ReadonlyArray<BoardEntry>,
  position: number,
): { status: BoardStatus; priority: BoardPriority; blocked: boolean } => {
  let status: BoardStatus = 'Doing'
  let priority: BoardPriority = 'Medium'
  let blocked = false
  for (const entry of entries.slice(0, position)) {
    if (entry.field === 'status') status = entry.value as BoardStatus
    else if (entry.field === 'priority') priority = entry.value as BoardPriority
    else blocked = entry.value === true
  }
  return { status, priority, blocked }
}

const seekBoard = (state: BoardState, to: number): BoardState => {
  const position = Math.max(0, Math.min(to, state.entries.length))
  return { ...state, ...boardAt(state.entries, position), position }
}

const appendBoardEntry = (
  state: BoardState,
  entry: Omit<BoardEntry, 'id'>,
): BoardState => {
  const entries = [
    ...state.entries.slice(0, state.position),
    { ...entry, id: `entry-${state.next}` },
  ]
  return {
    ...state,
    ...boardAt(entries, entries.length),
    entries,
    position: entries.length,
    next: state.next + 1,
  }
}

const boardHistory = {
  initial: {
    status: 'Doing',
    priority: 'Medium',
    blocked: false,
    entries: [],
    position: 0,
    next: 1,
    stagedAt: null,
  } as BoardState,
  render: ({ state, set, h }: TileContext<BoardState>) => {
    const columnsControl = SegmentedControl.Root.withMessage(h)
    const priorityControl = SegmentedControl.Root.withMessage(h)
    const segIndicator = SegmentedControl.Indicator.withMessage(h)
    const segItem = SegmentedControl.Item.withMessage(h)
    const toggle = Switch.Root.withMessage(h)
    const thumb = Switch.Thumb.withMessage(h)

    const { entries, position } = state
    const isStaged = state.stagedAt !== null && position > state.stagedAt

    const setStatus = (status: BoardStatus, source: string, reason: string) =>
      set(current =>
        appendBoardEntry(current, {
          field: 'status',
          label: 'Card status',
          value: status,
          previous: current.status,
          source,
          reason,
        }),
      )

    const setPriority = (priority: BoardPriority, source: string, reason: string) =>
      set(current =>
        appendBoardEntry(current, {
          field: 'priority',
          label: 'Card priority',
          value: priority,
          previous: current.priority,
          source,
          reason,
        }),
      )

    const setBlocked = (blocked: boolean, source: string, reason: string) =>
      set(current =>
        appendBoardEntry(current, {
          field: 'blocked',
          label: 'Blocked',
          value: blocked,
          previous: current.blocked,
          source,
          reason,
        }),
      )

    // PORT NOTE: stageChanges(agent, ...) needs a live agent and its original
    // act. The two staged changes are appended to the same Model-owned log the
    // controls write, so Discard and Keep keep the reference's behavior.
    const preview = (current: BoardState): BoardState => {
      const before = current.position
      const entries = [
        ...current.entries.slice(0, before),
        {
          id: `entry-${current.next}`,
          field: 'status' as const,
          label: 'Card status',
          value: 'Done',
          previous: current.status,
          source: 'agent',
          reason: 'programmatic',
        },
        {
          id: `entry-${current.next + 1}`,
          field: 'priority' as const,
          label: 'Card priority',
          value: 'High',
          previous: current.priority,
          source: 'agent',
          reason: 'programmatic',
        },
      ]
      return {
        ...current,
        ...boardAt(entries, entries.length),
        entries,
        position: entries.length,
        next: current.next + 2,
        stagedAt: before,
      }
    }

    const discard = (current: BoardState): BoardState =>
      current.stagedAt === null
        ? { ...current, stagedAt: null }
        : {
            ...seekBoard(current, current.stagedAt),
            stagedAt: null,
          }

    const undoKey = (key: string, modifiers: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean }) => {
      if (
        key.toLowerCase() !== 'z' ||
        !(modifiers.metaKey || modifiers.ctrlKey) ||
        modifiers.altKey
      ) {
        return set(current => current)
      }
      return set(current =>
        seekBoard(current, modifiers.shiftKey ? current.position + 1 : current.position - 1),
      )
    }

    return h.div([h.Class('rc-board'), h.OnKeyDown(undoKey)], [
      h.div([h.Class('rc-columns'), h.Attribute('aria-hidden', 'true')], [
        ...columns.map(column =>
          h.div(
            [
              h.Class('rc-column'),
              ...(column === state.status ? [h.DataAttribute('current', '')] : []),
            ],
            [
              h.span([h.Class('rc-column-name')], [column]),
              h.span([h.Class('rc-card rc-card-quiet')], [otherCards[column]]),
              ...(column === state.status
                ? [
                    h.span(
                      [
                        h.Class('rc-card'),
                        h.DataAttribute('priority', state.priority),
                        ...(state.blocked ? [h.DataAttribute('blocked', '')] : []),
                      ],
                      [
                        h.span([h.Class('rc-card-title')], ['Offline drafts']),
                        h.span([h.Class('rc-card-meta')], [
                          h.span([h.Class('rc-card-priority')], [state.priority]),
                          ...(state.blocked
                            ? [h.span([h.Class('rc-card-blocked')], ['Blocked'])]
                            : []),
                        ]),
                      ],
                    ),
                  ]
                : []),
            ],
          ),
        ),
      ]),

      h.div([h.Class('rc-controls')], [
        columnsControl(
          [
            h.Class('rc-seg'),
            h.Attribute('aria-label', 'Card status'),
            columnsControl.Value(state.status),
            columnsControl.OnValuechange(detail => {
              if (!detail.value) return set(current => current)
              return setStatus(
                detail.value as BoardStatus,
                detail.source,
                detail.reason,
              )
            }),
          ],
          [
            segIndicator([h.Class('rc-seg-indicator')], []),
            ...columns.map(column =>
              segItem(
                [h.Class('rc-seg-item'), segItem.Value(column)],
                [column],
              ),
            ),
          ],
        ),
        priorityControl(
          [
            h.Class('rc-seg'),
            h.Attribute('aria-label', 'Card priority'),
            priorityControl.Value(state.priority),
            priorityControl.OnValuechange(detail => {
              if (!detail.value) return set(current => current)
              return setPriority(
                detail.value as BoardPriority,
                detail.source,
                detail.reason,
              )
            }),
          ],
          [
            segIndicator([h.Class('rc-seg-indicator')], []),
            ...priorities.map(level =>
              segItem(
                [h.Class('rc-seg-item'), segItem.Value(level)],
                [level],
              ),
            ),
          ],
        ),
        h.label([h.Class('rc-switch-row')], [
          toggle(
            [
              h.Class('rc-switch'),
              h.Attribute('aria-label', 'Blocked'),
              toggle.Checked(state.blocked),
              toggle.OnCheckedchange(detail =>
                setBlocked(detail.value, detail.source, detail.reason),
              ),
            ],
            [thumb([h.Class('rc-switch-thumb')], [])],
          ),
          h.span([h.Attribute('aria-hidden', 'true')], ['Blocked']),
        ]),
      ]),

      h.div([h.Class('rc-history')], [
        h.div([h.Class('rc-history-bar')], [
          h.span([h.Class('rc-history-title')], ['History']),
          h.kbd([h.Class('rc-kbd')], [undoKeys]),
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn rc-icon-btn'),
              h.Attribute('aria-label', 'Undo'),
              h.Disabled(position === 0),
              h.OnClick(set(current => seekBoard(current, current.position - 1))),
            ],
            [icon(h, 'arrow-counter-clockwise', 'bold', 15)],
          ),
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn rc-icon-btn'),
              h.Attribute('aria-label', 'Redo'),
              h.Disabled(position === entries.length),
              h.OnClick(set(current => seekBoard(current, current.position + 1))),
            ],
            [icon(h, 'arrow-clockwise', 'bold', 15)],
          ),
        ]),
        h.ol([h.Class('rc-entries'), h.Attribute('aria-label', 'Changes')], [
          ...(entries.length === 0
            ? [
                h.li([h.Class('rc-entries-hint')], [
                  `Change the card, then press ${undoKeys}.`,
                ]),
              ]
            : []),
          h.li([], [
            h.button(
              [
                h.Type('button'),
                h.Class('rc-entry'),
                h.DataAttribute('applied', ''),
                ...(position === 0 ? [h.Attribute('aria-current', 'true')] : []),
                h.OnClick(set(current => seekBoard(current, 0))),
              ],
              ['Opened the card'],
            ),
          ]),
          ...entries.map((entry, index) =>
            h.li([h.Key(entry.id)], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('rc-entry'),
                  ...(index < position ? [h.DataAttribute('applied', '')] : []),
                  ...(entry.source === 'agent'
                    ? [h.DataAttribute('agent', '')]
                    : []),
                  ...(index + 1 === position
                    ? [h.Attribute('aria-current', 'true')]
                    : []),
                  h.OnClick(set(current => seekBoard(current, index + 1))),
                ],
                [
                  describeEntry({
                    id: entry.id,
                    ref: entry.label,
                    label: entry.label,
                    key: entry.field,
                    value: entry.value,
                    previous: entry.previous,
                    source: entry.source,
                    reason: entry.reason,
                  }),
                ],
              ),
            ]),
          ),
        ]),
        h.div(
          [
            h.Class('rc-suggest'),
            ...(isStaged ? [h.DataAttribute('staged', '')] : []),
          ],
          [
            icon(h, 'sparkle', 'fill', 14, 'rc-suggest-icon'),
            ...(isStaged
              ? [
                  h.span([h.Class('rc-suggest-text')], [
                    'Agent moved it to Done.',
                  ]),
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('b-btn'),
                      h.DataAttribute('variant', 'ghost'),
                      h.OnClick(set(discard)),
                    ],
                    ['Discard'],
                  ),
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('b-btn'),
                      h.DataAttribute('variant', 'primary'),
                      h.OnClick(set(current => ({ ...current, stagedAt: null }))),
                    ],
                    ['Keep'],
                  ),
                ]
              : [
                  h.span([h.Class('rc-suggest-text')], [
                    'Looks shipped. Close it out?',
                  ]),
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('b-btn'),
                      h.Disabled(
                        state.status === 'Done' && state.priority === 'High',
                      ),
                      h.OnClick(set(preview)),
                    ],
                    ['Preview'],
                  ),
                ]),
          ],
        ),
      ]),
    ])
  },
}

/* Command line */

const seededCommands = [
  'git status',
  'pnpm test --filter core',
  'deploy --env preview',
]

const respond = (command: string) => {
  const [name] = command.split(/\s+/)
  if (name === 'git') {
    return 'On branch main. Nothing to commit.'
  }
  if (name === 'pnpm') {
    return '✓ 312 tests passed in 4.1s'
  }
  if (name === 'deploy') {
    return command.includes('prod')
      ? 'Queued build #483 → production'
      : 'Queued build #483 → preview'
  }
  if (name === 'help') {
    return 'Try git, pnpm, deploy or clear.'
  }
  return `command not found: ${name}`
}

type CommandLine = Readonly<{ id: number; command: string; output: string }>

type CommandState = {
  draft: string
  commands: ReadonlyArray<string>
  lines: ReadonlyArray<CommandLine>
}

// `createInputHistory` keeps the arrow-key cursor, while the values it reads
// and writes stay in the tile's Model slice. One tile, so one controller.
let commandBridge: {
  entries: () => ReadonlyArray<string>
  read: () => string
} = { entries: () => [], read: () => '' }
let recalledCommand: string | undefined
const commandHistory = createInputHistory<string>({
  entries: () => commandBridge.entries(),
  read: () => commandBridge.read(),
  write: value => {
    recalledCommand = value
  },
})

const commandLine = {
  initial: {
    draft: '',
    commands: seededCommands,
    lines: [
      {
        id: 0,
        command: 'deploy --env preview',
        output: respond('deploy --env preview'),
      },
    ],
  } as CommandState,
  render: ({ state, set, h }: TileContext<CommandState>) => {
    // PORT NOTE: the reference reads and writes a live input ref. The field is
    // controlled here, so only the recall cursor lives in the controller; its
    // values come from the Model and a recalled value goes back through `set`.
    commandBridge = {
      entries: () => state.commands,
      read: () => state.draft,
    }

    const run = () => {
      const command = state.draft.trim()
      if (!command) return set(current => current)
      const commands = [...state.commands, command]
      if (command === 'clear') {
        return set(current => ({ ...current, commands, draft: '', lines: [] }))
      }
      const lines = [
        ...state.lines,
        { id: commands.length, command, output: respond(command) },
      ].slice(-3)
      return set(current => ({ ...current, commands, draft: '', lines }))
    }

    const onKeyDown = (
      key: string,
      modifiers: { shiftKey: boolean; ctrlKey: boolean; altKey: boolean; metaKey: boolean },
    ) => {
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        recalledCommand = undefined
        const handled = commandHistory.keydown({
          key,
          altKey: modifiers.altKey,
          ctrlKey: modifiers.ctrlKey,
          metaKey: modifiers.metaKey,
          shiftKey: modifiers.shiftKey,
          defaultPrevented: false,
          isComposing: false,
          target:
            typeof document === 'undefined' ? null : document.activeElement,
          preventDefault: () => undefined,
        } as unknown as KeyboardEvent)
        if (handled && recalledCommand !== undefined) {
          const draft = recalledCommand
          return set(current => ({ ...current, draft }))
        }
      }
      // PORT NOTE: Foldkit's OnKeyDown carries the key and modifiers, not the
      // native event, so `isComposing` cannot be read. The synthetic event says
      // false, and Enter runs even while an IME is composing.
      if (key === 'Enter') return run()
      return set(current => current)
    }

    return h.div([h.Class('rc-term')], [
      h.div([h.Class('rc-term-bar'), h.Attribute('aria-hidden', 'true')], [
        h.span([h.Class('rc-term-dots')], [h.i([], []), h.i([], []), h.i([], [])]),
        h.span([], ['~/atlas']),
      ]),
      h.ol(
        [
          h.Class('rc-term-log'),
          h.Attribute('aria-live', 'polite'),
          h.Attribute('aria-label', 'Output'),
        ],
        state.lines.map(line =>
          h.li([h.Key(String(line.id))], [
            h.span([h.Class('rc-term-echo')], [
              h.span([h.Class('rc-term-prompt'), h.Attribute('aria-hidden', 'true')], [
                '›',
              ]),
              line.command,
            ]),
            h.span([h.Class('rc-term-out')], [line.output]),
          ]),
        ),
      ),
      h.div([h.Class('rc-term-input')], [
        h.span([h.Class('rc-term-prompt'), h.Attribute('aria-hidden', 'true')], [
          '›',
        ]),
        h.input([
          h.Type('text'),
          h.Class('rc-term-field'),
          h.Attribute('aria-label', 'Command'),
          h.Placeholder('Type a command'),
          h.Autocomplete('off'),
          h.Autocapitalize('off'),
          h.Spellcheck(false),
          h.Value(state.draft),
          h.OnInput(value => set(current => ({ ...current, draft: value }))),
          h.OnKeyDown(onKeyDown),
        ]),
      ]),
      h.p([h.Class('rc-term-hint'), h.Attribute('aria-hidden', 'true')], [
        h.kbd([], ['↑']),
        h.kbd([], ['↓']),
        ' history ',
        h.kbd([], ['⏎']),
        ' run',
      ]),
    ])
  },
}

/* Activity feed */

const quietTime = (hour: number) =>
  `${Math.floor(hour) % 24}:${hour % 1 ? '30' : '00'}`

type FeedChange = Readonly<{
  at: number
  label: string
  previous: string
  value: string
  source: string
  reason: string
}>

type ActivityState = {
  digest: boolean
  send: string
  quiet: number
  quietFrom: number | null
  changes: ReadonlyArray<FeedChange>
  at: number
}

const onOff = (value: boolean) => (value ? 'on' : 'off')

const recordChange = (
  state: ActivityState,
  change: Omit<FeedChange, 'at'>,
): ActivityState => {
  const at = state.at + 1
  return {
    ...state,
    at,
    changes: [{ ...change, at }, ...state.changes].slice(0, 5),
  }
}

const activityFeed = {
  initial: {
    digest: true,
    send: 'Daily',
    quiet: 21,
    quietFrom: null,
    changes: [],
    at: 0,
  } as ActivityState,
  render: ({ state, set, h }: TileContext<ActivityState>) => {
    const toggle = Switch.Root.withMessage(h)
    const thumb = Switch.Thumb.withMessage(h)
    const send = SegmentedControl.Root.withMessage(h)
    const segIndicator = SegmentedControl.Indicator.withMessage(h)
    const segItem = SegmentedControl.Item.withMessage(h)
    const slider = Slider.Root.withMessage(h)
    const sliderValue = Slider.Value.withMessage(h)
    const control = Slider.Control.withMessage(h)
    const track = Slider.Track.withMessage(h)
    const fill = Slider.Indicator.withMessage(h)
    const sliderThumb = Slider.Thumb.withMessage(h)

    // PORT NOTE: the reference watches the subtree with @ui-sdk/core `observe`
    // and flashes the element it changed. A Foldkit render cannot subscribe and
    // dispatch, so each control records its own change in the Model; the feed
    // reads the real event source/reason but the flash is not replayed.
    const record = (
      change: Pick<FeedChange, 'label' | 'previous' | 'value' | 'source' | 'reason'>,
    ) => (current: ActivityState) => recordChange(current, change)

    return h.div([h.Class('rc-activity')], [
      h.div([h.Class('rc-prefs')], [
        h.div([h.Class('rc-pref')], [
          h.span([h.Class('rc-pref-name'), h.Id('rc-digest-label')], [
            'Email digest',
          ]),
          toggle(
            [
              h.Class('rc-switch'),
              h.AriaLabelledBy('rc-digest-label'),
              toggle.Checked(state.digest),
              toggle.OnCheckedchange(detail =>
                set(current =>
                  record({
                    label: 'Email digest',
                    previous: onOff(current.digest),
                    value: onOff(detail.value),
                    source: detail.source,
                    reason: detail.reason,
                  })({ ...current, digest: detail.value }),
                ),
              ),
            ],
            [thumb([h.Class('rc-switch-thumb')], [])],
          ),
        ]),
        h.div([h.Class('rc-pref')], [
          h.span([h.Class('rc-pref-name')], ['Send']),
          send(
            [
              h.Class('rc-seg'),
              h.Attribute('aria-label', 'Send'),
              send.Value(state.send),
              send.OnValuechange(detail => {
                if (!detail.value) return set(current => current)
                const value = detail.value
                return set(current =>
                  record({
                    label: 'Send',
                    previous: current.send,
                    value,
                    source: detail.source,
                    reason: detail.reason,
                  })({ ...current, send: value }),
                )
              }),
            ],
            [
              segIndicator([h.Class('rc-seg-indicator')], []),
              segItem([h.Class('rc-seg-item'), segItem.Value('Daily')], ['Daily']),
              segItem([h.Class('rc-seg-item'), segItem.Value('Weekly')], [
                'Weekly',
              ]),
            ],
          ),
        ]),
        slider(
          [
            h.Class('rc-quiet'),
            slider.Value([state.quiet]),
            slider.Min(18),
            slider.Max(24),
            slider.Step(0.5),
            slider.Format(quietTime),
            slider.OnValuechange(detail => {
              const value = detail.value[0]
              if (typeof value !== 'number') return set(current => current)
              return set(current => ({
                ...current,
                quiet: value,
                quietFrom:
                  current.quietFrom === null ? current.quiet : current.quietFrom,
              }))
            }),
            slider.OnValuecommit(detail => {
              const value = detail.value[0]
              if (typeof value !== 'number') return set(current => current)
              return set(current => {
                const before = current.quietFrom ?? current.quiet
                return record({
                  label: 'Quiet after',
                  previous: quietTime(before),
                  value: quietTime(value),
                  source: detail.source,
                  reason: detail.reason,
                })({ ...current, quiet: value, quietFrom: null })
              })
            }),
          ],
          [
            h.div([h.Class('rc-pref')], [
              h.span([h.Class('rc-pref-name')], ['Quiet after']),
              sliderValue([h.Class('rc-quiet-value')], []),
            ]),
            control([h.Class('rc-quiet-control')], [
              track([h.Class('rc-quiet-track')], [
                fill([h.Class('rc-quiet-fill')], []),
                sliderThumb(
                  [
                    h.Class('rc-quiet-thumb'),
                    h.Attribute('aria-label', 'Quiet after'),
                  ],
                  [],
                ),
              ]),
            ]),
          ],
        ),
      ]),
      h.div([h.Class('rc-feed')], [
        h.span([h.Class('rc-feed-title')], [
          h.span([h.Class('rc-feed-live'), h.Attribute('aria-hidden', 'true')], []),
          'Changes',
        ]),
        ...(state.changes.length
          ? [
              h.ol([h.Class('rc-feed-list')], [
                ...state.changes.map(change =>
                  h.li([h.Key(String(change.at)), h.Class('rc-feed-item')], [
                    h.span([h.Class('rc-feed-label')], [change.label]),
                    h.span([h.Class('rc-feed-values')], [
                      h.s([], [change.previous]),
                      h.span([h.Attribute('aria-label', 'to')], ['→']),
                      h.strong([], [change.value]),
                    ]),
                    h.span([h.Class('rc-feed-source')], [
                      `${change.source} · ${change.reason}`,
                    ]),
                  ]),
                ),
              ]),
            ]
          : [h.p([h.Class('rc-feed-empty')], ['Change a setting.'])]),
      ]),
    ])
  },
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'collections-release-history',
    title: 'Scrub the release history.',
    blurb: 'Arrow keys or a drag move through every version.',
    size: 'wide',
    tone: 'paper',
    initial: releaseHistory.initial,
    render: releaseHistory.render,
  },
  {
    id: 'collections-request-waterfall',
    title: 'Read the request waterfall.',
    blurb: 'Every request on one clock, with the ones it started tucked inside.',
    size: 'large',
    tone: 'white',
    initial: requestWaterfall.initial,
    render: requestWaterfall.render,
  },
  {
    id: 'collections-invoice-pages',
    title: 'Page 4 of 212.',
    blurb: 'The page list keeps its length, so nothing shifts under the pointer.',
    size: 'tall',
    tone: 'sky',
    initial: invoices.initial,
    render: invoices.render,
  },
  {
    id: 'collections-board-history',
    title: "Undo 'Moved card to Done'.",
    blurb:
      'Every change in words, from you or an agent, one step back at a time.',
    size: 'large',
    tone: 'butter',
    initial: boardHistory.initial,
    render: boardHistory.render,
  },
  {
    id: 'collections-command-recall',
    title: 'Recall the last command.',
    blurb: 'Arrow up brings it back, and leaves an IME alone.',
    size: 's',
    tone: 'ink',
    initial: commandLine.initial,
    render: commandLine.render,
  },
  {
    id: 'collections-activity-feed',
    title: 'Watch what changed.',
    blurb: 'One stream of every change, who made it and how.',
    size: 'tall',
    tone: 'sage',
    initial: activityFeed.initial,
    render: activityFeed.render,
  },
]
