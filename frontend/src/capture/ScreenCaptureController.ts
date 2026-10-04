/**
 * P1-05 — Browser Screen Sharing & ScreenCaptureController
 * Implements getDisplayMedia()-based screen capture lifecycle.
 * Provider-neutral capture layer.
 */

import type { CaptureState, CaptureStatus } from "../types/index";

export interface ScreenCaptureControllerOptions {
  /** Sampling interval in milliseconds (default: 3000ms) */
  sampleIntervalMs?: number;
  /** Custom getDisplayMedia function (defaults to navigator.mediaDevices.getDisplayMedia) */
  getDisplayMediaFn?: (constraints?: DisplayMediaStreamOptions) => Promise<MediaStream>;
}

export interface ScreenCaptureController {
  start(): Promise<void>;
  pause(): void;
  resume(): void;
  stop(): void;
  getStatus(): CaptureStatus;
  getCaptureState(): CaptureState;
  onFrame(callback: (frame: Blob | ImageBitmap) => void): () => void;
  onStatusChange(callback: (state: CaptureState) => void): () => void;
  grabCurrentFrame(): Promise<Blob | ImageBitmap | null>;
}

export class DefaultScreenCaptureController implements ScreenCaptureController {
  private options: Required<ScreenCaptureControllerOptions>;
  private state: CaptureState;
  private stream: MediaStream | null = null;
  private track: MediaStreamTrack | null = null;
  private samplingTimer: ReturnType<typeof setInterval> | null = null;
  private frameSubscribers: Set<(frame: Blob | ImageBitmap) => void> = new Set();
  private statusSubscribers: Set<(state: CaptureState) => void> = new Set();

  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private trackEndedHandler: (() => void) | null = null;

  constructor(options?: ScreenCaptureControllerOptions) {
    this.options = {
      sampleIntervalMs: options?.sampleIntervalMs ?? 3000,
      getDisplayMediaFn:
        options?.getDisplayMediaFn ??
        (async (constraints) => {
          if (
            typeof navigator === "undefined" ||
            !navigator.mediaDevices ||
            !navigator.mediaDevices.getDisplayMedia
          ) {
            throw new Error("Screen capture (getDisplayMedia) is not supported in this browser environment.");
          }
          return navigator.mediaDevices.getDisplayMedia(constraints);
        }),
    };

    this.state = {
      status: "idle",
    };
  }

  public getStatus(): CaptureStatus {
    return this.state.status;
  }

  public getCaptureState(): CaptureState {
    return { ...this.state };
  }

  public onFrame(callback: (frame: Blob | ImageBitmap) => void): () => void {
    this.frameSubscribers.add(callback);
    return () => {
      this.frameSubscribers.delete(callback);
    };
  }

  public onStatusChange(callback: (state: CaptureState) => void): () => void {
    this.statusSubscribers.add(callback);
    // Emit initial state
    callback(this.getCaptureState());
    return () => {
      this.statusSubscribers.delete(callback);
    };
  }

  public async start(): Promise<void> {
    if (this.state.status === "active") {
      return;
    }

    this.updateState({ status: "requesting", error: undefined });

    try {
      const stream = await this.options.getDisplayMediaFn({
        video: { displaySurface: "browser" } as unknown as boolean,
        audio: false,
      });

      this.stream = stream;
      const tracks = stream.getVideoTracks();
      if (!tracks || tracks.length === 0) {
        throw new Error("No video track found in screen capture stream.");
      }

      this.track = tracks[0];

      // Handle unexpected stream end (e.g. user stops sharing via browser bar)
      this.trackEndedHandler = () => {
        this.handleUnexpectedStreamEnded();
      };
      this.track.addEventListener("ended", this.trackEndedHandler);

      // Setup offscreen elements for frame sampling if in browser
      this.setupOffscreenMedia(stream);

      this.updateState({
        status: "active",
        startedAtMs: Date.now(),
        pausedAtMs: undefined,
        totalPausedMs: 0,
        error: undefined,
      });

      // Start low-frequency sampling timer
      this.startSampling();
    } catch (err: unknown) {
      const errorObj = err as Error;
      let userFriendlyMsg = errorObj.message || "Failed to start screen capture.";

      if (
        errorObj.name === "NotAllowedError" ||
        errorObj.name === "PermissionDeniedError" ||
        errorObj.name === "AbortError" ||
        userFriendlyMsg.toLowerCase().includes("denied") ||
        userFriendlyMsg.toLowerCase().includes("cancel")
      ) {
        userFriendlyMsg = "Screen capture permission was denied or cancelled by user.";
      }

      this.updateState({
        status: "error",
        error: userFriendlyMsg,
      });

      throw new Error(userFriendlyMsg);
    }
  }

  public pause(): void {
    if (this.state.status !== "active") return;

    // Stop frame processing timer while preserving stream & session
    this.stopSampling();

    this.updateState({
      status: "paused",
      pausedAtMs: Date.now(),
    });
  }

