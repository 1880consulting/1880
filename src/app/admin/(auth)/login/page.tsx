import { redirect } from "next/navigation";
import { Suspense } from "react";
import { currentStaff, safeNext } from "@/cms/auth";
import { AuthCard } from "@/cms/ui";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <AuthCard title="Sign in" lead="Welcome back to 1880 Studio.">
      <Suspense>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthCard>
  );
}

async function Form({ searchParams }: Pick<PageProps<"/admin/login">, "searchParams">) {
  const { next } = await searchParams;
  // Already signed in: go straight on.
  if (await currentStaff()) redirect(safeNext(next));
  return <LoginForm next={typeof next === "string" ? safeNext(next) : undefined} />;
}
