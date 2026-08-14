"use client";

import {
  AddressBookTabs,
  Briefcase,
  Buildings,
  CaretRight,
  ClipboardText,
  FileDoc,
  Files,
  Kanban,
  List,
  SignOut,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { Role } from "@/lib/auth/rbac";
import type { PortalSession } from "@/lib/auth/session";

interface PortalShellProps {
  children: React.ReactNode;
  session: PortalSession;
}

type NavigationItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; weight?: "regular" | "fill" }>;
};

const EMPLOYEE_NAVIGATION: NavigationItem[] = [
  { href: "/employee/leads", label: "Khách hàng", icon: AddressBookTabs },
  { href: "/employee/projects", label: "Tài nguyên dự án", icon: Briefcase },
  { href: "/employee/contracts/new", label: "Tạo hợp đồng", icon: FileDoc },
];

const ADMIN_NAVIGATION: NavigationItem[] = [
  { href: "/admin/contracts", label: "Toàn bộ hợp đồng", icon: Files },
  { href: "/admin/employees", label: "Nhân sự & phân quyền", icon: UsersThree },
  { href: "/admin/cms", label: "Nội dung web public", icon: Buildings },
  { href: "/admin/tasks", label: "Theo dõi công việc", icon: Kanban },
];

const ROLE_LABEL: Record<Role, string> = {
  EMPLOYEE: "Nhân viên",
  ADMIN: "Quản trị viên",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.slice(-2).map((part) => part[0]).join("").toLocaleUpperCase("vi-VN");
}

export function PortalShell({ children, session }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoggingOut, startLogout] = useTransition();
  const navigation = session.role === "ADMIN" ? ADMIN_NAVIGATION : EMPLOYEE_NAVIGATION;

  useEffect(() => {
    if (!drawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    function handleDrawerKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setDrawerOpen(false);
        window.requestAnimationFrame(() => menuButtonRef.current?.focus());
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = Array.from(
        drawerRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleDrawerKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleDrawerKeyDown);
    };
  }, [drawerOpen]);

  function closeDrawerAndRestoreFocus() {
    setDrawerOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  function handleLogout() {
    startLogout(async () => {
      await fetch("/api/session", { method: "DELETE" });
      router.replace("/login");
      router.refresh();
    });
  }

  return (
    <div className="min-h-[100dvh] bg-portal-paper lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      {drawerOpen ? (
        <button
          aria-label="Đóng menu điều hướng"
          className="fixed inset-0 z-30 bg-portal-brand/55 lg:hidden"
          onClick={closeDrawerAndRestoreFocus}
          type="button"
        />
      ) : null}

      <aside
        aria-label="Điều hướng portal"
        className={`fixed inset-y-0 left-0 z-40 flex w-[17rem] flex-col bg-portal-brand text-white transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-[100dvh] lg:translate-x-0 ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
        id="portal-navigation"
        ref={drawerRef}
      >
        <div className="flex min-h-20 items-center justify-between border-b border-white/14 px-5">
          <Link
            className="flex items-center gap-3 rounded-sm focus-visible:outline-white"
            href={session.role === "ADMIN" ? "/admin/contracts" : "/employee/leads"}
            onClick={() => setDrawerOpen(false)}
          >
            <span className="grid size-10 place-items-center rounded-md bg-white text-lg font-black text-portal-brand">
              Q
            </span>
            <span>
              <span className="block text-base font-bold">QTS Portal</span>
              <span className="block text-xs text-white/65">Hệ thống nội bộ</span>
            </span>
          </Link>
          <button
            aria-label="Đóng menu"
            className="grid size-11 place-items-center rounded-md text-white/75 hover:bg-white/10 hover:text-white lg:hidden"
            onClick={closeDrawerAndRestoreFocus}
            ref={closeButtonRef}
            type="button"
          >
            <X size={21} />
          </button>
        </div>

        <div className="border-b border-white/14 px-5 py-4">
          <p className="text-xs font-semibold text-white/55">Không gian làm việc</p>
          <p className="mt-1 text-sm font-semibold text-white">{ROLE_LABEL[session.role]}</p>
        </div>

        <nav className="portal-scrollbar flex-1 overflow-y-auto px-3 py-5">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors ${active ? "bg-white text-portal-brand" : "text-white/72 hover:bg-white/10 hover:text-white"}`}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                  >
                    <Icon size={20} weight={active ? "fill" : "regular"} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {active ? <CaretRight aria-hidden size={15} weight="fill" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/14 p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-portal-highlight text-xs font-bold text-portal-brand">
              {getInitials(session.name)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold">{session.name}</span>
              <span className="block truncate text-xs text-white/55">{session.department}</span>
            </span>
            <button
              aria-label="Đăng xuất"
              className="grid size-11 place-items-center rounded-md text-white/65 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isLoggingOut}
              onClick={handleLogout}
              title="Đăng xuất"
              type="button"
            >
              <SignOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      <div className="min-w-0" inert={drawerOpen}>
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-slate-200 bg-white/96 px-4 shadow-[0_8px_20px_-18px_rgba(22,38,96,0.55)] backdrop-blur-sm sm:px-6 lg:px-8">
          <button
            aria-expanded={drawerOpen}
            aria-controls="portal-navigation"
            aria-label="Mở menu điều hướng"
            className="grid size-11 place-items-center rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 lg:hidden"
            onClick={() => setDrawerOpen(true)}
            ref={menuButtonRef}
            type="button"
          >
            <List size={21} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-500">QTS Internal Portal</p>
            <p className="truncate text-sm font-semibold text-slate-800">{session.department}</p>
          </div>
          <span className="hidden items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 sm:flex">
            <ClipboardText size={17} />
            Dữ liệu minh họa
          </span>
        </header>

        <main className="mx-auto w-full max-w-[100rem] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
