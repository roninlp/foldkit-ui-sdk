import { createToaster } from '@ui-sdk/web'
import { Effect, Option, Queue, Stream } from 'effect'
import { Mount } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import {
  AlertDialog,
  Command,
  Dialog,
  Drawer,
  HoverCard,
  Menu,
  Menubar,
  NavigationMenu,
  Popover,
  Toast,
  Tooltip,
} from 'foldkit-ui-sdk'

import { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './overlays.css'

// The tile API hands each tile `set`, which builds the Message that writes the
// tile's slice of the Model. Foldkit dispatches Messages from view handlers, so
// the few demos whose reaction arrives from outside a handler — a timer, a
// document key listener, a toaster's Undo button — report through a Mount or a
// stream Mount instead. PORT NOTE: the reference's React hooks (`useState`'s
// async setter, `useShortcut`, `useShortcutHint`, `createDialogController`,
// `createConfirm`, `createCommandController`, `definePrimitive`) have no
// Foldkit counterpart; their observable behavior is rebuilt from element
// properties/events, these Mounts, and module-level controllers below.

// `set` hands back the site's whole Message union, so a Mount that reports a
// tile state change lists that union as the Messages it can produce.
type TileMessage = Message

const icon = (
  h: HtmlBuilder<Message>,
  name: string,
  weight: 'regular' | 'fill' | 'bold' = 'regular',
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

const avatar = (
  h: HtmlBuilder<Message>,
  initials: string,
  size: 'sm' | 'md' | 'lg' = 'md',
) =>
  h.span(
    [
      h.Class('ov-avatar'),
      h.DataAttribute('size', size),
      h.Attribute('aria-hidden', 'true'),
    ],
    [initials],
  )

/** Splits a formatted hint into keycaps: "Ctrl+Alt+N" or "⌘⌥N". */
const keys = (h: HtmlBuilder<Message>, text: string) => {
  const visible = text.replace(/[\u2066-\u2069]/g, '')
  const parts = visible.includes('+') ? visible.split('+') : [...visible]
  return h.span(
    [h.Class('ov-keys'), h.Attribute('aria-hidden', 'true')],
    parts.map(key => h.kbd([h.Class('ov-kbd')], [key])),
  )
}

// `useShortcutHint` formats "mod+alt+n" for the platform. The hints are built
// from the same combos here, with the same keycaps.
const isApple =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform)

const hintText = (combo: string) =>
  combo
    .split('+')
    .map(part => {
      if (part === 'mod') return isApple ? '⌘' : 'Ctrl'
      if (part === 'alt') return isApple ? '⌥' : 'Alt'
      if (part === 'shift') return isApple ? '⇧' : 'Shift'
      return part.toUpperCase()
    })
    .join('+')

// A hidden one-shot Mount: it dispatches `message` after `ms`, which is how a
// pending interaction moves on without a React setter.
const after = (ms: number, message: TileMessage) =>
  Mount.define('OverlaysAfter', {
    messages: [Message],
    execute: () => Effect.sleep(ms).pipe(Effect.as(message)),
  })()

const afterView = (
  h: HtmlBuilder<Message>,
  key: string,
  ms: number,
  message: TileMessage,
) =>
  // Keyed, so a timer that replaces a finished one at the same position mounts
  // again instead of being patched in place.
  h.keyed('span')(
    `overlays-after-${key}`,
    [h.Hidden(true), h.OnMount(after(ms, message))],
    [],
  )

// A stream Mount for demos whose events come from the DOM rather than a UI SDK
// part: a document key listener, a toast action, a native textarea.
const live = (
  name: string,
  start: (
    element: Element,
    emit: (message: TileMessage) => void,
  ) => () => void,
) =>
  Mount.defineStream(name, {
    messages: [Message],
    execute: ({ element }) =>
      Stream.callback<TileMessage>(queue =>
        Effect.gen(function* () {
          yield* Effect.acquireRelease(
            Effect.sync(() =>
              start(element, message => Queue.offerUnsafe(queue, message)),
            ),
            cleanup => Effect.sync(cleanup),
          )
          return yield* Effect.never
        }),
      ),
  })()

/* 1. Command palette with pages, always open */

type PaletteEntry = {
  value: string
  label: string
  iconName: string
  page?: string
  shortcut?: string
  hint?: string
}

const paletteSuggested: ReadonlyArray<PaletteEntry> = [
  {
    value: 'deploy',
    label: 'Deploy to production',
    iconName: 'rocket-launch',
    shortcut: 'alt+shift+d',
  },
  {
    value: 'rollback',
    label: 'Roll back last deploy',
    iconName: 'arrow-counter-clockwise',
    shortcut: 'alt+shift+r',
  },
  {
    value: 'logs',
    label: 'Tail production logs',
    iconName: 'terminal-window',
  },
]

const paletteNavigate: ReadonlyArray<PaletteEntry> = [
  {
    value: 'projects',
    label: 'Switch project…',
    iconName: 'folder',
    page: 'projects',
    hint: '4',
  },
  {
    value: 'people',
    label: 'Assign ENG-506 to…',
    iconName: 'users',
    page: 'people',
  },
  { value: 'invoices', label: 'Open invoices', iconName: 'credit-card' },
  { value: 'invite', label: 'Invite to workspace', iconName: 'user-plus' },
]

const paletteProjects = [
  { value: 'atlas-api', detail: 'Go · iad1' },
  { value: 'web-dashboard', detail: 'Next.js · edge' },
  { value: 'billing-worker', detail: 'Rust · queue' },
  { value: 'docs-site', detail: 'Astro · static' },
]

const palettePeople = [
  { value: 'Priya Raman', initials: 'PR', detail: 'Backend' },
  { value: 'Tomás Ortega', initials: 'TO', detail: 'Payments' },
  { value: 'Mei Lin', initials: 'ML', detail: 'Design systems' },
]

const paletteResults: Record<string, string> = {
  deploy: 'Live on production in 38s',
  rollback: 'Rolled back to build 2207',
  logs: 'Streaming logs from 6 regions',
  invoices: 'Opened 3 unpaid invoices',
  invite: 'Invite link copied',
}

const pageTitles: Record<string, string> = {
  projects: 'Projects',
  people: 'Assign',
}

type PaletteState = {
  pages: ReadonlyArray<string>
  query: string
  result: string
}

const paletteInitial: PaletteState = { pages: [], query: '', result: '' }

const renderPalette = ({ state, set, h }: TileContext<PaletteState>) => {
  const command = Command.Root.withMessage(h)
  const input = Command.Input.withMessage(h)
  const empty = Command.Empty.withMessage(h)
  const list = Command.List.withMessage(h)
  const pageView = Command.Page.withMessage(h)
  const group = Command.Group.withMessage(h)
  const groupLabel = Command.GroupLabel.withMessage(h)
  const item = Command.Item.withMessage(h)
  const itemIcon = Command.ItemIcon.withMessage(h)
  const itemText = Command.ItemText.withMessage(h)
  const shortcut = Command.Shortcut.withMessage(h)

  const next = (patch: Partial<PaletteState>): TileMessage =>
    set({ ...state, ...patch })

  const page = state.pages[state.pages.length - 1]
  const query = state.query.trim().toLowerCase()

  const paletteItem = (entry: PaletteEntry) =>
    item(
      [
        item.Value(entry.value),
        ...(entry.page === undefined ? [] : [item.Page(entry.page)]),
        ...(entry.shortcut === undefined ? [] : [item.Shortcut(entry.shortcut)]),
        item.Label(entry.label),
        h.Class('ov-cmd-item'),
      ],
      [
        itemIcon([h.Class('ov-cmd-icon')], [icon(h, entry.iconName, 'bold')]),
        itemText([h.Class('ov-cmd-text')], [entry.label]),
        entry.hint === undefined
          ? ''
          : h.span([h.Class('ov-cmd-hint')], [entry.hint]),
        entry.shortcut === undefined
          ? ''
          : shortcut([h.Class('ov-cmd-shortcut')], []),
        entry.page === undefined
          ? ''
          : icon(h, 'caret-right', 'bold', 16, 'ov-cmd-caret'),
      ],
    )

  const run = (value: string): TileMessage => {
    if (value === 'back') {
      return next({ pages: state.pages.slice(0, -1) })
    }
    if (page === 'projects') {
      return next({ pages: [], result: `Switched to ${value}` })
    }
    if (page === 'people') {
      return next({ pages: [], result: `ENG-506 assigned to ${value}` })
    }
    if (value === 'vercel') {
      return next({ pages: [], result: 'Building on ▲…' })
    }
    if (value === 'deploy') {
      return next({ pages: [], result: 'Deploying…' })
    }
    return next({
      pages: page === undefined ? state.pages : [],
      result: paletteResults[value] ?? value,
    })
  }

  const busy = state.result.endsWith('…')

  return [
    command(
      [
        h.Class('ov-cmd'),
        // The same array reference until the page stack changes, so the
        // property is only written when it really changes.
        command.Pages(state.pages),
        command.Loop(true),
        command.OnPageschange(detail =>
          next({ pages: [...detail.value] }),
        ),
        command.OnQuerychange(detail => next({ query: detail.value })),
        command.OnAction(detail => run(String(detail.value))),
      ],
      [
        h.div([h.Class('ov-cmd-search')], [
          icon(h, 'magnifying-glass', 'bold'),
          page === undefined
            ? ''
            : h.span([h.Class('ov-cmd-crumb')], [pageTitles[page] ?? page]),
          input([], [
            h.input([
              h.Attribute('aria-label', 'Search commands'),
              h.Attribute(
                'placeholder',
                page === undefined
                  ? 'Type a command or search…'
                  : 'Filter…',
              ),
              h.Class('ov-cmd-input'),
            ]),
          ]),
        ]),
        empty([h.Class('ov-cmd-empty')], ['Nothing matches that.']),
        list([h.Class('ov-cmd-list')], [
          pageView([], [
            group([h.Class('ov-cmd-group')], [
              groupLabel([h.Class('ov-cmd-label')], ['Suggested']),
              ...paletteSuggested.map(paletteItem),
            ]),
            group([h.Class('ov-cmd-group')], [
              groupLabel([h.Class('ov-cmd-label')], ['Navigate']),
              ...paletteNavigate.map(paletteItem),
            ]),
            query.length >= 3 && 'vercel'.startsWith(query)
              ? item(
                  [
                    item.Value('vercel'),
                    item.Label('vercel --prod'),
                    h.Class('ov-cmd-item'),
                  ],
                  [
                    itemIcon([h.Class('ov-cmd-icon')], [
                      h.span(
                        [
                          h.Class('ov-cmd-vercel'),
                          h.Attribute('aria-hidden', 'true'),
                        ],
                        ['▲'],
                      ),
                    ]),
                    itemText([h.Class('ov-cmd-text ov-cmd-mono')], [
                      'vercel --prod',
                    ]),
                  ],
                )
              : '',
          ]),
          pageView([pageView.Value('projects')], [
            ...paletteProjects.map(project =>
              item(
                [
                  item.Value(project.value),
                  item.Label(project.value),
                  h.Class('ov-cmd-item'),
                ],
                [
                  itemIcon([h.Class('ov-cmd-icon')], [
                    icon(h, 'folder', 'bold'),
                  ]),
                  itemText([h.Class('ov-cmd-text ov-cmd-mono')], [
                    project.value,
                  ]),
                  h.span([h.Class('ov-cmd-hint')], [project.detail]),
                ],
              ),
            ),
          ]),
          pageView([pageView.Value('people')], [
            ...palettePeople.map(person =>
              item(
                [
                  item.Value(person.value),
                  item.Label(person.value),
                  h.Class('ov-cmd-item'),
                ],
                [
                  avatar(h, person.initials, 'sm'),
                  itemText([h.Class('ov-cmd-text')], [person.value]),
                  h.span([h.Class('ov-cmd-hint')], [person.detail]),
                ],
              ),
            ),
          ]),
          page === undefined
            ? ''
            : item(
                [item.Value('back'), h.Class('ov-cmd-item')],
                [
                  itemIcon([itemIcon.Mirror(true), h.Class('ov-cmd-icon')], [
                    icon(h, 'arrow-left', 'bold'),
                  ]),
                  'Go back',
                ],
              ),
        ]),
        h.footer([h.Class('ov-cmd-foot')], [
          h.output([h.Class('ov-cmd-result')], [
            state.result === ''
              ? ''
              : h.span(
                  [
                    h.Key(state.result),
                    h.Class('ov-cmd-done'),
                    ...(busy ? [h.Attribute('data-busy', '')] : []),
                  ],
                  [icon(h, 'check', 'bold', 13), state.result],
                ),
          ]),
          h.span([h.Class('ov-cmd-keys')], [
            h.span([], [h.kbd([h.Class('ov-kbd')], ['↵']), ' Run']),
            page === undefined
              ? ''
              : h.span([], [h.kbd([h.Class('ov-kbd')], ['⌫']), ' Back']),
          ]),
        ]),
      ],
    ),
    state.result === 'Deploying…'
      ? afterView(
          h,
          'deploy',
          1200,
          next({ result: 'Live on production in 38s' }),
        )
      : state.result === 'Building on ▲…'
        ? afterView(
            h,
            'vercel',
            900,
            next({ result: '▲ Ready. Deployed to production in 0.9s' }),
          )
        : '',
  ]
}

/* 2. Dialog with an async close action */

type InviteState = {
  email: string
  error: string
  sent: ReadonlyArray<string>
  open: boolean
  sending: boolean
}

const inviteInitial: InviteState = {
  email: '',
  error: '',
  sent: [],
  open: false,
  sending: false,
}

const renderInvite = ({ state, set, h }: TileContext<InviteState>) => {
  const dialog = Dialog.Root.withMessage(h)
  const trigger = Dialog.Trigger.withMessage(h)
  const backdrop = Dialog.Backdrop.withMessage(h)
  const content = Dialog.Content.withMessage(h)
  const title = Dialog.Title.withMessage(h)
  const description = Dialog.Description.withMessage(h)
  const close = Dialog.Close.withMessage(h)

  const next = (patch: Partial<InviteState>): TileMessage =>
    set({ ...state, ...patch })

  // The reference sends from the close part's `action` and lets the dialog
  // close with reason "action". PORT NOTE: an `action` callback is not a
  // binding (the element owns the promise), so validating, the pending label
  // and the 900ms wait live in state and a timer instead.
  const send = (): TileMessage => {
    if (!/^\S+@\S+\.\S+$/.test(state.email)) {
      return next({ error: 'Enter a work email address.' })
    }
    return next({ error: '', sending: true })
  }

  return [
    h.div([h.Class('ov-team')], [
      h.div([h.Class('ov-team-avatars')], [
        avatar(h, 'JB', 'lg'),
        avatar(h, 'AO', 'lg'),
        avatar(h, 'SR', 'lg'),
        h.span(
          [
            h.Class('ov-avatar ov-avatar-more'),
            h.DataAttribute('size', 'lg'),
            h.Attribute('aria-hidden', 'true'),
          ],
          [`+${4 + state.sent.length}`],
        ),
      ]),
      h.p([h.Class('ov-team-name')], ['Helix team']),
      h.p([h.Class('ov-team-meta')], [
        state.sent.length > 0
          ? `Invite sent to ${state.sent[state.sent.length - 1]}`
          : '7 members · 2 admins',
      ]),
      dialog(
        [
          dialog.Open(state.open),
          dialog.OnOpenchange(detail =>
            detail.value
              ? next({ open: true, email: '', error: '' })
              : next({ open: false }),
          ),
        ],
        [
          trigger([], [
            h.button(
              [
                h.Type('button'),
                h.Class('b-btn ov-trigger'),
                h.Attribute('data-variant', 'primary'),
              ],
              [icon(h, 'user-plus', 'bold'), 'Invite people'],
            ),
          ]),
          backdrop([h.Class('ov-backdrop')], []),
          content([h.Class('ov-dialog')], [
            title([h.Class('ov-dialog-title')], ['Invite to Helix']),
            description([h.Class('ov-dialog-desc')], [
              'They can deploy every Helix project.',
            ]),
            h.label([h.Class('ov-field')], [
              h.span([h.Class('b-label')], ['Work email']),
              h.input([
                h.Class('b-input'),
                h.Type('email'),
                h.Attribute('placeholder', 'name@helix.dev'),
                h.Value(state.email),
                ...(state.error === ''
                  ? []
                  : [
                      h.Attribute('aria-invalid', 'true'),
                      h.Attribute('data-invalid', ''),
                    ]),
                h.OnInput(value => next({ email: value })),
              ]),
              state.error === ''
                ? ''
                : h.span([h.Class('ov-field-error')], [state.error]),
            ]),
            h.div([h.Class('ov-actions')], [
              close([], [
                h.button([h.Type('button'), h.Class('b-btn')], ['Not now']),
              ]),
              h.button(
                [
                  h.Type('button'),
                  h.Class('b-btn'),
                  h.Attribute('data-variant', 'primary'),
                  ...(state.sending
                    ? [
                        h.Attribute('data-pending', ''),
                        h.Attribute('aria-busy', 'true'),
                      ]
                    : []),
                  h.OnClick(send()),
                ],
                [state.sending ? 'Sending…' : 'Send invite'],
              ),
            ]),
            close([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('ov-dialog-x'),
                  h.Attribute('aria-label', 'Close'),
                ],
                [icon(h, 'x', 'bold')],
              ),
            ]),
          ]),
        ],
      ),
    ]),
    state.sending
      ? afterView(
          h,
          'invite-send',
          900,
          next({
            email: '',
            error: '',
            sent: [...state.sent, state.email],
            sending: false,
            open: false,
          }),
        )
      : '',
  ]
}

