import type { Metadata } from "next";
import type { I18n } from "@/lib/i18n";
import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCampaignReportBySlug } from "@/lib/reports/data";

type ReportPageProps = {
  params: Promise<{ shareSlug: string }>;
};

function formatDate(date: Date | null, { locale, t }: Pick<I18n, "locale" | "t">) {
  if (!date) return t("No sends yet");
  return date.toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper: string;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-xs leading-5 text-zinc-400">{helper}</p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: ReportPageProps): Promise<Metadata> {
  const { locale, t } = await getI18n();
  const { shareSlug } = await params;
  const report = await getCampaignReportBySlug(shareSlug, locale);

  if (!report) {
    return {
      title: t("Report Not Found"),
      robots: { index: false, follow: false },
    };
  }

  return {
    title: t("{name} Campaign Report", { name: report.campaign.name }),
    description: t("Read-only Instagram comment-to-DM campaign report for {name}.", { name: report.campaign.name }),
    robots: { index: false, follow: false },
  };
}

export default async function ReportPage({ params }: ReportPageProps) {
  const { locale, t } = await getI18n();
  const { shareSlug } = await params;
  const report = await getCampaignReportBySlug(shareSlug, locale);

  if (!report) {
    notFound();
  }

  const maxDaily = Math.max(
    ...report.daily.map((day) => Math.max(day.sent, day.clicks)),
    1
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="bg-navy-900">
        <div className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-accent">
                {t("Client campaign report")}
              </p>
              <h1 className="mt-3 max-w-3xl break-words text-4xl font-semibold leading-tight tracking-[-0.03em] text-white sm:text-5xl">
                {report.campaign.name}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-zinc-400">
                <span>@{report.campaign.instagramUsername}</span>
                {report.campaign.goal && (
                  <>
                    <span>·</span>
                    <span>{report.campaign.goal}</span>
                  </>
                )}
                <span>·</span>
                <span>
                  {report.campaign.isActive ? t("Active campaign") : t("Paused campaign")}
                </span>
              </div>
            </div>

            <div className="min-w-0 rounded-[var(--radius-card)] border border-white/15 bg-white/[0.04] p-4 text-sm md:min-w-64">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                {t("Workspace")}
              </p>
              <p className="mt-2 font-semibold text-white">{report.workspace.name}</p>
              <p className="mt-4 text-xs text-zinc-400">
                {t("Generated")} {formatDate(report.generatedAt, { locale, t })}
              </p>
              {report.branded && (
                <Link
                  href="/"
                  className="btn mt-4 border-white/25 bg-transparent text-white hover:bg-white/10"
                >
                  {t("Powered by CheckDM")}
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard
            label={t("DMs sent")}
            value={report.metrics.sent}
            helper={t("Private replies successfully sent.")}
          />
          <MetricCard
            label={t("Skipped")}
            value={report.metrics.skipped}
            helper={t("Duplicates, limits, or no-send outcomes.")}
          />
          <MetricCard
            label={t("Failed")}
            value={report.metrics.failed}
            helper={t("Replies that need operational review.")}
          />
          <MetricCard
            label={t("Clicks")}
            value={report.metrics.clicks}
            helper={t("Tracked link visits from replies.")}
          />
          <MetricCard
            label={t("CTR")}
            value={`${report.metrics.ctr}%`}
            helper={t("Clicks divided by sent replies.")}
          />
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold tracking-[-0.01em]">
                  {t("Last 7 Days")}
                </h2>
                <p className="mt-2 text-sm text-muted">
                  {t("Sent replies and tracked clicks by day.")}
                </p>
              </div>
              <p className="text-xs text-subtle">
                {t("Last send:")} {formatDate(report.metrics.latestSentAt, { locale, t })}
              </p>
            </div>
            <div className="mt-8 grid h-56 grid-cols-7 items-end gap-1.5 sm:gap-3">
              {report.daily.map((day) => (
                <div key={day.date} className="flex h-full flex-col justify-end gap-2">
                  <div className="flex min-h-0 flex-1 items-end gap-1">
                    <div
                      className="w-full bg-accent/75"
                      style={{
                        height: `${Math.max((day.sent / maxDaily) * 100, 4)}%`,
                      }}
                      title={t("{count} sent", { count: day.sent })}
                    />
                    <div
                      className="w-full bg-slate-400/70"
                      style={{
                        height: `${Math.max((day.clicks / maxDaily) * 100, 4)}%`,
                      }}
                      title={t("{count} clicks", { count: day.clicks })}
                    />
                  </div>
                  <p className="truncate text-center text-[11px] text-subtle">
                    {day.date}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-muted">
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 bg-accent" />
                {t("Sent replies")}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 bg-slate-400" />
                {t("Link clicks")}
              </span>
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
              <h2 className="text-lg font-semibold tracking-[-0.01em]">{t("Top Keywords")}</h2>
              <div className="mt-5 space-y-3">
                {report.topKeywords.length === 0 && (
                  <p className="text-sm text-muted">
                    {t("No matched keyword data yet.")}
                  </p>
                )}
                {report.topKeywords.map((keyword) => (
                  <div
                    key={keyword.keyword}
                    className="flex items-center justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm font-medium">
                      {keyword.keyword}
                    </span>
                    <span className="text-sm text-muted">
                      {keyword.count}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
              <h2 className="text-lg font-semibold tracking-[-0.01em]">{t("Tracked Links")}</h2>
              <div className="mt-5 space-y-3">
                {report.trackedLinks.length === 0 && (
                  <p className="text-sm text-muted">
                    {t("This campaign does not have a tracked link.")}
                  </p>
                )}
                {report.trackedLinks.map((link) => (
                  <div
                    key={link.slug}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="min-w-0 truncate text-sm text-foreground">
                      {link.destinationHost}
                    </span>
                    <span className="text-sm font-medium">
                      {link.clicks}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <section className="mt-8 border border-white/10 bg-white/[0.035] p-4 sm:p-6">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">{t("Campaign Setup")}</h2>
          <div className="mt-5 grid gap-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t("Keywords")}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {report.campaign.keywords.map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-[var(--radius-control)] border border-border bg-background px-2 py-1 text-xs font-medium text-muted"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t("Created")}
              </p>
              <p className="mt-3 text-sm text-foreground">
                {formatDate(report.campaign.createdAt, { locale, t })}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {t("Source post")}
              </p>
              {report.campaign.postUrl ? (
                <a
                  href={report.campaign.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex text-sm font-medium text-accent transition hover:text-accent-hover"
                >
                  {t("View Instagram post")}
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted">{t("Not attached")}</p>
              )}
            </div>
          </div>
        </section>

        {report.branded && (
          <footer className="mt-8 border-t border-border pt-6 text-center text-xs text-subtle">
            {t("Built with CheckDM, the Instagram comment-to-DM campaign OS.")}
          </footer>
        )}
      </section>
    </main>
  );
}
