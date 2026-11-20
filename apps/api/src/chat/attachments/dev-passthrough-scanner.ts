import {
  type ChatMalwareScanner,
  type MalwareScannerProbe,
  type MalwareScanVerdict,
} from "./malware-scanner.port.js";

export class DevPassThroughMalwareScanner implements ChatMalwareScanner {
  readonly engine = "dev-passthrough";

  async scan(body: AsyncIterable<Uint8Array>): Promise<MalwareScanVerdict> {
    // Consume stream so the hash binding in ChatAttachmentScanService completes
    for await (const _ of body) {
      // Drain bytes
    }
    return { result: "clean" };
  }

  async probe(): Promise<MalwareScannerProbe> {
    return {
      reachable: true,
      engineVersion: "DevPassThrough 1.0",
      signatureVersion: 1,
      signatureDate: new Date(),
    };
  }
}
