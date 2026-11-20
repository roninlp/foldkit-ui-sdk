import { Effect, Option, Queue, Stream } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import type { MountAction } from 'foldkit/mount'

import {
  bindDrag,
  bindDragPreview,
  createAutoScroll,
  dragThreshold,
  isSpanFree,
  stackSpans,
  type Span,
} from '@ui-sdk/core'
import {
  createVelocityTracker,
  projectDistance,
  rubberBand,
  sectorOf,
  solveSpring,
} from '@ui-sdk/core/gesture'
import { clamp } from '@ui-sdk/core/number'

import { Resizable } from 'foldkit-ui-sdk'

import type { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './motion.css'

/* Shared helpers */

const icon = (
  h: HtmlBuilder<Message>,
  name: string,
  weight: 'regular' | 'fill' | 'bold' = 'regular',
  size = 16,
) =>
  h.i(
    [
      h.Class(`ph${weight === 'regular' ? '' : `-${weight}`} ph-${name}`),
      h.Style({ fontSize: `${size}px` }),
      h.Attribute('aria-hidden', 'true'),
    ],
    [],
  )

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Point = { x: number; y: number }

/** Runs a 2D spring from `from` to `to`, calling `paint` each frame. */
const runSpring = (
  from: Point,
  to: Point,
  velocity: Point,
  paint: (point: Point) => void,
  done?: () => void,
  { response = 0.42, damping = 0.7, tolerance = 0.4 } = {},
) => {
  if (reduced()) {
    paint(to)
    done?.()
    return () => {}
  }
  const sx = solveSpring(response, damping, from.x - to.x, velocity.x)
  const sy = solveSpring(response, damping, from.y - to.y, velocity.y)
  const start = performance.now()
  let frame = 0
  const tick = (now: number) => {
    const t = now - start
    const x = sx.position(t)
    const y = sy.position(t)
    const still =
      Math.abs(x) < tolerance &&
      Math.abs(y) < tolerance &&
      Math.abs(sx.velocity(t)) < 0.05 * tolerance &&
      Math.abs(sy.velocity(t)) < 0.05 * tolerance
    if (still) {
      paint(to)
      done?.()
      return
    }
    paint({ x: to.x + x, y: to.y + y })
    frame = requestAnimationFrame(tick)
  }
  frame = requestAnimationFrame(tick)
  return () => cancelAnimationFrame(frame)
}

/**
 * PORT NOTE: Foldkit's `OnMount` runs once per element, while the tile's
 * `set` closes over the state of the render that created it. Gestures need
 * the newest state, so every render registers its slice here and the mount
 * listeners read it when they fire.
 */
type Setter = (next: any) => Message
type LiveEntry = Readonly<{ state: any; set: Setter }>

const lives = new Map<string, LiveEntry>()

const bindLive = <S,>(tileId: string, state: S, set: Setter) => {
  lives.set(tileId, { state, set })
}

const readLive = <S,>(tileId: string) => {
  const found = lives.get(tileId)
  if (!found) {
    throw new Error(`motion tile ${tileId} is not mounted`)
  }
  return found as { state: S; set: Setter }
}

type Update<S> = (next: S | ((current: S) => S)) => void

/** A mount that installs native listeners and forwards Messages into runtime. */
const mountTile = <S,>(
  name: string,
  tileId: string,
  setup: (element: HTMLElement, update: Update<S>) => () => void,
): MountAction<Message> => ({
  name,
  f: element =>
    Stream.callback<Message>(queue => {
      /**
       * PORT NOTE: Foldkit renders on the next animation frame, but several
       * pointer messages can arrive before that frame. The registry keeps the
       * optimistic Model slice so successive Messages compose instead of each
       * one overwriting the other from a stale render.
       */
      const update: Update<S> = next => {
        const live = readLive<S>(tileId)
        const state =
          typeof next === 'function' ? (next as (current: S) => S)(live.state) : next
        lives.set(tileId, { state, set: live.set })
        Queue.offerUnsafe(queue, live.set(state))
      }
      return Effect.acquireRelease(
        Effect.sync(() => setup(element as HTMLElement, update)),
        cleanup => Effect.sync(cleanup),
      ).pipe(Effect.andThen(Effect.never))
    }),
})

const listen = <K extends keyof HTMLElementEventMap>(
  target: HTMLElement | Document | Window,
  type: K,
  handler: (event: HTMLElementEventMap[K]) => void,
  options?: AddEventListenerOptions,
) => {
  const listener = handler as EventListener
  target.addEventListener(type, listener, options)
  return () => target.removeEventListener(type, listener, options)
}

const observeSize = (
  element: HTMLElement,
  write: (size: { w: number; h: number }) => void,
) => {
  const observer = new ResizeObserver(() =>
    write({ w: element.clientWidth, h: element.clientHeight }),
  )
  observer.observe(element)
  write({ w: element.clientWidth, h: element.clientHeight })
  return () => observer.disconnect()
}

let uid = 0
const nextId = (prefix: string) => `${prefix}-${++uid}`

/* 1. Canvas: viewport, movable nodes and connections */

const FLOW_NODES: Record<
  string,
  { title: string; kind: string; icon: string; ports: ReadonlyArray<'in' | 'out'> }
> = {
  brief: { title: 'Creative brief', kind: 'Doc', icon: 'file-text', ports: ['out'] },
  mood: { title: 'Moodboard', kind: 'Board', icon: 'lightbulb', ports: ['in', 'out'] },
  wire: { title: 'Wireframes', kind: 'Frames', icon: 'pen-nib', ports: ['in', 'out'] },
  handoff: { title: 'Hand-off', kind: 'Package', icon: 'package', ports: ['in'] },
}
const FLOW_NODE = { w: 156, h: 52 }

type FlowEdge = { from: string; to: string }
type FlowState = {
  vp: { x: number; y: number; zoom: number }
  size: { w: number; h: number }
  positions: Record<string, Point>
  edges: FlowEdge[]
  connecting: { from: string; x: number; y: number; to: string | null } | null
  dragging: string | null
}

const flowInitial: FlowState = {
  vp: { x: 0, y: 0, zoom: 1 },
  size: { w: 260, h: 180 },
  positions: {
    brief: { x: 0, y: 136 },
    mood: { x: 216, y: 16 },
    wire: { x: 216, y: 256 },
    handoff: { x: 432, y: 136 },
  },
  edges: [
    { from: 'brief:out', to: 'mood:in' },
    { from: 'brief:out', to: 'wire:in' },
    { from: 'mood:out', to: 'handoff:in' },
  ],
  connecting: null,
  dragging: null,
}

const portPoint = (port: string, at: Record<string, Point>): Point => {
  const [node, side] = port.split(':')
  const p = at[node] ?? { x: 0, y: 0 }
  return { x: p.x + (side === 'out' ? FLOW_NODE.w : 0), y: p.y + FLOW_NODE.h / 2 }
}

const curve = (a: Point, b: Point) => {
  const bend = Math.max(40, Math.abs(b.x - a.x) / 2)
  return `M${a.x},${a.y} C${a.x + bend},${a.y} ${b.x - bend},${b.y} ${b.x},${b.y}`
}

const fitCanvas = (
  size: { w: number; h: number },
  positions: Record<string, Point>,
) => {
  const all = Object.values(positions)
  if (all.length === 0) return { x: 0, y: 0, zoom: 1 }
  const left = Math.min(...all.map(p => p.x))
  const top = Math.min(...all.map(p => p.y))
  const right = Math.max(...all.map(p => p.x)) + FLOW_NODE.w
  const bottom = Math.max(...all.map(p => p.y)) + FLOW_NODE.h
  const w = right - left || 1
  const h = bottom - top || 1
  const fit = Math.min((size.w - 56) / w, (size.h - 56) / h, 1)
  const zoom = clamp(fit, 0.7, 2)
  return {
    x: (size.w - w * zoom) / 2 - left * zoom,
    y: (size.h - h * zoom) / 2 - top * zoom,
    zoom,
  }
}

// PORT NOTE: pan/zoom/node moves are driven by native pointer listeners installed
// in OnMount, so the Model stays the source of truth while bindDrag follows the
// pointer. The reference's "C" shortcut for starting a connection is not ported;
// dragging from a port covers the same gesture.
const flowView = ({ state, set, h }: TileContext<FlowState>) => {
  bindLive('motion-canvas', state, set)
  const at = state.positions
  const connecting = state.connecting
  const roleOf = (key: string) => {
    if (!connecting) return undefined
    if (connecting.from === key) return 'source'
    if (connecting.to === key) return 'target'
    return undefined
  }
  const zoomBy = (factor: number) =>
    set(current => {
      const zoom = clamp(current.vp.zoom * factor, 0.4, 2)
      const k = zoom / current.vp.zoom
      const cx = current.size.w / 2
      const cy = current.size.h / 2
      return {
        ...current,
        vp: {
          zoom,
          x: cx - (cx - current.vp.x) * k,
          y: cy - (cy - current.vp.y) * k,
        },
      }
    })

  return h.div([h.Class('mo-fill')], [
    h.div([h.Class('mo-flow-frame')], [
      h.div(
        [
          h.Class('mo-flow'),
          h.Attribute('role', 'application'),
          h.Attribute('aria-label', 'Design pipeline canvas'),
          h.Attribute('aria-roledescription', 'canvas'),
          h.Tabindex(0),
          h.OnMount(
            mountTile<FlowState>('MotionCanvas', 'motion-canvas', (root, update) => {
              const cleanups: Array<() => void> = []
              let stopDrag: (() => void) | undefined
              let measured = false
              cleanups.push(
                observeSize(root, size => {
                  update(current => {
                    const first = !measured
                    measured = true
                    if (
                      !first &&
                      current.size.w === size.w &&
                      current.size.h === size.h
                    ) {
                      return current
                    }
                    const refit = first || current.size.w < 40 || current.size.h < 40
                    return {
                      ...current,
                      size,
                      ...(refit ? { vp: fitCanvas(size, current.positions) } : {}),
                    }
                  })
                }),
              )

              const canvasPoint = (clientX: number, clientY: number) => {
                const rect = root.getBoundingClientRect()
                const current = readLive<FlowState>('motion-canvas').state
                return {
                  x: (clientX - rect.left - current.vp.x) / current.vp.zoom,
                  y: (clientY - rect.top - current.vp.y) / current.vp.zoom,
                }
              }

              cleanups.push(
                listen(
                  root,
                  'wheel',
                  (event: WheelEvent) => {
                    event.preventDefault()
                    const rect = root.getBoundingClientRect()
                    const mx = event.clientX - rect.left
                    const my = event.clientY - rect.top
                    update(current => {
                      const zoom = clamp(
                        current.vp.zoom * Math.exp(-event.deltaY * 0.0015),
                        0.4,
                        2,
                      )
                      const k = zoom / current.vp.zoom
                      return {
                        ...current,
                        vp: {
                          zoom,
                          x: mx - (mx - current.vp.x) * k,
                          y: my - (my - current.vp.y) * k,
                        },
                      }
                    })
                  },
                  { passive: false },
                ),
              )

              cleanups.push(
                listen(root, 'pointerdown', (event: PointerEvent) => {
                  if (event.button !== 0) return
                  const target = event.target as Element | null
                  if (!target) return
                  const port = target.closest('[data-port]') as HTMLElement | null
                  const nodeEl = target.closest('[data-node]') as HTMLElement | null
                  stopDrag?.()

                  if (port && nodeEl) {
                    const from = `${nodeEl.dataset.node}:${port.dataset.port}`
                    const start = canvasPoint(event.clientX, event.clientY)
                    update(current => ({
                      ...current,
                      connecting: { from, x: start.x, y: start.y, to: null },
                    }))
                    stopDrag = bindDrag(root, event, {
                      onMove: sample => {
                        const point = canvasPoint(sample.x, sample.y)
                        const hit = document
                          .elementFromPoint(sample.x, sample.y)
                          ?.closest('[data-port]') as HTMLElement | null
                        const hitNode = hit?.closest('[data-node]') as HTMLElement | null
                        const to =
                          hit && hitNode
                            ? `${hitNode.dataset.node}:${hit.dataset.port}`
                            : null
                        const valid =
                          !!to &&
                          from.endsWith(':out') &&
                          to.endsWith(':in') &&
                          to.split(':')[0] !== from.split(':')[0]
                        update(current => ({
                          ...current,
                          connecting: {
                            from,
                            x: point.x,
                            y: point.y,
                            to: valid ? to : null,
                          },
                        }))
                      },
                      onEnd: (_event, canceled) => {
                        const current = readLive<FlowState>('motion-canvas').state
                        const to = current.connecting?.to ?? null
                        update(latest => {
                          if (!canceled && to) {
                            const exists = latest.edges.some(
                              edge => edge.from === from && edge.to === to,
                            )
                            return {
                              ...latest,
                              edges: exists
                                ? latest.edges.filter(
                                    edge => !(edge.from === from && edge.to === to),
                                  )
                                : [...latest.edges, { from, to }],
                              connecting: null,
                            }
                          }
                          return { ...latest, connecting: null }
                        })
                        stopDrag = undefined
                      },
                    })
                    return
                  }

                  if (nodeEl) {
                    const key = nodeEl.dataset.node ?? ''
                    const start = readLive<FlowState>('motion-canvas').state.positions[key]
                    if (!start) return
                    const origin = { x: event.clientX, y: event.clientY }
                    update(current => ({ ...current, dragging: key }))
                    stopDrag = bindDrag(root, event, {
                      onMove: sample =>
                        update(current => ({
                          ...current,
                          positions: {
                            ...current.positions,
                            [key]: {
                              x: start.x + (sample.x - origin.x) / current.vp.zoom,
                              y: start.y + (sample.y - origin.y) / current.vp.zoom,
                            },
                          },
                        })),
                      onEnd: () => {
                        update(current => ({ ...current, dragging: null }))
                        stopDrag = undefined
                      },
                    })
                    return
                  }

                  if (target !== root) return
                  const startVp = readLive<FlowState>('motion-canvas').state.vp
                  const origin = { x: event.clientX, y: event.clientY }
                  stopDrag = bindDrag(root, event, {
                    onMove: sample =>
                      update(current => ({
                        ...current,
                        vp: {
                          ...current.vp,
                          x: startVp.x + sample.x - origin.x,
                          y: startVp.y + sample.y - origin.y,
                        },
                      })),
                    onEnd: () => {
                      stopDrag = undefined
                    },
                  })
                }),
              )

              return () => {
                stopDrag?.()
                cleanups.forEach(cleanup => cleanup())
              }
            }),
          ),
        ],
        [
          h.div(
            [
              h.Style({
                position: 'absolute',
                left: '0',
                top: '0',
                transform: `translate(${state.vp.x}px, ${state.vp.y}px) scale(${state.vp.zoom})`,
                transformOrigin: '0 0',
              }),
            ],
            [
              h.svg([h.Class('mo-flow-edges'), h.Attribute('aria-hidden', 'true')], [
                ...state.edges.map(edge =>
                  h.path(
                    [
                      h.Attribute('d', curve(portPoint(edge.from, at), portPoint(edge.to, at))),
                    ],
                    [],
                  ),
                ),
                connecting
                  ? h.path(
                      [
                        h.Attribute('data-draft', ''),
                        h.Attribute(
                          'd',
                          curve(
                            portPoint(connecting.from, at),
                            connecting.to
                              ? portPoint(connecting.to, at)
                              : { x: connecting.x, y: connecting.y },
                          ),
                        ),
                      ],
                      [],
                    )
                  : '',
              ]),
              ...Object.entries(FLOW_NODES).map(([key, node]) => {
                const p = state.positions[key] ?? { x: 0, y: 0 }
                const links = state.edges.filter(
                  edge =>
                    edge.from.startsWith(`${key}:`) || edge.to.startsWith(`${key}:`),
                ).length
                return h.div(
                  [
                    h.Class('mo-flow-node'),
                    h.Attribute('role', 'button'),
                    h.Attribute('aria-roledescription', 'node'),
                    h.Attribute(
                      'aria-label',
                      `${node.title}, ${links} ${links === 1 ? 'connection' : 'connections'}`,
                    ),
                    h.Attribute(
                      'aria-keyshortcuts',
                      node.ports.includes('out')
                        ? 'Alt+ArrowRight C'
                        : 'Alt+ArrowRight',
                    ),
                    h.Tabindex(0),
                    h.DataAttribute('node', key),
                    ...(state.dragging === key ? [h.DataAttribute('dragging', '')] : []),
                    h.Style({
                      left: `${p.x}px`,
                      top: `${p.y}px`,
                      width: `${FLOW_NODE.w}px`,
                      height: `${FLOW_NODE.h}px`,
                    }),
                    h.OnKeyDownPreventDefault((pressed, modifiers) => {
                      if (!modifiers.altKey) return Option.none()
                      const step = 8
                      const delta =
                        pressed === 'ArrowLeft'
                          ? { x: -step, y: 0 }
                          : pressed === 'ArrowRight'
                            ? { x: step, y: 0 }
                            : pressed === 'ArrowUp'
                              ? { x: 0, y: -step }
                              : pressed === 'ArrowDown'
                                ? { x: 0, y: step }
                                : null
                      if (!delta) return Option.none()
                      return Option.some(
                        set(current => ({
                          ...current,
                          positions: {
                            ...current.positions,
                            [key]: {
                              x: (current.positions[key]?.x ?? 0) + delta.x,
                              y: (current.positions[key]?.y ?? 0) + delta.y,
                            },
                          },
                        })),
                      )
                    }),
                  ],
                  [
                    h.span([h.Class('mo-flow-icon')], [icon(h, node.icon, 'fill')]),
                    h.span([h.Class('mo-flow-text')], [
                      h.span([h.Class('mo-flow-title')], [node.title]),
                      h.span([h.Class('mo-flow-kind')], [node.kind]),
                    ]),
                    ...node.ports.map(side => {
                      const key2 = `${key}:${side}`
                      const role = roleOf(key2)
                      return h.span(
                        [
                          h.Class('mo-port'),
                          h.DataAttribute('port', side),
                          h.Attribute('aria-hidden', 'true'),
                          ...(role ? [h.DataAttribute('connect', role)] : []),
                        ],
                        [],
                      )
                    }),
                  ],
                )
              }),
            ],
          ),
          h.p([h.Class('mo-flow-hint')], [
            'Drag from a port to connect · C on a node',
          ]),
          h.div([h.Class('mo-flow-tools')], [
            h.button(
              [
                h.Type('button'),
                h.Class('mo-tool'),
                h.Attribute('aria-label', 'Zoom out'),
                h.OnClick(zoomBy(0.8)),
              ],
              [icon(h, 'magnifying-glass-minus', 'bold')],
            ),
            h.span([h.Class('mo-zoom-readout')], [`${Math.round(state.vp.zoom * 100)}%`]),
            h.button(
              [
                h.Type('button'),
                h.Class('mo-tool'),
                h.Attribute('aria-label', 'Zoom in'),
                h.OnClick(zoomBy(1.25)),
              ],
              [icon(h, 'magnifying-glass-plus', 'bold')],
            ),
            h.button(
              [
                h.Type('button'),
                h.Class('mo-tool'),
                h.Attribute('aria-label', 'Fit to screen'),
                h.OnClick(
                  set(current => ({
                    ...current,
                    vp: fitCanvas(current.size, current.positions),
                  })),
                ),
              ],
              [icon(h, 'corners-out', 'bold')],
            ),
          ]),
        ],
      ),
    ]),
  ])
}

/* 2. Sortable layers */

const LAYERS: Record<string, { name: string; icon: string }> = {
  headline: { name: 'Sale headline', icon: 'text-t' },
  shot: { name: 'Product shot', icon: 'image' },
  badge: { name: 'Price badge', icon: 'seal-percent' },
  fill: { name: 'Gradient fill', icon: 'gradient' },
}

type LayerState = { order: string[]; focused: string | null; moving: string | null }

// PORT NOTE: the reference FLIP animation (measured offsets replayed with
// element.animate) is approximated by reordering the Model as the pointer
// crosses row midpoints; the CSS transitions on .mo-layer still run.
const layersView = ({ state, set, h }: TileContext<LayerState>) => {
  bindLive('motion-layers', state, set)
  return h.div([h.Class('mo-layers-wrap')], [
    h.ul(
      [
        h.Class('mo-layers'),
        h.Attribute('role', 'listbox'),
        h.Attribute('aria-label', 'Poster layers'),
        h.Attribute('aria-roledescription', 'sortable list'),
        h.OnMount(
          mountTile<LayerState>('MotionLayers', 'motion-layers', (root, update) => {
            let stop: (() => void) | undefined
            const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
              if (event.button !== 0) return
              const row = (event.target as Element | null)?.closest(
                '[data-layer]',
              ) as HTMLElement | null
              if (!row) return
              const key = row.dataset.layer ?? ''
              stop?.()
              update(current => ({ ...current, moving: key, focused: key }))
              stop = bindDrag(root, event, {
                threshold: 4,
                onMove: sample =>
                  update(current => {
                    const rows = [
                      ...root.querySelectorAll<HTMLElement>('[data-layer]'),
                    ]
                    let target = rows.length - 1
                    for (let index = 0; index < rows.length; index += 1) {
                      const rect = rows[index].getBoundingClientRect()
                      if (sample.y < rect.top + rect.height / 2) {
                        target = index
                        break
                      }
                    }
                    const from = current.order.indexOf(key)
                    if (from < 0 || from === target) return current
                    const order = [...current.order]
                    order.splice(from, 1)
                    order.splice(target, 0, key)
                    return { ...current, order }
                  }),
                onEnd: () => {
                  update(current => ({ ...current, moving: null }))
                  stop = undefined
                },
              })
            })
            return () => {
              stop?.()
              cleanup()
            }
          }),
        ),
      ],
      state.order.map(key => {
        const layer = LAYERS[key] ?? { name: key, icon: 'square' }
        const moving = state.moving === key
        return h.li(
          [
            h.Class('mo-layer'),
            h.Attribute('role', 'option'),
            h.Attribute('aria-roledescription', 'sortable layer'),
            h.Attribute('aria-selected', String(moving)),
            h.Tabindex(state.focused === key ? 0 : -1),
            h.DataAttribute('layer', key),
            h.DataAttribute('flip', key),
            ...(moving ? [h.DataAttribute('moving', ''), h.DataAttribute('grabbed', '')] : []),
            h.OnKeyDownPreventDefault((pressed, modifiers) => {
              void modifiers
              if (pressed === ' ') {
                return Option.some(
                  set(current => ({
                    ...current,
                    moving: current.moving === key ? null : key,
                    focused: key,
                  })),
                )
              }
              if (pressed !== 'ArrowUp' && pressed !== 'ArrowDown') {
                return Option.none()
              }
              return Option.some(
                set(current => {
                  const from = current.order.indexOf(key)
                  const to = clamp(
                    from + (pressed === 'ArrowUp' ? -1 : 1),
                    0,
                    current.order.length - 1,
                  )
                  if (from < 0 || from === to) return current
                  const order = [...current.order]
                  order.splice(from, 1)
                  order.splice(to, 0, key)
                  return { ...current, order, focused: key }
                }),
              )
            }),
          ],
          [
            h.i(
              [h.Class('ph-bold ph-dots-six-vertical mo-grip'), h.Style({ fontSize: '16px' })],
              [],
            ),
            h.span([h.Class('mo-layer-icon')], [icon(h, layer.icon, 'fill')]),
            h.span([h.Class('mo-layer-name')], [layer.name]),
          ],
        )
      }),
    ),
  ])
}

