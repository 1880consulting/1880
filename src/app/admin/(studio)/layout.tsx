import { IconExternalLink, IconLogout, IconUserCircle } from "@tabler/icons-react";
import Link from "next/link";
import { Suspense } from "react";
import { currentStaff } from "@/cms/auth";
import { AppShell, buttonClass, controls as c } from "@/cms/ui";
import logo from "../../../../design-system/1880-os/logo/1880-logo-white.svg";
import { signOut } from "../(auth)/actions";
import { NAV } from "./sections";

/** 1880 Studio, signed in: the 1880 OS frame (PLAN D30). */
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      product="1880 Studio"
      logo={{ src: logo.src, alt: "1880" }}
      homeHref="/admin"
      nav={NAV}
      headerActions={
        <>
          <a href="/" className={buttonClass("ghost")} target="_blank" rel="noreferrer">
            <IconExternalLink size={18} stroke={2} aria-hidden />
            View site
          </a>
          <Suspense>
            <UserMenu />
          </Suspense>
        </>
      }
    >
      {children}
    </AppShell>
  );
}

async function UserMenu() {
  const staff = await currentStaff();
  if (!staff) return null;
  return (
    <div className={c.actions} style={{ alignItems: "center" }}>
      <Link href="/admin/account" className={buttonClass("ghost")} title="Your account">
        <IconUserCircle size={18} stroke={2} aria-hidden />
        {staff.name}
        <span className={c.meta}>{staff.role === "owner" ? "Owner" : "Editor"}</span>
      </Link>
      <form action={signOut}>
        <button type="submit" className={buttonClass("secondary")}>
          <IconLogout size={18} stroke={2} aria-hidden />
          Sign out
        </button>
      </form>
    </div>
  );
}
