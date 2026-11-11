"use client";

import { useEffect, useRef, useState } from "react";
import { track } from "../analytics";
import styles from "./CopyEmail.module.css";

/** An email address with a Copy button (falls back to selecting the text). */
export function CopyEmail({ email }: { email: string }) {
  const [label, setLabel] = useState("Copy");
  const addr = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(email);
      setLabel("Copied");
      track("copy_email");
    } catch {
      const el = addr.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setLabel("Selected");
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setLabel("Copy"), 2200);
  }

  return (
    <div className={styles.row}>
      <span ref={addr} className={styles.addr}>
        {email}
      </span>
      <button type="button" className={styles.copy} onClick={copy} aria-live="polite">
        {label}
      </button>
    </div>
  );
}
