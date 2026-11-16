import { describe, it, expect } from "vitest";
import { ChatConversationType, ChatPermission } from "@dhruto/contracts";
import { UserRole } from "../../database/entities/User.entity.js";
import {
  CHAT_TYPE_CREATOR_ROLES,
  CHAT_TYPE_PARTICIPANT_ROLES,
  isEligibleParticipant,
  isParcelRecipient,
  sharesHub,
  staffHasPermission,
  type ChatActorScope,
  type ChatConversationScope,
  type ChatParcelScope,
} from "./chat-eligibility.policy.js";

const HUB_DHK = "11111111-1111-4111-8111-111111111111";
const HUB_CTG = "22222222-2222-4222-8222-222222222222";
const MERCHANT_A = "33333333-3333-4333-8333-333333333333";
const MERCHANT_B = "44444444-4444-4444-8444-444444444444";
const PARCEL = "55555555-5555-4555-8555-555555555555";
const RIDER_1 = "66666666-6666-4666-8666-666666666666";
const RIDER_2 = "77777777-7777-4777-8777-777777777777";

function actor(role: UserRole, overrides: Partial<ChatActorScope> = {}): ChatActorScope {
  return {
    userId: `user-${role}-${Math.random()}`,
    role,
    phone: "01711111111",
    merchantId: null,
    riderId: null,
    riderHubId: null,
    managedHubIds: [],
    ...overrides,
  };
}

const merchantA = actor(UserRole.MERCHANT, { merchantId: MERCHANT_A });
const merchantB = actor(UserRole.MERCHANT, { merchantId: MERCHANT_B });
const rider1 = actor(UserRole.RIDER, { riderId: RIDER_1, riderHubId: HUB_DHK });
const rider2 = actor(UserRole.RIDER, { riderId: RIDER_2, riderHubId: HUB_CTG });
const managerDhk = actor(UserRole.HUB_MANAGER, { managedHubIds: [HUB_DHK] });
const managerCtg = actor(UserRole.HUB_MANAGER, { managedHubIds: [HUB_CTG] });
const admin = actor(UserRole.ADMIN);
const recipient = actor(UserRole.CUSTOMER, { phone: "01812345678" });
const otherCustomer = actor(UserRole.CUSTOMER, { phone: "01999999999" });

const parcel: ChatParcelScope = {
  id: PARCEL,
  merchantId: MERCHANT_A,
  currentRiderId: RIDER_1,
  currentHubId: HUB_DHK,
  recipientPhone: "01812345678",
};

const scope = (overrides: Partial<ChatConversationScope>): ChatConversationScope => ({
  type: ChatConversationType.GROUP,
  parcelId: null,
  hubId: null,
  merchantId: null,
  createdByUserId: null,
  ...overrides,
});

const parcelThread = scope({
  type: ChatConversationType.PARCEL_DELIVERY,
  parcelId: PARCEL,
  merchantId: MERCHANT_A,
});

describe("chat eligibility: PARCEL_DELIVERY (every role)", () => {
  it("allows the owning merchant, assigned rider, recipient customer, hub manager of the current hub and admin", () => {
    for (const a of [merchantA, rider1, recipient, managerDhk, admin]) {
      expect(isEligibleParticipant(a, parcelThread, parcel)).toBe(true);
    }
  });

  it("denies another merchant, an unassigned rider, another customer and another hub's manager", () => {
    for (const a of [merchantB, rider2, otherCustomer, managerCtg]) {
      expect(isEligibleParticipant(a, parcelThread, parcel)).toBe(false);
    }
  });

  it("revokes the previous rider immediately on reassignment", () => {
    const reassigned = { ...parcel, currentRiderId: RIDER_2 };
    expect(isEligibleParticipant(rider1, parcelThread, reassigned)).toBe(false);
    expect(isEligibleParticipant(rider2, parcelThread, reassigned)).toBe(true);
  });

  it("follows the parcel to its new hub for hub managers", () => {
    const moved = { ...parcel, currentHubId: HUB_CTG };
    expect(isEligibleParticipant(managerDhk, parcelThread, moved)).toBe(false);
    expect(isEligibleParticipant(managerCtg, parcelThread, moved)).toBe(true);
  });

  it("denies everyone except admin when the parcel facts are missing or mismatched", () => {
    expect(isEligibleParticipant(merchantA, parcelThread, null)).toBe(false);
    expect(isEligibleParticipant(merchantA, parcelThread, { ...parcel, id: RIDER_1 })).toBe(false);
  });
});

