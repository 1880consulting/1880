import { AuthCard } from "@/cms/ui";
import { ForgotForm } from "./ForgotForm";

export const metadata = { title: "Reset your password" };

export default function ForgotPage() {
  return (
    <AuthCard title="Reset your password" lead="We'll email you a link to choose a new one.">
      <ForgotForm />
    </AuthCard>
  );
}
