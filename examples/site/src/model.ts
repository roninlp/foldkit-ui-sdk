import { Effect, Schema } from 'effect'
import { Command, Runtime, type Update } from 'foldkit'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// The agent bridge is created before the first render in bridge.ts, so the
// commands below can call it.
import { agent } from './bridge'

// MODEL — one Model for the whole site: the page and the docs article being
// read, the agents demo, and every field the live component demos hold.

export const pages = ['home', 'docs', 'showcase', 'agents', 'components'] as const
export type Page = (typeof pages)[number]

export const Model = Schema.Struct({
  page: Schema.Literals([...pages]),
  doc: Schema.String,
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
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  SetPage: { page: Schema.Literals([...pages]) },
  SetDoc: { doc: Schema.String },
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
})
export type Message = typeof Message.Type

// COMMANDS — the agent bridge is a Promise API, so the demo runs it as a
// Foldkit Command and reports back with a Message.

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

export const update = (model: Model, message: Message) =>
  Message.match<Update.Return<Model, Message>>(message, {
    SetPage: ({ page }) => ({
      model: modifyFields(model, { page: () => page }),
    }),
    SetDoc: ({ doc }) => ({
      model: modifyFields(model, { doc: () => doc }),
    }),
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
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    page: 'home',
    doc: 'introduction',
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
  },
})
