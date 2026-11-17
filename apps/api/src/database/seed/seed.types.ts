import type { Hub, User, Merchant, Rider, Wallet } from "../entities/index.js";

export interface CoreSeedContext {
  hubMap: Map<string, Hub>;
  userMap: Map<string, User>;
  merchantMap: Map<string, Merchant>;
  riderMap: Map<string, Rider>;
  walletMap: Map<string, Wallet>;
  stats: Record<string, number>;
}
