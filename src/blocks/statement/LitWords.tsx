"use client";

import { useEffect, useRef } from "react";
import { splitWords } from "@/site/ui/words";
import styles from "./Statement.module.css";

/** Each word lights as it crosses a line 40% up from the bottom of the screen. */
export function LitWords({ text }: { text: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const words = splitWords(text);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          e.target.classList.toggle(styles.on, e.isIntersecting || e.boundingClientRect.top < 0);
        }
      },
      { rootMargin: "0px 0px -40% 0px", threshold: 1 },
    );
    el.querySelectorAll(`.${styles.word}`).forEach((w) => io.observe(w));
    // Dim the words only once observing starts, so they never get stuck faint.
    el.classList.add(styles.ready);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <span className="visually-hidden">{text}</span>
      <span ref={ref} aria-hidden>
        {words.map((w, i) => (
          <span key={i} className={styles.word}>
            {w}
            {i < words.length - 1 ? " " : ""}
          </span>
        ))}
      </span>
    </>
  );
}
