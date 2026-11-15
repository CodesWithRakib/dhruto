/**
 * In-memory token bucket used per socket to bound inbound event rates. Pure
 * and clock-injectable for tests. Per-socket state only — it protects the
 * process from one connection's flood without any shared I/O.
 */
export class TokenBucket {
  private tokens: number;
  private updatedAt: number;

  constructor(
    private readonly capacity: number,
    private readonly refillPerSecond: number,
    private readonly now: () => number = Date.now,
  ) {
    this.tokens = capacity;
    this.updatedAt = this.now();
  }

  /** Consumes one token; false when the bucket is empty (event must be dropped). */
  tryRemove(cost = 1): boolean {
    this.refill();
    if (this.tokens < cost) return false;
    this.tokens -= cost;
    return true;
  }

  private refill(): void {
    const now = this.now();
    const elapsedSeconds = Math.max(0, now - this.updatedAt) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsedSeconds * this.refillPerSecond);
    this.updatedAt = now;
  }
}
