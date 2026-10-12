"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarDays,
  Dumbbell,
  LayoutDashboard,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { Toaster } from "@/components/Toaster";
import { useCurrentStaff } from "@/lib/select";
import { useHydrated } from "@/lib/store";
import type { Role } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV: Record<Role, NavItem[]> = {
  trainer: [
    { href: "/today", label: "Today", icon: CalendarDays },
    { href: "/clients", label: "Clients", icon: Users },
  ],
  frontdesk: [
    { href: "/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/clients", label: "Clients", icon: Users },
  ],
  owner: [
    { href: "/overview", label: "Overview", icon: LayoutDashboard },
    { href: "/clients", label: "Clients", icon: Users },
    { href: "/settings", label: "Settings", icon: Settings },
  ],
};

function DemoBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-[11px] font-medium text-indigo-700">
      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
      Demo mode
    </span>
  );
}

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();
  const staff = useCurrentStaff();
  const pathname = usePathname();

  if (!hydrated || !staff) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto max-w-3xl space-y-4 px-4 pt-8">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-zinc-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-200" />
          <div className="h-24 animate-pulse rounded-2xl bg-zinc-200" />
        </div>
      </div>
    );
  }

  const nav = NAV[staff.role];

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
            <Dumbbell className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-zinc-900">IronCore Fitness</p>
            <DemoBadge />
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                  active
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                }`}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-zinc-100 px-4 py-4">
          <RoleSwitcher />
        </div>
      </aside>

      <div className="md:pl-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-4 py-2.5 backdrop-blur md:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Dumbbell className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-sm font-bold leading-tight text-zinc-900">IronCore Fitness</p>
              <DemoBadge />
            </div>
          </div>
          <RoleSwitcher />
        </header>

        <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:max-w-5xl md:px-8 md:py-8 md:pb-16">
          {children}
        </main>
      </div>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-white md:hidden">
        {nav.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                active ? "text-indigo-600" : "text-zinc-400"
              }`}
            >
              <span
                className={`h-0.5 w-8 rounded-full ${active ? "bg-indigo-600" : "bg-transparent"}`}
              />
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Toaster />
    </div>
  );
}
