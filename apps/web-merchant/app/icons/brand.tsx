import { ImageResponse } from "next/og";

/** Dhruto master brand colors */
const BRAND_PRIMARY = "#6366f1";
const BRAND_DARK = "#0f172a";

export function renderBrandIcon(size: number, maskable = false) {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable ? BRAND_PRIMARY : "transparent",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: maskable ? "50%" : Math.round(size * 0.28),
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #31104b 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(255, 255, 255, 0.25)",
        }}
      >
        <svg
          width={size * 0.72}
          height={size * 0.72}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dynamic Speed Trails */}
          <path
            d="M22 68 H42 M16 78 H36 M26 88 H48"
            stroke="#38bdf8"
            strokeOpacity="0.6"
            strokeWidth="4"
            strokeLinecap="round"
          />

          {/* Aerodynamic Speed Wing Swoosh */}
          <path
            d="M42 26 C68 26, 98 42, 102 62 C106 82, 84 96, 56 96 C48 96, 42 94, 38 90 L48 78 C52 80, 56 81, 60 81 C76 81, 88 72, 86 61 C84 50, 68 41, 48 41 L36 41 L42 26 Z"
            fill="#a855f7"
          />

          {/* Inner Supersonic Courier Arrow */}
          <path d="M48 34 L78 58 L54 62 L68 88 L34 56 L54 52 Z" fill="#22d3ee" />

          {/* Parcel Core */}
          <polygon points="76,46 90,56 78,66 64,56" fill="#f59e0b" />
          <circle cx="88" cy="38" r="4.5" fill="#38bdf8" />
          <circle cx="88" cy="38" r="2" fill="#ffffff" />
        </svg>
      </div>
    </div>,
    { width: size, height: size },
  );
}

export const BRAND = { BRAND_PRIMARY, BRAND_DARK };
