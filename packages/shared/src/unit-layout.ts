export const ROOM_TYPES = [
  'bedroom',
  'living',
  'kitchen',
  'bathroom',
  'balcony',
  'dining',
  'corridor',
  'storage',
  'parking',
  'custom',
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export interface LayoutRoom {
  id: string;
  type: RoomType;
  label: string;
  x: number;
  y: number;
  width: number;
  length: number;
  rotation: number;
  notes?: string;
}

export interface UnitLayout {
  version: 1;
  unit: 'ft';
  rooms: LayoutRoom[];
}

export function emptyLayout(): UnitLayout {
  return { version: 1, unit: 'ft', rooms: [] };
}

export function roomAreaSqft(room: Pick<LayoutRoom, 'width' | 'length'>): number {
  const area = Math.max(0, room.width) * Math.max(0, room.length);
  return Math.round(area * 10) / 10;
}

export function totalLayoutArea(layout: UnitLayout): number {
  return Math.round(layout.rooms.reduce((sum, room) => sum + roomAreaSqft(room), 0) * 10) / 10;
}

export function sqftToSqYd(sqft: number): number {
  return Math.round((sqft / 9) * 10) / 10;
}

export interface LayoutBox3D {
  id: string;
  label: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
}

/** Simple extruded boxes from the 2D layout. This is not a reconstruction from photos or video. */
export function layoutToBoxes(layout: UnitLayout): LayoutBox3D[] {
  return layout.rooms.map((room) => ({
    id: room.id,
    label: room.label,
    x: room.x,
    z: room.y,
    width: room.width,
    depth: room.length,
    height: room.type === 'balcony' ? 4 : 9,
  }));
}

export function normalizeLayout(input: unknown): UnitLayout {
  if (!input || typeof input !== 'object') return emptyLayout();
  const raw = input as Partial<UnitLayout>;
  const rooms = Array.isArray(raw.rooms) ? raw.rooms : [];
  return {
    version: 1,
    unit: 'ft',
    rooms: rooms
      .filter((room) => room && typeof room === 'object')
      .map((room, index) => ({
        id: String(room.id || `room-${index}`),
        type: ROOM_TYPES.includes(room.type as RoomType) ? (room.type as RoomType) : 'custom',
        label: String(room.label || 'Room').slice(0, 40),
        x: Number(room.x) || 0,
        y: Number(room.y) || 0,
        width: Math.max(0, Number(room.width) || 0),
        length: Math.max(0, Number(room.length) || 0),
        rotation: Number(room.rotation) || 0,
        notes: room.notes ? String(room.notes).slice(0, 200) : undefined,
      })),
  };
}
