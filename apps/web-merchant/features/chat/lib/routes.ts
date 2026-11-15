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
