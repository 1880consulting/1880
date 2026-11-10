/**
 * Splits a sentence into words for word-by-word animation. Words joined by a
 * non-breaking space stay together, so editors can prevent orphans with one.
 */
export function splitWords(text: string): string[] {
  return text.trim().split(/ +/);
}
