/**
 * @file Type definitions for the dot visualization system
 */

import type { Vector2D } from '@cwavasape/doom-scroller';

export interface RenderState {
	context: CanvasRenderingContext2D | null;
	width: number;
	height: number;
	position: Vector2D;
	velocity: Vector2D;
	center: Vector2D;
}

export interface MovementConfig {
	speed: number;
	friction: number;
	minVelocity: number;
	resetThreshold: number;
}

export interface JoystickConfig {
	enabled: boolean;
	returnStrength: number;
	returnThreshold: number;
}

export interface AppearanceConfig {
	size: number;
	color: string;
	shadowColor: string;
	shadowBlur: number;
	shadowOffset: Vector2D;
}

export interface DotConfig {
	movement: MovementConfig;
	joystick: JoystickConfig;
	appearance: AppearanceConfig;
}
