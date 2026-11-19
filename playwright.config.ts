import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  use: {
    baseURL: 'http://localhost:5199',
  },
  webServer: {
    command: 'npm run dev --workspace poc',
    url: 'http://localhost:5199',
    reuseExistingServer: !process.env.CI,
  },
})
