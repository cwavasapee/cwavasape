import type { ScrollState } from '@cwavasape/doom-scroller';
import { writable } from 'svelte/store';

export const scrollState = writable<ScrollState>();
