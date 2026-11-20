import type { HtmlBuilder } from 'foldkit/html'

import { Meter, Slider, Switch, Toggle, Toolbar } from 'foldkit-ui-sdk'

import type { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './reference.css'

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

const radios = {
  rows: [
    { label: 'Wi-Fi', detail: 'Studio 5G', iconName: 'wifi-high', on: true },
    { label: 'Bluetooth', detail: 'AirPods Pro', iconName: 'bluetooth', on: false },
  ],
}

const Radios = ({ h }: { h: HtmlBuilder<Message> }) => {
  const root = Switch.Root.withMessage(h)
  const thumb = Switch.Thumb.withMessage(h)
  return h.div(
    [h.Class('ref-radios')],
    radios.rows.map(row =>
      h.label([h.Class('ref-radio')], [
        h.span([h.Class('ref-radio-icon')], [icon(h, row.iconName, 'fill')]),
        h.span([h.Class('ref-radio-text')], [
          h.span([], [row.label]),
          h.span([h.Class('ref-radio-detail')], [row.detail]),
        ]),
        root([h.Class('ref-switch'), root.DefaultChecked(row.on)], [
          thumb([h.Class('ref-switch-thumb')], []),
        ]),
      ]),
    ),
  )
}

const storage = (h: HtmlBuilder<Message>) => {
  const meter = Meter.Root.withMessage(h)
  const track = Meter.Track.withMessage(h)
  const indicator = Meter.Indicator.withMessage(h)
  return h.div([h.Class('ref-storage')], [
    h.p([h.Class('ref-storage-lead')], ['Using']),
    h.p([h.Class('ref-storage-number')], ['14.2', h.span([], [' GB'])]),
    meter([h.Class('ref-meter'), h.Attribute('aria-label', 'Storage used'), meter.Value(71)], [
      track([h.Class('ref-meter-track')], [indicator([h.Class('ref-meter-fill')], [])]),
    ]),
    h.p([h.Class('ref-storage-of')], ['of 20 GB on your plan']),
  ])
}

type VolumeState = { volume: number }

const volume = {
  initial: { volume: 64 } as VolumeState,
  render: ({ state, set, h }: TileContext<VolumeState>) => {
    const slider = Slider.Root.withMessage(h)
    const control = Slider.Control.withMessage(h)
    const track = Slider.Track.withMessage(h)
    const fill = Slider.Indicator.withMessage(h)
    const thumb = Slider.Thumb.withMessage(h)
    return h.div([h.Class('ref-volume')], [
      slider(
        [
          h.Class('ref-slider'),
          slider.Value([state.volume]),
          slider.Min(0),
          slider.Max(100),
          slider.OnValuechange(detail => {
            const first = detail.value[0]
            return set(current => ({
              volume: typeof first === 'number' ? first : current.volume,
            }))
          }),
        ],
        [
          icon(h, 'speaker-low', 'fill'),
          control([h.Class('ref-slider-control')], [
            track([h.Class('ref-slider-track')], [
              fill([h.Class('ref-slider-fill')], []),
              thumb([h.Class('ref-slider-thumb'), h.Attribute('aria-label', 'Volume')], []),
            ]),
          ]),
          icon(h, 'speaker-high', 'fill'),
        ],
      ),
      h.p([h.Class('ref-volume-value')], [`${state.volume}%`]),
    ])
  },
}

type FormatState = { marks: ReadonlyArray<string>; align: ReadonlyArray<string> }

const formatting = {
  initial: { marks: ['bold'], align: ['left'] } as FormatState,
  render: ({ state, set, h }: TileContext<FormatState>) => {
    const toolbar = Toolbar.Root.withMessage(h)
    const separator = Toolbar.Separator.withMessage(h)
    const marks = Toggle.Group.withMessage(h)
    const toggle = Toggle.Root.withMessage(h)
    const align = Toggle.Group.withMessage(h)
    return h.div([h.Class('ref-format')], [
      toolbar([h.Class('ref-toolbar'), h.Attribute('aria-label', 'Formatting')], [
        marks(
          [
            h.Class('ref-group'),
            h.Attribute('aria-label', 'Text style'),
            marks.Multiple(true),
            marks.Value(state.marks),
            marks.OnValuechange(detail =>
              set(current => ({ ...current, marks: detail.value })),
            ),
          ],
          [
            toggle([h.Class('ref-tool'), h.Attribute('aria-label', 'Bold'), toggle.Value('bold')], [
              icon(h, 'text-b', 'bold'),
            ]),
            toggle([h.Class('ref-tool'), h.Attribute('aria-label', 'Italic'), toggle.Value('italic')], [
              icon(h, 'text-italic', 'bold'),
            ]),
            toggle([h.Class('ref-tool'), h.Attribute('aria-label', 'Underline'), toggle.Value('underline')], [
              icon(h, 'text-underline', 'bold'),
            ]),
          ],
        ),
        separator([h.Class('ref-sep')], []),
        align(
          [
            h.Class('ref-group'),
            h.Attribute('aria-label', 'Align'),
            align.Value(state.align),
            align.OnValuechange(detail =>
              set(current => ({ ...current, align: detail.value })),
            ),
          ],
          [
            toggle([h.Class('ref-tool'), h.Attribute('aria-label', 'Align left'), toggle.Value('left')], [
              icon(h, 'text-align-left', 'bold'),
            ]),
            toggle([h.Class('ref-tool'), h.Attribute('aria-label', 'Align center'), toggle.Value('center')], [
              icon(h, 'text-align-center', 'bold'),
            ]),
            toggle([h.Class('ref-tool'), h.Attribute('aria-label', 'Align right'), toggle.Value('right')], [
              icon(h, 'text-align-right', 'bold'),
            ]),
          ],
        ),
      ]),
      h.p(
        [
          h.Class('ref-sample'),
          h.Style({
            fontWeight: state.marks.includes('bold') ? '600' : '400',
            fontStyle: state.marks.includes('italic') ? 'italic' : 'normal',
            textDecoration: state.marks.includes('underline') ? 'underline' : 'none',
            textAlign: (state.align[0] ?? 'left') as 'left' | 'center' | 'right',
          }),
        ],
        ['The quick brown fox'],
      ),
    ])
  },
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'reference-switches',
    title: 'Stay connected.',
    blurb: 'Switches that slide and submit.',
    initial: {},
    render: ({ h }) => Radios({ h }),
  },
  {
    id: 'reference-storage',
    title: 'Know your quota.',
    blurb: 'A meter, not a progress bar.',
    tone: 'butter',
    initial: {},
    render: ({ h }) => storage(h),
  },
  {
    id: 'reference-volume',
    title: 'Turn it up.',
    blurb: 'Drag, click or use the arrows.',
    tone: 'ink',
    initial: volume.initial,
    render: volume.render,
  },
  {
    id: 'reference-format',
    title: 'One tab stop.',
    blurb: 'Two toggle groups inside a toolbar.',
    tone: 'paper',
    initial: formatting.initial,
    render: formatting.render,
  },
]
