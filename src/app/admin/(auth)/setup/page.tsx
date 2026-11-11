import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { setupAvailable } from "@/cms/staff/setup";
import { AuthCard } from "@/cms/ui";
import { SetupForm } from "./SetupForm";

export const metadata = { title: "Set up 1880 Studio" };

/**
 * Creates the first owner. Exists only while Studio has no owner and the host
 * has STUDIO_SETUP_TOKEN set; otherwise it's Not found.
 */
export default function SetupPage() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await connection();
  if (!(await setupAvailable())) notFound();
  return (
    <AuthCard
      title="Set up 1880 Studio"
      lead="Create the first owner account. This page closes for good once an owner exists."
    >
      <SetupForm />
    </AuthCard>
  );
}
