import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";
import { LogoMark } from "@/components/brand/logo";
import {
  BRAND_NAME,
  BRAND_TAGLINE,
  CREATOR_NAME,
  CREATOR_ROLE,
  CREATOR_URL,
} from "@/lib/brand";

export const metadata: Metadata = {
  title: `About ${BRAND_NAME} - Instagram comment-to-DM automation`,
  description: `Who builds ${BRAND_NAME}, how the comment-to-DM engine works, and what it deliberately does not do.`,
  alternates: { canonical: "/about" },
};

const principles = [
  {
    title: "Send the real thing",
    body: "Replies go out through Meta's official private-reply API. No browser automation, no scraping, and never an Instagram password.",
  },
  {
    title: "Show the delivery record",
    body: "Every attempt is written to a log with its outcome, so a campaign's numbers can be traced back to individual sends.",
  },
  {
    title: "Fail quietly, not loudly",
    body: "Duplicate comments, rate limits, and provider errors are recorded and skipped rather than retried into a second message.",
  },
  {
    title: "Stay narrow on purpose",
    body: "One path — keyword, post, reply, link, result — instead of a general chatbot builder that has to be configured first.",
  },
];

const notDoing = [
  "Sending a DM that Instagram did not ask for",
  "Auto-following or liking on someone's behalf",
  "Duplicating a reply that was already delivered",
  "Scraping profiles, comments, or follower lists",
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader />

      <section className="bg-navy-900">
        <div className="mx-auto w-full max-w-3xl px-5 py-20 sm:px-6 lg:px-8">
          <LogoMark className="h-9 w-9 text-white" />
          <h1 className="mt-6 text-4xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
            About {BRAND_NAME}
          </h1>
          <p className="mt-5 text-base leading-8 text-zinc-300">
            {BRAND_NAME} turns a keyword comment on an Instagram post or reel
            into a private reply. That is the whole product, and the rest of this
            page explains how it is built and what it refuses to do.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">
          How a reply gets sent
        </h2>
        <ol className="mt-6 space-y-4">
          {[
            "A connected professional account posts a reel or post and CheckDM registers a webhook for that account.",
            "When someone comments, the event is verified, queued, and checked against your active campaigns for a keyword match.",
            "The comment is claimed once, so two workers can never both send for the same comment.",
            "The reply is sent through the official private-reply endpoint, and the outcome is written to the delivery log.",
          ].map((step, index) => (
            <li key={step} className="flex gap-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-sm font-semibold text-accent">
                {index + 1}
              </span>
              <p className="pt-0.5 text-sm leading-7 text-muted">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border bg-surface py-16">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">
            What it holds to
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {principles.map((item) => (
              <div
                key={item.title}
                className="rounded-[var(--radius-card)] border border-border bg-background p-5"
              >
                <h3 className="text-sm font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-3xl px-5 py-16 sm:px-6 lg:px-8">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">
          What {BRAND_NAME} does not do
        </h2>
        <ul className="mt-6 space-y-3">
          {notDoing.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-7 text-muted">
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-border-hover"
              />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto w-full max-w-3xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-[-0.02em]">Creator</h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            {BRAND_NAME} is built and maintained by{" "}
            <a
              href={CREATOR_URL}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground underline underline-offset-4"
            >
              {CREATOR_NAME}
            </a>
            . {CREATOR_ROLE}.
          </p>
          <p className="mt-3 text-sm leading-7 text-muted">{BRAND_TAGLINE}</p>
          <Link href="/login" className="btn btn-primary mt-8">
            Start free
          </Link>
        </div>
      </section>
    </main>
  );
}
