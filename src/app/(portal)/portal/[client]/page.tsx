import styles from "../../../placeholder.module.css";

export default async function ClientHomePage({ params }: PageProps<"/portal/[client]">) {
  const { client } = await params;
  return (
    <main className={styles.main}>
      <p className={styles.label}>{"// Client portal · placeholder"}</p>
      <h1>Documents</h1>
      <p>Reports and proposals for “{client}” will be listed here.</p>
    </main>
  );
}
