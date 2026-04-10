/*
 * SPDX-FileCopyrightText: Copyright (c) 2024 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-NvidiaProprietary
 */
'use client';

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { AppStreamer, StreamEvent, StreamProps, DirectConfig, GFNConfig, StreamType } from '@nvidia/omniverse-webrtc-streaming-library';
import StreamConfig from '../../stream.config.json';
import { markOmniReady, markOmniNotReady } from '@/lib/omniverseBus';
import { Button } from '@/components/ui/Button';
import './AppStream.css';

interface AppStreamProps {
    sessionId: string
    backendUrl: string
    signalingserver: string
    signalingport: number
    mediaserver: string
    mediaport: number
    accessToken: string
    style?: React.CSSProperties;
    onStarted: () => void;
    onStreamFailed: () => void;
    onLoggedIn: (userId: string) => void;
    handleCustomEvent: (event: any) => void;
    onFocus: () => void;
    onBlur: () => void;
}

interface AppStreamState {
    streamReady: boolean;
    error: string | null;
}

let _instanceCount = 0;

// Serialize terminate() before connect() so Fast Refresh unmount/remount cycles don't race.
// A new instance must wait for the previous instance's terminate to complete before connecting.
let _terminatePromise: Promise<void> = Promise.resolve();

function _chainTerminate(): void {
    _terminatePromise = _terminatePromise.then(() => {
        const result = AppStreamer.terminate();
        return result && typeof (result as Promise<unknown>).then === 'function'
            ? (result as Promise<unknown>).then(() => {}).catch(() => {})
            : Promise.resolve();
    });
}

export default class AppStream extends Component<AppStreamProps, AppStreamState> {
    private _requested: boolean;
    private _videoElementId: string;
    private _audioElementId: string;
    private _connectTimeout: ReturnType<typeof setTimeout> | null = null;
    private _mounted = false;

    static defaultProps = {
        style: {}
    };

    static propTypes = {
        onStarted: PropTypes.func.isRequired,
        handleCustomEvent: PropTypes.func.isRequired,
        style: PropTypes.object
    };

    constructor(props: AppStreamProps) {
        super(props);
        _instanceCount += 1;
        this._videoElementId = `remote-video-${_instanceCount}`;
        this._audioElementId = `remote-audio-${_instanceCount}`;
        this._requested = false;
        this.state = {
            streamReady: false,
            error: null
        };
    }

    componentDidMount() {
        if (this._requested) return;
        this._requested = true;
        this._mounted = true;

        // Delay connect to avoid React Strict Mode double-mount: the first mount unmounts immediately,
        // which would remove the video element while play() is in progress and cause AbortError.
        this._connectTimeout = setTimeout(() => {
            this._connectTimeout = null;
            if (!this._mounted) return;
            _terminatePromise.then(() => {
                if (!this._mounted) return;
                this._doConnect();
            });
        }, 150);
    }

    componentWillUnmount() {
        this._mounted = false;
        this._requested = false; // Reset so Strict Mode remount will schedule connect again
        markOmniNotReady();
        if (this._connectTimeout) {
            clearTimeout(this._connectTimeout);
            this._connectTimeout = null;
        }
        _chainTerminate();
    }

