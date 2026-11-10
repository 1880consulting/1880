"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import styles from "./Reveal.module.css";

/**
 * Fades its content in as it scrolls into view. Only content that starts
 * below the fold is hidden, so the first frame is complete, and everything
 * stays visible without JavaScript.
 */
export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
}: {
  as?: ElementType;
  /** Stagger step: 0–4, 120ms each. */
  delay?: 0 | 1 | 2 | 3 | 4;
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    el.classList.add(styles.pending);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.remove(styles.pending);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={[styles.reveal, className].filter(Boolean).join(" ")}
      style={delay ? { transitionDelay: `${delay * 120}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
