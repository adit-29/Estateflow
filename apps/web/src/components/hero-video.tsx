'use client';

import { useEffect, useRef, useState } from 'react';

const POSTER = process.env.NEXT_PUBLIC_HERO_POSTER_URL || '/hero-poster.svg';
const VIDEO = process.env.NEXT_PUBLIC_HERO_VIDEO_URL || '';

/**
 * Cinematic hero background. A video plays only when NEXT_PUBLIC_HERO_VIDEO_URL is set.
 * No invented video URL is used. The poster always ships with the app.
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement | null>(null);
  const [failed, setFailed] = useState(false);
  const canPlay = Boolean(VIDEO) && !failed;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      video.pause();
      return;
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') video.pause();
      else void video.play().catch(() => setFailed(true));
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [canPlay]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#12181c]" aria-hidden={!canPlay}>
      {/* eslint-disable-next-line @next/next/no-img-element -- poster is a local SVG or a configured URL, not a content image gallery */}
      <img src={POSTER} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {canPlay && (
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={POSTER}
          onError={() => setFailed(true)}
        >
          <source src={VIDEO} />
        </video>
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/70" />
      <p className="sr-only">
        {canPlay
          ? 'Autoplaying muted property walkthrough video.'
          : 'Property walkthrough poster. Set NEXT_PUBLIC_HERO_VIDEO_URL to play a video. No remote video is invented.'}
      </p>
    </div>
  );
}
