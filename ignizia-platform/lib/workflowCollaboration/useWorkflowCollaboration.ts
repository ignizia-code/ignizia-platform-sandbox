'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

const DOC_CHANNEL_PREFIX = 'doc:';
const STUN_SERVER = 'stun:stun.l.google.com:19302';

export interface OnlineUser {
  userId: string;
  displayName: string;
}

export interface CollabMessage {
  userId: string;
  displayName: string;
  text: string;
  createdAt: string;
}

export interface UseWorkflowCollaborationOptions {
  workflowId: string | null;
  userId: string;
  displayName: string;
}

export interface UseWorkflowCollaborationReturn {
  onlineUsers: OnlineUser[];
  messages: CollabMessage[];
  sendMessage: (text: string) => void;
  voiceActive: boolean;
  voiceParticipants: string[];
  joinVoice: () => Promise<void>;
  leaveVoice: () => void;
}

function deriveOnlineUsers(presenceState: Record<string, Array<Record<string, unknown>>>): OnlineUser[] {
  const seen = new Set<string>();
  const users: OnlineUser[] = [];
  for (const key of Object.keys(presenceState)) {
    const presences = presenceState[key] ?? [];
    for (const p of presences) {
      const uid = p.userId as string | undefined;
      const name = (p.displayName as string) ?? 'Unknown';
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        users.push({ userId: uid, displayName: name });
      }
    }
  }
  return users;
}

