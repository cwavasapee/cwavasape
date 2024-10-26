import { describe, it, expect } from 'vitest';
import type { Vector2D, Direction, DirectionState, ScrollConfig, ScrollState } from '../../src/types';

describe('Vector2D', () => {
  it('should properly type 2D coordinates', () => {
    const vector: Vector2D = { x: 100, y: -50 };
    expect(vector.x).toBe(100);
    expect(vector.y).toBe(-50);
  });

  it('should accept decimal values', () => {
    const vector: Vector2D = { x: 0.5, y: -1.75 };
    expect(vector.x).toBe(0.5);
    expect(vector.y).toBe(-1.75);
  });
});

describe('Direction', () => {
  it('should only accept valid direction values', () => {
    const validDirections: Direction[] = ['positive', 'negative', 'none'];
    validDirections.forEach(dir => {
      expect(['positive', 'negative', 'none']).toContain(dir);
    });
  });
});

describe('DirectionState', () => {
  it('should properly type direction state object', () => {
    const dirState: DirectionState = { x: 'positive', y: 'none' };
    expect(dirState.x).toBe('positive');
    expect(dirState.y).toBe('none');
  });
});

describe('ScrollConfig', () => {
  it('should accept valid configuration values', () => {
    const config: ScrollConfig = {
      speedMultiplier: 1.5,
      smoothingFactor: 0.3,
      directionThreshold: 0.15,
      minVelocity: 0.1,
      maxVelocity: 50,
      sampleSize: 5,
      invertX: false,
      invertY: true,
      debounceTime: 200
    };

    expect(config.speedMultiplier).toBeGreaterThan(0);
    expect(config.smoothingFactor).toBeGreaterThan(0);
    expect(config.smoothingFactor).toBeLessThan(1);
    expect(config.sampleSize).toBeGreaterThan(0);
    expect(typeof config.invertX).toBe('boolean');
    expect(typeof config.invertY).toBe('boolean');
  });
});

describe('ScrollState', () => {
  it('should properly structure scroll state', () => {
    const state: ScrollState = {
      isScrolling: true,
      velocity: { x: 1.5, y: -0.5 },
      direction: { x: 'positive', y: 'negative' },
      delta: { x: 10, y: -5 },
      rawDelta: { x: 12, y: -6 }
    };

    expect(state.isScrolling).toBe(true);
    expect(state.velocity).toEqual(expect.objectContaining({
      x: expect.any(Number),
      y: expect.any(Number)
    }));
    expect(state.direction).toEqual(expect.objectContaining({
      x: expect.any(String),
      y: expect.any(String)
    }));
    expect(state.delta).toEqual(expect.objectContaining({
      x: expect.any(Number),
      y: expect.any(Number)
    }));
  });
});
