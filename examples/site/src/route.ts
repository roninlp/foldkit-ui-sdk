import { Option, Schema, SchemaGetter, pipe } from 'effect'
import { Route } from 'foldkit'
import { defineRouteUnion, literal, slash, string } from 'foldkit/route'

// ROUTE — defined once, used both ways: the same routers parse the address
// bar into an AppRoute and build URLs back from one, so links and the URL
// cannot drift apart. This is the bidirectional routing the Foldkit docs
// prescribe (https://foldkit.dev/core/routing-and-navigation).

export const sinkModes = ['any', 'all'] as const
export type SinkMode = (typeof sinkModes)[number]

export const AppRoute = defineRouteUnion({
  Home: {},
  // The docs article being read: a guide slug or a component demo slug.
  Docs: { doc: Schema.String },
  Showcase: {},
  // The sink's shareable filter rides in the query string, so every filter
  // state has a URL. Absent keys parse to Option.none().
  Sink: {
    uses: Schema.Option(Schema.Array(Schema.String)),
    mode: Schema.Option(Schema.Literals([...sinkModes])),
    only: Schema.Option(Schema.Array(Schema.String)),
  },
  NotFound: { path: Schema.String },
})
export type AppRoute = typeof AppRoute.Type
export type SinkRoute = typeof AppRoute.Sink.Type

// ROUTERS

const homeRouter = pipe(Route.root, Route.mapTo(AppRoute.Home))
const docsRouter = pipe(literal('docs'), slash(string('doc')), Route.mapTo(AppRoute.Docs))
const showcaseRouter = pipe(literal('showcase'), Route.mapTo(AppRoute.Showcase))

// A comma-separated query value, decoded to a list and encoded back. Building
// from an empty list would emit `?uses=`, so callers pass Option.none() for
// "absent" instead.
const CommaList = pipe(
  Schema.String,
  Schema.decodeTo(Schema.Array(Schema.String), {
    decode: SchemaGetter.transform(value =>
      value.split(',').map(part => part.trim()).filter(Boolean),
    ),
    encode: SchemaGetter.transform(list => list.join(',')),
  }),
)

export const sinkRouter = pipe(
  literal('sink'),
  Route.query(
    Schema.Struct({
      uses: Schema.OptionFromOptional(CommaList),
      mode: Schema.OptionFromOptional(Schema.Literals([...sinkModes])),
      only: Schema.OptionFromOptional(CommaList),
    }),
  ),
  Route.mapTo(AppRoute.Sink),
)

// A router only matches when it consumes the whole URL, so these never
// conflict regardless of order. Unmatched paths fall through to NotFound.
const routeParser = Route.oneOf(
  docsRouter,
  showcaseRouter,
  sinkRouter,
  homeRouter,
)

/** Parses any URL into an AppRoute, with `NotFound` as the fallback. */
export const urlToAppRoute = Route.parseUrlWithFallback(routeParser, AppRoute.NotFound)

// URL BUILDERS — the top navigation's sections, one per route tag except
// NotFound. The SegmentedControl reports these back, and the update turns
// them into a NavigateInternal command.

export const sections = ['Home', 'Docs', 'Showcase', 'Sink'] as const
export type Section = (typeof sections)[number]

export const homeUrl = (): string => homeRouter()
export const docsUrl = (doc: string): string => docsRouter({ doc })
export const showcaseUrl = (): string => showcaseRouter()
export const sinkUrl = (filter: {
  uses: Option.Option<ReadonlyArray<string>>
  mode: Option.Option<SinkMode>
  only: Option.Option<ReadonlyArray<string>>
}): string => sinkRouter(filter)

export const sectionUrl = (section: Section): string =>
  section === 'Home'
    ? homeUrl()
    : section === 'Docs'
      ? docsUrl('introduction')
      : section === 'Showcase'
        ? showcaseUrl()
        : sinkUrl({
            uses: Option.none(),
            mode: Option.none(),
            only: Option.none(),
          })

/** The section a route belongs to, for highlighting the top navigation. */
export const sectionOf = (route: AppRoute): Section | null =>
  AppRoute.isAnyOf(['Home', 'Docs', 'Showcase', 'Sink'])(route)
    ? (route._tag as Section)
    : null
