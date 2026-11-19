import { expect, test } from '@playwright/test'

// The marketing and docs site is built with the bindings it documents: the
// navigation is a SegmentedControl, the FAQ and limits are Accordions, the
// version chip is a Tooltip, and the agents page runs the real agent bridge
// through a Foldkit Command.

test.use({ baseURL: 'http://localhost:5197' })

test('the site documents the build with its own components', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/')

  // Home: the numbers are derived from the generated component index.
  await expect(page.locator('.hero h1')).toContainText('UI SDK')
  await expect(page.locator('.meta')).toContainText('56 entries')
  await expect(page.locator('.meta')).toContainText('361 tags')

  // The FAQ accordion opens from its trigger.
  await page.locator('[data-slot="accordion-trigger"]').first().click()
  await expect(page.locator('[data-slot="accordion-panel"]').first()).toBeVisible()

  // Navigation is a SegmentedControl bound to the Model.
  await page.locator('[data-slot="segmented-control-item"]').nth(1).click()
  await expect(page.locator('.page-h, .prose-h').first()).toBeVisible()
  await expect(page.locator('.section', { hasText: 'Limits' })).toBeVisible()

  // The component index is parsed from the generated docs/components.md.
  await page.locator('[data-slot="segmented-control-item"]').nth(3).click()
  const rows = page.locator('.table-wide tbody tr')
  await expect(rows).toHaveCount(56)
  await expect(rows.first()).toContainText('foldkit-ui-sdk/accordion')

  // Agents: the live bridge, run as Foldkit Commands.
  await page.locator('[data-slot="segmented-control-item"]').nth(2).click()
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
