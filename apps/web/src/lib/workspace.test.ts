import { describe, expect, it } from 'vitest';
import { usesDemoStore } from './workspace';

describe('workspace mode', () => {
  it('keeps live accounts off the demo store', () => {
    expect(usesDemoStore('live')).toBe(false);
    expect(usesDemoStore(null)).toBe(false);
  });

  it('allows the fictional demo workspace to use seeded records', () => {
    expect(usesDemoStore('demo')).toBe(true);
  });
});
