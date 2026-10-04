/**
 * CheckDM brand mark — a chat bubble with a checkmark.
 *
 * Drawn as an outline rather than a filled shape so it stays legible at favicon
 * size, and built from a single stroke weight so it reads as one continuous
 * object instead of two unrelated glyphs.
 */

export function LogoMark({
  className = "h-7 w-7",
  title = "CheckDM",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      role="img"
      aria-label={title}
    >
      {/* Bubble: rounded body with a short tail on the lower left. */}
      <path
        d="M5.25 3.75h13.5a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-5.9l-3.86 3.16a.6.6 0 0 1-.99-.46V15.75h-2.75a2.25 2.25 0 0 1-2.25-2.25V6a2.25 2.25 0 0 1 2.25-2.25Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Checkmark, centred in the bubble body. */}
      <path
        d="m8.4 10.5 2.35 2.35 4.85-4.85"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark plus wordmark, for headers and navigation. */
export function Wordmark({
  className = "",
  markClassName = "h-7 w-7",
  labelClassName = "text-[0.9375rem]",
}: {
  className?: string;
  markClassName?: string;
  labelClassName?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark className={markClassName} />
      <span
        className={`font-semibold tracking-[-0.02em] text-foreground ${labelClassName}`}
      >
        Check<span className="text-accent">DM</span>
      </span>
    </span>
  );
}