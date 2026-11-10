"use client";

import { useTransition } from "react";
import { controls as c } from "@/cms/ui/client";

/** Report, proposal or other: saved straight away (it isn't part of the draft). */
export function KindSelect({
  value,
  action,
}: {
  value: string;
  action: (value: string) => Promise<void>;
}) {
  const [pending, start] = useTransition();
  return (
    <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      <span className={c.meta}>Kind</span>
      <select
        className={c.input}
        style={{ width: "auto", height: 32, paddingBlock: 0 }}
        defaultValue={value}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          start(() => action(v));
        }}
      >
        <option value="report">Report</option>
        <option value="proposal">Proposal</option>
        <option value="other">Other</option>
      </select>
    </label>
  );
}
