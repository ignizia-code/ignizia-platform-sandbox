'use client';

import React, { memo, useState } from 'react';
import StreamOnlyWindow from './StreamOnlyWindow';


/**
 * Omniverse viewer page: embeds the stream-only viewer that connects to the
 * already-running Omniverse Kit app using stream.config.json (local source).
 * Accessible at route /Omniverse.
 */
const OmniverseViewerPage: React.FC = () => {
    const [connected, setConnected] = useState(false);

    const handleStreamFailed = () => {
        console.warn('Omniverse stream failed');
        setConnected(false);
    };

    return (
        <div className="absolute inset-0 w-full h-full min-h-0 flex flex-col">
            {connected && (
                <div
                    className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg bg-success/90 text-white text-xs font-medium flex items-center gap-2 shadow-lg"
                    role="status"
                >
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    Connected
                </div>
            )}
            <StreamOnlyWindow
                sessionId=""
                backendUrl=""
                signalingserver=""
                signalingport={0}
                mediaserver=""
                mediaport={0}
                accessToken=""
                headerHeight={0}
                onStreamFailed={handleStreamFailed}
                onStreamReady={() => setConnected(true)}
            />
        </div>
    );
};

export default memo(OmniverseViewerPage);
