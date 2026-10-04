/**
 * P1-06 — VisionAdapter Interface & Frame Pipeline Handoff
 * Provider-neutral interface for submitting sampled frames to Person 3's perception pipeline.
 * Does NOT call Claude directly.
 */

import type { ScreenEvent } from "../types/index";

export interface VisionAdapterInput {
  sessionId: string;
  timestampMs: number;
  image: Blob | ImageBitmap;
  priorEvent?: ScreenEvent;
  workflowContext?: Record<string, unknown>;
}

export interface VisionAdapter {
  analyzeFrame(input: VisionAdapterInput): Promise<ScreenEvent | null>;
}

/**
 * MockVisionAdapter — used in tests and mock/offline mode.
 * Returns pre-configured or queue-based ScreenEvents.
 */
export class MockVisionAdapter implements VisionAdapter {
  private queue: (ScreenEvent | null)[] = [];
  public analyzedFramesCount = 0;

  constructor(initialQueue: (ScreenEvent | null)[] = []) {
    this.queue = [...initialQueue];
  }

  public enqueueEvent(event: ScreenEvent | null): void {
    this.queue.push(event);
  }

  public async analyzeFrame(input: VisionAdapterInput): Promise<ScreenEvent | null> {
    this.analyzedFramesCount++;
    // Simulate brief processing delay
    await new Promise((resolve) => setTimeout(resolve, 20));

    if (this.queue.length > 0) {
      const next = this.queue.shift() ?? null;
      if (next) {
        return {
          ...next,
          sessionId: input.sessionId,
          timestampMs: input.timestampMs,
        };
      }
    }
    return null;
  }
}

/**
 * HttpVisionAdapter — forwards sampled frame to Person 3's backend perception route:
 * POST /api/vision/analyze-frame
 */
export class HttpVisionAdapter implements VisionAdapter {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  public async analyzeFrame(input: VisionAdapterInput): Promise<ScreenEvent | null> {
    const base64Image = await blobOrBitmapToBase64(input.image);

    const response = await fetch(`${this.baseUrl}/api/vision/analyze-frame`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sessionId: input.sessionId,
        timestampMs: input.timestampMs,
        imageBase64: base64Image,
        previousContext: input.priorEvent ? JSON.stringify(input.priorEvent) : undefined,
        workflowContext: input.workflowContext,
      }),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Vision API error: HTTP ${response.status}`);
    }

    const eventData = await response.json();
    return eventData as ScreenEvent | null;
  }
}

/**
 * Helper to convert Blob or ImageBitmap to Base64 string for HTTP transmission
 */
export async function blobOrBitmapToBase64(image: Blob | ImageBitmap): Promise<string> {
  if (image instanceof Blob) {
    if (typeof FileReader !== "undefined") {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const res = reader.result as string;
          const base64 = res.split(",")[1] || res;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(image);
      });
    }
    if (typeof (image as any).arrayBuffer === "function") {
      const buf = await (image as any).arrayBuffer();
      const nodeBuffer = (globalThis as any).Buffer;
      return typeof nodeBuffer !== "undefined" ? nodeBuffer.from(buf).toString("base64") : "mock_base64";
    }
    return "mock_base64_image_data";
  }

  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(image, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
      return dataUrl.split(",")[1] || dataUrl;
    }
  }

  return "mock_base64_image_data";
}