/* 3. Throw: velocity, projection and a spring */

const PLACES: Record<string, { name: string; kind: string }> = {
  graca: { name: 'Miradouro da Graça', kind: 'Viewpoint · Lisbon' },
  market: { name: 'Time Out Market', kind: 'Food hall · Lisbon' },
  lello: { name: 'Livraria Lello', kind: 'Bookshop · Porto' },
}

type ThrowState = {
  deck: string[]
  x: number
  y: number
  opacity: number
  dragging: boolean
}

// PORT NOTE: velocity, projection and spring math are the reference's own
// helpers. The card's continuous transform lives in the Model (one Message per
// frame) rather than in refs, because the Model must drive every repaint.
const throwView = ({ state, set, h }: TileContext<ThrowState>) => {
  bindLive('motion-throw', state, set)
  const deck = state.deck
  return h.div(
    [
      h.Class('mo-deck'),
      h.OnMount(
        mountTile<ThrowState>('MotionThrow', 'motion-throw', (root, update) => {
          let stop: (() => void) | undefined
          let cancelSpring: (() => void) | undefined
          const top = () => root.querySelector<HTMLElement>('[data-depth="0"]')

          const fling = (direction: number, velocity: Point) => {
            const place = top()
            const width = place?.parentElement?.clientWidth ?? 260
            const stage =
              (place?.closest('.tile-stage') as HTMLElement | null)?.clientWidth ?? 0
            const current = readLive<ThrowState>('motion-throw').state
            const from = Math.abs(current.x)
            const to = Math.max(width * 1.2, stage / 2 + width * 0.7)
            cancelSpring?.()
            cancelSpring = runSpring(
              { x: current.x, y: current.y },
              { x: direction * to, y: current.y + velocity.y * 80 },
              velocity,
              point =>
                update(latest => ({
                  ...latest,
                  x: point.x,
                  y: point.y,
                  opacity: clamp(1 - (Math.abs(point.x) - from) / (to - from), 0, 1),
                })),
              () =>
                update(latest => ({
                  ...latest,
                  deck: [...latest.deck.slice(1), latest.deck[0]],
                  x: 0,
                  y: 0,
                  opacity: 1,
                  dragging: false,
                })),
              { response: 0.42, damping: 1, tolerance: 12 },
            )
          }

          const cleanups: Array<() => void> = []
          cleanups.push(
            listen(root, 'pointerdown', (event: PointerEvent) => {
              if (event.button !== 0) return
              const place = (event.target as Element | null)?.closest(
                '[data-depth="0"]',
              )
              if (!place) return
              cancelSpring?.()
              const current = readLive<ThrowState>('motion-throw').state
              const start = { x: current.x, y: current.y }
              const origin = { x: event.clientX, y: event.clientY }
              const tx = createVelocityTracker()
              const ty = createVelocityTracker()
              tx.add(event.timeStamp, start.x)
              ty.add(event.timeStamp, start.y)
              update(latest => ({ ...latest, dragging: true }))
              stop?.()
              stop = bindDrag(root, event, {
                threshold: 2,
                cancelOnEscape: true,
                onMove: sample => {
                  const nx = start.x + sample.x - origin.x
                  const ny = start.y + sample.y - origin.y
                  tx.add(sample.event.timeStamp, nx)
                  ty.add(sample.event.timeStamp, ny)
                  update(latest => ({ ...latest, x: nx, y: ny }))
                },
                onEnd: (up, canceled) => {
                  stop = undefined
                  update(latest => ({ ...latest, dragging: false }))
                  const velocity = canceled
                    ? { x: 0, y: 0 }
                    : { x: tx.velocity(up.timeStamp), y: ty.velocity(up.timeStamp) }
                  const settled = readLive<ThrowState>('motion-throw').state
                  const landing = settled.x + projectDistance(velocity.x, 0.994)
                  const width = top()?.parentElement?.clientWidth ?? 260
                  if (!canceled && Math.abs(landing) > width * 0.55) {
                    fling(Math.sign(landing), velocity)
                  } else {
                    cancelSpring = runSpring(
                      { x: settled.x, y: settled.y },
                      { x: 0, y: 0 },
                      velocity,
                      point =>
                        update(latest => ({ ...latest, x: point.x, y: point.y })),
                      () => update(latest => ({ ...latest, x: 0, y: 0 })),
                    )
                  }
                },
              })
            }),
          )
          cleanups.push(
            listen(root, 'keydown', (event: KeyboardEvent) => {
              if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
              if (!(event.target as Element | null)?.closest('[data-depth="0"]')) return
              event.preventDefault()
              const direction = event.key === 'ArrowLeft' ? -1 : 1
              fling(direction, { x: direction * 2, y: 0 })
            }),
          )
          return () => {
            stop?.()
            cancelSpring?.()
            cleanups.forEach(cleanup => cleanup())
          }
        }),
      ),
    ],
    deck.map((id, depth) => {
      const place = PLACES[id] ?? { name: id, kind: '' }
      const topCard = depth === 0
      return h.div(
        [
          h.Class('mo-place'),
          h.DataAttribute('depth', String(depth)),
          h.Style({ '--depth': String(depth) }),
          h.Tabindex(topCard ? 0 : -1),
          ...(topCard ? [h.Attribute('role', 'button')] : []),
          ...(topCard
            ? []
            : [h.Attribute('aria-hidden', 'true')]),
          ...(topCard
            ? [
                h.Attribute(
                  'aria-label',
                  `${place.name}. Throw it, or press Left or Right to skip.`,
                ),
              ]
            : []),
          ...(topCard && state.dragging ? [h.DataAttribute('dragging', '')] : []),
          ...(topCard
            ? [
                h.Style({
                  translate: `${state.x}px ${state.y}px`,
                  rotate: `${state.x / 16}deg`,
                  opacity: String(state.opacity),
                }),
              ]
            : []),
        ],
        [
          h.span([h.Class('mo-place-map'), h.Attribute('aria-hidden', 'true')], [
            icon(h, 'map-pin', 'fill'),
          ]),
          h.span([h.Class('mo-place-name')], [place.name]),
          h.span([h.Class('mo-place-kind')], [place.kind]),
        ],
      )
    }),
  )
}

