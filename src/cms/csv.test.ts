import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("CSV export", () => {
  it("quotes values and doubles quotes inside them", () => {
    expect(csvCell('She said "hi", then left')).toBe('"She said ""hi"", then left"');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(new Date("2026-11-12T10:00:00Z"))).toBe('"2026-11-12T10:00:00.000Z"');
  });

  it("keeps formulas from running when the file is opened in a spreadsheet", () => {
    for (const v of ['=HYPERLINK("x")', "+1", "-2", "@SUM(A1)", "\tx"])
      expect(csvCell(v).startsWith("\"'")).toBe(true);
    expect(csvCell("plain")).toBe('"plain"');
  });

  it("builds a file with a header row and line breaks kept inside cells", () => {
    expect(toCsv(["Name", "Message"], [["Ada", "line one\nline two"]])).toBe(
      '"Name","Message"\r\n"Ada","line one\nline two"\r\n',
    );
  });
});
