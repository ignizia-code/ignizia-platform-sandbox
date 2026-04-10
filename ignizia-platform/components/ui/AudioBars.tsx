'use client';

import React, { useEffect, useRef, useState } from "react";

interface AudioBarsProps {
  stream?: MediaStream | null;
  isTranscribing?: boolean;
  barCount?: number;
  heightPx?: number;
  minBarPx?: number;
  fps?: number;
  smoothing?: number;
  gain?: number;
  threshold?: number;
  gamma?: number;
}

export function AudioBars({
  stream,
  isTranscribing = false,
  barCount = 35,
  heightPx = 24,
  minBarPx = 2,
  fps = 60,
  smoothing = 0.15,
  gain = 10,
  threshold = 0.04,
  gamma = 1.6,
}: AudioBarsProps) {
  const [bars, setBars] = useState(() => Array(barCount).fill(0));

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const timeDataRef = useRef<Float32Array | null>(null);

  const rafRef = useRef(0);
  const lastRef = useRef(0);
  const levelRef = useRef(0); // smoothed loudness

  useEffect(() => {
    if (!stream) return;

    const AudioCtx = window.AudioContext;
    const ctx = new AudioCtx();
    audioCtxRef.current = ctx;

    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0; // we handle smoothing ourselves
    source.connect(analyser);

    analyserRef.current = analyser;
    const timeData = new Float32Array(analyser.fftSize);
    timeDataRef.current = timeData;

    const intervalMs = 1000 / fps;

    const tick = (ts: number) => {
      rafRef.current = requestAnimationFrame(tick);

      // throttle to fps
      if (ts - lastRef.current < intervalMs) return;
      lastRef.current = ts;

      // read waveform
      analyser.getFloatTimeDomainData(timeData);

      // RMS loudness (accurate amplitude)
      const buf = timeData;
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      let rms = Math.sqrt(sum / buf.length); // typical speech ~0.01-0.2 depending on mic

      // sensitivity + clamp
      let v = Math.min(1, Math.max(0, rms * gain));

      // noise gate (silence)
      if (v < threshold) v = 0;

      // smooth (EMA) so it looks like ChatGPT (not jittery)
      levelRef.current = levelRef.current + (v - levelRef.current) * smoothing;

      // curve for nicer dynamics (optional, still honest)
      const out = Math.pow(levelRef.current, gamma);

      // push into history: RIGHT -> LEFT scroll
      setBars((prev) => {
        const next = prev.slice(1);
        next.push(out);
        return next;
      });
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      source.disconnect();
      analyser.disconnect();
      ctx.close();
    };
  }, [stream, fps, smoothing, gain, threshold, gamma, barCount]);

  return (
    <div className="w-full flex items-end justify-start gap-0.5" style={{ height: `${heightPx}px` }}>
      {bars.map((v, i) => {
        const h = minBarPx + v * (heightPx - minBarPx);
        return (
          <div
            key={i}
            className={`w-1 rounded-sm ${
              isTranscribing ? "bg-slate-500 dark:bg-slate-300" : "bg-primary"
            }`}
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}
