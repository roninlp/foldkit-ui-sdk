import {
  contrastRatio,
  formatColor,
  isInGamut,
  mixColor,
  parseColor,
  toGamut,
  type Color,
} from '@ui-sdk/core/color'
import type { ImageCrop } from '@ui-sdk/core/image'
import { cropImage, type UiImageCropperElement } from '@ui-sdk/web'
import { Effect, Queue, Stream } from 'effect'
import { Mount } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'

import {
  Button,
  ColorPicker,
  DateInput,
  Field,
  ImageCropper,
  Input,
  Label,
  Rating,
  TimeInput,
} from 'foldkit-ui-sdk'

import { Message } from '../../model'
import type { Tile, TileContext } from '../types'
import './pickers.css'

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

const white = parseColor('#fff')!
const black = parseColor('#000')!

const readableInk = (color: Color) =>
  contrastRatio(color, white) >= contrastRatio(color, black) ? white : black

/* 1. Brand color */

const brandPresets = [
  '#e5484d',
  '#f76b15',
  '#ffc53d',
  '#30a46c',
  '#12a594',
  '#0090ff',
  '#6e56cf',
  '#d6409f',
]

type BrandState = { value: string }

const brandColor = {
  initial: { value: '#6e56cf' } as BrandState,
  render: ({ state, set, h }: TileContext<BrandState>) => {
    const picker = ColorPicker.Root.withMessage(h)
    const area = ColorPicker.Area.withMessage(h)
    const areaThumb = ColorPicker.AreaThumb.withMessage(h)
    const slider = ColorPicker.Slider.withMessage(h)
    const sliderThumb = ColorPicker.SliderThumb.withMessage(h)
    const swatch = ColorPicker.Swatch.withMessage(h)
    const hexInput = ColorPicker.Input.withMessage(h)
    const swatches = ColorPicker.Swatches.withMessage(h)
    const swatchItem = ColorPicker.SwatchItem.withMessage(h)

    const value = state.value
    const brand = parseColor(value) ?? black
    const ink = formatColor(readableInk(brand), 'hex')
    const tint = formatColor(mixColor(brand, white, 0.86), 'hex')

    return h.div([h.Class('pk-brand')], [
      picker(
        [
          h.Class('pk-picker'),
          h.Attribute('aria-label', 'Brand color'),
          picker.Format('hex'),
          picker.Value(value),
          picker.OnValuechange(detail =>
            set(current => ({ ...current, value: detail.value })),
          ),
        ],
        [
          area([h.Class('pk-area')], [
            areaThumb([h.Class('pk-thumb')], []),
          ]),
          slider([h.Class('pk-slider'), slider.Channel('hue')], [
            sliderThumb([h.Class('pk-thumb pk-slider-thumb')], []),
          ]),
          h.div([h.Class('pk-hex')], [
            swatch([h.Class('pk-swatch')], []),
            // `<ui-color-picker-input>` is display: contents and binds the
            // `<input>` inside it, so the class the CSS styles goes there.
            hexInput([], [
              h.input([
                h.Type('text'),
                h.Class('b-input pk-hex-input'),
                h.Attribute('aria-label', 'Hex'),
              ]),
            ]),
          ]),
          swatches(
            [h.Class('pk-presets'), h.Attribute('aria-label', 'Presets')],
            brandPresets.map(preset =>
              swatchItem([swatchItem.Value(preset)], [
                h.button([h.Class('pk-preset'), h.Type('button')], []),
              ]),
            ),
          ),
        ],
      ),

      h.div(
        [
          h.Class('pk-site'),
          h.Style({
            '--pk-brand': value,
            '--pk-brand-ink': ink,
            '--pk-brand-tint': tint,
          }),
          h.Attribute('aria-hidden', 'true'),
        ],
        [
          h.div([h.Class('pk-site-bar')], [
            h.span([h.Class('pk-site-logo')], []),
            h.span([h.Class('pk-site-name')], ['Fieldnote']),
            h.span([h.Class('pk-site-link')], ['Pricing']),
          ]),
          h.span([h.Class('pk-site-badge')], ['New · Shared notebooks']),
          h.p([h.Class('pk-site-head')], [
            'Notes your whole team can find.',
          ]),
          h.div([h.Class('pk-site-actions')], [
            h.span([h.Class('pk-site-cta')], ['Start free']),
            h.span([h.Class('pk-site-more')], ['Book a demo']),
          ]),
        ],
      ),
    ])
  },
}

/* 2. Contrast check */

const levels = [
  { name: 'AA Large', min: 3 },
  { name: 'AA', min: 4.5 },
  { name: 'AAA', min: 7 },
]

