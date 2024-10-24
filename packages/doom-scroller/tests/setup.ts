import { vi } from "vitest";

// Setup performance.now() mock
if (typeof performance === "undefined") {
  (global as any).performance = {
    now: vi.fn(() => Date.now()),
  };
}
