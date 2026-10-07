import { Logger } from "@nestjs/common";
import {
  PROVIDER_ERROR_CODES,
  ProviderErrorKind,
  type ProviderErrorCode,
} from "@dhruto/contracts";

/**
 * Provider abstractions — Phase 5 integration boundary.
 * ------------------------------------------------------------------
 * Business services depend on these interfaces, never on a concrete
 * gateway. Two transports ship per channel:
 * - `log` (default): records delivery metadata without network I/O and is
 *   explicit about it. Used in development/test and when no provider is
 *   configured. Message bodies are NEVER logged.
 * - `http` (configured via env): performs a real provider POST with a
 *   strict timeout and classifies the outcome.
 */

export interface SendResult {
  success: boolean;
  provider: string;
  providerMessageId: string | null;
  latencyMs: number;
  errorCode?: ProviderErrorCode;
  errorMessage?: string;
  errorKind?: ProviderErrorKind;
  statusCode?: number;
}

export interface SmsProvider {
  readonly name: string;
  normalizePhoneNumber(phone: string): string;
  sendSms(to: string, message: string): Promise<SendResult>;
}

export interface EmailProvider {
  readonly name: string;
  sendEmail(to: string, subject: string, bodyText: string, htmlBody?: string): Promise<SendResult>;
}

export function classifyHttpStatus(status: number): {
  kind: ProviderErrorKind;
  code: ProviderErrorCode;
} {
  if (status >= 200 && status < 300) {
    return { kind: ProviderErrorKind.TRANSIENT, code: PROVIDER_ERROR_CODES.UNKNOWN_PROVIDER_ERROR };
  }
  if (status === 408 || status === 425 || status === 429) {
    return {
      kind: ProviderErrorKind.TRANSIENT,
      code: status === 429 ? PROVIDER_ERROR_CODES.RATE_LIMITED : PROVIDER_ERROR_CODES.PROVIDER_TIMEOUT,
    };
  }
  if (status >= 500) {
    return { kind: ProviderErrorKind.TRANSIENT, code: PROVIDER_ERROR_CODES.WEBHOOK_5XX };
  }
  if (status === 400 || status === 404 || status === 410 || status === 422) {
    return { kind: ProviderErrorKind.PERMANENT, code: PROVIDER_ERROR_CODES.INVALID_RECIPIENT };
  }
  if (status === 401 || status === 403) {
    return { kind: ProviderErrorKind.PERMANENT, code: PROVIDER_ERROR_CODES.AUTHENTICATION_FAILED };
  }
  return { kind: ProviderErrorKind.PERMANENT, code: PROVIDER_ERROR_CODES.WEBHOOK_4XX };
}

export function classifyNetworkError(error: unknown): {
  kind: ProviderErrorKind;
  code: ProviderErrorCode;
  message: string;
} {
  const message = error instanceof Error ? error.message : "Unknown network error";
  if (/timeout|timed out|abort/i.test(message)) {
    return { kind: ProviderErrorKind.TRANSIENT, code: PROVIDER_ERROR_CODES.PROVIDER_TIMEOUT, message };
  }
  return { kind: ProviderErrorKind.TRANSIENT, code: PROVIDER_ERROR_CODES.NETWORK_ERROR, message };
}

function messageId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Development transport: persists delivery metadata, performs no network I/O. */
export class LogSmsProvider implements SmsProvider {
  readonly name = "log";
  private readonly logger = new Logger(LogSmsProvider.name);

  normalizePhoneNumber(phone: string): string {
    const cleaned = phone.replace(/[^\d+]/g, "");
    if (cleaned.startsWith("+880")) return cleaned;
    if (cleaned.startsWith("880")) return `+${cleaned}`;
    if (cleaned.startsWith("01")) return `+88${cleaned}`;
    return cleaned;
  }

  async sendSms(to: string, message: string): Promise<SendResult> {
    const started = Date.now();
    const normalized = this.normalizePhoneNumber(to);
    const providerMessageId = messageId("sms");
    // Bodies are never logged: OTPs and customer text stay out of logs.
    this.logger.log(
      `LOG_SMS to=${normalized} id=${providerMessageId} chars=${message.length} parts=${Math.ceil(message.length / 160) || 1}`,
    );
    return {
      success: true,
      provider: this.name,
      providerMessageId,
      latencyMs: Date.now() - started,
    };
  }
}

