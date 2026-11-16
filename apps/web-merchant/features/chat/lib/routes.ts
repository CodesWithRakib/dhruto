import { type ChatParcelContext } from "@dhruto/contracts";
import { ROUTES } from "@/config/routes";

/** Dashboard sections that host the messenger (one per role surface). */
export type MessengerSection = "merchant" | "admin" | "hub" | "rider" | "customer";

export interface MessengerRoutes {
  list: string;
  thread: (conversationId: string) => string;
}

export function messengerRoutes(section: MessengerSection): MessengerRoutes {
  const routes = ROUTES[section];
  return { list: routes.messages, thread: routes.messageThread };
}

const SECTION_BY_ROLE: Readonly<Record<string, MessengerSection>> = {
  MERCHANT: "merchant",
  ADMIN: "admin",
  HUB_MANAGER: "hub",
  RIDER: "rider",
  CUSTOMER: "customer",
};

/** Messenger section of the signed-in role (UX routing only; the API authorizes). */
export function sectionForRole(role: string | null | undefined): MessengerSection | null {
  return (role && SECTION_BY_ROLE[role]) || null;
}

/**
 * Where "back to parcel" leads for each role, using only server-provided
 * parcel context (never URL parameters). Hub managers have no parcel detail
 * page; they return to the hub parcel lookup.
 */
export function parcelHref(section: MessengerSection, parcel: ChatParcelContext): string {
  switch (section) {
    case "merchant":
      return ROUTES.merchant.parcel(parcel.id);
    case "admin":
      return ROUTES.admin.parcel(parcel.id);
    case "rider":
      return ROUTES.rider.task(parcel.id);
    case "customer":
      return ROUTES.customer.trackShipment(parcel.trackingCode);
    case "hub":
      return ROUTES.hub.parcels;
  }
}
