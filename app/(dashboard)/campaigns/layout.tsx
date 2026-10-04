import { getI18n } from "@/lib/i18n/server";

/**
 * The dashboard pages are client components, which cannot export
 * `generateMetadata`. This nested layout supplies the section title, so the
 * browser tab, bookmark and history entry name the page the user is actually
 * on instead of repeating the product name for every screen.
 */
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Campaigns") };
}

export default function CampaignsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
