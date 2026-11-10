import { describe, expect, it } from "vitest";
import { inquirySchema } from "./inquiry";

const valid = { name: "Ada", email: "ada@example.com", message: "Hello", website: "" };

describe("inquirySchema", () => {
  it("accepts a complete message and trims it", () => {
    const r = inquirySchema.parse({ ...valid, name: "  Ada  " });
    expect(r.name).toBe("Ada");
  });

  it("explains what to fix", () => {
    const r = inquirySchema.safeParse({ ...valid, name: " ", email: "nope", message: "" });
    expect(r.success).toBe(false);
    const messages = r.error!.issues.map((i) => i.message);
    expect(messages).toContain("Enter your name.");
    expect(messages).toContain("Enter a full email address, like name@company.com.");
    expect(messages).toContain("Enter a message.");
  });

  it("rejects a filled honeypot", () => {
    expect(inquirySchema.safeParse({ ...valid, website: "spam.example" }).success).toBe(false);
  });
});
