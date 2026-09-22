"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const DEFAULT_SECTIONS: NavSection[] = [
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
    title: "EQUIPO",
    items: [
      { href: "/plantillas", label: "Plantillas", icon: "▧" },
      { href: "/seguimiento", label: "Seguimiento de jugadoras", icon: "⌖" },
    ],
  },
  {
    title: "CONOCIMIENTO",
    items: [
      { href: "/glosario", label: "Diccionario táctico", icon: "▤" },
    ],
  },
  {
    title: "ENTRENAMIENTO",
    items: [
      { href: "/tareas", label: "Tareas", icon: "▣" },
      { href: "/sesiones", label: "Sesiones", icon: "▦" },
    ],
  },
  {
    title: "REGISTRO",
    items: [
      { href: "/notas", label: "Notas", icon: "▥" },
      { href: "/planificacion", label: "Planificación", icon: "▦" },
    ],
  },
];

// Orden del menú — preferencia personal guardada en este navegador (la app
// no tiene login, así que no hay donde más guardarla). Solo se guarda el
// orden (títulos de sección / hrefs de item), nunca el contenido, para que
// si en el futuro se añaden o quitan secciones/páginas sigan apareciendo
// correctamente aunque no estén en el orden guardado.
const STORAGE_KEY = "coachlab-sidebar-order";

interface StoredOrder {
  sections: string[];
  items: Record<string, string[]>;
}

function loadStoredOrder(): StoredOrder | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredOrder) : null;
  } catch {
    return null;
  }
}

function saveStoredOrder(order: StoredOrder) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
  } catch {
    // localStorage no disponible (privado/bloqueado) — se pierde la
    // preferencia, pero el menú sigue funcionando con el orden por defecto.
  }
}

function applyOrder(sections: NavSection[], order: StoredOrder | null): NavSection[] {
  if (!order) return sections;
  const byTitle = new Map(sections.map((s) => [s.title, s]));
  const ordered: NavSection[] = [];
  for (const title of order.sections) {
    const s = byTitle.get(title);
    if (s) ordered.push(s);
  }
  for (const s of sections) if (!order.sections.includes(s.title)) ordered.push(s);

  return ordered.map((s) => {
    const itemOrder = order.items[s.title];
    if (!itemOrder) return s;
    const byHref = new Map(s.items.map((i) => [i.href, i]));
    const items: NavItem[] = [];
    for (const href of itemOrder) {
      const item = byHref.get(href);
      if (item) items.push(item);
    }
    for (const i of s.items) if (!itemOrder.includes(i.href)) items.push(i);
    return { ...s, items };
  });
}

function orderToStored(sections: NavSection[]): StoredOrder {
  return {
    sections: sections.map((s) => s.title),
    items: Object.fromEntries(sections.map((s) => [s.title, s.items.map((i) => i.href)])),
  };
}

