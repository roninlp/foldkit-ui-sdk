import { expect, test } from '@playwright/test'

// The site is the one example app, built with the bindings it documents: the
// navigation is a SegmentedControl, the docs sidebar opens per-component pages
// that run their component live, the showcase walks all sixteen demos with
// every state change reaching the Foldkit Model and back, and the agents page
// runs the real agent bridge through a Foldkit Command.

test.use({ baseURL: 'http://localhost:5197' })

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
