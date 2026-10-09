"use client";

import React, { useState } from "react";
import { FaqHero } from "./faq-hero";
import { FaqInteractiveDirectory } from "./faq-interactive-directory";
import { FaqTopicCards } from "./faq-topic-cards";
import { FaqEscalationDesk } from "./faq-escalation-desk";

interface FaqContainerProps {
  eyebrow?: string;
  title?: string;
  description?: string;
  baseItems: { question: string; answer: string }[];
  topicsEyebrow?: string;
  topicsTitle?: string;
  topicsDescription?: string;
  topicsOpenLabel?: string;
}

const CATEGORIES = [
  { id: "all", label: "All Topics", count: 12 },
  { id: "booking", label: "Booking & Pickup", count: 2 },
  { id: "delivery", label: "Line-Haul & SLAs", count: 3 },
  { id: "cod", label: "COD & Payouts", count: 3 },
  { id: "tracking", label: "Tracking & Security", count: 1 },
  { id: "api", label: "Developer & API", count: 2 },
  { id: "general", label: "General", count: 1 },
];

export function FaqContainer({
  eyebrow,
  title,
  description,
  baseItems,
  topicsEyebrow,
  topicsTitle,
  topicsDescription,
  topicsOpenLabel,
}: FaqContainerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const handleCategorySelect = (catId: string) => {
    setActiveCategory(catId);
    const directory = document.getElementById("faq-directory");
    if (directory) {
      directory.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
  };

  return (
    <div className="flex flex-col">
      {/* 1. Hero with Live Search & Category Jump Pills */}
      <FaqHero
        eyebrow={eyebrow}
        title={title}
        description={description}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeCategory={activeCategory}
        onCategorySelect={handleCategorySelect}
        categories={CATEGORIES}
      />

      {/* 2. Interactive Accordion Directory with Instant Filter & Feedback */}
      <FaqInteractiveDirectory
        baseItems={baseItems}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        activeCategory={activeCategory}
        onCategorySelect={setActiveCategory}
      />

      {/* 3. Bento Grid Deep-Dive Portals */}
      <FaqTopicCards
        eyebrow={topicsEyebrow}
        title={topicsTitle}
        description={topicsDescription}
        openLabel={topicsOpenLabel}
      />

      {/* 4. Operations Escalation Desk */}
      <FaqEscalationDesk />
    </div>
  );
}
