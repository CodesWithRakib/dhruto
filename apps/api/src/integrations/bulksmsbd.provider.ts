import { Logger } from "@nestjs/common";
import {
  PROVIDER_ERROR_CODES,
  ProviderErrorKind,
  type ProviderErrorCode,
} from "@dhruto/contracts";
import type { SendResult, SmsProvider } from "./providers.js";

export interface BulkSmsBdConfig {
  apiKey?: string;
  senderId?: string;
  endpoint?: string;
  enabled?: boolean;
  timeoutMs?: number;
  devTrapNumbers?: string[];
  devSafeMode?: boolean;
}

/**
 * BulkSMSBD Official SMS Provider Adapter.
 * -------------------------------------------------------------
 * Designed for Bangladesh telecom carriers (Grameenphone, Banglalink, Robi, Teletalk).
 * Supports both masking (alphanumeric SenderID) and non-masking numbers.
 *
 * Current Mode:
 * - Sandbox/Mock by default (process.env.SMS_ENABLED !== "true") so tests/dev
 *   do not consume balance or fail without live credentials.
 * - Production-Ready: instantly sends real SMS as soon as
 *   BULKSMSBD_API_KEY + SMS_ENABLED=true are set.
 * - Dev Safe Trap Safeguard: In development, intercepts any SMS destined for
 *   dummy or fake numbers and diverts strictly to authorized personal numbers
 *   (8801767476724, 8801952879249) to ensure zero wasted balance.
 */
export class BulkSmsBdProvider implements SmsProvider {
  readonly name = "bulksmsbd";
  private readonly logger = new Logger(BulkSmsBdProvider.name);
  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly enabled: boolean;
  private readonly timeoutMs: number;
  private readonly devTrapNumbers: string[];
  private readonly devSafeMode: boolean;
  private roundRobinIdx = 0;

  constructor(config: Partial<BulkSmsBdConfig> = {}) {
    this.apiKey = config.apiKey || process.env.BULKSMSBD_API_KEY || "";
    this.senderId = config.senderId || process.env.BULKSMSBD_SENDER_ID || "Dhruto";
    this.endpoint = config.endpoint || process.env.BULKSMSBD_URL || "https://bulksmsbd.net/api/smsapi";
    this.enabled = config.enabled ?? (process.env.SMS_ENABLED === "true");
    this.timeoutMs = config.timeoutMs ?? 8000;

    const rawTrap = config.devTrapNumbers
      ? config.devTrapNumbers.join(",")
      : (process.env.SMS_DEV_TRAP_NUMBERS || "8801767476724,8801952879249");

    this.devTrapNumbers = rawTrap
      .split(",")
      .map((n) => this.normalizePhoneNumber(n.trim()))
      .filter(Boolean);

    this.devSafeMode =
      config.devSafeMode ??
      (process.env.NODE_ENV !== "production" || process.env.SMS_DEV_SAFE_MODE === "true");
  }

  /**
   * Normalizes Bangladesh phone number to 8801XXXXXXXXX format expected by BulkSMSBD.
   */
  normalizePhoneNumber(phone: string): string {
    const digits = phone.replace(/[^\d]/g, "");
    if (digits.startsWith("8801") && digits.length === 13) {
      return digits;
    }
    if (digits.startsWith("01") && digits.length === 11) {
      return `88${digits}`;
    }
    if (digits.startsWith("1") && digits.length === 10) {
      return `880${digits}`;
    }
    return digits;
  }

