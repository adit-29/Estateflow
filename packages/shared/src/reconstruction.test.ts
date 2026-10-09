import { describe, expect, it } from 'vitest';
import { createDemoTour, publishTour } from './reconstruction';

describe('reconstruction demo boundary', () => {
  it('does not mark a tour ready without an asset', () => {
    expect(createDemoTour('p1', null).state).toBe('unavailable');
  });

  it('requires explicit approval before publish', () => {
    const ready = createDemoTour('p1', '/samples/home.glb');
    expect(publishTour(ready, false).published).toBe(false);
    expect(publishTour(ready, true).published).toBe(true);
  });

  it('refuses to publish a failed or missing tour', () => {
    const missing = createDemoTour('p1', null);
    expect(publishTour(missing, true).published).toBe(false);
  });
});
