"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Today" },
  { href: "/generate", label: "Generate" },
  { href: "/history", label: "History" },
];

export default function Nav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-20 border-b border-slate-800 bg-[#0B1220] text-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <ConcourseMark />
          <span className="tracking-tight text-[15px]">
            Concourse
            <span className="ml-1.5 font-normal text-slate-400">Content</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active =
              l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-500 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function ConcourseMark() {
  return (
    <span className="relative inline-flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-indigo-400 via-indigo-500 to-violet-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
      <span className="text-[13px] font-bold leading-none text-white">C</span>
      <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-cyan-300/80 blur-[2px]" />
    </span>
  );
}
