import type { Metadata } from "next";
import { contactPage, site } from "@/site/content";
import { ContactForm } from "@/site/contact/ContactForm";
import section from "@/site/section.module.css";
import { sendInquiry } from "./actions";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: contactPage.title,
  description: contactPage.description,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section id="top" data-tone="ink" className={`${section.section} ${styles.hero}`}>
      <div className={`${section.wrap} ${styles.inner}`}>
        <h1 className={styles.title}>{contactPage.heading}</h1>
        <p className={styles.intro}>{contactPage.intro}</p>
        <ContactForm action={sendInquiry} email={site.email} />
      </div>
    </section>
  );
}
