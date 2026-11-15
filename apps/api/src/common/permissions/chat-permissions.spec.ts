import { describe, it, expect } from "vitest";
import { ChatPermission } from "@dhruto/contracts";
import { UserRole } from "../../database/entities/User.entity.js";
import { ROLE_CHAT_PERMISSIONS, roleHasChatPermission } from "./chat-permissions.js";

describe("chat permission ceiling", () => {
  it("defines a ceiling for every platform role", () => {
    for (const role of Object.values(UserRole)) {
      expect(ROLE_CHAT_PERMISSIONS[role]).toBeDefined();
    }
  });

  it("grants no staff chat permissions to merchants, riders or customers", () => {
    for (const role of [UserRole.MERCHANT, UserRole.RIDER, UserRole.CUSTOMER]) {
      for (const permission of Object.values(ChatPermission)) {
        expect(roleHasChatPermission(role, permission)).toBe(false);
      }
    }
  });

  it("does not let hub managers read arbitrary conversations or the audit log", () => {
    expect(roleHasChatPermission(UserRole.HUB_MANAGER, ChatPermission.CONVERSATION_VIEW_ANY)).toBe(
      false,
    );
    expect(roleHasChatPermission(UserRole.HUB_MANAGER, ChatPermission.CONVERSATION_INTERVENE)).toBe(
      false,
    );
    expect(roleHasChatPermission(UserRole.HUB_MANAGER, ChatPermission.AUDIT_VIEW)).toBe(false);
    expect(roleHasChatPermission(UserRole.HUB_MANAGER, ChatPermission.INTERNAL_NOTE_MANAGE)).toBe(
      true,
    );
  });

  it("gives admins every chat permission", () => {
    for (const permission of Object.values(ChatPermission)) {
      expect(roleHasChatPermission(UserRole.ADMIN, permission)).toBe(true);
    }
  });
});
