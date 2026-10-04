import type { Metadata } from "next";
import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";
import TemplateVisual from "@/components/template-visual";
import { CAMPAIGN_TEMPLATES } from "@/lib/templates/campaign-templates";

export const metadata: Metadata = {
  title: "Instagram Comment to DM Templates - CheckDM",
  description:
    "Copy ready-to-launch Instagram comment-to-DM campaign templates for product links, lead magnets, real estate, fitness, restaurants, events, and creators.",
  keywords: [
    "Instagram comment to DM templates",
    "comment to DM campaigns",
    "Instagram DM automation templates",
    "Manychat alternative templates",
  ],
};

export default function TemplatesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader active="templates" />

      <section className="bg-navy-900">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8 lg:py-20">
          <div>
            <p className="text-sm font-medium text-accent">
              Public template library
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
              Instagram campaigns you can copy in minutes
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
              Start with proven comment-to-DM playbooks for lead magnets, product
              links, events, service menus, and agency client campaigns.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="btn btn-primary">
                Start free
              </Link>
              <a
                href="#template-grid"
                className="btn border-white/25 bg-transparent text-white hover:bg-white/10"
              >
                Browse templates
              </a>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {CAMPAIGN_TEMPLATES.slice(0, 2).map((template) => (
              <TemplateVisual key={template.slug} template={template} compact />
            ))}
          </div>
        </div>
      </section>

      <section
        id="template-grid"
        className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {CAMPAIGN_TEMPLATES.map((template) => (
            <article
              key={template.slug}
              className="flex min-h-full flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-colors hover:border-border-hover"
            >
              <div className="mb-5">
                <TemplateVisual template={template} compact />
              </div>
              <p className="text-xs font-medium uppercase tracking-wide text-accent">
                {template.category}
              </p>
              <h2 className="mt-2 text-lg font-semibold leading-tight tracking-[-0.01em]">
                {template.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {template.summary}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {template.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-[var(--radius-control)] border border-border bg-background px-2 py-1 text-xs font-medium text-muted"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
              <div className="mt-auto grid gap-2 pt-6">
                <Link
                  href={`/templates/${template.slug}`}
                  className="btn btn-secondary w-full"
                >
                  View playbook
                </Link>
                <Link
                  href={`/login?template=${template.slug}`}
                  className="btn btn-primary w-full"
                >
                  Use this template
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
