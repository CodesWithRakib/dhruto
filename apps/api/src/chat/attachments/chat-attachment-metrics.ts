import { Injectable } from "@nestjs/common";

export type ChatAttachmentCounter =
  | "reserved"
  | "completed"
  | "rejected"
  | "cancelled"
  | "downloadAuthorized"
  | "downloadDenied"
  | "storageErrors"
  | "cleanupDeleted"
  | "cleanupOrphansDeleted"
  | "cleanupRuns"
  // Phase 7 malware scan + retention
  | "scanClean"
  | "scanInfected"
  | "scanErrors"
  | "scanFailed"
  | "scanRuns"
  | "downloadScanPending"
  | "downloadBlocked"
  | "retentionPurged";

/**
 * Per-instance attachment counters (same model as the Phase 3 realtime
 * metrics): cheap, in-memory, reset on restart; logged with each cleanup run
 * and readable by operations tooling. Never carries ids, URLs or file data.
 */
@Injectable()
export class ChatAttachmentMetrics {
  private readonly counters = new Map<ChatAttachmentCounter, number>();
  private readonly rejectedByReason = new Map<string, number>();

  increment(counter: ChatAttachmentCounter, by = 1): void {
    this.counters.set(counter, (this.counters.get(counter) ?? 0) + by);
  }

  rejected(reason: string): void {
    this.increment("rejected");
    this.rejectedByReason.set(reason, (this.rejectedByReason.get(reason) ?? 0) + 1);
  }

  snapshot(): { counters: Record<string, number>; rejectedByReason: Record<string, number> } {
    return {
      counters: Object.fromEntries(this.counters),
      rejectedByReason: Object.fromEntries(this.rejectedByReason),
    };
  }
}
