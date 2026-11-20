import { readFileSync } from 'node:fs'

import { expect, test } from '@playwright/test'

// The site is the one example app, built with the bindings it documents: the
// navigation is a SegmentedControl, the docs sidebar opens per-component pages
// that run their component live, the showcase walks all sixteen demos with
// every state change reaching the Foldkit Model and back, and the agents page
// runs the real agent bridge through a Foldkit Command.

test.use({ baseURL: 'http://localhost:5197' })

// The reference sink's 145 tiles, captured from ui-sdk.dev/sink. The port must
// match this list exactly: ids, order, sizes, tones and copy.
const referenceTiles: ReadonlyArray<{
  id: string
  size: string
  tone: string
  title: string
  blurb: string
}> = JSON.parse(
  readFileSync(new URL('./reference-sink-tiles.json', import.meta.url), 'utf8'),
)

const watchConsole = (page: import('@playwright/test').Page) => {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))
  return errors
}

test('the home page documents the build with its own components', async ({ page }) => {
  const errors = watchConsole(page)

  await page.goto('/')

  // The numbers are derived from the generated component index.
  await expect(page.locator('.hero h1')).toContainText('UI SDK')
  await expect(page.locator('.meta')).toContainText('56 entries')
  await expect(page.locator('.meta')).toContainText('361 tags')

  // The FAQ accordion opens from its trigger.
  await page.locator('[data-slot="accordion-trigger"]').first().click()
  await expect(page.locator('[data-slot="accordion-panel"]').first()).toBeVisible()

  expect(errors).toEqual([])
})

test('the docs pages run the component they document, from a sidebar', async ({ page }) => {
  const errors = watchConsole(page)

  await page.goto('/')

  // Docs open on the introduction, with the sidebar on the left.
  await page
    .locator('[data-slot="segmented-control-item"]')
    .filter({ hasText: 'Docs' })
    .click()
  await expect(page.locator('.docs-side')).toBeVisible()
  await expect(page.locator('.docs-main h1')).toHaveText('Introduction')
  await expect(page.locator('.side-link')).toHaveCount(25)

  // A component docs page: overview, live demo, code, the parts.
  await page.locator('.side-link').filter({ hasText: 'Dialog' }).click()
  await expect(page.locator('.docs-main h1')).toHaveText('Dialog')
  await expect(page.locator('.import-chip')).toHaveText('foldkit-ui-sdk/dialog')
  await expect(page.locator('.demo-frame')).toBeVisible()
  await expect(page.locator('.docs-main .code')).toContainText('foldkit-ui-sdk/dialog')
  await expect(page.locator('.docs-main .table')).toContainText('<ui-dialog-content>')
  await expect(page.locator('.docs-main a', { hasText: 'Open it in the Sink' })).toHaveAttribute(
    'href',
    '/?uses=Dialog',
  )

  // The demo on the docs page is live and holds its state in the Model.
  const demo = page.locator('.demo-frame')
  await demo.locator('[data-slot="dialog-trigger"]').click()
  await expect(demo.locator('[data-slot="dialog-content"]')).toBeVisible()
  await demo.locator('#confirm-delete').click()
  await expect(demo.locator('[data-slot="dialog-content"]')).toBeHidden()
  await expect(demo).toContainText('Project deleted.')

  // A getting-started article from the same sidebar.
  await page.locator('.side-link').filter({ hasText: 'Install' }).click()
  await expect(page.locator('.docs-main h1')).toHaveText('Install')
  await expect(page.locator('.docs-main .code')).toContainText('pnpm add foldkit-ui-sdk')

  // The sidebar marks the open article.
  await expect(page.locator('.side-link[aria-current="page"]')).toHaveText('Install')

  expect(errors).toEqual([])
})

