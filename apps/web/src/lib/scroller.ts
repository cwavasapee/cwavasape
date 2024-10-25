import { DoomScroller, type DoomScrollerOptions, type ScrollState } from '@cwavasape/doom-scroller';
import { writable } from 'svelte/store';

export const scroller = writable<DoomScroller>(new DoomScroller());
export const scrollerOptions = writable<DoomScrollerOptions>();
export const scrollerState = writable<ScrollState | null>(null);
