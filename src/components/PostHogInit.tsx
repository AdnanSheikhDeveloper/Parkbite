'use client';

import posthog from 'posthog-js';
import { useEffect } from 'react';

export default function PostHogInit() {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_placeholder_key';
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

    posthog.init(key, {
      api_host: host,
      capture_pageview: true,
      persistence: 'localStorage',
      autocapture: true,
    });
  }, []);

  return null;
}
