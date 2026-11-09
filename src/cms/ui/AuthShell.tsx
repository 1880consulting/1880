import type { ReactNode } from "react";
import { interLatin, interLatinExt } from "./fonts";
import s from "./AuthShell.module.css";
import "../../../design-system/1880-os/tokens.css";

/** The frame for sign-in pages: the mark, the product name, and one centered card. */
export function AuthShell({
  logo,
  product,
  children,
}: {
  logo: ReactNode;
  product: string;
  children: ReactNode;
}) {
  return (
    <div data-os className={`${interLatin.variable} ${interLatinExt.variable} ${s.root}`}>
      <main className={s.column}>
        <div className={s.brand}>
          {logo}
          <span className={s.product}>{product}</span>
        </div>
        {children}
      </main>
    </div>
  );
}

export function AuthCard({
  title,
  lead,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className={s.card}>
      <h1 className={s.title}>{title}</h1>
      {lead && <p className={s.lead}>{lead}</p>}
      {children}
    </div>
  );
}

export { s as authStyles };
