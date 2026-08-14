"use client";

import { List, X } from "@phosphor-icons/react";
import { Navbar, NavbarBrand } from "flowbite-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { navigation } from "@/data/site-content";

export function SiteHeader() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b-2 border-qts-accent bg-qts-primary text-white">
      <Navbar
        fluid
        className="page-shell bg-transparent px-0 py-3 sm:px-0"
        aria-label="Điều hướng chính"
      >
        <NavbarBrand as={Link} href="/" className="group gap-3">
          <span
            className="grid size-10 place-items-center bg-qts-accent text-sm font-extrabold text-qts-deep transition-transform duration-300 ease-out group-hover:-translate-y-0.5"
            aria-hidden="true"
          >
            Q
          </span>
          <span className="flex flex-col leading-none">
            <span className="text-xl font-extrabold text-white">QTS</span>
            <span className="mt-1 text-[0.62rem] font-semibold uppercase text-qts-secondary">
              Technology Systems
            </span>
          </span>
        </NavbarBrand>

        <div className="flex items-center gap-2 lg:order-2">
          <Link
            href="/lien-he"
            className="hvr-sweep-to-right hvr-sweep-light !hidden min-h-11 items-center bg-qts-accent px-5 text-sm font-bold text-qts-deep transition-transform duration-200 active:scale-[0.98] lg:!inline-flex"
          >
            Trao đổi dự án
          </Link>
          <button
            type="button"
            aria-controls="primary-navigation"
            aria-expanded={isMenuOpen}
            aria-label={isMenuOpen ? "Đóng menu chính" : "Mở menu chính"}
            onClick={() => setIsMenuOpen((isOpen) => !isOpen)}
            className="grid size-11 place-items-center text-white transition-colors hover:bg-white/10 active:bg-white/20 lg:hidden"
          >
            {isMenuOpen ? (
              <X size={24} weight="bold" aria-hidden="true" />
            ) : (
              <List size={24} weight="bold" aria-hidden="true" />
            )}
          </button>
        </div>

        <div
          id="primary-navigation"
          className={`${isMenuOpen ? "block" : "hidden"} w-full lg:order-1 lg:block lg:w-auto lg:grow`}
        >
          <ul className="mt-4 flex flex-col gap-1 border-t border-white/20 pt-3 lg:mt-0 lg:flex-row lg:items-center lg:justify-end lg:border-0 lg:pt-0">
            {navigation.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    onClick={() => setIsMenuOpen(false)}
                    className={`block px-3 py-3 text-xs font-bold uppercase transition-colors lg:py-2 ${
                      isActive
                        ? "bg-qts-accent text-qts-deep hover:text-qts-deep"
                        : "text-white hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </Navbar>
    </header>
  );
}
