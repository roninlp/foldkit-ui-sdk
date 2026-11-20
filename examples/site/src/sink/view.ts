import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { Message, type Model } from '../model'
import type { SinkRoute } from '../route'
import { groupOf, tiles } from './registry'
import type { TaggedTile } from './types'

/** Which tiles the `?only=` pool keeps. A tile id or a group name both work. */
const poolOf = (only: ReadonlyArray<string>) =>
  only.length === 0
    ? tiles
    : tiles.filter(
        tile => only.includes(tile.id) || only.includes(groupOf.get(tile.id) ?? ''),
      )

const matches = (
  tile: TaggedTile,
  uses: ReadonlyArray<string>,
  mode: string,
) => {
  if (uses.length === 0) return true
  if (mode === 'all') return uses.every(name => tile.uses.includes(name))
  return uses.some(name => tile.uses.includes(name))
}

const useChip = (
  name: string,
  selected: ReadonlySet<string>,
  h: HtmlBuilder<Message>,
) => {
  const pressed = selected.has(name)
  return h.button(
    [
      h.Type('button'),
      h.Class('tile-use'),
      ...(pressed ? [h.Attribute('data-pressed', '')] : []),
      h.OnClick(Message.SinkToggleUse({ name, pressed: !pressed })),
    ],
    [name],
  )
}

const tileView = (
  tile: TaggedTile,
  model: Model,
  h: HtmlBuilder<Message>,
  selected: ReadonlySet<string>,
  visible: boolean,
) => {
  const state =
    (model.sinkTiles[tile.id] as unknown) ?? tile.initial
  const set = (next: unknown | ((current: unknown) => unknown)) =>
    Message.SinkTileStateSet({
      tileId: tile.id,
      state: typeof next === 'function' ? next(state) : next,
    })

  let stage: ReadonlyArray<Html | string>
  try {
    const rendered = tile.render({
      state,
      set,
      h,
      model,
    })
    stage = Array.isArray(rendered) ? rendered : [rendered]
  } catch (error) {
    stage = [
      h.p(
        [h.Class('tile-error'), h.Attribute('role', 'alert')],
        [
          `tile failed: ${error instanceof Error ? error.message : String(error)}`,
        ],
      ),
    ]
  }

  return h.article(
    [
      h.Id(tile.id),
      h.Class('tile'),
      h.DataAttribute('size', tile.size ?? 's'),
      h.DataAttribute('tone', tile.tone ?? 'white'),
      ...(visible ? [] : [h.Hidden(true)]),
    ],
    [
      h.div([h.Class('tile-stage')], stage),
      h.footer([h.Class('tile-copy')], [
        h.p([h.Class('tile-title')], [
          h.strong([], [tile.title]),
          tile.blurb ? ` ${tile.blurb}` : '',
        ]),
        h.div([h.Class('tile-uses'), h.Attribute('aria-label', 'Uses')], [
          ...tile.uses.map(name => useChip(name, selected, h)),
        ]),
      ]),
    ],
  )
}

const filterBar = (
  model: Model,
  h: HtmlBuilder<Message>,
  sink: SinkRoute,
  shown: number,
) => {
  const selected = Option.getOrElse(sink.uses, () => [])
  const mode = Option.getOrElse(sink.mode, () => 'any' as const)
  const names = [...selected]
  const open = selected.length > 0
  return h.section(
    [
      h.Class('filter'),
      h.Attribute('aria-label', 'Filters'),
      ...(open ? [h.Attribute('data-open', '')] : []),
      h.Inert(!open),
    ],
    [
      h.p([h.Class('filter-count'), h.Attribute('aria-live', 'polite')], [
        open ? `${shown} ${shown === 1 ? 'tile' : 'tiles'}` : '',
      ]),
      h.ul(
        [h.Class('filter-names')],
        names.map(name =>
          h.li([], [
            h.button(
              [
                h.Type('button'),
                h.Class('filter-name'),
                h.Attribute('aria-label', `Remove ${name}`),
                h.OnClick(Message.SinkToggleUse({ name, pressed: false })),
              ],
              [
                name,
                h.i(
                  [
                    h.Class('ph-bold ph-x'),
                    h.Style({ fontSize: '11px' }),
                    h.Attribute('aria-hidden', 'true'),
                  ],
                  [],
                ),
              ],
            ),
          ]),
        ),
      ),
      open && selected.length > 1
        ? h.div(
            [
              h.Class('filter-mode'),
              h.Attribute('role', 'radiogroup'),
              h.Attribute('aria-label', 'Match'),
            ],
            [
              h.button(
                [
                  h.Type('button'),
                  h.Attribute('role', 'radio'),
                  ...(mode === 'any'
                    ? [h.Attribute('aria-checked', 'true'), h.Attribute('data-checked', '')]
                    : [h.Attribute('aria-checked', 'false')]),
                  h.OnClick(Message.SinkModeSet({ mode: 'any' })),
                ],
                ['Any'],
              ),
              h.button(
                [
                  h.Type('button'),
                  h.Attribute('role', 'radio'),
                  ...(mode === 'all'
                    ? [h.Attribute('aria-checked', 'true'), h.Attribute('data-checked', '')]
                    : [h.Attribute('aria-checked', 'false')]),
                  h.OnClick(Message.SinkModeSet({ mode: 'all' })),
                ],
                ['All'],
              ),
            ],
          )
        : '',
      h.button(
        [
          h.Type('button'),
          h.Class('filter-clear'),
          h.OnClick(Message.SinkClearUses()),
        ],
        ['Clear filters'],
      ),
    ],
  )
}

export const renderSink = (
  model: Model,
  h: HtmlBuilder<Message>,
  // The filter is route state: the Sink route the URL parsed to carries the
  // `?only=` / `?uses=` / `?mode=` keys, so a shared link and the page it
  // opens can never disagree.
  sink: SinkRoute,
): ReadonlyArray<Html | string> => {
  const only = Option.getOrElse(sink.only, () => [])
  const uses = Option.getOrElse(sink.uses, () => [])
  const mode = Option.getOrElse(sink.mode, () => 'any' as const)
  const pool = poolOf(only)
  const shownTiles = pool.filter(tile => matches(tile, uses, mode))
  const visibleIds = new Set(shownTiles.map(tile => tile.id))

  return [
    h.div([h.Class('sink')], [
      h.h1([h.Class('sr-only')], ['ui-sdk sink']),
      h.main([h.Class('bento')], [
        ...pool.map(tile =>
          tileView(tile, model, h, new Set(uses), visibleIds.has(tile.id)),
        ),
        shownTiles.length === 0
          ? h.p([h.Class('bento-empty')], ['No tile uses all of those together.'])
          : '',
      ]),
      filterBar(model, h, sink, shownTiles.length),
    ]),
  ]
}
