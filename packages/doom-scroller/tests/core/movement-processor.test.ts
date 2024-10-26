import { describe, it, expect } from 'vitest';
import { MovementProcessor } from '../../../src/core/movement-processor';
import type { TimePoint } from '../../../src/types';

describe('MovementProcessor', () => {
  describe('calculateVelocity', () => {
    it('returns zero velocity for empty points array', () => {
      const result = MovementProcessor.calculateVelocity([], 50);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('returns zero velocity for single point', () => {
      const points: TimePoint[] = [
        { x: 10, y: 20, timestamp: 1000 }
      ];
      const result = MovementProcessor.calculateVelocity(points, 50);
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('calculates velocity from multiple points', () => {
      const points: TimePoint[] = [
        { x: 0, y: 0, timestamp: 1000 },
        { x: 10, y: 5, timestamp: 1016 },
        { x: 20, y: 10, timestamp: 1032 }
      ];
      const result = MovementProcessor.calculateVelocity(points, 50);
      expect(result.x).toBeGreaterThan(0);
      expect(result.y).toBeGreaterThan(0);
    });

    it('respects maxVelocity limit', () => {
      const points: TimePoint[] = [
        { x: 0, y: 0, timestamp: 1000 },
        { x: 1000, y: 1000, timestamp: 1016 }
      ];
      const maxVelocity = 50;
      const result = MovementProcessor.calculateVelocity(points, maxVelocity);
      expect(Math.abs(result.x)).toBeLessThanOrEqual(maxVelocity);
      expect(Math.abs(result.y)).toBeLessThanOrEqual(maxVelocity);
    });
  });

  describe('getDirection', () => {
    it('returns "none" for values below threshold', () => {
      expect(MovementProcessor.getDirection(2, 5)).toBe('none');
      expect(MovementProcessor.getDirection(-2, 5)).toBe('none');
    });

    it('returns "positive" for values above threshold', () => {
      expect(MovementProcessor.getDirection(10, 5)).toBe('positive');
    });

    it('returns "negative" for negative values below negative threshold', () => {
      expect(MovementProcessor.getDirection(-10, 5)).toBe('negative');
    });
  });

  describe('updateDirection', () => {
    it('correctly determines direction for both axes', () => {
      const result = MovementProcessor.updateDirection({ x: 10, y: -5 }, 3);
      expect(result).toEqual({
        x: 'positive',
        y: 'negative'
      });
    });

    it('returns "none" when movement is below threshold', () => {
      const result = MovementProcessor.updateDirection({ x: 1, y: -1 }, 3);
      expect(result).toEqual({
        x: 'none',
        y: 'none'
      });
    });
  });

  describe('smoothDelta', () => {
    it('applies linear interpolation correctly', () => {
      const current = { x: 10, y: 5 };
      const previous = { x: 0, y: 0 };
      const factor = 0.5;
      
      const result = MovementProcessor.smoothDelta(current, previous, factor);
      
      expect(result).toEqual({
        x: 5, // (10 * 0.5 + 0 * 0.5)
        y: 2.5 // (5 * 0.5 + 0 * 0.5)
      });
    });
  });

  describe('capValue', () => {
    it('caps positive values to maximum', () => {
      expect(MovementProcessor.capValue(100, 50)).toBe(50);
    });

    it('caps negative values to negative maximum', () => {
      expect(MovementProcessor.capValue(-100, 50)).toBe(-50);
    });

    it('does not modify values within range', () => {
      expect(MovementProcessor.capValue(25, 50)).toBe(25);
      expect(MovementProcessor.capValue(-25, 50)).toBe(-25);
    });
  });
});