/* 4. Transfer: a two-column board */

const BOARD_CARDS: Record<string, { title: string; tag: string }> = {
  icons: { title: 'Export app icons', tag: 'Assets' },
  kerning: { title: 'Fix nav kerning', tag: 'Type' },
  legend: { title: 'Map legend colors', tag: 'Maps' },
  onboarding: { title: 'Onboarding flow v3', tag: 'Flows' },
}
const BOARD_COLUMNS: Record<string, string> = {
  backlog: 'Backlog',
  week: 'This week',
}

type BoardList = keyof typeof BOARD_COLUMNS
type BoardState = {
  lists: Record<BoardList, string[]>
  dragging: string | null
}

// PORT NOTE: a card drops at the end of the hovered column; the reference
// computes an insertion index from the pointer. Dropping the preview is the
// observable behavior that matters for the demo.
const boardView = ({ state, set, h }: TileContext<BoardState>) => {
  bindLive('motion-board', state, set)
  return h.div(
    [
      h.Class('mo-board'),
      h.OnMount(
        mountTile<BoardState>('MotionBoard', 'motion-board', (root, update) => {
          let stop: (() => void) | undefined
          const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
            if (event.button !== 0) return
            const card = (event.target as Element | null)?.closest(
              '[data-card]',
            ) as HTMLElement | null
            if (!card) return
            if ((event.target as Element | null)?.closest('button')) return
            const key = card.dataset.card ?? ''
            const lists = readLive<BoardState>('motion-board').state.lists
            const fromList = (Object.keys(BOARD_COLUMNS) as BoardList[]).find(list =>
              lists[list].includes(key),
            )
            if (!fromList) return
            let preview: ReturnType<typeof bindDragPreview> | undefined
            let target: BoardList | null = null
            stop?.()
            stop = bindDrag(root, event, {
              threshold: 4,
              cancelOnEscape: true,
              onStart: () => {
                preview = bindDragPreview(card, { x: event.clientX, y: event.clientY })
                card.setAttribute('data-dragging', '')
                update(current => ({ ...current, dragging: key }))
              },
              onMove: sample => {
                preview?.move(sample.x, sample.y)
                const column = document
                  .elementFromPoint(sample.x, sample.y)
                  ?.closest('[data-list]') as HTMLElement | null
                target =
                  column && root.contains(column)
                    ? (column.dataset.list as BoardList)
                    : null
              },
              onEnd: (_up, canceled) => {
                preview?.remove()
                card.removeAttribute('data-dragging')
                update(current => {
                  const next: Record<BoardList, string[]> = {
                    backlog: [...current.lists.backlog],
                    week: [...current.lists.week],
                  }
                  if (!canceled && target && target !== fromList) {
                    next[fromList] = next[fromList].filter(item => item !== key)
                    next[target] = [...next[target], key]
                  }
                  return { ...current, lists: next, dragging: null }
                })
                stop = undefined
              },
            })
          })
          return () => {
            stop?.()
            cleanup()
          }
        }),
      ),
    ],
    (Object.keys(BOARD_COLUMNS) as BoardList[]).map(list =>
      h.section([h.Class('mo-col')], [
        h.header([h.Class('mo-col-head')], [
          h.span([], [BOARD_COLUMNS[list]]),
          h.span([h.Class('mo-col-count')], [String(state.lists[list].length)]),
        ]),
        h.div(
          [
            h.Class('mo-col-list'),
            h.Attribute('role', 'list'),
            h.Attribute('aria-label', BOARD_COLUMNS[list]),
            h.DataAttribute('list', list),
          ],
          state.lists[list].map(key => {
            const card = BOARD_CARDS[key] ?? { title: key, tag: '' }
            return h.div(
              [
                h.Class('mo-card'),
                h.Attribute('role', 'listitem'),
                h.Tabindex(0),
                h.Attribute('aria-roledescription', 'draggable card'),
                h.DataAttribute('card', key),
                h.DataAttribute('flip', key),
                ...(state.dragging === key
                  ? [h.DataAttribute('moving', ''), h.DataAttribute('dragging', '')]
                  : []),
                h.OnKeyDown((pressed, modifiers) => {
                  if (pressed !== 'ArrowLeft' && pressed !== 'ArrowRight') {
                    return set(current => current)
                  }
                  return set(current => {
                    const lists = readLists(current.lists)
                    const from = (Object.keys(BOARD_COLUMNS) as BoardList[]).find(
                      list => lists[list].includes(key),
                    )
                    if (!from) return current
                    const to: BoardList = from === 'backlog' ? 'week' : 'backlog'
                    lists[from] = lists[from].filter(item => item !== key)
                    lists[to] = [...lists[to], key]
                    return { ...current, lists }
                  })
                }),
              ],
              [
                h.i(
                  [
                    h.Class('ph-bold ph-dots-six-vertical mo-grip'),
                    h.Style({ fontSize: '14px' }),
                  ],
                  [],
                ),
                h.span([h.Class('mo-card-title')], [card.title]),
                h.span([h.Class('mo-card-tag')], [card.tag]),
              ],
            )
          }),
        ),
      ]),
    ),
  )
}

const readLists = (lists: Record<BoardList, string[]>): Record<BoardList, string[]> => ({
  backlog: [...lists.backlog],
  week: [...lists.week],
})

/* 5. Move: stickies on a board */

const NOTES: Record<string, string> = {
  kickoff: 'Kickoff notes',
  lena: 'Ask Lena about fonts',
  friday: 'Ship on Friday',
}
const NOTE = { w: 108, h: 62 }

type StickyState = {
  positions: Record<string, Point>
  size: { w: number; h: number }
  dragging: string | null
}

const stickyView = ({ state, set, h }: TileContext<StickyState>) => {
  bindLive('motion-stickies', state, set)
  const nudge = (key: string, dx: number, dy: number) =>
    set(current => {
      const point = current.positions[key] ?? { x: 0, y: 0 }
      return {
        ...current,
        positions: {
          ...current.positions,
          [key]: {
            x: clamp(point.x + dx, 0, Math.max(0, current.size.w - NOTE.w)),
            y: clamp(point.y + dy, 0, Math.max(0, current.size.h - NOTE.h)),
          },
        },
      }
    })

  return h.div([h.Class('mo-fill')], [
    h.div(
      [
        h.Class('mo-board-surface'),
        h.Attribute('role', 'group'),
        h.Attribute('aria-label', 'Sticky notes'),
        h.OnMount(
          mountTile<StickyState>('MotionStickies', 'motion-stickies', (root, update) => {
            const stopObserving = observeSize(root, size =>
              update(current =>
                current.size.w === size.w && current.size.h === size.h
                  ? current
                  : { ...current, size },
              ),
            )
            let stop: (() => void) | undefined
            const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
              if (event.button !== 0) return
              const note = (event.target as Element | null)?.closest(
                '[data-note]',
              ) as HTMLElement | null
              if (!note) return
              const key = note.dataset.note ?? ''
              const start = readLive<StickyState>('motion-stickies').state.positions[key]
              if (!start) return
              const origin = { x: event.clientX, y: event.clientY }
              update(current => ({ ...current, dragging: key }))
              stop?.()
              stop = bindDrag(root, event, {
                onMove: sample =>
                  update(current => ({
                    ...current,
                    positions: {
                      ...current.positions,
                      [key]: {
                        x: clamp(
                          start.x + sample.x - origin.x,
                          0,
                          Math.max(0, root.clientWidth - NOTE.w),
                        ),
                        y: clamp(
                          start.y + sample.y - origin.y,
                          0,
                          Math.max(0, root.clientHeight - NOTE.h),
                        ),
                      },
                    },
                  })),
                onEnd: () => {
                  update(current => ({ ...current, dragging: null }))
                  stop = undefined
                },
              })
            })
            return () => {
              stop?.()
              cleanup()
              stopObserving()
            }
          }),
        ),
      ],
      [
        ...Object.entries(NOTES).map(([key, text]) => {
          const point = state.positions[key] ?? { x: 0, y: 0 }
          return h.div(
            [
              h.Class('mo-sticky'),
              h.Attribute('role', 'button'),
              h.Tabindex(0),
              h.Attribute('aria-roledescription', 'movable note'),
              h.Attribute(
                'aria-keyshortcuts',
                'Alt+ArrowUp Alt+ArrowDown Alt+ArrowLeft Alt+ArrowRight',
              ),
              h.DataAttribute('note', key),
              ...(state.dragging === key ? [h.DataAttribute('dragging', '')] : []),
              h.Style({ left: `${point.x}px`, top: `${point.y}px` }),
              h.OnKeyDownPreventDefault((pressed, modifiers) => {
                if (!modifiers.altKey) return Option.none()
                const step = 4
                const delta =
                  pressed === 'ArrowLeft'
                    ? { x: -step, y: 0 }
                    : pressed === 'ArrowRight'
                      ? { x: step, y: 0 }
                      : pressed === 'ArrowUp'
                        ? { x: 0, y: -step }
                        : pressed === 'ArrowDown'
                          ? { x: 0, y: step }
                          : null
                return delta
                  ? Option.some(nudge(key, delta.x, delta.y))
                  : Option.none()
              }),
            ],
            [text],
          )
        }),
        h.p([h.Class('mo-hint')], ['Alt + arrows to nudge']),
      ],
    ),
  ])
}

/* 6. Day calendar: spans stacked in lanes */

type Plan = Span & { title: string }
const DAY_START = 8 * 60
const DAY_END = 19 * 60

const clock = (minutes: number) =>
  `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`

const daySpanStyle = (
  start: number,
  end: number,
  lane?: { lane: number; lanes: number },
) => {
  const range = DAY_END - DAY_START
  const from = (start - DAY_START) / range
  const size = (end - start) / range
  return {
    position: 'absolute',
    top: `${Math.round(from * 1e4) / 100}%`,
    height: `${Math.round(size * 1e4) / 100}%`,
    ...(lane
      ? {
          insetInlineStart: `${Math.round((lane.lane / lane.lanes) * 1e4) / 100}%`,
          width: `${Math.round((1 / lane.lanes) * 1e4) / 100}%`,
        }
      : {}),
  }
}

type DayState = { plans: Plan[]; dragging: string | null }

const dayPlans: Plan[] = [
  { id: 'standup', track: 'thu', start: 9 * 60, end: 9 * 60 + 30, title: 'Standup' },
  {
    id: 'kickoff',
    track: 'thu',
    start: 10 * 60,
    end: 11 * 60 + 30,
    title: 'Atlas kickoff',
  },
  {
    id: 'lunch',
    track: 'thu',
    start: 12 * 60 + 30,
    end: 13 * 60 + 30,
    title: 'Lunch with Priya',
  },
  { id: 'crit', track: 'thu', start: 14 * 60, end: 15 * 60 + 30, title: 'Design crit' },
  { id: 'pins', track: 'thu', start: 14 * 60 + 45, end: 16 * 60, title: 'Pin review' },
]

