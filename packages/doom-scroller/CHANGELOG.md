# @cwavasape/doom-scroller

## 0.0.1

### Patch Changes

- bcec2a4: # Doom Scroller

  First release of the DoomScroller library, providing advanced scroll detection and smooth tracking capabilities.

  ## Features

  - 🎯 Precise scroll direction detection for both vertical and horizontal movements
  - 📊 Real-time velocity tracking with configurable smoothing
  - 🔄 Delta normalization across different input methods and browsers
  - ⚡ Immediate direction feedback with configurable thresholds
  - 🎛️ Customizable sensitivity and smoothing options
  - 🧮 Built-in debouncing for scroll end detection
  - 🔍 Raw scroll data access for custom implementations

  ## Developer Experience

  - 📝 Full TypeScript support with comprehensive type definitions
  - 💡 Detailed JSDoc documentation for all public APIs
  - ✨ Zero dependencies
  - 🧪 Extensively tested with 100% coverage
  - 🎮 Simple subscription-based API

  ## Example Usage

  ```typescript
  const scroller = new DoomScroller({
    smoothingFactor: 0.2, // Controls smoothness
    speedMultiplier: 1.5, // Adjusts sensitivity
    directionThreshold: 0.1, // Direction change sensitivity
  });

  scroller.subscribe((state) => {
    console.log("Direction:", state.direction);
    console.log("Velocity:", state.velocity);
  });

  // Cleanup when done
  scroller.destroy();
  ```
