'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  OVERVIEW,
  SAMPLE_FURNITURE,
  SAMPLE_HOTSPOTS,
  SAMPLE_ROOMS,
  WALLS,
  WALL_HEIGHT,
  roomById,
  wallSegments,
  type Vec3,
} from './sample-scene';

interface Rig {
  camera: PerspectiveCamera;
  controls: OrbitControls;
  renderer: WebGLRenderer;
  hotspots: { id: string; pos: Vector3 }[];
  fly: (camera: Vec3, target: Vec3) => void;
  make: (v: Vec3) => Vector3;
}

/** Illustrative sample scene. Never presented as a reconstruction of a real property. */
export function SampleTourViewer({ height = 440 }: { height?: number }) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const markerRefs = useRef(new Map<string, HTMLButtonElement>());
  const rigRef = useRef<Rig | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'unsupported'>('loading');
  const [room, setRoom] = useState<string>('overview');
  const [active, setActive] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const isFull = fullscreen || expanded;

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let cleanup = () => {};
    (async () => {
      const THREE = await import('three');
      const { OrbitControls: Controls } = await import('three/examples/jsm/controls/OrbitControls.js');
      const host = canvasHostRef.current;
      if (disposed || !host) return;
      let renderer: WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({ antialias: true });
      } catch {
        setStatus('unsupported');
        return;
      }
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      host.appendChild(renderer.domElement);
      renderer.domElement.setAttribute('aria-hidden', 'true');

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf4f1ea);
      const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
      camera.position.set(...OVERVIEW.camera);
      const controls = new Controls(camera, renderer.domElement);
      controls.target.set(...OVERVIEW.target);
      controls.enableDamping = true;
      controls.minDistance = 3;
      controls.maxDistance = 30;
      controls.maxPolarAngle = Math.PI / 2.1;
      controls.update();

      scene.add(new THREE.HemisphereLight(0xffffff, 0xb8a98f, 1.4));
      const sun = new THREE.DirectionalLight(0xffffff, 1.2);
      sun.position.set(8, 14, 6);
      scene.add(sun);

      const disposables: { dispose: () => void }[] = [];
      const box = (size: Vec3, pos: Vec3, color: number, opacity = 1) => {
        const geo = new THREE.BoxGeometry(...size);
        const mat = new THREE.MeshStandardMaterial({ color, transparent: opacity < 1, opacity, roughness: 0.85 });
        disposables.push(geo, mat);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        scene.add(mesh);
        return mesh;
      };

      for (const r of SAMPLE_ROOMS) box([r.width, 0.05, r.depth], [r.x + r.width / 2, 0, r.z + r.depth / 2], r.floorColor);
      const t = 0.1;
      for (const w of WALLS) {
        for (const [a, b] of wallSegments(w.axis, w.at, w.from, w.to)) {
          const len = b - a;
          const mid = (a + b) / 2;
          if (w.axis === 'x') box([len, WALL_HEIGHT, t], [mid, WALL_HEIGHT / 2, w.at], 0xf7f5f0, 0.88);
          else box([t, WALL_HEIGHT, len], [w.at, WALL_HEIGHT / 2, mid], 0xf7f5f0, 0.88);
        }
      }
      for (const f of SAMPLE_FURNITURE) box(f.size, f.position, f.color);

      const hotspots = SAMPLE_HOTSPOTS.map((h) => ({ id: h.id, pos: new THREE.Vector3(...h.position) }));
      const make = (v: Vec3) => new THREE.Vector3(...v);

      let anim: { fromPos: Vector3; toPos: Vector3; fromTarget: Vector3; toTarget: Vector3; start: number } | null = null;
      const fly = (to: Vec3, target: Vec3) => {
        anim = { fromPos: camera.position.clone(), toPos: make(to), fromTarget: controls.target.clone(), toTarget: make(target), start: performance.now() };
      };

      const resize = () => {
        const w = host.clientWidth || 1;
        const h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      resize();

      const projected = new THREE.Vector3();
      const tick = (now: number) => {
        if (anim) {
          const k = Math.min(1, (now - anim.start) / 700);
          const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          camera.position.lerpVectors(anim.fromPos, anim.toPos, e);
          controls.target.lerpVectors(anim.fromTarget, anim.toTarget, e);
          if (k >= 1) anim = null;
        }
        controls.update();
        renderer.render(scene, camera);
        const w = host.clientWidth;
        const h = host.clientHeight;
        for (const spot of hotspots) {
          const el = markerRefs.current.get(spot.id);
          if (!el) continue;
          projected.copy(spot.pos).project(camera);
          const visible = projected.z < 1 && Math.abs(projected.x) <= 1.05 && Math.abs(projected.y) <= 1.05;
          el.style.display = visible ? 'flex' : 'none';
          el.style.transform = `translate(${((projected.x + 1) / 2) * w}px, ${((1 - projected.y) / 2) * h}px) translate(-50%, -50%)`;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);

      rigRef.current = { camera, controls, renderer, hotspots, fly, make };
      setStatus('ready');
      cleanup = () => {
        cancelAnimationFrame(frame);
        observer.disconnect();
        controls.dispose();
        disposables.forEach((d) => d.dispose());
        renderer.dispose();
        renderer.domElement.remove();
        rigRef.current = null;
      };
    })().catch(() => {
      if (!disposed) setStatus('unsupported');
    });
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === shellRef.current);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const goRoom = useCallback((id: string) => {
    const rig = rigRef.current;
    if (!rig) return;
    setRoom(id);
    setActive(null);
    const r = roomById(id);
    if (r) rig.fly(r.camera, r.target);
    else rig.fly(OVERVIEW.camera, OVERVIEW.target);
  }, []);

  const zoom = useCallback((factor: number) => {
    const rig = rigRef.current;
    if (!rig) return;
    const offset = rig.camera.position.clone().sub(rig.controls.target);
    const distance = Math.min(rig.controls.maxDistance, Math.max(rig.controls.minDistance, offset.length() * factor));
    offset.setLength(distance);
    const next = rig.controls.target.clone().add(offset);
    rig.fly([next.x, next.y, next.z], [rig.controls.target.x, rig.controls.target.y, rig.controls.target.z]);
  }, []);

  const focusHotspot = useCallback((id: string) => {
    const rig = rigRef.current;
    const spot = SAMPLE_HOTSPOTS.find((h) => h.id === id);
    if (!rig || !spot) return;
    setActive(id);
    setRoom(spot.roomId);
    const [x, y, z] = spot.position;
    // Steep enough to look over the 2.8 m walls when the camera ends up outside the room.
    rig.fly([x + 1.2, y + 5.5, z + 3], [x, y - 0.4, z]);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const shell = shellRef.current;
    if (!shell) return;
    setFullscreenError(null);
    if (expanded) {
      setExpanded(false);
      return;
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (shell.requestFullscreen) await shell.requestFullscreen();
      else throw new Error('unsupported');
    } catch {
      setExpanded(true);
      setFullscreenError('Browser fullscreen is blocked here, so the viewer fills the window instead. Press Esc to exit.');
    }
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expanded]);

  const activeSpot = SAMPLE_HOTSPOTS.find((h) => h.id === active) ?? null;

  return (
    <section className="space-y-3" aria-label="Sample 3D tour">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Sample scene</Badge>
        <p className="text-xs text-muted-foreground">
          Illustrative model built by hand for this demo. It was not generated from any video and is not a reconstruction of a real property.
        </p>
      </div>
      <div
        ref={shellRef}
        className={`overflow-hidden border bg-[#f4f1ea] ${expanded ? 'fixed inset-0 z-50' : 'relative rounded-2xl'}`}
        style={{ height: isFull ? '100vh' : height }}
      >
        <div ref={canvasHostRef} className="absolute inset-0 touch-none" data-testid="sample-tour-canvas" />
        <div className="pointer-events-none absolute inset-0">
          {SAMPLE_HOTSPOTS.map((h) => (
            <button
              key={h.id}
              ref={(el) => {
                if (el) markerRefs.current.set(h.id, el);
                else markerRefs.current.delete(h.id);
              }}
              type="button"
              onClick={() => focusHotspot(h.id)}
              aria-label={`Hotspot: ${h.label}`}
              aria-pressed={active === h.id}
              className={`pointer-events-auto absolute left-0 top-0 hidden items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] shadow-sm ${active === h.id ? 'bg-primary text-primary-foreground' : 'bg-background/90'}`}
            >
              <span aria-hidden>●</span>
              {h.label}
            </button>
          ))}
        </div>
        <span className="pointer-events-none absolute left-3 top-3 rounded bg-background/85 px-2 py-0.5 text-[11px] font-medium">SAMPLE · not a reconstruction</span>
        <div className="absolute right-3 top-3 flex flex-col gap-1">
          <Button size="sm" variant="outline" aria-label="Zoom in" onClick={() => zoom(0.75)} disabled={status !== 'ready'}>+</Button>
          <Button size="sm" variant="outline" aria-label="Zoom out" onClick={() => zoom(1.33)} disabled={status !== 'ready'}>−</Button>
          <Button size="sm" variant="outline" aria-label="Reset view" onClick={() => goRoom('overview')} disabled={status !== 'ready'}>⟲</Button>
          <Button size="sm" variant="outline" aria-label={isFull ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={toggleFullscreen}>{isFull ? '⤡' : '⤢'}</Button>
        </div>
        {activeSpot ? (
          <div className="absolute bottom-14 left-3 max-w-xs rounded-xl border bg-background/95 p-3 text-xs shadow" role="status">
            <p className="font-medium">{activeSpot.label}</p>
            <p className="text-muted-foreground">{activeSpot.note}</p>
          </div>
        ) : null}
        <nav className="absolute inset-x-3 bottom-3 flex flex-wrap gap-1" aria-label="Rooms">
          {[{ id: 'overview', name: 'Overview' }, ...SAMPLE_ROOMS].map((r) => (
            <Button key={r.id} size="sm" variant={room === r.id ? 'default' : 'outline'} aria-pressed={room === r.id} onClick={() => goRoom(r.id)} disabled={status !== 'ready'}>
              {r.name}
            </Button>
          ))}
        </nav>
        {status === 'loading' ? <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">Loading sample scene…</p> : null}
        {status === 'unsupported' ? (
          <p className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">This browser cannot show WebGL, so the sample scene is unavailable.</p>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">Drag to orbit · scroll or pinch to zoom · right-drag to pan · use room buttons to jump · {fullscreenError ?? 'fullscreen available'}</p>
    </section>
  );
}