/* 3. AlertDialog with a pending destructive action */

type DeleteState = { deleted: boolean; open: boolean; deleting: boolean }

const deleteInitial: DeleteState = {
  deleted: false,
  open: false,
  deleting: false,
}

const renderDeleteProject = ({ state, set, h }: TileContext<DeleteState>) => {
  const alert = AlertDialog.Root.withMessage(h)
  const trigger = AlertDialog.Trigger.withMessage(h)
  const backdrop = AlertDialog.Backdrop.withMessage(h)
  const content = AlertDialog.Content.withMessage(h)
  const title = AlertDialog.Title.withMessage(h)
  const description = AlertDialog.Description.withMessage(h)
  const close = AlertDialog.Close.withMessage(h)

  const next = (patch: Partial<DeleteState>): TileMessage =>
    set({ ...state, ...patch })

  return [
    h.div(
      [
        h.Class('ov-project'),
        ...(state.deleted ? [h.Attribute('data-deleted', '')] : []),
      ],
      [
        h.div([h.Class('ov-project-head')], [
          h.span([h.Class('ov-project-icon')], [
            icon(h, 'clock', 'fill'),
          ]),
          h.div([h.Class('ov-project-text')], [
            h.p([h.Class('ov-project-name')], ['legacy-cron']),
            h.p([h.Class('ov-project-meta')], [
              state.deleted
                ? 'Deleted just now'
                : 'Last deploy 41 days ago',
            ]),
          ]),
        ]),
        alert(
          [
            alert.Open(state.open),
            alert.PendingAnnouncement('Deleting legacy-cron'),
            alert.OnOpenchange(detail => next({ open: detail.value })),
          ],
          [
            state.deleted
              ? h.button(
                  [
                    h.Type('button'),
                    h.Class('b-btn ov-wide-btn'),
                    h.OnClick(next({ deleted: false })),
                  ],
                  [
                    icon(h, 'arrow-counter-clockwise', 'bold'),
                    'Restore project',
                  ],
                )
              : trigger([], [
                  h.button(
                    [h.Type('button'), h.Class('b-btn ov-wide-btn')],
                    [icon(h, 'trash', 'bold'), 'Delete project'],
                  ),
                ]),
            backdrop([h.Class('ov-backdrop')], []),
            content([h.Class('ov-dialog ov-alert')], [
              h.span([h.Class('ov-alert-icon')], [
                icon(h, 'warning', 'fill'),
              ]),
              title([h.Class('ov-dialog-title')], ['Delete legacy-cron?']),
              description([h.Class('ov-dialog-desc')], [
                'Its 12 deployments and both domains go with it. This can’t be undone.',
              ]),
              h.div([h.Class('ov-actions')], [
                close([], [
                  h.button([h.Type('button'), h.Class('b-btn')], ['Cancel']),
                ]),
                h.button(
                  [
                    h.Type('button'),
                    h.Class('b-btn ov-destroy'),
                    ...(state.deleting
                      ? [
                          h.Attribute('data-pending', ''),
                          h.Attribute('aria-busy', 'true'),
                        ]
                      : []),
                    h.OnClick(next({ deleting: true })),
                  ],
                  [state.deleting ? 'Deleting…' : 'Delete project'],
                ),
              ]),
            ]),
          ],
        ),
      ],
    ),
    // PORT NOTE: the reference awaits `wait(1100)` inside the close part's
    // action, then focuses Restore on close. The wait is a timer here; focus is
    // left to the alert dialog, which returns it to the trigger.
    state.deleting
      ? afterView(
          h,
          'delete-confirm',
          1100,
          next({ deleted: true, deleting: false, open: false }),
        )
      : '',
  ]
}

/* 4. createConfirm: await an answer from a row action */

const tokenSeed = [
  { name: 'ci-runner', id: 'sk_live_…4f2a' },
  { name: 'grafana-sync', id: 'sk_live_…91cd' },
  { name: 'local-dev', id: 'sk_test_…07be' },
]

type TokensState = {
  tokens: ReadonlyArray<{ name: string; id: string }>
  target: string | null
}

const tokensInitial: TokensState = { tokens: tokenSeed, target: null }

const renderTokens = ({ state, set, h }: TileContext<TokensState>) => {
  const alert = AlertDialog.Root.withMessage(h)
  const backdrop = AlertDialog.Backdrop.withMessage(h)
  const content = AlertDialog.Content.withMessage(h)
  const title = AlertDialog.Title.withMessage(h)
  const description = AlertDialog.Description.withMessage(h)
  const close = AlertDialog.Close.withMessage(h)

  const next = (patch: Partial<TokensState>): TileMessage =>
    set({ ...state, ...patch })

  // PORT NOTE: `createConfirm` hands one alert dialog a payload per row and
  // resolves a promise. Here the row name is state, the dialog opens while a
  // target is set, and the confirm button filters the list.
  return [
    h.div([h.Class('ov-tokens')], [
      h.p([h.Class('ov-tokens-head')], [
        icon(h, 'key', 'fill', 14),
        'API tokens',
      ]),
      state.tokens.length > 0
        ? h.ul(
            [h.Class('ov-tokens-list')],
            state.tokens.map(token =>
              h.li([h.Class('ov-token')], [
                h.span([h.Class('ov-token-text')], [
                  h.span([h.Class('ov-token-name')], [token.name]),
                  h.span([h.Class('ov-token-id')], [token.id]),
                ]),
                h.button(
                  [
                    h.Type('button'),
                    h.Class('b-btn ov-token-revoke'),
                    h.Attribute('aria-label', `Revoke ${token.name}`),
                    h.OnClick(next({ target: token.name })),
                  ],
                  ['Revoke'],
                ),
              ]),
            ),
          )
        : h.div([h.Class('ov-tokens-empty')], [
            h.p([], ['No active tokens']),
            h.button(
              [
                h.Type('button'),
                h.Class('b-btn'),
                h.OnClick(next({ tokens: tokenSeed })),
              ],
              ['Restore tokens'],
            ),
          ]),
      alert(
        [
          alert.Open(state.target !== null),
          alert.OnOpenchange(detail =>
            detail.value ? set({ ...state }) : next({ target: null }),
          ),
        ],
        [
          backdrop([h.Class('ov-backdrop')], []),
          content([h.Class('ov-dialog ov-alert')], [
            h.span([h.Class('ov-alert-icon')], [
              icon(h, 'key', 'fill', 14),
            ]),
            title([h.Class('ov-dialog-title')], [
              `Revoke ${state.target ?? ''}?`,
            ]),
            description([h.Class('ov-dialog-desc')], [
              'Anything still using this token starts getting 401s right away.',
            ]),
            h.div([h.Class('ov-actions')], [
              close([], [
                h.button([h.Type('button'), h.Class('b-btn')], [
                  'Keep it',
                ]),
              ]),
              h.button(
                [
                  h.Type('button'),
                  h.Class('b-btn ov-destroy'),
                  h.OnClick(
                    next({
                      tokens: state.tokens.filter(
                        token => token.name !== state.target,
                      ),
                      target: null,
                    }),
                  ),
                ],
                ['Revoke token'],
              ),
            ]),
          ]),
        ],
      ),
    ]),
  ]
}