// PORT NOTE: draw, move and resize are reimplemented on native listeners with
// Model state instead of createSpans' primitive store; stackSpans still gives
// overlapping events their lanes. Snapping is 15 minutes, minimum 30.
const dayView = ({ state, set, h }: TileContext<DayState>) => {
  bindLive('motion-day', state, set)
  const hours = Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => 8 + i)
  const lanes = stackSpans(state.plans)

  const movePlan = (id: string, delta: number, resize: boolean) =>
    set(current => ({
      ...current,
      plans: current.plans.map(plan => {
        if (plan.id !== id) return plan
        if (resize) {
          return { ...plan, end: clamp(plan.end + delta, plan.start + 30, DAY_END) }
        }
        const length = plan.end - plan.start
        const start = clamp(plan.start + delta, DAY_START, DAY_END - length)
        return { ...plan, start, end: start + length }
      }),
    }))

  return h.div([h.Class('mo-day-cal')], [
    h.header([h.Class('mo-day-head')], [
      icon(h, 'calendar-blank', 'fill'),
      h.span([h.Class('mo-day-name')], ['Thursday']),
      h.span([h.Class('mo-day-date')], ['Nov 5']),
    ]),
    h.div([h.Class('mo-day-body')], [
      h.div(
        [h.Class('mo-day-hours'), h.Attribute('aria-hidden', 'true')],
        hours.map(hour =>
          h.span(
            [
              h.Style({
                top: `${((hour * 60 - DAY_START) / (DAY_END - DAY_START)) * 100}%`,
              }),
            ],
            [`${hour}:00`],
          ),
        ),
      ),
      h.div(
        [
          h.Class('mo-day-track'),
          h.DataAttribute('day-track', 'thu'),
          h.OnMount(
            mountTile<DayState>('MotionDay', 'motion-day', (root, update) => {
              let stop: (() => void) | undefined
              const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
                if (event.button !== 0) return
                const target = event.target as Element | null
                const track = target?.closest('[data-day-track]') as HTMLElement | null
                if (!track || !root.contains(track)) return
                const rect = track.getBoundingClientRect()
                const minutesAt = (clientY: number) => {
                  const ratio = (clientY - rect.top) / (rect.height || 1)
                  return Math.round(
                    (DAY_START + ratio * (DAY_END - DAY_START)) / 15,
                  ) * 15
                }
                const planEl = target?.closest('[data-plan]') as HTMLElement | null
                const startMin = minutesAt(event.clientY)
                stop?.()

                if (planEl) {
                  const id = planEl.dataset.plan ?? ''
                  const plan = readLive<DayState>('motion-day').state.plans.find(
                    item => item.id === id,
                  )
                  if (!plan) return
                  const resize = !!target?.closest('[data-span-edge]')
                  const base = { ...plan }
                  update(current => ({ ...current, dragging: id }))
                  stop = bindDrag(root, event, {
                    threshold: 2,
                    onMove: sample => {
                      const minutes = minutesAt(sample.y)
                      update(current => ({
                        ...current,
                        plans: current.plans.map(item => {
                          if (item.id !== id) return item
                          if (resize) {
                            return {
                              ...item,
                              end: clamp(minutes, item.start + 30, DAY_END),
                            }
                          }
                          const length = base.end - base.start
                          const start = clamp(
                            base.start + minutes - startMin,
                            DAY_START,
                            DAY_END - length,
                          )
                          return { ...item, start, end: start + length }
                        }),
                      }))
                    },
                    onEnd: () => {
                      update(current => ({ ...current, dragging: null }))
                      stop = undefined
                    },
                  })
                  return
                }

                const id = nextId('new')
                const anchor = clamp(startMin, DAY_START, DAY_END - 30)
                update(current => ({
                  ...current,
                  plans: [
                    ...current.plans,
                    {
                      id,
                      track: 'thu',
                      start: anchor,
                      end: Math.min(anchor + 60, DAY_END),
                      title: 'New event',
                    },
                  ],
                }))
                stop = bindDrag(root, event, {
                  threshold: 2,
                  onMove: sample => {
                    const minutes = minutesAt(sample.y)
                    update(current => ({
                      ...current,
                      plans: current.plans.map(item => {
                        if (item.id !== id) return item
                        const start = clamp(
                          Math.min(anchor, minutes),
                          DAY_START,
                          DAY_END - 30,
                        )
                        const end = clamp(
                          Math.max(anchor, minutes),
                          start + 30,
                          DAY_END,
                        )
                        return { ...item, start, end }
                      }),
                    }))
                  },
                  onEnd: () => {
                    stop = undefined
                  },
                })
              })
              return () => {
                stop?.()
                cleanup()
              }
            }),
          ),
        ],
        state.plans.map(plan => {
          const lane = lanes.get(plan.id)
          const short = plan.end - plan.start < 45
          return h.div(
            [
              h.Class('mo-plan'),
              h.DataAttribute('plan', plan.id),
              ...(plan.title === 'New event' ? [h.DataAttribute('new', '')] : []),
              ...(short ? [h.DataAttribute('short', '')] : []),
              ...(state.dragging === plan.id ? [h.DataAttribute('dragging', '')] : []),
              h.Tabindex(0),
              h.Attribute('role', 'button'),
              h.Attribute('aria-roledescription', 'event'),
              h.Attribute(
                'aria-label',
                `${plan.title}, ${clock(plan.start)} to ${clock(plan.end)}`,
              ),
              h.Style(daySpanStyle(plan.start, plan.end, lane)),
              h.OnKeyDownPreventDefault((pressed, modifiers) => {
                if (pressed === 'Delete' || pressed === 'Backspace') {
                  return Option.some(
                    set(current => ({
                      ...current,
                      plans: current.plans.filter(item => item.id !== plan.id),
                    })),
                  )
                }
                const step = 15
                if (pressed === 'ArrowUp') {
                  return Option.some(movePlan(plan.id, -step, modifiers.shiftKey))
                }
                if (pressed === 'ArrowDown') {
                  return Option.some(movePlan(plan.id, step, modifiers.shiftKey))
                }
                return Option.none()
              }),
            ],
            [
              h.span([h.Class('mo-plan-body')], [
                h.span([h.Class('mo-plan-title')], [plan.title]),
                h.span([h.Class('mo-plan-time')], [
                  `${clock(plan.start)}–${clock(plan.end)}`,
                ]),
              ]),
              h.span([h.DataAttribute('span-edge', 'end'), h.Class('mo-plan-edge')], []),
            ],
          )
        }),
      ),
    ]),
  ])
}

/* 7. Sortable grid with a selection that moves together */

const SWATCHES: Record<string, string> = {
  terracotta: 'oklch(0.62 0.14 40)',
  sand: 'oklch(0.86 0.06 85)',
  olive: 'oklch(0.6 0.09 120)',
  pine: 'oklch(0.42 0.07 160)',
  lagoon: 'oklch(0.66 0.1 200)',
  denim: 'oklch(0.48 0.1 255)',
  charcoal: 'oklch(0.3 0.01 260)',
  blush: 'oklch(0.82 0.07 20)',
}

type PaletteState = {
  order: string[]
  selected: string[]
  focused: string | null
  moving: string | null
}

// PORT NOTE: the model has no drag preview element in the DOM tree, so the
// selected group is dragged with bindDragPreview and reordered against the
// nearest swatch centre; the reference's insertion math is approximated.
const paletteView = ({ state, set, h }: TileContext<PaletteState>) => {
  bindLive('motion-palette', state, set)
  const count = state.selected.length
  return h.div(
    [
      h.Class('mo-palette'),
      h.OnMount(
        mountTile<PaletteState>('MotionPalette', 'motion-palette', (root, update) => {
          let stop: (() => void) | undefined
          const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
            if (event.button !== 0) return
            const cell = (event.target as Element | null)?.closest(
              '[data-swatch]',
            ) as HTMLElement | null
            if (!cell) return
            const key = cell.dataset.swatch ?? ''
            const before = readLive<PaletteState>('motion-palette').state
            let selected = [...before.selected]
            if (event.shiftKey) {
              const anchor = before.focused ?? key
              const a = before.order.indexOf(anchor)
              const b = before.order.indexOf(key)
              const lo = Math.min(a, b)
              const hi = Math.max(a, b)
              selected = before.order.slice(lo, hi + 1)
            } else if (event.metaKey || event.ctrlKey) {
              selected = selected.includes(key)
                ? selected.filter(item => item !== key)
                : [...selected, key]
            } else if (!selected.includes(key)) {
              selected = [key]
            }
            update(current => ({ ...current, selected, focused: key }))
            const group = selected.includes(key) ? selected : [key]
            let preview: ReturnType<typeof bindDragPreview> | undefined
            stop?.()
            stop = bindDrag(root, event, {
              threshold: 4,
              cancelOnEscape: true,
              onStart: () => {
                preview = bindDragPreview(cell, { x: event.clientX, y: event.clientY })
                preview.el.setAttribute('data-drag-count', String(group.length))
                update(current => ({ ...current, moving: key }))
              },
              onMove: sample => {
                preview?.move(sample.x, sample.y)
                const cells = [...root.querySelectorAll<HTMLElement>('[data-swatch]')]
                let best = 0
                let bestDistance = Number.POSITIVE_INFINITY
                cells.forEach((item, index) => {
                  const rect = item.getBoundingClientRect()
                  const distance = Math.hypot(
                    sample.x - (rect.left + rect.width / 2),
                    sample.y - (rect.top + rect.height / 2),
                  )
                  if (distance < bestDistance) {
                    bestDistance = distance
                    best = index
                  }
                })
                const anchorKey = cells[best]?.dataset.swatch
                update(current => {
                  const rest = current.order.filter(item => !group.includes(item))
                  let index = rest.length
                  if (anchorKey && !group.includes(anchorKey)) {
                    index = Math.max(0, rest.indexOf(anchorKey))
                  } else if (anchorKey) {
                    index = Math.min(rest.length, current.order.indexOf(anchorKey))
                  }
                  const order = [...rest]
                  order.splice(index, 0, ...group)
                  return { ...current, order }
                })
              },
              onEnd: () => {
                preview?.remove()
                update(current => ({ ...current, moving: null }))
                stop = undefined
              },
            })
          })
          return () => {
            stop?.()
            cleanup()
          }
        }),
      ),
    ],
    [
      h.div([h.Class('mo-palette-head')], [
        h.span([h.Class('b-label')], ['Brand palette']),
        h.span([h.Class('mo-palette-count')], [
          count ? `${count} selected` : 'Shift-click to pick more',
        ]),
      ]),
      h.div(
        [
          h.Class('mo-swatches'),
          h.Attribute('role', 'listbox'),
          h.Attribute('aria-label', 'Brand palette'),
          h.Attribute('aria-multiselectable', 'true'),
          h.Attribute('aria-roledescription', 'sortable grid'),
        ],
        state.order.map(key => {
          const selected = state.selected.includes(key)
          return h.div(
            [
              h.Class('mo-swatch'),
              h.Attribute('role', 'option'),
              h.Attribute('aria-label', key),
              h.Attribute('aria-selected', String(selected)),
              h.Tabindex(state.focused === key ? 0 : -1),
              h.DataAttribute('swatch', key),
              h.DataAttribute('flip', key),
              ...(selected ? [h.DataAttribute('selected', '')] : []),
              ...(state.moving === key ? [h.DataAttribute('moving', '')] : []),
              h.Style({ backgroundColor: SWATCHES[key] ?? 'transparent' }),
              h.OnKeyDown((pressed, modifiers) => {
                if (pressed !== 'ArrowLeft' && pressed !== 'ArrowRight') {
                  return set(current => current)
                }
                return set(current => {
                  const from = current.order.indexOf(key)
                  const to = clamp(
                    from + (pressed === 'ArrowLeft' ? -1 : 1),
                    0,
                    current.order.length - 1,
                  )
                  const order = [...current.order]
                  order.splice(from, 1)
                  order.splice(to, 0, key)
                  const selectedKeys = modifiers.shiftKey
                    ? [...new Set([...current.selected, key])]
                    : [key]
                  return { ...current, order, focused: key, selected: selectedKeys }
                })
              }),
            ],
            [],
          )
        }),
      ),
    ],
  )
}

/* 8. Resize: an artboard with handles */

const FRAME_HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const
const FRAME_HANDLE_LABELS: Record<(typeof FRAME_HANDLES)[number], string> = {
  nw: 'top left',
  n: 'top',
  ne: 'top right',
  e: 'right',
  se: 'bottom right',
  s: 'bottom',
  sw: 'bottom left',
  w: 'left',
}
type FrameHandle = (typeof FRAME_HANDLES)[number] | 'move'
type FrameBox = { x: number; y: number; width: number; height: number }

type FrameState = {
  box: FrameBox
  size: { w: number; h: number }
  dragging: string | null
}

const FRAME_MIN = { width: 72, height: 48 }

const resizeFrameBox = (
  box: FrameBox,
  handle: FrameHandle,
  dx: number,
  dy: number,
  size: { w: number; h: number },
): FrameBox => {
  let { x, y, width, height } = box
  if (handle === 'move') {
    x = clamp(x + dx, 0, Math.max(0, size.w - width))
    y = clamp(y + dy, 0, Math.max(0, size.h - height))
    return { x, y, width, height }
  }
  if (handle.includes('e')) {
    width = clamp(width + dx, FRAME_MIN.width, Math.max(FRAME_MIN.width, size.w - x))
  }
  if (handle.includes('s')) {
    height = clamp(height + dy, FRAME_MIN.height, Math.max(FRAME_MIN.height, size.h - y))
  }
  if (handle.includes('w')) {
    const right = x + width
    width = clamp(width - dx, FRAME_MIN.width, right)
    x = right - width
  }
  if (handle.includes('n')) {
    const bottom = y + height
    height = clamp(height - dy, FRAME_MIN.height, bottom)
    y = bottom - height
  }
  return { x, y, width, height }
}

const frameView = ({ state, set, h }: TileContext<FrameState>) => {
  bindLive('motion-frame', state, set)
  const box = state.box
  const step = (handle: FrameHandle, dx: number, dy: number) =>
    set(current => ({
      ...current,
      box: resizeFrameBox(current.box, handle, dx, dy, current.size),
    }))

  return h.div([h.Class('mo-fill')], [
    h.div(
      [
        h.Class('mo-artboard-surface'),
        h.OnMount(
          mountTile<FrameState>('MotionFrame', 'motion-frame', (root, update) => {
            const stopObserving = observeSize(root, size =>
              update(current =>
                current.size.w === size.w && current.size.h === size.h
                  ? current
                  : { ...current, size },
              ),
            )
            let stop: (() => void) | undefined
            const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
              if (event.button !== 0) return
              const target = event.target as Element | null
              const frame = target?.closest('[data-frame]') as HTMLElement | null
              if (!frame) return
              const handleEl = target?.closest('[data-at]') as HTMLElement | null
              const handle = (handleEl?.dataset.at ?? 'move') as FrameHandle
              const box = readLive<FrameState>('motion-frame').state.box
              const origin = { x: event.clientX, y: event.clientY }
              update(current => ({ ...current, dragging: handle }))
              stop?.()
              stop = bindDrag(root, event, {
                threshold: 1,
                onMove: sample =>
                  update(current => ({
                    ...current,
                    box: resizeFrameBox(
                      box,
                      handle,
                      sample.x - origin.x,
                      sample.y - origin.y,
                      current.size,
                    ),
                  })),
                onEnd: () => {
                  update(current => ({ ...current, dragging: null }))
                  stop = undefined
                },
              })
            })
            return () => {
              stop?.()
              cleanup()
              stopObserving()
            }
          }),
        ),
      ],
      [
        h.div(
          [
            h.Class('mo-frame'),
            h.DataAttribute('frame', 'true'),
            ...(state.dragging ? [h.DataAttribute('dragging', '')] : []),
            h.Style({
              left: `${box.x}px`,
              top: `${box.y}px`,
              width: `${box.width}px`,
              height: `${box.height}px`,
            }),
            h.Tabindex(0),
            h.OnKeyDownPreventDefault((pressed, modifiers) => {
              const amount = modifiers.shiftKey ? 10 : 2
              const delta =
                pressed === 'ArrowLeft'
                  ? { x: -amount, y: 0 }
                  : pressed === 'ArrowRight'
                    ? { x: amount, y: 0 }
                    : pressed === 'ArrowUp'
                      ? { x: 0, y: -amount }
                      : pressed === 'ArrowDown'
                        ? { x: 0, y: amount }
                        : null
              return delta
                ? Option.some(step('move', delta.x, delta.y))
                : Option.none()
            }),
          ],
          [
            h.span([h.Class('mo-frame-name')], [
              icon(h, 'frame-corners', 'fill'),
              'Hero banner',
            ]),
            h.span([h.Class('mo-frame-size')], [
              `${Math.round(box.width)} × ${Math.round(box.height)}`,
            ]),
            ...FRAME_HANDLES.map(handle =>
              h.button(
                [
                  h.Type('button'),
                  h.Class('mo-handle'),
                  h.DataAttribute('at', handle),
                  h.Attribute('aria-label', `Resize ${FRAME_HANDLE_LABELS[handle]}`),
                  h.OnKeyDownPreventDefault((pressed, modifiers) => {
                    const amount = modifiers.shiftKey ? 4 : 2
                    const delta =
                      pressed === 'ArrowLeft'
                        ? { x: -amount, y: 0 }
                        : pressed === 'ArrowRight'
                          ? { x: amount, y: 0 }
                          : pressed === 'ArrowUp'
                            ? { x: 0, y: -amount }
                            : pressed === 'ArrowDown'
                              ? { x: 0, y: amount }
                              : null
                    return delta
                      ? Option.some(step(handle, delta.x, delta.y))
                      : Option.none()
                  }),
                ],
                [],
              ),
            ),
          ],
        ),
      ],
    ),
  ])
}

