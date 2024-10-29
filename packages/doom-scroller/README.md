# DOOM SCROLLER

A high-performance TypeScript library for precise scroll, touch, and mouse gesture tracking with built-in smoothing and step-based navigation.

## Features

- 🎯 Precise tracking of scroll, touch, and mouse events
- 🔄 Reactive state management with subscription system
- 🎨 Configurable smoothing algorithms (linear/exponential)
- 📏 Optional step-based scrolling
- 📱 Multi-touch gesture support
- 🪶 Zero dependencies
- 📦 Tree-shakeable
- 🧪 Extensively tested with 95%+ coverage

## Installation

```bash
npm install @cwavasape/doom-scroller
# or
pnpm add @cwavasape/doom-scroller
```

## Quick Start

```typescript
import { DoomScroller } from "@cwavasape/doom-scroller";

const scroller = new DoomScroller({
  events: {
    wheel: true,
    touch: true,
    mouse: false,
    passive: true,
    endDelay: 50,
  },
});

scroller.subscribe((state) => {
  console.log("Movement:", state.movement);
  console.log("Direction:", state.direction);
  console.log("Velocity:", state.velocity);
});

scroller.start();
```

## Examples

### Basic Scroll Tracking

```typescript
const scroller = new DoomScroller();

scroller.subscribe((state) => {
  element.style.transform = `
    translateX(${state.movement.x}px)
    translateY(${state.movement.y}px)
  `;
});
```

### Multi-Touch Gesture Support

```typescript
const scroller = new DoomScroller({
  events: {
    touch: true,
    wheel: false,
    mouse: false,
  },
});

scroller.subscribe((state) => {
  if (state.isScrolling) {
    // Handle multi-touch gestures
    const { movement, direction } = state;
    updateElementTransform(movement, direction);
  }
});
```

### Smooth Parallax Effect

```typescript
const scroller = new DoomScroller({
  movement: {
    smoothing: {
      active: true,
      factor: 0.2,
      algorithm: "exponential",
      samples: 4,
    },
  },
});

scroller.subscribe((state) => {
  const parallaxElements = document.querySelectorAll(".parallax");
  parallaxElements.forEach((el, index) => {
    const speed = 0.1 * (index + 1);
    el.style.transform = `translateY(${state.movement.y * speed}px)`;
  });
});
```

### Step-Based Navigation

```typescript
const scroller = new DoomScroller({
  steps: {
    active: true,
    movementMode: "absolute",
    movementThreshold: 100,
    velocityThreshold: 0.5,
  },
});

scroller.subscribe((state) => {
  if (state.step !== undefined) {
    const sections = document.querySelectorAll("section");
    sections[state.step]?.scrollIntoView({ behavior: "smooth" });
  }
});
```

### Touch-Based Carousel

```typescript
const scroller = new DoomScroller({
  events: {
    touch: true,
    wheel: false,
    mouse: false,
  },
  velocity: {
    min: -1,
    max: 1,
    smoothing: {
      active: true,
      factor: 0.3,
      samples: 5,
    },
  },
});

scroller.subscribe((state) => {
  if (Math.abs(state.velocity.x) > 0.5) {
    const direction = state.direction.x;
    if (direction === "left") carousel.next();
    if (direction === "right") carousel.previous();
  }
});
```

## Event Types

DoomScroller supports three main types of events:

- `wheel`: Mouse wheel or trackpad scroll events
- `touch`: Touch events from mobile/tablet devices (including multi-touch)
- `mouse`: Mouse movement and drag events

## Configuration Options

### Input Options