const liftContrast = (text: Color, ground: Color, target: number) => {
  const toward = readableInk(ground)
  const hexAt = (amount: number) =>
    formatColor(toGamut(mixColor(text, toward, amount)), 'hex')
  let low = 0
  let high = 1
  for (let step = 0; step < 16; step++) {
    const middle = (low + high) / 2
    if (contrastRatio(parseColor(hexAt(middle))!, ground) >= target) {
      high = middle
    } else {
      low = middle
    }
  }
  return hexAt(high)
}

// PORT NOTE: the reference keeps a parsed `Color` per field next to its text.
// The Model here stays plain data, so each field stores the last valid color
// as the CSS string `formatColor` writes and parses it again in the view.
type ColorText = { text: string; color: string }

const colorField = (
  h: HtmlBuilder<Message>,
  label: string,
  value: string,
  onValueChange: (next: string) => Message,
) => {
  const field = Field.Root.withMessage(h)
  const fieldLabel = Field.Label.withMessage(h)
  const textInput = Input.Root.withMessage(h)
  const color = parseColor(value)
  return field([h.Class('pk-color-field'), field.Invalid(!color)], [
    fieldLabel([h.Class('b-label')], [label]),
    h.div([h.Class('b-input pk-color-input')], [
      h.span(
        [
          h.Class('pk-dot'),
          h.Style({
            background: color ? formatColor(color) : 'transparent',
          }),
        ],
        [],
      ),
      // PORT NOTE: as with the brand hex field, `<ui-input>` is display:
      // contents and binds a native `<input>`, so the class goes on that
      // input and the controlled `value` sits on the wrapper.
      textInput(
        [
          textInput.Value(value),
          textInput.OnValuechange(detail => onValueChange(detail.value)),
        ],
        [
          h.input([
            h.Type('text'),
            h.Value(value),
            h.Class('pk-bare'),
            h.Spellcheck(false),
            h.Autocomplete('off'),
          ]),
        ],
      ),
    ]),
  ])
}

type ContrastState = { fore: ColorText; back: ColorText }

const contrastCheck = {
  initial: {
    fore: { text: '#8b8d98', color: '#8b8d98' },
    back: { text: '#fdfcf9', color: '#fdfcf9' },
  } as ContrastState,
  render: ({ state, set, h }: TileContext<ContrastState>) => {
    const fixButton = Button.Root.withMessage(h)

    const fore = parseColor(state.fore.color) ?? black
    const back = parseColor(state.back.color) ?? white
    const ratio = contrastRatio(fore, back)
    const passesAA = ratio >= 4.5
    const isWide = !isInGamut(fore) || !isInGamut(back)

    const update = (key: 'fore' | 'back', next: string) => {
      const parsed = parseColor(next)
      const patch = parsed
        ? { text: next, color: formatColor(parsed) }
        : { text: next }
      return key === 'fore'
        ? set(current => ({ ...current, fore: { ...current.fore, ...patch } }))
        : set(current => ({ ...current, back: { ...current.back, ...patch } }))
    }

    return h.div([h.Class('pk-contrast')], [
      h.div(
        [
          h.Class('pk-sample'),
          h.Style({
            background: formatColor(back),
            color: formatColor(fore),
          }),
        ],
        [
          h.p([h.Class('pk-sample-head')], ['Your order is on its way.']),
          h.p([h.Class('pk-sample-body')], [
            'Track it any time from Orders. We’ll text you when it’s close.',
          ]),
        ],
      ),

      h.div([h.Class('pk-score')], [
        h.p(
          [h.Class('pk-ratio'), h.Attribute('aria-live', 'polite')],
          [
            ratio.toFixed(2),
            h.span([h.Class('pk-ratio-unit')], [': 1']),
          ],
        ),
        h.ul(
          [h.Class('pk-levels'), h.Attribute('aria-label', 'WCAG levels')],
          levels.map(level => {
            const passes = ratio >= level.min
            return h.li(
              [
                h.Class('pk-level'),
                ...(passes ? [h.DataAttribute('pass', '')] : []),
              ],
              [
                // Labelled icons, so not the shared aria-hidden helper.
                h.i(
                  [
                    h.Class(`ph-bold ph-${passes ? 'check' : 'x'}`),
                    h.Style({ fontSize: '12px' }),
                    h.Attribute('aria-label', passes ? 'Passes' : 'Fails'),
                  ],
                  [],
                ),
                level.name,
              ],
            )
          }),
        ),
      ]),

      h.div([h.Class('pk-color-fields')], [
        colorField(h, 'Text', state.fore.text, next => update('fore', next)),
        colorField(h, 'Background', state.back.text, next =>
          update('back', next),
        ),
      ]),

      h.div([h.Class('pk-contrast-foot')], [
        h.p([h.Class('pk-note')], [
          isWide
            ? 'Outside sRGB; checked as given.'
            : passesAA
              ? 'Body text reads clearly.'
              : 'Too faint for body text.',
        ]),
        // PORT NOTE: `ui-button` declares no events in the manifest, so the
        // press is bound on the inner native button, the wrapper only styles.
        fixButton([fixButton.Disabled(passesAA)], [
          h.button(
            [
              h.Type('button'),
              h.Class('b-btn'),
              h.Attribute('data-variant', 'primary'),
              h.OnClick(update('fore', liftContrast(fore, back, 4.5))),
            ],
            [icon(h, 'magic-wand', 'bold', 14), 'Fix text'],
          ),
        ]),
      ]),
    ])
  },
}

