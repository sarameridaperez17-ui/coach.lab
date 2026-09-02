"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_SECTIONS = [
  {
    title: "MODELO",
    items: [
      { href: "/modelo-de-juego", label: "Modelo de juego", icon: "◈" },
      { href: "/sistemas", label: "Sistemas", icon: "⬢" },
      { href: "/posiciones", label: "Posiciones", icon: "◉" },
      { href: "/abp", label: "ABP", icon: "◎" },
    ],
  },
  {
    title: "CONOCIMIENTO",
    items: [
      { href: "/conceptos-tacticos", label: "Conceptos tácticos", icon: "◆" },
      { href: "/glosario", label: "Diccionario táctico", icon: "▤" },
    ],
  },
  {
    title: "ENTRENAMIENTO",
    items: [
      { href: "/tareas", label: "Tareas", icon: "▣" },
    ],
  },
  {
    title: "REGISTRO",
    items: [
      { href: "/notas", label: "Notas", icon: "▥" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#0d0f15] text-white flex flex-col border-r border-[#1e2130]">
      {/* Logo */}
      <div className="p-6 border-b border-[#1e2130]">
        <h1 className="text-xl font-bold tracking-tight">
          coach<span className="text-emerald-400">.lab</span>
        </h1>
        <p className="text-xs text-gray-500 mt-1">El laboratorio del entrenador</p>
      </div>

      {/* Home */}
      <div className="px-4 pt-4 pb-1">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            pathname === "/"
              ? "bg-emerald-600 text-white font-medium"
              : "text-gray-400 hover:bg-[#1a1d27] hover:text-white"
          }`}
        >
          <span className="text-base">⬡</span>
          Inicio
        </Link>
      </div>

      {/* Navigation sections */}
      <nav className="flex-1 px-4 py-2 space-y-4 overflow-y-auto">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-1.5">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-emerald-600/15 text-emerald-400 font-medium"
                        : "text-gray-400 hover:bg-[#1a1d27] hover:text-white"
                    }`}
                  >
                    <span className="text-sm">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#1e2130]">
        <p className="text-xs text-gray-600">coach.lab v1.0</p>
      </div>
    </aside>
  );
}