```typescript
interface Options {
  /** Multiplier for scroll speed (default: 1) */
  speedMultiplier?: number;
  /** Time in ms to wait before considering scroll ended (default: 500) */
  debounceTime?: number;
  /** Event handling configuration */
  events?: {
    /** Enable wheel event tracking (default: true) */
    wheel?: boolean;
    /** Enable touch event tracking (default: true) */
    touch?: boolean;
    /** Enable mouse event tracking (default: false) */
    mouse?: boolean;
    /** Enable passive event listeners (default: true) */
    passive?: boolean;
    /** Delay before considering scroll ended (default: 0) */
    endDelay?: number;
  };
  /** Movement configuration */
  movement?: {
    /** Direction change threshold (default: 0.1) */
    threshold?: number;
    /** Number of samples for direction detection (default: 4) */
    samples?: number;
    /** Movement smoothing configuration */
    smoothing?: {
      /** Enable smoothing (default: true) */
      active?: boolean;
      /** Smoothing factor between 0 and 1 (default: 0.2) */
      factor?: number;
      /** Number of samples for smoothing (default: 4) */
      samples?: number;
      /** Smoothing algorithm (default: "linear") */
      algorithm?: "linear" | "exponential";
    };
  };
  /** Velocity configuration */
  velocity?: {
    /** Minimum velocity value (default: -1) */
    min?: number;
    /** Maximum velocity value (default: 1) */
    max?: number;
    /** Velocity smoothing configuration */
    smoothing?: {
      /** Enable smoothing (default: true) */
      active?: boolean;
      /** Smoothing factor between 0 and 1 (default: 0.3) */
      factor?: number;
      /** Number of samples for smoothing (default: 5) */
      samples?: number;
      /** Smoothing algorithm (default: "linear") */
      algorithm?: "linear" | "exponential";
    };
  };
  /** Step detection configuration */
  steps?: {
    /** Enable step detection (default: false) */
    active?: boolean;
    /** Step detection mode (default: "absolute") */
    movementMode?: "delta" | "absolute";
    /** Movement threshold for step detection */
    movementThreshold?: number;
    /** Velocity threshold for step detection */
    velocityThreshold?: number;
  };
  /** Enable debug logging (default: false) */
  debug?: boolean;
}
```

### State Interface

```typescript
interface ScrollState {
  /** Whether scrolling is currently active */
  isScrolling: boolean;
  /** Current viewport dimensions */
  viewport: {
    width: number;
    height: number;
  };
  /** Current absolute position */
  position: Vector2D;
  /** Movement delta since last update */
  movement: Vector2D;
  /** Current velocity vector */
  velocity: Vector2D;
  /** Current movement direction */
  direction: Direction;
  /** Current step index (if steps enabled) */
  step?: number;
  /** Timestamp of the last update */
  timestamp: number;
}

interface Vector2D {
  x: number;
  y: number;
}

interface Direction {
  x: "left" | "right" | "none";
  y: "up" | "down" | "none";
}

interface Step {
  /** Step index number */
  index: number;
  /** Size of the step in pixels */
  size?: number;
  /** Starting coordinates */
  start?: Vector2D;
  /** Ending coordinates */
  end?: Vector2D;
  /** What triggered the step change */
  trigger?: "movement" | "velocity";
}
```

### Memory Management

The library implements efficient memory management through:

- Bounded sample collection (configurable sizes)
- Automatic cleanup of event listeners
- Proper state reset functionality
- Event queue management
- Automatic garbage collection optimization

## State Management

```typescript
// Reset state but keep listeners
scroller.reset();

// Full cleanup including:
// - Event listener removal
// - Animation frame cancellation
// - Queue clearing
// - Memory cleanup
scroller.destroy();

// State subscription with initial value
const unsubscribe = scroller.subscribe((state) => {
  // Handle state updates
});

// Clean up subscription
unsubscribe();
```

## Browser Support

Tested and verified in:

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
- iOS Safari 11+
- Chrome for Android 60+

## Development

Built with:

- TypeScript for type safety
- Vitest for testing
- JSDOM for DOM simulation
- TSUp for bundling
- Changesets for versioning

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build package
pnpm build

# Create changeset
pnpm changeset
```

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

## License

MIT © CWAVASAPE
