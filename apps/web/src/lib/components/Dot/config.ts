/**
 * @file Default configuration for dot behavior and appearance
 */

import type { DotConfig } from './types';

export const DEFAULT_CONFIG: DotConfig = {
	movement: {
		speed: 0.8,
		friction: 1,
		minVelocity: 0.1,
		resetThreshold: 2.0
	},
	joystick: {
		enabled: true,
		returnStrength: 0.1,
		returnThreshold: 5
	},
	appearance: {
		size: 10,
		color: '#ff3e00',
		shadowColor: 'rgba(0, 0, 0, 0.5)',
		shadowBlur: 10,
		shadowOffset: { x: 2, y: 2 }
	}
};
