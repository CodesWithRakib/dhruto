import { createServer, type Server, type Socket } from "node:net";

/**
 * TEST-ONLY stand-in for clamd: decodes the real `zINSTREAM` framing and
 * answers like clamd. It flags the standard EICAR test string as infected
 * and everything else as clean. It is NOT malware protection; it exists so
 * integration tests exercise the real ClamAV adapter, scan job and gate.
 *
 * `mode` can be switched at runtime to simulate scanner outages.
 *
 * Difference from real clamd (verified against clamav/clamav:1.4): real
 * ClamAV flags the EICAR string only at the START of a file, so it cannot be
 * embedded behind a PDF/PNG header that passes our signature check. This
 * double flags it anywhere, purely to drive the INFECTED path in tests.
 */
export type FakeClamdMode = "normal" | "down" | "garbage";

export interface FakeClamd {
  port: number;
  setMode(mode: FakeClamdMode): void;
  /** Number of complete streams received. */
  scans(): number;
  close(): Promise<void>;
}

const EICAR_MARKER = "EICAR-STANDARD-ANTIVIRUS-TEST-FILE";

export async function startFakeClamd(): Promise<FakeClamd> {
  let mode: FakeClamdMode = "normal";
  let scans = 0;
  const sockets = new Set<Socket>();
  const server: Server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    if (mode === "down") {
      socket.destroy();
      return;
    }
    let buffer = Buffer.alloc(0);
    let commandSeen = false;
    const payload: Buffer[] = [];
    socket.on("error", () => undefined);
    socket.on("data", (data: Buffer) => {
      buffer = Buffer.concat([buffer, data]);
      if (!commandSeen) {
        const end = buffer.indexOf(0);
        if (end < 0) return;
        if (buffer.subarray(0, end).toString("ascii") !== "zINSTREAM") {
          socket.end("UNKNOWN COMMAND\0");
          return;
        }
        buffer = buffer.subarray(end + 1);
        commandSeen = true;
      }
      while (buffer.length >= 4) {
        const length = buffer.readUInt32BE(0);
        if (length === 0) {
          scans += 1;
          if (mode === "garbage") {
            socket.end("???\0");
            return;
          }
          const infected = Buffer.concat(payload).toString("latin1").includes(EICAR_MARKER);
          socket.end(infected ? "stream: Eicar-Test-Signature FOUND\0" : "stream: OK\0");
          return;
        }
        if (buffer.length < 4 + length) return;
        payload.push(buffer.subarray(4, 4 + length));
        buffer = buffer.subarray(4 + length);
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    port,
    setMode: (next) => {
      mode = next;
    },
    scans: () => scans,
    close: () =>
      new Promise<void>((resolve) => {
        for (const socket of sockets) socket.destroy();
        server.close(() => resolve());
      }),
  };
}

/** The standard EICAR anti-virus test string (harmless by design). */
export const EICAR_TEST_STRING =
  "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
