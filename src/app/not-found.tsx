import styles from "./placeholder.module.css";

/** Shown for any unknown page, and for a client you don't belong to (same page on purpose). */
export default function NotFound() {
  return (
    <main className={styles.main}>
      <p className={styles.label}>{"// 404"}</p>
      <h1>Not found</h1>
      <p>This page doesn&apos;t exist.</p>
    </main>
  );
}