    private _doConnect(): void {
        if (StreamConfig.source === 'local') {
            const local = StreamConfig.local as { server: string; signalingPort: number };
            console.info('[Omniverse] connecting to', local.server + ':' + local.signalingPort);
        }

        let streamProps: StreamProps;
            let streamConfig: DirectConfig | GFNConfig;
            let streamSource: StreamType.DIRECT | StreamType.GFN;

            if (StreamConfig.source === 'gfn') {
                    streamSource = StreamType.GFN;
                    streamConfig = {
                        //@ts-ignore
                        GFN             : GFN,
                        catalogClientId : StreamConfig.gfn.catalogClientId,
                        clientId        : StreamConfig.gfn.clientId,
                        cmsId           : StreamConfig.gfn.cmsId,
                        onUpdate        : (message: StreamEvent) => this._onUpdate(message),
                        onStart         : (message: StreamEvent) => this._onStart(message),
                        onCustomEvent   : (message: any) => this._onCustomEvent(message)
                    }
            }

            else if (StreamConfig.source === 'local') {
                const local = StreamConfig.local as { server: string; signalingPort: number; mediaPort?: number | null; width?: number; height?: number; fps?: number };
                streamSource = StreamType.DIRECT;
                streamConfig = {
                    videoElementId: this._videoElementId,
                    audioElementId: this._audioElementId,
                    authenticate: true,
                    maxReconnects: 20,
                    signalingServer: local.server,
                    signalingPort: local.signalingPort,
                    mediaServer: local.server,
                    ...(local.mediaPort != null && { mediaPort: local.mediaPort }),
                    nativeTouchEvents: true,
                    width: local.width ?? 1920,
                    height: local.height ?? 1080,
                    fps: local.fps ?? 60,
                    onUpdate: (message: StreamEvent) => this._onUpdate(message),
                    onStart: (message: StreamEvent) => this._onStart(message),
                    onCustomEvent: (message: any) => this._onCustomEvent(message),
                    onStop: (message: StreamEvent) => this._onStop(message),
                    onTerminate: (message: StreamEvent) => this._onTerminate(message)
                };
            }
                
            else if (StreamConfig.source === 'stream') {
                streamSource =  StreamType.DIRECT;
                streamConfig = {
                    signalingServer: this.props.signalingserver,
                    signalingPort: this.props.signalingport,
                    mediaServer: this.props.mediaserver,
                    mediaPort: this.props.mediaport,
                    backendUrl: this.props.backendUrl,
                    sessionId: this.props.sessionId,
                    autoLaunch: true,
                    cursor: 'free',
                    mic: false,
                    videoElementId: this._videoElementId,
                    audioElementId: this._audioElementId,
                    authenticate: false,
                    maxReconnects: 20,
                    nativeTouchEvents: true,
                    width: 1920,
                    height: 1080,
                    fps: 60,
                    onUpdate: (message: StreamEvent) => this._onUpdate(message),
                    onStart: (message: StreamEvent) => this._onStart(message),
                    onCustomEvent: (message: any) => this._onCustomEvent(message),
                    onStop: (message: StreamEvent) => this._onStop(message),
                    onTerminate: (message: StreamEvent) => this._onTerminate(message),
                };
            }
                
            else {
                console.error(`Unknown stream source: ${StreamConfig.source}`);
                return
            }

            try {
                streamProps = { streamConfig, streamSource };
                AppStreamer.connect(streamProps)
                    .then((result: StreamEvent) => {
                        if (this._mounted) console.info('[Omniverse] connect result', result);
                    })
                    .catch((error: unknown) => {
                        if (!this._mounted) return;
                        const msg = typeof error === 'object' && error !== null && 'detail' in error
                            ? String((error as { detail?: unknown }).detail)
                            : error instanceof Error ? error.message : JSON.stringify(error);
                        console.error('[Omniverse] connect error', error);
                        this.setState({ error: msg || 'Connection failed' });
                        this.props.onStreamFailed();
                    });
            } catch (error) {
                if (!this._mounted) return;
                const msg = error instanceof Error ? error.message : String(error);
                console.error('[Omniverse] connect exception', error);
                this.setState({ error: msg || 'Connection failed' });
                this.props.onStreamFailed();
            }
    }

    componentDidUpdate(_prevProps: AppStreamProps, prevState: AppStreamState, _snapshot: any) {
        if (!this._mounted || prevState.streamReady === true || this.state.streamReady !== true) return;
        // GFN creates gfn-stream-player-video; local/stream use our video element
        const player = (document.getElementById('gfn-stream-player-video') ?? document.getElementById(this._videoElementId)) as HTMLVideoElement | null;
        if (player) {
            player.tabIndex = -1;
            player.playsInline = true;
            player.muted = true;
            player.play().catch((err) => {
                if (this._mounted && err?.name !== 'AbortError') console.warn('[Omniverse] play error:', err);
            });
        }
    }

