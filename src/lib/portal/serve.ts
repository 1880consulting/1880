import "server-only";
import { interactivePagePolicy } from "@/lib/security-headers";
import type { FileInfo } from "./documents";

/**
 * Responses for document files, for the portal and for Studio's preview.
 * Never cached by anyone else (private, no-store); the type is never guessed.
 */

const base = {
  "Cache-Control": "private, no-store",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow",
  "Cross-Origin-Resource-Policy": "same-origin",
};

/** RFC 6266 filename, safe for any name. */
function disposition(kind: "inline" | "attachment", filename: string) {
  const ascii = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

/** An uploaded interactive page, under its own sandboxed policy. */
export function interactiveResponse(data: Buffer): Response {
  return new Response(new Uint8Array(data), {
    headers: {
      ...base,
      "Content-Type": "text/html; charset=utf-8",
      "Content-Security-Policy": interactivePagePolicy(),
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}

/**
 * A document file. PDFs and images may show in the viewer (inline);
 * everything else, and any `?download=1`, downloads.
 */
export function fileResponse(file: FileInfo, data: Buffer, download: boolean): Response {
  const viewable = file.mime === "application/pdf" || file.mime.startsWith("image/");
  return new Response(new Uint8Array(data), {
    headers: {
      ...base,
      "Content-Type": file.mime,
      "Content-Length": String(data.length),
      "Content-Disposition": disposition(
        download || !viewable ? "attachment" : "inline",
        file.filename,
      ),
      // Only this site may frame it. Anything but a PDF (whose viewer needs to
      // run) is also sandboxed and may load nothing, even if opened directly.
      "Content-Security-Policy":
        file.mime === "application/pdf"
          ? "frame-ancestors 'self'"
          : "default-src 'none'; img-src data:; style-src 'unsafe-inline'; frame-ancestors 'self'; sandbox",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}

export const notFoundResponse = () =>
  new Response("Not found", { status: 404, headers: { ...base, "Content-Type": "text/plain" } });
