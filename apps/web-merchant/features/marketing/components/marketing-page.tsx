import * as React from "react";
import { Section, SectionHeading } from "./sections";

export interface MarketingPageProps {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

/** Consistent shell for inner public pages (services, pricing, about, legal…). */
export function MarketingPage({
  eyebrow,
  title,
  description,
  children,
}: MarketingPageProps) {
  return (
    <Section className="pt-12 sm:pt-16">
      <SectionHeading eyebrow={eyebrow} title={title} description={description} />
      {children ? <div className="mt-8">{children}</div> : null}
    </Section>
  );
}
