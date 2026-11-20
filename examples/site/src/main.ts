import { Option } from 'effect'
import type { Document, Html, HtmlBuilder } from 'foldkit/html'

// The site is the docs, rendered with the thing it documents: the navigation
// is a SegmentedControl, the FAQ is an Accordion, the version chip is a
// Tooltip, the showcase and every component docs page run the real bindings,
// and the agents page drives a Switch through the real agent bridge.
import { Accordion, SegmentedControl, Switch, Tooltip, uiSdkVersion } from 'foldkit-ui-sdk'

// The component index is generated into docs/components.md by the same script
// that generates the bindings, so the site documents the exact build it runs.
import componentsMarkdown from '../../../docs/components.md?raw'

import { demos, findDemo } from './demos'
import { codeHtml, type CodeLang } from './highlight'
import { Message, type Model } from './model'
import {
  AppRoute,
  docsUrl,
  homeUrl,
  sectionOf,
  sectionUrl,
  sinkUrl,
  type Section,
} from './route'
import { renderSink } from './sink/view'

// Re-exported for entry.ts, which starts the runtime.
export { Message, Model, init, update } from './model'

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

const componentByNamespace = (namespace: string): ComponentEntry | undefined =>
  components.find(entry => entry.namespace === namespace)

const kebab = (name: string) =>
  name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

// The tag a spec renders: Root is the component's own tag, every other part
// appends its name, the same rule the generator uses for the entries.
const specTag = (entry: string, spec: string) =>
  spec === 'Root' ? `ui-${entry}` : `ui-${entry}-${kebab(spec)}`

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

// The docs sidebar: the guides, then the component pages, then the index.

const guides: ReadonlyArray<{ slug: string; title: string }> = [
  { slug: 'introduction', title: 'Introduction' },
  { slug: 'install', title: 'Install' },
  { slug: 'bindings', title: 'The shape of a binding' },
  { slug: 'imports', title: 'Imports' },
  { slug: 'goodies', title: 'Goodies' },
  { slug: 'commands', title: 'Commands and the agent bridge' },
  { slug: 'limits', title: 'Limits' },
  { slug: 'development', title: 'Development' },
]

// Shared view helpers live inside `view`: every route arm below is its own
// view function, the identity boundary the Foldkit differ uses to tear a page
// down on navigation instead of patching across it.

type PageHtml = ReadonlyArray<Html | string>

