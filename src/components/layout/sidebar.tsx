"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Inicio", icon: "⬡" },
  { href: "/modelo-de-juego", label: "Modelo de juego", icon: "◈" },
  { href: "/sistemas", label: "Sistemas", icon: "⬢" },
  { href: "/conceptos-tacticos", label: "Conceptos tácticos", icon: "◆" },
  { href: "/posiciones", label: "Posiciones", icon: "◉" },
  { href: "/tareas", label: "Tareas", icon: "▣" },
  { href: "/abp", label: "ABP", icon: "◎" },
  { href: "/glosario", label: "Diccionario táctico", icon: "▤" },
  { href: "/notas", label: "Notas", icon: "▥" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-xl font-bold tracking-tight">
          coach<span className="text-emerald-400">.lab</span>
        </h1>
        <p className="text-xs text-gray-400 mt-1">El laboratorio del entrenador</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-emerald-600 text-white font-medium"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500">coach.lab v0.1</p>
      </div>
    </aside>
  );
}
