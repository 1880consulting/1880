/** Dates the 1880 OS way: "Nov 14" in lists, "Nov 14, 5:00 pm ET" in details. Eastern time. */
const TZ = "America/New_York";

export function shortDate(d: Date, now = new Date()): string {
  const sameYear = d.getFullYear() === now.getFullYear();
  return d.toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

export function longDate(d: Date): string {
  const date = d.toLocaleDateString("en-US", {
    timeZone: TZ,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = d
    .toLocaleTimeString("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" })
    .replace("AM", "am")
    .replace("PM", "pm");
  return `${date}, ${time} ET`;
}
