/**
 * @file Rendering utilities for dot visualization
 */

import type { RenderState, AppearanceConfig } from './types';

export class DotRenderer {
	/**
	 * Clears the canvas
	 */
	static clear(state: RenderState): void {
		if (!state.context) return;
		state.context.clearRect(0, 0, state.width, state.height);
	}

	/**
	 * Draws center point marker
	 */
	static drawCenterPoint(state: RenderState): void {
		if (!state.context) return;

		state.context.beginPath();
		state.context.arc(state.center.x, state.center.y, 4, 0, Math.PI * 2);
		state.context.fillStyle = 'rgba(0, 0, 0, 0.2)';
		state.context.fill();
		state.context.closePath();
	}

	/**
	 * Draws main dot with shadow
	 */
	static drawDot(state: RenderState, appearance: AppearanceConfig): void {
		if (!state.context) return;

		state.context.beginPath();
		state.context.shadowColor = appearance.shadowColor;
		state.context.shadowBlur = appearance.shadowBlur;
		state.context.shadowOffsetX = appearance.shadowOffset.x;
		state.context.shadowOffsetY = appearance.shadowOffset.y;

		state.context.arc(state.position.x, state.position.y, appearance.size, 0, Math.PI * 2);

		state.context.fillStyle = appearance.color;
		state.context.fill();
		state.context.closePath();

		state.context.shadowColor = 'transparent';
	}
}
