import { AuthShell } from "@/cms/ui";
import { Logo } from "@/site/ui/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell logo={<Logo />} product="1880 Studio">
      {children}
    </AuthShell>
  );
}
