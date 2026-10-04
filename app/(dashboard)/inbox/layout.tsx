import { getI18n } from "@/lib/i18n/server";

/** See app/(dashboard)/campaigns/layout.tsx for why these live in a layout. */
export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("Inbox") };
}

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
