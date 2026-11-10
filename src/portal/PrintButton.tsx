"use client";

import { Button } from "@/site/ui/Button";

export function PrintButton() {
  return (
    <Button type="button" variant="ghost" onClick={() => window.print()}>
      Print or save as PDF
    </Button>
  );
}
