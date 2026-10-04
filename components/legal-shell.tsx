import Link from "next/link";
import { Wordmark } from "@/components/brand/logo";

interface LegalShellProps {
  title: string;
  description: string;
  updatedAt: string;
  children: React.ReactNode;
}

export default function LegalShell({
  title,
  description,
  updatedAt,
  children,
}: LegalShellProps) {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Link href="/" className="flex items-center" aria-label="CheckDM home">
            <Wordmark />
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold text-muted transition-colors hover:text-foreground"
          >
            Sign in
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-5 py-14">
        <p className="text-sm font-medium text-muted">Last updated {updatedAt}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 text-base leading-8 text-muted">{description}</p>
        <div className="mt-10 space-y-8 text-sm leading-7 text-foreground">
          {children}
        </div>
      </article>
    </main>
  );
}