/** HTTP SMS gateway used when SMS_PROVIDER_URL (+SMS_PROVIDER_KEY) is set. */
export class HttpSmsProvider implements SmsProvider {
  readonly name = "http";
  private readonly logger = new Logger(HttpSmsProvider.name);

  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly timeoutMs = 8000,
  ) {}

  normalizePhoneNumber(phone: string): string {
    return new LogSmsProvider().normalizePhoneNumber(phone);
  }

  async sendSms(to: string, message: string): Promise<SendResult> {
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ to: this.normalizePhoneNumber(to), message }),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - started;
      if (response.ok) {
        return { success: true, provider: this.name, providerMessageId: messageId("sms"), latencyMs, statusCode: response.status };
      }
      const mapped = classifyHttpStatus(response.status);
      return {
        success: false,
        provider: this.name,
        providerMessageId: null,
        latencyMs,
        statusCode: response.status,
        errorCode: mapped.code,
        errorKind: mapped.kind,
        errorMessage: `SMS provider rejected the request (HTTP ${response.status})`,
      };
    } catch (error) {
      const mapped = classifyNetworkError(error);
      this.logger.warn(`SMS provider call failed: ${mapped.message}`);
      return {
        success: false,
        provider: this.name,
        providerMessageId: null,
        latencyMs: Date.now() - started,
        errorCode: mapped.code,
        errorKind: mapped.kind,
        errorMessage: mapped.message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

/** Development transport for email. */
export class LogEmailProvider implements EmailProvider {
  readonly name = "log";
  private readonly logger = new Logger(LogEmailProvider.name);

  async sendEmail(to: string, subject: string, bodyText: string): Promise<SendResult> {
    const started = Date.now();
    const providerMessageId = messageId("email");
    this.logger.log(`LOG_EMAIL to=${to} id=${providerMessageId} subject_len=${subject.length} body_len=${bodyText.length}`);
    return { success: true, provider: this.name, providerMessageId, latencyMs: Date.now() - started };
  }
}

/** HTTP email API used when EMAIL_PROVIDER_URL (+EMAIL_PROVIDER_KEY) is set. */
export class HttpEmailProvider implements EmailProvider {
  readonly name = "http";
  private readonly logger = new Logger(HttpEmailProvider.name);

  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly timeoutMs = 8000,
  ) {}

  async sendEmail(to: string, subject: string, bodyText: string, htmlBody?: string): Promise<SendResult> {
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await fetch(this.endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ to, subject, text: bodyText, html: htmlBody ?? undefined }),
        signal: controller.signal,
      });
      const latencyMs = Date.now() - started;
      if (response.ok) {
        return { success: true, provider: this.name, providerMessageId: messageId("email"), latencyMs, statusCode: response.status };
      }
      const mapped = classifyHttpStatus(response.status);
      return {
        success: false,
        provider: this.name,
        providerMessageId: null,
        latencyMs,
        statusCode: response.status,
        errorCode: mapped.code,
        errorKind: mapped.kind,
        errorMessage: `Email provider rejected the request (HTTP ${response.status})`,
      };
    } catch (error) {
      const mapped = classifyNetworkError(error);
      this.logger.warn(`Email provider call failed: ${mapped.message}`);
      return {
        success: false,
        provider: this.name,
        providerMessageId: null,
        latencyMs: Date.now() - started,
        errorCode: mapped.code,
        errorKind: mapped.kind,
        errorMessage: mapped.message,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function createSmsProvider(): SmsProvider {
  const endpoint = process.env.SMS_PROVIDER_URL?.trim();
  const apiKey = process.env.SMS_PROVIDER_KEY?.trim();
  if (endpoint && apiKey) {
    return new HttpSmsProvider(endpoint, apiKey);
  }
  return new LogSmsProvider();
}

export function createEmailProvider(): EmailProvider {
  const endpoint = process.env.EMAIL_PROVIDER_URL?.trim();
  const apiKey = process.env.EMAIL_PROVIDER_KEY?.trim();
  if (endpoint && apiKey) {
    return new HttpEmailProvider(endpoint, apiKey);
  }
  return new LogEmailProvider();
}
