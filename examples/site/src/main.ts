import { Effect, Schema } from 'effect'
import { Command, Runtime, type Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'

// The site is the docs, rendered with the thing it documents: the navigation
// is a SegmentedControl, the FAQ is an Accordion, the version chip is a
// Tooltip, and the agents page drives a Switch through the real agent bridge.
import { Accordion, SegmentedControl, Switch, Tooltip, uiSdkVersion } from 'foldkit-ui-sdk'

// The component index is generated into docs/components.md by the same script
// that generates the bindings, so the site documents the exact build it runs.
import componentsMarkdown from '../../../docs/components.md?raw'

// The agent bridge, created before the first render in bridge.ts.
import { agent } from './bridge'

// MODEL

export const Model = Schema.Struct({
  page: Schema.Literals(['home', 'docs', 'agents', 'components']),
  notifications: Schema.Boolean,
  agentLog: Schema.String,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  SetPage: { page: Schema.Literals(['home', 'docs', 'agents', 'components']) },
  ChangedNotifications: { checked: Schema.Boolean },
  ClickedAgentSnapshot: {},
  FinishedAgentSnapshot: { log: Schema.String },
  ClickedAgentAct: {},
  FinishedAgentAct: { log: Schema.String },
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
  })

// INIT

export const init: Runtime.ApplicationInit<Model, Message> = () => ({
  model: {
    page: 'home',
    notifications: false,
    agentLog: 'Run one of the two steps above.',
  },
})

// The component index, parsed from the same generated Markdown the README
// links to. Counting it at runtime keeps the site honest about its build.
type ComponentEntry = {
  namespace: string
  entry: string
  specs: string[]
  docsUrl: string
}

const parseComponents = (markdown: string): ComponentEntry[] =>
  markdown
    .split('\n')
    .flatMap(line => {
      const match =
        /^\| `([A-Za-z]+)` \| `foldkit-ui-sdk\/([a-z0-9-]+)` \| (.+?) \| \[docs\]\((.+?)\) \|$/.exec(
          line,
        )
      if (!match) return []
      return [
        {
          namespace: match[1],
          entry: match[2],
          specs: match[3].split(',').map(part => part.trim()).filter(Boolean),
          docsUrl: match[4],
        },
      ]
    })

const components = parseComponents(componentsMarkdown)
const totalSpecs = components.reduce((count, entry) => count + entry.specs.length, 0)

// VIEW

const quickStart = `import { Schema } from 'effect'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

// Registers <ui-toggle> only. The root entry registers everything.
import { Toggle } from 'foldkit-ui-sdk/toggle'

const Message = defineMessageUnion({
  ChangedBookmarked: { bookmarked: Schema.Boolean },
})
type Message = typeof Message.Type

export const view = (
  model: { bookmarked: boolean },
  h: HtmlBuilder<Message>,
): Document => {
  const toggle = Toggle.Root.withMessage(h)

  return {
    title: 'Bookmark',
    body: toggle(
      [
        toggle.Pressed(model.bookmarked),
        toggle.OnPressedchange(detail =>
          Message.ChangedBookmarked({ bookmarked: detail.value }),
        ),
      ],
      [h.button([h.Type('button')], ['Bookmark'])],
    ),
  }
}`

const agentSnippet = `import { createAgent } from 'foldkit-ui-sdk/agent'

// Before the first render, so it hears components as they are made.
const agent = createAgent()

// List every component on the page, its state and its actions.
const components = agent.snapshot()
// → [{ ref: 'c1', component: 'switch', label: 'Notifications',
//      checked: false, actions: ['setChecked', 'toggle'] }]

// Operate one, through its api, like a person would.
await agent.act({
  steps: [{ ref: 'Notifications', action: 'setChecked', args: [true] }],
})`

const faqs = [
  {
    value: 'reimplementation',
    question: 'Is this a reimplementation?',
    answer:
      'No. UI SDK owns the behavior inside its Web Components; Foldkit owns the application Model and the property/event seam. The package only translates properties and events, so keyboard, focus, selection and ARIA behave exactly as they do in UI SDK’s React, Vue, Svelte and Solid adapters.',
  },
  {
    value: 'keyboard',
    question: 'Does the keyboard and focus work?',
    answer:
      'Yes. The elements run UI SDK’s tested behaviors, so arrows move tabs, sliders and menus, typeahead finds items, Escape closes popups and focus follows the popup that opens — no round-trip through a Message can drop the synchronous DOM event.',
  },
  {
    value: 'server',
    question: 'What about server-side rendering?',
    answer:
      'UI SDK’s Web Components calculate ARIA in the browser, so a Foldkit SSR page renders the tags without their state attributes until the elements upgrade. UI SDK documents the same limitation for its Web Components, and the bindings add none of their own.',
  },
]

const limits = [
  {
    value: 'ssr',
    question: 'No server-rendered ARIA',
    answer:
      'A Foldkit SSR page renders the ui-* tags without aria-expanded, aria-selected and friends until the elements upgrade in the browser. The structure is there; the calculated state is not.',
  },
  {
    value: 'cancellation',
    question: 'No cancellation from the view',
    answer:
      'CustomElement.define gives an event factory the decoded detail, not the event, so a Foldkit view cannot preventDefault() a change to refuse it. Controlled properties still win on the next render; the difference is that the element applies the change before Foldkit writes it back.',
  },
  {
    value: 'attributes',
    question: 'A few part attributes have no property',
    answer:
      'Attributes like for or as-child are not writable JavaScript properties, so the bindings cannot carry them. Keep parts inside their root, or render the tag through Foldkit’s h.customElement() and set the attribute yourself.',
  },
]

const features = [
  {
    title: 'Behaviors intact',
    body: 'Menus, listboxes, dialogs, calendars, trees, carousels — UI SDK’s 51 components, their keyboard, focus, selection and ARIA tested through @ui-sdk/core/testing, unchanged inside your app.',
  },
  {
    title: 'Typed at the seam',
    body: 'Every tag is a CustomElementSpec with Schema-typed properties and decoded *change events. Properties flow from the Model in; events come back as Messages with { value, reason, source }.',
  },
  {
    title: 'Built for agents',
    body: 'The same markup an agent can read and operate through foldkit-ui-sdk/agent, and check against its WAI-ARIA pattern with foldkit-ui-sdk/testing. Foldkit views become agent-checkable for free.',
  },
]

const mappingRows: ReadonlyArray<readonly [string, string]> = [
  ['Tabs, TabsList, TabsTab', 'Tabs.Root, Tabs.List, Tabs.Tab'],
  ['open + onOpenChange', 'Popover.Root.Open(...) + Popover.Root.OnOpenchange(...)'],
  ['defaultValue', 'Tabs.Root.DefaultValue(...)'],
  ['<Slider value={[25]}>', 'Slider.Root.Value([25])'],
]

const goodies = [
  ['foldkit-ui-sdk/testing', "UI SDK's checkPattern, settle and part readers, for checking a rendered component against its WAI-ARIA pattern."],
  ['foldkit-ui-sdk/agent', 'createAgent, snapshot and act, so an agent can read and operate the page.'],
  ['foldkit-ui-sdk/observe', 'The page observation manager, unchanged.'],
  ['foldkit-ui-sdk/shortcuts', 'The shortcut manager, unchanged.'],
  ['element.api', 'Controllers on each element, for programmatic open, focus, selection and the rest.'],
]

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const segmented = SegmentedControl.Root.withMessage(h)
  const segmentedIndicator = SegmentedControl.Indicator.withMessage(h)
  const segmentedItem = SegmentedControl.Item.withMessage(h)
  const accordion = Accordion.Root.withMessage(h)
  const accordionItem = Accordion.Item.withMessage(h)
  const accordionHeader = Accordion.Header.withMessage(h)
  const accordionTrigger = Accordion.Trigger.withMessage(h)
  const accordionPanel = Accordion.Panel.withMessage(h)
  const switchRoot = Switch.Root.withMessage(h)
  const switchThumb = Switch.Thumb.withMessage(h)
  const tooltip = Tooltip.Root.withMessage(h)
  const tooltipTrigger = Tooltip.Trigger.withMessage(h)
  const tooltipContent = Tooltip.Content.withMessage(h)

  const pageButton = (text: string, page: Model['page'], solid = false) =>
    h.button(
      [
        h.Type('button'),
        h.Class(solid ? 'btn btn-solid' : 'btn'),
        h.OnClick(Message.SetPage({ page })),
      ],
      [text],
    )

  const code = (text: string) => h.pre([h.Class('code')], [text])

  const h2 = (text: string) => h.h2([h.Class('prose-h')], [text])

  const nav = h.header([h.Class('topbar')], [
    h.button(
      [h.Type('button'), h.Class('brand'), h.OnClick(Message.SetPage({ page: 'home' }))],
      [h.span([h.Class('brand-mark')], ['fk']), 'foldkit-ui-sdk'],
    ),
    segmented(
      [
        segmented.Value(model.page),
        segmented.OnValuechange(detail =>
          Message.SetPage({
            page: (detail.value ?? 'home') as Model['page'],
          }),
        ),
        h.Attribute('aria-label', 'Sections'),
      ],
      [
        segmentedIndicator([], []),
        segmentedItem([segmentedItem.Value('home')], ['Home']),
        segmentedItem([segmentedItem.Value('docs')], ['Docs']),
        segmentedItem([segmentedItem.Value('agents')], ['Agents']),
        segmentedItem([segmentedItem.Value('components')], ['Components']),
      ],
    ),
  ])

  const home = [
    h.section([h.Class('hero')], [
      h.h1([], ['UI SDK’s components, inside a Foldkit app.']),
      h.p([h.Class('lede')], [
        'foldkit-ui-sdk binds all 361 UI SDK Web Component tags — 51 components across 56 entries — to a Foldkit Model, through the CustomElement.define seam. Properties flow in, *change events come back as Messages, and nothing is reimplemented.',
      ]),
      h.div([h.Class('row hero-cta')], [
        pageButton('Read the docs', 'docs', true),
        pageButton('Browse the components', 'components'),
      ]),
      h.p([h.Class('meta')], [
        `UI SDK ${uiSdkVersion} · ${components.length} entries · ${totalSpecs} tags · MIT`,
      ]),
    ]),
    h.section([h.Class('feature-grid')], [
      ...features.map(feature =>
        h.article([h.Class('feature')], [
          h.h3([], [feature.title]),
          h.p([], [feature.body]),
        ]),
      ),
    ]),
    h.section([h.Class('section')], [
      h2('This site is built with it'),
      h.p([h.Class('prose-p')], [
        'The navigation above is a ui-segmented-control, the FAQ below is a ui-accordion, the version chip in the footer is a ui-tooltip, and the agents page drives a ui-switch through the real agent bridge. The docs run on the thing they document.',
      ]),
      accordion(
        [accordion.Multiple(false)],
        faqs.map(faq =>
          accordionItem([accordionItem.Value(faq.value)], [
            accordionHeader(
              [],
              [h.h3([], [accordionTrigger([], [h.button([h.Type('button')], [faq.question])])])],
            ),
            accordionPanel([], [faq.answer]),
          ]),
        ),
      ),
    ]),
    h.section([h.Class('section')], [
      h2('Quick start'),
      code(quickStart),
    ]),
  ]

  const docs = [
    h.section([h.Class('section')], [
      h2('Install'),
      h.p([h.Class('prose-p')], [
        'foldkit and effect are peer dependencies. Use a bundler that compiles TypeScript dependencies, like Vite — the same requirement UI SDK’s own adapters have.',
      ]),
      code('pnpm add foldkit-ui-sdk foldkit effect @effect/platform-browser'),
    ]),
    h.section([h.Class('section')], [
      h2('The shape of a binding'),
      h.p([h.Class('prose-p')], [
        'The namespace is the component, and every part is named the way UI SDK names it across frameworks: Root, List, Tab, Panel, Trigger, Content, Item. Each part is a CustomElementSpec; .withMessage(h) binds its events to the current Message universe.',
      ]),
      h.table([h.Class('table')], [
        h.thead([], [
          h.tr([], [
            h.th([], ['UI SDK React / Vue / Solid']),
            h.th([], ['This package']),
          ]),
        ]),
        h.tbody([], [
          ...mappingRows.map(row =>
            h.tr([], [
              h.td([h.Class('mono')], [row[0]]),
              h.td([h.Class('mono')], [row[1]]),
            ]),
          ),
        ]),
      ]),
      h.p([h.Class('prose-p')], [
        'Change events decode to { value, reason, source }, so reasons and analytics work the same as in the other adapters.',
      ]),
    ]),
    h.section([h.Class('section')], [
      h2('Imports'),
      h.p([h.Class('prose-p')], [
        'Imports mirror UI SDK’s entries, so a bundle only registers what it renders. The root entry registers every tag — right for prototypes, docs and examples.',
      ]),
      h.table([h.Class('table')], [
        h.thead([], [
          h.tr([], [h.th([], ['Import']), h.th([], ['Registers']), h.th([], ['Use'])]),
        ]),
        h.tbody([], [
          h.tr([], [
            h.td([h.Class('mono')], ['foldkit-ui-sdk/toggle']),
            h.td([], ['That component’s tags']),
            h.td([], ['Production apps']),
          ]),
          h.tr([], [
            h.td([h.Class('mono')], ['foldkit-ui-sdk']),
            h.td([], ['Every tag']),
            h.td([], ['Prototypes, docs, examples']),
          ]),
        ]),
      ]),
      h.p([h.Class('prose-p')], [
        `The full list — all ${components.length} entries with their specs — is on the Components page, generated from the same manifest as the bindings.`,
      ]),
      pageButton('Open the component index', 'components', true),
    ]),
    h.section([h.Class('section')], [
      h2('Goodies that come with it'),
      h.ul([h.Class('list')], [
        ...goodies.map(([name, body]) =>
          h.li([], [h.code([h.Class('mono')], [name]), ' — ', body]),
        ),
      ]),
    ]),
    h.section([h.Class('section')], [
      h2('Commands and the agent bridge'),
      h.p([h.Class('prose-p')], [
        'Async work belongs in a Command. The agents page runs the real bridge as one: the click dispatches a Message, update returns the Command, and its Effect reports back with a Message when the Promise settles.',
      ]),
      code(
        `const SnapshotAgent = Command.define('SnapshotAgent', {
  messages: [Message.FinishedAgentSnapshot],
  execute: () =>
    Effect.promise(() =>
      Message.FinishedAgentSnapshot({ log: summarize(agent.snapshot()) }),
    ),
})

// In update:
ClickedAgentSnapshot: () => ({ model, commands: [SnapshotAgent()] }),`,
      ),
      pageButton('See it live on the agents page', 'agents'),
    ]),
    h.section([h.Class('section')], [
      h2('Limits'),
      h.p([h.Class('prose-p')], [
        'Foldkit’s view is a pure Model -> Document function and every event dispatches a Message; UI SDK’s primitives are an external store bound to elements. The Web Components boundary is the architecture-respecting way to combine them — and it has two edges:',
      ]),
      accordion(
        [accordion.Multiple(true)],
        limits.map(limit =>
          accordionItem([accordionItem.Value(limit.value)], [
            accordionHeader(
              [],
              [h.h3([], [accordionTrigger([], [h.button([h.Type('button')], [limit.question])])])],
            ),
            accordionPanel([], [limit.answer]),
          ]),
        ),
      ),
    ]),
    h.section([h.Class('section')], [
      h2('Development'),
      code(
        `pnpm install
pnpm run generate         # regenerate src/entries from the manifest
pnpm run check:generated  # fail when generated files are stale
pnpm run typecheck
pnpm test                 # every tag has a binding, events, properties
pnpm run test:e2e         # Playwright on the examples`,
      ),
    ]),
  ]

  const agents = [
    h.section([h.Class('section')], [
      h.h1([h.Class('page-h')], ['Agents guide']),
      h.p([h.Class('prose-p')], [
        'UI SDK ships an agent bridge: createAgent before the page renders, then snapshot to list every component with its state and actions, and act to operate one through its api. foldkit-ui-sdk re-exports it unchanged — a Foldkit view renders the same ui-* elements as UI SDK’s other adapters, so the bridge reads and drives it without knowing Foldkit is there.',
      ]),
      code(agentSnippet),
    ]),
    h.section([h.Class('section')], [
      h2('Live: the agent reading this page'),
      h.p([h.Class('prose-p')], [
        'This card is wired to the real bridge. Snapshot lists the components on this page; the second step turns on the switch below by its label, through the element’s api — the same checkedchange event a click fires, with source "agent", so the Foldkit Model updates too.',
      ]),
      h.div([h.Class('demo-card')], [
        h.label([h.Class('row demo-switch')], [
          switchRoot(
            [
              switchRoot.Checked(model.notifications),
              switchRoot.OnCheckedchange(detail =>
                Message.ChangedNotifications({ checked: detail.value }),
              ),
            ],
            [switchThumb([], [])],
          ),
          h.span([], ['Notifications']),
        ]),
        h.div([h.Class('row')], [
          h.button(
            [h.Type('button'), h.Class('btn'), h.OnClick(Message.ClickedAgentSnapshot())],
            ['Snapshot this page'],
          ),
          h.button(
            [h.Type('button'), h.Class('btn btn-solid'), h.OnClick(Message.ClickedAgentAct())],
            ['Agent: turn notifications on'],
          ),
        ]),
        h.pre([h.Class('code agent-log')], [model.agentLog]),
      ]),
    ]),
    h.section([h.Class('section')], [
      h2('Checking a Foldkit view'),
      h.p([h.Class('prose-p')], [
        'foldkit-ui-sdk/testing re-exports UI SDK’s testing kit: checkPattern a rendered component against its WAI-ARIA pattern, settle after interactions, and read parts. It works on the Foldkit-rendered page the same as anywhere, in right-to-left and on the server.',
      ]),
      code(
        `import { checkPattern, settle } from 'foldkit-ui-sdk/testing'

// A rendered ui-tabs, checked against the tabs pattern.
await settle(page)
await checkPattern(page, 'tabs')`,
      ),
    ]),
    h.section([h.Class('section')], [
      h2('WebMCP'),
      h.p([h.Class('prose-p')], [
        'registerTools hands the three tools to the browser’s own agent through WebMCP where the browser has it, and does nothing where it doesn’t. The browser’s agent isn’t one you wrote, so an allow callback decides each step.',
      ]),
      code(
        `import { registerTools } from 'foldkit-ui-sdk/agent'

registerTools(agent, {
  allow: step => step.action !== 'press' || confirm(\`Press \${step.args[0]}?\`),
})`,
      ),
    ]),
  ]

  const componentsPage = [
    h.section([h.Class('section')], [
      h.h1([h.Class('page-h')], ['Components']),
      h.p([h.Class('prose-p')], [
        `Every import entry, generated from @ui-sdk/web ${uiSdkVersion}'s manifest. Importing an entry registers its tags; the specs column is what the namespace exports. This page is parsed from docs/components.md, the same file the generator writes.`,
      ]),
      h.table([h.Class('table table-wide')], [
        h.thead([], [
          h.tr([], [
            h.th([], ['Namespace']),
            h.th([], ['Import']),
            h.th([], ['Specs']),
            h.th([], ['UI SDK docs']),
          ]),
        ]),
        h.tbody([], [
          ...components.map(entry =>
            h.tr([], [
              h.td([h.Class('mono')], [entry.namespace]),
              h.td([h.Class('mono')], [`foldkit-ui-sdk/${entry.entry}`]),
              h.td([], [String(entry.specs.length)]),
              h.td([], [
                h.a([h.Href(entry.docsUrl), h.Class('link'), h.Attribute('target', '_blank')], [
                  entry.docsUrl.replace('https://ui-sdk.dev/docs/web-components/components/', ''),
                ]),
              ]),
            ]),
          ),
        ]),
      ]),
    ]),
  ]

  const page =
    model.page === 'home'
      ? home
      : model.page === 'docs'
        ? docs
        : model.page === 'agents'
          ? agents
          : componentsPage

  return {
    title: `foldkit-ui-sdk — ${model.page}`,
    body: h.div([], [
      nav,
      h.main([h.Class('main')], page),
      h.footer([h.Class('site-footer')], [
        h.span([], ['A binding layer, not a reimplementation. ']),
        h.a([h.Href('https://github.com/foldkit/foldkit-ui-sdk'), h.Class('link')], ['Source']),
        h.span([], [' · UI SDK is Apache-2.0, Foldkit is MIT, this package is MIT. Pinned to ']),
        tooltip(
          [],
          [
            tooltipTrigger([], [
              h.button([h.Type('button'), h.Class('chip')], [`UI SDK ${uiSdkVersion}`]),
            ]),
            tooltipContent(
              [],
              ['Every binding is generated from this version’s published manifest.'],
            ),
          ],
        ),
        h.span([], ['.']),
      ]),
    ]),
  }
}
