import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5197',
  },
  // The site is the one example app: marketing, docs, showcase and the
  // agent-bridge demo in a single Foldkit app.
  webServer: [
    {
      command: 'pnpm --filter site run dev',
      url: 'http://localhost:5197',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
