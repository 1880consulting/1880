import styles from "../../placeholder.module.css";

/** clients.1880.io/: the sign-in page. Shows no client names or logos. */
export default function PortalSignInPage() {
  return (
    <main className={styles.main}>
      <p className={styles.label}>{"// Client portal · placeholder"}</p>
      <h1>Sign in</h1>
      <p>Magic-link sign-in comes in Phase 3.</p>
    </main>
  );
}
