import Link from "next/link";
import PublicSiteHeader from "@/components/public-site-header";

export interface SeoPageSection {
  title: string;
  body: string;
}

export interface SeoPageConfig {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta: string;
  secondaryCta?: string;
  bullets: string[];
  sections: SeoPageSection[];
  comparisonTitle: string;
  comparisons: Array<{
    label: string;
    ours: string;
    other: string;
  }>;
  templateLinks: Array<{
    label: string;
    href: string;
  }>;
  faqs: SeoPageSection[];
}

export default function SeoPageShell({ config }: { config: SeoPageConfig }) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <PublicSiteHeader />

      {/* Navy hero. The only dark band on the page, so the header above it
          stays the single light surface that anchors the page. */}
      <section className="bg-navy-900">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="text-sm font-medium text-accent">{config.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-5xl">
              {config.title}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-300">
              {config.description}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/login" className="btn btn-primary">
                {config.primaryCta}
              </Link>
              <Link
                href="/templates"
                className="btn border-white/25 bg-transparent text-white hover:bg-white/10"
              >
                {config.secondaryCta ?? "Browse templates"}
              </Link>
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-white/15 p-6">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
              Campaign OS checklist
            </p>
            <ul className="mt-5 space-y-4">
              {config.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex gap-3 text-sm leading-6 text-zinc-200"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 md:grid-cols-3">
          {config.sections.map((section) => (
            <article
              key={section.title}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-6"
            >
              <h2 className="text-lg font-semibold tracking-[-0.01em]">
                {section.title}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border bg-surface py-16">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            {config.comparisonTitle}
          </h2>
          <div className="mt-8 overflow-hidden rounded-[var(--radius-card)] border border-border">
            <div className="grid grid-cols-[0.8fr_1fr_1fr] border-b border-border bg-background text-xs font-medium uppercase tracking-wide text-muted">
              <div className="p-4">Need</div>
              <div className="p-4 text-accent">CheckDM</div>
              <div className="p-4">Generic automation</div>
            </div>
            {config.comparisons.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-1 border-b border-border last:border-0 md:grid-cols-[0.8fr_1fr_1fr]"
              >
                <div className="bg-background p-4 text-sm font-medium">
                  {item.label}
                </div>
                <div className="p-4 text-sm leading-6 text-foreground">
                  {item.ours}
                </div>
                <div className="p-4 text-sm leading-6 text-muted">
                  {item.other}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-16 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <div>
          <p className="text-sm font-medium text-accent">Start from a template</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            Launch a campaign faster than building a chatbot flow
          </h2>
          <p className="mt-4 text-sm leading-7 text-muted">
            Use a campaign template, connect the right Instagram account, pick
            the post, and ship a measurable comment-to-DM loop.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {config.templateLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-[var(--radius-card)] border border-border bg-surface p-5 text-sm font-medium transition-colors hover:border-accent-border hover:bg-accent-soft"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-sm font-medium text-accent">FAQ</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
              Search questions, answered clearly
            </h2>
          </div>
          <div className="grid gap-3">
            {config.faqs.map((faq) => (
              <article
                key={faq.title}
                className="rounded-[var(--radius-card)] border border-border bg-background p-5"
              >
                <h3 className="text-base font-semibold">{faq.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{faq.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-6 lg:px-8">
        <div className="rounded-[var(--radius-card)] border border-accent-border bg-accent-soft p-8 text-center">
          <h2 className="text-2xl font-semibold tracking-[-0.02em] sm:text-3xl">
            Turn the next high-intent comment into a private reply
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-muted">
            CheckDM is built for Instagram professional accounts, official Meta
            private replies, and campaign reporting teams can show clients.
          </p>
          <Link href="/login" className="btn btn-primary mt-8">
            Start free
          </Link>
        </div>
      </section>
    </main>
  );
}
