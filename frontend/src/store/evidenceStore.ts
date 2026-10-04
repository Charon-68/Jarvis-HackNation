/**
 * Frontend Evidence Store (Part 5)
 * Provider-neutral evidence storage for captured screen frames.
 * Keyed by screenshotRef / ticketId.
 * Revokes object URLs on cleanup to prevent memory leaks.
 */

class EvidenceStore {
  private evidenceMap = new Map<string, Blob | ImageBitmap | string>();
  private objectUrlMap = new Map<string, string>();
  private ticketRefMap = new Map<string, string>();

  /**
   * Store an actual evidence frame (Blob or ImageBitmap) associated with a screenshotRef
   */
  public saveEvidence(ref: string, frame: Blob | ImageBitmap | string, ticketId?: string): void {
    if (!ref) return;
    this.evidenceMap.set(ref, frame);

    if (ticketId) {
      this.ticketRefMap.set(ticketId, ref);
    }
  }

  /**
   * Link a ticketId to a specific screenshotRef
   */
  public linkTicketToRef(ticketId: string, ref: string): void {
    this.ticketRefMap.set(ticketId, ref);
  }

  /**
   * Retrieve Object URL for a given screenshotRef or ticketId
   */
  public getEvidenceUrl(ref?: string, ticketId?: string): string | null {
    let targetRef = ref;
    if (!targetRef && ticketId) {
      targetRef = this.ticketRefMap.get(ticketId);
    }

    if (targetRef && this.objectUrlMap.has(targetRef)) {
      return this.objectUrlMap.get(targetRef)!;
    }

    let data: Blob | ImageBitmap | string | undefined;
    if (targetRef) {
      data = this.evidenceMap.get(targetRef);
    }
    if (!data && ticketId) {
      const linkedRef = this.ticketRefMap.get(ticketId);
      if (linkedRef) {
        data = this.evidenceMap.get(linkedRef);
        targetRef = linkedRef;
      }
    }

    if (!data || !targetRef) return null;

    if (typeof data === "string") {
      return data;
    }

    if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
      if (data instanceof Blob) {
        const url = URL.createObjectURL(data);
        this.objectUrlMap.set(targetRef, url);
        return url;
      }

      if (typeof ImageBitmap !== "undefined" && data instanceof ImageBitmap) {
        if (typeof document !== "undefined") {
          const canvas = document.createElement("canvas");
          canvas.width = data.width;
          canvas.height = data.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(data, 0, 0);
            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
            this.objectUrlMap.set(targetRef, dataUrl);
            return dataUrl;
          }
        }
      }
    }

    return null;
  }

  /**
   * Clear all stored evidence and revoke object URLs to prevent memory leaks
   */
  public clear(): void {
    if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") {
      for (const url of this.objectUrlMap.values()) {
        if (url.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(url);
          } catch {
            // ignore
          }
        }
      }
    }
    this.evidenceMap.clear();
    this.objectUrlMap.clear();
    this.ticketRefMap.clear();
  }
}

export const evidenceStore = new EvidenceStore();
