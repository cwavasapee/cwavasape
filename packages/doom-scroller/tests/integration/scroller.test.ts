import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { ScrollState, ScrollConfig } from '../../src/types';

interface DoomScrollerInstance {
  init(): void;
  cleanup(): void;
  subscribe(callback: (state: ScrollState) => void): () => void;
}

interface DoomScrollerConstructor {
  new (config?: Partial<ScrollConfig>): DoomScrollerInstance;
}

declare global {
  interface Window {
    DoomScroller: DoomScrollerConstructor;
    createWheelEvent: (delta: { x: number; y: number }) => WheelEvent;
    createTouchEvent: (
      type: 'touchstart' | 'touchmove' | 'touchend',
      coords: { x: number; y: number },
      identifier?: number
    ) => TouchEvent;
  }
}

test.describe('DoomScroller Integration', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/test.html');
    // Wait for the page to be fully loaded
    await page.waitForLoadState('domcontentloaded');
  });

  test('initializes without errors', async () => {
    const hasError = await page.evaluate(() => {
      try {
        const scroller = new window.DoomScroller();
        scroller.init();
        return false;
      } catch (e) {
        console.error(e);
        return true;
      }
    });
    expect(hasError).toBe(false);
  });

  test('handles wheel events', async () => {
    const scrollState = await page.evaluate((): Promise<ScrollState> => {
      return new Promise((resolve) => {
        const container = document.getElementById('test-container');
        if (!container) throw new Error('Test container not found');
        const scroller = new window.DoomScroller();
        scroller.init();
        
        let eventCount = 0;
        scroller.subscribe((state) => {
          eventCount++;
          if (eventCount === 1) {
            resolve(state);
          }
        });

        const wheelEvent = window.createWheelEvent({ x: 0, y: 100 });
        container.dispatchEvent(wheelEvent);
      });
    });

    expect(scrollState).toBeDefined();
    expect(scrollState).toHaveProperty('isScrolling', true);
    expect(scrollState).toHaveProperty('velocity');
    expect(scrollState).toHaveProperty('direction');
  });

  test('handles touch events', async () => {
    const touchState = await page.evaluate((): Promise<ScrollState> => {
      return new Promise((resolve) => {
        const container = document.getElementById('test-container');
        if (!container) throw new Error('Test container not found');
        const scroller = new window.DoomScroller();
        scroller.init();
        
        let eventCount = 0;
        scroller.subscribe((state) => {
          eventCount++;
          if (eventCount === 1) {
            resolve(state);
          }
        });

        const startEvent = window.createTouchEvent('touchstart', { x: 0, y: 0 });
        const moveEvent = window.createTouchEvent('touchmove', { x: 0, y: 50 });
        
        container.dispatchEvent(startEvent);
        setTimeout(() => {
          container.dispatchEvent(moveEvent);
        }, 50);
      });
    });

    expect(touchState).toBeDefined();
    expect(touchState).toHaveProperty('isScrolling', true);
    expect(touchState).toHaveProperty('velocity');
    expect(touchState).toHaveProperty('direction');
  });

  test('respects configuration options', async () => {
    const scrollState = await page.evaluate((): Promise<ScrollState> => {
      return new Promise((resolve) => {
        const container = document.getElementById('test-container');
        if (!container) throw new Error('Test container not found');
        const scroller = new window.DoomScroller({
          speedMultiplier: 2,
          invertY: true
        });
        scroller.init();
        
        let eventCount = 0;
        scroller.subscribe((state) => {
          eventCount++;
          if (eventCount === 1) {
            resolve(state);
          }
        });

        const wheelEvent = window.createWheelEvent({ x: 0, y: 100 });
        container.dispatchEvent(wheelEvent);
      });
    });

    expect(scrollState).toBeDefined();
    expect(scrollState).toHaveProperty('velocity');
    expect(scrollState.velocity.y).toBeLessThan(0);
  });

  test('cleanup works correctly', async () => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const container = document.getElementById('test-container');
        if (!container) {
          resolve(false);
          return;
        }

        const scroller = new window.DoomScroller();
        scroller.init();
        
        let eventFired = false;
        scroller.subscribe(() => {
          eventFired = true;
        });

        scroller.cleanup();

        const wheelEvent = window.createWheelEvent({ x: 0, y: 100 });
        container.dispatchEvent(wheelEvent);

        // Give time for any events to fire
        setTimeout(() => {
          resolve(!eventFired);
        }, 100);
      });
    });

    expect(result).toBe(true);
  });
});
