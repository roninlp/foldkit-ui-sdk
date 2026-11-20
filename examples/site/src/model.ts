import { Effect, Option, Schema } from 'effect'
import { Command, Navigation, Runtime, Url, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

import { agentPrompt } from './agent-prompt'
import { agent } from './bridge'
import {
  AppRoute,
  sectionUrl,
  sections,
  sinkModes,
  sinkUrl,
  urlToAppRoute,
} from './route'
import { demoToaster } from './toast'

// MODEL — one Model for the whole site: the parsed route (which carries the
// docs article and the sink's shareable filter), the agents demo, and every
// field the live component demos hold. The URL is the source of truth for
// where the visitor is; `update` never stores it a second time.

// The sink holds 145 live tiles. Giving every tile its own Model field would
// make this struct 145 fields long and lose the point of the exercise, so the
// sink keys one unknown-valued record by tile and each tile narrows its own
// slice. Every value still lives in the Model, and every change is a Message.
export const SinkTiles = Schema.Record(Schema.String, Schema.Unknown)
export type SinkTiles = typeof SinkTiles.Type

export const Model = Schema.Struct({
  route: AppRoute,
  notifications: Schema.Boolean,
  agentLog: Schema.String,
  // The showcase demos, one Model field per component.
  bookmarked: Schema.Boolean,
  emailsOn: Schema.Boolean,
  notify: Schema.Array(Schema.String),
  plan: Schema.String,
  tab: Schema.String,
  openFaqs: Schema.Array(Schema.String),
  budget: Schema.Number,
  rating: Schema.NullOr(Schema.Number),
  view: Schema.NullOr(Schema.String),
  upload: Schema.Number,
  dialogOpen: Schema.Boolean,
  deleted: Schema.Boolean,
  detailsOpen: Schema.Boolean,
  readCount: Schema.Number,
  pinned: Schema.Boolean,
  role: Schema.NullOr(Schema.String),
  username: Schema.String,
  lastAction: Schema.NullOr(Schema.String),
  // The remaining component docs demos: one field per component that holds
  // state, so every page runs from the same Model the rest of the site uses.
  alertOpen: Schema.Boolean,
  alertConfirmed: Schema.Boolean,
  autocompleteValue: Schema.String,
  calendarDate: Schema.NullOr(Schema.String),
  carouselPage: Schema.Number,
  collapsibleOpen: Schema.Boolean,
  colorValue: Schema.String,
  genreValues: Schema.Array(Schema.String),
  commandQuery: Schema.String,
  dateInputValue: Schema.NullOr(Schema.String),
  datePickerValue: Schema.NullOr(Schema.String),
  drawerOpen: Schema.Boolean,
  fileName: Schema.NullOr(Schema.String),
  listboxValue: Schema.NullOr(Schema.String),
  menubarAction: Schema.NullOr(Schema.String),
  navMenuValue: Schema.NullOr(Schema.String),
  numberValue: Schema.Number,
  otpValue: Schema.String,
  pageNumber: Schema.Number,
  passwordValue: Schema.String,
  passwordVisible: Schema.Boolean,
  resizableLayout: Schema.Array(Schema.Number),
  scrollTrack: Schema.NullOr(Schema.String),
  textareaValue: Schema.String,
  timeValue: Schema.NullOr(Schema.String),
  timelineValue: Schema.NullOr(Schema.String),
  tokenValues: Schema.Array(Schema.String),
  toolbarMarks: Schema.Array(Schema.String),
  treeExpanded: Schema.Array(Schema.String),
  treeSelected: Schema.NullOr(Schema.String),
  waterfallExpanded: Schema.Array(Schema.String),
  waterfallSelected: Schema.NullOr(Schema.String),
  // Whether the home page's agent-prompt CTA has copied.
  promptCopied: Schema.Boolean,
  // The sink: its tile state. The `?only=` / `?uses=` / `?mode=` filter is
  // route state, so it lives in the route the URL parses to.
  sinkTiles: SinkTiles,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  // Navigation: link clicks arrive as UrlRequests, URL changes as ChangedUrl,
  // and the top navigation reports a section to turn into a NavigateInternal.
  ClickedLink: { request: Navigation.UrlRequest },
  ChangedUrl: { url: Url.Url },
  SelectedSection: { section: Schema.Literals([...sections]) },
  CompletedNavigateInternal: {},
  CompletedReplaceUrl: {},
  CompletedLoadExternal: {},
  ChangedNotifications: { checked: Schema.Boolean },
  ClickedAgentSnapshot: {},
  FinishedAgentSnapshot: { log: Schema.String },
  ClickedAgentAct: {},
  FinishedAgentAct: { log: Schema.String },
  // The showcase demos.
  ChangedBookmarked: { bookmarked: Schema.Boolean },
  ChangedEmails: { checked: Schema.Boolean },
  ChangedNotify: { values: Schema.Array(Schema.String) },
  ChangedPlan: { plan: Schema.String },
  ChangedTab: { tab: Schema.String },
  ChangedFaqs: { open: Schema.Array(Schema.String) },
  ChangedBudget: { value: Schema.Number },
  ChangedRating: { value: Schema.NullOr(Schema.Number) },
  ChangedView: { value: Schema.NullOr(Schema.String) },
  ClickedUpload: {},
  ChangedDialogOpen: { open: Schema.Boolean },
  ClickedDeleteProject: {},
  ChangedDetailsOpen: { open: Schema.Boolean },
  ClickedMarkAllRead: {},
  ChangedPinned: { checked: Schema.Boolean },
  SelectedMenuAction: { action: Schema.String },
  ChangedRole: { value: Schema.NullOr(Schema.String) },
  ChangedUsername: { value: Schema.String },
  // The home page's agent-prompt CTA: the click runs a Command that writes the
  // prompt to the clipboard and reports back.
  ClickedCopyAgentPrompt: {},
  FinishedCopyAgentPrompt: {},
  // The remaining component docs demos.
  ChangedAlertOpen: { open: Schema.Boolean },
  ClickedAlertConfirm: {},
  ChangedAutocomplete: { value: Schema.String },
  ChangedCalendarDate: { value: Schema.NullOr(Schema.String) },
  ChangedCarouselPage: { page: Schema.Number },
  ChangedCollapsibleOpen: { open: Schema.Boolean },
  ChangedColor: { value: Schema.String },
  ChangedGenres: { values: Schema.Array(Schema.String) },
  ChangedCommandQuery: { query: Schema.String },
  ChangedDateInput: { value: Schema.NullOr(Schema.String) },
  ChangedDatePicker: { value: Schema.NullOr(Schema.String) },
  ChangedDrawerOpen: { open: Schema.Boolean },
  ChangedFile: { name: Schema.NullOr(Schema.String) },
  ChangedListbox: { value: Schema.NullOr(Schema.String) },
  SelectedMenubarAction: { action: Schema.String },
  SelectedNavMenu: { value: Schema.NullOr(Schema.String) },
  ChangedNumber: { value: Schema.Number },
  ChangedOtp: { value: Schema.String },
  ChangedPageNumber: { page: Schema.Number },
  ChangedPassword: { value: Schema.String },
  ChangedPasswordVisible: { visible: Schema.Boolean },
  ChangedResizableLayout: { layout: Schema.Array(Schema.Number) },
  ChangedScrollTrack: { value: Schema.NullOr(Schema.String) },
  ChangedTextarea: { value: Schema.String },
  ChangedTime: { value: Schema.NullOr(Schema.String) },
  SelectedTimeline: { value: Schema.NullOr(Schema.String) },
  ChangedTokens: { values: Schema.Array(Schema.String) },
  ChangedToolbarMarks: { marks: Schema.Array(Schema.String) },
  ChangedTreeExpanded: { expanded: Schema.Array(Schema.String) },
  ChangedTreeSelected: { value: Schema.NullOr(Schema.String) },
  ChangedWaterfallExpanded: { expanded: Schema.Array(Schema.String) },
  ChangedWaterfallSelected: { value: Schema.NullOr(Schema.String) },
  ClickedShowToast: {},
  FinishedShowToast: {},
  // The sink: the filter is URL state, so these navigate (replacing the
  // history entry, the way a filter bar should) instead of writing the Model,
  // and each tile's own state slice comes back as a Message.
  SinkToggleUse: { name: Schema.String, pressed: Schema.Boolean },
  SinkModeSet: { mode: Schema.Literals([...sinkModes]) },
  SinkClearUses: {},
  SinkTileStateSet: { tileId: Schema.String, state: Schema.Unknown },
  // A no-op several tiles dispatch: form submits that must not reload the
  // page, and fallbacks where nothing needs to change.
  SinkDone: {},
})
export type Message = typeof Message.Type

// COMMANDS — navigation as Effects, and the agent bridge, which is a Promise
// API, so the demo runs it as a Foldkit Command and reports back with a
// Message.

const NavigateInternal = Command.define('NavigateInternal', {
  args: { url: Schema.String },
  messages: [Message.CompletedNavigateInternal],
  execute: ({ url }) =>
    Navigation.pushUrl(url).pipe(Effect.as(Message.CompletedNavigateInternal())),
})

// The sink's filter changes replace the current history entry rather than
// pushing one per click, so sharing a filter never walls the back button up.
const ReplaceUrl = Command.define('ReplaceUrl', {
  args: { url: Schema.String },
  messages: [Message.CompletedReplaceUrl],
  execute: ({ url }) =>
    Navigation.replaceUrl(url).pipe(Effect.as(Message.CompletedReplaceUrl())),
})

const LoadExternal = Command.define('LoadExternal', {
  args: { href: Schema.String },
  messages: [Message.CompletedLoadExternal],
  execute: ({ href }) =>
    Navigation.load(href).pipe(Effect.as(Message.CompletedLoadExternal())),
})

// The home page's agent-prompt CTA. Clipboard access is async, so it runs as a
// Command and reports back with a Message; the fallback keeps it working where
// navigator.clipboard is unavailable.
const CopyAgentPrompt = Command.define('CopyAgentPrompt', {
  messages: [Message.FinishedCopyAgentPrompt],
  execute: Effect.promise(async () => {
    try {
      await navigator.clipboard.writeText(agentPrompt)
    } catch {
      const area = document.createElement('textarea')
      area.value = agentPrompt
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.append(area)
      area.select()
      document.execCommand('copy')
      area.remove()
    }
    return Message.FinishedCopyAgentPrompt()
  }),
})

// The Toast demo fires the docs' toaster from a Command, the same shape as any
// other side effect in update.
const ShowDemoToast = Command.define('ShowDemoToast', {
  messages: [Message.FinishedShowToast],
  execute: Effect.sync(() => {
    demoToaster('Saved to your library', {
      description: 'The card is now on the shelf with the rest of the collection.',
      action: { label: 'Undo', dismiss: true, onAction: () => {} },
    })
    return Message.FinishedShowToast()
  }),
})

const SnapshotAgent = Command.define('SnapshotAgent', {
  messages: [Message.FinishedAgentSnapshot],
  execute: Effect.promise(async () => {
    const found = agent.snapshot()
    const lines = found
      .slice(0, 8)
      .map(c => `${c.ref}  ${c.component}${c.label ? ` "${c.label}"` : ''}  [${c.actions.join(', ')}]`)
    return Message.FinishedAgentSnapshot({
      log: `${found.length} components on the page.\n\n${lines.join('\n')}`,
    })
  }),
})

const ActAgent = Command.define('ActAgent', {
  messages: [Message.FinishedAgentAct],
  execute: Effect.promise(async () => {
    const result = await agent.act({
      steps: [{ ref: 'Notifications', action: 'setChecked', args: [true] }],
    })
    const changes = result.steps.flatMap(step =>
      (step.changes ?? []).map(change => {
        const label = change.label ? ` "${change.label}"` : ''
        return `${change.component}${label}: ${change.key} = ${String(change.value)}`
      }),
    )
    return Message.FinishedAgentAct({
      log: result.ok
        ? `Agent ran 1 step on the switch, through the same checkedchange event a click fires.\n\n${changes.join('\n')}`
        : `The agent could not run the step: ${result.error?.message ?? 'unknown error'}`,
    })
  }),
})

// UPDATE

// The sink filter a navigation carries away from the sink page: the current
// Sink route's filter, or the empty one anywhere else.
const currentSinkFilter = (model: Model) => {
  if (model.route._tag !== 'Sink') {
    return { uses: Option.none(), mode: Option.none(), only: Option.none() } as const
  }
  const { uses, mode, only } = model.route
  return { uses, mode, only } as const
}

// The URL for the sink with one filter field changed. A `uses` list of one
// carries no `mode`, matching the filter bar, which only offers Any/All once
// two names are selected.
const sinkFilterUrl = (
  model: Model,
  changed: {
    uses?: Option.Option<ReadonlyArray<string>>
    mode?: Option.Option<(typeof sinkModes)[number]>
    only?: Option.Option<ReadonlyArray<string>>
  },
): string => {
  const current = currentSinkFilter(model)
  const uses = changed.uses ?? current.uses
  const hasUses = Option.isSome(uses) && Option.getOrElse(uses, () => []).length > 0
  return sinkUrl({
    uses: hasUses ? uses : Option.none(),
    mode: changed.mode !== undefined ? changed.mode : hasUses ? current.mode : Option.none(),
    only: changed.only ?? current.only,
  })
}

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    // A same-origin link: push the URL and let the runtime report the change
    // back. External links do a full load.
    ClickedLink: ({ request }) =>
      Navigation.UrlRequest.match<Update.Return<Model, Message>>(request, {
        Internal: ({ url }) => ({
          model,
          commands: [NavigateInternal({ url: Url.toString(url) })],
        }),
        External: ({ href }) => ({
          model,
          commands: [LoadExternal({ href })],
        }),
      }),
    // Every URL change — push, replace, back and forward — arrives here.
    ChangedUrl: ({ url }) => ({
      model: modifyFields(model, { route: () => urlToAppRoute(url) }),
    }),
    // The top navigation: build the section's URL from the same router that
    // parses it, and navigate.
    SelectedSection: ({ section }) => ({
      model,
      commands: [NavigateInternal({ url: sectionUrl(section) })],
    }),
    CompletedNavigateInternal: () => ({ model }),
    CompletedReplaceUrl: () => ({ model }),
    CompletedLoadExternal: () => ({ model }),
    ChangedNotifications: ({ checked }) => ({
      model: modifyFields(model, { notifications: () => checked }),
    }),
    ClickedAgentSnapshot: () => ({
      model,
      commands: [SnapshotAgent()],
    }),
    FinishedAgentSnapshot: ({ log }) => ({
      model: modifyFields(model, { agentLog: () => log }),
    }),
    ClickedAgentAct: () => ({
      model,
      commands: [ActAgent()],
    }),
    FinishedAgentAct: ({ log }) => ({
      model: modifyFields(model, { agentLog: () => log }),
    }),
    ChangedBookmarked: ({ bookmarked }) => ({
      model: modifyFields(model, { bookmarked: () => bookmarked }),
    }),
    ChangedEmails: ({ checked }) => ({
      model: modifyFields(model, { emailsOn: () => checked }),
    }),
    ChangedNotify: ({ values }) => ({
      model: modifyFields(model, { notify: () => values }),
    }),
    ChangedPlan: ({ plan }) => ({
      model: modifyFields(model, { plan: () => plan }),
    }),
    ChangedTab: ({ tab }) => ({
      model: modifyFields(model, { tab: () => tab }),
    }),
    ChangedFaqs: ({ open }) => ({
      model: modifyFields(model, { openFaqs: () => open }),
    }),
    ChangedBudget: ({ value }) => ({
      model: modifyFields(model, { budget: () => value }),
    }),
    ChangedRating: ({ value }) => ({
      model: modifyFields(model, { rating: () => value }),
    }),
    ChangedView: ({ value }) => ({
      model: modifyFields(model, { view: () => value }),
    }),
    ClickedUpload: () => ({
      model: modifyFields(model, {
        upload: value => Math.min(100, value + 20),
      }),
    }),
    ChangedDialogOpen: ({ open }) => ({
      model: modifyFields(model, { dialogOpen: () => open }),
    }),
    ClickedDeleteProject: () => ({
      model: modifyFields(model, {
        dialogOpen: () => false,
        deleted: () => true,
      }),
    }),
    ChangedDetailsOpen: ({ open }) => ({
      model: modifyFields(model, { detailsOpen: () => open }),
    }),
    ClickedMarkAllRead: () => ({
      model: modifyFields(model, {
        readCount: count => count + 1,
        bookmarked: () => true,
      }),
    }),
    ChangedPinned: ({ checked }) => ({
      model: modifyFields(model, { pinned: () => checked }),
    }),
    SelectedMenuAction: ({ action }) => ({
      model: modifyFields(model, { lastAction: () => action }),
    }),
    ChangedRole: ({ value }) => ({
      model: modifyFields(model, { role: () => value }),
    }),
    ChangedUsername: ({ value }) => ({
      model: modifyFields(model, { username: () => value }),
    }),
    // The home page's agent-prompt CTA.
    ClickedCopyAgentPrompt: () => ({
      model,
      commands: [CopyAgentPrompt()],
    }),
    FinishedCopyAgentPrompt: () => ({
      model: modifyFields(model, { promptCopied: () => true }),
    }),
    // The remaining component docs demos.
    ChangedAlertOpen: ({ open }) => ({
      model: modifyFields(model, {
        alertOpen: () => open,
        ...(open ? { alertConfirmed: () => false } : {}),
      }),
    }),
    ClickedAlertConfirm: () => ({
      model: modifyFields(model, {
        alertOpen: () => false,
        alertConfirmed: () => true,
      }),
    }),
    ChangedAutocomplete: ({ value }) => ({
      model: modifyFields(model, { autocompleteValue: () => value }),
    }),
    ChangedCalendarDate: ({ value }) => ({
      model: modifyFields(model, { calendarDate: () => value }),
    }),
    ChangedCarouselPage: ({ page }) => ({
      model: modifyFields(model, { carouselPage: () => page }),
    }),
    ChangedCollapsibleOpen: ({ open }) => ({
      model: modifyFields(model, { collapsibleOpen: () => open }),
    }),
    ChangedColor: ({ value }) => ({
      model: modifyFields(model, { colorValue: () => value }),
    }),
    ChangedGenres: ({ values }) => ({
      model: modifyFields(model, { genreValues: () => values }),
    }),
    ChangedCommandQuery: ({ query }) => ({
      model: modifyFields(model, { commandQuery: () => query }),
    }),
    ChangedDateInput: ({ value }) => ({
      model: modifyFields(model, { dateInputValue: () => value }),
    }),
    ChangedDatePicker: ({ value }) => ({
      model: modifyFields(model, { datePickerValue: () => value }),
    }),
    ChangedDrawerOpen: ({ open }) => ({
      model: modifyFields(model, { drawerOpen: () => open }),
    }),
    ChangedFile: ({ name }) => ({
      model: modifyFields(model, { fileName: () => name }),
    }),
    ChangedListbox: ({ value }) => ({
      model: modifyFields(model, { listboxValue: () => value }),
    }),
    SelectedMenubarAction: ({ action }) => ({
      model: modifyFields(model, { menubarAction: () => action }),
    }),
    SelectedNavMenu: ({ value }) => ({
      model: modifyFields(model, { navMenuValue: () => value }),
    }),
    ChangedNumber: ({ value }) => ({
      model: modifyFields(model, { numberValue: () => value }),
    }),
    ChangedOtp: ({ value }) => ({
      model: modifyFields(model, { otpValue: () => value }),
    }),
    ChangedPageNumber: ({ page }) => ({
      model: modifyFields(model, { pageNumber: () => page }),
    }),
    ChangedPassword: ({ value }) => ({
      model: modifyFields(model, { passwordValue: () => value }),
    }),
    ChangedPasswordVisible: ({ visible }) => ({
      model: modifyFields(model, { passwordVisible: () => visible }),
    }),
    ChangedResizableLayout: ({ layout }) => ({
      model: modifyFields(model, { resizableLayout: () => layout }),
    }),
    ChangedScrollTrack: ({ value }) => ({
      model: modifyFields(model, { scrollTrack: () => value }),
    }),
    ChangedTextarea: ({ value }) => ({
      model: modifyFields(model, { textareaValue: () => value }),
    }),
    ChangedTime: ({ value }) => ({
      model: modifyFields(model, { timeValue: () => value }),
    }),
    SelectedTimeline: ({ value }) => ({
      model: modifyFields(model, { timelineValue: () => value }),
    }),
    ChangedTokens: ({ values }) => ({
      model: modifyFields(model, { tokenValues: () => values }),
    }),
    ChangedToolbarMarks: ({ marks }) => ({
      model: modifyFields(model, { toolbarMarks: () => marks }),
    }),
    ChangedTreeExpanded: ({ expanded }) => ({
      model: modifyFields(model, { treeExpanded: () => expanded }),
    }),
    ChangedTreeSelected: ({ value }) => ({
      model: modifyFields(model, { treeSelected: () => value }),
    }),
    ChangedWaterfallExpanded: ({ expanded }) => ({
      model: modifyFields(model, { waterfallExpanded: () => expanded }),
    }),
    ChangedWaterfallSelected: ({ value }) => ({
      model: modifyFields(model, { waterfallSelected: () => value }),
    }),
    ClickedShowToast: () => ({
      model,
      commands: [ShowDemoToast()],
    }),
    FinishedShowToast: () => ({ model }),
    // The sink's filter is URL state: each change replaces the history entry
    // with the sink's next URL, and the route re-parses from the URL change.
    SinkToggleUse: ({ name, pressed }) => {
      const { uses } = currentSinkFilter(model)
      const list = Option.getOrElse(uses, () => [])
      const next = pressed
        ? [...new Set([...list, name])]
        : list.filter(other => other !== name)
      return {
        model,
        commands: [
          ReplaceUrl({ url: sinkFilterUrl(model, { uses: Option.some(next) }) }),
        ],
      }
    },
    SinkModeSet: ({ mode }) => ({
      model,
      commands: [ReplaceUrl({ url: sinkFilterUrl(model, { mode: Option.some(mode) }) })],
    }),
    SinkClearUses: () => ({
      model,
      commands: [
        ReplaceUrl({
          url: sinkFilterUrl(model, { uses: Option.none(), mode: Option.none() }),
        }),
      ],
    }),
    SinkTileStateSet: ({ tileId, state }) => ({
      model: modifyFields(model, {
        sinkTiles: tiles => ({ ...tiles, [tileId]: state }),
      }),
    }),
    SinkDone: () => ({ model }),
  })

