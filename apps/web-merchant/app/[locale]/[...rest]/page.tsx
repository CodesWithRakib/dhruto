import { notFound } from "next/navigation";

/**
 * Catch-all inside the locale segment.
 *
 * Unmatched URLs under a locale land here and are handed to the closest
 * `not-found.tsx` (`app/[locale]/not-found.tsx`), which renders the styled,
 * design-system 404 instead of Next's unstyled default.
 */
export default function CatchAllPage() {
  notFound();
}
