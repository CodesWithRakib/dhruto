import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { type RequestTelemetry } from "@dhruto/contracts";

@Injectable()
export class TelemetryService {
  private totalRequests = 0;
  private totalErrors = 0;
  private readonly rollingLatencies: number[] = [];
  private readonly maxRollingSamples = 1000;

  // RPS tracking
  private currentSecond = Math.floor(Date.now() / 1000);
  private requestsInCurrentSecond = 0;
  private lastReportedRps = 0;

  recordRequest(durationMs: number, isError: boolean) {
    this.totalRequests++;
    if (isError) this.totalErrors++;

    // Rolling latency buffer
    if (this.rollingLatencies.length >= this.maxRollingSamples) {
      this.rollingLatencies.shift();
    }
    this.rollingLatencies.push(durationMs);

    // RPS window
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec === this.currentSecond) {
      this.requestsInCurrentSecond++;
    } else {
      this.lastReportedRps = this.requestsInCurrentSecond;
      this.currentSecond = nowSec;
      this.requestsInCurrentSecond = 1;
    }
  }

  getTelemetry(): RequestTelemetry {
    const errorRate =
      this.totalRequests > 0
        ? Number(((this.totalErrors / this.totalRequests) * 100).toFixed(2))
        : 0;

    let p50 = 2;
    let p95 = 5;
    let p99 = 12;

    if (this.rollingLatencies.length > 0) {
      const sorted = [...this.rollingLatencies].sort((a, b) => a - b);
      const len = sorted.length;
      p50 = Number((sorted[Math.floor(len * 0.5)] ?? 2).toFixed(1));
      p95 = Number((sorted[Math.floor(len * 0.95)] ?? 5).toFixed(1));
      p99 = Number((sorted[Math.floor(len * 0.99)] ?? 12).toFixed(1));
    }

    return {
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorRate,
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      p99LatencyMs: p99,
      currentRps: this.lastReportedRps,
    };
  }
}

@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  constructor(private readonly telemetryService: TelemetryService) {}

  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = performance.now();
    let isError = false;

    return next.handle().pipe(
      tap({
        error: () => {
          isError = true;
          const duration = performance.now() - start;
          this.telemetryService.recordRequest(duration, true);
        },
        complete: () => {
          if (!isError) {
            const duration = performance.now() - start;
            this.telemetryService.recordRequest(duration, false);
          }
        },
      }),
    );
  }
}
