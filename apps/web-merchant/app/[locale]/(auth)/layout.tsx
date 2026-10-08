import React from "react";
import Image from "next/image";
import { Link } from "@/lib/navigation";
import { Logo } from "@dhruto/ui";
import { ShieldCheck, Zap, MapPin } from "lucide-react";

const FEATURES = [
  { icon: ShieldCheck, title: "Safe & Secure", sub: "Your parcel, our priority" },
  { icon: Zap, title: "Fast Delivery", sub: "On time, always" },
  { icon: MapPin, title: "Wide Coverage", sub: "Across the country" },
];

/**
 * Auth surface: sign-in and registration.
 * Split card — brand panel (left) + form panel (right), Deep Forest theme.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8 lg:py-12">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      <div className="relative grid w-full max-w-6xl overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-lift lg:grid-cols-2">
        {/* Brand panel */}
        <aside className="dhruto-hero-dark relative hidden flex-col justify-between overflow-hidden p-10 lg:flex">
          <div className="relative z-10 space-y-6">
            <Link href="/" aria-label="Dhruto" className="inline-block rounded-md">
              <Logo inverted />
            </Link>
            <div className="space-y-3">
              <p className="text-balance text-4xl font-extrabold leading-tight text-[hsl(var(--hero-dark-foreground))]">
                Fast Delivery,
                <br />
                <span className="text-[hsl(var(--hero-dark-gold))]">Greater Connections</span>
              </p>
              <p className="max-w-sm text-body text-[hsl(var(--hero-dark-muted))]">
                We deliver your parcels safely and on time, across every corner.
              </p>
            </div>
            <ul className="flex flex-wrap gap-5">
              {FEATURES.map(({ icon: Icon, title, sub }) => (
                <li key={title} className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-[hsl(var(--hero-dark-foreground)/0.15)] bg-[hsl(var(--hero-dark-foreground)/0.08)] text-[hsl(var(--hero-dark-foreground))]">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="leading-tight">
                    <span className="block text-xs font-semibold text-[hsl(var(--hero-dark-foreground))]">{title}</span>
                    <span className="block text-[11px] text-[hsl(var(--hero-dark-muted))]">{sub}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative -mx-10 -mb-10 mt-8">
            <Image
              src="/images/auth-courier.jpg"
              alt="Dhruto courier delivering a parcel on a scooter"
              width={1200}
              height={900}
              priority
              className="h-auto w-full [mask-image:linear-gradient(to_bottom,transparent,black_18%)]"
            />
            <p className="absolute bottom-6 left-10 rotate-[-6deg] font-serif text-2xl italic text-[hsl(var(--hero-dark-gold))]">
              Delivering Tomorrow
            </p>
          </div>

          {/* Wave divider */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 800"
            preserveAspectRatio="none"
            className="absolute inset-y-0 -right-px z-20 h-full w-16 fill-[hsl(var(--surface))]"
          >
            <path d="M100 0 H60 C10 150 90 300 40 420 C0 520 70 650 50 800 H100 Z" />
          </svg>
        </aside>

        {/* Form panel */}
        <main
          id="main-content"
          className="relative flex items-center justify-center overflow-hidden px-6 py-12 sm:px-12"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full border-[24px] border-primary/10"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-primary/10"
          />
          <div className="relative z-10 w-full max-w-md">
            <div className="mb-6 lg:hidden">
              <Link href="/" aria-label="Dhruto" className="inline-block rounded-md">
                <Logo inverted />
              </Link>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