  async sendSms(to: string, message: string): Promise<SendResult> {
    const started = Date.now();
    const originalNormalizedTo = this.normalizePhoneNumber(to);
    let finalRecipient = originalNormalizedTo;
    let finalMessage = message;

    // Dev Safe Trap: Protect balance from fake or dummy numbers during development/testing
    if (this.devSafeMode && this.devTrapNumbers.length > 0) {
      const isWhitelisted = this.devTrapNumbers.includes(originalNormalizedTo);
      if (!isWhitelisted) {
        // Divert to safe personal numbers (alternates if multiple, or primary)
        const assignedTrap = this.devTrapNumbers[this.roundRobinIdx % this.devTrapNumbers.length];
        this.roundRobinIdx++;
        finalRecipient = assignedTrap || this.devTrapNumbers[0] || originalNormalizedTo;
        finalMessage = `[DEV Trap: Org ${originalNormalizedTo}] ${message}`;
        this.logger.warn(
          `[BulkSMSBD DEV SAFE TRAP] Intercepted SMS to dummy/fake ${originalNormalizedTo} -> safely diverted to ${finalRecipient}`,
        );
      }
    }

    // Sandbox / Simulation Mode (when SMS_ENABLED !== 'true')
    if (!this.enabled) {
      const mockId = `bsmsbd_sbx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      this.logger.log(
        `[BulkSMSBD SANDBOX READY] to=${finalRecipient} (orig=${originalNormalizedTo}) senderId=${this.senderId} parts=${Math.ceil(finalMessage.length / 160) || 1} chars=${finalMessage.length} id=${mockId}`,
      );
      return {
        success: true,
        provider: this.name,
        providerMessageId: mockId,
        latencyMs: Date.now() - started,
      };
    }

    // Production / Live Mode: Live BulkSMSBD HTTP Call
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        type: "text",
        number: finalRecipient,
        senderid: this.senderId,
        message: finalMessage,
      });

      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: params.toString(),
        signal: controller.signal,
      });

      const latencyMs = Date.now() - started;
      const rawText = await response.text();

      let json: { response_code?: number; message_id?: number | string; success_message?: string; error_message?: string } = {};
      try {
        json = JSON.parse(rawText);
      } catch {
        // Fallback for non-JSON responses
      }

      // BulkSMSBD returns response_code 202 on success
      if (response.ok && json.response_code === 202) {
        return {
          success: true,
          provider: this.name,
          providerMessageId: json.message_id ? String(json.message_id) : `bsmsbd_${Date.now()}`,
          latencyMs,
          statusCode: response.status,
        };
      }

      // Map BulkSMSBD error codes
      // 1002: Sender Id Not Found | 1007: Balance Insufficient | 1003: Invalid API Key
      const errorMessage = json.error_message || `BulkSMSBD error (code ${json.response_code || response.status})`;
      let errorCode: ProviderErrorCode = PROVIDER_ERROR_CODES.UNKNOWN_PROVIDER_ERROR;
      let errorKind = ProviderErrorKind.TRANSIENT;

      if (json.response_code === 1007) {
        errorCode = PROVIDER_ERROR_CODES.RATE_LIMITED;
        errorKind = ProviderErrorKind.TRANSIENT;
      } else if (json.response_code === 1002 || json.response_code === 1003) {
        errorCode = PROVIDER_ERROR_CODES.AUTHENTICATION_FAILED;
        errorKind = ProviderErrorKind.PERMANENT;
      } else if (json.response_code === 1005 || json.response_code === 1006) {
        errorCode = PROVIDER_ERROR_CODES.INVALID_RECIPIENT;
        errorKind = ProviderErrorKind.PERMANENT;
      }

      this.logger.warn(`BulkSMSBD rejected SMS to ${finalRecipient}: ${errorMessage}`);

      return {
        success: false,
        provider: this.name,
        providerMessageId: null,
        latencyMs,
        statusCode: response.status,
        errorCode,
        errorKind,
        errorMessage,
      };
    } catch (error) {
      const isAbort = error instanceof Error && error.name === "AbortError";
      const message = isAbort ? "BulkSMSBD API request timed out" : (error instanceof Error ? error.message : "Network error");
      this.logger.error(`BulkSMSBD network error: ${message}`);

      return {
        success: false,
        provider: this.name,
        providerMessageId: null,
        latencyMs: Date.now() - started,
        errorCode: isAbort ? PROVIDER_ERROR_CODES.PROVIDER_TIMEOUT : PROVIDER_ERROR_CODES.NETWORK_ERROR,
        errorKind: ProviderErrorKind.TRANSIENT,
        errorMessage: message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}
