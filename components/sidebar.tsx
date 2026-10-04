"use client";

/**
 * Sidebar Navigation
 *
 * Text-only nav with active state and workspace section.
 */

import LanguageSwitcher from "@/components/language-switcher";
import { useI18n } from "@/lib/i18n/provider";
import Link from "next/link";
import Image from "next/image";
import { zernioLink } from "@/lib/zernio-links";
import { Wordmark } from "@/components/brand/logo";
import { usePathname } from "next/navigation";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Overview", href: "/overview" },
  { label: "Inbox", href: "/inbox" },
  { label: "Campaigns", href: "/campaigns" },
  { label: "DM Logs", href: "/logs" },
  { label: "Settings", href: "/settings" },
  { label: "Diagnostics", href: "/diagnostics" },
] as const;

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceName: string;
}

export default function Sidebar({
  isOpen,
  onClose,
  workspaceName,
}: SidebarProps) {
  const { t } = useI18n();
  const pathname = usePathname();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-dvh w-64 max-w-[85vw] shrink-0 bg-surface border-r border-border flex flex-col
          transition-transform duration-200 ease-out
          lg:h-full lg:translate-x-0 lg:static lg:z-auto
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Same reason as the top bar: the drawer is full height, so the
            wordmark would otherwise land under the status bar. */}
        <div
          className="px-6 py-5 border-b border-border"
          style={{ paddingTop: "calc(1.25rem + env(safe-area-inset-top))" }}
        >
          <Link href="/dashboard" aria-label="CheckDM home">
            <Wordmark />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={isActive ? "page" : undefined}
                    className={`
                      block rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors
                      ${
                        isActive
                          ? "bg-accent-soft font-medium text-accent"
                          : "text-muted hover:bg-surface-hover hover:text-foreground"
                      }
                    `}
                  >
                    {t(item.label)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-border px-5 py-4">
          <div className="mb-4">
            <LanguageSwitcher />
          </div>
          <p className="truncate text-sm font-medium text-foreground">
            {workspaceName}
          </p>
          <p className="text-xs text-muted">{t("Campaign workspace")}</p>
          <a
            href={zernioLink({ placement: "sidebar" })}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="mt-4 flex items-center gap-3 text-xs text-muted hover:text-foreground"
          >
            <span>{t("Supported by")}</span>
            <Image
              src="/brand/zernio-primary.svg"
              alt="Zernio"
              width={64}
              height={20}
              className="m-2"
            />
          </a>
        </div>
      </aside>
    </>
  );
}
