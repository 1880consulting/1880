import Link from "next/link";
import { Suspense } from "react";
import { peekToken } from "@/cms/staff/service";
import { AuthCard, authStyles as s, Button } from "@/cms/ui";
import { confirmSignInLink } from "../actions";

export const metadata = { title: "Sign in" };

/**
 * Where an emailed sign-in link lands. It asks for one click before using the
 * link, because email security scanners (like Microsoft 365's) open links
 * automatically and would otherwise use them up.
 */
export default function LinkPage({ searchParams }: PageProps<"/admin/link">) {
  return (
    <Suspense>
      <Confirm searchParams={searchParams} />
    </Suspense>
  );
}

async function Confirm({ searchParams }: Pick<PageProps<"/admin/link">, "searchParams">) {
  const { token } = await searchParams;
  const found =
    typeof token === "string" && token.length < 100 ? await peekToken(token, ["login"]) : null;

  if (!found || found.user.status !== "active") {
    return (
      <AuthCard title="This link has expired" lead="Sign-in links work once, for 15 minutes.">
        <Link href="/admin/login">Get a new link or sign in with your password</Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={`Continue as ${found.user.name}`} lead={found.user.email}>
      <form action={confirmSignInLink.bind(null, token as string)}>
        <Button type="submit" variant="primary" className={s.full}>
          Sign in to 1880 Studio
        </Button>
      </form>
    </AuthCard>
  );
}
