import type { Vector2D } from '../../../src/types';

/**
 * Creates a WheelEvent with the specified delta values
 */
export function createWheelEvent(delta: Vector2D): WheelEvent {
  return new WheelEvent('wheel', {
    deltaX: delta.x,
    deltaY: delta.y,
    bubbles: true,
    cancelable: true
  });
}

/**
 * Creates a TouchEvent with the specified coordinates
 */
export function createTouchEvent(
  type: 'touchstart' | 'touchmove' | 'touchend',
  coords: Vector2D,
  identifier = 0
): TouchEvent {
  const touch = new Touch({
    identifier,
    target: document.body,
    clientX: coords.x,
    clientY: coords.y,
    pageX: coords.x,
    pageY: coords.y,
    screenX: coords.x,
    screenY: coords.y
  });

  return new TouchEvent(type, {
    touches: type === 'touchend' ? [] : [touch],
    changedTouches: [touch],
    targetTouches: type === 'touchend' ? [] : [touch],
    bubbles: true,
    cancelable: true
  });
}
