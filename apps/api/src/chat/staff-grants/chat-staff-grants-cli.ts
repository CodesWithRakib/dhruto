import { parseArgs } from "node:util";
import { DataSource } from "typeorm";
import { dataSourceOptions } from "../../database/data-source.js";
import {
  StaffGrantError,
  grantStaffPermission,
  listStaffGrants,
  revokeStaffPermission,
} from "./chat-staff-grants.js";

/**
 * Operator CLI for grant-required chat permissions (Phase 7).
 *
 *   node dist/chat/staff-grants/chat-staff-grants-cli.js grant  --user ops@x.com \
 *        --permission chat.attachment.restricted_access --reason "Incident 123 review" \
 *        --operator "jane (SEC-123)" [--expires-at 2026-12-31T00:00:00Z]
 *   node dist/chat/staff-grants/chat-staff-grants-cli.js revoke --user … --permission … --reason … --operator …
 *   node dist/chat/staff-grants/chat-staff-grants-cli.js list [--user …]
 *
 * Uses the API's normal database configuration (DATABASE_URL / DB_*).
 * Prints ids and outcomes only.
 */
async function main(): Promise<number> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      user: { type: "string" },
      permission: { type: "string" },
      reason: { type: "string" },
      operator: { type: "string" },
      "expires-at": { type: "string" },
    },
  });
  const command = positionals[0];
  const ds = new DataSource({ ...dataSourceOptions, logging: false });
  await ds.initialize();
  try {
    if (command === "list") {
      const rows = await listStaffGrants(ds, values.user);
      for (const row of rows) {
        console.info(
          `${row.id} user=${row.userId} permission=${row.permission} expires=${row.expiresAt?.toISOString() ?? "-"} revoked=${row.revokedAt?.toISOString() ?? "-"}`,
        );
      }
      return 0;
    }
    if (command !== "grant" && command !== "revoke") {
      console.error(
        "Usage: chat-staff-grants-cli <grant|revoke|list> --user --permission --reason --operator [--expires-at]",
      );
      return 2;
    }
    const expires = values["expires-at"];
    const change = {
      user: values.user ?? "",
      permission: values.permission ?? "",
      reason: values.reason ?? "",
      operator: values.operator ?? "",
      expiresAt: expires ? new Date(expires) : null,
    };
    if (change.expiresAt && Number.isNaN(change.expiresAt.getTime())) {
      throw new StaffGrantError("--expires-at must be an ISO timestamp");
    }
    const outcome =
      command === "grant"
        ? await grantStaffPermission(ds, change)
        : await revokeStaffPermission(ds, change);
    console.info(`chat staff grant ${command}: ${outcome}`);
    return 0;
  } catch (error) {
    if (error instanceof StaffGrantError) {
      console.error(`Error: ${error.message}`);
      return 1;
    }
    throw error;
  } finally {
    await ds.destroy();
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    console.error(`Unexpected error: ${error instanceof Error ? error.name : "unknown"}`);
    process.exit(1);
  },
);
