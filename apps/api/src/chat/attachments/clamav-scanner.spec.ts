import { createServer, type Server, type Socket } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { ClamAvScanner, parseClamdResponse, parseClamdVersion } from "./clamav-scanner.js";

/** Minimal clamd answering PING/VERSION (Phase 8 probe tests). */
function versionServer(reply: { ping: string; version: string }): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer((socket) => {
      socket.on("error", () => undefined);
      socket.on("data", (data: Buffer) => {
        const cmd = data.toString("ascii").replace(/\0/g, "");
        socket.end(cmd === "zPING" ? reply.ping : cmd === "zVERSION" ? reply.version : "UNKNOWN\0");
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: typeof address === "object" && address ? address.port : 0 });
    });
  });
}

describe("ClamAvScanner.probe (Phase 8)", () => {
  it("reports engine, signature version and signature build time", async () => {
    const { server, port } = await versionServer({
      ping: "PONG\0",
      version: "ClamAV 1.4.6/28184/Sun Nov 15 06:27:28 2026\0",
    });
    const probe = await new ClamAvScanner({ host: "127.0.0.1", port, timeoutMs: 5000 }).probe();
    server.close();
    expect(probe).toEqual({
      reachable: true,
      engineVersion: "ClamAV 1.4.6",
      signatureVersion: 28184,
      signatureDate: new Date(Date.UTC(2026, 10, 15, 6, 27, 28)),
    });
  });

  it("is unreachable when clamd does not answer PONG or is down", async () => {
    const wrong = await versionServer({ ping: "NOPE\0", version: "" });
    expect((await new ClamAvScanner({ host: "127.0.0.1", port: wrong.port, timeoutMs: 5000 }).probe()).reachable).toBe(false);
    wrong.server.close();
    expect((await new ClamAvScanner({ host: "127.0.0.1", port: 1, timeoutMs: 5000 }).probe()).reachable).toBe(false);
  });

  it("parses VERSION strictly (unknown shapes → nulls, never errors)", () => {
    expect(parseClamdVersion("ClamAV 1.4.6/28184/Sun Nov  5 06:27:28 2026").signatureDate).toEqual(
      new Date(Date.UTC(2026, 10, 5, 6, 27, 28)),
    );
    expect(parseClamdVersion("garbage")).toEqual({ engineVersion: null, signatureVersion: null, signatureDate: null });
    expect(parseClamdVersion("ClamAV 1.4.6/x/not a date")).toEqual({
      engineVersion: "ClamAV 1.4.6",
      signatureVersion: null,
      signatureDate: null,
    });
  });
});

/**
 * The ClamAV adapter speaks the documented clamd INSTREAM protocol. These
 * tests run it against an in-process fake clamd that decodes the chunked
 * stream exactly like clamd does, so framing, verdict parsing and the
 * fail-closed behavior are verified without a real ClamAV daemon.
 */

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

type Behavior = "verdict" | "hang" | "close" | "garbage";

function fakeClamd(
  behavior: Behavior,
  received: Buffer[] = [],
): Promise<{ server: Server; port: number }> {
  return new Promise((resolve) => {
    const server = createServer((socket: Socket) => {
      let buffer = Buffer.alloc(0);
      let commandSeen = false;
      const payload: Buffer[] = [];
      socket.on("data", (data: Buffer) => {
        if (behavior === "close") {
          socket.destroy();
          return;
        }
        buffer = Buffer.concat([buffer, data]);
        if (!commandSeen) {
          const end = buffer.indexOf(0);
          if (end < 0) return;
          expect(buffer.subarray(0, end).toString("ascii")).toBe("zINSTREAM");
          buffer = buffer.subarray(end + 1);
          commandSeen = true;
        }
        while (buffer.length >= 4) {
          const length = buffer.readUInt32BE(0);
          if (length === 0) {
            const content = Buffer.concat(payload);
            received.push(content);
            if (behavior === "hang") return;
            if (behavior === "garbage") {
              socket.end("what?\0");
              return;
            }
            const infected = content
              .toString("latin1")
              .includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE");
            socket.end(infected ? "stream: Eicar-Signature FOUND\0" : "stream: OK\0");
            return;
          }
          if (buffer.length < 4 + length) return;
          payload.push(buffer.subarray(4, 4 + length));
          buffer = buffer.subarray(4 + length);
        }
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, port: typeof address === "object" && address ? address.port : 0 });
    });
  });
}

