import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.NODE_ENV,

  enabled: process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SENTRY_ENABLED === 'true',

  tracesSampleRate: 1.0,

  debug: false,

  beforeSend(event) {
    // Remove sensitive server-side data
    if (event.request?.cookies) {
      delete event.request.cookies;
    }

    if (event.extra) {
      // Remove any environment variables
      if ('env' in event.extra) {
        delete event.extra.env;
      }
    }

    return event;
  },
});