    static sendMessage(message: any) {
        AppStreamer.sendMessage(message);
    }

    static stop() {
        AppStreamer.stop();
        (AppStreamer as any)._stream = null;
    }

    _onStart(message: any) {
        if (!this._mounted) return;
        if (message.action === 'start' && message.status === 'success' && !this.state.streamReady) {
            console.info('[Omniverse] stream ready');
            markOmniReady();
            this.setState({ streamReady: true });
            this.props.onStarted();
        }

        if (message.status === "error") {
            const info = message.info;
            const msg = typeof info === 'string' ? info : (info && typeof info === 'object' ? JSON.stringify(info) : 'Stream error');
            console.error('[Omniverse] stream error', message);
            this.setState({ error: msg });
            this.props.onStreamFailed();
            if (StreamConfig.source === 'stream') {
                alert(msg);
            }
            return;
        }
    }

    _onUpdate(message: any) {
        try {
            if (message.action === 'authUser' && message.status === 'success') {
                this.props.onLoggedIn(message.info);
            }
        } catch (error) {
            console.error(message);
        }
    }

    _onCustomEvent(message: any) {
        this.props.handleCustomEvent(message);
    }

    _onStop(message: any) {
        console.info('[Omniverse] stream stopped', message);
        if (!this._mounted) return;
        markOmniNotReady();
        this.setState({ streamReady: false, error: 'Stream disconnected' });
        this.props.onStreamFailed();
    }

    _onTerminate(message: any) {
        console.info('[Omniverse] stream terminated', message);
        if (!this._mounted) return;
        markOmniNotReady();
        this.setState({ streamReady: false, error: 'Stream disconnected' });
        this.props.onStreamFailed();
    }

    private _retry = (): void => {
        this.setState({ error: null, streamReady: false });
        _chainTerminate();
        // Delay so Kit server can release the previous connection (NVST_R_BUSY if too soon)
        setTimeout(() => {
            _terminatePromise.then(() => {
                if (this._mounted) this._doConnect();
            });
        }, 2500);
    };

    render() {
        const source = StreamConfig.source;

        if (source === 'gfn') {
            return (
                <div
                    id="view"
                    style={{
                        backgroundColor: this.state.streamReady ? 'white': '#dddddd',
                        display: 'flex', justifyContent: 'space-between',
                        height: "100%",
                        width: "100%",
                        ...this.props.style
                    }}
                />
            );
        } else if (source === 'local' || source === 'stream') {
            return (
                <div
                    key={'stream-canvas'}
                    id={'main-div'}
                    className="omniverse-stream-container"
                    style={{
                        backgroundColor: this.state.streamReady ? 'transparent' : '#dddddd',
                        ...this.props.style
                    }}
                >
                    {!this.state.streamReady && !this.state.error && (
                        <div className="omniverse-stream-loading" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: 14 }}>
                            Connecting to Omniverse…
                        </div>
                    )}
                    {this.state.error && (
                        <div className="omniverse-stream-error" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#b91c1c', fontSize: 14, padding: 24, textAlign: 'center' }}>
                            <span className="material-icons-round text-2xl mb-2">error</span>
                            <div className="font-medium mb-1">Failed to connect</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 max-w-md">{this.state.error}</div>
                            <div className="text-xs mt-3 text-slate-500">Ensure the Omniverse Kit app is running and streaming on 127.0.0.1:49100. If Reconnect fails with NVST_R_BUSY, restart the Kit app.</div>
                            <Button variant="primary" size="md" onClick={this._retry} className="mt-4">
                                Reconnect
                            </Button>
                        </div>
                    )}
                    <video
                        key={'video-canvas'}
                        id={this._videoElementId}
                        style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                            objectPosition: 'center center',
                        }}
                        tabIndex={-1}
                        playsInline
                        muted
                        autoPlay
                    />
                    <audio id={this._audioElementId} muted></audio>
                    <h3 style={{ visibility: 'hidden', position: 'absolute' }} id="message-display">...</h3>
                </div>
            );
        }

        return null;
    }
}
