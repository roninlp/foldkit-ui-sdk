import { expect, test } from '@playwright/test'

// Drives the example app the way a person would. It proves the three seams
// that matter: UI SDK state reaches the Foldkit Model, the Model reaches the
// element as a property, and a Foldkit re-render leaves an open popover alone.
test('UI SDK components work inside Foldkit', async ({ page }) => {
  const errors: string[] = []
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', error => errors.push(error.message))

  await page.goto('/')

  const toggle = page.locator('ui-toggle button')
  const pressed: (string | null)[] = []
  for (let index = 0; index < 3; index++) {
    await toggle.click()
    pressed.push(await toggle.getAttribute('aria-pressed'))
  }
  expect(pressed).toEqual(['true', 'false', 'true'])

  const tabs = page.locator('ui-tabs-tab button')
  const panels = page.locator('ui-tabs-panel')
  expect(await tabs.nth(0).getAttribute('aria-selected')).toBe('true')
  await tabs.nth(1).click()
  expect(await tabs.nth(0).getAttribute('aria-selected')).toBe('false')
  expect(await panels.nth(0).getAttribute('hidden')).not.toBeNull()

  const content = page.locator('ui-popover-content')
  await page.locator('ui-popover-trigger button').click()
  await expect(content).toBeVisible()
  await page.locator('#mark-read').click()
  await expect(content).toContainText('Marked read 1 times.')
  await expect(content).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(content).toBeHidden()

  expect(errors).toEqual([])
})
