"use client";
import { useEffect, useState } from "react";

// Public shells can be precompiled without baking deployment secrets or stale
// readiness into HTML. The server still validates every submitted request.
export function useFormAvailability(initial: { enabled: boolean; preview: boolean; mailEnabled?: boolean }) {
  const [availability, setAvailability] = useState(initial);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/vector/availability', { cache: 'no-store', credentials: 'omit', signal: controller.signal })
      .then(async response => {
        if (!response.ok) return;
        const value = await response.json();
        if (typeof value.enabled === 'boolean' && typeof value.preview === 'boolean' && typeof value.mailEnabled === 'boolean')
          setAvailability({ enabled: value.enabled, preview: value.preview, mailEnabled: value.mailEnabled });
      }).catch(() => {});
    return () => controller.abort();
  }, []);
  return availability;
}
