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
    rollupOptions: {
      output: {
        // Split the vendor libraries out of the app's own code so a change
        // to app code doesn't invalidate the browser cache for React et al,
        // and so the (large, rarely-changing) map/animation libraries aren't
        // forced into every route's critical path.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-sentry': ['@sentry/react'],
          'vendor-map': ['leaflet', 'react-leaflet'],
          'vendor-motion': ['framer-motion'],
        },
      },
    },
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
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    env: {
      // geocoding.test.js exercises the Mapy.cz code path and asserts on its
      // response shape — that must not depend on whether the machine
      // running the tests happens to have a real key in .env (it won't in
      // CI). A synthetic key here just needs to be truthy; every network
      // call in that test is mocked, nothing real is ever sent.
      VITE_MAPY_CZ_API_KEY: 'test-key',
    },
  },
})
