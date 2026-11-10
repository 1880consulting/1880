"use client";

import { useTransition } from "react";
import { Button } from "@/site/ui/Button";
import s from "./portal.module.css";

/**
 * Runs a portal action, then loads the address it returns as a full page
 * load, so the request passes through proxy.ts (see actions.ts for why).
 */
export function ActionButton({
  action,
  children,
  look = "button",
  variant,
  arrow,
}: {
  action: () => Promise<string>;
  children: React.ReactNode;
  look?: "button" | "link";
  variant?: "solid" | "ghost";
  arrow?: boolean;
}) {
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      window.location.assign(await action());
    });
  return look === "link" ? (
    <button type="button" className={s.textButton} onClick={run} disabled={pending}>
      {children}
    </button>
  ) : (
    <Button type="button" variant={variant} arrow={arrow} onClick={run} disabled={pending}>
      {children}
    </Button>
  );
}
