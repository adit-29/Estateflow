/**
 * Hand-authored sample apartment for the demo viewer. It is illustrative only and is not
 * derived from any uploaded video or real property.
 */

export type Vec3 = [number, number, number];

export interface SampleRoom {
  id: string;
  name: string;
  /** Floor rectangle: x/z of the min corner, width (x) and depth (z). */
  x: number;
  z: number;
  width: number;
  depth: number;
  floorColor: number;
  camera: Vec3;
  target: Vec3;
}

export interface SampleHotspot {
  id: string;
  roomId: string;
  label: string;
  note: string;
  position: Vec3;
}

export interface SampleFurniture {
  roomId: string;
  label: string;
  position: Vec3;
  size: Vec3;
  color: number;
}

export const WALL_HEIGHT = 2.8;

export const SAMPLE_ROOMS: SampleRoom[] = [
  { id: 'living', name: 'Living room', x: 0, z: 0, width: 6, depth: 5, floorColor: 0xd8c7a8, camera: [3, 6.5, 9.5], target: [3, 0.6, 2.5] },
  { id: 'kitchen', name: 'Kitchen', x: 6, z: 0, width: 4, depth: 5, floorColor: 0xc9d3d6, camera: [8, 6, 9], target: [8, 0.6, 2.5] },
  { id: 'bedroom', name: 'Bedroom', x: 0, z: 5, width: 5, depth: 4, floorColor: 0xcbb99e, camera: [2.5, 6, 13.5], target: [2.5, 0.6, 7] },
  { id: 'balcony', name: 'Balcony', x: 5, z: 5, width: 5, depth: 4, floorColor: 0xb5b1a8, camera: [7.5, 6, 13.5], target: [7.5, 0.6, 7] },
];

export const OVERVIEW = { camera: [5, 14, 15] as Vec3, target: [5, 0, 4.5] as Vec3 };

/** Door gaps along shared walls. `axis: 'x'` means the wall runs along x at fixed z. */
export const DOORWAYS: { axis: 'x' | 'z'; at: number; from: number; to: number }[] = [
  { axis: 'z', at: 6, from: 1.5, to: 2.7 },
  { axis: 'x', at: 5, from: 2, to: 3.1 },
  { axis: 'z', at: 5, from: 6.3, to: 7.4 },
  { axis: 'x', at: 5, from: 7.4, to: 8.6 },
];

export const WALLS: { axis: 'x' | 'z'; at: number; from: number; to: number }[] = [
  { axis: 'x', at: 0, from: 0, to: 10 },
  { axis: 'x', at: 9, from: 0, to: 10 },
  { axis: 'z', at: 0, from: 0, to: 9 },
  { axis: 'z', at: 10, from: 0, to: 9 },
  { axis: 'z', at: 6, from: 0, to: 5 },
  { axis: 'x', at: 5, from: 0, to: 10 },
  { axis: 'z', at: 5, from: 5, to: 9 },
];

export const SAMPLE_FURNITURE: SampleFurniture[] = [
  { roomId: 'living', label: 'Sofa', position: [1.6, 0.4, 4.2], size: [2.4, 0.8, 0.9], color: 0x6b7a8f },
  { roomId: 'living', label: 'Coffee table', position: [1.6, 0.22, 3], size: [1.2, 0.44, 0.6], color: 0x8b6b4a },
  { roomId: 'living', label: 'TV unit', position: [1.6, 0.3, 0.3], size: [2, 0.6, 0.4], color: 0x3d3d3d },
  { roomId: 'living', label: 'Dining table', position: [4.4, 0.38, 2.5], size: [1.4, 0.76, 0.9], color: 0x9b7b56 },
  { roomId: 'kitchen', label: 'Counter', position: [9.6, 0.45, 2.5], size: [0.6, 0.9, 4.2], color: 0xe6e1d8 },
  { roomId: 'kitchen', label: 'Fridge', position: [6.5, 0.9, 0.4], size: [0.7, 1.8, 0.7], color: 0xbfc6cc },
  { roomId: 'bedroom', label: 'Bed', position: [2.5, 0.3, 7.6], size: [1.8, 0.6, 2], color: 0xe9e2d0 },
  { roomId: 'bedroom', label: 'Wardrobe', position: [0.35, 1, 6.5], size: [0.6, 2, 1.6], color: 0x7a5c3e },
  { roomId: 'balcony', label: 'Planter', position: [9.3, 0.35, 8.4], size: [0.8, 0.7, 0.8], color: 0x5f8f55 },
  { roomId: 'balcony', label: 'Chair', position: [7, 0.4, 7.5], size: [0.6, 0.8, 0.6], color: 0x8a8a8a },
];

export const SAMPLE_HOTSPOTS: SampleHotspot[] = [
  { id: 'h-entry', roomId: 'living', label: 'Entrance', note: 'Sample note: main door opens into the living area.', position: [0.3, 1.2, 1.2] },
  { id: 'h-living', roomId: 'living', label: 'Living area', note: 'Sample note: east-facing window wall. Values here are illustrative.', position: [1.6, 1.4, 3.4] },
  { id: 'h-kitchen', roomId: 'kitchen', label: 'Kitchen counter', note: 'Sample note: L-shaped counter with space for a fridge.', position: [9.4, 1.3, 2.5] },
  { id: 'h-bed', roomId: 'bedroom', label: 'Bedroom', note: 'Sample note: room for a queen bed and a wardrobe.', position: [2.5, 1.2, 7.6] },
  { id: 'h-balcony', roomId: 'balcony', label: 'Balcony', note: 'Sample note: open balcony reached from the kitchen.', position: [7.5, 1.2, 7.4] },
];

export function roomById(id: string) {
  return SAMPLE_ROOMS.find((r) => r.id === id) ?? null;
}

/** Splits a wall segment around any doorway gaps on the same line. */
export function wallSegments(axis: 'x' | 'z', at: number, from: number, to: number): [number, number][] {
  const gaps = DOORWAYS.filter((d) => d.axis === axis && d.at === at && d.to > from && d.from < to).sort((a, b) => a.from - b.from);
  const out: [number, number][] = [];
  let cursor = from;
  for (const gap of gaps) {
    if (gap.from > cursor) out.push([cursor, gap.from]);
    cursor = Math.max(cursor, gap.to);
  }
  if (cursor < to) out.push([cursor, to]);
  return out;
}