/* 5. createDialogController: open from code and await a value */

const regionList = [
  { id: 'iad1', city: 'Washington, D.C.', ms: '18 ms' },
  { id: 'sfo1', city: 'San Francisco', ms: '64 ms' },
  { id: 'fra1', city: 'Frankfurt', ms: '97 ms' },
  { id: 'hnd1', city: 'Tokyo', ms: '152 ms' },
]

type RegionState = { region: string; moving: string | null; open: boolean }

const regionInitial: RegionState = {
  region: 'fra1',
  moving: null,
  open: false,
}

const renderRegion = ({ state, set, h }: TileContext<RegionState>) => {
  const dialog = Dialog.Root.withMessage(h)
  const backdrop = Dialog.Backdrop.withMessage(h)
  const content = Dialog.Content.withMessage(h)
  const title = Dialog.Title.withMessage(h)
  const description = Dialog.Description.withMessage(h)

  const next = (patch: Partial<RegionState>): TileMessage =>
    set({ ...state, ...patch })

  const current =
    regionList.find(region => region.id === state.region) ?? regionList[2]!

  // PORT NOTE: `createDialogController` opens the dialog from code and awaits
  // the chosen region. Here the button opens a controlled dialog and a region
  // button closes it and starts the 1400ms migration; the migration is a timer.
  return [
    h.div([h.Class('ov-region')], [
      h.p([h.Class('ov-region-lead')], [
        icon(h, 'database', 'fill'),
        'pg-main',
      ]),
      h.p([h.Class('ov-region-city')], [
        state.moving === null ? current.city : 'Migrating…',
      ]),
      h.p([h.Class('ov-region-meta')], [
        state.moving === null
          ? `${current.id} · primary · 2.4 GB`
          : `Copying to ${state.moving}, writes paused`,
      ]),
      h.button(
        [
          h.Type('button'),
          h.Class('b-btn ov-trigger'),
          h.Attribute('aria-haspopup', 'dialog'),
          ...(state.open ? [h.Attribute('data-open', '')] : []),
          h.Disabled(state.moving !== null),
          h.OnClick(next({ open: true })),
        ],
        ['Move region…'],
      ),
      dialog(
        [
          dialog.Open(state.open),
          dialog.OnOpenchange(detail => next({ open: detail.value })),
        ],
        [
          backdrop([h.Class('ov-backdrop')], []),
          content([h.Class('ov-dialog ov-region-dialog')], [
            title([h.Class('ov-dialog-title')], ['Move pg-main']),
            description([h.Class('ov-dialog-desc')], [
              'Pick the region nearest your traffic.',
            ]),
            h.div([h.Class('ov-region-list')], [
              ...regionList.map(region =>
                h.button(
                  [
                    h.Type('button'),
                    h.Class('ov-region-option'),
                    ...(region.id === state.region
                      ? [
                          h.Attribute('data-current', ''),
                          h.Attribute('aria-current', 'true'),
                        ]
                      : []),
                    h.OnClick(
                      next({ open: false, moving: region.id }),
                    ),
                  ],
                  [
                    h.span([h.Class('ov-region-id')], [region.id]),
                    h.span([h.Class('ov-region-name')], [region.city]),
                    h.span([h.Class('ov-region-ms')], [region.ms]),
                    icon(h, 'check', 'bold', 16, 'ov-region-check'),
                  ],
                ),
              ),
            ]),
          ]),
        ],
      ),
    ]),
    state.moving === null
      ? ''
      : afterView(
          h,
          'region-move',
          1400,
          next({ region: state.moving, moving: null, open: false }),
        ),
  ]
}

/* 6. Drawer with snap points and a handle */

const buildSnapPoints: ReadonlyArray<number> = [0.5, 1]

const logLines: ReadonlyArray<readonly [string, string]> = [
  ['00:01', 'Cloning acme/payments-gateway'],
  ['00:03', 'Restored build cache from build 4820'],
  ['00:05', 'Installing 412 packages with pnpm'],
  ['00:19', 'Running tsc --build'],
  ['00:31', 'src/ledger/settle.ts:88 error TS2322'],
  ['00:31', "  Type 'Cents' is not assignable to type 'number'."],
  ['00:32', 'Found 1 error in src/ledger/settle.ts'],
  ['00:32', 'Command failed with exit code 2'],
  ['00:48', 'Build failed. Previous deploy keeps serving.'],
]

type BuildState = {
  status: 'failed' | 'queued' | 'ready'
  open: boolean
  retrying: boolean
}

const buildInitial: BuildState = {
  status: 'failed',
  open: false,
  retrying: false,
}

const renderBuildLog = ({ state, set, h }: TileContext<BuildState>) => {
  const drawer = Drawer.Root.withMessage(h)
  const trigger = Drawer.Trigger.withMessage(h)
  const backdrop = Drawer.Backdrop.withMessage(h)
  const content = Drawer.Content.withMessage(h)
  const handle = Drawer.Handle.withMessage(h)
  const title = Drawer.Title.withMessage(h)
  const description = Drawer.Description.withMessage(h)

  const next = (patch: Partial<BuildState>): TileMessage =>
    set({ ...state, ...patch })

  const label = {
    failed: 'Build failed',
    queued: 'Rebuilding',
    ready: 'Live',
  }[state.status]

  return [
    h.div([h.Class('ov-build')], [
      h.p(
        [
          h.Class('ov-build-status'),
          h.DataAttribute('status', state.status),
        ],
        [h.span([h.Class('ov-dot'), h.Attribute('aria-hidden', 'true')], []), label],
      ),
      h.p([h.Class('ov-build-name')], ['payments-gateway']),
      h.p([h.Class('ov-build-meta')], ['Build 4821 · 48s']),
      drawer(
        [
          drawer.SnapPoints(buildSnapPoints),
          drawer.DefaultSnapPoint(0.5),
          drawer.Open(state.open),
          drawer.OnOpenchange(detail => next({ open: detail.value })),
        ],
        [
          trigger([], [
            h.button(
              [h.Type('button'), h.Class('b-btn ov-trigger')],
              [icon(h, 'terminal-window', 'bold'), 'View log'],
            ),
          ]),
          backdrop([h.Class('ov-drawer-backdrop')], []),
          content([h.Class('ov-drawer')], [
            handle([], [
              h.button(
                [h.Type('button'), h.Class('ov-handle'), h.Attribute('aria-label', 'Resize log')],
                [],
              ),
            ]),
            h.header([h.Class('ov-drawer-head')], [
              h.div([], [
                title([h.Class('ov-dialog-title')], ['Build 4821']),
                description([h.Class('ov-dialog-desc')], [
                  'payments-gateway failed after 48s.',
                ]),
              ]),
              // PORT NOTE: the reference closes through a DrawerClose whose
              // `action` awaits `wait(1000)`. The button keeps the drawer open
              // through state ("Queuing…") and two timers queue then finish.
              h.button(
                [
                  h.Type('button'),
                  h.Class('b-btn'),
                  h.Attribute('data-variant', 'primary'),
                  ...(state.retrying
                    ? [
                        h.Attribute('data-pending', ''),
                        h.Attribute('aria-busy', 'true'),
                      ]
                    : []),
                  h.Disabled(state.status !== 'failed'),
                  h.OnClick(next({ retrying: true })),
                ],
                [state.retrying ? 'Queuing…' : 'Retry build'],
              ),
            ]),
            h.ol(
              [h.Class('ov-log')],
              logLines.map(([time, text]) =>
                h.li(
                  [
                    ...(/error|failed|assignable/i.test(text)
                      ? [h.Attribute('data-error', '')]
                      : []),
                  ],
                  [
                    h.span([h.Class('ov-log-time')], [time]),
                    h.span([], [text]),
                  ],
                ),
              ),
            ),
          ]),
        ],
      ),
    ]),
    state.retrying
      ? afterView(
          h,
          'build-retry',
          1000,
          next({ status: 'queued', open: false, retrying: false }),
        )
      : '',
    state.status === 'queued'
      ? afterView(
          h,
          'build-ready',
          2200,
          next({ status: 'ready', open: false }),
        )
      : '',
  ]
}

/* 7. Popover with an arrow and a small form */

const releaseSlots = [
  { id: 'tonight', day: 'Tonight', time: '22:00' },
  { id: 'tomorrow', day: 'Tomorrow', time: '07:30' },
  { id: 'monday', day: 'Monday', time: '10:00' },
]

type ScheduleState = { pick: string; scheduled: string | null }

const scheduleInitial: ScheduleState = { pick: 'tomorrow', scheduled: null }

const renderSchedule = ({ state, set, h }: TileContext<ScheduleState>) => {
  const popover = Popover.Root.withMessage(h)
  const trigger = Popover.Trigger.withMessage(h)
  const content = Popover.Content.withMessage(h)
  const title = Popover.Title.withMessage(h)
  const description = Popover.Description.withMessage(h)
  const arrow = Popover.Arrow.withMessage(h)
  const close = Popover.Close.withMessage(h)

  const next = (patch: Partial<ScheduleState>): TileMessage =>
    set({ ...state, ...patch })

  const chosen = releaseSlots.find(slot => slot.id === state.scheduled)

  return h.div([h.Class('ov-release')], [
    h.p([h.Class('ov-release-tag')], [
      icon(h, 'git-pull-request', 'fill'),
      'Release',
    ]),
    h.p([h.Class('ov-release-version')], ['v2.14.0']),
    h.p([h.Class('ov-release-meta')], [
      chosen === undefined
        ? '12 commits since v2.13.2'
        : `Ships ${chosen.day.toLowerCase()} at ${chosen.time}`,
    ]),
    popover([], [
      trigger([], [
        h.button(
          [h.Type('button'), h.Class('b-btn ov-trigger')],
          [
            icon(h, 'calendar-blank', 'bold'),
            chosen === undefined ? 'Schedule' : 'Reschedule',
          ],
        ),
      ]),
      content(
        [
          h.Class('b-pop ov-pop'),
          content.Side('bottom'),
          content.SideOffset(10),
          content.CollisionPadding(12),
        ],
        [
          arrow([h.Class('ov-arrow')], []),
          title([h.Class('ov-pop-title')], ['Ship v2.14.0']),
          description([h.Class('ov-pop-desc')], [
            'Rolls out to all regions.',
          ]),
          h.div(
            [
              h.Class('ov-slots'),
              h.Attribute('role', 'radiogroup'),
              h.Attribute('aria-label', 'Release time'),
            ],
            releaseSlots.map(slot =>
              h.button(
                [
                  h.Type('button'),
                  h.Attribute('role', 'radio'),
                  h.Attribute(
                    'aria-checked',
                    state.pick === slot.id ? 'true' : 'false',
                  ),
                  h.Class('ov-slot'),
                  h.OnClick(next({ pick: slot.id })),
                ],
                [
                  h.span([], [slot.day]),
                  h.span([h.Class('ov-slot-time')], [slot.time]),
                ],
              ),
            ),
          ),
          close([], [
            h.button(
              [
                h.Type('button'),
                h.Class('b-btn ov-pop-submit'),
                h.Attribute('data-variant', 'primary'),
                h.OnClick(next({ scheduled: state.pick })),
              ],
              ['Schedule release'],
            ),
          ]),
        ],
      ),
    ]),
  ])
}

