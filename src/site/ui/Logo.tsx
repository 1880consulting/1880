import { LOGO_DIGITS, LOGO_DOT, LOGO_VIEWBOX } from "../logo-paths";

/** The full 1880 mark in the current text color. */
export function Logo({ label = "1880" }: { label?: string }) {
  return (
    <svg viewBox={LOGO_VIEWBOX} role="img" aria-label={label} fill="currentColor">
      <path d={LOGO_DOT} />
      {LOGO_DIGITS.map((d) => (
        <path key={d.slice(0, 24)} d={d} />
      ))}
    </svg>
  );
}
