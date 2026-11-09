import { z } from "zod";
import { ContactBand } from "./contact-band/ContactBand";
import { contactBandSchema } from "./contact-band/schema";
import { Feature } from "./feature/Feature";
import { featureSchema } from "./feature/schema";
import { Hero } from "./hero/Hero";
import { heroSchema } from "./hero/schema";
import { Namesake } from "./namesake/Namesake";
import { namesakeSchema } from "./namesake/schema";
import { Services } from "./services/Services";
import { servicesSchema } from "./services/schema";
import { Statement } from "./statement/Statement";
import { statementSchema } from "./statement/schema";

/**
 * 1880's page blocks. Each is a component plus a zod schema; the schema
 * validates content today and will drive the CMS editor form (PLAN §3.2).
 */
export const blockSchema = z.discriminatedUnion("type", [
  heroSchema,
  statementSchema,
  featureSchema,
  namesakeSchema,
  servicesSchema,
  contactBandSchema,
]);

export type Block = z.infer<typeof blockSchema>;

/** Site-wide values some blocks need (e.g. the contact email). */
export interface BlockContext {
  email: string;
}

export function RenderBlocks({ blocks, context }: { blocks: Block[]; context: BlockContext }) {
  return blocks.map((block, i) => {
    switch (block.type) {
      case "hero":
        return <Hero key={i} block={block} />;
      case "statement":
        return <Statement key={i} block={block} />;
      case "feature":
        return <Feature key={i} block={block} />;
      case "namesake":
        return <Namesake key={i} block={block} />;
      case "services":
        return <Services key={i} block={block} />;
      case "contact-band":
        return <ContactBand key={i} block={block} email={context.email} />;
    }
  });
}