/* 8. Tooltips with shortcut hints, bound with useShortcut */

const diffFiles = [
  { path: 'src/api/handlers.ts', add: 24, del: 9 },
  { path: 'src/lib/ratelimit.ts', add: 61, del: 0 },
  { path: 'test/ratelimit.test.ts', add: 38, del: 2 },
  { path: 'package.json', add: 1, del: 1 },
]

type ReviewState = { index: number; viewed: ReadonlyArray<number> }

const reviewInitial: ReviewState = { index: 0, viewed: [] }

const renderReview = ({ state, set, h }: TileContext<ReviewState>) => {
  const tooltip = Tooltip.Root.withMessage(h)
  const trigger = Tooltip.Trigger.withMessage(h)
  const content = Tooltip.Content.withMessage(h)
  const arrow = Tooltip.Arrow.withMessage(h)
  const shortcut = Tooltip.Shortcut.withMessage(h)

  const next = (patch: Partial<ReviewState>): TileMessage =>
    set({ ...state, ...patch })

  const file = diffFiles[state.index] ?? diffFiles[0]!
  const viewed = state.viewed.includes(state.index)

  // PORT NOTE: `useShortcut("k", prev, { when })` is React-only. The same keys
  // click the same buttons while focus is inside the tile, so the binding's own
  // press handler still owns the state change.
  const keyMount = live('ReviewKeys', (element, _emit) => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (!element.contains(document.activeElement)) return
      const action =
        event.key.toLowerCase() === 'k'
          ? 'previous'
          : event.key.toLowerCase() === 'j'
            ? 'next'
            : event.key.toLowerCase() === 'v'
              ? 'viewed'
              : undefined
      if (action === undefined) return
      event.preventDefault()
      const button = element.querySelector<HTMLElement>(
        `[data-review="${action}"]`,
      )
      button?.click()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  const tool = (
    label: string,
    combo: string,
    action: string,
    pressed: boolean | undefined,
    glyph: string,
    onClick: TileMessage,
  ) =>
    tooltip([tooltip.Delay(300), tooltip.Shortcut(combo)], [
      trigger([], [
        h.button(
          [
            h.Type('button'),
            h.Class('ov-tool'),
            h.Attribute('aria-label', label),
            h.Attribute('data-review', action),
            ...(pressed === undefined
              ? []
              : [h.Attribute('aria-pressed', pressed ? 'true' : 'false')]),
            h.OnClick(onClick),
          ],
          [icon(h, glyph, 'bold')],
        ),
      ]),
      content([h.Class('ov-tip'), content.SideOffset(8)], [
        arrow([h.Class('ov-tip-arrow')], []),
        label,
        shortcut([h.Class('ov-tip-key')], []),
      ]),
    ])

  return h.div([h.Class('ov-diff'), h.OnMount(keyMount)], [
    h.div(
      [
        h.Class('ov-diff-bar'),
        h.Attribute('role', 'toolbar'),
        h.Attribute('aria-label', 'Review'),
      ],
      [
        tool(
          'Previous file',
          'k',
          'previous',
          undefined,
          'caret-up',
          next({ index: Math.max(0, state.index - 1) }),
        ),
        tool(
          'Next file',
          'j',
          'next',
          undefined,
          'caret-down',
          next({
            index: Math.min(diffFiles.length - 1, state.index + 1),
          }),
        ),
        h.span([h.Class('ov-diff-sep'), h.Attribute('aria-hidden', 'true')], []),
        tool(
          'Mark viewed',
          'v',
          'viewed',
          viewed,
          'eye',
          next({
            viewed: viewed
              ? state.viewed.filter(index => index !== state.index)
              : [...state.viewed, state.index],
          }),
        ),
        h.span([h.Class('ov-diff-count')], [
          `${state.index + 1} / ${diffFiles.length}`,
        ]),
      ],
    ),
    h.p([h.Class('ov-diff-path'), h.Attribute('aria-live', 'polite')], [
      file.path,
    ]),
    h.p([h.Class('ov-diff-stats')], [
      h.span([h.Class('ov-diff-add')], [`+${file.add}`]),
      h.span([h.Class('ov-diff-del')], [`−${file.del}`]),
      h.span([h.Class('ov-diff-viewed')], [
        `${state.viewed.length} of 4 viewed`,
      ]),
    ]),
    h.div([h.Class('ov-diff-progress'), h.Attribute('aria-hidden', 'true')], [
      ...diffFiles.map((_entry, index) =>
        h.span(
          [
            ...(state.viewed.includes(index)
              ? [h.Attribute('data-viewed', '')]
              : []),
            ...(index === state.index
              ? [h.Attribute('data-current', '')]
              : []),
          ],
          [],
        ),
      ),
    ]),
  ])
}

/* 9. useShortcut with platform-aware hints */

const quickKeys = [
  { keys: 'mod+alt+n', label: 'New branch', result: 'Created feat/usage-caps' },
  {
    keys: 'mod+alt+p',
    label: 'Deploy preview',
    result: 'Preview queued for pr-318',
  },
  {
    keys: 'alt+shift+i',
    label: 'Invite teammate',
    result: 'Invite link ready to paste',
  },
]

type QuickState = { last: number | null; flash: number }

const quickInitial: QuickState = { last: null, flash: 0 }

const comboMatches = (event: KeyboardEvent, combo: string) => {
  const parts = combo.split('+')
  const key = parts[parts.length - 1] ?? ''
  const mod = isApple ? event.metaKey : event.ctrlKey
  if (event.key.toLowerCase() !== key) return false
  if (parts.includes('mod') !== mod) return false
  if (parts.includes('alt') !== event.altKey) return false
  if (parts.includes('shift') !== event.shiftKey) return false
  if (!parts.includes('mod') && (isApple ? event.metaKey : event.ctrlKey)) {
    return false
  }
  return true
}

const renderQuickKeys = ({ state, set, h }: TileContext<QuickState>) => {
  const next = (patch: Partial<QuickState>): TileMessage =>
    set({ ...state, ...patch })

  // PORT NOTE: `useShortcut` + `useShortcutHint` are React-only. The combos are
  // matched here and press the matching button, so the button's own OnClick
  // still sets the state; the hint text is formatted for the platform above.
  const keyMount = live('QuickKeys', (element, _emit) => {
    const onKeyDown = (event: KeyboardEvent) => {
      const index = quickKeys.findIndex(entry =>
        comboMatches(event, entry.keys),
      )
      if (index < 0) return
      event.preventDefault()
      element
        .querySelector<HTMLElement>(`[data-quick="${index}"]`)
        ?.click()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  })

  return [
    h.div([h.Class('ov-quickkeys'), h.OnMount(keyMount)], [
      ...quickKeys.map((entry, index) =>
        h.button(
          [
            h.Type('button'),
            h.Class('ov-quick'),
            h.Attribute('data-quick', String(index)),
            h.Attribute('aria-keyshortcuts', entry.keys),
            ...(state.flash > 0 && state.last === index
              ? [h.Attribute('data-hit', '')]
              : []),
            h.OnClick(
              next({ last: index, flash: state.flash + 1 }),
            ),
          ],
          [h.span([], [entry.label]), keys(h, hintText(entry.keys))],
        ),
      ),
      h.output([h.Class('ov-quick-out')], [
        state.last === null
          ? 'Works from anywhere on the page'
          : (quickKeys[state.last]?.result ?? ''),
      ]),
    ]),
    state.flash === 0
      ? ''
      : afterView(h, 'quick-flash', 650, next({ flash: 0 })),
  ]
}

/* 10. HoverCard on a mention */

const renderMention = ({ h }: TileContext<Record<string, never>>) => {
  const card = HoverCard.Root.withMessage(h)
  const trigger = HoverCard.Trigger.withMessage(h)
  const content = HoverCard.Content.withMessage(h)
  const arrow = HoverCard.Arrow.withMessage(h)

  return h.article([h.Class('ov-comment')], [
    h.header([h.Class('ov-comment-head')], [
      avatar(h, 'RS'),
      h.span([h.Class('ov-comment-who')], ['Ravi Shah']),
      h.span([h.Class('ov-comment-when')], ['4m']),
    ]),
    h.div([h.Class('ov-comment-body')], [
      'Retry budgets are per tenant now. ',
      card([card.Delay(250)], [
        trigger([], [
          h.a(
            [
              h.Href('#overlays-mention'),
              h.Class('ov-mention'),
              // PORT NOTE: the reference preventDefaults the mention's click so
              // the hash never changes. A Foldkit handler cannot cancel, so the
              // anchor points at this tile instead of a stranger's profile.
            ],
            ['@lena'],
          ),
        ]),
        content(
          [
            h.Class('b-pop ov-card'),
            content.SideOffset(10),
            content.CollisionPadding(12),
          ],
          [
            arrow([h.Class('ov-arrow')], []),
            h.div([h.Class('ov-card-head')], [
              avatar(h, 'LF', 'lg'),
              h.div([], [
                h.div([h.Class('ov-card-name')], ['Lena Fischer']),
                h.div([h.Class('ov-card-role')], ['Platform · Berlin']),
              ]),
            ]),
            h.div([h.Class('ov-card-row')], [
              icon(h, 'clock', 'fill', 14),
              '16:42 local time',
            ]),
            h.div([h.Class('ov-card-row ov-card-oncall')], [
              h.span([h.Class('ov-dot'), h.Attribute('aria-hidden', 'true')], []),
              'On call until Friday',
            ]),
          ],
        ),
      ]),
      ' can you sanity-check the alert thresholds?',
    ]),
  ])
}

/* 11. Row menus with submenus, each trigger wearing a tooltip */

const deployRows = [
  {
    sha: 'd8f3a1c',
    message: 'Cap webhook backoff at 30s',
    branch: 'main',
    status: 'Ready',
    age: '2m',
    prod: true,
  },
  {
    sha: '41be09f',
    message: 'Spend limits on the billing page',
    branch: 'feat/spend-limits',
    status: 'Building',
    age: '6m',
    prod: false,
  },
  {
    sha: '9c27e4d',
    message: 'Move sessions to Redis 7',
    branch: 'infra/redis-7',
    status: 'Error',
    age: '1h',
    prod: false,
  },
]

const deployActions: Record<string, (sha: string) => string> = {
  visit: sha => `Opened preview for ${sha}`,
  redeploy: sha => `Redeploying ${sha}`,
  promote: sha => `Promoted ${sha} to production`,
  'copy-url': sha => `Copied ${sha}.preview.relay.app`,
  'copy-sha': sha => `Copied ${sha}`,
  'copy-branch': () => 'Copied branch name',
  logs: sha => `Opened logs for ${sha}`,
}

type DeploysState = { note: string }

const deploysInitial: DeploysState = { note: '' }

const renderDeploys = ({ state, set, h }: TileContext<DeploysState>) => {
  const menu = Menu.Root.withMessage(h)
  const trigger = Menu.Trigger.withMessage(h)
  const content = Menu.Content.withMessage(h)
  const item = Menu.Item.withMessage(h)
  const itemIcon = Menu.ItemIcon.withMessage(h)
  const separator = Menu.Separator.withMessage(h)
  const sub = Menu.Sub.withMessage(h)
  const subTrigger = Menu.SubTrigger.withMessage(h)
  const subContent = Menu.SubContent.withMessage(h)
  const tooltip = Tooltip.Root.withMessage(h)
  const tooltipTrigger = Tooltip.Trigger.withMessage(h)
  const tooltipContent = Tooltip.Content.withMessage(h)

  const next = (patch: Partial<DeploysState>): TileMessage =>
    set({ ...state, ...patch })

  const action = (value: string, sha: string) =>
    next({ note: deployActions[value]?.(sha) ?? '' })

  return h.div([h.Class('ov-deploys')], [
    h.div([h.Class('ov-deploys-head')], [
      h.p([h.Class('ov-deploys-title')], ['Deployments']),
      h.output([h.Class('ov-deploys-note')], [state.note]),
    ]),
    h.ul(
      [h.Class('ov-deploys-list')],
      deployRows.map(row =>
        h.li([h.Class('ov-deploy')], [
          h.span(
            [
              h.Class('ov-deploy-status'),
              h.DataAttribute('status', row.status.toLowerCase()),
            ],
            [
              h.span([h.Class('ov-dot'), h.Attribute('aria-hidden', 'true')], []),
              row.status,
            ],
          ),
          h.span([h.Class('ov-deploy-msg')], [
            h.span([h.Class('ov-deploy-text')], [row.message]),
            h.span([h.Class('ov-deploy-sha')], [row.sha]),
          ]),
          h.span([h.Class('ov-deploy-branch')], [
            icon(h, 'git-branch', 'bold', 14),
            row.branch,
          ]),
          h.span([h.Class('ov-deploy-age')], [row.age]),
          menu([menu.OnAction(detail => action(String(detail.value), row.sha))], [
            trigger([], [
              tooltip([tooltip.Delay(400)], [
                tooltipTrigger([], [
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('ov-dots'),
                      h.Attribute('aria-label', `Actions for ${row.sha}`),
                    ],
                    [icon(h, 'dots-three', 'bold')],
                  ),
                ]),
                tooltipContent(
                  [
                    h.Class('ov-tip'),
                    tooltipContent.Side('top'),
                    tooltipContent.SideOffset(6),
                  ],
                  ['More actions'],
                ),
              ]),
            ]),
            content(
              [
                h.Class('b-pop ov-menu'),
                content.Align('end'),
                content.SideOffset(6),
                content.CollisionPadding(12),
              ],
              [
                item(
                  [item.Value('visit'), h.Class('b-item ov-menu-item')],
                  [
                    itemIcon([h.Class('ov-menu-icon')], [
                      icon(h, 'arrow-square-out', 'bold', 14),
                    ]),
                    'Visit preview',
                  ],
                ),
                item(
                  [item.Value('redeploy'), h.Class('b-item ov-menu-item')],
                  [
                    itemIcon([h.Class('ov-menu-icon')], [
                      icon(h, 'arrows-clockwise', 'bold', 14),
                    ]),
                    'Redeploy',
                  ],
                ),
                item(
                  [
                    item.Value('promote'),
                    h.Class('b-item ov-menu-item'),
                    ...(row.prod ? [item.Disabled(true)] : []),
                  ],
                  [
                    itemIcon([h.Class('ov-menu-icon')], [
                      icon(h, 'rocket-launch', 'bold', 14),
                    ]),
                    'Promote to production',
                  ],
                ),
                sub([], [
                  subTrigger([h.Class('b-item ov-menu-item')], [
                    itemIcon([h.Class('ov-menu-icon')], [
                      icon(h, 'copy', 'bold', 14),
                    ]),
                    'Copy',
                    icon(h, 'caret-right', 'bold', 14, 'ov-menu-caret'),
                  ]),
                  subContent(
                    [
                      h.Class('b-pop ov-menu'),
                      subContent.CollisionPadding(12),
                    ],
                    [
                      item(
                        [item.Value('copy-url'), h.Class('b-item ov-menu-item')],
                        ['Preview URL'],
                      ),
                      item(
                        [item.Value('copy-sha'), h.Class('b-item ov-menu-item')],
                        ['Commit SHA'],
                      ),
                      item(
                        [
                          item.Value('copy-branch'),
                          h.Class('b-item ov-menu-item'),
                        ],
                        ['Branch name'],
                      ),
                    ],
                  ),
                ]),
                separator([h.Class('ov-menu-sep')], []),
                item(
                  [item.Value('logs'), h.Class('b-item ov-menu-item')],
                  [
                    itemIcon([h.Class('ov-menu-icon')], [
                      icon(h, 'terminal-window', 'bold', 14),
                    ]),
                    'Runtime logs',
                  ],
                ),
              ],
            ),
          ]),
        ]),
      ),
    ),
  ])
}