/* 9. Swipe actions */

const INBOX: Record<string, { title: string; meta: string }> = {
  flight: { title: 'Flight to Lisbon', meta: 'Fri 7:40 · Gate 14' },
  invoice: { title: 'Invoice from Atlas Print', meta: 'Due Monday' },
  clusters: { title: 'Review pin clusters', meta: 'Map team · 3 comments' },
}
const SWIPE_OPEN = 128

type SwipeState = {
  rows: string[]
  open: string | null
  drag: { key: string; x: number } | null
}

const swipeView = ({ state, set, h }: TileContext<SwipeState>) => {
  bindLive('motion-swipe', state, set)
  return h.div(
    [
      h.Class('mo-inbox'),
      h.Attribute('role', 'list'),
      h.Attribute('aria-label', 'Inbox'),
      h.OnMount(
        mountTile<SwipeState>('MotionSwipe', 'motion-swipe', (root, update) => {
          let stop: (() => void) | undefined
          const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
            if (event.button !== 0) return
            const target = event.target as Element | null
            if (target?.closest('button')) return
            const content = target?.closest('[data-swipe-content]') as HTMLElement | null
            if (!content) return
            const row = content.closest('[data-swipe-row]') as HTMLElement | null
            if (!row) return
            const key = row.dataset.swipeRow ?? ''
            const startX = readLive<SwipeState>('motion-swipe').state.open === key
              ? -SWIPE_OPEN
              : 0
            const origin = event.clientX
            let last = startX
            update(current => ({ ...current, drag: { key, x: startX } }))
            stop?.()
            stop = bindDrag(root, event, {
              threshold: 4,
              cancelOnEscape: true,
              onMove: sample => {
                last = clamp(
                  startX + sample.x - origin,
                  -Math.max(120, (row.clientWidth || 260) * 0.9),
                  0,
                )
                update(current => ({ ...current, drag: { key, x: last } }))
              },
              onEnd: (_up, canceled) => {
                const width = row.clientWidth || 260
                update(current => {
                  if (!canceled && last < -width * 0.6) {
                    return {
                      ...current,
                      rows: current.rows.filter(item => item !== key),
                      open: null,
                      drag: null,
                    }
                  }
                  return {
                    ...current,
                    open: !canceled && last < -64 ? key : null,
                    drag: null,
                  }
                })
                stop = undefined
              },
            })
          })
          return () => {
            stop?.()
            cleanup()
          }
        }),
      ),
    ],
    state.rows.length === 0
      ? [
          h.div([h.Class('mo-inbox-empty')], [
            h.span([], ['All caught up']),
            h.button(
              [
                h.Type('button'),
                h.Class('b-btn'),
                h.OnClick(
                  set(current => ({
                    ...current,
                    rows: Object.keys(INBOX),
                    open: null,
                  })),
                ),
              ],
              ['Restore'],
            ),
          ]),
        ]
      : state.rows.map(key => {
          const row = INBOX[key] ?? { title: key, meta: '' }
          const offset =
            state.drag?.key === key
              ? state.drag.x
              : state.open === key
                ? -SWIPE_OPEN
                : 0
          return h.div(
            [
              h.Class('mo-swipe-row'),
              h.Attribute('role', 'listitem'),
              h.Tabindex(0),
              h.Attribute('aria-label', row.title),
              h.DataAttribute('swipe-row', key),
            ],
            [
              h.div([h.Class('mo-swipe-actions')], [
                h.button(
                  [
                    h.Type('button'),
                    h.Class('mo-swipe-btn'),
                    h.DataAttribute('kind', 'archive'),
                    h.OnClick(
                      set(current => ({
                        ...current,
                        rows: current.rows.filter(item => item !== key),
                        open: null,
                      })),
                    ),
                  ],
                  [icon(h, 'archive', 'fill'), 'Archive'],
                ),
                h.button(
                  [
                    h.Type('button'),
                    h.Class('mo-swipe-btn'),
                    h.DataAttribute('kind', 'delete'),
                    h.OnClick(
                      set(current => ({
                        ...current,
                        rows: current.rows.filter(item => item !== key),
                        open: null,
                      })),
                    ),
                  ],
                  [icon(h, 'trash', 'fill'), 'Delete'],
                ),
              ]),
              h.div(
                [
                  h.Class('mo-swipe-content'),
                  h.DataAttribute('swipe-content', key),
                  h.Style({ transform: `translateX(${offset}px)` }),
                  ...(state.drag?.key === key ? [h.DataAttribute('swiping', '')] : []),
                  ...(offset !== 0 ? [h.DataAttribute('swipe', '')] : []),
                ],
                [
                  h.span([h.Class('mo-swipe-text')], [
                    h.span([h.Class('mo-swipe-title')], [row.title]),
                    h.span([h.Class('mo-swipe-meta')], [row.meta]),
                  ]),
                  h.i(
                    [
                      h.Class('ph-bold ph-caret-left mo-swipe-cue'),
                      h.Style({ fontSize: '16px' }),
                      h.Attribute('aria-hidden', 'true'),
                    ],
                    [],
                  ),
                ],
              ),
            ],
          )
        }),
  )
}

/* 10. Area: a saturation and brightness pad */

const HUE = 24

const hsvToHex = (h: number, s: number, v: number) => {
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1))
  }
  return `#${[f(5), f(3), f(1)]
    .map(c =>
      Math.round(c * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')}`.toUpperCase()
}

type ColorState = { s: number; v: number }

const colorView = ({ state, set, h }: TileContext<ColorState>) => {
  bindLive('motion-color', state, set)
  const hex = hsvToHex(HUE, state.s / 100, state.v / 100)
  const step = (ds: number, dv: number) =>
    set(current => ({
      ...current,
      s: clamp(current.s + ds, 0, 100),
      v: clamp(current.v + dv, 0, 100),
    }))

  return h.div([h.Class('mo-color')], [
    h.div(
      [
        h.Class('mo-pad'),
        h.DataAttribute('pad', 'true'),
        h.Style({ '--hue': String(HUE) }),
        h.OnMount(
          mountTile<ColorState>('MotionColor', 'motion-color', (root, update) => {
            const pad = root.querySelector<HTMLElement>('[data-pad]')
            if (!pad) return () => {}
            const pick = (x: number, y: number) => {
              const rect = pad.getBoundingClientRect()
              const s = clamp(((x - rect.left) / (rect.width || 1)) * 100, 0, 100)
              const v = clamp(
                (1 - (y - rect.top) / (rect.height || 1)) * 100,
                0,
                100,
              )
              update(current => ({ ...current, s: Math.round(s), v: Math.round(v) }))
            }
            let stop: (() => void) | undefined
            const cleanup = listen(pad, 'pointerdown', (event: PointerEvent) => {
              if (event.button !== 0) return
              pick(event.clientX, event.clientY)
              stop?.()
              stop = bindDrag(pad, event, {
                onMove: sample => pick(sample.x, sample.y),
                onEnd: () => {
                  stop = undefined
                },
              })
            })
            return () => {
              stop?.()
              cleanup()
            }
          }),
        ),
      ],
      [
        h.div(
          [
            h.Class('mo-pad-thumb'),
            h.Attribute('role', 'slider'),
            h.Attribute('aria-label', 'Accent color'),
            h.Attribute('aria-valuetext', `${state.s}% saturation, ${state.v}% brightness`),
            h.Tabindex(0),
            h.Style({
              position: 'absolute',
              left: `${state.s}%`,
              top: `${100 - state.v}%`,
              background: hex,
            }),
            h.OnKeyDownPreventDefault((pressed, modifiers) => {
              const amount = modifiers.shiftKey ? 10 : 1
              if (pressed === 'ArrowLeft') return Option.some(step(-amount, 0))
              if (pressed === 'ArrowRight') return Option.some(step(amount, 0))
              if (pressed === 'ArrowUp') return Option.some(step(0, amount))
              if (pressed === 'ArrowDown') return Option.some(step(0, -amount))
              return Option.none()
            }),
          ],
          [],
        ),
      ],
    ),
    h.div([h.Class('mo-color-side')], [
      h.span([h.Class('mo-color-swatch'), h.Style({ background: hex })], []),
      h.span([h.Class('b-label')], ['Accent']),
      h.span([h.Class('mo-color-hex')], [hex]),
      h.span([h.Class('mo-color-sv')], [`S ${state.s} · B ${state.v}`]),
    ]),
  ])
}

/* 11. Spans on a timeline */

type Booking = Span & { title: string }
const TL_ROOMS: Record<string, string> = {
  a: 'Studio A',
  b: 'Studio B',
  booth: 'Booth',
}
const OPEN = 9 * 60
const CLOSE = 17 * 60

type TimelineState = { bookings: Booking[] }

const tlSpanStyle = (start: number, end: number) => {
  const range = CLOSE - OPEN
  const from = (start - OPEN) / range
  const size = (end - start) / range
  return {
    position: 'absolute',
    insetInlineStart: `${Math.round(from * 1e4) / 100}%`,
    width: `${Math.round(size * 1e4) / 100}%`,
  }
}

const freeSlot = (bookings: Booking[]) => {
  for (let start = OPEN; start + 60 <= CLOSE; start += 30) {
    for (const track of Object.keys(TL_ROOMS)) {
      const probe = { id: 'probe', track, start, end: start + 60 }
      if (isSpanFree(bookings, probe)) {
        return probe
      }
    }
  }
  return null
}

// PORT NOTE: createSpans' primitive store is replaced with Model state and
// native listeners. Drawing, moving, stretching and the "Add hold" free-slot
// search keep the reference's 30-minute snap and no-overlap rule.
const timelineView = ({ state, set, h }: TileContext<TimelineState>) => {
  bindLive('motion-timeline', state, set)
  const hours = Array.from({ length: (CLOSE - OPEN) / 60 + 1 }, (_, i) => 9 + i)
  const free = freeSlot(state.bookings)

  const moveBooking = (id: string, delta: number, resize: boolean) =>
    set(current => ({
      ...current,
      bookings: current.bookings.map(booking => {
        if (booking.id !== id) return booking
        if (resize) {
          return {
            ...booking,
            end: clamp(booking.end + delta, booking.start + 30, CLOSE),
          }
        }
        const length = booking.end - booking.start
        const start = clamp(booking.start + delta, OPEN, CLOSE - length)
        return { ...booking, start, end: start + length }
      }),
    }))

  return h.div(
    [
      h.Class('mo-timeline'),
      h.OnMount(
        mountTile<TimelineState>('MotionTimeline', 'motion-timeline', (root, update) => {
          let stop: (() => void) | undefined
          const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
            if (event.button !== 0) return
            const target = event.target as Element | null
            const track = target?.closest('[data-tl-track]') as HTMLElement | null
            if (!track || !root.contains(track)) return
            const trackKey = track.dataset.tlTrack ?? ''
            const rect = track.getBoundingClientRect()
            const minutesAt = (clientX: number) => {
              const ratio = (clientX - rect.left) / (rect.width || 1)
              return (
                Math.round((OPEN + ratio * (CLOSE - OPEN)) / 30) * 30
              )
            }
            const bookingEl = target?.closest('[data-booking]') as HTMLElement | null
            const startMin = minutesAt(event.clientX)
            stop?.()

            if (bookingEl) {
              const id = bookingEl.dataset.booking ?? ''
              const booking = readLive<TimelineState>('motion-timeline').state.bookings.find(
                item => item.id === id,
              )
              if (!booking) return
              const resize = !!target?.closest('[data-span-edge]')
              const base = { ...booking }
              stop = bindDrag(root, event, {
                threshold: 2,
                onMove: sample => {
                  const minutes = minutesAt(sample.x)
                  update(current => {
                    const candidate = (() => {
                      const item = current.bookings.find(entry => entry.id === id)
                      if (!item) return null
                      if (resize) {
                        return {
                          ...item,
                          end: clamp(minutes, item.start + 30, CLOSE),
                        }
                      }
                      const length = base.end - base.start
                      const start = clamp(
                        base.start + minutes - startMin,
                        OPEN,
                        CLOSE - length,
                      )
                      return { ...item, start, end: start + length }
                    })()
                    if (!candidate) return current
                    const others = current.bookings.filter(entry => entry.id !== id)
                    if (!isSpanFree(others, candidate)) return current
                    return {
                      ...current,
                      bookings: current.bookings.map(entry =>
                        entry.id === id ? candidate : entry,
                      ),
                    }
                  })
                },
                onEnd: () => {
                  stop = undefined
                },
              })
              return
            }

            const start = clamp(startMin, OPEN, CLOSE - 60)
            const id = nextId('hold')
            stop = bindDrag(root, event, {
              threshold: 2,
              onStart: () =>
                update(current => {
                  const candidate: Booking = {
                    id,
                    track: trackKey,
                    start,
                    end: start + 60,
                    title: 'Hold',
                  }
                  if (!isSpanFree(current.bookings, candidate)) return current
                  return { ...current, bookings: [...current.bookings, candidate] }
                }),
              onMove: sample => {
                const minutes = minutesAt(sample.x)
                update(current => {
                  const item = current.bookings.find(entry => entry.id === id)
                  if (!item) return current
                  const nextStart = clamp(Math.min(start, minutes), OPEN, CLOSE - 30)
                  const nextEnd = clamp(Math.max(start, minutes), nextStart + 30, CLOSE)
                  const candidate = { ...item, start: nextStart, end: nextEnd }
                  const others = current.bookings.filter(entry => entry.id !== id)
                  if (!isSpanFree(others, candidate)) return current
                  return {
                    ...current,
                    bookings: current.bookings.map(entry =>
                      entry.id === id ? candidate : entry,
                    ),
                  }
                })
              },
              onEnd: () => {
                stop = undefined
              },
            })
          })
          return () => {
            stop?.()
            cleanup()
          }
        }),
      ),
    ],
    [
      h.div(
        [h.Class('mo-tl-hours'), h.Attribute('aria-hidden', 'true')],
        hours.map((hour, index) =>
          h.span(
            [h.Style({ left: `${(index / (hours.length - 1)) * 100}%` })],
            [String(hour)],
          ),
        ),
      ),
      ...Object.entries(TL_ROOMS).map(([track, name]) =>
        h.div([h.Class('mo-tl-row')], [
          h.span([h.Class('mo-tl-room')], [name]),
          h.div(
            [
              h.Class('mo-tl-track'),
              h.Attribute('aria-label', name),
              h.DataAttribute('tl-track', track),
            ],
            state.bookings
              .filter(booking => booking.track === track)
              .map(booking =>
                h.div(
                  [
                    h.Class('mo-booking'),
                    h.DataAttribute('booking', booking.id),
                    ...(booking.title === 'Hold' ? [h.DataAttribute('hold', '')] : []),
                    h.Tabindex(0),
                    h.Attribute('role', 'button'),
                    h.Attribute('aria-roledescription', 'booking'),
                    h.Attribute(
                      'aria-label',
                      `${booking.title}, ${clock(booking.start)} to ${clock(booking.end)}`,
                    ),
                    h.Style(tlSpanStyle(booking.start, booking.end)),
                    h.OnKeyDownPreventDefault((pressed, modifiers) => {
                      if (pressed === 'Delete' || pressed === 'Backspace') {
                        return Option.some(
                          set(current => ({
                            ...current,
                            bookings: current.bookings.filter(
                              item => item.id !== booking.id,
                            ),
                          })),
                        )
                      }
                      const amount = 30
                      if (pressed === 'ArrowLeft') {
                        return Option.some(
                          moveBooking(booking.id, -amount, modifiers.shiftKey),
                        )
                      }
                      if (pressed === 'ArrowRight') {
                        return Option.some(
                          moveBooking(booking.id, amount, modifiers.shiftKey),
                        )
                      }
                      return Option.none()
                    }),
                  ],
                  [
                    h.span([h.DataAttribute('span-edge', 'start'), h.Class('mo-edge')], []),
                    h.span([h.Class('mo-booking-title')], [booking.title]),
                    h.span([h.DataAttribute('span-edge', 'end'), h.Class('mo-edge')], []),
                  ],
                ),
              ),
          ),
        ]),
      ),
      h.div([h.Class('mo-tl-foot')], [
        h.span([h.Class('mo-tl-free')], [
          free ? `Next free hour: ${TL_ROOMS[free.track]} at ${clock(free.start)}` : 'Fully booked',
        ]),
        h.button(
          [
            h.Type('button'),
            h.Class('b-btn'),
            h.DataAttribute('size', 'sm'),
            ...(free ? [] : [h.Disabled(true)]),
            h.OnClick(
              set(current => {
                const slot = freeSlot(current.bookings)
                if (!slot) return current
                return {
                  ...current,
                  bookings: [
                    ...current.bookings,
                    { ...slot, id: nextId('hold'), title: 'Hold' },
                  ],
                }
              }),
            ),
          ],
          [icon(h, 'plus', 'bold', 14), 'Add hold'],
        ),
      ]),
    ],
  )
}