function moveInArray<T>(arr: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function Sidebar() {
  const pathname = usePathname();
  const [sections, setSections] = useState<NavSection[]>(DEFAULT_SECTIONS);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    // Se difiere a una microtarea (en vez de llamar a setSections en el
    // cuerpo del efecto) para cumplir la regla react-hooks/set-state-in-effect.
    Promise.resolve(loadStoredOrder()).then((stored) => {
      if (stored) setSections(applyOrder(DEFAULT_SECTIONS, stored));
    });
  }, []);

  const moveSection = (index: number, direction: -1 | 1) => {
    setSections((prev) => {
      const next = moveInArray(prev, index, direction);
      saveStoredOrder(orderToStored(next));
      return next;
    });
  };

  const moveItem = (sectionIndex: number, itemIndex: number, direction: -1 | 1) => {
    setSections((prev) => {
      const next = prev.map((s, i) =>
        i === sectionIndex ? { ...s, items: moveInArray(s.items, itemIndex, direction) } : s
      );
      saveStoredOrder(orderToStored(next));
      return next;
    });
  };

  const resetOrder = () => {
    setSections(DEFAULT_SECTIONS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignorado — igual que en saveStoredOrder
    }
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-background text-foreground flex flex-col border-r border-border print:hidden">
      {/* Logo */}
      <div className="p-3 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight">
          coach<span className="text-emerald-400">.lab</span>
        </h1>
        <p className="text-xs text-muted mt-1">El laboratorio del entrenador</p>
      </div>

      {/* Home */}
      <div className="px-4 pt-2 pb-1">
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/"
              ? "bg-emerald-600 text-white font-medium"
              : "text-foreground-secondary hover:bg-surface hover:text-foreground"
          }`}
        >
          <span className="text-base">⬡</span>
          Inicio
        </Link>
      </div>

      {/* Navigation sections — sin scroll propio: el contenido está
          calculado para caber siempre entero en la altura de la pantalla */}
      <nav className="flex-1 px-4 py-1 space-y-2 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider px-3 mb-1">
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
                    className={`flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      isActive
                        ? "bg-emerald-600/15 text-emerald-400 font-medium"
                        : "text-foreground-secondary hover:bg-surface hover:text-foreground"
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

      {/* Footer — modo noche y configuración en la misma fila, compacto */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button
            onClick={() => setSettingsOpen(true)}
            title="Configuración"
            className="flex-shrink-0 p-2 rounded-lg text-foreground-secondary hover:bg-surface hover:text-foreground transition-colors"
          >
            <span className="text-sm">⚙</span>
          </button>
        </div>
        <p className="text-xs text-muted px-1 mt-1">coach.lab v1.0</p>
      </div>

      {settingsOpen && (
        <SidebarSettingsModal
          sections={sections}
          onMoveSection={moveSection}
          onMoveItem={moveItem}
          onReset={resetOrder}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </aside>
  );
}

function SidebarSettingsModal({
  sections,
  onMoveSection,
  onMoveItem,
  onReset,
  onClose,
}: {
  sections: NavSection[];
  onMoveSection: (index: number, direction: -1 | 1) => void;
  onMoveItem: (sectionIndex: number, itemIndex: number, direction: -1 | 1) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl w-full max-w-sm max-h-[80vh] flex flex-col text-foreground">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold">Orden del menú</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground px-1">✕</button>
        </div>
        <p className="text-xs text-muted px-4 pt-3">
          Usa las flechas para cambiar el orden de las secciones y de cada página, de arriba a abajo.
        </p>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {sections.map((section, sIdx) => (
            <div key={section.title}>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider">{section.title}</p>
                <div className="flex flex-col">
                  <button
                    disabled={sIdx === 0}
                    onClick={() => onMoveSection(sIdx, -1)}
                    className="text-muted hover:text-foreground disabled:opacity-20 text-[10px] leading-none"
                    title="Subir sección"
                  >
                    ▲
                  </button>
                  <button
                    disabled={sIdx === sections.length - 1}
                    onClick={() => onMoveSection(sIdx, 1)}
                    className="text-muted hover:text-foreground disabled:opacity-20 text-[10px] leading-none"
                    title="Bajar sección"
                  >
                    ▼
                  </button>
                </div>
              </div>
              <div className="space-y-0.5">
                {section.items.map((item, iIdx) => (
                  <div
                    key={item.href}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-background"
                  >
                    <span className="text-sm truncate">{item.icon} {item.label}</span>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button
                        disabled={iIdx === 0}
                        onClick={() => onMoveItem(sIdx, iIdx, -1)}
                        className="text-muted hover:text-foreground disabled:opacity-20 px-1"
                        title="Subir"
                      >
                        ▲
                      </button>
                      <button
                        disabled={iIdx === section.items.length - 1}
                        onClick={() => onMoveItem(sIdx, iIdx, 1)}
                        className="text-muted hover:text-foreground disabled:opacity-20 px-1"
                        title="Bajar"
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-border flex justify-between items-center">
          <button onClick={onReset} className="text-xs text-muted hover:text-foreground">
            Restablecer orden
          </button>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