test('the showcase components hold their state in the Foldkit Model', async ({ page }) => {
  const errors = watchConsole(page)

  await page.goto('/')
  await page
    .locator('[data-slot="segmented-control-item"]')
    .filter({ hasText: 'Showcase' })
    .click()
  await expect(page.locator('.card')).toHaveCount(16)

  // Toggle — aria-pressed follows the Model.
  const toggle = page.locator('.card [data-slot="toggle"]')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  // Switch — starts on, toggles off and on.
  const sw = page.locator('.card [data-slot="switch"]')
  await expect(sw).toHaveAttribute('data-checked', '')
  await sw.click()
  await expect(sw).not.toHaveAttribute('data-checked', '')
  await sw.click()
  await expect(sw).toHaveAttribute('data-checked', '')

  // Checkbox group — the Model holds the checked values.
  await page.locator('.card [data-slot="checkbox"]').nth(1).click()
  await expect(page.locator('.card [data-slot="checkbox"]').nth(1)).toHaveAttribute('data-checked', '')
  await page.locator('.card [data-slot="checkbox"]').nth(0).click()
  await expect(page.locator('.card [data-slot="checkbox"]').nth(0)).not.toHaveAttribute('data-checked', '')

  // Radio group.
  await page.locator('.card [data-slot="radio"]').nth(2).click()
  await expect(page.locator('.card [data-slot="radio"]').nth(2)).toHaveAttribute('data-checked', '')

  // Tabs — selection is a Model field.
  await page.locator('.card [data-slot="tabs-tab"]').nth(2).click()
  await expect(page.locator('.card [data-slot="tabs-tab"]').nth(2)).toHaveAttribute('data-selected', '')
  await expect(page.locator('.card [data-slot="tabs-tab"]').nth(0)).not.toHaveAttribute('data-selected', '')

  // Accordion — multiple panels stay open.
  await page.locator('.card [data-slot="accordion-trigger"]').nth(1).click()
  await expect(page.locator('.card [data-slot="accordion-panel"]').nth(1)).toBeVisible()
  await expect(page.locator('.card [data-slot="accordion-panel"]').nth(0)).toBeVisible()

  // Slider — one step with the keyboard, readout included.
  await page.locator('.card [data-slot="slider-thumb"] input').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('.card [data-slot="slider-value"]')).toHaveText('$250')

  // Rating — the radio inside the star is what takes the press.
  await page.locator('.card [data-slot="rating-radio"]').nth(1).click()
  await expect(page.locator('.card', { hasText: 'Rating' })).toContainText('2 of 5')

  // Segmented control — the indicator slides to the choice.
  const cardSegmented = page
    .locator('.card')
    .filter({ hasText: 'Segmented control' })
    .locator('[data-slot="segmented-control-item"]')
  await cardSegmented.nth(2).click()
  await expect(cardSegmented.nth(2)).toHaveAttribute('data-checked', '')

  // Progress — a bare button moves the Model, the layer draws the bar.
  await page.locator('#upload-next').click()
  await expect(page.locator('.card', { hasText: 'Progress and meter' })).toContainText('60%')

  // Popover — open, dispatch, stay open across the Foldkit re-render.
  await page.locator('.card [data-slot="popover-trigger"]').click()
  const popover = page.locator('.card [data-slot="popover-content"]')
  await expect(popover).toBeVisible()
  await page.locator('#mark-read').click()
  await expect(popover).toContainText('Marked read 1 times.')
  await expect(popover).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()

  // Tooltip on hover.
  await page.locator('.card [data-slot="tooltip-trigger"]').hover()
  await expect(page.locator('.card [data-slot="tooltip-content"]')).toBeVisible()

  // Dialog — a focused task, confirmed from inside.
  await page.locator('.card [data-slot="dialog-trigger"]').click()
  const dialog = page.locator('.card [data-slot="dialog-content"]')
  await expect(dialog).toBeVisible()
  await page.locator('#confirm-delete').click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.card', { hasText: 'Dialog' })).toContainText('Project deleted.')

  // Menu — an item reports back, a checkbox item rounds through the Model.
  await page.locator('.card [data-slot="menu-trigger"]').click()
  await page.locator('.card [data-slot="menu-item"]').first().click()
  await expect(page.locator('.card', { hasText: 'Menu' })).toContainText('Last action: rename')
  await page.locator('.card [data-slot="menu-trigger"]').click()
  const pin = page.locator('.card [data-slot="menu-checkbox-item"]')
  await expect(pin).toBeVisible()
  await pin.click()
  await expect(pin).toHaveAttribute('data-checked', '')
  await page.keyboard.press('Escape')

  // Select — one value from a popup list.
  await page.locator('.card [data-slot="select-trigger"]').click()
  await page.locator('.card [data-slot="select-item"]').nth(2).click()
  await expect(page.locator('.card [data-slot="select-value"]')).toHaveText('Admin')

  // Field and input — typing round-trips through the Model.
  await page.locator('.card [data-slot="input"]').fill('grace')
  await expect(page.locator('.card', { hasText: 'Field and input' })).toContainText('Hello, grace.')

  expect(errors).toEqual([])
})