/* 3. Avatar crop */

const portrait = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="480"><defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb38a"/><stop offset=".6" stop-color="#ff7a59"/><stop offset="1" stop-color="#c2410c"/></linearGradient><linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b2a20"/><stop offset="1" stop-color="#1c130e"/></linearGradient></defs><rect width="720" height="480" fill="url(#s)"/><circle cx="560" cy="120" r="48" fill="#fff4e6" opacity=".85"/><path d="M0 360 140 280l120 70 140-110 160 120 160-80v220H0z" fill="#9a3412" opacity=".55"/><path d="M250 480c10-90 60-140 110-150h0c50 10 100 60 110 150z" fill="#1e3a8a"/><rect x="335" y="270" width="50" height="70" rx="20" fill="#e8a27c"/><ellipse cx="360" cy="220" rx="62" ry="74" fill="#f2b591"/><path d="M296 214c-4-60 30-98 68-98 44 0 72 34 66 96-10-30-28-46-50-52-30 16-60 24-84 54z" fill="url(#h)"/><circle cx="338" cy="226" r="5" fill="#2a1a12"/><circle cx="384" cy="226" r="5" fill="#2a1a12"/><path d="M344 258q16 12 32 0" stroke="#9a4a2e" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`,
)}`

type CropState = {
  crop: ImageCrop | null
  avatar: string | null
  saving: boolean
}

const avatarCrop = {
  initial: { crop: null, avatar: null, saving: false } as CropState,
  render: ({ state, set, h }: TileContext<CropState>) => {
    const cropper = ImageCropper.Root.withMessage(h)
    const viewport = ImageCropper.Viewport.withMessage(h)
    const image = ImageCropper.Image.withMessage(h)
    const selection = ImageCropper.Selection.withMessage(h)
    const zoom = ImageCropper.Zoom.withMessage(h)
    const rotate = ImageCropper.Rotate.withMessage(h)
    const saveButton = Button.Root.withMessage(h)

    // PORT NOTE: `cropImage` is async and `ui-button` exposes no events in the
    // manifest, so the save runs from a native `action` listener installed by
    // `OnMount`. The listener outlives the render that installed it, so it
    // reads the live crop and the previous avatar back out of the DOM instead
    // of trusting a captured state slice.
    const saveAvatar = Mount.defineStream('SinkPickersSaveAvatar', {
      messages: [Message],
      execute: ({ element }) =>
        Stream.callback<Message>(queue =>
          Effect.gen(function* () {
            yield* Effect.acquireRelease(
              Effect.sync(() => {
                const handler = () => {
                  void (async () => {
                    const host = element.closest(
                      'ui-image-cropper',
                    ) as UiImageCropperElement | null
                    const crop = host?.crop ?? null
                    if (!crop) return
                    const avatarElement = host?.querySelector('.pk-avatar')
                    const previous =
                      avatarElement instanceof HTMLImageElement
                        ? avatarElement.src
                        : null
                    Queue.offerUnsafe(
                      queue,
                      set({ crop, avatar: previous, saving: true }),
                    )
                    const file = await cropImage(portrait, crop, {
                      width: 160,
                      shape: 'circle',
                    })
                    if (previous) URL.revokeObjectURL(previous)
                    Queue.offerUnsafe(
                      queue,
                      set({
                        crop,
                        avatar: URL.createObjectURL(file),
                        saving: false,
                      }),
                    )
                  })()
                }
                element.addEventListener('action', handler)
                return handler
              }),
              handler =>
                Effect.sync(() => element.removeEventListener('action', handler)),
            )
            return yield* Effect.never
          }),
        ),
    })

    return cropper(
      [
        h.Class('pk-cropper'),
        h.Attribute('aria-label', 'Profile photo'),
        cropper.Src(portrait),
        cropper.Mode('frame'),
        cropper.AspectRatio(1),
        cropper.Shape('circle'),
        cropper.MaxZoom(4),
        ...(state.crop ? [cropper.Crop(state.crop)] : []),
        cropper.OnCropchange(detail =>
          set(current => ({
            ...current,
            crop: (detail.value as ImageCrop | null) ?? null,
          })),
        ),
      ],
      [
        viewport([h.Class('pk-viewport')], [
          // `<ui-image-cropper-image>` is display: contents and binds its
          // wrapped `<img>`, where `.pk-image` belongs.
          image([], [
            h.img([h.Class('pk-image'), h.Alt('Portrait at sunset')]),
          ]),
          selection([h.Class('pk-selection')], []),
        ]),
        h.div([h.Class('pk-crop-side')], [
          h.div([h.Class('pk-profile')], [
            state.avatar
              ? h.img([
                  h.Class('pk-avatar'),
                  h.Src(state.avatar),
                  h.Alt('Your new avatar'),
                ])
              : h.span(
                  [h.Class('pk-avatar'), h.DataAttribute('empty', '')],
                  ['MO'],
                ),
            h.div([h.Class('pk-profile-text')], [
              h.p([h.Class('pk-profile-name')], ['Maya Okafor']),
              h.p([h.Class('pk-profile-meta')], [
                state.avatar ? 'Photo updated' : 'No photo yet',
              ]),
            ]),
          ]),
          h.label([h.Class('pk-zoom')], [
            h.span([h.Class('b-label')], ['Zoom']),
            // The zoom part binds the range input inside it, so the class
            // lands on that input.
            zoom([], [h.input([h.Type('range'), h.Class('pk-zoom-range')])]),
          ]),
          h.div([h.Class('pk-crop-actions')], [
            rotate([], [
              h.button(
                [
                  h.Type('button'),
                  h.Class('b-btn pk-icon-btn'),
                  h.Attribute('aria-label', 'Rotate'),
                ],
                [icon(h, 'arrow-clockwise', 'bold', 15)],
              ),
            ]),
            saveButton(
              [
                saveButton.Disabled(!state.crop || state.saving),
                h.OnMount(saveAvatar()),
              ],
              [
                h.button(
                  [
                    h.Type('button'),
                    h.Class('b-btn pk-save'),
                    h.Attribute('data-variant', 'primary'),
                  ],
                  ['Save photo'],
                ),
              ],
            ),
          ]),
        ]),
      ],
    )
  },
}

/* 4. Pickup time */

const pickupFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const pickupTimeFormat = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
})

const deskOpens = '06:00'
const deskCloses = '23:00'

const pickupSummary = (date: string | null, time: string | null) => {
  if (!date || !time) {
    return 'Pick a day and time.'
  }
  if (time < deskOpens || time > deskCloses) {
    return 'The desk is open 6 AM to 11 PM.'
  }
  const at = new Date(`${date}T${time}`)
  return `${pickupFormat.format(at)} at ${pickupTimeFormat.format(at)}`
}

type PickupState = { date: string | null; time: string | null }

const pickupTime = {
  initial: { date: '2026-11-20', time: '14:30' } as PickupState,
  render: ({ state, set, h }: TileContext<PickupState>) => {
    const field = Field.Root.withMessage(h)
    const fieldLabel = Field.Label.withMessage(h)
    const dateInput = DateInput.Root.withMessage(h)
    const timeInput = TimeInput.Root.withMessage(h)

    return h.div([h.Class('pk-pickup')], [
      h.p([h.Class('pk-pickup-place')], [
        // PORT NOTE: the icon is the Phosphor font, not an SVG, so the accent
        // colour `.pk-pickup-place svg` gives it is set inline instead.
        h.i(
          [
            h.Class('ph-fill ph-van'),
            h.Style({ fontSize: '16px', color: 'var(--tile-accent)' }),
            h.Attribute('aria-hidden', 'true'),
          ],
          [],
        ),
        'Lisbon Airport, Terminal 1',
      ]),
      h.div([h.Class('pk-pickup-fields')], [
        field([h.Class('pk-pickup-field')], [
          fieldLabel([h.Class('b-label')], ['Date']),
          dateInput(
            [
              h.Class('b-input pk-segments'),
              dateInput.Min('2026-11-18'),
              dateInput.Value(state.date),
              dateInput.OnValuechange(detail =>
                set(current => ({ ...current, date: detail.value })),
              ),
            ],
            [],
          ),
        ]),
        field([h.Class('pk-pickup-field')], [
          fieldLabel([h.Class('b-label')], ['Time']),
          timeInput(
            [
              h.Class('b-input pk-segments'),
              timeInput.Min(deskOpens),
              timeInput.Max(deskCloses),
              timeInput.Value(state.time),
              timeInput.OnValuechange(detail =>
                set(current => ({ ...current, time: detail.value })),
              ),
            ],
            [],
          ),
        ]),
      ]),
      h.p(
        [h.Class('pk-pickup-summary'), h.Attribute('aria-live', 'polite')],
        [pickupSummary(state.date, state.time)],
      ),
    ])
  },
}

/* 5. Stay rating */

const ratingWords = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Superb']
const aspects = ['Cleanliness', 'Location']

// PORT NOTE: the reference's `<Star>` rendered two Phosphor SVGs through the
// typed `Rating.Item`; a template cloned by `<ui-rating>` needs parsed markup,
// so the two icons become icon-font `<i>`s inside `InnerHTML`. That is what
// `.pk-star-fill` clips in place of the SVG.
const starMarkup = (size: number) =>
  `<ui-rating-item class="pk-star"><i class="ph-fill ph-star" style="font-size:${size}px" aria-hidden="true"></i><i class="ph-fill ph-star pk-star-fill" style="font-size:${size}px" aria-hidden="true"></i></ui-rating-item>`

type StayState = { overall: number | null }

const stayRating = {
  initial: { overall: 4.5 } as StayState,
  render: ({ state, set, h }: TileContext<StayState>) => {
    const rating = Rating.Root.withMessage(h)
    const label = Label.Root.withMessage(h)

    // PORT NOTE: React's `useId` is replaced with ids fixed to this tile; the
    // sink renders each tile once, so they stay unique in the document.
    const overallId = 'pickers-stay-overall'
    const aspectId = (aspect: string) =>
      `pickers-stay-${aspect.toLowerCase()}`

    const overall = state.overall

    return h.div([h.Class('pk-stay')], [
      h.div([h.Class('pk-stay-row'), h.DataAttribute('main', '')], [
        label([h.Class('pk-stay-label'), h.For(overallId)], ['Overall']),
        h.span([h.Class('pk-stay-word')], [
          overall
            ? ratingWords[Math.max(1, Math.floor(overall))]
            : 'Not rated',
        ]),
      ]),
      rating(
        [
          h.Id(overallId),
          h.Class('pk-rating'),
          rating.Step(0.5),
          rating.Value(overall),
          rating.OnValuechange(detail =>
            set(current => ({ ...current, overall: detail.value })),
          ),
        ],
        [h.template([h.InnerHTML(starMarkup(28))])],
      ),
      h.div([h.Class('pk-stay-aspects')], [
        ...aspects.map(aspect =>
          h.div([h.Class('pk-stay-row')], [
            label([h.Class('pk-stay-label'), h.For(aspectId(aspect))], [
              aspect,
            ]),
            rating(
              [
                h.Id(aspectId(aspect)),
                h.Class('pk-rating'),
                h.DataAttribute('small', ''),
                rating.DefaultValue(aspect === 'Location' ? 5 : 4),
              ],
              [h.template([h.InnerHTML(starMarkup(16))])],
            ),
          ]),
        ),
      ]),
    ])
  },
}

export const tiles: ReadonlyArray<Tile> = [
  {
    id: 'forms-brand-color',
    title: 'Pick the brand color.',
    blurb: 'Drag, paste a hex or tap a preset; the site follows.',
    size: 'large',
    initial: brandColor.initial,
    render: brandColor.render,
  },
  {
    id: 'forms-contrast',
    title: 'Will it pass AA?',
    blurb: 'Any CSS color in, a WCAG ratio out.',
    size: 'tall',
    tone: 'paper',
    initial: contrastCheck.initial,
    render: contrastCheck.render,
  },
  {
    id: 'forms-avatar-crop',
    title: 'Frame your avatar.',
    blurb: 'Drag to pan, scroll to zoom, then save.',
    size: 'wide',
    tone: 'ink',
    initial: avatarCrop.initial,
    render: avatarCrop.render,
  },
  {
    id: 'forms-pickup-time',
    title: 'Set the pickup time.',
    blurb: 'Type or arrow through each part.',
    tone: 'sky',
    initial: pickupTime.initial,
    render: pickupTime.render,
  },
  {
    id: 'forms-stay-rating',
    title: 'Rate your stay.',
    blurb: 'Half stars by pointer or arrow keys.',
    tone: 'butter',
    initial: stayRating.initial,
    render: stayRating.render,
  },
]
