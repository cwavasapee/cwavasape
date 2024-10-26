import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DoomScroller } from '../../../src/core/scroller';
import type { ScrollState } from '../../../src/types';

describe('DoomScroller', () => {
  let scroller: DoomScroller;
  
  beforeEach(() => {
    // Create a new instance before each test
    scroller = new DoomScroller();
  });

  afterEach(() => {
    // Clean up after each test
    scroller.destroy();
  });

  describe('initialization', () => {
    it('creates instance with default config', () => {
      expect(scroller).toBeInstanceOf(DoomScroller);
    });

    it('accepts custom config', () => {
      const customScroller = new DoomScroller({
        speedMultiplier: 2,
        smoothingFactor: 0.5
      });
      expect(customScroller).toBeInstanceOf(DoomScroller);
    });
  });

  describe('subscription', () => {
    it('allows subscribing to scroll updates', () => {
      const callback = vi.fn();
      const unsubscribe = scroller.subscribe(callback);
      
      expect(typeof unsubscribe).toBe('function');
    });

    it('calls subscribers with scroll state', () => {
      const callback = vi.fn();
      scroller.subscribe(callback);

      // Simulate a wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaX: 10,
        deltaY: 20,
        deltaMode: 0
      });
      
      window.dispatchEvent(wheelEvent);

      expect(callback).toHaveBeenCalled();
      const state: ScrollState = callback.mock.calls[0][0];
      expect(state).toHaveProperty('isScrolling');
      expect(state).toHaveProperty('velocity');
      expect(state).toHaveProperty('direction');
      expect(state).toHaveProperty('delta');
      expect(state).toHaveProperty('rawDelta');
    });

    it('allows unsubscribing from updates', () => {
      const callback = vi.fn();
      const unsubscribe = scroller.subscribe(callback);
      
      unsubscribe();

      // Simulate a wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaX: 10,
        deltaY: 20,
        deltaMode: 0
      });
      
      window.dispatchEvent(wheelEvent);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('configuration', () => {
    it('allows updating config at runtime', () => {
      scroller.updateConfig({
        speedMultiplier: 2.5,
        smoothingFactor: 0.7
      });

      const callback = vi.fn();
      scroller.subscribe(callback);

      // Simulate a wheel event
      const wheelEvent = new WheelEvent('wheel', {
        deltaX: 10,
        deltaY: 20,
        deltaMode: 0
      });
      
      window.dispatchEvent(wheelEvent);

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('removes event listeners on destroy', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      scroller.destroy();
      
      expect(removeEventListenerSpy).toHaveBeenCalledTimes(4); // wheel, touchstart, touchmove, touchend
    });
  });
});
