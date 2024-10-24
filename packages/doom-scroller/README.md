# DOOM SCROLLER

A high-performance, smooth scroll detection library for advanced scroll-based interactions. Part of the CWAVASAPE project.

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white)](https://turbo.build/)
[![npm version](https://img.shields.io/npm/v/@cwavasape/doom-scroller.svg?style=flat-square)](https://www.npmjs.com/package/@cwavasape/doom-scroller)
[![npm downloads](https://img.shields.io/npm/dm/@cwavasape/doom-scroller.svg?style=flat-square)](https://www.npmjs.com/package/@cwavasape/doom-scroller)

## Features

- 🎯 Precise scroll direction detection
- 📊 Real-time velocity tracking
- 🔄 Smooth scroll delta normalization
- ⚡ High-performance animation frame updates
- 🎛️ Configurable sensitivity and smoothing
- 📱 Cross-browser wheel event normalization
- 💪 Fully typed TypeScript API

## Installation

Install the package using your preferred package manager:

```bash
# Using npm
npm install @cwavasape/doom-scroller

# Using yarn
yarn add @cwavasape/doom-scroller

# Using pnpm
pnpm add @cwavasape/doom-scroller
```

## Quick Start

```typescript
import { DoomScroller } from "@cwavasape/doom-scroller";

// Create a new instance
const scroller = new DoomScroller({
  smoothingFactor: 0.2, // Lower = smoother but more latency
  speedMultiplier: 1.5, // Higher = more sensitive
  directionThreshold: 0.1, // Lower = more responsive to direction changes
});

// Initialize scroll detection
scroller.init();

// Subscribe to scroll state updates
const unsubscribe = scroller.subscribe((state) => {
  console.log("Scroll direction:", state.direction);
  console.log("Scroll velocity:", state.velocity);

  if (state.direction.y === "down") {
    // Handle downward scroll
  }
});

// Cleanup when done
scroller.destroy();
```

## Development

If you're working on the CWAVASAPE project locally and want to develop or modify the DOOM SCROLLER package:

### Clone the repository

```bash
git clone https://github.com/cwavasapee/cwavasape.git
cd cwavasape
```

### Install dependencies

```bash
pnpm install
```

### Link the package locally in your `package.json`

```json
{
  "dependencies": {
    "@cwavasape/doom-scroller": "workspace:*"
  }
}
```

### Run the development environment

```bash
pnpm dev
```

This will start the Turborepo development environment with hot reloading for both the package and any apps consuming it.

## API Reference

### `DoomScroller`

Main class for scroll detection and state management.

#### Constructor Options

```typescript
interface DoomScrollerOptions {
  /** Multiplier for scroll speed. Default: 1 */
  speedMultiplier?: number;
  /** Number of samples to keep for smoothing. Default: 5 */
  sampleSize?: number;
  /** Minimum velocity to register as movement. Default: 0.1 */
  minVelocity?: number;
  /** Threshold for direction change detection. Default: 0.15 */
  directionThreshold?: number;
  /** Factor for smoothing scroll movements. Default: 0.3 */
  smoothingFactor?: number;
  /** Time in ms to wait before considering scroll ended. Default: 150 */
  debounceTime?: number;
}
```

#### Methods

- `init()`: Initialize scroll detection
- `destroy()`: Cleanup resources and event listeners
- `subscribe(callback: (state: ScrollState) => void): () => void`: Subscribe to scroll state updates

#### Scroll State Interface

```typescript
interface ScrollState {
  /** Whether scrolling is currently active */
  isScrolling: boolean;
  /** Current velocity in pixels per millisecond */
  velocity: {
    x: number;
    y: number;
  };
  /** Current scroll direction state */
  direction: {
    x: "left" | "right" | "none";
    y: "up" | "down" | "none";
  };
  /** Change in scroll position since last update */
  delta: {
    x: number;
    y: number;
  };
  /** Raw scroll values from the wheel event */
  rawScroll: {
    x: number;
    y: number;
  };
}
```

## Advanced Usage

### Smooth Scrolling Animation

```typescript
const scroller = new DoomScroller({
  smoothingFactor: 0.1, // Very smooth
  speedMultiplier: 1.2,
});

scroller.init();

let translateY = 0;
const content = document.querySelector(".content");

scroller.subscribe((state) => {
  if (!state.isScrolling) return;

  // Apply smooth transform based on velocity
  translateY += state.velocity.y * 16; // 16ms frame time
  content?.style.transform = `translateY(${translateY}px)`;
});
```

### Directional UI Updates

```typescript
const scroller = new DoomScroller({
  directionThreshold: 0.1, // Responsive to direction changes
});

scroller.init();

const header = document.querySelector(".header");

scroller.subscribe((state) => {
  if (state.direction.y === "up") {
    header?.classList.remove("header--hidden");
  } else if (state.direction.y === "down" && state.velocity.y > 0.5) {
    header?.classList.add("header--hidden");
  }
});
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Related Packages

Other packages in the CWAVASAPE project:

- `@cwavasape/web` - Main web application built with SvelteKit 5
