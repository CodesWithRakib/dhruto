import { randomUUID } from "node:crypto";
import { type DataSource } from "typeorm";
import { UserRole } from "../../src/database/entities/index.js";

export interface ChatFixtureUser {
  id: string;
  role: UserRole;
  phone: string;
  email: string;
}

export interface ChatFixtures {
  users: Record<string, ChatFixtureUser>;
  hubDhk: string;
  hubCtg: string;
  merchantA: string;
  merchantB: string;
  rider1: string;
  rider2: string;
  rider3: string;
  parcelA: string;
  recipientPhone: string;
}

/**
 * Deterministic chat fixtures for DISPOSABLE test databases (see
 * chat-test-db.ts). Phone numbers use the 0131… range so they never collide
 * with the demo users AuthService seeds at boot.
 */
export async function seedChatFixtures(ds: DataSource, tag = "rt"): Promise<ChatFixtures> {
  const users: Record<string, ChatFixtureUser> = {};
  let phoneSeq = 0;
  const insertUser = async (key: string, role: UserRole, phone?: string): Promise<string> => {
    phoneSeq += 1;
    const resolvedPhone =
      phone ??
      `0131${String(Math.floor(Math.random() * 10_000)).padStart(4, "0")}${String(phoneSeq).padStart(3, "0")}`;
    const email = `${key}-${tag}@chat-test.local`;
    const [row] = await ds.query(
      `INSERT INTO "users" ("name", "email", "phone", "password_hash", "role") VALUES ($1, $2, $3, 'x', $4) RETURNING "id"`,
      [`Chat ${key}`, email, resolvedPhone, role],
    );
    users[key] = { id: row.id as string, role, phone: resolvedPhone, email };
    return row.id as string;
  };

  const hubDhk = randomUUID();
  const hubCtg = randomUUID();
  await ds.query(
    `INSERT INTO "hubs" ("id", "code", "name", "address") VALUES ($1, $3, 'Dhaka Test', 'Dhaka'), ($2, $4, 'Ctg Test', 'Chattogram')`,
    [
      hubDhk,
      hubCtg,
      `DHK-${tag}`.toUpperCase().slice(0, 20),
      `CTG-${tag}`.toUpperCase().slice(0, 20),
    ],
  );
  await insertUser("admin", UserRole.ADMIN);
  const mUserA = await insertUser("merchantA", UserRole.MERCHANT);
  const mUserB = await insertUser("merchantB", UserRole.MERCHANT);
  const rUser1 = await insertUser("rider1", UserRole.RIDER);
  const rUser2 = await insertUser("rider2", UserRole.RIDER);
  const rUser3 = await insertUser("rider3", UserRole.RIDER);
  const hmDhk = await insertUser("hmDhk", UserRole.HUB_MANAGER);
  const hmCtg = await insertUser("hmCtg", UserRole.HUB_MANAGER);
  const recipientPhone = `0139${String(Math.floor(Math.random() * 10_000_000)).padStart(7, "0")}`;
  await insertUser("customer", UserRole.CUSTOMER, recipientPhone);
  await insertUser("customer2", UserRole.CUSTOMER);
  await insertUser("suspended", UserRole.CUSTOMER);
  await ds.query(`UPDATE "users" SET "status" = 'SUSPENDED' WHERE "id" = $1`, [
    users.suspended?.id,
  ]);

  const [merchantA, merchantB] = (
    await ds.query(
      `INSERT INTO "merchants" ("user_id", "business_name", "contact_phone", "pickup_address")
       VALUES ($1, 'Shop A', '01310000000', 'Dhaka'), ($2, 'Shop B', '01310000001', 'Dhaka') RETURNING "id"`,
      [mUserA, mUserB],
    )
  ).map((r: { id: string }) => r.id) as [string, string];
  const [rider1, rider2, rider3] = (
    await ds.query(
      `INSERT INTO "riders" ("user_id", "hub_id") VALUES ($1, $4), ($2, $5), ($3, $4) RETURNING "id"`,
      [rUser1, rUser2, rUser3, hubDhk, hubCtg],
    )
  ).map((r: { id: string }) => r.id) as [string, string, string];
  await ds.query(
    `INSERT INTO "hub_user_assignments" ("user_id", "hub_id") VALUES ($1, $3), ($2, $4)`,
    [hmDhk, hmCtg, hubDhk, hubCtg],
  );
  const [parcel] = await ds.query(
    `INSERT INTO "parcels" ("tracking_code", "merchant_id", "recipient_name", "recipient_phone", "raw_address", "current_rider_id", "current_hub_id")
     VALUES ($1, $2, 'Recipient', $3, 'Dhaka', $4, $5) RETURNING "id"`,
    [`RT-${tag}-${randomUUID().slice(0, 8)}`, merchantA, recipientPhone, rider1, hubDhk],
  );

  return {
    users,
    hubDhk,
    hubCtg,
    merchantA,
    merchantB,
    rider1,
    rider2,
    rider3,
    parcelA: parcel.id as string,
    recipientPhone,
  };
}
