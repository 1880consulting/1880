import styles from "../placeholder.module.css";

/** Not found inside the public site: the site layout already provides the page's main region. */
export default function NotFound() {
  return (
    <div className={styles.main}>
      <p className={styles.label}>{"// 404"}</p>
      <h1>Not found</h1>
      <p>This page doesn&apos;t exist.</p>
    </div>
  );
}
