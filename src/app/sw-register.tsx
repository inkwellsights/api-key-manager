"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only.
 * Renders nothing — drop this anywhere in the layout body.
 */
export function SwRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV === "production" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => {
          // Fail silently — SW is a progressive enhancement.
          console.error("[SW] Registration failed:", err);
        });
    }
  }, []);

  return null;
}