/* 12. Context menu on file rows */

const treeSeed = ['Dockerfile', 'deploy.yml', 'schema.prisma', 'README.md']

type TreeState = {
  files: ReadonlyArray<string>
  note: string
  target: string | null
}

const treeInitial: TreeState = {
  files: treeSeed,
  note: 'Right-click a file',
  target: null,
}

const renderFileTree = ({ state, set, h }: TileContext<TreeState>) => {
  const menu = Menu.Root.withMessage(h)
  const contextTrigger = Menu.ContextTrigger.withMessage(h)
  const content = Menu.Content.withMessage(h)
  const group = Menu.Group.withMessage(h)
  const groupLabel = Menu.GroupLabel.withMessage(h)
  const item = Menu.Item.withMessage(h)
  const itemIcon = Menu.ItemIcon.withMessage(h)
  const separator = Menu.Separator.withMessage(h)

  const next = (patch: Partial<TreeState>): TileMessage =>
    set({ ...state, ...patch })

  const act = (value: string, file: string): TileMessage => {
    if (value === 'copy') {
      return next({ note: `Copied infra/${file}` })
    }
    if (value === 'open') {
      return next({ note: `Opened ${file}` })
    }
    if (value === 'duplicate') {
      const dot = file.lastIndexOf('.')
      const copy =
        dot > 0
          ? `${file.slice(0, dot)}-copy${file.slice(dot)}`
          : `${file}-copy`
      return next({
        files: state.files.includes(copy)
          ? state.files
          : state.files.flatMap(entry =>
              entry === file ? [entry, copy] : [entry],
            ),
        note: `Duplicated ${file}`,
      })
    }
    if (value === 'trash') {
      return next({
        files: state.files.filter(entry => entry !== file),
        note: `Moved ${file} to trash`,
      })
    }
    return next({})
  }

  return h.div([h.Class('ov-tree')], [
    h.p([h.Class('ov-tree-head')], [
      icon(h, 'folder', 'fill', 14),
      'infra',
      h.span([h.Class('ov-tree-hint')], [
        'or focus and ',
        h.kbd([h.Class('ov-kbd')], ['⇧F10']),
      ]),
    ]),
    menu(
      [
        // PORT NOTE: the reference reads `state.payload` inside the content
        // render callback. The web component reports the same payload with
        // `payloadchange`, so the row's name is mirrored into the tile state.
        menu.OnPayloadchange(detail =>
          next({ target: String(detail.value ?? '') }),
        ),
        menu.OnAction(detail =>
          act(String(detail.value), state.target ?? ''),
        ),
      ],
      [
        h.ul(
          [h.Class('ov-tree-list')],
          [
            ...state.files.map(file =>
              h.li([], [
                contextTrigger(
                  [
                    contextTrigger.Payload(file),
                    h.Attribute('tabindex', '0'),
                    h.Class('ov-tree-row'),
                  ],
                  [icon(h, 'file-code', 'fill', 14), file],
                ),
              ]),
            ),
            state.files.length === 0
              ? h.li([], [
                  h.button(
                    [
                      h.Type('button'),
                      h.Class('b-btn ov-tree-reset'),
                      h.OnClick(next({ files: treeSeed })),
                    ],
                    ['Restore files'],
                  ),
                ])
              : '',
          ],
        ),
        content([h.Class('b-pop ov-menu')], [
          group([], [
            groupLabel([h.Class('ov-menu-label')], [
              state.target ?? '',
            ]),
            item(
              [h.Class('b-item ov-menu-item'), item.Value('open')],
              [
                itemIcon([h.Class('ov-menu-icon')], [
                  icon(h, 'file', 'bold', 14),
                ]),
                'Open',
              ],
            ),
            item(
              [h.Class('b-item ov-menu-item'), item.Value('copy')],
              [
                itemIcon([h.Class('ov-menu-icon')], [
                  icon(h, 'copy', 'bold', 14),
                ]),
                'Copy path',
              ],
            ),
            item(
              [h.Class('b-item ov-menu-item'), item.Value('duplicate')],
              [
                itemIcon([h.Class('ov-menu-icon')], [
                  icon(h, 'file-code', 'bold', 14),
                ]),
                'Duplicate',
              ],
            ),
            separator([h.Class('ov-menu-sep')], []),
            item(
              [h.Class('b-item ov-menu-item'), item.Value('trash')],
              [
                itemIcon([h.Class('ov-menu-icon')], [
                  icon(h, 'trash', 'bold', 14),
                ]),
                'Move to trash',
              ],
            ),
          ]),
        ]),
      ],
    ),
    h.output([h.Class('ov-tree-note')], [state.note]),
  ])
}

/* 13. Menu item that opens a dialog through its controller */

type BranchState = {
  branch: string
  draft: string
  note: string
  open: boolean
}

const branchInitial: BranchState = {
  branch: 'feat/usage-alerts',
  draft: 'feat/usage-alerts',
  note: '3 commits ahead of develop',
  open: false,
}

const renderBranchRename = ({ state, set, h }: TileContext<BranchState>) => {
  const menu = Menu.Root.withMessage(h)
  const trigger = Menu.Trigger.withMessage(h)
  const content = Menu.Content.withMessage(h)
  const item = Menu.Item.withMessage(h)
  const itemIcon = Menu.ItemIcon.withMessage(h)
  const dialog = Dialog.Root.withMessage(h)
  const backdrop = Dialog.Backdrop.withMessage(h)
  const dialogContent = Dialog.Content.withMessage(h)
  const title = Dialog.Title.withMessage(h)
  const description = Dialog.Description.withMessage(h)
  const close = Dialog.Close.withMessage(h)

  const next = (patch: Partial<BranchState>): TileMessage =>
    set({ ...state, ...patch })

  // PORT NOTE: the reference awaits `rename.open()` from the menu item and
  // reads the draft through a ref. The item opens a controlled dialog and the
  // Rename button applies the trimmed name, the same observable behavior.
  const save = (): TileMessage => {
    const clean = state.draft.trim().replace(/\s+/g, '-')
    if (clean !== '' && clean !== state.branch) {
      return next({ branch: clean, draft: clean, open: false, note: 'Renamed on origin' })
    }
    return next({ open: false })
  }

  return h.div([h.Class('ov-branch')], [
    h.div([h.Class('ov-branch-card')], [
      h.span([h.Class('ov-branch-icon')], [icon(h, 'git-branch', 'bold')]),
      h.span([h.Class('ov-branch-text')], [
        h.span([h.Class('ov-branch-name')], [state.branch]),
        h.span([h.Class('ov-branch-meta')], [state.note]),
      ]),
      h.span([h.Class('ov-branch-pr')], [
        icon(h, 'git-pull-request', 'bold'),
        'Draft pull request · 2 reviewers',
      ]),
      menu(
        [
          // The menu root is a grid item here, where the reference's button was
          // one directly; place it in the card's third column, like the CSS does
          // for `.ov-dots`.
          h.Style({ gridColumn: '3', gridRow: '1', alignSelf: 'start' }),
          menu.OnAction(detail => {
            const value = String(detail.value)
            if (value === 'copy') return next({ note: 'Name copied' })
            if (value === 'compare') {
              return next({ note: '+148 −31 against develop' })
            }
            return next({})
          }),
        ],
        [
          trigger([], [
            h.button(
              [
                h.Type('button'),
                h.Class('ov-dots'),
                h.Attribute('aria-label', 'Branch actions'),
              ],
              [icon(h, 'dots-three', 'bold')],
            ),
          ]),
          content(
            [
              h.Class('b-pop ov-menu'),
              content.Align('end'),
              content.SideOffset(6),
            ],
            [
              item(
                [
                  h.Class('b-item ov-menu-item'),
                  item.OnSelect(() => next({ open: true, draft: state.branch })),
                ],
                [
                  itemIcon([h.Class('ov-menu-icon')], [
                    icon(h, 'pencil-simple', 'bold'),
                  ]),
                  'Rename…',
                ],
              ),
              item(
                [h.Class('b-item ov-menu-item'), item.Value('copy')],
                [
                  itemIcon([h.Class('ov-menu-icon')], [
                    icon(h, 'copy', 'bold'),
                  ]),
                  'Copy name',
                ],
              ),
              item(
                [h.Class('b-item ov-menu-item'), item.Value('compare')],
                [
                  itemIcon([h.Class('ov-menu-icon')], [
                    icon(h, 'git-pull-request', 'bold'),
                  ]),
                  'Compare with develop',
                ],
              ),
            ],
          ),
        ],
      ),
    ]),
    dialog(
      [
        dialog.Open(state.open),
        dialog.OnOpenchange(detail => next({ open: detail.value })),
      ],
      [
        backdrop([h.Class('ov-backdrop')], []),
        dialogContent([h.Class('ov-dialog')], [
          title([h.Class('ov-dialog-title')], ['Rename branch']),
          description([h.Class('ov-dialog-desc')], [
            'Open pull requests follow the new name.',
          ]),
          h.label([h.Class('ov-field')], [
            h.span([h.Class('b-label')], ['Branch name']),
            h.input([
              h.Class('b-input ov-mono-input'),
              h.Value(state.draft),
              h.Attribute('spellcheck', 'false'),
              h.OnInput(value => next({ draft: value })),
            ]),
          ]),
          h.div([h.Class('ov-actions')], [
            close([], [
              h.button([h.Type('button'), h.Class('b-btn')], [
                'Keep current',
              ]),
            ]),
            h.button(
              [
                h.Type('button'),
                h.Class('b-btn'),
                h.Attribute('data-variant', 'primary'),
                h.OnClick(save()),
              ],
              ['Rename'],
            ),
          ]),
        ]),
      ],
    ),
  ])
}