/* 12. Tree reorder: a page outline */

const OUTLINE: Record<string, string> = {
  navbar: 'Navbar',
  logo: 'Logo',
  search: 'Search field',
  footer: 'Footer',
  legal: 'Legal links',
}

type OutlineRow = { key: string; depth: number }
type OutlineState = { rows: OutlineRow[]; moving: string | null; focused: string | null }

// PORT NOTE: createTreeReorder's nesting rules are approximated: horizontal
// drag changes depth in 18px steps clamped to 2, and vertical drag reorders
// the rows. The reference's subtree move keeps working through the row order.
const outlineView = ({ state, set, h }: TileContext<OutlineState>) => {
  bindLive('motion-outline', state, set)
  const depthStep = 18
  const changeDepth = (key: string, delta: number) =>
    set(current => ({
      ...current,
      rows: current.rows.map(row =>
        row.key === key ? { ...row, depth: clamp(row.depth + delta, 0, 2) } : row,
      ),
    }))
  const reorder = (key: string, delta: number) =>
    set(current => {
      const from = current.rows.findIndex(row => row.key === key)
      const to = clamp(from + delta, 0, current.rows.length - 1)
      if (from < 0 || from === to) return current
      const rows = [...current.rows]
      const [row] = rows.splice(from, 1)
      rows.splice(to, 0, row)
      return { ...current, rows, focused: key }
    })

  return h.div(
    [
      h.Class('mo-outline'),
      h.Attribute('role', 'tree'),
      h.Attribute('aria-label', 'Page outline'),
      h.OnMount(
        mountTile<OutlineState>('MotionOutline', 'motion-outline', (root, update) => {
          let stop: (() => void) | undefined
          const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
            if (event.button !== 0) return
            const row = (event.target as Element | null)?.closest(
              '[data-node-row]',
            ) as HTMLElement | null
            if (!row) return
            const key = row.dataset.nodeRow ?? ''
            const startRow = readLive<OutlineState>('motion-outline').state.rows.find(
              item => item.key === key,
            )
            if (!startRow) return
            const startDepth = startRow.depth
            const origin = { x: event.clientX, y: event.clientY }
            update(current => ({ ...current, moving: key, focused: key }))
            stop?.()
            stop = bindDrag(root, event, {
              threshold: 3,
              onMove: sample => {
                const depth = clamp(
                  startDepth + Math.round((sample.x - origin.x) / depthStep),
                  0,
                  2,
                )
                const rows = [...root.querySelectorAll<HTMLElement>('[data-node-row]')]
                let target = rows.findIndex(
                  item =>
                    sample.y <
                    item.getBoundingClientRect().top +
                      item.getBoundingClientRect().height / 2,
                )
                if (target < 0) target = rows.length - 1
                update(current => {
                  const order = [...current.rows]
                  const from = order.findIndex(item => item.key === key)
                  if (from < 0) return current
                  const [row] = order.splice(from, 1)
                  order.splice(Math.min(target, order.length), 0, { ...row, depth })
                  return { ...current, rows: order }
                })
              },
              onEnd: () => {
                update(current => ({ ...current, moving: null }))
                stop = undefined
              },
            })
          })
          return () => {
            stop?.()
            cleanup()
          }
        }),
      ),
    ],
    state.rows.map((row, index) => {
      const parent = !!state.rows[index + 1] && state.rows[index + 1].depth > row.depth
      return h.div(
        [
          h.Class('mo-node-row'),
          h.Attribute('role', 'treeitem'),
          h.Attribute('aria-level', String(row.depth + 1)),
          h.Attribute('aria-selected', String(state.moving === row.key)),
          h.Tabindex(state.focused === row.key ? 0 : -1),
          ...(parent ? [h.DataAttribute('parent', '')] : []),
          ...(state.moving === row.key ? [h.DataAttribute('moving', '')] : []),
          h.DataAttribute('node-row', row.key),
          h.DataAttribute('flip', row.key),
          h.Style({ '--depth': String(row.depth) }),
          h.OnKeyDownPreventDefault((pressed, modifiers) => {
            if (pressed === 'ArrowLeft') {
              return Option.some(changeDepth(row.key, -1))
            }
            if (pressed === 'ArrowRight') {
              return Option.some(changeDepth(row.key, 1))
            }
            if (pressed === 'ArrowUp') return Option.some(reorder(row.key, -1))
            if (pressed === 'ArrowDown') return Option.some(reorder(row.key, 1))
            void modifiers
            return Option.none()
          }),
        ],
        [
          h.i(
            [
              h.Class('ph-bold ph-dots-six-vertical mo-grip'),
              h.Style({ fontSize: '14px' }),
            ],
            [],
          ),
          h.i(
            [
              h.Class(`ph-fill ph-${parent ? 'folder-simple' : 'rectangle'} mo-node-icon`),
              h.Style({ fontSize: '14px' }),
              h.Attribute('aria-hidden', 'true'),
            ],
            [],
          ),
          h.span([], [OUTLINE[row.key] ?? row.key]),
        ],
      )
    }),
  )
}

/* 13. Drag a copy: tag a task */

const TAG_LABELS = ['Urgent', 'Research', 'Copy']

type TagState = { tags: string[] }

const tagView = ({ state, set, h }: TileContext<TagState>) => {
  bindLive('motion-tags', state, set)
  const add = (tag: string) =>
    set(current =>
      current.tags.includes(tag)
        ? current
        : { ...current, tags: [...current.tags, tag] },
    )
  return h.div(
    [
      h.Class('mo-tags'),
      h.OnMount(
        mountTile<TagState>('MotionTags', 'motion-tags', (root, update) => {
          let stop: (() => void) | undefined
          const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
            if (event.button !== 0) return
            const chip = (event.target as Element | null)?.closest(
              '[data-chip]',
            ) as HTMLElement | null
            if (!chip) return
            const tag = chip.dataset.chip ?? ''
            if (readLive<TagState>('motion-tags').state.tags.includes(tag)) return
            let preview: ReturnType<typeof bindDragPreview> | undefined
            let over = false
            stop?.()
            stop = bindDrag(root, event, {
              threshold: dragThreshold,
              cancelOnEscape: true,
              onStart: () => {
                preview = bindDragPreview(chip, { x: event.clientX, y: event.clientY })
                chip.setAttribute('data-dragging', '')
              },
              onMove: sample => {
                preview?.move(sample.x, sample.y)
                const card = root.querySelector<HTMLElement>('.mo-task')
                const rect = card?.getBoundingClientRect()
                over =
                  !!rect &&
                  sample.x >= rect.left &&
                  sample.x <= rect.right &&
                  sample.y >= rect.top &&
                  sample.y <= rect.bottom
                card?.toggleAttribute('data-over', over)
                preview?.el.toggleAttribute('data-over', over)
              },
              onEnd: (_up, canceled) => {
                preview?.remove()
                chip.removeAttribute('data-dragging')
                root.querySelector('.mo-task')?.removeAttribute('data-over')
                if (over && !canceled) {
                  update(current =>
                    current.tags.includes(tag)
                      ? current
                      : { ...current, tags: [...current.tags, tag] },
                  )
                }
                stop = undefined
              },
            })
          })
          return () => {
            stop?.()
            cleanup()
          }
        }),
      ),
    ],
    [
      h.div(
        [h.Class('mo-chips'), h.Attribute('role', 'group'), h.Attribute('aria-label', 'Labels')],
        TAG_LABELS.map(tag => {
          const used = state.tags.includes(tag)
          return h.button(
            [
              h.Type('button'),
              h.Class('mo-chip'),
              h.DataAttribute('chip', tag),
              ...(used ? [h.DataAttribute('used', '')] : []),
              ...(used ? [h.Attribute('aria-disabled', 'true')] : []),
              h.Attribute('aria-label', `${tag}, drag onto the task or press Enter`),
              h.OnKeyDownPreventDefault((pressed, modifiers) => {
                void modifiers
                if (pressed === 'Enter' || pressed === ' ') {
                  return Option.some(add(tag))
                }
                return Option.none()
              }),
            ],
            [
              h.i(
                [
                  h.Class('ph-bold ph-dots-six-vertical'),
                  h.Style({ fontSize: '14px' }),
                  h.Attribute('aria-hidden', 'true'),
                ],
                [],
              ),
              tag,
            ],
          )
        }),
      ),
      h.div([h.Class('mo-task')], [
        h.p([h.Class('mo-task-title')], ['Redesign pricing page']),
        h.ul([h.Class('mo-task-tags'), h.Attribute('aria-label', 'Task labels')], [
          ...state.tags.map(tag =>
            h.li([h.Class('mo-task-tag')], [
              tag,
              h.button(
                [
                  h.Type('button'),
                  h.Attribute('aria-label', `Remove ${tag}`),
                  h.OnClick(
                    set(current => ({
                      ...current,
                      tags: current.tags.filter(item => item !== tag),
                    })),
                  ),
                ],
                [icon(h, 'x', 'bold', 14)],
              ),
            ]),
          ),
        ]),
      ]),
    ],
  )
}

/* 14. Preview: hover a theme before choosing it */

const THEMES: Record<string, string> = {
  clay: 'oklch(0.6 0.14 42)',
  moss: 'oklch(0.55 0.1 135)',
  harbor: 'oklch(0.5 0.11 245)',
  saffron: 'oklch(0.76 0.15 80)',
  slate: 'oklch(0.45 0.02 260)',
}
const themeName = (key: string) => key[0].toUpperCase() + key.slice(1)

type ThemeState = { value: string; preview: string | null }

const themeView = ({ state, set, h }: TileContext<ThemeState>) => {
  bindLive('motion-theme', state, set)
  const shown = state.preview ?? state.value
  const previewing = state.preview !== null
  const keys = Object.keys(THEMES)
  const choose = (key: string) =>
    set(current => ({ ...current, value: key, preview: null }))

  return h.div([h.Class('mo-theme')], [
    h.div([h.Class('mo-theme-card'), h.Style({ '--swatch': THEMES[shown] })], [
      h.span([h.Class('mo-theme-bar')], []),
      h.span([h.Class('mo-theme-text')], [
        h.span([h.Class('mo-theme-title')], ['Sunday market run']),
        h.span([h.Class('mo-theme-meta')], ['Sat 9:30 · Mercado']),
      ]),
    ]),
    h.div(
      [
        h.Class('mo-theme-swatches'),
        h.Attribute('role', 'radiogroup'),
        h.Attribute('aria-label', 'Event color'),
      ],
      keys.map((key, index) =>
        h.button(
          [
            h.Type('button'),
            h.Class('mo-theme-swatch'),
            h.Attribute('role', 'radio'),
            h.Attribute('aria-label', themeName(key)),
            h.Attribute('aria-checked', String(state.value === key)),
            h.Tabindex(state.value === key ? 0 : -1),
            ...(state.preview === key ? [h.DataAttribute('previewing', '')] : []),
            h.Style({ '--swatch': THEMES[key] }),
            h.OnMouseEnter(set(current => ({ ...current, preview: key }))),
            h.OnMouseLeave(set(current => ({ ...current, preview: null }))),
            h.OnClick(choose(key)),
            h.OnKeyDownPreventDefault((pressed, modifiers) => {
              void modifiers
              if (pressed === 'ArrowRight') {
                return Option.some(choose(keys[(index + 1) % keys.length]))
              }
              if (pressed === 'ArrowLeft') {
                return Option.some(choose(keys[(index - 1 + keys.length) % keys.length]))
              }
              if (pressed === 'Enter' || pressed === ' ') {
                return Option.some(choose(key))
              }
              return Option.none()
            }),
          ],
          [],
        ),
      ),
    ),
    h.p([h.Class('mo-theme-status'), h.Attribute('aria-live', 'polite')], [
      previewing ? `Trying ${themeName(shown)}` : `${themeName(shown)}, saved`,
    ]),
  ])
}

