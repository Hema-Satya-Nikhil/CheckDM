import { getI18n } from "@/lib/i18n/server";

/** See app/(dashboard)/campaigns/layout.tsx for why these live in a layout. */
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Dashboard") };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
