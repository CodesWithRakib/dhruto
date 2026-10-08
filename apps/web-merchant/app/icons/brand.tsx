import { ImageResponse } from "next/og";

/** Dhruto brand colours */
const BRAND_RED = "#E11D48";
const SURFACE = "#FFFFFF";

export function renderBrandIcon(size: number, maskable = false) {
  // Center the SVG path for the app icon (viewBox is 48)
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable ? BRAND_RED : "transparent",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: maskable ? "50%" : Math.round(size * 0.2),
          background: maskable ? "transparent" : SURFACE,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: maskable ? "none" : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        <svg
          width={size * 0.7}
          height={size * 0.7}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <g fill={maskable ? SURFACE : BRAND_RED} style={{ transform: "scale(1.1) translate(0px, 1px)", transformOrigin: "center" }}>
            <path d="M18 10 H30 A14 14 0 0 1 44 24 A14 14 0 0 1 30 38 H18 Z" />
            <path d="M4 16 H14 V20 H4 Z" />
            <path d="M1 24 H12 V28 H1 Z" />
            <path d="M6 32 H14 V36 H6 Z" />
          </g>
        </svg>
      </div>
    </div>,
    { width: size, height: size },
  );
}

export const BRAND = { BRAND_RED, BRAND_INK: "#111827" };
