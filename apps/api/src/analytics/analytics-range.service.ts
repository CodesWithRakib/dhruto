import { Injectable, BadRequestException } from "@nestjs/common";
import {
  ANALYTICS_MAX_RANGE_DAYS,
  ANALYTICS_TIMEZONE,
  ApiErrorCode,
  type AnalyticsPreset,
  type ResolvedRange,
} from "@dhruto/contracts";

export interface RangeInput {
  preset?: AnalyticsPreset;
  from?: string;
  to?: string;
  timezone?: string;
}

const DAY_MS = 24 * 3600 * 1000;

/**
 * Centralized date-range resolution for all analytics.
 *
 * - One business timezone (Asia/Dhaka) unless explicitly overridden.
 * - `custom` requires from+to; max 366 days.
 * - Every range yields an equal-length previous period for correct deltas
 *   (30d vs previous 30d — never vs an arbitrary calendar month).
 * - Bucketing uses Dhaka calendar days via SQL `TIME ZONE` conversion.
 */
@Injectable()
export class AnalyticsRangeService {
  resolve(input: RangeInput, now: Date = new Date()): ResolvedRange {
    const timezone = input.timezone?.trim() || ANALYTICS_TIMEZONE;
    const preset = input.preset ?? "30d";
    let from: Date;
    let to: Date;

    if (preset === "custom") {
      if (!input.from || !input.to) {
        throw new BadRequestException({
          message: "Custom range requires from and to",
          error: ApiErrorCode.INVALID_DATE_RANGE,
        });
      }
      from = new Date(input.from);
      to = new Date(input.to);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
        throw new BadRequestException({
          message: "Invalid custom date range",
          error: ApiErrorCode.INVALID_DATE_RANGE,
        });
      }
    } else {
      const endOfTodayDhaka = this.endOfDayDhaka(now);
      switch (preset) {
        case "today":
          to = endOfTodayDhaka;
          from = new Date(to.getTime() - DAY_MS + 1);
          break;
        case "yesterday":
          to = new Date(endOfTodayDhaka.getTime() - DAY_MS);
          from = new Date(to.getTime() - DAY_MS + 1);
          break;
        case "7d":
          to = endOfTodayDhaka;
          from = new Date(to.getTime() - 7 * DAY_MS + 1);
          break;
        case "90d":
          to = endOfTodayDhaka;
          from = new Date(to.getTime() - 90 * DAY_MS + 1);
          break;
        case "month": {
          const dhaka = this.toDhakaParts(now);
          from = new Date(Date.UTC(dhaka.year, dhaka.month - 1, 1, 0, 0, 0) - 6 * 3600 * 1000);
          to = endOfTodayDhaka;
          break;
        }
        case "last-month": {
          const dhaka = this.toDhakaParts(now);
          const firstThis = new Date(Date.UTC(dhaka.year, dhaka.month - 1, 1) - 6 * 3600 * 1000);
          const firstPrev = new Date(
            Date.UTC(
              dhaka.month === 1 ? dhaka.year - 1 : dhaka.year,
              dhaka.month === 1 ? 11 : dhaka.month - 2,
              1,
            ) -
              6 * 3600 * 1000,
          );
          from = firstPrev;
          to = new Date(firstThis.getTime() - 1);
          break;
        }
        case "30d":
        default:
          to = endOfTodayDhaka;
          from = new Date(to.getTime() - 30 * DAY_MS + 1);
          break;
      }
    }

    const days = (to.getTime() - from.getTime()) / DAY_MS;
    if (days > ANALYTICS_MAX_RANGE_DAYS) {
      throw new BadRequestException({
        message: `Range exceeds the ${ANALYTICS_MAX_RANGE_DAYS}-day maximum`,
        error: ApiErrorCode.INVALID_DATE_RANGE,
      });
    }
    const durationMs = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime() - 1);
    const previousFrom = new Date(previousTo.getTime() - durationMs);

    const granularity = days <= 2 ? "hour" : days <= 62 ? "day" : days <= 200 ? "week" : "month";

    return {
      from: from.toISOString(),
      to: to.toISOString(),
      previousFrom: previousFrom.toISOString(),
      previousTo: previousTo.toISOString(),
      timezone,
      granularity,
    };
  }

  /** Dhaka day-bucket SQL fragment for a timestamptz column. */
  bucketSql(column: string, granularity: ResolvedRange["granularity"]): string {
    const dhaka = `(${column} AT TIME ZONE 'Asia/Dhaka')`;
    switch (granularity) {
      case "hour":
        return `date_trunc('hour', ${dhaka})`;
      case "week":
        return `date_trunc('week', ${dhaka})`;
      case "month":
        return `date_trunc('month', ${dhaka})`;
      case "day":
      default:
        return `date_trunc('day', ${dhaka})`;
    }
  }

  private toDhakaParts(date: Date): { year: number; month: number; day: number } {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const [year, month, day] = fmt.format(date).split("-").map(Number);
    return { year: year ?? 1970, month: month ?? 1, day: day ?? 1 };
  }

  private endOfDayDhaka(now: Date): Date {
    const { year, month, day } = this.toDhakaParts(now);
    // 23:59:59.999 Dhaka == 17:59:59.999Z (UTC+6, no DST).
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - 6 * 3600 * 1000);
  }
}
