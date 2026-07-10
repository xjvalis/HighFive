import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'
import { sentryVitePlugin } from '@sentry/vite-plugin'

// Source maps only get generated/uploaded when SENTRY_AUTH_TOKEN is set —
// otherwise `sourcemap` stays off so no .map files ship to production
// unattached and unremoved (they'd expose readable source).
const sentryConfigured = !!process.env.SENTRY_AUTH_TOKEN

export default defineConfig({
  build: {
    sourcemap: sentryConfigured ? 'hidden' : false,
  },
  plugins: [
    react(),
    ...(sentryConfigured ? [sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      sourcemaps: { filesToDeleteAfterUpload: ['**/*.js.map'] },
    })] : []),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
})
