"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ArrowRight,
  ArrowUpRight,
  Blueprint,
  CaretDown,
  Database,
  Fingerprint,
  FlowArrow,
  HardDrives,
  List,
  MagnifyingGlass,
  Pulse,
  ShieldCheck,
  StackSimple,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { capabilities, projects, solutions } from "@/data/site-content";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const menuIcons: Record<string, Icon> = {
  architecture: Blueprint,
  integration: FlowArrow,
  security: Fingerprint,
  operations: Pulse,
  cybersecurity: MagnifyingGlass,
  infrastructure: HardDrives,
  "data-platform": Database,
  "security-operations-center": ShieldCheck,
  "enterprise-data-center": HardDrives,
  "smart-city-platform": StackSimple,
};

const solutionMenuLabels: Record<string, string> = {
  cybersecurity: "An toàn thông tin",
  infrastructure: "Hạ tầng số",
  "data-platform": "Nền tảng dữ liệu",
};

const megaMenus = [
  {
    id: "solutions",
    label: "Solutions",
    href: "/giai-phap",
    summary: "Bắt đầu từ vấn đề vận hành, không từ danh mục công nghệ.",
    ctaLabel: "Khám phá giải pháp",
    items: solutions.map((item) => ({
      href: `/giai-phap#${item.id}`,
      label: solutionMenuLabels[item.id] ?? item.problem,
      description: item.problem,
      icon: menuIcons[item.id] ?? FlowArrow,
    })),
  },
  {
    id: "capabilities",
    label: "Architecture",
    href: "/nang-luc",
    summary: "Bốn lớp năng lực từ thiết kế đến vận hành.",
    ctaLabel: "Khám phá kiến trúc",
    items: capabilities.map((item) => ({
      href: `/nang-luc#${item.id}`,
      label: item.title,
      description: item.description,
      icon: menuIcons[item.id] ?? Blueprint,
    })),
  },
  {
    id: "projects",
    label: "Case Studies",
    href: "/du-an",
    summary: "Các phạm vi kỹ thuật ẩn danh để xem cách kiến trúc được tổ chức.",
    ctaLabel: "Khám phá tình huống",
    items: projects.map((item) => ({
      href: `/du-an#${item.id}`,
      label: item.title,
      description: item.description,
      icon: menuIcons[item.id] ?? Blueprint,
    })),
  },
] as const;

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHome = pathname === "/";
  const isSolid = !isHome || scrolled;
  const headerRef = useRef<HTMLElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setOpenMenu(null);
      setMobileOpen(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [openMenu]);

  function cancelClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    cancelClose();
    closeTimerRef.current = setTimeout(() => setOpenMenu(null), 140);
  }

  function focusPanel(menuId: string) {
    setOpenMenu(menuId);
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`#mega-${menuId} .mega-panel__item`)?.focus();
    });
  }

  const activeMenu = megaMenus.find((menu) => menu.id === openMenu);

  return (
    <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
    <header
      ref={headerRef}
      className="site-header qts-glass qts-dark data-[solid=true]:bg-white/90 data-[solid=true]:backdrop-blur-xl data-[solid=true]:border-b data-[solid=true]:border-white/10 data-[solid=true]:shadow-[0_8px_32px_rgb(0,0,0,0.08)] data-[compact=true]:py-3"
      data-compact={scrolled}
      data-menu-open={Boolean(activeMenu)}
      data-solid={isSolid}
      onMouseEnter={cancelClose}
      onMouseLeave={scheduleClose}
    >
      <div className="site-header__main">
        <div className="page-shell flex h-full items-center justify-between gap-6">
          <Link
            href="/"
            prefetch
            className="site-header__brand flex min-h-11 items-center gap-3"
          >
            <span className="site-header__brand-mark" aria-hidden="true">Q</span>
            <span>
              <span className="block text-lg font-extrabold leading-none tracking-tighter">QTS</span>
              <span className="site-header__brand-detail mt-1 block text-xs font-semibold leading-none text-muted-foreground">
                Technology Solutions
              </span>
            </span>
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden items-center gap-8 lg:flex" lang="en">
            <Link
              href="/"
              prefetch
              className="site-header__nav-link"
              aria-current={pathname === "/" ? "page" : undefined}
              onFocus={() => setOpenMenu(null)}
            >
              Platform
            </Link>
            {megaMenus.map((menu) => {
              const active = isRouteActive(pathname, menu.href);
              const expanded = openMenu === menu.id;

              return (
                <button
                  key={menu.id}
                  type="button"
                  data-mega-menu-trigger
                  className="site-header__nav-trigger"
                  aria-expanded={expanded}
                  aria-controls={`mega-${menu.id}`}
                  aria-current={active ? "page" : undefined}
                  onMouseEnter={() => setOpenMenu(menu.id)}
                  onFocus={() => {
                    cancelClose();
                    setOpenMenu(menu.id);
                  }}
                  onClick={() => {
                    cancelClose();
                    setOpenMenu(menu.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      focusPanel(menu.id);
                    }
                  }}
                >
                  {menu.label}
                  <CaretDown
                    size={14}
                    weight="bold"
                    aria-hidden="true"
                    className={expanded ? "rotate-180" : undefined}
                  />
                </button>
                );
              })}
            <Link
              href="/pricing"
              prefetch
              className="site-header__nav-link"
              aria-current={isRouteActive(pathname, "/pricing") ? "page" : undefined}
              onFocus={() => setOpenMenu(null)}
            >
              Pricing
            </Link>
          </nav>

          <Link href="/lien-he" prefetch className="site-header__cta hidden lg:inline-flex" aria-label="Trao đổi với QTS">
            Trao đổi với QTS
            <ArrowRight size={18} weight="bold" aria-hidden="true" />
          </Link>

          <SheetTrigger asChild>
            <button
              type="button"
              aria-controls="mobile-navigation"
              aria-expanded={mobileOpen}
              aria-label="Mở điều hướng"
              className="site-header__menu-button grid h-12 w-12 place-items-center border lg:hidden"
            >
              <List size={24} weight="bold" aria-hidden="true" />
            </button>
          </SheetTrigger>
        </div>
      </div>

      {activeMenu ? (
        <div
          id={`mega-${activeMenu.id}`}
          className="mega-panel hidden lg:block"
          role="group"
          aria-labelledby={`mega-${activeMenu.id}-title`}
        >
          <div className="mega-panel__inner page-shell">
            <div className="mega-panel__intro">
              <p className="mega-panel__label">QTS / {activeMenu.label}</p>
              <h2 id={`mega-${activeMenu.id}-title`} className="mega-panel__heading body-wrap">
                {activeMenu.summary}
              </h2>
              <Link
                href={activeMenu.href}
                prefetch
                className="mega-panel__overview-link"
              >
                {activeMenu.ctaLabel}
                <ArrowRight size={18} weight="bold" aria-hidden="true" />
              </Link>
            </div>

            <ol className="mega-panel__list" role="list" aria-label={`Các mục ${activeMenu.label}`}>
              {activeMenu.items.map((item, index) => {
                const ItemIcon = item.icon;

                return (
                  <li key={item.href}>
                    <Link href={item.href} prefetch className="mega-panel__item">
                      <span className="mega-panel__item-number" aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="mega-panel__item-icon" aria-hidden="true">
                        <ItemIcon size={25} weight="regular" />
                      </span>
                      <span className="mega-panel__item-copy">
                        <span className="mega-panel__item-title display-wrap">{item.label}</span>
                        <span className="mega-panel__item-description body-wrap">{item.description}</span>
                      </span>
                      <ArrowUpRight className="mega-panel__item-arrow" size={18} weight="bold" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      ) : null}

        <SheetContent
          id="mobile-navigation"
          side="right"
          className="mobile-drawer lg:hidden"
          aria-label="Điều hướng di động"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Điều hướng QTS</SheetTitle>
            <SheetDescription>Chọn trang cần mở.</SheetDescription>
          </SheetHeader>
          <nav className="page-shell py-5" aria-label="Điều hướng di động" lang="en">
            <Link
              href="/"
              prefetch
              className="mobile-drawer__link"
              aria-current={pathname === "/" ? "page" : undefined}
            >
              Platform <span aria-hidden="true">01</span>
            </Link>
            {megaMenus.map((link, index) => (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                className="mobile-drawer__link"
                aria-current={isRouteActive(pathname, link.href) ? "page" : undefined}
              >
                {link.label}
                <span aria-hidden="true">{String(index + 2).padStart(2, "0")}</span>
              </Link>
            ))}
            <Link
              href="/pricing"
              prefetch
              className="mobile-drawer__link"
              aria-current={isRouteActive(pathname, "/pricing") ? "page" : undefined}
            >
              Pricing <span aria-hidden="true">05</span>
            </Link>
            <div className="mt-8 border-l-2 border-qts-accent pl-5 text-sm leading-6 text-qts-secondary" lang="vi">
              Thiết kế và vận hành hệ thống số cho quy trình phức tạp.
            </div>
          </nav>
        </SheetContent>
    </header>
    </Sheet>
  );
}
