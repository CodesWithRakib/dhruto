/**
 * Dhruto — shared Tailwind preset.
 *
 * Consumes the design tokens from `src/styles/tokens.css`.
 * Components should use SEMANTIC names (bg-surface, text-muted-foreground,
 * bg-success-soft) and never raw palette colors (bg-green-500, text-[#fff]).
 *
 * Single theme, flat design: there is no dark mode and no elevation. Every
 * `shadow-*` utility resolves to `none` so surfaces are separated by
 * background tone only (see tokens.css).
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // No `.dark` class is ever applied (single theme); "class" keeps any stray
  // `dark:` utility inert instead of following the OS preference.
  darkMode: ["class"],
  theme: {
    // Replaces (not extends) Tailwind's shadow scale: flat UI, no box-shadows.
    boxShadow: {
      DEFAULT: "none",
      "2xs": "none",
      xs: "none",
      sm: "none",
      md: "none",
      lg: "none",
      xl: "none",
      "2xl": "none",
      inner: "none",
      soft: "none",
      lift: "none",
      none: "none",
    },
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        background: "hsl(var(--background) / <alpha-value>)",
        foreground: "hsl(var(--foreground) / <alpha-value>)",

        surface: {
          DEFAULT: "hsl(var(--surface) / <alpha-value>)",
          muted: "hsl(var(--surface-muted) / <alpha-value>)",
          elevated: "hsl(var(--surface-elevated) / <alpha-value>)",
          hover: "hsl(var(--surface-hover) / <alpha-value>)",
          selected: "hsl(var(--surface-selected) / <alpha-value>)",
        },

        field: {
          DEFAULT: "hsl(var(--field) / <alpha-value>)",
          hover: "hsl(var(--field-hover) / <alpha-value>)",
        },

        inverse: {
          DEFAULT: "hsl(var(--inverse) / <alpha-value>)",
          foreground: "hsl(var(--inverse-foreground) / <alpha-value>)",
          muted: "hsl(var(--inverse-muted) / <alpha-value>)",
          soft: "hsl(var(--inverse-soft) / <alpha-value>)",
        },

        border: "hsl(var(--border) / <alpha-value>)",
        input: "hsl(var(--input) / <alpha-value>)",
        ring: "hsl(var(--ring) / <alpha-value>)",
        overlay: "hsl(var(--overlay) / 0.5)",

        card: {
          DEFAULT: "hsl(var(--card) / <alpha-value>)",
          foreground: "hsl(var(--card-foreground) / <alpha-value>)",
        },
        popover: {
          DEFAULT: "hsl(var(--popover) / <alpha-value>)",
          foreground: "hsl(var(--popover-foreground) / <alpha-value>)",
        },

        primary: {
          DEFAULT: "hsl(var(--primary) / <alpha-value>)",
          hover: "hsl(var(--primary-hover) / <alpha-value>)",
          foreground: "hsl(var(--primary-foreground) / <alpha-value>)",
          soft: "hsl(var(--primary-soft) / <alpha-value>)",
          "soft-foreground": "hsl(var(--primary-soft-foreground) / <alpha-value>)",
        },

        brand: {
          DEFAULT: "hsl(var(--brand-green) / <alpha-value>)",
          hover: "hsl(var(--brand-green-hover) / <alpha-value>)",
          soft: "hsl(var(--primary-soft) / <alpha-value>)",
        },

        secondary: {
          DEFAULT: "hsl(var(--secondary) / <alpha-value>)",
          foreground: "hsl(var(--secondary-foreground) / <alpha-value>)",
        },

        muted: {
          DEFAULT: "hsl(var(--muted) / <alpha-value>)",
          foreground: "hsl(var(--muted-foreground) / <alpha-value>)",
        },

        accent: {
          DEFAULT: "hsl(var(--accent) / <alpha-value>)",
          foreground: "hsl(var(--accent-foreground) / <alpha-value>)",
        },

        success: {
          DEFAULT: "hsl(var(--success) / <alpha-value>)",
          foreground: "hsl(var(--success-foreground) / <alpha-value>)",
          soft: "hsl(var(--success-soft) / <alpha-value>)",
          "soft-foreground": "hsl(var(--success-soft-foreground) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "hsl(var(--warning) / <alpha-value>)",
          foreground: "hsl(var(--warning-foreground) / <alpha-value>)",
          soft: "hsl(var(--warning-soft) / <alpha-value>)",
          "soft-foreground": "hsl(var(--warning-soft-foreground) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "hsl(var(--danger) / <alpha-value>)",
          foreground: "hsl(var(--danger-foreground) / <alpha-value>)",
          soft: "hsl(var(--danger-soft) / <alpha-value>)",
          "soft-foreground": "hsl(var(--danger-soft-foreground) / <alpha-value>)",
        },
        info: {
          DEFAULT: "hsl(var(--info) / <alpha-value>)",
          foreground: "hsl(var(--info-foreground) / <alpha-value>)",
          soft: "hsl(var(--info-soft) / <alpha-value>)",
          "soft-foreground": "hsl(var(--info-soft-foreground) / <alpha-value>)",
        },

        /* shadcn compatibility alias — prefer `danger` in new code. */
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
      },

      fontFamily: {
        sans: ["var(--font-sans)"],
        bangla: ["var(--font-bangla)"],
        mono: ["var(--font-mono)"],
      },

      /* Centralised type scale. Line-heights favour Bangla legibility. */
      fontSize: {
        display: ["2.25rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "700" }],
        h1: ["1.75rem", { lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "700" }],
        h2: ["1.375rem", { lineHeight: "1.3", fontWeight: "700" }],
        h3: ["1.125rem", { lineHeight: "1.4", fontWeight: "600" }],
        h4: ["1rem", { lineHeight: "1.5", fontWeight: "600" }],
        body: ["0.875rem", { lineHeight: "1.6" }],
        "body-sm": ["0.8125rem", { lineHeight: "1.6" }],
        caption: ["0.75rem", { lineHeight: "1.5" }],
        label: ["0.8125rem", { lineHeight: "1.4", fontWeight: "500" }],
        table: ["0.8125rem", { lineHeight: "1.45" }],
      },

      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        DEFAULT: "var(--radius-md)",
      },

      transitionTimingFunction: {
        out: "var(--ease-out)",
        spring: "var(--ease-spring)",
      },

      transitionDuration: {
        fast: "var(--duration-fast)",
        base: "var(--duration-base)",
        slow: "var(--duration-slow)",
      },

      keyframes: {
        "dhruto-fade-slide": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "dhruto-shimmer": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },

      animation: {
        "dhruto-in": "dhruto-fade-slide var(--duration-base) var(--ease-out) both",
        "dhruto-in-slow": "dhruto-fade-slide var(--duration-slow) var(--ease-out) both",
        "dhruto-shimmer": "dhruto-shimmer 1.6s ease-in-out infinite",
      },

      spacing: {
        "4.5": "1.125rem",
        "safe-bottom": "env(safe-area-inset-bottom)",
      },
    },
  },
  plugins: [],
};
