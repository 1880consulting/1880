import { TOKEN_MINUTES } from "./service";

/** Plain-text emails for Studio sign-in. Short, and they say what to do. */

export function loginLinkEmail(name: string, link: string) {
  return {
    subject: "Your 1880 Studio sign-in link",
    text: [
      `Hi ${name},`,
      "",
      "Use this link to sign in to 1880 Studio:",
      link,
      "",
      `It works once, for the next ${TOKEN_MINUTES.login} minutes.`,
      "If you didn't ask for it, you can ignore this email.",
    ].join("\n"),
  };
}

export function inviteEmail(name: string, invitedBy: string, link: string) {
  return {
    subject: `${invitedBy} invited you to 1880 Studio`,
    text: [
      `Hi ${name},`,
      "",
      `${invitedBy} invited you to 1880 Studio, where the team edits 1880.io.`,
      "Set your password here to get started:",
      link,
      "",
      "The link works once, for the next 7 days.",
    ].join("\n"),
  };
}

export function resetEmail(name: string, link: string) {
  return {
    subject: "Reset your 1880 Studio password",
    text: [
      `Hi ${name},`,
      "",
      "Use this link to choose a new password for 1880 Studio:",
      link,
      "",
      `It works once, for the next ${TOKEN_MINUTES.reset} minutes. Setting a new password signs you out everywhere else.`,
      "If you didn't ask for it, you can ignore this email: your password stays the same.",
    ].join("\n"),
  };
}
