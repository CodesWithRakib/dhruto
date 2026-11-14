import { ImageResponse } from "next/og";

/** Dhruto master brand colors */
const BRAND_PRIMARY = "#059669";
const BRAND_DARK = "#041f17";

export function renderBrandIcon(size: number, maskable = false) {
  const innerSize = Math.round(size * 0.92);
  const borderRadius = maskable ? "50%" : Math.round(innerSize * 0.28);
  const iconScale = Math.round(innerSize * 0.72);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: maskable ? "#047857" : "transparent",
      }}
    >
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius,
          background: "linear-gradient(135deg, #064e3b 0%, #047857 50%, #022c22 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2.5px solid #34d399",
          boxShadow: "0 4px 16px rgba(6, 78, 59, 0.5)",
        }}
      >
        <svg
          width={iconScale}
          height={iconScale}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dynamic Speed Trails */}
          <path
            d="M18 72 H38 M14 80 H34 M20 88 H42"
            stroke="#38bdf8"
            strokeWidth="4"
            strokeLinecap="round"
            strokeOpacity="0.85"
          />

          {/* Aerodynamic Speed Wing Swoosh */}
          <path
            d="M42 24 C68 24, 98 40, 102 60 C106 80, 84 96, 56 96 C48 96, 42 94, 38 90 L48 78 C52 80, 56 81, 60 81 C76 81, 88 72, 86 61 C84 50, 68 41, 48 41 L36 41 L42 24 Z"
            fill="#34d399"
          />

          {/* Inner Supersonic Courier Arrow */}
          <path
            d="M48 32 L80 58 L56 62 L70 90 L34 56 L54 52 Z"
            fill="#22d3ee"
          />

          {/* High-Velocity Golden Parcel Core */}
          <polygon points="76,46 90,56 78,66 64,56" fill="#fde047" />
          <polygon points="76,46 64,56 78,66" fill="#f59e0b" fillOpacity="0.8" />
          <circle cx="88" cy="38" r="4.5" fill="#38bdf8" />
          <circle cx="88" cy="38" r="2" fill="#ffffff" />
        </svg>
      </div>
    </div>,
    { width: size, height: size },
  );
}

export const BRAND = { BRAND_PRIMARY, BRAND_DARK };
