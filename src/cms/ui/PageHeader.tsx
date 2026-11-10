import type { ReactNode } from "react";
import styles from "./os.module.css";

/** Page title block. One per page; the title says what the page is for. */
export function PageHeader({
  pretitle,
  title,
  description,
  actions,
}: {
  pretitle?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.pageHeader}>
      <div>
        {pretitle && <p className={styles.pretitle}>{pretitle}</p>}
        <h1 className={styles.pageTitle}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {actions}
    </div>
  );
}
