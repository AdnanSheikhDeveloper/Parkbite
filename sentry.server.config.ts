import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || 'https://placeholder@sentry.io/placeholder',
  tracesSampleRate: 1.0,
  debug: false,
});
