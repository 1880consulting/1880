import Link from "next/link";
import { Suspense } from "react";
import { peekToken } from "@/cms/staff/service";
import { AuthCard } from "@/cms/ui";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Set your password" };

/** Where invite and password-reset links land. */
export default function SetPasswordPage({ searchParams }: PageProps<"/admin/set-password">) {
  return (
    <Suspense>
      <Content searchParams={searchParams} />
    </Suspense>
  );
}

async function Content({ searchParams }: Pick<PageProps<"/admin/set-password">, "searchParams">) {
  const { token } = await searchParams;
  const found =
    typeof token === "string" && token.length < 100
      ? await peekToken(token, ["invite", "reset"])
      : null;

  if (!found) {
    return (
      <AuthCard
        title="This link has expired"
        lead="Invite links last 7 days and reset links 60 minutes, and each works once."
      >
        <p>
          Ask an owner to send a new invite, or{" "}
          <Link href="/admin/forgot">reset your password</Link> again.
        </p>
      </AuthCard>
    );
  }

  const invite = found.purpose === "invite";
  return (
    <AuthCard
      title={invite ? `Welcome, ${found.user.name}` : "Choose a new password"}
      lead={invite ? "Set a password to finish joining 1880 Studio." : `For ${found.user.email}.`}
    >
      <PasswordForm
        token={token as string}
        email={found.user.email}
        cta={invite ? "Set password and sign in" : "Save password and sign in"}
      />
    </AuthCard>
  );
}
