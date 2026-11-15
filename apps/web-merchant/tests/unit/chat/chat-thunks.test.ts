// @vitest-environment node
// Node environment: jsdom's AbortSignal is rejected by undici's Request, which RTK Query uses.
// Network is stubbed at `fetch` (same pattern as reauth.test.ts); store, RTK Query and thunks are real.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ChatMessageItem } from "@dhruto/contracts";
import { makeStore, type AppStore } from "@/store";
import { historyLoaded } from "../../../features/chat/state/chat-timeline.slice";
import { syncToHead } from "../../../features/chat/state/chat-thunks";
import { CONV, envelope, page, serverMessage } from "./chat-fixtures";

const requests: URL[] = [];
let respond: (url: URL) => Response;

const range = (from: number, to: number): ChatMessageItem[] =>
  Array.from({ length: to - from + 1 }, (_, index) => serverMessage({ sequence: String(from + index) }));

const sequences = (store: AppStore) => {
  const timeline = store.getState().chatTimeline.conversations[CONV]!;
  return timeline.order.map((key) => timeline.messages[key]!.sequence);
};

describe("syncToHead (reconnect / gap recovery)", () => {
  let store: AppStore;

  beforeEach(() => {
    requests.length = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: Request | string) => {
        const url = new URL(typeof input === "string" ? input : input.url);
        requests.push(url);
        return respond(url);
      }),
    );
    store = makeStore();
    store.dispatch(historyLoaded({ conversationId: CONV, page: page(range(1, 3)), direction: "latest" }));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("is a no-op when the local window already reaches the head", async () => {
    respond = () => envelope(page([]));
    await store.dispatch(syncToHead(CONV, "3"));
    expect(requests).toHaveLength(0);
  });

  it("fills a small gap with afterSequence from the last contiguous sequence", async () => {
    respond = () => envelope(page(range(4, 6)));
    await store.dispatch(syncToHead(CONV, "6"));
    expect(requests).toHaveLength(1);
    expect(requests[0]!.pathname).toMatch(new RegExp(`/chat/conversations/${CONV}/messages$`));
    expect(requests[0]!.searchParams.get("afterSequence")).toBe("3");
    expect(sequences(store)).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  it("resets to the latest page instead of replaying a very large gap", async () => {
    let next = 4;
    respond = (url) => {
      if (url.searchParams.get("afterSequence")) {
        const items = range(next, next + 99);
        next += 100;
        return envelope(page(items, true));
      }
      return envelope(page(range(9951, 10000), true));
    };
    await store.dispatch(syncToHead(CONV, "10000"));
    const gapRequests = requests.filter((url) => url.searchParams.has("afterSequence"));
    expect(gapRequests).toHaveLength(5); // bounded
    const last = requests[requests.length - 1]!;
    expect(last.searchParams.has("afterSequence")).toBe(false);
    expect(last.searchParams.has("beforeSequence")).toBe(false);
    expect(sequences(store)[0]).toBe("9951");
    expect(sequences(store)).toHaveLength(50);
  });

  it("loads the latest page when the conversation was never opened", async () => {
    respond = () => envelope(page(range(1, 2)));
    await store.dispatch(syncToHead("00000000-0000-4000-8000-0000000000c2", "2"));
    expect(requests).toHaveLength(1);
    expect(requests[0]!.searchParams.has("afterSequence")).toBe(false);
  });
});