/* 14. Menubar with submenus, checkbox and radio items */

const codeLines = [
  'export async function GET(req: Request, { params }: Ctx) {',
  '  const project = await db.project.findUnique({ where: { slug: params.slug } })',
  '  if (!project) return notFound()',
  '  return Response.json(project, { headers: cache("5m") })',
]

const menubarResults: Record<string, string> = {
  'new-file': 'New file',
  save: 'Saved route.ts',
  'recent-routes': 'Opened api/projects.ts',
  'recent-app': 'Opened web/layout.tsx',
  'recent-tf': 'Opened infra/main.tf',
  undo: 'Undid change',
  redo: 'Redid change',
  find: 'Searching project',
  staging: 'Shipping to staging',
  release: 'Releasing to everyone',
  revert: 'Reverted to 1.8.3',
}

type EditorState = {
  minimap: boolean
  wrap: boolean
  numbers: boolean
  density: string
  last: string
}

const editorInitial: EditorState = {
  minimap: true,
  wrap: false,
  numbers: true,
  density: 'comfortable',
  last: 'route.ts',
}

const renderEditor = ({ state, set, h }: TileContext<EditorState>) => {
  const menubar = Menubar.Root.withMessage(h)
  const menu = Menu.Root.withMessage(h)
  const trigger = Menu.Trigger.withMessage(h)
  const content = Menu.Content.withMessage(h)
  const item = Menu.Item.withMessage(h)
  const checkbox = Menu.CheckboxItem.withMessage(h)
  const indicator = Menu.ItemIndicator.withMessage(h)
  const radioGroup = Menu.RadioGroup.withMessage(h)
  const radioItem = Menu.RadioItem.withMessage(h)
  const groupLabel = Menu.GroupLabel.withMessage(h)
  const separator = Menu.Separator.withMessage(h)
  const sub = Menu.Sub.withMessage(h)
  const subTrigger = Menu.SubTrigger.withMessage(h)
  const subContent = Menu.SubContent.withMessage(h)

  const next = (patch: Partial<EditorState>): TileMessage =>
    set({ ...state, ...patch })

  const onAction = (detail: { value: unknown }): TileMessage => {
    const value = String(detail.value)
    return next({ last: menubarResults[value] ?? value })
  }

  const menuShell = (
    label: string,
    children: ReadonlyArray<Html | string>,
  ) => [
    trigger([], [h.button([h.Type('button'), h.Class('ov-mb-trigger')], [label])]),
    content(
      [
        h.Class('b-pop ov-menu'),
        content.SideOffset(6),
        content.CollisionPadding(12),
      ],
      children,
    ),
  ]

  const checkItem = (
    value: string,
    checked: boolean,
    children: ReadonlyArray<Html | string>,
  ) =>
    checkbox(
      [
        checkbox.Value(value),
        checkbox.Checked(checked),
        checkbox.OnCheckedchange(detail =>
          next(
            value === 'minimap'
              ? { minimap: detail.value }
              : value === 'wrap'
                ? { wrap: detail.value }
                : { numbers: detail.value },
          ),
        ),
        h.Class('b-item ov-menu-item'),
      ],
      [
        indicator([indicator.KeepMounted(true), h.Class('ov-check')], [
          icon(h, 'check', 'bold', 14),
        ]),
        ...children,
      ],
    )

  return h.div([h.Class('ov-ide')], [
    h.div([h.Class('ov-ide-bar')], [
      h.span([h.Class('ov-wordmark')], ['relay']),
      menubar(
        [h.Class('ov-menubar'), h.Attribute('aria-label', 'Editor')],
        [
          menu([menu.OnAction(onAction)], [
            ...menuShell('File', [
              item(
                [
                  item.Value('new-file'),
                  item.Shortcut('mod+n'),
                  h.Class('b-item ov-menu-item'),
                ],
                ['New file'],
              ),
              sub([], [
                subTrigger([h.Class('b-item ov-menu-item')], [
                  'Open recent',
                  icon(h, 'caret-right', 'bold', 14, 'ov-menu-caret'),
                ]),
                subContent(
                  [h.Class('b-pop ov-menu'), subContent.CollisionPadding(12)],
                  [
                    item(
                      [
                        item.Value('recent-routes'),
                        h.Class('b-item ov-menu-item ov-mono-item'),
                      ],
                      ['api/projects.ts'],
                    ),
                    item(
                      [
                        item.Value('recent-app'),
                        h.Class('b-item ov-menu-item ov-mono-item'),
                      ],
                      ['web/layout.tsx'],
                    ),
                    item(
                      [
                        item.Value('recent-tf'),
                        h.Class('b-item ov-menu-item ov-mono-item'),
                      ],
                      ['infra/main.tf'],
                    ),
                  ],
                ),
              ]),
              separator([h.Class('ov-menu-sep')], []),
              item(
                [
                  item.Value('save'),
                  item.Shortcut('mod+s'),
                  h.Class('b-item ov-menu-item'),
                ],
                ['Save'],
              ),
            ]),
          ]),
          menu([menu.OnAction(onAction)], [
            ...menuShell('Edit', [
              item(
                [
                  item.Value('undo'),
                  item.Shortcut('mod+z'),
                  h.Class('b-item ov-menu-item'),
                ],
                ['Undo'],
              ),
              item(
                [
                  item.Value('redo'),
                  item.Shortcut('mod+shift+z'),
                  h.Class('b-item ov-menu-item'),
                ],
                ['Redo'],
              ),
              separator([h.Class('ov-menu-sep')], []),
              item(
                [
                  item.Value('find'),
                  item.Shortcut('mod+shift+f'),
                  h.Class('b-item ov-menu-item'),
                ],
                ['Find in project'],
              ),
            ]),
          ]),
          menu([], [
            ...menuShell('View', [
              checkItem('minimap', state.minimap, ['Minimap']),
              checkItem('wrap', state.wrap, ['Word wrap']),
              checkItem('numbers', state.numbers, ['Line numbers']),
              separator([h.Class('ov-menu-sep')], []),
              radioGroup(
                [
                  radioGroup.Value(state.density),
                  radioGroup.OnValuechange(detail =>
                    next({ density: detail.value }),
                  ),
                ],
                [
                  groupLabel([h.Class('ov-menu-label')], ['Density']),
                  ...['Compact', 'Comfortable'].map(option =>
                    radioItem(
                      [
                        radioItem.Value(option.toLowerCase()),
                        h.Class('b-item ov-menu-item'),
                      ],
                      [
                        h.span([h.Class('ov-check')], [
                          indicator([h.Class('ov-radio-dot')], []),
                        ]),
                        option,
                      ],
                    ),
                  ),
                ],
              ),
            ]),
          ]),
          menu([menu.OnAction(onAction)], [
            ...menuShell('Deploy', [
              item([item.Value('staging'), h.Class('b-item ov-menu-item')], [
                'Ship to staging',
              ]),
              item([item.Value('release'), h.Class('b-item ov-menu-item')], [
                'Release to everyone',
              ]),
              separator([h.Class('ov-menu-sep')], []),
              item([item.Value('revert'), h.Class('b-item ov-menu-item')], [
                'Revert last release…',
              ]),
            ]),
          ]),
        ],
      ),
      h.output([h.Class('ov-ide-status')], [state.last]),
    ]),
    h.div(
      [
        h.Class('ov-code'),
        h.DataAttribute('density', state.density),
        ...(state.wrap ? [h.Attribute('data-wrap', '')] : []),
      ],
      [
        h.ol(
          [
            h.Class('ov-code-lines'),
            ...(state.numbers ? [h.Attribute('data-numbers', '')] : []),
          ],
          codeLines.map(line => h.li([], [h.code([], [line])])),
        ),
        state.minimap
          ? h.div([h.Class('ov-minimap'), h.Attribute('aria-hidden', 'true')], [
              ...[86, 100, 44, 78, 30, 62, 92, 50].map(width =>
                h.span([h.Style({ width: `${width}%` })], []),
              ),
            ])
          : '',
      ],
    ),
  ])
}

/* 15. Vertical NavigationMenu in a sidebar */

type SideEntry = { name: string; detail: string }

const sideProjects: ReadonlyArray<SideEntry> = [
  { name: 'storefront', detail: 'Production · 3 regions' },
  { name: 'inventory-sync', detail: 'Cron · every 5 min' },
  { name: 'partner-portal', detail: 'Preview · pr-77' },
  { name: 'data-warehouse', detail: 'Paused' },
]

const sideDeploys: ReadonlyArray<SideEntry> = [
  { name: 'Production', detail: 'Live since 08:14' },
  { name: 'Preview', detail: '11 open branches' },
  { name: 'Rollbacks', detail: 'Last one Tuesday' },
]

const sideTeam: ReadonlyArray<SideEntry> = [
  { name: 'Members', detail: '14 people' },
  { name: 'Roles and access', detail: '4 roles' },
  { name: 'Invitations', detail: '3 pending' },
]

type SidebarState = { active: string }

const sidebarInitial: SidebarState = { active: 'overview' }

