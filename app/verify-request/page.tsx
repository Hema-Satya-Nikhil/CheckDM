import { getI18n } from "@/lib/i18n/server";
import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";

export async function generateMetadata() {
  const { t } = await getI18n();
  return {
    title: t("Check your email - CheckDM"),
    description: t("A sign-in link was sent to your email."),
  };
}

export default async function VerifyRequestPage() {
  const { t } = await getI18n();
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex" aria-label="CheckDM home">
            <Wordmark markClassName="h-8 w-8" labelClassName="text-lg" />
          </Link>
        </div>

        <div className="panel p-8 text-center">
          <h2 className="text-lg font-semibold">{t("Check your email")}</h2>
          <p className="text-sm text-muted">
            {t("We sent you a secure sign-in link. Open it on this device to continue.")}
          </p>
          <p className="mt-6 text-sm">
            <Link
              href="/login"
              className="font-medium text-accent hover:underline"
            >
              {t("Back to sign in")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
