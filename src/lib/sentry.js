import * as Sentry from '@sentry/react';
import { useEffect } from 'react';
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from 'react-router-dom';

// No-ops until VITE_SENTRY_DSN is set (see .env.example) — safe to import
// unconditionally, including in dev, where you generally don't want reports.
// Must be imported before any other app module (see main.jsx) so errors
// during module evaluation and early navigation are still captured.
const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.reactRouterV6BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  });
}

export { Sentry };