export function useWorkflowCollaboration({
  workflowId,
  userId,
  displayName,
}: UseWorkflowCollaborationOptions): UseWorkflowCollaborationReturn {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [messages, setMessages] = useState<CollabMessage[]>([]);
  const [voiceActive, setVoiceActive] = useState(false);
  const [voiceParticipants, setVoiceParticipants] = useState<string[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const remoteAudioRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const voiceParticipantsRef = useRef<Set<string>>(new Set());
  voiceParticipantsRef.current = new Set(voiceParticipants);

  const broadcast = useCallback(
    (event: string, payload: Record<string, unknown>) => {
      const ch = channelRef.current;
      if (!ch) return;
      ch.send({
        type: 'broadcast',
        event,
        payload: { ...payload, type: event },
      });
    },
    []
  );

  const leaveVoice = useCallback(() => {
    broadcast('voice:leave', { userId });
    peersRef.current.forEach((pc) => {
      pc.close();
    });
    peersRef.current.clear();
    remoteAudioRef.current.forEach((el) => {
      el.srcObject = null;
    });
    remoteAudioRef.current.clear();
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setVoiceActive(false);
    setVoiceParticipants([]);
  }, [userId, broadcast]);

  const joinVoice = useCallback(async () => {
    if (!workflowId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      setVoiceActive(true);
      broadcast('voice:join', { userId });

      const currentParticipants = Array.from(voiceParticipantsRef.current).filter((id) => id !== userId);
      for (const peerId of currentParticipants) {
        createPeerConnection(peerId, stream, true);
      }
    } catch (e) {
      console.error('Failed to get microphone:', e);
    }
  }, [workflowId, userId, broadcast]);

  const createPeerConnection = useCallback(
    (remoteUserId: string, localStream: MediaStream, isInitiator: boolean) => {
      if (peersRef.current.has(remoteUserId)) return;
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: STUN_SERVER }],
      });

      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          broadcast('voice:ice', { from: userId, to: remoteUserId, candidate: e.candidate.toJSON() });
        }
      };

      pc.ontrack = (e) => {
        const audio = document.createElement('audio');
        audio.autoplay = true;
        if (e.streams[0]) audio.srcObject = e.streams[0];
        remoteAudioRef.current.set(remoteUserId, audio);
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
          pc.close();
          peersRef.current.delete(remoteUserId);
          remoteAudioRef.current.get(remoteUserId)?.remove();
          remoteAudioRef.current.delete(remoteUserId);
          setVoiceParticipants((prev) => prev.filter((id) => id !== remoteUserId));
        }
      };

      peersRef.current.set(remoteUserId, pc);

      if (isInitiator) {
        pc.createOffer().then((offer) => {
          pc.setLocalDescription(offer).then(() => {
            broadcast('voice:offer', { from: userId, to: remoteUserId, offer: offer });
          });
        });
      }
    },
    [userId, broadcast]
  );

  useEffect(() => {
    if (!workflowId) {
      setOnlineUsers([]);
      setMessages([]);
      leaveVoice();
      return;
    }

    const channelName = `${DOC_CHANNEL_PREFIX}${workflowId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsers(deriveOnlineUsers(state));
      })
      .on('broadcast', { event: 'chat:message' }, ({ payload }) => {
        const p = payload as { userId?: string; displayName?: string; text?: string; createdAt?: string };
        const uid = p?.userId;
        const text = p?.text;
        if (uid != null && text != null) {
          const msg: CollabMessage = {
            userId: uid,
            displayName: p.displayName ?? 'Unknown',
            text,
            createdAt: p.createdAt ?? new Date().toISOString(),
          };
          setMessages((prev) => [...prev, msg]);
        }
      })
      .on('broadcast', { event: 'voice:join' }, ({ payload }) => {
        const p = payload as { userId?: string };
        const uid = p?.userId;
        if (!uid || uid === userId) return;
        setVoiceParticipants((prev) => (prev.includes(uid) ? prev : [...prev, uid]));
        if (localStreamRef.current) {
          createPeerConnection(uid, localStreamRef.current, true);
        }
      })
      .on('broadcast', { event: 'voice:leave' }, ({ payload }) => {
        const p = payload as { userId?: string };
        const uid = p?.userId;
        if (!uid) return;
        const pc = peersRef.current.get(uid);
        if (pc) {
          pc.close();
          peersRef.current.delete(uid);
          remoteAudioRef.current.get(uid)?.remove();
          remoteAudioRef.current.delete(uid);
        }
        setVoiceParticipants((prev) => prev.filter((id) => id !== uid));
      })
      .on('broadcast', { event: 'voice:offer' }, ({ payload }) => {
        const p = payload as { from?: string; to?: string; offer?: RTCSessionDescriptionInit };
        if (p?.to !== userId || !p?.from) return;
        const fromId = p.from;
        if (!localStreamRef.current) return;
        if (peersRef.current.has(fromId)) return;
        const pc = new RTCPeerConnection({ iceServers: [{ urls: STUN_SERVER }] });
        localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!));
        pc.onicecandidate = (e) => {
          if (e.candidate) broadcast('voice:ice', { from: userId, to: fromId, candidate: e.candidate!.toJSON() });
        };
        pc.ontrack = (e) => {
          const audio = document.createElement('audio');
          audio.autoplay = true;
          if (e.streams[0]) audio.srcObject = e.streams[0];
          remoteAudioRef.current.set(fromId, audio);
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
            pc.close();
            peersRef.current.delete(fromId);
            remoteAudioRef.current.get(fromId)?.remove();
            remoteAudioRef.current.delete(fromId);
            setVoiceParticipants((prev) => prev.filter((id) => id !== fromId));
          }
        };
        peersRef.current.set(fromId, pc);
        const offer = p.offer;
        if (!offer) return;
        pc.setRemoteDescription(new RTCSessionDescription(offer)).then(() => pc.createAnswer()).then((answer) => {
          pc.setLocalDescription(answer).then(() => {
            broadcast('voice:answer', { from: userId, to: fromId, answer });
          });
        });
      })
      .on('broadcast', { event: 'voice:answer' }, ({ payload }) => {
        const p = payload as { from?: string; to?: string; answer?: RTCSessionDescriptionInit };
        if (p?.to !== userId || !p?.from) return;
        const pc = peersRef.current.get(p.from);
        if (!pc || !p.answer) return;
        pc.setRemoteDescription(new RTCSessionDescription(p.answer));
      })
      .on('broadcast', { event: 'voice:ice' }, ({ payload }) => {
        const p = payload as { from?: string; to?: string; candidate?: RTCIceCandidateInit };
        if (p?.to !== userId || !p?.from) return;
        const pc = peersRef.current.get(p.from);
        if (!pc || !p.candidate) return;
        pc.addIceCandidate(new RTCIceCandidate(p.candidate)).catch(() => {});
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ userId, displayName });
        }
      });

    channelRef.current = channel;

    return () => {
      channel.send({ type: 'broadcast', event: 'voice:leave', payload: { userId } });
      peersRef.current.forEach((pc) => pc.close());
      peersRef.current.clear();
      remoteAudioRef.current.forEach((el) => {
        el.srcObject = null;
      });
      remoteAudioRef.current.clear();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
      setVoiceActive(false);
      setVoiceParticipants([]);
      supabase.removeChannel(channel);
      channelRef.current = null;
      setOnlineUsers([]);
      setMessages([]);
    };
  }, [workflowId, userId, displayName, broadcast, createPeerConnection]);

  const sendMessage = useCallback(
    (text: string) => {
      if (!text.trim()) return;
      broadcast('chat:message', {
        userId,
        displayName,
        text: text.trim(),
        createdAt: new Date().toISOString(),
      });
      setMessages((prev) => [
        ...prev,
        { userId, displayName, text: text.trim(), createdAt: new Date().toISOString() },
      ]);
    },
    [userId, displayName, broadcast]
  );

  return {
    onlineUsers,
    messages,
    sendMessage,
    voiceActive,
    voiceParticipants,
    joinVoice,
    leaveVoice,
  };
}
