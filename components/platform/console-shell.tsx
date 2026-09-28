"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ArrowLeft, CheckCircle2, FileText, Home, Shield, Users } from "lucide-react";
import type { ReactNode } from "react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import type { PlatformAdminUser } from "@/lib/platform/platform-admin";

interface ConsoleShellProps {
  consoleKey: string;
  admin: PlatformAdminUser;
  children: ReactNode;
}

export function ConsoleShell({ consoleKey, admin, children }: ConsoleShellProps) {
  const pathname = usePathname();
  const basePath = `/console/${consoleKey}`;

  const navItems = [
    { label: "Overview", href: basePath, icon: Activity },
    { label: "Users", href: `${basePath}/users`, icon: Users },
    { label: "Households & Stays", href: `${basePath}/stays`, icon: Home },
    { label: "Financials & Disputes", href: `${basePath}/financials`, icon: FileText },
    { label: "10DLC Compliance", href: `${basePath}/compliance`, icon: CheckCircle2 },
  ];

  return (
    <div className="console-shell">
      <header className="console-topbar">
        <div className="console-brand-group">
          <Link href={basePath} style={{ textDecoration: "none" }}>
            <KouchdWordmark size="sm" />
          </Link>
          <span className="console-badge">
            <Shield size={12} />
            Console
          </span>
        </div>

        <div className="console-operator">
          <span>Operator: <strong>{admin.name}</strong></span>
          <Link
            href="/"
            className="button ghost compact"
            style={{ fontSize: "0.8rem", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <ArrowLeft size={14} /> Exit Console
          </Link>
        </div>
      </header>

      <nav className="console-nav-strip" aria-label="Platform Console Navigation">
        {navItems.map((item) => {
          const isActive = item.href === basePath
            ? pathname === basePath
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`console-nav-link ${isActive ? "active" : ""}`}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <main>{children}</main>
    </div>
  );
}