export const view = (model: Model, h: HtmlBuilder<Message>): Document => {
  const segmented = SegmentedControl.Root.withMessage(h)
  const segmentedIndicator = SegmentedControl.Indicator.withMessage(h)
  const segmentedItem = SegmentedControl.Item.withMessage(h)
  const tooltip = Tooltip.Root.withMessage(h)
  const tooltipTrigger = Tooltip.Trigger.withMessage(h)
  const tooltipContent = Tooltip.Content.withMessage(h)

  const code = (source: string, lang: CodeLang = 'ts'): Html =>
    h.div([h.Class('code'), h.InnerHTML(codeHtml(source, lang))], [])

  const h2 = (text: string) => h.h2([h.Class('prose-h')], [text])

  const prose = (text: string) => h.p([h.Class('prose-p')], [text])

  // A link into one of the sections. The href comes from the same router
  // that parses it, so the address and the page can never disagree.
  const sectionLink = (text: string, section: Section, solid = false) =>
    h.a(
      [h.Href(sectionUrl(section)), h.Class(solid ? 'btn btn-solid' : 'btn')],
      [text],
    )

  // The top bar: the brand links home, and the section picker is a live
  // ui-segmented-control whose valuechange navigates.
  const nav = h.header([h.Class('topbar')], [
    h.a([h.Href(homeUrl()), h.Class('brand')], [
      h.span([h.Class('brand-mark')], ['fk']),
      'foldkit-ui-sdk',
    ]),
    segmented(
      [
        segmented.Value(sectionOf(model.route)),
        segmented.OnValuechange(detail =>
          Message.SelectedSection({
            section: (detail.value ?? 'Home') as Section,
          }),
        ),
        h.Attribute('aria-label', 'Sections'),
      ],
      [
        segmentedIndicator([], []),
        segmentedItem([segmentedItem.Value('Home')], ['Home']),
        segmentedItem([segmentedItem.Value('Docs')], ['Docs']),
        segmentedItem([segmentedItem.Value('Showcase')], ['Showcase']),
        segmentedItem([segmentedItem.Value('Sink')], ['Sink']),
      ],
    ),
  ])

  // HOME

  const homeView = (): PageHtml => {
    const accordion = Accordion.Root.withMessage(h)
    const accordionItem = Accordion.Item.withMessage(h)
    const accordionHeader = Accordion.Header.withMessage(h)
    const accordionTrigger = Accordion.Trigger.withMessage(h)
    const accordionPanel = Accordion.Panel.withMessage(h)

    return [
      h.section([h.Class('hero')], [
        h.h1([], ['UI SDK’s components, inside a Foldkit app.']),
        h.p([h.Class('lede')], [
          'foldkit-ui-sdk binds all 361 UI SDK Web Component tags — 51 components across 56 entries — to a Foldkit Model, through the CustomElement.define seam. Properties flow in, *change events come back as Messages, and nothing is reimplemented.',
        ]),
        h.div([h.Class('row hero-cta')], [
          sectionLink('Read the docs', 'Docs', true),
          h.button(
            [
              h.Type('button'),
              h.Class('btn'),
              h.OnClick(Message.ClickedCopyAgentPrompt()),
            ],
            [
              model.promptCopied
                ? 'Copied — paste it into your agent'
                : 'Copy agent prompt',
            ],
          ),
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
          'The navigation above is a ui-segmented-control, the docs sidebar pages run live components, the FAQ below is a ui-accordion, the version chip in the footer is a ui-tooltip, and the agents page drives a ui-switch through the real agent bridge. Every page has a URL — the docs pages at /docs/:doc, the sink with its filter in the query string — and the address bar is the source of truth the app routes on. The docs run on the thing they document.',
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
  }

  // DOCS — a sidebar on the left, the article on the right, the shape the
  // Foldkit docs site uses.

  const docsView = (doc: string): PageHtml => {
    const sideLink = (slug: string, title: string) =>
      h.a(
        [
          h.Href(docsUrl(slug)),
          h.Class('side-link'),
          ...(doc === slug ? [h.Attribute('aria-current', 'page')] : []),
        ],
        [title],
      )

    const sidebar = h.aside([h.Class('docs-side')], [
      h.nav([h.Class('side-nav')], [
        h.span([h.Class('side-group-h')], ['Getting started']),
        ...guides.map(guide => sideLink(guide.slug, guide.title)),
        h.span([h.Class('side-group-h')], ['Components']),
        ...demos.map(demo => sideLink(demo.slug, demo.title)),
      ]),
    ])

    const accordionList = (
      openMultiple: boolean,
      items: typeof faqs,
    ) => {
      const accordion = Accordion.Root.withMessage(h)
      const accordionItem = Accordion.Item.withMessage(h)
      const accordionHeader = Accordion.Header.withMessage(h)
      const accordionTrigger = Accordion.Trigger.withMessage(h)
      const accordionPanel = Accordion.Panel.withMessage(h)
      return accordion(
        [accordion.Multiple(openMultiple)],
        items.map(item =>
          accordionItem([accordionItem.Value(item.value)], [
            accordionHeader(
              [],
              [h.h3([], [accordionTrigger([], [h.button([h.Type('button')], [item.question])])])],
            ),
            accordionPanel([], [item.answer]),
          ]),
        ),
      )
    }

    const guideArticle = (slug: string): PageHtml => {
      if (slug === 'install') {
        return [
          h.h1([h.Class('page-h')], ['Install']),
          prose(
            'foldkit and effect are peer dependencies. Use a bundler that compiles TypeScript dependencies, like Vite — the same requirement UI SDK’s own adapters have.',
          ),
          code('pnpm add foldkit-ui-sdk foldkit effect @effect/platform-browser', 'shell'),
        ]
      }
      if (slug === 'bindings') {
        return [
          h.h1([h.Class('page-h')], ['The shape of a binding']),
          prose(
            'The namespace is the component, and every part is named the way UI SDK names it across frameworks: Root, List, Tab, Panel, Trigger, Content, Item. Each part is a CustomElementSpec; .withMessage(h) binds its events to the current Message universe.',
          ),
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
          prose(
            'Change events decode to { value, reason, source }, so reasons and analytics work the same as in the other adapters.',
          ),
          code(
            `const tab = Tabs.Tab.withMessage(h)

tab(
  [tab.Value('account')],
  [h.button([h.Type('button')], ['Account'])],
)`,
          ),
        ]
      }
      if (slug === 'imports') {
        return [
          h.h1([h.Class('page-h')], ['Imports']),
          prose(
            'Imports mirror UI SDK’s entries, so a bundle only registers what it renders. The root entry registers every tag — right for prototypes, docs and examples.',
          ),
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
          prose(
            `Every one of the ${components.length} entries has its own page in the Components section of this sidebar, each running the component live next to its parts table.`,
          ),
          code(
            `// One entry: registers the ui-tabs tags and nothing else.
import { Tabs } from 'foldkit-ui-sdk/tabs'

// The root entry: registers every tag the package binds.
import { Tabs, Toggle } from 'foldkit-ui-sdk'`,
          ),
        ]
      }
      if (slug === 'goodies') {
        return [
          h.h1([h.Class('page-h')], ['Goodies that come with it']),
          h.ul([h.Class('list')], [
            ...goodies.map(([name, body]) =>
              h.li([], [h.code([h.Class('mono')], [name]), ' — ', body]),
            ),
          ]),
          code(
            `import { checkPattern, settle } from 'foldkit-ui-sdk/testing'
import { createAgent } from 'foldkit-ui-sdk/agent'
import { registerTools } from 'foldkit-ui-sdk/agent'

// Every helper is the one UI SDK ships, re-exported unchanged.`,
          ),
        ]
      }
      if (slug === 'commands') {
        const switchRoot = Switch.Root.withMessage(h)
        const switchThumb = Switch.Thumb.withMessage(h)
        return [
          h.h1([h.Class('page-h')], ['Commands and the agent bridge']),
          prose(
            'Async work belongs in a Command. The demo below runs the real bridge as one: the click dispatches a Message, update returns the Command, and its Effect reports back with a Message when the Promise settles.',
          ),
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
        ]
      }
      if (slug === 'limits') {
        return [
          h.h1([h.Class('page-h')], ['Limits']),
          prose(
            'Foldkit’s view is a pure Model -> Document function and every event dispatches a Message; UI SDK’s primitives are an external store bound to elements. The Web Components boundary is the architecture-respecting way to combine them — and it has two edges:',
          ),
          accordionList(true, limits),
          code(
            `// Attributes without a property go through the tag builder.
h.customElement('ui-menu-sub-trigger', [h.Attribute('as-child', '')], [
  h.button([h.Type('button')], ['More…']),
])`,
          ),
        ]
      }
      if (slug === 'development') {
        return [
          h.h1([h.Class('page-h')], ['Development']),
          code(
            `pnpm install
pnpm run generate         # regenerate src/entries from the manifest
pnpm run check:generated  # fail when generated files are stale
pnpm run typecheck
pnpm test                 # every tag has a binding, events, properties
pnpm run test:e2e         # Playwright on the site`,
            'shell',
          ),
        ]
      }
      // The introduction.
      return [
        h.h1([h.Class('page-h')], ['Introduction']),
        prose(
          'foldkit-ui-sdk is a binding layer, not a reimplementation. UI SDK ships its components as Web Components with keyboard, focus, selection and ARIA tested once, in @ui-sdk/core; Foldkit runs your app as a Model -> update -> view loop. The package meets them at the seam both already support: CustomElement.define.',
        ),
        prose(
          'Properties flow from the Model into the element; UI SDK’s *change events come back as Messages with their detail decoded and Schema-typed. No primitive store lives in your Model, and no Foldkit state lives in the element.',
        ),
        ...features.map(feature =>
          h.article([h.Class('feature')], [
            h.h3([], [feature.title]),
            h.p([], [feature.body]),
          ]),
        ),
        h2('This site is built with it'),
        prose(
          'The navigation above is a ui-segmented-control, every component page runs its component live, the FAQ below is a ui-accordion, and the agents page drives a ui-switch through the real agent bridge.',
        ),
        accordionList(false, faqs),
        h2('Quick start'),
        code(quickStart),
      ]
    }

    // A component docs page, the shape the Foldkit docs site uses: overview,
    // a live example with its code, the parts, and the behaviors link.

    const demoArticle = (slug: string): PageHtml => {
      const demo = findDemo(slug)
      if (!demo) return guideArticle('introduction')

      const entries = demo.namespaces
        .map(namespace => componentByNamespace(namespace))
        .filter((entry): entry is ComponentEntry => entry !== undefined)

      const firstUse = demo.namespaces[0]

      return [
        h.h1([h.Class('page-h')], [demo.title]),
        h.div([h.Class('row import-row')], [
          ...entries.map(entry =>
            h.code([h.Class('import-chip')], [`foldkit-ui-sdk/${entry.entry}`]),
          ),
        ]),
        h2('Overview'),
        prose(demo.overview),
        h2('Example'),
        prose(demo.note + ' The demo below is live — the state lives in the Model behind this page.'),
        h.div([h.Class('demo-frame')], demo.render(model, h)),
        code(demo.code),
        h2('Parts'),
        h.table([h.Class('table')], [
          h.thead([], [
            h.tr([], [h.th([], ['Spec']), h.th([], ['Element'])]),
          ]),
          h.tbody([], [
            ...entries.flatMap(entry =>
              entry.specs.map(spec =>
                h.tr([], [
                  h.td([h.Class('mono')], [`${entry.namespace}.${spec}`]),
                  h.td([h.Class('mono')], [`<${specTag(entry.entry, spec)}>`]),
                ]),
              ),
            ),
          ]),
        ]),
        prose(
          'Keyboard interaction, focus order, dismissal and ARIA are UI SDK’s own, tested through @ui-sdk/core/testing — the bindings pass them through untouched. Read the full behavior notes in UI SDK’s docs:',
        ),
        h.ul([h.Class('list')], [
          ...entries.map(entry =>
            h.li([], [
              h.a([h.Href(entry.docsUrl), h.Class('link'), h.Attribute('target', '_blank')], [
                `${entry.namespace} · UI SDK docs`,
              ]),
            ]),
          ),
        ]),
        sectionLink('See it in the showcase', 'Showcase'),
        h.a(
          [
            h.Href(
              sinkUrl({
                uses: firstUse === undefined ? Option.none() : Option.some([firstUse]),
                mode: Option.none(),
                only: Option.none(),
              }),
            ),
            h.Class('btn'),
          ],
          ['Open it in the Sink'],
        ),
      ]
    }

    return [
      h.div([h.Class('docs-layout')], [
        sidebar,
        h.div([h.Class('docs-main')], [
          ...(guides.some(guide => guide.slug === doc)
            ? guideArticle(doc)
            : demoArticle(doc)),
        ]),
      ]),
    ]
  }

  // SHOWCASE — every demo on one page, each holding its state in the Model.

  const showcaseView = (): PageHtml => [
    h.section([h.Class('section')], [
      h.h1([h.Class('page-h')], ['Showcase']),
      h.p([h.Class('prose-p')], [
        'UI SDK’s Web Components, bound to a Foldkit app. Every control on this page holds its state in the Model behind it, through the same CustomElement.define seam the docs describe.',
      ]),
      h.p([h.Class('meta')], [
        `UI SDK ${uiSdkVersion} · ${components.length} entries · click, drag and type anywhere`,
      ]),
    ]),
    h.div([h.Class('grid')], [
      ...demos.map(demo =>
        h.section([h.Class('card')], [
          h.h3([], [demo.title]),
          h.p([h.Class('card-note')], [demo.note]),
          h.div([h.Class('card-demo')], demo.render(model, h)),
        ]),
      ),
    ]),
    h.footer([h.Class('footer')], [
      h.span([], ['foldkit-ui-sdk · a binding layer, not a reimplementation · ']),
      h.a([h.Href('https://ui-sdk.dev'), h.Class('link')], ['UI SDK']),
      h.span([], [' behaviors, ']),
      h.a([h.Href('https://foldkit.dev'), h.Class('link')], ['Foldkit']),
      h.span([], [' runtime']),
    ]),
  ]

  // SINK — the route carries the filter; the tiles carry their state slices.

  const sinkView = (): PageHtml => {
    const sink = model.route
    return sink._tag === 'Sink' ? renderSink(model, h, sink) : []
  }

  // NOT FOUND — every unmatched path lands here, with the way back.

  const notFoundView = (path: string): PageHtml => [
    h.section([h.Class('section')], [
      h.h1([h.Class('page-h')], ['Page not found']),
      h.p([h.Class('prose-p')], [
        `No route matches ${path}. This site routes /, /docs/:doc, /showcase, /sink, /agents and /components.`,
      ]),
      sectionLink('Back to the home page', 'Home', true),
    ]),
  ]

  // Each route arm delegates to its own view function, so the differ treats
  // a navigation as a fresh page rather than a patch.

  const page = AppRoute.match(model.route, {
    Home: () => homeView(),
    Docs: ({ doc }) => docsView(doc),
    Showcase: () => showcaseView(),
    Sink: () => sinkView(),
    NotFound: ({ path }) => notFoundView(path),
  })

  const title =
    model.route._tag === 'Docs'
      ? `foldkit-ui-sdk — ${findDemo(model.route.doc)?.title ?? model.route.doc}`
      : model.route._tag === 'NotFound'
        ? 'foldkit-ui-sdk — not found'
        : `foldkit-ui-sdk — ${model.route._tag.toLowerCase()}`

  return {
    title,
    body: h.div([], [
      nav,
      h.main([h.Class(model.route._tag === 'Sink' ? 'main main-sink' : 'main')], page),
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
