import "server-only";
import { getMedia } from "@/cms/media/store";
import { mediaUrl, pickWidth } from "@/cms/media/types";
import type { ClientArea } from "./access";

/** A client's logo, ready for an <img>: only for a client the person may already see. */
export async function clientLogo(
  client: ClientArea,
  width = 240,
): Promise<{ src: string; alt: string } | null> {
  if (!client.logoMediaId) return null;
  const m = await getMedia(client.logoMediaId);
  if (!m) return null;
  // The logo stands next to the client's name, so it needs no alt text of its own.
  return { src: mediaUrl(m, pickWidth(m, width), "webp"), alt: "" };
}
