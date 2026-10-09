import { describe, expect, it } from 'vitest';
import { DOORWAYS, SAMPLE_FURNITURE, SAMPLE_HOTSPOTS, SAMPLE_ROOMS, roomById, wallSegments } from './sample-scene';

describe('sample tour scene', () => {
  it('places every hotspot and furniture item inside its room', () => {
    for (const item of [...SAMPLE_HOTSPOTS, ...SAMPLE_FURNITURE]) {
      const room = roomById(item.roomId);
      expect(room, item.roomId).not.toBeNull();
      const [x, , z] = item.position;
      expect(x).toBeGreaterThanOrEqual(room!.x);
      expect(x).toBeLessThanOrEqual(room!.x + room!.width);
      expect(z).toBeGreaterThanOrEqual(room!.z);
      expect(z).toBeLessThanOrEqual(room!.z + room!.depth);
    }
  });

  it('leaves a gap for each doorway so rooms connect', () => {
    for (const door of DOORWAYS) {
      const segments = wallSegments(door.axis, door.at, 0, 10);
      const blocked = segments.some(([a, b]) => a < door.to && b > door.from);
      expect(blocked).toBe(false);
    }
    expect(wallSegments('z', 99, 0, 5)).toEqual([[0, 5]]);
  });

  it('offers a camera preset for every room', () => {
    expect(SAMPLE_ROOMS.length).toBeGreaterThanOrEqual(3);
    for (const room of SAMPLE_ROOMS) expect(room.camera).toHaveLength(3);
  });
});
