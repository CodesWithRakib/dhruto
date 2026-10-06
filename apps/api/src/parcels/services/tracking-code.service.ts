import { Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";

/** Excludes I, O, 0, 1 to avoid ambiguity when read from a printed label. */
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const RANDOM_LENGTH = 6;

/**
 * Generates human-readable parcel tracking codes in the form
 * `DHR-YYYYMMDD-XXXXXX` (Crockford-style alphabet).
 *
 * Uniqueness is *enforced by the database* (`parcels.tracking_code` is UNIQUE).
 * This service only proposes candidates; the caller retries on a unique
 * violation, so a rare collision can never duplicate a tracking code.
 */
@Injectable()
export class TrackingCodeService {
  /** Maximum insertion attempts before concluding the generator is broken. */
  static readonly MAX_ATTEMPTS = 5;

  generate(now: Date = new Date()): string {
    const datePart = now.toISOString().slice(0, 10).replace(/-/g, "");

    let randomPart = "";
    for (let i = 0; i < RANDOM_LENGTH; i += 1) {
      randomPart += ALPHABET[randomInt(0, ALPHABET.length)];
    }

    return `DHR-${datePart}-${randomPart}`;
  }

  /**
   * Builds a short, stable, human-scale candidate list for logging when all
   * attempts collide (practically impossible, but never silently ignored).
   */
  describeExhausted(attempts: number): string {
    return `Tracking code generation exhausted after ${attempts} attempts due to unique-constraint collisions`;
  }
}
