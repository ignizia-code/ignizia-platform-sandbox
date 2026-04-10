# Realtime Collaboration – MVP Feature Documentation

## 1. Overview

This document describes the implementation of real-time collaboration features for a document-based application:

1. Presence (who is online in a document)
2. Group Chat (in-memory, non-persistent)
3. Optional Voice Channel (peer-to-peer WebRTC)

### Tech Stack

* Frontend: Next.js
* Hosting: Vercel (serverless)
* Realtime Layer: Supabase Realtime
* Audio Transport: WebRTC (mesh topology)
* STUN: `stun:stun.l.google.com:19302`

No custom WebSocket server.
No in-memory backend state.
No message persistence (MVP).

---

# 2. High-Level Architecture

## Always-On Layer

Used for:

* Presence
* Chat
* Voice signaling

```
Browser ↔ Supabase Realtime ↔ Browser
```

## Optional Voice Media Layer

Used for:

* Audio streaming

```
Browser ↔ Browser (WebRTC P2P)
```

Vercel does NOT handle:

* WebSockets
* Audio streams
* Room state

Supabase channel acts as the “room”.

---

# 3. Room Model

Each document has a dedicated Supabase channel:

```
doc:{docId}
```

Example:

```
doc:123
```

This single channel handles:

* Presence
* Chat messages
* Voice signaling

---

# 4. Presence

## Goal

Show users currently viewing a document.

Presence should:

* Automatically update when users join/leave
* Work across tabs/devices
* Be ephemeral (no DB persistence)

---

## Implementation

Use Supabase Realtime Presence API.

### On Document Load

1. Connect to channel `doc:{docId}`
2. Track presence with:

* userId
* displayName
* avatar (optional)

### Supabase Handles:

* Join events
* Leave events
* Disconnect detection
* Multi-tab merging

### UI State

Maintain:

```
onlineUsers: User[]
```

Update when presence state changes.

---

## Behavior Rules

* Presence is active as long as user is connected to channel.
* Closing tab removes user automatically.
* No manual cleanup required.

---

# 5. Group Chat (In-Memory)

## Goal

Enable live chat within a document.

Constraints:

* No persistence
* Demo-only
* Small user count (≤ 3)

---

## Message Flow

### Sending a Message

Client broadcasts:

```
{
  type: "chat:message",
  userId,
  text,
  createdAt
}
```

Via Supabase channel broadcast.

---

### Receiving a Message

Clients listen for:

```
chat:message
```

Append to local state:

```
messages: Message[]
```

---

## Important Notes

* Messages exist only in client memory.
* Refreshing page clears history.
* No ordering guarantees beyond arrival order.
* No database writes.

This is acceptable for MVP demo.

---

# 6. Voice Channel (Optional)

## Goal

Allow users to optionally join a voice channel inside a document.

Voice must:

* NOT auto-connect
* Be explicitly joined
* Be isolated from presence/chat

---

# 6.1 Voice Architecture

We use:

* WebRTC mesh topology
* Supabase only for signaling

For 3 users:

Connections:

* A ↔ B
* A ↔ C
* B ↔ C

Total connections:

```
n(n-1)/2
```

For 3 users → 3 connections (acceptable)

---

# 6.2 Voice State Model

Client-side state:

```
voiceActive: boolean
localStream: MediaStream | null
peers: Map<userId, RTCPeerConnection>
voiceParticipants: Set<userId>
```

---

# 6.3 Joining Voice

When user clicks “Join Voice”:

1. Call `getUserMedia({ audio: true })`
2. Set `voiceActive = true`
3. Broadcast:

```
{
  type: "voice:join",
  userId
}
```

4. For each existing voice participant:

   * Create RTCPeerConnection
   * Add local audio track
   * Create offer
   * Send via signaling

---

# 6.4 Signaling Messages (via Supabase)

All sent over the same document channel.

### Offer

```
{
  type: "voice:offer",
  from,
  to,
  offer
}
```

### Answer

```
{
  type: "voice:answer",
  from,
  to,
  answer
}
```

### ICE Candidate

```
{
  type: "voice:ice",
  from,
  to,
  candidate
}
```

Only the intended target processes the message.

---

# 6.5 Receiving Offer

When receiving `voice:offer`:

1. Create new RTCPeerConnection
2. Add local audio track
3. Set remote description
4. Create answer
5. Send answer back

---

# 6.6 ICE Handling

On each peer connection:

* On `onicecandidate` → send candidate
* On receiving candidate → `addIceCandidate`

---

# 6.7 Receiving Audio

On:

```
pc.ontrack
```

Attach remote stream to Audio element and play.

---

# 6.8 Leaving Voice

When user clicks “Leave Voice”:

1. Close all peer connections
2. Stop all microphone tracks
3. Clear `peers`
4. Broadcast:

```
{
  type: "voice:leave",
  userId
}
```

Other clients:

* Close peer connection with that user
* Remove from voiceParticipants

---

# 7. STUN / NAT

Use:

```
stun:stun.l.google.com:19302
```

This is sufficient for MVP.

TURN server is NOT required unless:

* Corporate firewall blocks P2P
* NAT traversal fails

For demo purposes, ignore TURN.

---

# 8. Separation of Concerns

## Presence + Chat

* Always active
* Supabase-only
* No media logic

## Voice

* Activated manually
* Uses Supabase only for signaling
* Media flows P2P
* Completely independent lifecycle

---

# 9. What Runs Where

## Vercel (Serverless)

* REST APIs
* Authentication
* Normal app logic
* No realtime state

## Supabase Realtime

* Channel state
* Presence
* Chat broadcast
* WebRTC signaling

## Browser

* UI
* Chat state
* Presence state
* WebRTC connections
* Audio streaming

---

# 10. MVP Constraints & Tradeoffs

Acceptable for MVP:

* No chat persistence
* Mesh topology
* No TURN server
* Small rooms (≤ 3 users)
* No reconnection recovery logic

Not production-ready but fully demo-capable.

---

# 11. Final System Summary

When user opens document:

1. Connect to Supabase channel
2. Enable presence
3. Listen for:

   * chat messages
   * voice signaling

Chat works immediately.

Presence updates automatically.

Voice only starts when user clicks "Join Voice".

Audio flows directly between browsers.

No backend streaming.
No persistent WebSocket server.
Fully compatible with Vercel serverless.