/* 15. Lasso and selection: pins on a map */

const PINS: Record<string, { name: string; x: number; y: number }> = {
  lumen: { name: 'Café Lumen', x: 18, y: 28 },
  copper: { name: 'Copper Kettle', x: 40, y: 18 },
  dock: { name: 'Dockside Roasters', x: 66, y: 34 },
  fig: { name: 'Fig & Bean', x: 30, y: 62 },
  north: { name: 'North Pour', x: 56, y: 70 },
  owl: { name: 'Night Owl Espresso', x: 82, y: 60 },
}

type LassoRect = { x0: number; y0: number; x1: number; y1: number }
type LassoState = {
  selected: string[]
  lasso: LassoRect | null
  size: { w: number; h: number }
}

const insideRect = (rect: LassoRect, x: number, y: number) => {
  const left = Math.min(rect.x0, rect.x1)
  const right = Math.max(rect.x0, rect.x1)
  const top = Math.min(rect.y0, rect.y1)
  const bottom = Math.max(rect.y0, rect.y1)
  return x >= left && x <= right && y >= top && y <= bottom
}

// PORT NOTE: createLasso's primitive store is replaced by a Model-held rect;
// the release hit-test is the same percentage-based check against pin centres.
const lassoView = ({ state, set, h }: TileContext<LassoState>) => {
  bindLive('motion-lasso', state, set)
  const count = state.selected.length

  return h.div([h.Class('mo-fill')], [
    h.div(
      [
        h.Class('mo-map'),
        h.Attribute('role', 'group'),
        h.Attribute('aria-label', 'Coffee map'),
        h.OnMount(
          mountTile<LassoState>('MotionLasso', 'motion-lasso', (root, update) => {
            const cleanups: Array<() => void> = []
            cleanups.push(
              observeSize(root, size =>
                update(current =>
                  current.size.w === size.w && current.size.h === size.h
                    ? current
                    : { ...current, size },
                ),
              ),
            )
            let stop: (() => void) | undefined
            cleanups.push(
              listen(root, 'pointerdown', (event: PointerEvent) => {
                if (event.button !== 0) return
                const target = event.target as Element | null
                if (target?.closest('[data-pin]')) return
                if (event.target !== root) return
                const rect = root.getBoundingClientRect()
                const start = {
                  x: event.clientX - rect.left,
                  y: event.clientY - rect.top,
                }
                update(current => ({
                  ...current,
                  lasso: { x0: start.x, y0: start.y, x1: start.x, y1: start.y },
                }))
                stop?.()
                stop = bindDrag(root, event, {
                  threshold: 2,
                  onMove: sample =>
                    update(current => ({
                      ...current,
                      lasso: {
                        x0: start.x,
                        y0: start.y,
                        x1: sample.x - rect.left,
                        y1: sample.y - rect.top,
                      },
                    })),
                  onEnd: (_up, canceled) => {
                    update(current => {
                      if (canceled || !current.lasso) {
                        return { ...current, lasso: null }
                      }
                      const selected = Object.entries(PINS)
                        .filter(([, pin]) =>
                          insideRect(
                            current.lasso as LassoRect,
                            (pin.x / 100) * rect.width,
                            (pin.y / 100) * rect.height,
                          ),
                        )
                        .map(([key]) => key)
                      return { ...current, selected, lasso: null }
                    })
                    stop = undefined
                  },
                })
              }),
            )
            cleanups.push(
              listen(root, 'click', (event: MouseEvent) => {
                const pin = (event.target as Element | null)?.closest(
                  '[data-pin]',
                ) as HTMLElement | null
                if (!pin) return
                const key = pin.dataset.pin ?? ''
                update(current => {
                  if (event.shiftKey || event.metaKey || event.ctrlKey) {
                    return {
                      ...current,
                      selected: current.selected.includes(key)
                        ? current.selected.filter(item => item !== key)
                        : [...current.selected, key],
                    }
                  }
                  return { ...current, selected: [key] }
                })
              }),
            )
            return () => {
              stop?.()
              cleanups.forEach(cleanup => cleanup())
            }
          }),
        ),
      ],
      [
        h.span([h.Class('mo-map-road'), h.DataAttribute('road', 'a'), h.Attribute('aria-hidden', 'true')], []),
        h.span([h.Class('mo-map-road'), h.DataAttribute('road', 'b'), h.Attribute('aria-hidden', 'true')], []),
        h.span([h.Class('mo-map-river'), h.Attribute('aria-hidden', 'true')], []),
        ...Object.entries(PINS).map(([key, pin]) => {
          const selected = state.selected.includes(key)
          const lassoed =
            !!state.lasso &&
            insideRect(
              state.lasso,
              (pin.x / 100) * state.size.w,
              (pin.y / 100) * state.size.h,
            )
          return h.button(
            [
              h.Type('button'),
              h.Class('mo-pin'),
              h.Attribute('aria-label', pin.name),
              h.Attribute('aria-pressed', String(selected)),
              h.DataAttribute('pin', key),
              ...(selected ? [h.DataAttribute('selected', '')] : []),
              ...(lassoed ? [h.DataAttribute('lassoed', '')] : []),
              h.Style({ left: `${pin.x}%`, top: `${pin.y}%` }),
            ],
            [icon(h, 'coffee', 'fill', 14)],
          )
        }),
        state.lasso
          ? h.div(
              [
                h.Class('mo-lasso'),
                h.Attribute('aria-hidden', 'true'),
                h.Style({
                  position: 'absolute',
                  left: `${Math.min(state.lasso.x0, state.lasso.x1)}px`,
                  top: `${Math.min(state.lasso.y0, state.lasso.y1)}px`,
                  width: `${Math.abs(state.lasso.x1 - state.lasso.x0)}px`,
                  height: `${Math.abs(state.lasso.y1 - state.lasso.y0)}px`,
                }),
              ],
              [],
            )
          : '',
        h.p([h.Class('mo-map-status'), h.Attribute('aria-live', 'polite')], [
          count ? `${count} ${count === 1 ? 'pin' : 'pins'} selected` : 'Drag across the map',
        ]),
      ],
    ),
  ])
}

/* 16. Auto-scroll: drop an event on a date */

const DAYS = Array.from({ length: 14 }, (_, index) => {
  const date = 9 + index
  const weekday = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index % 7]
  return { id: `nov-${date}`, label: `${weekday} ${date}` }
})

type DatesState = { day: string | null }

const datesView = ({ state, set, h }: TileContext<DatesState>) => {
  bindLive('motion-dates', state, set)
  return h.div(
    [
      h.Class('mo-dates'),
      h.OnMount(
        mountTile<DatesState>('MotionDates', 'motion-dates', (root, update) => {
          let stop: (() => void) | undefined
          const cleanup = listen(root, 'pointerdown', (event: PointerEvent) => {
            if (event.button !== 0) return
            const chip = (event.target as Element | null)?.closest(
              '.mo-event-chip',
            ) as HTMLElement | null
            if (!chip) return
            const list = root.querySelector<HTMLElement>('.mo-days')
            let preview: ReturnType<typeof bindDragPreview> | undefined
            let target: string | null = null
            let last = { x: event.clientX, y: event.clientY }
            const find = () => {
              const hit = document
                .elementFromPoint(last.x, last.y)
                ?.closest('[data-day]') as HTMLElement | null
              const next = hit && list?.contains(hit) ? hit.dataset.day ?? null : null
              if (next === target) return
              list?.querySelector('[data-over]')?.removeAttribute('data-over')
              if (hit && next) hit.setAttribute('data-over', '')
              target = next
            }
            const scroll = createAutoScroll({
              edge: 32,
              speed: 8,
              ignore: () => preview?.el,
              onScroll: find,
            })
            stop?.()
            stop = bindDrag(root, event, {
              threshold: 4,
              cancelOnEscape: true,
              onStart: () => {
                preview = bindDragPreview(chip, last)
                chip.setAttribute('data-dragging', '')
              },
              onMove: sample => {
                if (!preview) return
                last = { x: sample.x, y: sample.y }
                preview.move(sample.x, sample.y)
                scroll.update(sample.x, sample.y)
                find()
              },
              onEnd: (_up, canceled) => {
                scroll.stop()
                preview?.remove()
                chip.removeAttribute('data-dragging')
                list?.querySelector('[data-over]')?.removeAttribute('data-over')
                if (!canceled && target) {
                  update(current => ({ ...current, day: target }))
                }
                stop = undefined
              },
            })
          })
          return () => {
            stop?.()
            cleanup()
          }
        }),
      ),
    ],
    [
      h.div([h.Class('mo-dates-side')], [
        h.span([h.Class('b-label')], ['Unscheduled']),
        h.button(
          [
            h.Type('button'),
            h.Class('mo-event-chip'),
            h.Attribute('aria-label', 'Studio walkthrough, drag onto a date'),
          ],
          [
            h.i(
              [
                h.Class('ph-bold ph-dots-six-vertical'),
                h.Style({ fontSize: '14px' }),
                h.Attribute('aria-hidden', 'true'),
              ],
              [],
            ),
            h.span([], [
              'Studio walkthrough',
              h.small([], ['1 h · Room 2']),
            ]),
          ],
        ),
      ]),
      h.div(
        [h.Class('mo-days'), h.Attribute('role', 'list'), h.Attribute('aria-label', 'November')],
        DAYS.map(({ id, label }) =>
          h.div(
            [h.Attribute('role', 'listitem'), h.Class('mo-day'), h.DataAttribute('day', id)],
            [
              h.button(
                [
                  h.Type('button'),
                  h.Class('mo-day-hit'),
                  h.Attribute('aria-label', `Schedule on ${label}`),
                  h.OnClick(set(current => ({ ...current, day: id }))),
                ],
                [label],
              ),
              state.day === id ? h.span([h.Class('mo-day-event')], ['Walkthrough']) : '',
            ],
          ),
        ),
      ),
    ],
  )
}

/* 17. Pull to refresh */

const NEARBY = [
  { name: 'Café Lumen', far: '120 m' },
  { name: 'Tram 28 stop', far: '240 m' },
  { name: 'Jardim da Estrela', far: '450 m' },
]
const FRESH = [
  { name: 'Feira da Ladra', far: '80 m' },
  { name: 'LX Factory', far: '300 m' },
  { name: 'Mercado de Campo de Ourique', far: '520 m' },
]
const PULL_AT = 44

type PullPhase = 'idle' | 'ready' | 'refreshing'
type PullState = {
  rows: ReadonlyArray<{ name: string; far: string }>
  phase: PullPhase
  updated: string
  pull: number
}

// PORT NOTE: the reference writes --pull straight to the sheet. The port keeps
// the same offset in the Model and re-renders it, then springs it with the
// shared solveSpring helper. The refresh timer is cleaned up on unmount.
const pullView = ({ state, set, h }: TileContext<PullState>) => {
  bindLive('motion-pull', state, set)
  return h.div(
    [
      h.Class('mo-pull'),
      h.OnMount(
        mountTile<PullState>('MotionPull', 'motion-pull', (root, update) => {
          let stop: (() => void) | undefined
          let cancelSpring: (() => void) | undefined
          let timer = 0
          let fresh = 0
          const cleanups: Array<() => void> = []

          const sheetOf = () => root.querySelector<HTMLElement>('.mo-pull-sheet')
          const springTo = (y: number, done?: () => void) => {
            cancelSpring?.()
            const current = readLive<PullState>('motion-pull').state.pull
            cancelSpring = runSpring(
              { x: 0, y: current },
              { x: 0, y },
              { x: 0, y: 0 },
              point => update(latest => ({ ...latest, pull: point.y })),
              done,
              { response: 0.35, damping: 0.9 },
            )
          }
          const refresh = () => {
            update(current => ({ ...current, phase: 'refreshing' }))
            springTo(PULL_AT)
            window.clearTimeout(timer)
            timer = window.setTimeout(() => {
              const next = FRESH[fresh % FRESH.length]
              fresh += 1
              update(current => ({
                ...current,
                rows: [
                  next,
                  ...current.rows.filter(row => row.name !== next.name),
                ].slice(0, 3),
                updated: 'Updated just now',
                phase: 'idle',
              }))
              springTo(0)
            }, 900)
          }

          cleanups.push(
            listen(root, 'pointerdown', (event: PointerEvent) => {
              if (event.button !== 0) return
              const sheet = sheetOf()
              if (!sheet || !sheet.contains(event.target as Node)) return
              if (readLive<PullState>('motion-pull').state.phase === 'refreshing') return
              cancelSpring?.()
              const origin = event.clientY
              const height = sheet.clientHeight || 132
              stop?.()
              stop = bindDrag(root, event, {
                threshold: 2,
                cancelOnEscape: true,
                onMove: sample => {
                  const shown = rubberBand(Math.max(0, sample.y - origin), height)
                  update(current => ({
                    ...current,
                    pull: shown,
                    phase: shown >= PULL_AT ? 'ready' : 'idle',
                  }))
                },
                onEnd: (_up, canceled) => {
                  const current = readLive<PullState>('motion-pull').state
                  if (!canceled && current.pull >= PULL_AT) {
                    refresh()
                  } else {
                    update(latest => ({ ...latest, phase: 'idle' }))
                    springTo(0)
                  }
                  stop = undefined
                },
              })
            }),
          )

          cleanups.push(
            listen(root, 'click', (event: MouseEvent) => {
              const button = (event.target as Element | null)?.closest(
                '.mo-pull-refresh',
              )
              if (!button) return
              refresh()
            }),
          )

          return () => {
            stop?.()
            cancelSpring?.()
            window.clearTimeout(timer)
            cleanups.forEach(cleanup => cleanup())
          }
        }),
      ),
    ],
    [
      h.header([h.Class('mo-pull-head')], [
        h.span([h.Class('mo-pull-title')], ['Nearby']),
        h.button(
          [
            h.Type('button'),
            h.Class('mo-pull-refresh'),
            h.Attribute('aria-label', 'Refresh'),
            ...(state.phase === 'refreshing' ? [h.Disabled(true)] : []),
          ],
          [icon(h, 'arrow-clockwise', 'bold')],
        ),
      ]),
      h.div(
        [
          h.Class('mo-pull-viewport'),
          h.Style({ '--pull-progress': String(Math.min(state.pull / PULL_AT, 1)) }),
        ],
        [
          h.div(
            [
              h.Class('mo-pull-indicator'),
              h.DataAttribute('phase', state.phase),
              h.Attribute('aria-live', 'polite'),
            ],
            [
              // PORT NOTE: the reference rotates the SVG through
              // --pull-progress. The font icon carries the same rotation and
              // spin animation inline, since the copied CSS targets svg.
              h.i(
                [
                  h.Class('ph-bold ph-arrow-clockwise'),
                  h.Style({
                    fontSize: '16px',
                    rotate: `${Math.min(state.pull / PULL_AT, 1) * 270}deg`,
                    ...(state.phase === 'refreshing'
                      ? { animation: 'mo-spin 700ms linear infinite' }
                      : {}),
                  }),
                  h.Attribute('aria-hidden', 'true'),
                ],
                [],
              ),
              h.span([], [
                state.phase === 'refreshing'
                  ? 'Refreshing'
                  : state.phase === 'ready'
                    ? 'Release to refresh'
                    : state.updated,
              ]),
            ],
          ),
          h.div(
            [
              h.Class('mo-pull-sheet'),
              h.DataAttribute('phase', state.phase),
              h.Style({ '--pull': `${state.pull}px` }),
            ],
            [
              h.span([h.Class('mo-pull-grabber'), h.Attribute('aria-hidden', 'true')], []),
              h.ul([h.Class('mo-pull-list')], [
                ...state.rows.map(row =>
                  h.li([], [
                    icon(h, 'map-pin', 'fill'),
                    h.span([h.Class('mo-pull-name')], [row.name]),
                    h.span([h.Class('mo-pull-far')], [row.far]),
                  ]),
                ),
              ]),
            ],
          ),
        ],
      ),
    ],
  )
}

