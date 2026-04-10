'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';

/**
 * Keeps the Omniverse WebRTC stream connected across all routes (including dashboard/Strategy Studio).
 * Renders the stream in a hidden container so commands from any page can be sent via omniverseBus.
 * Skips when on /Omniverse since App renders the visible stream there.
 * Auto-reconnects when the stream fails (e.g. after navigating away from Omniverse).
 */
const StreamOnlyWindow = dynamic(
  () => import('./StreamOnlyWindow'),
  { ssr: false }
);

export function OmniverseStreamProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOmniverseRoute = pathname === '/Omniverse';
  const [retryKey, setRetryKey] = useState(0);

  const handleStreamFailed = useCallback(() => {
    // Auto-reconnect after a delay (e.g. after App unmounts and terminates the stream)
    setTimeout(() => setRetryKey((k) => k + 1), 2500);
  }, []);

  return (
    <>
      {children}
      {/* Persistent hidden stream when not on /Omniverse (App handles that route) */}
      {!isOmniverseRoute && (
        <div
          className="fixed inset-0 -z-50 overflow-hidden"
          style={{ visibility: 'hidden', pointerEvents: 'none' }}
          aria-hidden
        >
          <StreamOnlyWindow
            key={retryKey}
            sessionId=""
            backendUrl=""
            signalingserver=""
            signalingport={0}
            mediaserver=""
            mediaport={0}
            accessToken=""
            headerHeight={0}
            onStreamFailed={handleStreamFailed}
          />
        </div>
      )}
    </>
  );
}
