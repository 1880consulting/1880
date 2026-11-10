import { CLIENT_TOKEN_MINUTES } from "./users";

/** Plain-text portal emails. Short, and they say what to do. */

export function clientLoginEmail(name: string, link: string) {
  return {
    subject: "Your 1880 client portal sign-in link",
    text: [
      `Hi ${name},`,
      "",
      "Use this link to sign in to your 1880 client portal:",
      link,
      "",
      `It works once, for the next ${CLIENT_TOKEN_MINUTES.login} minutes.`,
      "If you didn't ask for it, you can ignore this email.",
    ].join("\n"),
  };
}

export function clientInviteEmail(
  name: string,
  clientName: string,
  invitedBy: string,
  link: string,
) {
  return {
    subject: `Your ${clientName} reports from 1880`,
    text: [
      `Hi ${name},`,
      "",
      `${invitedBy} at 1880 Consulting invited you to the ${clientName} area of 1880's client portal, where your reports and proposals live.`,
      "Open it here:",
      link,
      "",
      "The link works once, for the next 7 days. After that, sign in any time with your email address and we'll send you a fresh link.",
    ].join("\n"),
  };
}

export function newDocumentEmail(input: {
  name: string;
  clientName: string;
  title: string;
  kindLabel: string;
  link: string;
}) {
  const kind = input.kindLabel.toLowerCase();
  return {
    subject: `New ${kind} from 1880: ${input.title}`,
    text: [
      `Hi ${input.name},`,
      "",
      `1880 shared a new ${kind} with ${input.clientName}: “${input.title}”.`,
      "Open it here:",
      input.link,
      "",
      "If you're asked to sign in, enter this email address and we'll send you a link.",
    ].join("\n"),
  };
}
