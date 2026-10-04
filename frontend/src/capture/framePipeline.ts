/**
 * Frame Pipeline Runner
 * Bridges ScreenCaptureController and VisionAdapter.
 * Samples frames from capture controller, hands off to VisionAdapter,
 * and emits any extracted ScreenEvent.
 */

import type { ScreenCaptureController } from "./ScreenCaptureController";
import type { VisionAdapter } from "../adapters/visionAdapter";
import type { ScreenEvent } from "../types/index";

export interface FramePipelineOptions {
  sessionId: string;
  captureController: ScreenCaptureController;
  visionAdapter: VisionAdapter;
  onScreenEvent: (event: ScreenEvent) => void;
  getWorkflowContext?: () => Record<string, unknown>;
}

export class FramePipeline {
  private sessionId: string;
  private captureController: ScreenCaptureController;
  private visionAdapter: VisionAdapter;
  private onScreenEvent: (event: ScreenEvent) => void;
  private getWorkflowContext?: () => Record<string, unknown>;

  private unsubFrame: (() => void) | null = null;
  private isProcessingFrame = false;
  private priorEvent: ScreenEvent | undefined;

  constructor(options: FramePipelineOptions) {
    this.sessionId = options.sessionId;
    this.captureController = options.captureController;
    this.visionAdapter = options.visionAdapter;
    this.onScreenEvent = options.onScreenEvent;
    this.getWorkflowContext = options.getWorkflowContext;
  }

  public start(): void {
    if (this.unsubFrame) return;

    this.unsubFrame = this.captureController.onFrame((frame) => {
      this.handleFrame(frame);
    });
  }

  public stop(): void {
    if (this.unsubFrame) {
      this.unsubFrame();
      this.unsubFrame = null;
    }
  }

  private async handleFrame(frame: Blob | ImageBitmap): Promise<void> {
    // Avoid concurrent frame overload if vision adapter is busy
    if (this.isProcessingFrame) return;

    this.isProcessingFrame = true;
    try {
      const timestampMs = Date.now();
      const workflowContext = this.getWorkflowContext ? this.getWorkflowContext() : undefined;

      const event = await this.visionAdapter.analyzeFrame({
        sessionId: this.sessionId,
        timestampMs,
        image: frame,
        priorEvent: this.priorEvent,
        workflowContext,
      });

      if (event) {
        this.priorEvent = event;
        this.onScreenEvent(event);
      }
    } catch (err) {
      console.error("Frame processing error in FramePipeline:", err);
    } finally {
      this.isProcessingFrame = false;
    }
  }
}
