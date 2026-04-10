/*
 * SPDX-FileCopyrightText: Copyright (c) 2024 NVIDIA CORPORATION & AFFILIATES. All rights reserved.
 * SPDX-License-Identifier: LicenseRef-NvidiaProprietary
 */
'use client';

import React from 'react';
import AppStream from './AppStream';

export interface OmniverseAppProps {
    sessionId: string;
    backendUrl: string;
    signalingserver: string;
    signalingport: number;
    mediaserver: string;
    mediaport: number;
    accessToken: string;
    onStreamFailed: () => void;
}

interface StreamOnlyWindowProps extends OmniverseAppProps {
    /** When embedded in dashboard, use 0 so stream fills the content area. */
    headerHeight?: number;
    /** Called when the stream is connected and ready to receive commands. */
    onStreamReady?: () => void;
}

export default class StreamOnlyWindow extends React.Component<StreamOnlyWindowProps> {
    static defaultProps: Partial<StreamOnlyWindowProps> = {
        headerHeight: 0
    };

    private _onStreamStarted(): void {
        console.log("The streaming session has started!");
        this.props.onStreamReady?.();
    }

    private _handleCustomEvent(event: any): void {
        console.log(event);
    }

    private _handleAppStreamFocus(): void {
        console.log('User is interacting in streamed viewer');
    }

    private _handleAppStreamBlur(): void {
        console.log('User is not interacting in streamed viewer');
    }

    render() {
        const headerHeight = this.props.headerHeight ?? 0;
        return (
            <div
                className="omniverse-viewer-host bg-slate-800"
                style={{
                    position: 'absolute',
                    top: headerHeight,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    padding: 0,
                    margin: 0
                }}
            >
                <div id="streamonly-wrapper" className="omniverse-viewer-viewport">
                    <AppStream
                        sessionId={this.props.sessionId}
                        backendUrl={this.props.backendUrl}
                        signalingserver={this.props.signalingserver}
                        signalingport={this.props.signalingport}
                        mediaserver={this.props.mediaserver}
                        mediaport={this.props.mediaport}
                        accessToken={this.props.accessToken}
                        onStarted={() => this._onStreamStarted()}
                        onFocus={() => this._handleAppStreamFocus()}
                        onBlur={() => this._handleAppStreamBlur()}
                        style={{
                            width: '100%',
                            height: '100%',
                            padding: 0,
                            margin: 0
                        }}
                        onLoggedIn={(userId) => console.log(`User logged in: ${userId}`)}
                        handleCustomEvent={(event) => this._handleCustomEvent(event)}
                        onStreamFailed={this.props.onStreamFailed}
                    />
                </div>
            </div>
        );
    }
}
