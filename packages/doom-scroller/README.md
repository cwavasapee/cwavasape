# DOOM SCROLLER

A lightweight TypeScript library for advanced scroll, touch, and mouse gesture tracking with smooth animations and step-based interactions.

## Features

- 🎯 Precise tracking of scroll, touch, and mouse events
- 🔄 Reactive values with event subscription system
- 🎨 Customizable smoothing algorithms
- 📏 Step-based scrolling for controlled animations
- 📱 Cross-device support (desktop & mobile)
- 🪶 Zero dependencies
- 📦 Tree-shakeable

## Installation

```bash
npm install @cwavasape/doom-scroller
# or
yarn add @cwavasape/doom-scroller
# or
pnpm add @cwavasape/doom-scroller
```

## Quick Start

```typescript
import { DoomScroller } from "@cwavasape/doom-scroller";

// Initialize with default options
const scroller = new DoomScroller();

// Subscribe to scroll updates
scroller.subscribe((data) => {
  console.log("Scroll position:", data.position);
  console.log("Scroll velocity:", data.velocity);
  console.log("Scroll direction:", data.direction);
});

// Start tracking events
scroller.start();
```

## Examples

### Basic Scroll Tracking

```typescript
const scroller = new DoomScroller();

scroller.subscribe((data) => {
  // Update element position based on scroll
  element.style.transform = `translateY(${data.position.y}px)`;
});
```

### Smooth Parallax Effect

```typescript
const scroller = new DoomScroller({
  smoothing: {
    active: true,
    factor: 0.1,
    algorithm: "exponential",
  },
});

scroller.subscribe((data) => {
  const parallaxElements = document.querySelectorAll(".parallax");

  parallaxElements.forEach((el, index) => {
    const speed = 0.1 * (index + 1);
    el.style.transform = `translateY(${data.position.y * speed}px)`;
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

scroller.subscribe((data) => {
  if (data.step) {
    // Navigate to section based on step index
    const sections = document.querySelectorAll("section");
    sections[data.step.index]?.scrollIntoView({ behavior: "smooth" });
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
  },
});

scroller.subscribe((data) => {
  if (Math.abs(data.velocity.x) > 0.5) {
    const direction = data.direction.x;
    if (direction === "left") carousel.next();
    if (direction === "right") carousel.previous();
  }
});
```

## Event Types

DoomScroller supports three main types of events:

- `wheel`: Mouse wheel or trackpad scroll events
- `touch`: Touch events from mobile/tablet devices
- `mouse`: Mouse movement and drag events

## Configuration Options

### Input Options

```typescript
type Options = {
  /** Multiplier for scroll speed (default: 1) */
  speedMultiplier?: number;
  /** Time in ms to wait before considering scroll ended (default: 200) */
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
  };
  /** Movement smoothing configuration */
  smoothing?: {
    /** Enable smoothing (default: true) */
    active?: boolean;
    /** Smoothing factor between 0 and 1 (default: 0.3) */
    factor?: number;
    /** Minimum movement threshold (default: 0.1) */
    threshold?: number;
    /** Number of samples for smoothing calculation (default: 5) */
    samples?: number;
    /** Smoothing algorithm selection (default: "linear") */
    algorithm?: "linear" | "exponential";
  };
  /** Velocity calculation configuration */
  velocity?: {
    /** Minimum velocity value (default: 0) */
    min?: number;
    /** Maximum velocity value (default: 1) */
    max?: number;
    /** Velocity calculation algorithm (default: "linear") */
    algorithm?: "linear" | "exponential";
  };
  /** Direction detection configuration */
  direction?: {
    /** Direction change threshold (default: 0.1) */
    threshold?: number;
    /** Number of samples for direction detection (default: 5) */
    samples?: number;
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
};
```

### Scroll State Data

```typescript
interface ScrollState {
  /** Whether scrolling is currently active */
  isScrolling: boolean;
  /** Current viewport dimensions */
  viewport: Vector2D;
  /** Current absolute position */
  position: Vector2D;
  /** Movement delta since last update */
  movement: Vector2D;
  /** Current velocity vector */
  velocity: Vector2D;
  /** Current movement direction */
  direction: Direction;
  /** Current step information (if steps enabled) */
  step?: Step;
  /** Timestamp of the last update */
  timestamp: number;
}

interface Vector2D {
  /** X-axis coordinate or value */
  x: number;
  /** Y-axis coordinate or value */
  y: number;
}

interface Direction {
  /** X-axis direction: left, right, or none */
  x: "left" | "right" | "none";
  /** Y-axis direction: up, down, or none */
  y: "up" | "down" | "none";
}

interface Step {
  /** Step index number */
  index: number;
  /** Size of the step in pixels */
  size?: number;
  /** Starting coordinates of the step */
  start?: Vector2D;
  /** Ending coordinates of the step */
  end?: Vector2D;
  /** What triggered the step change */
  trigger?: "movement" | "velocity";
}
```

## Advanced Usage

### Custom Smoothing Algorithm

```typescript
const scroller = new DoomScroller({
  smoothing: {
    active: true,
    algorithm: (values) => {
      // Implement custom smoothing logic
      return values.reduce((a, b) => a + b, 0) / values.length;
    },
  },
});
```

### State Management

```typescript
// Reset internal state while maintaining event listeners
scroller.reset();

// Remove all event listeners and clean up
scroller.destroy();
```

### Error Handling

DoomScroller includes built-in error handling for:

- Invalid configuration values
- Browser compatibility issues
- Event listener conflicts
- Edge cases in movement calculations

Example with error handling:

```typescript
try {
  const scroller = new DoomScroller({
    velocity: {
      min: -1,
      max: 1,
    },
  });
  scroller.start();
} catch (error) {
  console.error("DoomScroller initialization failed:", error);
}
```

## Browser Support

### Desktop Browsers

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

### Mobile Browsers

- iOS Safari 11+
- Chrome for Android 60+
- Samsung Internet 8.2+
- Android WebView 60+

All features are tested across both desktop and mobile environments with fallbacks for older browsers.

## Testing

DoomScroller includes extensive unit tests covering:

- Event handling and normalization
- Smoothing algorithms (linear and exponential)
- Velocity calculations with different algorithms
- Direction detection with configurable thresholds
- Step-based navigation with both absolute and delta modes
- Edge cases and error conditions

Run the test suite:

```bash
pnpm test
```

## Development

DoomScroller is built with TypeScript and uses:

- Vitest for testing
- JSDOM for DOM simulation in tests
- TSUp for bundling
- Changesets for versioning

To set up the development environment:

```bash
# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the package
pnpm build

# Create a new changeset
pnpm changeset
```

## Performance

### Smoothing Algorithms

DoomScroller provides two built-in smoothing algorithms:

- **Linear**: Provides consistent smoothing with direct proportion to movement
- **Exponential**: Offers more natural feeling deceleration

Both algorithms are optimized for:

- Handling rapid direction changes
- Maintaining smooth transitions
- Preventing jittery movements
- Managing high-frequency updates

### Memory Management

The library implements efficient memory management through:

- Bounded sample collection
- Automatic cleanup of event listeners
- Proper state reset functionality

## TypeScript Support

DoomScroller is written in TypeScript and provides:

- Full type definitions for all APIs
- Generic type support for custom configurations
- Strict type checking for options and callbacks
- Comprehensive JSDoc documentation

Type definitions are automatically included and no additional @types packages are required.

## Contributing

Contributions are welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

## License

MIT © CWAVASAPE
