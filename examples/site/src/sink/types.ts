import type { Html, HtmlBuilder } from 'foldkit/html'

import type { Message, Model } from '../model'

/** How much of the grid a tile takes: one cell, two columns, two rows, or two by two. */
export type TileSize = 's' | 'wide' | 'tall' | 'large'

/** The tile's ground. Demos read `--tile-*` variables, so they work on every tone. */
export type TileTone =
  | 'white'
  | 'paper'
  | 'ink'
  | 'blueprint'
  | 'signal'
  | 'sage'
  | 'sky'
  | 'butter'

/**
 * What a tile's demo sees. `state` is the tile's own slice of the Model,
 * `set` writes it back through `SinkTileStateSet`, and `h` is the app builder:
 * every handler dispatches into the site's Message universe.
 */
export type TileContext<S> = Readonly<{
  state: S
  set: (next: S | ((current: S) => S)) => Message
  h: HtmlBuilder<Message>
  model: Model
}>

/**
 * A ported sink tile. `initial` seeds the Model slice the first time the tile
 * renders; after that the slice lives in `model.sinkTiles[id]`.
 */
export type Tile<S = any> = Readonly<{
  /** Unique, kebab-case, prefixed by its file: "forms-checkout". */
  id: string
  /** The bold run-in lead, one to four words ending with a period. */
  title: string
  /** The gray continuation: one short sentence. */
  blurb?: string
  size?: TileSize
  tone?: TileTone
  initial: S
  render: (context: TileContext<S>) => Html | ReadonlyArray<Html | string>
}>

/** A tile after the registry has attached the names its code uses. */
export type TaggedTile = Tile & Readonly<{ uses: ReadonlyArray<string> }>