async function* chunks(...parts: Uint8Array[]): AsyncIterable<Uint8Array> {
  for (const part of parts) yield part;
}

describe("ClamAvScanner (clamd INSTREAM)", () => {
  let server: Server | null = null;
  afterEach(() => {
    server?.close();
    server = null;
  });

  it("streams the exact bytes in length-prefixed chunks and reports clean", async () => {
    const received: Buffer[] = [];
    const fake = await fakeClamd("verdict", received);
    server = fake.server;
    const big = new Uint8Array(200 * 1024).fill(7); // spans several 64 KiB chunks
    const scanner = new ClamAvScanner({ host: "127.0.0.1", port: fake.port, timeoutMs: 5000 });
    const verdict = await scanner.scan(chunks(new Uint8Array([1, 2, 3]), big));
    expect(verdict).toEqual({ result: "clean" });
    expect(received[0]?.byteLength).toBe(3 + big.byteLength);
  });

  it("reports the EICAR test signature as infected with the threat name", async () => {
    const fake = await fakeClamd("verdict");
    server = fake.server;
    const scanner = new ClamAvScanner({ host: "127.0.0.1", port: fake.port, timeoutMs: 5000 });
    const verdict = await scanner.scan(chunks(new TextEncoder().encode(EICAR)));
    expect(verdict).toEqual({ result: "infected", threat: "Eicar-Signature" });
  });

  it("fails closed: unreachable scanner → error verdict, never clean", async () => {
    const fake = await fakeClamd("verdict");
    const port = fake.port;
    fake.server.close();
    const scanner = new ClamAvScanner({ host: "127.0.0.1", port, timeoutMs: 2000 });
    expect(await scanner.scan(chunks(new Uint8Array([1])))).toEqual({
      result: "error",
      code: "unavailable",
    });
  });

  it("fails closed on timeout, dropped connection and unparseable replies", async () => {
    const hang = await fakeClamd("hang");
    server = hang.server;
    const slow = new ClamAvScanner({ host: "127.0.0.1", port: hang.port, timeoutMs: 1000 });
    expect((await slow.scan(chunks(new Uint8Array([1])))).result).toBe("error");
    hang.server.close();

    const garbage = await fakeClamd("garbage");
    server = garbage.server;
    const g = new ClamAvScanner({ host: "127.0.0.1", port: garbage.port, timeoutMs: 2000 });
    expect(await g.scan(chunks(new Uint8Array([1])))).toEqual({
      result: "error",
      code: "protocol",
    });
    garbage.server.close();

    const close = await fakeClamd("close");
    server = close.server;
    const c = new ClamAvScanner({ host: "127.0.0.1", port: close.port, timeoutMs: 2000 });
    expect((await c.scan(chunks(new Uint8Array([1])))).result).toBe("error");
  });

  it("parses clamd replies strictly", () => {
    expect(parseClamdResponse("stream: OK\0")).toEqual({ result: "clean" });
    expect(parseClamdResponse("stream: Win.Test.EICAR_HDB-1 FOUND\0")).toEqual({
      result: "infected",
      threat: "Win.Test.EICAR_HDB-1",
    });
    expect(parseClamdResponse("INSTREAM size limit exceeded. ERROR\0")).toEqual({
      result: "error",
      code: "size_limit",
    });
    expect(parseClamdResponse("")).toEqual({ result: "error", code: "protocol" });
    expect(parseClamdResponse("stream: OK trailing")).toEqual({
      result: "error",
      code: "protocol",
    });
  });
});
