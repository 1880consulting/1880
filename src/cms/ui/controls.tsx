import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from "@tabler/icons-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import c from "./controls.module.css";

export type Tone = "neutral" | "success" | "warning" | "danger" | "info";
type Variant = "primary" | "secondary" | "ghost";

/** Class names for a 1880 OS button (for <a>, <button> or <Link>). One primary per view. */
export function buttonClass(variant: Variant = "secondary", size?: "sm"): string {
  return [
    c.btn,
    variant === "primary" && c.primary,
    variant === "ghost" && c.ghost,
    size === "sm" && c.sm,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: "sm" }) {
  return (
    <button
      type={type}
      {...props}
      className={[buttonClass(variant, size), className].filter(Boolean).join(" ")}
    />
  );
}

/** Status with a word, never color alone. */
export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={[c.badge, tone !== "neutral" && c[tone]].filter(Boolean).join(" ")}>
      {children}
    </span>
  );
}

export function Segments({
  label,
  items,
}: {
  label: string;
  items: { label: string; href: string; count?: number; current?: boolean }[];
}) {
  return (
    <nav aria-label={label} className={c.segments}>
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={c.segment}
          aria-current={i.current ? "page" : undefined}
        >
          {i.label}
          {i.count !== undefined && (
            <span className={c.count}>{i.count.toLocaleString("en-US")}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

export function Panel({
  title,
  actions,
  flush,
  children,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  /** No body padding (for tables). */
  flush?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={c.panel}>
      {(title || actions) && (
        <div className={c.panelHead}>
          {title && <h2 className={c.panelTitle}>{title}</h2>}
          {actions}
        </div>
      )}
      {flush ? children : <div className={c.panelBody}>{children}</div>}
    </section>
  );
}

const ALERT_ICON = {
  success: IconCircleCheck,
  warning: IconAlertTriangle,
  danger: IconAlertTriangle,
  info: IconInfoCircle,
};

export function Alert({
  tone = "info",
  title,
  children,
}: {
  tone?: Exclude<Tone, "neutral">;
  title: ReactNode;
  children?: ReactNode;
}) {
  const Icon = ALERT_ICON[tone];
  return (
    <div className={`${c.alert} ${c[tone]}`} role={tone === "danger" ? "alert" : "status"}>
      <Icon size={20} stroke={2} aria-hidden />
      <div>
        <p className={c.alertTitle}>{title}</p>
        {children && <div className={c.alertText}>{children}</div>}
      </div>
    </div>
  );
}

export function StatTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const body = (
    <>
      <p className={c.statLabel}>{label}</p>
      <p className={c.statValue}>{value.toLocaleString("en-US")}</p>
    </>
  );
  return href ? (
    <Link href={href} className={c.stat}>
      {body}
    </Link>
  ) : (
    <div className={c.stat}>{body}</div>
  );
}

export function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={c.skeleton} style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  );
}

export { c as controls };
