'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & { src?: string; 'camera-controls'?: string };
    }
  }
}
import { classifyTourAsset, type TourState } from '@estateflow/shared';

const COPY: Record<TourState, string> = {
  no_tour: 'No 3D tour yet.',
  video_required: 'A walkthrough video is required before a tour can be requested.',
  video_uploaded: 'Video selected. It has not been sent to a reconstruction provider.',
  processing_requested: 'Processing has been requested. Waiting for a provider status.',
  processing: 'Processing. Progress is shown only when the provider sends it.',
  ready: 'A viewable asset is available.',
  failed: 'Processing failed.',
  unavailable: 'Interactive 3D sample not configured.',
};

export function TourPanel({ state, assetUrl, error }: { state: TourState; assetUrl: string | null; error?: string }) {
  const kind = classifyTourAsset(assetUrl);
  return (
    <section className="space-y-3 rounded-2xl border p-4" aria-labelledby="tour-heading">
      <h2 id="tour-heading" className="font-medium">3D home tour</h2>
      <p className="text-sm">{COPY[state]}</p>
      {error && <p className="text-sm text-muted-foreground">{error}</p>}
      {state === 'ready' && kind === 'gltf' && assetUrl ? <ModelFrame src={assetUrl} /> : null}
      {state === 'ready' && kind !== 'gltf' ? <p className="text-sm">The asset URL is missing or not a glTF model, so the viewer stays closed.</p> : null}
    </section>
  );
}

function ModelFrame({ src, onError }: { src: string; onError?: () => void }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    let cancelled = false;
    import('@google/model-viewer').catch(() => {
      if (!cancelled) setFailed(true);
    });
    const el = ref.current;
    const handle = () => setFailed(true);
    el?.addEventListener('error', handle);
    return () => {
      cancelled = true;
      el?.removeEventListener('error', handle);
    };
  }, []);
  useEffect(() => {
    if (failed) onError?.();
  }, [failed, onError]);
  if (failed) return <p className="text-sm">The 3D viewer failed to load. The file was not replaced with a simulated tour.</p>;
  return (
    <model-viewer
      ref={ref}
      src={src}
      camera-controls=""
      aria-label="Property model"
      style={{ width: '100%', height: 420, background: '#f4f1ea' }}
    />
  );
}

export interface SignedMedia {
  url: string;
  expiresInSeconds: number;
}

/** Viewer for a provider-completed reconstruction. Falls back to the original walkthrough video. */
export function SecureTourViewer({ model, video }: { model: SignedMedia | null; video: SignedMedia | null }) {
  const [modelFailed, setModelFailed] = useState(false);
  const onError = useCallback(() => setModelFailed(true), []);
  const showModel = model && classifyTourAsset(model.url) === 'gltf' && !modelFailed;
  return (
    <div className="space-y-3">
      {showModel ? <ModelFrame src={model.url} onError={onError} /> : null}
      {!showModel && video ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">{model ? 'The 3D model could not be shown. Showing the original walkthrough video.' : 'No 3D model is available. Showing the original walkthrough video.'}</p>
          <video src={video.url} controls preload="metadata" className="w-full rounded-xl bg-black" style={{ maxHeight: 420 }} />
        </div>
      ) : null}
      {!showModel && !video ? <p className="text-sm text-muted-foreground">Neither a 3D model nor the source video is available.</p> : null}
      <p className="text-xs text-muted-foreground">Media links are private and expire in about {Math.round((model ?? video)?.expiresInSeconds ?? 600) / 60} minutes. Reload to refresh them.</p>
    </div>
  );
}
