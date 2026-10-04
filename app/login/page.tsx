import { EMAIL_PROVIDER_ID, signIn } from "@/lib/auth";
import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";
import { getI18n } from "@/lib/i18n/server";
import { getCampaignTemplate } from "@/lib/templates/campaign-templates";
import { DemoNotice } from "@/components/demo-notice";
import { isPublicDemoHost } from "@/lib/env";

const GITHUB_URL = "https://github.com/diwenne/openreply";
const SETUP_DOCS_URL = `${GITHUB_URL}/blob/main/docs/setup.md`;

export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: t("Login - CheckDM"),
    description: t("Sign in to manage Instagram comment-to-DM campaigns."),
  };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    checkEmail?: string;
    callbackUrl?: string;
    template?: string;
  }>;
}) {
  const { t } = await getI18n();
  if (await isPublicDemoHost()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md text-center">
          <Link href="/" className="inline-flex" aria-label="CheckDM home">
            <Wordmark markClassName="h-8 w-8" labelClassName="text-lg" />
          </Link>
          <div className="panel mt-8 p-8">
            <h2 className="text-lg font-semibold text-foreground">
              {t("Sign-in is off on this demo")}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {t("This is the public demo — it doesn’t create real accounts or send DMs. To use CheckDM for real, clone it and run your own instance with your own Meta app and domain.")}
            </p>
            <a
              href={SETUP_DOCS_URL}
              target="_blank"
              rel="noreferrer"
              className="btn btn-primary mt-6 w-full"
            >
              {t("Clone it yourself")} <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const checkEmail = params.checkEmail === "1";
  const selectedTemplate = getCampaignTemplate(params.template);
  const templateCallbackUrl = selectedTemplate
    ? `/campaigns/new?template=${selectedTemplate.slug}`
    : null;
  const callbackUrl = params.callbackUrl ?? templateCallbackUrl ?? "/dashboard";

  async function sendMagicLink(formData: FormData) {
    "use server";
    await signIn(EMAIL_PROVIDER_ID, {
      email: String(formData.get("email") ?? ""),
      redirectTo: callbackUrl,
    });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex" aria-label="CheckDM home">
            <Wordmark markClassName="h-8 w-8" labelClassName="text-lg" />
          </Link>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {selectedTemplate
              ? t("Sign in to use the {name} template.", { name: selectedTemplate.title })
              : t("Sign in by email, then connect your Instagram professional account.")}
          </p>
        </div>

        <DemoNotice variant="panel" />

        <div className="panel p-8">
          {selectedTemplate && !checkEmail && (
            <div className="mb-5 rounded-[var(--radius-control)] border border-accent-border bg-accent-soft p-4">
              <p className="text-xs font-medium text-accent">
                {t("Template selected")}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {selectedTemplate.title}
              </p>
            </div>
          )}

          {checkEmail ? (
            <div className="text-center py-4">
              <h2 className="text-lg font-semibold mb-2">{t("Check your email")}</h2>
              <p className="text-sm text-muted">
                {t("We sent you a secure sign-in link. Open it on this device to continue.")}
              </p>
            </div>
          ) : (
            <form action={sendMagicLink} className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-foreground"
                >
                  {t("Work email")}
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@company.com"
                  className="w-full rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 text-sm text-foreground placeholder:text-subtle focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>

              <button type="submit" className="btn btn-primary w-full">
                {t("Email me a magic link")}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