describe("chat eligibility: other conversation types", () => {
  it("MERCHANT_DESK: only the owning merchant and admin", () => {
    const desk = scope({ type: ChatConversationType.MERCHANT_DESK, merchantId: MERCHANT_A });
    expect(isEligibleParticipant(merchantA, desk, null)).toBe(true);
    expect(isEligibleParticipant(admin, desk, null)).toBe(true);
    for (const a of [merchantB, rider1, managerDhk, recipient]) {
      expect(isEligibleParticipant(a, desk, null)).toBe(false);
    }
  });

  it("HUB_OPERATIONS: hub's managers and riders, never merchants/customers or other hubs", () => {
    const ops = scope({ type: ChatConversationType.HUB_OPERATIONS, hubId: HUB_DHK });
    for (const a of [managerDhk, rider1, admin])
      expect(isEligibleParticipant(a, ops, null)).toBe(true);
    for (const a of [managerCtg, rider2, merchantA, recipient]) {
      expect(isEligibleParticipant(a, ops, null)).toBe(false);
    }
  });

  it("INTERNAL_SUPERVISOR: staff only", () => {
    const internal = scope({ type: ChatConversationType.INTERNAL_SUPERVISOR });
    for (const a of [admin, managerDhk])
      expect(isEligibleParticipant(a, internal, null)).toBe(true);
    for (const a of [rider1, merchantA, recipient])
      expect(isEligibleParticipant(a, internal, null)).toBe(false);
  });

  it("DIRECT / GROUP: internal roles only (no merchant or customer cold messaging)", () => {
    for (const type of [ChatConversationType.DIRECT, ChatConversationType.GROUP]) {
      const s = scope({ type });
      for (const a of [admin, managerDhk, rider1])
        expect(isEligibleParticipant(a, s, null)).toBe(true);
      for (const a of [merchantA, recipient]) expect(isEligibleParticipant(a, s, null)).toBe(false);
    }
  });

  it("SUPPORT_TICKET without parcel: creator customers/riders/managers, merchant by merchant id", () => {
    const own = scope({
      type: ChatConversationType.SUPPORT_TICKET,
      createdByUserId: recipient.userId,
    });
    expect(isEligibleParticipant(recipient, own, null)).toBe(true);
    expect(isEligibleParticipant(otherCustomer, own, null)).toBe(false);
    expect(isEligibleParticipant(rider1, own, null)).toBe(false);
    const merchantTicket = scope({
      type: ChatConversationType.SUPPORT_TICKET,
      merchantId: MERCHANT_A,
    });
    expect(isEligibleParticipant(merchantA, merchantTicket, null)).toBe(true);
    expect(isEligibleParticipant(merchantB, merchantTicket, null)).toBe(false);
  });

  it("role tables cover every conversation type", () => {
    for (const type of Object.values(ChatConversationType)) {
      expect(CHAT_TYPE_PARTICIPANT_ROLES[type].length).toBeGreaterThan(0);
      expect(CHAT_TYPE_CREATOR_ROLES[type].length).toBeGreaterThan(0);
      for (const role of CHAT_TYPE_CREATOR_ROLES[type]) {
        expect(CHAT_TYPE_PARTICIPANT_ROLES[type]).toContain(role);
      }
    }
  });
});

describe("staff permissions are scoped, never a blanket ADMIN bypass for others", () => {
  const dhkOps = scope({ type: ChatConversationType.HUB_OPERATIONS, hubId: HUB_DHK });

  it("admin holds every staff permission platform-wide", () => {
    for (const p of Object.values(ChatPermission))
      expect(staffHasPermission(admin, p, dhkOps, null)).toBe(true);
  });

  it("hub manager may moderate only inside assigned hubs (incl. parcel's current hub)", () => {
    expect(staffHasPermission(managerDhk, ChatPermission.CONVERSATION_MODERATE, dhkOps, null)).toBe(
      true,
    );
    expect(staffHasPermission(managerCtg, ChatPermission.CONVERSATION_MODERATE, dhkOps, null)).toBe(
      false,
    );
    expect(
      staffHasPermission(managerDhk, ChatPermission.MESSAGE_MODERATE, parcelThread, parcel),
    ).toBe(true);
    expect(
      staffHasPermission(managerCtg, ChatPermission.MESSAGE_MODERATE, parcelThread, parcel),
    ).toBe(false);
  });

  it("hub manager never gets view-any, intervene, export or audit", () => {
    for (const p of [
      ChatPermission.CONVERSATION_VIEW_ANY,
      ChatPermission.CONVERSATION_INTERVENE,
      ChatPermission.CONVERSATION_EXPORT,
      ChatPermission.AUDIT_VIEW,
      ChatPermission.PARTICIPANT_MANAGE,
    ]) {
      expect(staffHasPermission(managerDhk, p, dhkOps, null)).toBe(false);
    }
  });

  it("hub manager has no staff scope over hub-less conversations", () => {
    const group = scope({ type: ChatConversationType.GROUP });
    expect(staffHasPermission(managerDhk, ChatPermission.CONVERSATION_MODERATE, group, null)).toBe(
      false,
    );
  });

  it("merchants, riders and customers hold no staff permissions anywhere", () => {
    for (const a of [merchantA, rider1, recipient]) {
      for (const p of Object.values(ChatPermission)) {
        expect(staffHasPermission(a, p, parcelThread, parcel)).toBe(false);
      }
    }
  });
});

describe("helpers", () => {
  it("recipient identity is exact phone equality, like parcel-details access (Phase 5)", () => {
    expect(isParcelRecipient(recipient, parcel)).toBe(true);
    // Same number in another format may be a different account (users.phone is unique raw).
    const plus88 = actor(UserRole.CUSTOMER, { phone: "+8801812345678" });
    const bare88 = actor(UserRole.CUSTOMER, { phone: "8801812345678" });
    for (const a of [plus88, bare88]) {
      expect(isParcelRecipient(a, parcel)).toBe(false);
      expect(isEligibleParticipant(a, parcelThread, parcel)).toBe(false);
    }
    // Only customers can be the recipient, even with a matching phone.
    expect(isParcelRecipient(actor(UserRole.RIDER, { phone: "01812345678" }), parcel)).toBe(false);
  });

  it("sharesHub: admin always; otherwise a common hub", () => {
    expect(sharesHub(managerDhk, rider1)).toBe(true);
    expect(sharesHub(managerDhk, rider2)).toBe(false);
    expect(sharesHub(rider2, admin)).toBe(true);
    expect(sharesHub(merchantA, rider1)).toBe(false);
  });
});
