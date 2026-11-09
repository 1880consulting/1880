"use client";

import { useActionState } from "react";
import type { InquiryField, InquiryState } from "@/lib/inquiry";
import { Button } from "../ui/Button";
import styles from "./ContactForm.module.css";

type Action = (prev: InquiryState, form: FormData) => Promise<InquiryState>;

const FIELDS: { name: InquiryField; label: string; type: string; autoComplete: string }[] = [
  { name: "name", label: "Name", type: "text", autoComplete: "name" },
  { name: "email", label: "Email", type: "email", autoComplete: "email" },
  { name: "message", label: "Message", type: "textarea", autoComplete: "off" },
];

export function ContactForm({ action, email }: { action: Action; email: string }) {
  const [state, formAction, pending] = useActionState(action, { status: "idle" });

  if (state.status === "sent") {
    return (
      <p className={styles.message} role="status">
        Thanks. Your message is on its way, and we&apos;ll be in touch soon.
      </p>
    );
  }

  return (
    <form id="message" className={styles.form} action={formAction} noValidate>
      {FIELDS.map((f) => {
        const error = state.errors?.[f.name];
        const id = `contact-${f.name}`;
        const common = {
          id,
          name: f.name,
          required: true,
          autoComplete: f.autoComplete,
          defaultValue: state.values?.[f.name] ?? "",
          className: styles.input,
          "aria-invalid": error ? true : undefined,
          "aria-describedby": error ? `${id}-error` : undefined,
        };
        return (
          <div key={f.name} className={styles.field}>
            <label htmlFor={id} className={styles.label}>
              {f.label}
            </label>
            {f.type === "textarea" ? (
              <textarea rows={6} {...common} />
            ) : (
              <input type={f.type} {...common} />
            )}
            {error && (
              <p id={`${id}-error`} className={styles.error}>
                {error}
              </p>
            )}
          </div>
        );
      })}
      <div className={styles.honeypot} aria-hidden>
        <label htmlFor="contact-website">Leave this empty</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" arrow disabled={pending} className={styles.submit}>
        {pending ? "Sending…" : "Send Message."}
      </Button>
      {state.status === "unavailable" && (
        <p className={styles.message} role="alert">
          Sorry, your message didn&apos;t go through. Please email us at{" "}
          <a href={`mailto:${email}`}>{email}</a> and we&apos;ll reply soon.
        </p>
      )}
    </form>
  );
}
