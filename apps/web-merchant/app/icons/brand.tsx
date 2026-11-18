import { ImageResponse } from "next/og";

/**
 * Dhruto brand colours for raster icons. ImageResponse renders to PNG and
 * cannot read CSS variables, so these mirror `--primary` (#8D46C4) and
 * `--brand-green` (lilac accent #E6C2F7) in @dhruto/ui tokens.css.
 * Keep them in sync with the tokens.
 */
const BRAND_PRIMARY = "#8D46C4";
const BRAND_ACCENT = "#E6C2F7";
const BRAND_DARK = "#1C1129";

/** Same geometry as LOGO_PATHS in @dhruto/ui Logo.tsx (120x120 mark). */
const MARK = {
  trails: "M18 72 H38 M14 80 H34 M20 88 H42",
  wing: "M42 24 C68 24, 98 40, 102 60 C106 80, 84 96, 56 96 C48 96, 42 94, 38 90 L48 78 C52 80, 56 81, 60 81 C76 81, 88 72, 86 61 C84 50, 68 41, 48 41 L36 41 L42 24 Z",
  arrow: "M48 32 L80 58 L56 62 L70 90 L34 56 L54 52 Z",
  parcel: "76,46 90,56 78,66 64,56",
};

/** Flat app icon: primary squircle (or full-bleed for maskable), no border or shadow. */
export function renderBrandIcon(size: number, maskable = false) {
  const innerSize = maskable ? size : Math.round(size * 0.92);
  const borderRadius = maskable ? 0 : Math.round(innerSize * 0.28);
  // Maskable icons need the artwork inside the central safe zone (~80%).
  const iconScale = Math.round(innerSize * (maskable ? 0.6 : 0.72));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <div
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius,
          background: BRAND_PRIMARY,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg
          width={iconScale}
          height={iconScale}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={MARK.trails} stroke={BRAND_ACCENT} strokeWidth="4" strokeLinecap="round" />
          <path d={MARK.wing} fill="#FFFFFF" />
          <path d={MARK.arrow} fill={BRAND_ACCENT} />
          <polygon points={MARK.parcel} fill="#FFFFFF" />
          <circle cx="88" cy="38" r="4.5" fill={BRAND_ACCENT} />
        </svg>
      </div>
    </div>,
    { width: size, height: size },
  );
}

export const BRAND = { BRAND_PRIMARY, BRAND_ACCENT, BRAND_DARK };