// The sink is a 1:1 port of the reference bento: 145 composed tiles, tones
// and sizes, and a floating filter made of the component names a tile uses.

test('the sink renders the reference bento and filters by component names', async ({ page }) => {
  const errors = watchConsole(page)

  await page.goto('/?only=reference')
  await expect(page.locator('.sink .bento')).toBeVisible()
  await expect(page.locator('.tile')).toHaveCount(4)
  await expect(page.locator('#reference-storage')).toHaveAttribute('data-tone', 'butter')
  await expect(page.locator('#reference-volume')).toHaveAttribute('data-tone', 'ink')
  await expect(page.locator('#reference-format')).toHaveAttribute('data-tone', 'paper')
  await expect(page.locator('.tile-error')).toHaveCount(0)
  await expect(page.locator('.filter')).not.toHaveAttribute('data-open', '')

  // A component name on a tile narrows the grid and opens the floating filter.
  await page.locator('#reference-switches .tile-use').filter({ hasText: 'Switch' }).click()
  await expect(page).toHaveURL(url => url.searchParams.get('only') === 'reference' && url.searchParams.get('uses') === 'Switch')
  await expect(page.locator('.tile:visible')).toHaveCount(1)
  await expect(page.locator('.filter')).toHaveAttribute('data-open', '')
  await expect(page.locator('.filter-count')).toHaveText('1 tile')

  // No visible tile here uses both names, so a second name comes from a URL.
  await page.goto('/?only=reference&uses=Switch,Meter')
  await expect(page.locator('.tile:visible')).toHaveCount(2)
  await expect(page.locator('.filter-mode')).toBeVisible()
  await page.locator('.filter-mode button', { hasText: 'All' }).click()
  await expect(page).toHaveURL(/mode=all/)
  await expect(page.locator('.tile:visible')).toHaveCount(0)
  await expect(page.locator('.bento-empty')).toBeVisible()

  await page.goto('/?only=reference&uses=Switch')
  await page.locator('.filter-clear').click()
  await expect(page).toHaveURL(url => url.searchParams.get('only') === 'reference' && !url.searchParams.has('uses'))
  await expect(page.locator('.tile:visible')).toHaveCount(4)
  await expect(page.locator('.filter')).not.toHaveAttribute('data-open', '')

  // A ?uses link boots straight into the sink.
  await page.goto('/?only=reference&uses=Slider')
  await expect(page.locator('.tile:visible')).toHaveCount(1)
  await expect(page.locator('.tile:visible')).toHaveId('reference-volume')

  expect(errors).toEqual([])
})

test('the sink matches the reference tile list exactly', async ({ page }) => {
  const errors = watchConsole(page)

  await page.goto('/')
  await page
    .locator('[data-slot="segmented-control-item"]')
    .filter({ hasText: 'Sink' })
    .click()

  await expect(page.locator('.tile')).toHaveCount(referenceTiles.length)
  const actual = await page.locator('.tile').evaluateAll(tiles =>
    tiles.map(tile => {
      const strong = tile.querySelector('.tile-title strong')
      const full = tile.querySelector('.tile-title')
      const title = strong?.textContent ?? ''
      return {
        id: tile.id,
        size: tile.getAttribute('data-size') ?? 's',
        tone: tile.getAttribute('data-tone') ?? 'white',
        title,
        blurb: full ? full.textContent.replace(title, '').trim() : '',
      }
    }),
  )
  expect(actual).toEqual(referenceTiles)
  await expect(page.locator('.tile-error')).toHaveCount(0)

  expect(errors).toEqual([])
})

