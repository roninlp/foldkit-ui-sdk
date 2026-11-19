// Captures docs/screenshot.png from the showcase example. Reuses a dev server
// already running on 5198 and starts one otherwise, so `pnpm run screenshot`
// works both locally and in CI.
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

const port = 5198
const url = `http://localhost:${port}/`
const here = path.dirname(new URL(import.meta.url).pathname)
const outFile = path.resolve(here, '../docs/screenshot.png')

let server = null

const respond = async () => {
  try {
    const response = await fetch(url, { method: 'HEAD' })
    return response.ok
  } catch {
    return false
  }
}

if (!(await respond())) {
  server = spawn('pnpm', ['--filter', 'showcase', 'run', 'dev'], {
    cwd: path.resolve(here, '..'),
    stdio: 'ignore',
  })
  const deadline = Date.now() + 30_000
  while (Date.now() < deadline) {
    if (await respond()) break
    await new Promise(resolve => setTimeout(resolve, 250))
  }
}

try {
  const browser = await chromium.launch()
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  })
  await page.goto(url, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  mkdirSync(path.dirname(outFile), { recursive: true })
  await page.screenshot({ path: outFile, fullPage: true })
  await browser.close()
  console.log(`Wrote ${outFile}`)
} finally {
  server?.kill()
}
