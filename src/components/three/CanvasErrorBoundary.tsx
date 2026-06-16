"use client";

import { Component, type ReactNode } from "react";

/**
 * Isolates a decorative WebGL canvas. React Three Fiber throws synchronously
 * when the GPU can't create a context (low-end or locked-down devices) or when
 * a frame errors; without a boundary that throw bubbles to the route-level
 * error.tsx and replaces the whole page with the error screen. Since these
 * canvases are purely decorative, we just drop the layer (or a supplied
 * fallback) and leave the rest of the site intact.
 */
export default class CanvasErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn("[canvas] decorative WebGL layer disabled:", error);
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
