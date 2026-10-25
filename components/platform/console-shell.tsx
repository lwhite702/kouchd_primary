"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  Bell,
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  Flag,
  Home,
  LifeBuoy,
  Mail,
  Shield,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { KouchdWordmark } from "@/components/brand/kouchd-logo";
import type { PlatformAdminUser } from "@/lib/platform/platform-admin";
import { appVersion } from "@/lib/version";

interface ConsoleShellProps {
  consoleKey?: string;
  basePath?: string;
  admin: PlatformAdminUser;
  children: ReactNode;
}

export function ConsoleShell({ consoleKey, basePath: explicitBasePath, admin, children }: ConsoleShellProps) {
  const pathname = usePathname();
  const basePath = explicitBasePath ?? (consoleKey ? `/console/${consoleKey}` : "/platform");

  const providerNavItems = [
    { label: "Overview", href: basePath, icon: Activity },
    { label: "Subscriptions — RevenueCat", href: `${basePath}/subscriptions`, icon: CreditCard },
    { label: "Notifications — Knock", href: `${basePath}/notifications`, icon: Bell },
    { label: "Marketing — Loops", href: `${basePath}/marketing`, icon: Mail },
    { label: "Support — Help Scout", href: `${basePath}/support`, icon: LifeBuoy },
    { label: "Help docs — Mintlify", href: `${basePath}/docs`, icon: BookOpen },
  ];

  const internalNavItems = [
    { label: "Users", href: `${basePath}/users`, icon: Users },
    { label: "Households & Stays", href: `${basePath}/stays`, icon: Home },
    { label: "Financials & Disputes", href: `${basePath}/financials`, icon: FileText },
    { label: "10DLC Compliance", href: `${basePath}/compliance`, icon: CheckCircle2 },
    { label: "Feature Flags", href: `${basePath}/flags`, icon: Flag },
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
            Platform Ops v{appVersion}
          </span>
          <span className="console-readonly-pill">Read-Only Default · Audited Actions</span>
        </div>

        <div className="console-operator">
          <span>
            Operator: <strong>{admin.name}</strong>
            {admin.email ? ` (${admin.email})` : ""}
          </span>
          <Link
            href="/"
            className="button ghost compact"
            style={{ fontSize: "0.8rem", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "4px" }}
          >
            <ArrowLeft size={14} /> Exit Console
          </Link>
        </div>
      </header>

      <div className="console-nav-container">
        <nav className="console-nav-strip" aria-label="Provider Operational Visibility">
          {providerNavItems.map((item) => {
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

        <nav className="console-subnav-strip" aria-label="Internal Household & Compliance Records">
          <span className="console-subnav-label">Internal Records:</span>
          {internalNavItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`console-subnav-link ${isActive ? "active" : ""}`}
              >
                <Icon size={14} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <main>{children}</main>
    </div>
  );
}
