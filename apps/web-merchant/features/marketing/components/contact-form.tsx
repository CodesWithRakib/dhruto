"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Mail, Send } from "lucide-react";
import { Button, Input, Label } from "@dhruto/ui";

/**
 * Support contact form.
 *
 * There is deliberately no backend endpoint for public enquiries, so the form
 * does not pretend to hit one: it composes a real `mailto:` message in the
 * visitor's own mail client. The confirmation card also exposes the raw email
 * address as a fallback.
 */
const SUPPORT_EMAIL = "support@dhruto.com";

export function ContactForm() {
  const t = useTranslations("Contact");
  const [sent, setSent] = React.useState(false);
  const [values, setValues] = React.useState({
    name: "",
    email: "",
    topic: "general",
    message: "",
  });

  const topics = [
    { value: "general", label: t("form.topics.general") },
    { value: "onboarding", label: t("form.topics.onboarding") },
    { value: "pricing", label: t("form.topics.pricing") },
    { value: "support", label: t("form.topics.support") },
  ];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const topicLabel = topics.find((item) => item.value === values.topic)?.label ?? values.topic;
    const subject = `[${topicLabel}] ${values.name}`;
    const body = [
      `${t("form.name")}: ${values.name}`,
      `${t("form.email")}: ${values.email}`,
      `${t("form.topic")}: ${topicLabel}`,
      "",
      values.message,
    ].join("\n");

    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
      subject,
    )}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  if (sent) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-success/30 bg-success-soft/60 p-6 text-center shadow-soft sm:p-8"
      >
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success text-success-foreground">
          <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-h3 font-bold text-foreground">{t("form.successTitle")}</h2>
        <p className="mt-1.5 text-body text-pretty text-muted-foreground">
          {t("form.successDescription")}
        </p>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="mt-4 inline-flex items-center gap-2 text-body font-semibold text-primary hover:underline"
        >
          <Mail className="h-4 w-4" aria-hidden="true" />
          {SUPPORT_EMAIL}
        </a>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border/60 bg-surface p-6 shadow-soft sm:p-8"
    >
      <h2 className="text-h3 font-bold text-foreground">{t("form.title")}</h2>
      <p className="mt-1.5 text-body text-pretty text-muted-foreground">{t("form.description")}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">{t("form.name")}</Label>
          <Input
            id="contact-name"
            name="name"
            value={values.name}
            onChange={(event) => setValues((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={t("form.namePlaceholder")}
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="contact-email">{t("form.email")}</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            value={values.email}
            onChange={(event) => setValues((prev) => ({ ...prev, email: event.target.value }))}
            placeholder={t("form.emailPlaceholder")}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="contact-topic">{t("form.topic")}</Label>
          <select
            id="contact-topic"
            name="topic"
            value={values.topic}
            onChange={(event) => setValues((prev) => ({ ...prev, topic: event.target.value }))}
            className="h-11 w-full rounded-md border border-input bg-surface px-3 text-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {topics.map((topic) => (
              <option key={topic.value} value={topic.value}>
                {topic.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="contact-message">{t("form.message")}</Label>
          <textarea
            id="contact-message"
            name="message"
            value={values.message}
            onChange={(event) => setValues((prev) => ({ ...prev, message: event.target.value }))}
            placeholder={t("form.messagePlaceholder")}
            rows={5}
            required
            className="w-full rounded-md border border-input bg-surface p-3 text-body text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-caption text-muted-foreground">{t("form.note")}</p>
        <Button type="submit" size="lg" className="h-12 rounded-xl px-6 font-bold">
          <Send className="h-4 w-4" aria-hidden="true" />
          {t("form.submit")}
        </Button>
      </div>
    </form>
  );
}
