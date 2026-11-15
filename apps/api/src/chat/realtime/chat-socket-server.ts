import { Injectable } from "@nestjs/common";
import { type Namespace } from "socket.io";

/**
 * Holds the `/chat` Socket.IO namespace once the gateway has initialised.
 * Keeps the fan-out independent of the gateway class. Null in processes that
 * run no HTTP/WebSocket server (e.g. migration or seed CLIs).
 */
@Injectable()
export class ChatSocketServer {
  private nsp: Namespace | null = null;

  register(nsp: Namespace): void {
    this.nsp = nsp;
  }

  namespace(): Namespace | null {
    return this.nsp;
  }
}
