import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicSiteHeader from "@/components/public-site-header";
import TemplateVisual from "@/components/template-visual";
import {
  CAMPAIGN_TEMPLATES,
  getCampaignTemplate,
  getCampaignTemplateSlugs,
} from "@/lib/templates/campaign-templates";

type TemplatePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getCampaignTemplateSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: TemplatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = getCampaignTemplate(slug);

  if (!template) {
    return {
      title: "Template Not Found - CheckDM",
    };
  }

  return {
    title: `${template.title} - Instagram Comment to DM Template`,
    description: template.summary,
    keywords: [
      `${template.title} template`,
      "Instagram comment to DM template",
      "Instagram DM campaign template",
      template.category,
      template.audience,
    ],
  };
}

export default async function TemplateDetailPage({ params }: TemplatePageProps) {
  const { slug } = await params;
  const template = getCampaignTemplate(slug);

  if (!template) {
    notFound();
  }

  const relatedTemplates = CAMPAIGN_TEMPLATES.filter(
    (item) => item.slug !== template.slug
  ).slice(0, 3);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader active="templates" />

      <section className="bg-navy-900">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-14 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8 lg:py-20">
          <div>
            <Link
              href="/templates"
              className="text-sm font-medium text-zinc-300 transition hover:text-white"
            >
              Back to templates
            </Link>
            <p className="mt-8 text-sm font-medium text-accent">
              {template.category} template
            </p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-5xl">
              {template.title}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
              {template.summary}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href={`/login?template=${template.slug}`}
                className="btn btn-primary"
              >
                Use this template
              </Link>
              <a
                href="#playbook"
                className="btn border-white/25 bg-transparent text-white hover:bg-white/10"
              >
                Read playbook
              </a>
            </div>
          </div>

          <TemplateVisual template={template} />
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:px-8">
        <aside className="space-y-4">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Audience
            </p>
            <p className="mt-2 text-lg font-semibold">{template.audience}</p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Setup time
            </p>
            <p className="mt-2 text-lg font-semibold">
              {template.setupMinutes} minutes
            </p>
          </div>
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              Campaign goal
            </p>
            <p className="mt-2 text-lg font-semibold">{template.goal}</p>
          </div>
        </aside>

        <div id="playbook" className="space-y-8">
          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold tracking-[-0.01em]">Campaign Outcome</h2>
            <p className="mt-3 text-base leading-8 text-foreground">
              {template.outcome}
            </p>
          </section>

          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
            <h2 className="text-xl font-semibold tracking-[-0.01em]">Setup Playbook</h2>
            <ol className="mt-5 space-y-3">
              {template.playbook.map((step, index) => (
                <li key={step} className="grid gap-3 sm:grid-cols-[40px_1fr]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-accent-soft text-sm font-semibold text-accent">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-7 text-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold tracking-[-0.01em]">Best For</h2>
              <ul className="mt-4 space-y-2">
                {template.bestFor.map((item) => (
                  <li key={item} className="text-sm text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
              <h2 className="text-lg font-semibold tracking-[-0.01em]">Metrics To Watch</h2>
              <ul className="mt-4 space-y-2">
                {template.metrics.map((item) => (
                  <li key={item} className="text-sm text-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-[var(--radius-card)] border border-accent-border bg-accent-soft p-6">
            <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.01em]">
                  Copy this campaign into CheckDM
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Sign in, connect Instagram, pick a post or reel, and the
                  template copy will be ready for your campaign draft.
                </p>
              </div>
              <Link
                href={`/login?template=${template.slug}`}
                className="btn btn-primary"
              >
                Use this template
              </Link>
            </div>
          </section>
        </div>
      </section>

      <section className="border-t border-border bg-surface py-14">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">More templates</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {relatedTemplates.map((item) => (
              <Link
                key={item.slug}
                href={`/templates/${item.slug}`}
                className="rounded-[var(--radius-card)] border border-border bg-background p-5 transition-colors hover:border-border-hover"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  {item.category}
                </p>
                <h3 className="mt-2 text-base font-semibold tracking-[-0.01em]">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {item.summary}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
