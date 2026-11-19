import { expect, test } from '@playwright/test'

// The showcase app renders sixteen UI SDK components through foldkit-ui-sdk.
// This walks them the way a person would: every state change must reach the
// Foldkit Model and back, popups must stay open across re-renders, and the
// page must not log a single console error.

test.use({ baseURL: 'http://localhost:5198' })

test('the showcase components hold their state in the Foldkit Model', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/')
  await expect(page.locator('.card')).toHaveCount(16)

  // Toggle — aria-pressed follows the Model.
  const toggle = page.locator('[data-slot="toggle"]')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')

  // Switch — starts on, toggles off and on.
  const sw = page.locator('[data-slot="switch"]')
  await expect(sw).toHaveAttribute('data-checked', '')
  await sw.click()
  await expect(sw).not.toHaveAttribute('data-checked', '')
  await sw.click()
  await expect(sw).toHaveAttribute('data-checked', '')

  // Checkbox group — the Model holds the checked values.
  await page.locator('[data-slot="checkbox"]').nth(1).click()
  await expect(page.locator('[data-slot="checkbox"]').nth(1)).toHaveAttribute('data-checked', '')
  await page.locator('[data-slot="checkbox"]').nth(0).click()
  await expect(page.locator('[data-slot="checkbox"]').nth(0)).not.toHaveAttribute('data-checked', '')

  // Radio group.
  await page.locator('[data-slot="radio"]').nth(2).click()
  await expect(page.locator('[data-slot="radio"]').nth(2)).toHaveAttribute('data-checked', '')

  // Tabs — selection is a Model field.
  await page.locator('[data-slot="tabs-tab"]').nth(2).click()
  await expect(page.locator('[data-slot="tabs-tab"]').nth(2)).toHaveAttribute('data-selected', '')
  await expect(page.locator('[data-slot="tabs-tab"]').nth(0)).not.toHaveAttribute('data-selected', '')

  // Accordion — multiple panels stay open.
  await page.locator('[data-slot="accordion-trigger"]').nth(1).click()
  await expect(page.locator('[data-slot="accordion-panel"]').nth(1)).toBeVisible()
  await expect(page.locator('[data-slot="accordion-panel"]').nth(0)).toBeVisible()

  // Slider — one step with the keyboard, readout included.
  await page.locator('[data-slot="slider-thumb"] input').focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.locator('[data-slot="slider-value"]')).toHaveText('$250')

  // Rating — the radio inside the star is what takes the press.
  await page.locator('[data-slot="rating-radio"]').nth(1).click()
  await expect(page.locator('.card', { hasText: 'Rating' })).toContainText('2 of 5')

  // Segmented control — the indicator slides to the choice.
  await page.locator('[data-slot="segmented-control-item"]').nth(2).click()
  await expect(page.locator('[data-slot="segmented-control-item"]').nth(2)).toHaveAttribute('data-checked', '')

  // Progress — a bare button moves the Model, the layer draws the bar.
  await page.locator('#upload-next').click()
  await expect(page.locator('.card', { hasText: 'Progress and meter' })).toContainText('60%')

  // Popover — open, dispatch, stay open across the Foldkit re-render.
  await page.locator('[data-slot="popover-trigger"]').click()
  const popover = page.locator('[data-slot="popover-content"]')
  await expect(popover).toBeVisible()
  await page.locator('#mark-read').click()
  await expect(popover).toContainText('Marked read 1 times.')
  await expect(popover).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(popover).toBeHidden()

  // Tooltip on hover.
  await page.locator('[data-slot="tooltip-trigger"]').hover()
  await expect(page.locator('[data-slot="tooltip-content"]')).toBeVisible()

  // Dialog — a focused task, confirmed from inside.
  await page.locator('[data-slot="dialog-trigger"]').click()
  const dialog = page.locator('[data-slot="dialog-content"]')
  await expect(dialog).toBeVisible()
  await page.locator('#confirm-delete').click()
  await expect(dialog).toBeHidden()
  await expect(page.locator('.card', { hasText: 'Dialog' })).toContainText('Project deleted.')

  // Menu — an item reports back, a checkbox item rounds through the Model.
  await page.locator('[data-slot="menu-trigger"]').click()
  await page.locator('[data-slot="menu-item"]').first().click()
  await expect(page.locator('.card', { hasText: 'Menu' })).toContainText('Last action: rename')
  await page.locator('[data-slot="menu-trigger"]').click()
  const pin = page.locator('[data-slot="menu-checkbox-item"]')
  await expect(pin).toBeVisible()
  await pin.click()
  await expect(pin).toHaveAttribute('data-checked', '')
  await page.keyboard.press('Escape')

  // Select — one value from a popup list.
  await page.locator('[data-slot="select-trigger"]').click()
  await page.locator('[data-slot="select-item"]').nth(2).click()
  await expect(page.locator('[data-slot="select-value"]')).toHaveText('Admin')

  // Field and input — typing round-trips through the Model.
  await page.locator('[data-slot="input"]').fill('grace')
  await expect(page.locator('.card', { hasText: 'Field and input' })).toContainText('Hello, grace.')

  expect(errors).toEqual([])
})
