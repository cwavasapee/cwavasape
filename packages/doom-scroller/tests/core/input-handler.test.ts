import { describe, it, expect } from 'vitest';
import { InputHandler } from '../../../src/core/input-handler';
import type { TimePoint } from '../../../src/types';

describe('InputHandler', () => {
  describe('normalizeWheel', () => {
    it('normalizes pixel mode wheel events', () => {
      const event = {
        deltaX: 10,
        deltaY: 20,
        deltaMode: 0
      } as WheelEvent;

      const result = InputHandler.normalizeWheel(event, 1, false, false);
      expect(result).toEqual({ x: -10, y: -20 });
    });

    it('normalizes line mode wheel events', () => {
      const event = {
        deltaX: 1,
        deltaY: 2,
        deltaMode: 1
      } as WheelEvent;

      const result = InputHandler.normalizeWheel(event, 1, false, false);
      expect(result).toEqual({ x: -16, y: -32 }); // Line mode multiplies by 16
    });

    it('applies speed multiplier correctly', () => {
      const event = {
        deltaX: 10,
        deltaY: 20,
        deltaMode: 0
      } as WheelEvent;

      const result = InputHandler.normalizeWheel(event, 2, false, false);
      expect(result).toEqual({ x: -20, y: -40 });
    });

    it('respects axis inversion', () => {
      const event = {
        deltaX: 10,
        deltaY: 20,
        deltaMode: 0
      } as WheelEvent;

      const result = InputHandler.normalizeWheel(event, 1, true, true);
      expect(result).toEqual({ x: 10, y: 20 });
    });
  });

  describe('processTouch', () => {
    it('calculates touch movement correctly', () => {
      const touch = {
        clientX: 150,
        clientY: 250
      } as Touch;

      const lastPoint: TimePoint = {
        x: 100,
        y: 200,
        timestamp: performance.now()
      };

      const result = InputHandler.processTouch(touch, lastPoint, 1, false, false);
      expect(result).toEqual({ x: 50, y: 50 });
    });

    it('applies speed multiplier to touch movement', () => {
      const touch = {
        clientX: 150,
        clientY: 250
      } as Touch;

      const lastPoint: TimePoint = {
        x: 100,
        y: 200,
        timestamp: performance.now()
      };

      const result = InputHandler.processTouch(touch, lastPoint, 2, false, false);
      expect(result).toEqual({ x: 100, y: 100 });
    });

    it('respects touch axis inversion', () => {
      const touch = {
        clientX: 150,
        clientY: 250
      } as Touch;

      const lastPoint: TimePoint = {
        x: 100,
        y: 200,
        timestamp: performance.now()
      };

      const result = InputHandler.processTouch(touch, lastPoint, 1, true, true);
      expect(result).toEqual({ x: -50, y: -50 });
    });
  });

  describe('createTimePoint', () => {
    it('creates time point with current timestamp', () => {
      const now = performance.now();
      const point = InputHandler.createTimePoint(100, 200);
      
      expect(point.x).toBe(100);
      expect(point.y).toBe(200);
      expect(point.timestamp).toBeGreaterThanOrEqual(now);
      expect(point.timestamp).toBeLessThanOrEqual(performance.now());
    });
  });
});