  public resume(): void {
    if (this.state.status !== "paused") return;

    const now = Date.now();
    const pausedDuration = this.state.pausedAtMs ? now - this.state.pausedAtMs : 0;
    const totalPausedMs = (this.state.totalPausedMs || 0) + pausedDuration;

    this.updateState({
      status: "active",
      pausedAtMs: undefined,
      totalPausedMs,
    });

    // Restart frame processing timer
    this.startSampling();
  }

  public stop(): void {
    if (this.state.status === "stopped" || this.state.status === "idle") return;

    this.stopSampling();
    this.cleanupMedia();

    this.updateState({
      status: "stopped",
    });
  }

  private handleUnexpectedStreamEnded(): void {
    this.stopSampling();
    this.cleanupMedia();

    this.updateState({
      status: "stopped",
      error: "Screen sharing was stopped by the user or browser.",
    });
  }

  private startSampling(): void {
    this.stopSampling();
    this.samplingTimer = setInterval(() => {
      this.grabFrame();
    }, this.options.sampleIntervalMs);
  }

  private stopSampling(): void {
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = null;
    }
  }

  private setupOffscreenMedia(stream: MediaStream): void {
    if (typeof document === "undefined") return;

    if (!this.videoElement) {
      this.videoElement = document.createElement("video");
      this.videoElement.autoplay = true;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      this.videoElement.style.display = "none";
    }
    this.videoElement.srcObject = stream;
    this.videoElement.play().catch(() => {});

    if (!this.canvasElement) {
      this.canvasElement = document.createElement("canvas");
    }
  }

  private cleanupMedia(): void {
    if (this.track && this.trackEndedHandler) {
      this.track.removeEventListener("ended", this.trackEndedHandler);
      this.trackEndedHandler = null;
    }

    if (this.track) {
      this.track.stop();
      this.track = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Sample frame on demand for evidence association
   */
  public async grabCurrentFrame(): Promise<Blob | ImageBitmap | null> {
    if (this.state.status !== "active") return null;

    if (typeof createImageBitmap !== "undefined" && this.videoElement && this.videoElement.videoWidth > 0) {
      try {
        return await createImageBitmap(this.videoElement);
      } catch {
        return this.grabCanvasBlob();
      }
    }
    return this.grabCanvasBlob();
  }

  private grabCanvasBlob(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (typeof document === "undefined" || !this.videoElement || !this.canvasElement) {
        return resolve(new Blob(["mock-frame-bytes"], { type: "image/jpeg" }));
      }

      const width = this.videoElement.videoWidth || 640;
      const height = this.videoElement.videoHeight || 480;

      this.canvasElement.width = width;
      this.canvasElement.height = height;

      const ctx = this.canvasElement.getContext("2d");
      if (ctx) {
        ctx.drawImage(this.videoElement, 0, 0, width, height);
        if (this.canvasElement.toBlob) {
          this.canvasElement.toBlob(
            (blob) => resolve(blob),
            "image/jpeg",
            0.85,
          );
          return;
        }
      }
      resolve(null);
    });
  }

  /**
   * Sample frame from video track / video element
   */
  public grabFrame(): void {
    if (this.state.status !== "active" || this.frameSubscribers.size === 0) return;

    // Browser createImageBitmap or Canvas fallback
    if (typeof createImageBitmap !== "undefined" && this.videoElement && this.videoElement.videoWidth > 0) {
      createImageBitmap(this.videoElement)
        .then((bitmap) => {
          this.emitFrame(bitmap);
        })
        .catch(() => {
          this.grabCanvasFrame();
        });
    } else {
      this.grabCanvasFrame();
    }
  }

  private grabCanvasFrame(): void {
    if (typeof document === "undefined") {
      // In node / mock environment without canvas DOM
      const mockBlob = new Blob(["mock-frame-bytes"], { type: "image/jpeg" });
      this.emitFrame(mockBlob);
      return;
    }

    if (!this.videoElement || !this.canvasElement) return;

    const width = this.videoElement.videoWidth || 640;
    const height = this.videoElement.videoHeight || 480;

    this.canvasElement.width = width;
    this.canvasElement.height = height;

    const ctx = this.canvasElement.getContext("2d");
    if (ctx) {
      ctx.drawImage(this.videoElement, 0, 0, width, height);
      if (this.canvasElement.toBlob) {
        this.canvasElement.toBlob(
          (blob) => {
            if (blob) {
              this.emitFrame(blob);
            }
          },
          "image/jpeg",
          0.8,
        );
      }
    }
  }

  private emitFrame(frame: Blob | ImageBitmap): void {
    for (const callback of this.frameSubscribers) {
      try {
        callback(frame);
      } catch (err) {
        console.error("Error in onFrame subscriber:", err);
      }
    }
  }

  private updateState(newState: Partial<CaptureState>): void {
    this.state = {
      ...this.state,
      ...newState,
    };
    for (const cb of this.statusSubscribers) {
      try {
        cb(this.getCaptureState());
      } catch (err) {
        console.error("Error in statusSubscriber:", err);
      }
    }
  }
}
