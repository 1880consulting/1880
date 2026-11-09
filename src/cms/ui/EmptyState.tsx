import type { ReactNode } from "react";
import styles from "./os.module.css";

/** Says what's missing and offers the one action that fills it. */
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon?: ReactNode;
  title: ReactNode;
  text?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`${styles.card} ${styles.empty}`}>
      {icon && <span className={styles.iconTile}>{icon}</span>}
      <h2 className={styles.emptyTitle}>{title}</h2>
      {text && <p className={styles.emptyText}>{text}</p>}
      {action}
    </div>
  );
}
