/**
 * Type for the legal pages (terms, privacy), shared so the two stay identical.
 *
 * Desktop values come straight from Figma — 48px title, 24px headings, 20px
 * body at black/50 over the 1000px content column (238:26108, 238:31668).
 * Neither page has a mobile or tablet frame, so those steps down are ours,
 * pitched to the same scale the marketing sections already use.
 */
export const legalTitleClass =
  "text-[32px] leading-[1.15] font-semibold tracking-[-0.02em] text-white tablet:text-[40px] desktop:text-[48px]";

export const legalHeadingClass =
  "text-[20px] leading-[normal] font-semibold tracking-[-0.02em] text-white tablet:text-[22px] desktop:text-[24px]";

export const legalBodyClass =
  "text-base leading-[1.5] tracking-[-0.02em] text-black-50 tablet:text-lg desktop:text-[20px]";
