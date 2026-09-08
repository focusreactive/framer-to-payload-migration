export interface Viewport {
  width: number;
  height: number;
  deviceScaleFactor: number;
}

export const VIEWPORTS: Record<string, Viewport> = {
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
};

export const SETTLE_MS = 6000;

export const GOTO_TIMEOUT_MS = 90_000;