test('the reference tiles round-trip their state through the Foldkit Model', async ({ page }) => {
  const errors = watchConsole(page)

  await page.goto('/?only=reference')

  // Volume: the slider value is state, and the readout follows it.
  const volume = page.locator('#reference-volume')
  await volume.locator('[data-slot="slider-thumb"] input').focus()
  await page.keyboard.press('ArrowRight')
  await expect(volume).toContainText('65%')

  // Formatting: two toggle groups, both Model lists.
  const format = page.locator('#reference-format')
  await format.locator('.ref-tool[aria-label="Italic"]').click()
  await expect(format.locator('.ref-sample')).toHaveCSS('font-style', 'italic')
  await format.locator('.ref-tool[aria-label="Align center"]').click()
  await expect(format.locator('.ref-sample')).toHaveCSS('text-align', 'center')

  // Switches: the first starts checked and toggles off.
  const wifi = page.locator('#reference-switches ui-switch').first()
  await expect(wifi).toHaveAttribute('data-checked', '')
  await wifi.click()
  await expect(wifi).not.toHaveAttribute('data-checked', '')

  expect(errors).toEqual([])
})

test('the sink keeps the reference behaviors across groups', async ({ page }) => {
  const errors = watchConsole(page)

  // A parent checkbox checks its whole group.
  await page.goto('/?only=forms-alerts')
  await page.locator('#forms-alerts .fm-al-parent').first().click()
  await expect(page.locator('#forms-alerts .fm-al-count').first()).toHaveText('4 of 4')
  await expect(page.locator('#forms-alerts .fm-al-row ui-checkbox[data-checked]')).toHaveCount(4)

  // A color preset repaints the mock site.
  await page.goto('/?only=forms-brand-color')
  await page.locator('#forms-brand-color ui-color-picker-swatch-item').nth(3).click()
  await expect(page.locator('#forms-brand-color .pk-site')).toHaveAttribute(
    'style',
    /--pk-brand: #30a46c/,
  )

  // A meter-backed goal moves with its button.
  await page.goto('/?only=collections-reading-goal')
  await page.locator('#collections-reading-goal .cl-goal-actions button').nth(1).click()
  await expect(page.locator('#collections-reading-goal .cl-ring-num')).toHaveText('35')
  await expect(page.locator('#collections-reading-goal .cl-goal-left')).toHaveText('17 to go')

  // The scroll picker follows the arrow keys.
  await page.goto('/?only=motion-wheel')
  await page.locator('#motion-wheel .gs-wheel').first().click()
  await page.keyboard.press('ArrowDown')
  await expect(page.locator('#motion-wheel .gs-alarm-head')).toContainText('8:30 AM')

  // The scripted agent runs through the real bridge.
  await page.goto('/?only=language-agent')
  await page.locator('#language-agent button', { hasText: 'Run' }).click()
  await expect(page.locator('#language-agent .lc-agent-log')).toContainText('snapshot()', {
    timeout: 5000,
  })

  expect(errors).toEqual([])
})

// The reference drives spans and selections with createSpans and createSelection;
// the port rebuilds those gestures on bindDrag, so they need their own coverage.