const renderSidebar = ({ state, set, h }: TileContext<SidebarState>) => {
  const nav = NavigationMenu.Root.withMessage(h)
  const list = NavigationMenu.List.withMessage(h)
  const navItem = NavigationMenu.Item.withMessage(h)
  const navTrigger = NavigationMenu.Trigger.withMessage(h)
  const navContent = NavigationMenu.Content.withMessage(h)
  const navLink = NavigationMenu.Link.withMessage(h)
  const linkIcon = NavigationMenu.LinkIcon.withMessage(h)
  const viewport = NavigationMenu.Viewport.withMessage(h)

  const next = (patch: Partial<SidebarState>): TileMessage =>
    set({ ...state, ...patch })

  const top = [
    { id: 'overview', label: 'Overview', iconName: 'house' },
    { id: 'usage', label: 'Usage', iconName: 'chart-line' },
    { id: 'settings', label: 'Settings', iconName: 'gear' },
  ]

  const sideLink = (
    id: string,
    children: ReadonlyArray<Html | string>,
  ) =>
    navLink([navLink.Current(state.active === id)], [
      h.a(
        [
          h.Href(`#${id}`),
          h.Class('ov-side-link'),
          h.OnClick(next({ active: id }), { defaultAction: 'Prevent' }),
        ],
        children,
      ),
    ])

  const link = (entry: (typeof top)[number]) =>
    navItem([], [
      sideLink(entry.id, [
        linkIcon([h.Class('ov-side-icon')], [
          icon(h, entry.iconName, 'bold'),
        ]),
        entry.label,
      ]),
    ])

  const section = (
    value: string,
    label: string,
    iconName: string,
    entries: ReadonlyArray<SideEntry>,
  ) =>
    navItem([navItem.Value(value)], [
      navTrigger([], [
        h.button(
          [
            h.Type('button'),
            h.Class('ov-side-link ov-side-trigger'),
            ...(entries.some(entry => entry.name === state.active)
              ? [h.Attribute('data-current', '')]
              : []),
          ],
          [
            h.span([h.Class('ov-side-icon')], [icon(h, iconName, 'bold')]),
            label,
            icon(h, 'caret-right', 'bold', 16, 'ov-side-caret'),
          ],
        ),
      ]),
      navContent([h.Class('ov-side-panel')], [
        h.p([h.Class('ov-side-panel-title')], [label]),
        h.ul(
          [],
          entries.map(entry =>
            h.li([], [
              sideLink(entry.name, [
                h.span([h.Class('ov-side-panel-name')], [entry.name]),
                h.span([h.Class('ov-side-panel-detail')], [entry.detail]),
              ]),
            ]),
          ),
        ),
      ]),
    ])

  return h.div([h.Class('ov-side')], [
    h.div([h.Class('ov-side-ws')], [
      h.span([h.Class('ov-side-ws-text')], [
        h.span([h.Class('ov-side-ws-name')], ['Northwind']),
        h.span([h.Class('ov-side-ws-plan')], ['Pro workspace']),
      ]),
    ]),
    nav(
      [
        h.Attribute('aria-label', 'Workspace'),
        nav.Orientation('vertical'),
        h.Class('ov-side-nav'),
        nav.Delay(120),
      ],
      [
        list([h.Class('ov-side-list')], [
          link(top[0]!),
          section('projects', 'Projects', 'folder', sideProjects),
          section('deploys', 'Deployments', 'rocket-launch', sideDeploys),
          section('team', 'Team', 'users', sideTeam),
          link(top[1]!),
          link(top[2]!),
        ]),
        viewport(
          [
            h.Class('ov-side-viewport'),
            viewport.SideOffset(12),
            viewport.Align('start'),
            viewport.CollisionPadding(12),
          ],
          [],
        ),
      ],
    ),
    h.div([h.Class('ov-side-user')], [
      avatar(h, 'DA'),
      h.span([h.Class('ov-side-ws-text')], [
        h.span([h.Class('ov-side-user-name')], ['Diego Alvarez']),
        h.span([h.Class('ov-side-user-role')], ['Owner']),
      ]),
    ]),
  ])
}

/* 16. Stacked toasts with an Undo action */

type InboxItem = { id: string; iconName: string; title: string }

const inboxSeed: ReadonlyArray<InboxItem> = [
  {
    id: 'approve',
    iconName: 'git-pull-request',
    title: 'Noor Haddad approved pr-312',
  },
  {
    id: 'invoice',
    iconName: 'receipt',
    title: 'Invoice INV-2041 is due Friday',
  },
  {
    id: 'staging',
    iconName: 'rocket-launch',
    title: 'Staging deploy finished in 52s',
  },
]

type InboxState = { items: ReadonlyArray<InboxItem> }

const inboxInitial: InboxState = { items: inboxSeed }

// The toaster is a live queue, not data: the Model cannot hold it, and the
// element takes it as a property. PORT NOTE: the reference creates it in
// `useState` and dismisses it on unmount; this one lives for the module, and
// the region's Mount dismisses it when the tile leaves the page.
const inboxToaster = createToaster({ duration: 6000 })

// Fresh state and a dispatch channel for the archive click and the toast's
// Undo, both of which run outside a Foldkit handler.
let inboxItemsNow: ReadonlyArray<InboxItem> = inboxSeed
let inboxDispatch: ((message: TileMessage) => void) | undefined

const renderInbox = ({ state, set, h }: TileContext<InboxState>) => {
  const region = Toast.Region.withMessage(h)

  inboxItemsNow = state.items

  const runtime = live('InboxRuntime', (element, emit) => {
    inboxDispatch = emit

    const archive = (item: InboxItem) => {
      const items = inboxItemsNow.filter(entry => entry.id !== item.id)
      // PORT NOTE: the Undo action belongs to the toast, so it reports through
      // the live channel. The reference keeps the same closure over `items`.
      inboxToaster('Archived', {
        id: item.id,
        description: item.title,
        action: {
          label: 'Undo',
          dismiss: true,
          onAction: () => {
            const restored = inboxSeed.filter(
              entry =>
                entry.id === item.id ||
                inboxItemsNow.some(current => current.id === entry.id),
            )
            inboxDispatch?.(set({ items: restored }))
          },
        },
      })
      emit(set({ items }))
    }

    const onClick = (event: Event) => {
      const node = event.target
      if (!(node instanceof Element)) return
      const button = node.closest('[data-archive]')
      if (!(button instanceof HTMLElement)) return
      const item = inboxSeed.find(
        entry => entry.id === button.dataset.archive,
      )
      if (item !== undefined) archive(item)
    }

    element.addEventListener('click', onClick)
    return () => {
      element.removeEventListener('click', onClick)
      if (inboxDispatch === emit) inboxDispatch = undefined
      inboxToaster.dismiss()
    }
  })

  const toastTemplate = h.template([
    h.InnerHTML(
      '<ui-toast class="ov-toast"><div class="ov-toast-text"><ui-toast-title class="ov-toast-title"></ui-toast-title><ui-toast-description class="ov-toast-desc"></ui-toast-description></div><ui-toast-action><button type="button" class="b-btn ov-toast-undo"></button></ui-toast-action><ui-toast-close><button type="button" class="ov-toast-x" aria-label="Dismiss"><i class="ph-bold ph-x" style="font-size:14px" aria-hidden="true"></i></button></ui-toast-close></ui-toast>',
    ),
  ])

  return h.div([h.Class('ov-inbox'), h.OnMount(runtime)], [
    h.p([h.Class('ov-inbox-head')], [
      icon(h, 'bell', 'fill', 14),
      'Inbox',
      h.span([h.Class('ov-inbox-count')], [String(state.items.length)]),
    ]),
    state.items.length > 0
      ? h.ul(
          [h.Class('ov-inbox-list')],
          state.items.map(item =>
            h.li([h.Class('ov-inbox-row')], [
              icon(h, item.iconName, 'fill', 14, 'ov-inbox-icon'),
              h.span([h.Class('ov-inbox-title')], [item.title]),
              h.button(
                [
                  h.Type('button'),
                  h.Class('ov-inbox-archive'),
                  h.Attribute('aria-label', `Archive: ${item.title}`),
                  h.DataAttribute('archive', item.id),
                ],
                [icon(h, 'archive', 'bold', 14)],
              ),
            ]),
          ),
        )
      : h.div([h.Class('ov-inbox-zero')], [
          h.p([], ['All caught up']),
          h.p([h.Class('ov-inbox-zero-note')], [
            'Zero inbox, zero config ▲',
          ]),
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn'),
              h.OnClick(set({ items: inboxSeed })),
            ],
            ['Bring them back'],
          ),
        ]),
    region(
      [
        h.Class('ov-toasts'),
        region.Toaster(inboxToaster),
        region.Side('bottom'),
        region.Align('end'),
        region.MaxVisible(3),
      ],
      [toastTemplate],
    ),
  ])
}

/* 17. A popup of our own: definePrimitive + createPopup */

const presence = [
  { id: 'available', label: 'Available', until: '' },
  { id: 'focus', label: 'Focusing', until: 'until 15:00' },
  { id: 'meeting', label: 'In a meeting', until: 'for 45 min' },
  { id: 'away', label: 'Away', until: 'back Monday' },
]

type PresenceState = { status: string }

const presenceInitial: PresenceState = { status: 'focus' }

const renderPresence = ({ state, set, h }: TileContext<PresenceState>) => {
  const popover = Popover.Root.withMessage(h)
  const trigger = Popover.Trigger.withMessage(h)
  const content = Popover.Content.withMessage(h)
  const close = Popover.Close.withMessage(h)

  const next = (patch: Partial<PresenceState>): TileMessage =>
    set({ ...state, ...patch })

  const current = presence.find(entry => entry.id === state.status) ?? presence[1]!

  // PORT NOTE: the reference builds its own `ov-status` primitive with
  // `definePrimitive` + `createPopup`. The parts are UI SDK's popover parts
  // here, so the same open/close, focus and dismissal behavior is in place.
  return h.div([h.Class('ov-presence')], [
    h.div([h.Class('ov-presence-who')], [
      h.span([h.Class('ov-presence-avatar')], [
        avatar(h, 'HN', 'lg'),
        h.span(
          [
            h.Class('ov-presence-dot'),
            h.DataAttribute('status', state.status),
            h.Attribute('aria-hidden', 'true'),
          ],
          [],
        ),
      ]),
      h.span([h.Class('ov-presence-text')], [
        h.span([h.Class('ov-presence-name')], ['Hana Novak']),
        h.span([h.Class('ov-presence-role')], ['Infra · Prague']),
      ]),
    ]),
    popover([], [
      trigger([], [
        h.button(
          [
            h.Type('button'),
            h.Class('b-btn ov-trigger ov-presence-trigger'),
            // The popover root is the flex item here, so the button asks for
            // the width `.ov-presence`'s stretch gave it in the reference.
            h.Style({ width: '100%' }),
          ],
          [
            h.span(
              [
                h.Class('ov-presence-dot ov-presence-dot-inline'),
                h.DataAttribute('status', state.status),
                h.Attribute('aria-hidden', 'true'),
              ],
              [],
            ),
            current.label,
            current.until === ''
              ? ''
              : h.span([h.Class('ov-presence-until')], [current.until]),
            icon(h, 'caret-down', 'bold', 14),
          ],
        ),
      ]),
      content(
        [h.Class('b-pop ov-presence-pop'), h.Attribute('aria-label', 'Set status')],
        presence.map(entry =>
          close([], [
            h.button(
              [
                h.Type('button'),
                h.Class('b-item ov-presence-option'),
                h.Attribute(
                  'aria-pressed',
                  entry.id === state.status ? 'true' : 'false',
                ),
                h.OnClick(next({ status: entry.id })),
              ],
              [
                h.span(
                  [
                    h.Class('ov-presence-dot ov-presence-dot-inline'),
                    h.DataAttribute('status', entry.id),
                    h.Attribute('aria-hidden', 'true'),
                  ],
                  [],
                ),
                h.span([h.Class('ov-presence-label')], [entry.label]),
                entry.until === ''
                  ? ''
                  : h.span([h.Class('ov-presence-until')], [entry.until]),
              ],
            ),
          ]),
        ),
      ),
    ]),
  ])
}

/* 18. position + bindLayer: a comment bubble pinned to a line */

const backoffLines: ReadonlyArray<{
  n: number
  kind: string
  code: string
}> = [
  { n: 12, kind: '', code: 'export function nextDelay(attempt: number) {' },
  { n: 13, kind: 'del', code: '  return BASE_MS * 2 ** attempt' },
  { n: 14, kind: 'add', code: '  const raw = BASE_MS * 2 ** attempt' },
  { n: 15, kind: 'add', code: '  return Math.min(raw, MAX_MS) + jitter()' },
  { n: 16, kind: '', code: '}' },
]

type LinesState = {
  openLine: number | null
  draft: string
  notes: Readonly<Record<number, string>>
}

const linesInitial: LinesState = {
  openLine: null,
  draft: '',
  notes: { 15: 'Jitter fixes the thundering herd.' },
}

