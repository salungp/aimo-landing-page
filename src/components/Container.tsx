import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Centers content to match the Figma canvas: 1000px content inside a
 * 1440px frame (220px side margins), widening to keep that same 1000px
 * column at 1920 wide-desktop (460px side margins).
 *
 * This is deliberately fixed per-breakpoint padding, not a `max-w` cap with
 * `mx-auto` — a cap starts eating space into a centered margin the instant
 * the viewport passes 1440px, growing continuously (e.g. ~40px of stray
 * margin at a common ~1520px window width) well before it reads as
 * intentional "wide desktop" breathing room at 1920. Flat padding per
 * breakpoint has no such in-between dead zone.
 */
export default function Container({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "mx-auto w-full px-5 tablet:px-10 desktop:px-[220px] wide:px-[460px]",
        className
      )}
    >
      {children}
    </div>
  );
}
