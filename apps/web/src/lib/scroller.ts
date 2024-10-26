import { DoomScroller, type ScrollState, type ScrollConfig } from '@cwavasape/doom-scroller';
import { writable } from 'svelte/store';

export const scroller = writable<DoomScroller>(new DoomScroller());
export const scrollerOptions = writable<ScrollConfig>();
export const scrollerState = writable<ScrollState | null>(null);