// INIT

// A cold load seeds the Model from the URL the visitor arrived on: a deep
// link to /docs/dialog or /sink?only=reference boots straight into that page,
// because Foldkit hands `init` the initial URL and never reports it as a
// change.
export const init: Runtime.RoutingApplicationInit<Model, Message> = (url: Url.Url) => ({
  model: {
    route: urlToAppRoute(url),
    notifications: false,
    agentLog: 'Run one of the two steps above.',
    bookmarked: false,
    emailsOn: true,
    notify: ['email', 'releases'],
    plan: 'pro',
    tab: 'account',
    openFaqs: ['what'],
    budget: 240,
    rating: 4,
    view: 'week',
    upload: 40,
    dialogOpen: false,
    deleted: false,
    detailsOpen: false,
    readCount: 0,
    pinned: false,
    role: null,
    username: 'ada',
    lastAction: null,
    alertOpen: false,
    alertConfirmed: false,
    autocompleteValue: '',
    calendarDate: '2026-11-20',
    carouselPage: 0,
    collapsibleOpen: false,
    colorValue: '#6e56cf',
    genreValues: ['ambient'],
    commandQuery: '',
    dateInputValue: '2026-11-20',
    datePickerValue: '2026-11-20',
    drawerOpen: false,
    fileName: null,
    listboxValue: 'inbox',
    menubarAction: null,
    navMenuValue: null,
    numberValue: 3,
    otpValue: '',
    pageNumber: 1,
    passwordValue: 'foldkit',
    passwordVisible: false,
    resizableLayout: [38, 62],
    scrollTrack: 'first',
    textareaValue: 'Late check-out would be lovely.',
    timeValue: '18:30',
    timelineValue: 'v3.5',
    tokenValues: [],
    toolbarMarks: ['bold'],
    treeExpanded: ['src'],
    treeSelected: 'src/route.ts',
    waterfallExpanded: ['api'],
    waterfallSelected: 'scripts',
    promptCopied: false,
    sinkTiles: {},
  },
})
