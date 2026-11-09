import Link from "next/link";
import type { ComponentProps } from "react";
import styles from "./Button.module.css";

type Variant = "solid" | "ghost";

function classes(variant: Variant, arrow: boolean, extra?: string) {
  return [styles.button, variant === "ghost" && styles.ghost, arrow && styles.arrow, extra]
    .filter(Boolean)
    .join(" ");
}

/** A link styled as a 1880 button: square, ink-filled, with a drawn arrow. */
export function ButtonLink({
  variant = "solid",
  arrow = true,
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; arrow?: boolean }) {
  return <Link {...props} className={classes(variant, arrow, className)} />;
}

export function Button({
  variant = "solid",
  arrow = false,
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; arrow?: boolean }) {
  return <button {...props} className={classes(variant, arrow, className)} />;
}
