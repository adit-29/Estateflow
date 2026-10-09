'use client';

import { useMemo, useState } from 'react';
import { ROOM_TYPES, emptyLayout, normalizeLayout, roomAreaSqft, totalLayoutArea, layoutToBoxes, type LayoutRoom, type RoomType, type UnitLayout } from '@estateflow/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SCALE = 14;

function newRoom(type: RoomType, index: number): LayoutRoom {
  return {
    id: `room-${Date.now()}-${index}`,
    type,
    label: type === 'custom' ? 'Room' : type[0].toUpperCase() + type.slice(1),
    x: 2 + (index % 4) * 2,
    y: 2 + Math.floor(index / 4) * 2,
    width: type === 'bathroom' ? 6 : 12,
    length: type === 'balcony' ? 4 : 10,
    rotation: 0,
  };
}

export function LayoutEditor({
  initial,
  onSave,
  saving,
}: {
  initial?: UnitLayout | null;
  onSave: (layout: UnitLayout) => void;
  saving?: boolean;
}) {
  const [layout, setLayout] = useState<UnitLayout>(() => normalizeLayout(initial ?? emptyLayout()));
  const [selectedId, setSelectedId] = useState<string | null>(layout.rooms[0]?.id ?? null);
  const [history, setHistory] = useState<UnitLayout[]>([normalizeLayout(initial ?? emptyLayout())]);
  const [cursor, setCursor] = useState(0);
  const [zoom, setZoom] = useState(1);
  const selected = layout.rooms.find((room) => room.id === selectedId) ?? null;
  const boxes = useMemo(() => layoutToBoxes(layout), [layout]);

  function commit(next: UnitLayout) {
    const normalized = normalizeLayout(next);
    setLayout(normalized);
    const sliced = history.slice(0, cursor + 1);
    sliced.push(normalized);
    setHistory(sliced.slice(-40));
    setCursor(sliced.length - 1);
  }

  function patchSelected(patch: Partial<LayoutRoom>) {
    if (!selected) return;
    commit({
      ...layout,
      rooms: layout.rooms.map((room) => (room.id === selected.id ? { ...room, ...patch } : room)),
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[11rem_minmax(0,1fr)_16rem]">
      <aside className="space-y-2 rounded-xl border p-3">
        <p className="text-meta font-medium">Add</p>
        {ROOM_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start capitalize"
            onClick={() => {
              const room = newRoom(type, layout.rooms.length);
              commit({ ...layout, rooms: [...layout.rooms, room] });
              setSelectedId(room.id);
            }}
          >
            Add {type}
          </Button>
        ))}
      </aside>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>Zoom in</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>Zoom out</Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setZoom(1)}>Reset view</Button>
          <Button type="button" variant="outline" size="sm" disabled={cursor <= 0} onClick={() => { setCursor(cursor - 1); setLayout(history[cursor - 1]); }}>Undo</Button>
          <Button type="button" variant="outline" size="sm" disabled={cursor >= history.length - 1} onClick={() => { setCursor(cursor + 1); setLayout(history[cursor + 1]); }}>Redo</Button>
        </div>
        <div className="relative h-[28rem] overflow-auto rounded-xl border bg-[linear-gradient(90deg,#eee_1px,transparent_1px),linear-gradient(#eee_1px,transparent_1px)] bg-[size:14px_14px]">
          <div className="relative min-h-full min-w-full origin-top-left p-4" style={{ transform: `scale(${zoom})` }}>
            {layout.rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => setSelectedId(room.id)}
                className={`absolute border text-helper ${selectedId === room.id ? 'border-primary bg-primary/15' : 'border-foreground/30 bg-white/80'}`}
                style={{
                  left: room.x * SCALE,
                  top: room.y * SCALE,
                  width: room.width * SCALE,
                  height: room.length * SCALE,
                  transform: `rotate(${room.rotation}deg)`,
                }}
                aria-label={room.label}
              >
                {room.label}
                <span className="mt-1 block">{roomAreaSqft(room)} sq ft</span>
              </button>
            ))}
          </div>
        </div>
        <p className="text-helper text-muted-foreground">
          Structured geometry · {totalLayoutArea(layout)} sq ft of rooms. Photo/video reconstruction nahi hai.
        </p>
        <div className="grid grid-cols-3 gap-2">
          {boxes.map((box) => (
            <div key={box.id} className="rounded-md border p-2 text-helper">
              {box.label} · {box.width}×{box.depth}×{box.height} ft (generated from layout)
            </div>
          ))}
        </div>
      </div>
      <aside className="space-y-3 rounded-xl border p-4">
        <p className="text-meta font-medium">Selected object</p>
        {selected ? (
          <>
            <label className="block text-meta">Label<Input className="mt-1" value={selected.label} onChange={(e) => patchSelected({ label: e.target.value })} /></label>
            <label className="block text-meta">Room type
              <select className="mt-1 h-10 w-full rounded-md border px-2" value={selected.type} onChange={(e) => patchSelected({ type: e.target.value as RoomType })}>
                {ROOM_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </label>
            <label className="block text-meta">Width (ft)<Input className="mt-1" type="number" value={selected.width} onChange={(e) => patchSelected({ width: Number(e.target.value) })} /></label>
            <label className="block text-meta">Length (ft)<Input className="mt-1" type="number" value={selected.length} onChange={(e) => patchSelected({ length: Number(e.target.value) })} /></label>
            <p className="text-body">Area: {roomAreaSqft(selected)} sq ft</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => {
                const copy = { ...selected, id: `room-${Date.now()}`, x: selected.x + 2, y: selected.y + 2 };
                commit({ ...layout, rooms: [...layout.rooms, copy] });
                setSelectedId(copy.id);
              }}>Duplicate</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => {
                commit({ ...layout, rooms: layout.rooms.filter((room) => room.id !== selected.id) });
                setSelectedId(null);
              }}>Delete</Button>
            </div>
          </>
        ) : (
          <p className="text-body text-muted-foreground">Select a room.</p>
        )}
        <Button type="button" disabled={saving} onClick={() => onSave(layout)}>{saving ? 'Saving…' : 'Save layout'}</Button>
      </aside>
    </div>
  );
}