/* 18. Radial menu: sectorOf */

const RADIAL_ACTIONS = [
  { label: 'Save', done: 'Saved to Weekend list', icon: 'bookmark-simple' },
  { label: 'Share', done: 'Link copied', icon: 'share-network' },
  { label: 'Street view', done: 'Opening street view', icon: 'person-simple-walk' },
  { label: 'Directions', done: 'Route from your location', icon: 'navigation-arrow' },
]

type RadialState = { open: boolean; active: number; result: string | null }

const radialView = ({ state, set, h }: TileContext<RadialState>) => {
  bindLive('motion-radial', state, set)
  const choose = (index: number) =>
    set(current => ({
      ...current,
      result: RADIAL_ACTIONS[index]?.done ?? current.result,
      open: false,
      active: -1,
    }))
  const close = () =>
    set(current => ({ ...current, open: false, active: -1 }))

  return h.div(
    [
      h.Class('mo-radial'),
      ...(state.open ? [h.DataAttribute('open', '')] : []),
      h.OnMount(
        mountTile<RadialState>('MotionRadial', 'motion-radial', (root, update) => {
          let stop: (() => void) | undefined
          const cleanups: Array<() => void> = []
          cleanups.push(
            listen(root, 'pointerdown', (event: PointerEvent) => {
              if (event.button !== 0) return
              const el = (event.target as Element | null)?.closest(
                '.mo-radial-pin',
              ) as HTMLElement | null
              if (!el) return
              const rect = el.getBoundingClientRect()
              const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              }
              let current = -1
              let strayed = false
              update(latest => ({ ...latest, open: true, active: -1 }))
              stop?.()
              stop = bindDrag(root, event, {
                cancelOnEscape: true,
                onMove: sample => {
                  current = sectorOf(sample.x - center.x, sample.y - center.y, 4, {
                    deadZone: 24,
                  })
                  if (current >= 0) strayed = true
                  update(latest => ({ ...latest, active: current }))
                },
                onEnd: (_up, canceled) => {
                  if (canceled) {
                    update(latest => ({ ...latest, open: false, active: -1 }))
                  } else if (current >= 0) {
                    const action = RADIAL_ACTIONS[current]
                    update(latest => ({
                      ...latest,
                      result: action?.done ?? latest.result,
                      open: false,
                      active: -1,
                    }))
                  } else if (strayed) {
                    update(latest => ({ ...latest, open: false, active: -1 }))
                  }
                  stop = undefined
                },
              })
            }),
          )
          cleanups.push(
            listen(document, 'pointerdown', (event: PointerEvent) => {
              const live = readLive<RadialState>('motion-radial').state
              if (!live.open) return
              if (!root.contains(event.target as Node)) {
                update(latest => ({ ...latest, open: false, active: -1 }))
              }
            }),
          )
          return () => {
            stop?.()
            cleanups.forEach(cleanup => cleanup())
          }
        }),
      ),
    ],
    [
      h.div([h.Class('mo-radial-ring')], [
        ...RADIAL_ACTIONS.map((action, index) =>
          h.button(
            [
              h.Type('button'),
              h.Class('mo-radial-item'),
              h.DataAttribute('index', String(index)),
              ...(state.active === index ? [h.DataAttribute('active', '')] : []),
              h.Attribute('aria-label', action.label),
              h.Tabindex(state.open ? 0 : -1),
              ...(state.open ? [] : [h.Attribute('aria-hidden', 'true')]),
              h.OnClick(choose(index)),
            ],
            [icon(h, action.icon, 'fill')],
          ),
        ),
        h.button(
          [
            h.Type('button'),
            h.Class('mo-radial-pin'),
            h.Attribute('aria-label', 'Pastéis de Belém, actions'),
            h.Attribute('aria-expanded', String(state.open)),
            h.OnKeyDownPreventDefault((pressed, modifiers) => {
              void modifiers
              const arrows: Record<string, number> = {
                ArrowUp: 0,
                ArrowRight: 1,
                ArrowDown: 2,
                ArrowLeft: 3,
              }
              if (pressed in arrows) {
                return Option.some(
                  set(current => ({ ...current, open: true, active: arrows[pressed] })),
                )
              }
              if (pressed === 'Enter' || pressed === ' ') {
                return Option.some(
                  state.open && state.active >= 0 ? choose(state.active) : close(),
                )
              }
              if (pressed === 'Escape') return Option.some(close())
              return Option.none()
            }),
          ],
          [icon(h, 'map-pin', 'fill')],
        ),
      ]),
      h.p([h.Class('mo-radial-caption'), h.Attribute('aria-live', 'polite')], [
        state.open
          ? state.active >= 0
            ? RADIAL_ACTIONS[state.active]?.label ?? 'Swipe toward an action'
            : 'Swipe toward an action'
          : state.result ?? 'Pastéis de Belém',
      ]),
    ],
  )
}

/* 19. Resizable: split panes in a design tool */

const splitView = ({ h }: TileContext<{}>) => {
  const root = Resizable.Root.withMessage(h)
  const panel = Resizable.Panel.withMessage(h)
  const handle = Resizable.Handle.withMessage(h)
  return root([h.Class('mo-split')], [
    panel(
      [h.Class('mo-split-panel'), panel.DefaultSize(34), panel.MinSize(24)],
      [
        h.span([h.Class('mo-split-label')], ['Layers']),
        h.ul([h.Class('mo-split-layers')], [
          h.li([], [icon(h, 'frame-corners', 'fill', 14), h.span([], ['Page'])]),
          h.li([], [icon(h, 'text-t', 'fill', 14), h.span([], ['Title'])]),
          h.li([], [icon(h, 'image', 'fill', 14), h.span([], ['Cover'])]),
        ]),
      ],
    ),
    handle([h.Class('mo-split-handle'), h.Attribute('aria-label', 'Resize layers')], [
      h.span([h.Class('mo-split-grip')], []),
    ]),
    panel(
      [
        h.Class('mo-split-panel'),
        h.Class('mo-split-canvas'),
        panel.DefaultSize(30),
        panel.MinSize(20),
      ],
      [h.span([h.Class('mo-split-board')], [])],
    ),
    handle([h.Class('mo-split-handle'), h.Attribute('aria-label', 'Resize inspector')], [
      h.span([h.Class('mo-split-grip')], []),
    ]),
    panel(
      [h.Class('mo-split-panel'), panel.DefaultSize(36), panel.MinSize(26)],
      [
        h.span([h.Class('mo-split-label')], ['Inspector']),
        h.dl([h.Class('mo-split-props')], [
          h.div([], [h.dt([], ['W']), h.dd([], ['1440'])]),
          h.div([], [h.dt([], ['H']), h.dd([], ['900'])]),
        ]),
      ],
    ),
  ])
}

/* Tiles */

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'motion-canvas',
    title: 'Wire the flow.',
    blurb: 'Pan, zoom, move nodes, connect ports.',
    size: 'large',
    tone: 'blueprint',
    initial: flowInitial,
    render: flowView,
  },
  {
    id: 'motion-layers',
    title: 'Rank the layers.',
    blurb: 'Drag a row, or pick it up with Space.',
    initial: {
      order: Object.keys(LAYERS),
      focused: null,
      moving: null,
    } as LayerState,
    render: layersView,
  },
  {
    id: 'motion-throw',
    title: 'Throw it.',
    blurb: 'Flick to skip, or let it spring back.',
    tone: 'signal',
    initial: {
      deck: Object.keys(PLACES),
      x: 0,
      y: 0,
      opacity: 1,
      dragging: false,
    } as ThrowState,
    render: throwView,
  },
  {
    id: 'motion-board',
    title: 'Plan the week.',
    blurb: 'Drag cards across columns, or use the arrows.',
    size: 'wide',
    tone: 'paper',
    initial: {
      lists: {
        backlog: ['icons', 'legend', 'onboarding'],
        week: ['kerning'],
      },
      dragging: null,
    } as BoardState,
    render: boardView,
  },
  {
    id: 'motion-stickies',
    title: 'Stick it anywhere.',
    blurb: 'Drag notes, or nudge with Alt and arrows.',
    tone: 'butter',
    initial: {
      positions: {
        kickoff: { x: 12, y: 12 },
        lena: { x: 132, y: 40 },
        friday: { x: 36, y: 100 },
      },
      size: { w: 260, h: 180 },
      dragging: null,
    } as StickyState,
    render: stickyView,
  },
  {
    id: 'motion-day',
    title: 'Stack the day.',
    blurb: 'Overlapping events share the width.',
    size: 'tall',
    tone: 'sky',
    initial: { plans: dayPlans, dragging: null } as DayState,
    render: dayView,
  },
  {
    id: 'motion-palette',
    title: 'Move a handful.',
    blurb: 'Select a few swatches, then drag one.',
    tone: 'paper',
    initial: {
      order: Object.keys(SWATCHES),
      selected: ['olive', 'lagoon'],
      focused: null,
      moving: null,
    } as PaletteState,
    render: paletteView,
  },
  {
    id: 'motion-frame',
    title: 'Size the frame.',
    blurb: 'Eight handles, plus the arrow keys.',
    tone: 'blueprint',
    initial: {
      box: { x: 40, y: 34, width: 176, height: 108 },
      size: { w: 260, h: 180 },
      dragging: null,
    } as FrameState,
    render: frameView,
  },
  {
    id: 'motion-swipe',
    title: 'Swipe it away.',
    blurb: 'Archive and delete wait behind each row.',
    initial: {
      rows: Object.keys(INBOX),
      open: null,
      drag: null,
    } as SwipeState,
    render: swipeView,
  },
  {
    id: 'motion-color',
    title: 'Pick a shade.',
    blurb: 'Saturation across, brightness up.',
    tone: 'ink',
    initial: { s: 72, v: 86 } as ColorState,
    render: colorView,
  },
  {
    id: 'motion-timeline',
    title: 'Book the studio.',
    blurb: 'Draw, move and stretch bookings.',
    size: 'wide',
    initial: {
      bookings: [
        {
          id: 'review',
          track: 'a',
          start: 9 * 60,
          end: 11 * 60,
          title: 'Client review',
        },
        {
          id: 'shoot',
          track: 'b',
          start: 10 * 60,
          end: 13 * 60,
          title: 'Photo shoot',
        },
        {
          id: 'demo',
          track: 'a',
          start: 13 * 60 + 30,
          end: 15 * 60 + 30,
          title: 'Sprint demo',
        },
        {
          id: 'vendor',
          track: 'booth',
          start: 11 * 60,
          end: 12 * 60 + 30,
          title: 'Vendor call',
        },
      ],
    } as TimelineState,
    render: timelineView,
  },
  {
    id: 'motion-outline',
    title: 'Nest a layer.',
    blurb: 'Drag sideways to change its depth.',
    initial: {
      rows: [
        { key: 'navbar', depth: 0 },
        { key: 'logo', depth: 1 },
        { key: 'search', depth: 1 },
        { key: 'footer', depth: 0 },
        { key: 'legal', depth: 1 },
      ],
      moving: null,
      focused: null,
    } as OutlineState,
    render: outlineView,
  },
  {
    id: 'motion-tags',
    title: 'Tag the card.',
    blurb: 'Drop a label onto the task.',
    initial: { tags: ['Web'] } as TagState,
    render: tagView,
  },
  {
    id: 'motion-theme',
    title: 'Try before choosing.',
    blurb: 'Hover a color to preview it.',
    tone: 'paper',
    initial: { value: 'harbor', preview: null } as ThemeState,
    render: themeView,
  },
  {
    id: 'motion-lasso',
    title: 'Lasso the pins.',
    blurb: 'Drag a box, or Shift-click to add.',
    initial: {
      selected: ['dock'],
      lasso: null,
      size: { w: 260, h: 180 },
    } as LassoState,
    render: lassoView,
  },
  {
    id: 'motion-dates',
    title: 'Drop on a date.',
    blurb: 'Hold near the edge to scroll.',
    tone: 'paper',
    initial: { day: null } as DatesState,
    render: datesView,
  },
  {
    id: 'motion-pull',
    title: 'Pull to refresh.',
    blurb: 'The list resists the farther you pull.',
    initial: {
      rows: NEARBY,
      phase: 'idle',
      updated: 'Updated 4 min ago',
      pull: 0,
    } as PullState,
    render: pullView,
  },
  {
    id: 'motion-radial',
    title: 'Pick by direction.',
    blurb: 'Press the pin, swipe toward an action.',
    tone: 'sage',
    initial: { open: false, active: -1, result: null } as RadialState,
    render: radialView,
  },
  {
    id: 'motion-split',
    title: 'Split the workspace.',
    blurb: 'Drag the dividers between panels.',
    tone: 'paper',
    initial: {},
    render: splitView,
  },
]
