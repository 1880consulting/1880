/**
 * Spreadsheet (CSV) export helpers. Pure functions, easy to test.
 *
 * Values are quoted, and anything a spreadsheet would treat as a formula
 * (starting with = + - @, a tab or a carriage return) gets a leading
 * apostrophe, so a message like "=HYPERLINK(...)" stays plain text when the
 * file is opened in Excel or Google Sheets.
 */

export function csvCell(value: unknown): string {
  let s = value == null ? "" : value instanceof Date ? value.toISOString() : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** A whole file: a header row, then one row per item. Windows line endings, which Excel prefers. */
export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}