test('the sink drags calendar spans and group selections like the reference', async ({ page }) => {
  const errors = watchConsole(page)

  // The week: a lone plan fills its day column, moves across days, and both
  // of its edges stretch it.
  await page.goto('/?only=studio-week')
  const week = page.locator('#studio-week')
  const folio = week.locator('[data-span-id="portfolio"]')
  await expect(folio).toHaveAttribute('aria-label', 'Folio review, Wednesday 10:00 to 11:30')
  const folioBox = await folio.boundingBox()
  const thuBox = await week.locator('[data-week-track="thu"]').boundingBox()
  expect(folioBox.width).toBeGreaterThan(80)

  await page.mouse.move(folioBox.x + folioBox.width / 2, folioBox.y + folioBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(thuBox.x + thuBox.width / 2, folioBox.y + folioBox.height / 2, {
    steps: 8,
  })
  await page.mouse.up()
  await expect(folio).toHaveAttribute('aria-label', 'Folio review, Thursday 10:00 to 11:30')

  const dentistEdge = week.locator('[data-span-id="dentist"] [data-span-edge="end"]')
  const edgeBox = await dentistEdge.boundingBox()
  await expect(week.locator('[data-span-id="dentist"]')).toHaveAttribute(
    'aria-label',
    'Dentist, Thursday 9:15 to 10:00',
  )
  await page.mouse.move(edgeBox.x + edgeBox.width / 2, edgeBox.y + edgeBox.height / 2)
  await page.mouse.down()
  await page.mouse.move(edgeBox.x + edgeBox.width / 2, edgeBox.y + edgeBox.height / 2 + 27, {
    steps: 5,
  })
  await expect(week.locator('[data-span-id="dentist"]')).toHaveAttribute('data-resizing', '')
  await page.mouse.up()
  await expect(week.locator('[data-span-id="dentist"]')).toHaveAttribute(
    'aria-label',
    'Dentist, Thursday 9:15 to 10:45',
  )

  // The timeline: the start edge pulls a booking's start, keeping its end.
  await page.goto('/?only=motion-timeline')
  const timeline = page.locator('#motion-timeline')
  const vendor = timeline.locator('[data-booking="vendor"]')
  await expect(vendor).toHaveAttribute('aria-label', 'Vendor call, 11:00 to 12:30')
  const startEdge = await vendor.locator('[data-span-edge="start"]').boundingBox()
  const track = await timeline.locator('[data-tl-track="b"]').boundingBox()
  await page.mouse.move(startEdge.x + startEdge.width / 2, startEdge.y + startEdge.height / 2)
  await page.mouse.down()
  await page.mouse.move(
    startEdge.x + startEdge.width / 2 - track.width / 8,
    startEdge.y + startEdge.height / 2,
    { steps: 6 },
  )
  await page.mouse.up()
  await expect(vendor).toHaveAttribute('aria-label', 'Vendor call, 10:00 to 12:30')

  // The palette: Shift adds to the selection, and a drag carries the group.
  await page.goto('/?only=motion-palette')
  const palette = page.locator('#motion-palette')
  const swatches = palette.locator('[data-swatch]')
  const chosen = palette.locator('[data-swatch][data-selected]')
  await expect(chosen).toHaveCount(2)
  const terracotta = await palette.locator('[data-swatch="terracotta"]').boundingBox()
  await page.keyboard.down('Shift')
  await page.mouse.click(terracotta.x + terracotta.width / 2, terracotta.y + terracotta.height / 2)
  await page.keyboard.up('Shift')
  await expect(chosen).toHaveCount(3)

  const blush = await palette.locator('[data-swatch="blush"]').boundingBox()
  await page.mouse.move(
    terracotta.x + terracotta.width / 2,
    terracotta.y + terracotta.height / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    blush.x + blush.width / 2 + 30,
    blush.y + blush.height / 2,
    { steps: 12 },
  )
  await page.mouse.up()
  await expect(chosen).toHaveCount(3)
  await expect(await swatches.evaluateAll(els => els.map(el => el.dataset.swatch))).toEqual([
    'sand',
    'pine',
    'denim',
    'charcoal',
    'olive',
    'lagoon',
    'terracotta',
    'blush',
  ])

  expect(errors).toEqual([])
})

test('the sheet paints a cell range under the pointer like the reference', async ({ page }) => {
  const errors = watchConsole(page)

  await page.goto('/?only=language-sheet')
  const sheet = page.locator('#language-sheet')
  const selected = () =>
    sheet.locator('.lg-sheet-cell[data-selected]').evaluateAll(els => els.map(el => el.id.slice(-3)))

  // The seeded range shows before anything is pressed.
  await expect(sheet.locator('.lg-sheet-ref')).toHaveText('C2:D4')
  expect(await selected()).toEqual(['1-2', '1-3', '2-2', '2-3', '3-2', '3-3'])

  // Dragging across the grid paints the rectangle from the pressed cell.
  const b2 = await sheet.locator('#sink-language-sheet-cell-1-1').boundingBox()
  const d4 = await sheet.locator('#sink-language-sheet-cell-3-3').boundingBox()
  await page.mouse.move(b2.x + b2.width / 2, b2.y + b2.height / 2)
  await page.mouse.down()
  await page.mouse.move(d4.x + d4.width / 2, d4.y + d4.height / 2, { steps: 8 })
  await expect(sheet.locator('.lg-sheet-ref')).toHaveText('B2:D4')
  expect(await selected()).toHaveLength(9)
  await page.mouse.up()
  await expect(sheet.locator('.lg-sheet-ref')).toHaveText('B2:D4')

  // A plain press takes the active cell and drops the range.
  const a2 = await sheet.locator('#sink-language-sheet-cell-1-0').boundingBox()
  await page.mouse.click(a2.x + a2.width / 2, a2.y + a2.height / 2)
  await expect(sheet.locator('.lg-sheet-ref')).toHaveText('A2')
  expect(await selected()).toEqual(['1-0'])
  await expect(sheet.locator('[data-active]')).toHaveId('sink-language-sheet-cell-1-0')

  // Shift stretches the range from the active cell to the pressed one.
  const c3 = await sheet.locator('#sink-language-sheet-cell-2-2').boundingBox()
  await page.keyboard.down('Shift')
  await page.mouse.click(c3.x + c3.width / 2, c3.y + c3.height / 2)
  await page.keyboard.up('Shift')
  await expect(sheet.locator('.lg-sheet-ref')).toHaveText('A2:C3')
  expect(await selected()).toEqual(['1-0', '1-1', '1-2', '2-0', '2-1', '2-2'])

  // The keyboard range still grows from the focused cell.
  await page.locator('#sink-language-sheet-cell-1-1').click()
  await page.keyboard.press('Shift+ArrowDown')
  await expect(sheet.locator('.lg-sheet-ref')).toHaveText('B2:B3')
  await page.keyboard.press('ArrowRight')
  await expect(sheet.locator('.lg-sheet-ref')).toHaveText('C3')

  expect(errors).toEqual([])
})

// The port's Phosphor font icons take the place of the reference's React svgs,
// and the gestures that carry selections across a drag are rebuilt on
// bindDrag. Both sides of that need their own coverage.

test('the sink keeps one icon where the port draws it, and rotations that follow state', async ({ page }) => {
  const errors = watchConsole(page)

  // The receipt's caret turns with the panel it opens.
  await page.goto('/?only=overlays-receipt')
  const receipt = page.locator('#overlays-receipt')
  const second = receipt.locator('.ly-order-trigger').nth(1)
  await expect(second.locator('.ly-order-caret')).toHaveCSS('rotate', 'none')
  await second.click()
  await expect(second.locator('.ly-order-caret')).toHaveCSS('rotate', '180deg')
  await second.click()
  await expect(second.locator('.ly-order-caret')).toHaveCSS('rotate', 'none')

  // The presence caret sits at the trigger's far end, as the reference's
  // `margin-left: auto` puts it.
  await page.goto('/?only=overlays-presence')
  const presence = page.locator('#overlays-presence')
  await page.waitForTimeout(500)
  const caretBox = await presence.locator('.ov-presence-trigger [class*="ph-"]').boundingBox()
  const triggerBox = await presence.locator('.ov-presence-trigger').boundingBox()
  expect(triggerBox.x + triggerBox.width - (caretBox.x + caretBox.width)).toBeLessThan(20)
  expect(caretBox.x - triggerBox.x).toBeGreaterThan(100)

  // Stepper icons center in their round buttons.
  await page.goto('/?only=forms-nights')
  const nights = page.locator('#forms-nights')
  const step = async sel => {
    const btn = await nights.locator(sel).boundingBox()
    const ic = await nights.locator(`${sel} [class*="ph-"]`).boundingBox()
    return { dx: ic.x + ic.width / 2 - (btn.x + btn.width / 2), dy: ic.y + ic.height / 2 - (btn.y + btn.height / 2) }
  }
  expect(await step('[data-slot="number-input-decrement"]')).toMatchObject({ dx: 0, dy: 0 })
  expect(await step('[data-slot="number-input-increment"]')).toMatchObject({ dx: 0, dy: 0 })

  // The rating draws one star per slot, not the pair the element's own
  // masked star would add.
  await page.goto('/?only=forms-stay-rating')
  const star = page.locator('#forms-stay-rating .pk-star').first()
  await expect(star).toHaveCSS('width', '28px')
  expect(await star.evaluate(el => getComputedStyle(el, '::before').content !== 'none')).toBe(false)
  expect(await star.evaluate(el => el.querySelectorAll('[class*="ph-"]').length)).toBe(2)

  // A Shift lasso over the pins adds to what was already selected.
  await page.goto('/?only=motion-lasso')
  const lasso = page.locator('#motion-lasso')
  const chosen = () =>
    lasso.locator('[data-pin][data-selected]').evaluateAll(els => els.map(el => el.getAttribute('aria-label')))
  const firstPin = await lasso.locator('[data-pin]').first().boundingBox()
  await page.mouse.click(firstPin.x + firstPin.width / 2, firstPin.y + firstPin.height / 2)
  await expect
    .poll(async () => (await chosen()).join(','), { timeout: 3000 })
    .toBe('Café Lumen')
  const map = await lasso.locator('.mo-map').boundingBox()
  await page.keyboard.down('Shift')
  await page.mouse.move(map.x + 8, map.y + 8)
  await page.mouse.down()
  await page.mouse.move(map.x + map.width * 0.9, map.y + map.height * 0.9, { steps: 10 })
  // The rectangle previews the addition while the pointer is down.
  expect(await lasso.locator('[data-pin][data-lassoed]').count()).toBeGreaterThan(1)
  await page.mouse.up()
  await page.keyboard.up('Shift')
  await expect
    .poll(async () => (await chosen()).join(','), { timeout: 3000 })
    .not.toBe('Café Lumen')
  const after = await chosen()
  expect(after).toContain('Café Lumen')
  expect(after.length).toBeGreaterThan(1)

  expect(errors).toEqual([])
})

test('the component index is generated from docs/components.md', async ({ page }) => {
  const errors = watchConsole(page)

  await page.goto('/')
  await page
    .locator('[data-slot="segmented-control-item"]')
    .filter({ hasText: 'Components' })
    .click()
  const rows = page.locator('.table-wide tbody tr')
  await expect(rows).toHaveCount(56)
  await expect(rows.first()).toContainText('foldkit-ui-sdk/accordion')

  expect(errors).toEqual([])
})

test('the agents page runs the bridge as Foldkit Commands', async ({ page }) => {
  const errors = watchConsole(page)

  await page.goto('/')
  await page
    .locator('[data-slot="segmented-control-item"]')
    .filter({ hasText: 'Agents' })
    .click()
  const switchEl = page.locator('[data-slot="switch"]')
  await expect(switchEl).not.toHaveAttribute('data-checked', '')

  await page.locator('button', { hasText: 'Snapshot this page' }).click()
  const log = page.locator('.agent-log')
  await expect(log).toContainText('components on the page')
  await expect(log).toContainText('segmented-control')

  await page.locator('button', { hasText: 'Agent: turn notifications on' }).click()
  await expect(switchEl).toHaveAttribute('data-checked', '')
  await expect(log).toContainText('switch "Notifications": checked = true')

  // The footer chip carries a Tooltip.
  await page.locator('.chip').hover()
  await expect(page.locator('[data-slot="tooltip-content"]')).toBeVisible()

  expect(errors).toEqual([])
})

// A dark-mode OS must not flip UI SDK's palette against the light page: the
// unlayered `color-scheme: light` pin keeps component text readable.

test('component text stays readable under a dark-mode OS', async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: 'dark' })
  const page = await context.newPage()
  await page.goto('http://localhost:5197/')

  // Wait for the app to render, not a fixed timeout.
  const trigger = page.locator('[data-slot="accordion-trigger"]').first()
  await expect(trigger).toBeAttached()

  const scheme = await page.evaluate(() =>
    getComputedStyle(document.documentElement).colorScheme,
  )
  expect(scheme).toBe('light')

  // The accordion trigger's text is near-black on the light page, not the
  // near-white a dark scheme would pick.
  const color = await trigger.evaluate(el => getComputedStyle(el).color)
  expect(color).toBe('oklch(0.145 0 0)')

  await context.close()
})
