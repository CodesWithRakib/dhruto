import { connect, type Socket } from "node:net";
import { type ChatMalwareScanner, type MalwareScanVerdict } from "./malware-scanner.port.js";

export interface ClamAvConfig {
  host: string;
  port: number;
  /** Whole-scan deadline (connect + stream + verdict). */
  timeoutMs: number;
}

/** clamd INSTREAM chunk size (must stay below clamd's StreamMaxLength per chunk). */
const CHUNK_BYTES = 64 * 1024;
const MAX_RESPONSE_BYTES = 4096;
const THREAT_MAX_LENGTH = 200;

/**
 * ClamAV adapter using clamd's documented `zINSTREAM` command over TCP:
 * the stream is sent as `<uint32 BE length><bytes>` chunks terminated by a
 * zero-length chunk; clamd answers `stream: OK`, `stream: <name> FOUND` or
 * `... ERROR`. No dependency beyond `node:net`.
 *
 * Fail closed: any connection error, timeout, size-limit response or
 * unparseable answer is an `error` verdict (retried, then FAILED = blocked),
 * never `clean`.
 */
export class ClamAvScanner implements ChatMalwareScanner {
  readonly engine = "clamav";

  constructor(private readonly config: ClamAvConfig) {}

  async scan(body: AsyncIterable<Uint8Array>): Promise<MalwareScanVerdict> {
    let socket: Socket | null = null;
    let timer: NodeJS.Timeout | null = null;
    try {
      socket = await this.open();
      const response = this.readResponse(socket);
      // If streaming fails first, `response` may reject unobserved; it is
      // still awaited below on the success path.
      response.catch(() => undefined);
      const deadline = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), this.config.timeoutMs);
        timer.unref?.();
      });
      deadline.catch(() => undefined);
      await Promise.race([this.stream(socket, body), deadline]);
      const text = await Promise.race([response, deadline]);
      return parseClamdResponse(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      return { result: "error", code: message === "timeout" ? "timeout" : "unavailable" };
    } finally {
      if (timer) clearTimeout(timer);
      socket?.destroy();
    }
  }

  private open(): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = connect({ host: this.config.host, port: this.config.port });
      socket.setTimeout(this.config.timeoutMs, () => socket.destroy(new Error("timeout")));
      socket.once("connect", () => resolve(socket));
      socket.once("error", reject);
    });
  }

  private async stream(socket: Socket, body: AsyncIterable<Uint8Array>): Promise<void> {
    await write(socket, Buffer.from("zINSTREAM\0", "ascii"));
    for await (const chunk of body) {
      for (let offset = 0; offset < chunk.byteLength; offset += CHUNK_BYTES) {
        const part = chunk.subarray(offset, Math.min(offset + CHUNK_BYTES, chunk.byteLength));
        const header = Buffer.alloc(4);
        header.writeUInt32BE(part.byteLength, 0);
        await write(socket, header);
        await write(socket, part);
      }
    }
    await write(socket, Buffer.alloc(4)); // zero-length terminator
  }

  private readResponse(socket: Socket): Promise<string> {
    return new Promise((resolve, reject) => {
      const parts: Buffer[] = [];
      let size = 0;
      const finish = () => resolve(Buffer.concat(parts).toString("utf8"));
      socket.on("data", (data: Buffer) => {
        parts.push(data);
        size += data.byteLength;
        if (size > MAX_RESPONSE_BYTES) socket.destroy(new Error("response too large"));
        // clamd terminates `z`-prefixed replies with NUL.
        if (data.includes(0)) finish();
      });
      socket.once("end", finish);
      socket.once("error", reject);
    });
  }
}

function write(socket: Socket, data: Uint8Array): Promise<void> {
  return new Promise((resolve, reject) => {
    socket.write(data, (error) => (error ? reject(error) : resolve()));
  });
}

/** Parses one clamd INSTREAM reply. Exported for unit tests. */
export function parseClamdResponse(raw: string): MalwareScanVerdict {
  const text = raw.replace(/\0/g, "").trim();
  if (/^stream: OK$/.test(text)) return { result: "clean" };
  const found = /^stream: (.+) FOUND$/.exec(text);
  if (found?.[1]) {
    return { result: "infected", threat: found[1].slice(0, THREAT_MAX_LENGTH) };
  }
  if (/size limit exceeded/i.test(text)) return { result: "error", code: "size_limit" };
  return { result: "error", code: "protocol" };
}

export function loadClamAvConfig(): ClamAvConfig | null {
  const host = process.env.CHAT_CLAMAV_HOST?.trim();
  if (!host) return null;
  const port = Number(process.env.CHAT_CLAMAV_PORT ?? "3310");
  const timeoutMs = Number(process.env.CHAT_CLAMAV_TIMEOUT_MS ?? "30000");
  return {
    host,
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 3310,
    timeoutMs: Number.isInteger(timeoutMs) && timeoutMs >= 1000 ? timeoutMs : 30_000,
  };
}
