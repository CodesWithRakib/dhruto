import { ImageResponse } from "next/og";

/** Dhruto brand colours, mirrored from the design tokens. */
const BRAND_GREEN = "#16A34A";
const BRAND_INK = "#0F172A";
const SURFACE = "#FFFFFF";

/**
 * Renders the Dhruto app icon at a given size.
 *
 * Design: a green field with a white rounded "parcel" tile and a green
 * upward chevron — a delivery/velocity mark. Pure geometry, so no font or
 * binary asset is required. `maskable` variants pad the mark into the safe
 * zone so Android can crop it to any shape.
 */
export function renderBrandIcon(size: number, maskable = false) {
  const field = maskable ? size : Math.round(size * 0.86);
  const tile = Math.round(field * (maskable ? 0.52 : 0.6));
  const radius = Math.round(tile * 0.24);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable ? BRAND_GREEN : "transparent",
      }}
    >
      <div
        style={{
          width: field,
          height: field,
          borderRadius: maskable ? size : Math.round(size * 0.2),
          background: maskable ? "transparent" : BRAND_GREEN,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: tile,
            height: tile,
            borderRadius: radius,
            background: SURFACE,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Upward chevron — the "velocity" mark. */}
          <div
            style={{
              width: Math.round(tile * 0.42),
              height: Math.round(tile * 0.42),
              borderLeft: `${Math.round(tile * 0.14)}px solid ${BRAND_GREEN}`,
              borderTop: `${Math.round(tile * 0.14)}px solid ${BRAND_GREEN}`,
              transform: "rotate(45deg)",
              marginTop: Math.round(tile * 0.16),
              display: "flex",
            }}
          />
        </div>
      </div>
    </div>,
    { width: size, height: size },
  );
}

export const BRAND = { BRAND_GREEN, BRAND_INK };
