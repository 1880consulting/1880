"use client";

import type { ReactNode } from "react";
import ui from "../ui/os.module.css";

/** EmptyState for client components (same look as src/cms/ui/EmptyState). */
export function EmptyStateClient({
  icon,
  title,
  text,
}: {
  icon?: ReactNode;
  title: string;
  text?: string;
}) {
  return (
    <div className={`${ui.card} ${ui.empty}`}>
      {icon && <span className={ui.iconTile}>{icon}</span>}
      <h2 className={ui.emptyTitle}>{title}</h2>
      {text && <p className={ui.emptyText}>{text}</p>}
    </div>
  );
}
