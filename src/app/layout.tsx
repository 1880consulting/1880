import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "1880", template: "%s · 1880" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
