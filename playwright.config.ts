import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5199',
  },
  // One dev server per example app. Each spec pins its own baseURL; the poc
  // keeps the default.
  webServer: [
    {
      command: 'pnpm --filter poc run dev',
      url: 'http://localhost:5199',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter showcase run dev',
      url: 'http://localhost:5198',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'pnpm --filter site run dev',
      url: 'http://localhost:5197',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