const renderLineComments = ({ state, set, h }: TileContext<LinesState>) => {
  const next = (patch: Partial<LinesState>): TileMessage =>
    set({ ...state, ...patch })

  const open = (line: number, note: string | undefined): TileMessage =>
    next({
      openLine: state.openLine === line ? null : line,
      draft: note ?? '',
    })

  const post = (): TileMessage => {
    if (state.openLine === null) return next({})
    const line = state.openLine
    const text = state.draft.trim()
    return next({
      openLine: null,
      draft: '',
      notes: text === '' ? state.notes : { ...state.notes, [line]: text },
    })
  }

  const line = state.openLine

  // PORT NOTE: the reference runs `position()` and `bindLayer()` from
  // @ui-sdk/core in an effect. The bubble places itself against its line's
  // button on mount, and a document key listener handles Escape; focus goes to
  // the textarea on mount and back to the line on Escape, like the reference.
  const bubbleMount = (target: number) =>
    live('LineBubble', (element, emit) => {
      const tile = element.closest('.ov-lines')
      const anchor =
        tile === null
          ? null
          : tile.querySelector<HTMLElement>(`[data-line="${target}"]`)
      if (anchor !== null) {
        const bubble = element as HTMLElement
        const rect = anchor.getBoundingClientRect()
        const width = 248
        bubble.style.top = `${rect.bottom + 6}px`
        bubble.style.left = `${Math.max(
          12,
          Math.min(rect.right - width, window.innerWidth - width - 12),
        )}px`
      }
      element.querySelector('textarea')?.focus()
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return
        event.preventDefault()
        anchor?.focus()
        emit(next({ openLine: null }))
      }
      document.addEventListener('keydown', onKeyDown)
      return () => document.removeEventListener('keydown', onKeyDown)
    })

  return h.div([h.Class('ov-lines')], [
    h.p([h.Class('ov-lines-file')], ['src/queue/backoff.ts']),
    h.ol(
      [h.Class('ov-lines-code')],
      backoffLines.map(entry =>
        h.li(
          [
            ...(entry.kind === ''
              ? []
              : [h.DataAttribute('kind', entry.kind)]),
          ],
          [
            h.button(
              [
                h.Type('button'),
                h.Class('ov-line'),
                h.DataAttribute('line', String(entry.n)),
                h.Attribute('aria-expanded', line === entry.n ? 'true' : 'false'),
                h.Attribute(
                  'aria-label',
                  `Line ${entry.n}: ${entry.code.trim()}. Comment`,
                ),
                ...(line === entry.n ? [h.Attribute('data-open', '')] : []),
                h.OnClick(open(entry.n, state.notes[entry.n])),
              ],
              [
                h.span([h.Class('ov-line-n')], [String(entry.n)]),
                h.code([h.Class('ov-line-code')], [entry.code]),
                state.notes[entry.n] === undefined
                  ? ''
                  : icon(h, 'chat-circle', 'fill', 14, 'ov-line-note'),
              ],
            ),
          ],
        ),
      ),
    ),
    line === null
      ? ''
      : h.keyed('div')(
          `overlays-bubble-${line}`,
          [
            h.Class('ov-bubble'),
            h.Attribute('role', 'dialog'),
            h.Attribute('aria-label', `Comment on line ${line}`),
            h.OnMount(bubbleMount(line)),
          ],
          [
            h.textarea([
              h.Class('b-input ov-bubble-input'),
              h.Attribute('rows', '2'),
              h.Attribute('placeholder', 'Leave a comment'),
              h.Attribute('aria-label', 'Comment'),
              h.Value(state.draft),
              h.OnInput(value => next({ draft: value })),
              h.OnKeyDownPreventDefault((key, modifiers) =>
                key === 'Enter' &&
                (modifiers.metaKey || modifiers.ctrlKey)
                  ? Option.some(post())
                  : Option.none(),
              ),
            ]),
            h.div([h.Class('ov-bubble-actions')], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('b-btn'),
                  h.Attribute('data-variant', 'ghost'),
                  h.OnClick(next({ openLine: null })),
                ],
                ['Discard'],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.Class('b-btn'),
                  h.Attribute('data-variant', 'primary'),
                  h.OnClick(post()),
                ],
                ['Comment'],
              ),
            ]),
          ],
        ),
  ])
}

/* 19. Popover holding a Command list: an assignee picker */

const assignees = [
  { id: 'amara', name: 'Amara Diallo', initials: 'AD' },
  { id: 'kenji', name: 'Kenji Sato', initials: 'KS' },
  { id: 'elif', name: 'Elif Kaya', initials: 'EK' },
  { id: 'owen', name: 'Owen Price', initials: 'OP' },
  { id: 'yusuf', name: 'Yusuf Demir', initials: 'YD' },
]

type AssigneeState = { open: boolean; who: string | null }

const assigneeInitial: AssigneeState = { open: false, who: 'kenji' }

const renderAssignee = ({ state, set, h }: TileContext<AssigneeState>) => {
  const popover = Popover.Root.withMessage(h)
  const trigger = Popover.Trigger.withMessage(h)
  const content = Popover.Content.withMessage(h)
  const command = Command.Root.withMessage(h)
  const input = Command.Input.withMessage(h)
  const empty = Command.Empty.withMessage(h)
  const list = Command.List.withMessage(h)
  const item = Command.Item.withMessage(h)

  const next = (patch: Partial<AssigneeState>): TileMessage =>
    set({ ...state, ...patch })

  const person = assignees.find(entry => entry.id === state.who)

  return h.div([h.Class('ov-issue')], [
    h.p([h.Class('ov-issue-id')], [
      h.span([h.Class('ov-issue-prio'), h.Attribute('aria-hidden', 'true')], []),
      'ENG-482 · Urgent',
    ]),
    h.p([h.Class('ov-issue-title')], ['Webhook retries drop payloads']),
    popover(
      [
        popover.Open(state.open),
        popover.OnOpenchange(detail => next({ open: detail.value })),
      ],
      [
        trigger([], [
          h.button(
            [
              h.Type('button'),
              h.Class('ov-assignee'),
              h.Attribute(
                'aria-label',
                `Assignee: ${person?.name ?? 'nobody'}`,
              ),
            ],
            [
              person === undefined
                ? h.span(
                    [
                      h.Class('ov-avatar ov-avatar-empty'),
                      h.DataAttribute('size', 'sm'),
                      h.Attribute('aria-hidden', 'true'),
                    ],
                    [],
                  )
                : avatar(h, person.initials, 'sm'),
              person?.name ?? 'Unassigned',
              icon(h, 'caret-down', 'bold', 14),
            ],
          ),
        ]),
        content(
          [
            h.Class('b-pop ov-assign-pop'),
            content.Side('bottom'),
            content.Align('start'),
            content.SideOffset(6),
            content.CollisionPadding(12),
            h.Attribute('aria-label', 'Assign'),
          ],
          [
            command(
              [
                h.Class('ov-assign'),
                command.DefaultValue(state.who ?? 'none'),
                command.OnAction(detail => {
                  const value = String(detail.value)
                  return next({
                    who: value === 'none' ? null : value,
                    open: false,
                  })
                }),
              ],
              [
                input([], [
                  h.input([
                    h.Attribute('aria-label', 'Assign to'),
                    h.Attribute('placeholder', 'Assign to…'),
                    h.Class('ov-assign-input'),
                  ]),
                ]),
                empty([h.Class('ov-cmd-empty')], [
                  'No teammate by that name',
                ]),
                list([h.Class('ov-assign-list')], [
                  item(
                    [
                      item.Value('none'),
                      item.Label('No assignee'),
                      h.Class('b-item ov-assign-item'),
                    ],
                    [
                      h.span(
                        [
                          h.Class('ov-avatar ov-avatar-empty'),
                          h.DataAttribute('size', 'sm'),
                          h.Attribute('aria-hidden', 'true'),
                        ],
                        [],
                      ),
                      'No assignee',
                    ],
                  ),
                  ...assignees.map(entry =>
                    item(
                      [
                        item.Value(entry.id),
                        item.Label(entry.name),
                        h.Class('b-item ov-assign-item'),
                      ],
                      [
                        avatar(h, entry.initials, 'sm'),
                        entry.name,
                        entry.id === state.who
                          ? icon(h, 'check', 'bold', 14, 'ov-assign-check')
                          : '',
                      ],
                    ),
                  ),
                ]),
              ],
            ),
          ],
        ),
      ],
    ),
  ])
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'overlays-palette',
    title: 'Jump anywhere.',
    blurb: 'Search commands, then drill into pages.',
    size: 'large',
    initial: paletteInitial,
    render: renderPalette,
  },
  {
    id: 'overlays-invite',
    title: 'Bring people in.',
    blurb: 'A dialog that waits while it sends.',
    tone: 'paper',
    initial: inviteInitial,
    render: renderInvite,
  },
  {
    id: 'overlays-delete',
    title: 'Think twice.',
    blurb: 'Confirm before anything gets deleted.',
    initial: deleteInitial,
    render: renderDeleteProject,
  },
  {
    id: 'overlays-tokens',
    title: 'Ask, then await.',
    blurb: 'One confirm call answers every row.',
    tone: 'paper',
    initial: tokensInitial,
    render: renderTokens,
  },
  {
    id: 'overlays-region',
    title: 'Open from code.',
    blurb: 'Await the region someone picks.',
    tone: 'sky',
    initial: regionInitial,
    render: renderRegion,
  },
  {
    id: 'overlays-build-log',
    title: 'Pull up the log.',
    blurb: 'Drag the sheet between two heights.',
    tone: 'ink',
    initial: buildInitial,
    render: renderBuildLog,
  },
  {
    id: 'overlays-schedule',
    title: 'Pick a time.',
    blurb: 'A small form that points at its button.',
    initial: scheduleInitial,
    render: renderSchedule,
  },
  {
    id: 'overlays-review',
    title: 'Review by keyboard.',
    blurb: 'Tooltips teach the keys that work.',
    tone: 'blueprint',
    initial: reviewInitial,
    render: renderReview,
  },
  {
    id: 'overlays-quick-keys',
    title: 'Keys for your machine.',
    blurb: '⌘ on a Mac, Ctrl everywhere else.',
    tone: 'signal',
    initial: quickInitial,
    render: renderQuickKeys,
  },
  {
    id: 'overlays-mention',
    title: 'Know who’s who.',
    blurb: 'Pause on a mention to meet them.',
    initial: {},
    render: renderMention,
  },
  {
    id: 'overlays-deploys',
    title: 'Every row, its actions.',
    blurb: 'Menus with submenus, named by tooltips.',
    size: 'wide',
    initial: deploysInitial,
    render: renderDeploys,
  },
  {
    id: 'overlays-file-tree',
    title: 'Right-click works.',
    blurb: 'A context menu that knows the file.',
    tone: 'paper',
    initial: treeInitial,
    render: renderFileTree,
  },
  {
    id: 'overlays-branch',
    title: 'Menu, then dialog.',
    blurb: 'Rename opens a dialog from the menu.',
    tone: 'sage',
    initial: branchInitial,
    render: renderBranchRename,
  },
  {
    id: 'overlays-menubar',
    title: 'A real menu bar.',
    blurb: 'Arrow across menus, toggle the view.',
    size: 'wide',
    tone: 'paper',
    initial: editorInitial,
    render: renderEditor,
  },
  {
    id: 'overlays-sidebar',
    title: 'Navigate the workspace.',
    blurb: 'Sections open panels beside the sidebar.',
    size: 'tall',
    initial: sidebarInitial,
    render: renderSidebar,
  },
  {
    id: 'overlays-inbox',
    title: 'Undo anything.',
    blurb: 'Archived notices stack up with Undo.',
    tone: 'butter',
    initial: inboxInitial,
    render: renderInbox,
  },
  {
    id: 'overlays-presence',
    title: 'Roll your own.',
    blurb: 'A status popup from core popup parts.',
    initial: presenceInitial,
    render: renderPresence,
  },
  {
    id: 'overlays-line-comments',
    title: 'Pin it to a line.',
    blurb: 'Placed and dismissed without a component.',
    tone: 'paper',
    initial: linesInitial,
    render: renderLineComments,
  },
  {
    id: 'overlays-assignee',
    title: 'Assign in a keystroke.',
    blurb: 'Type a name, press Enter.',
    tone: 'ink',
    initial: assigneeInitial,
    render: renderAssignee,
  },
]
