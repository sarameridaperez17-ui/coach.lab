"use client";

import { useState, useEffect, useRef } from "react";
import type { ItemStatus } from "@/lib/api";

const STATUS_OPTIONS: { status: ItemStatus; label: string; color: string; icon: React.ReactNode }[] = [
  {
    status: "working",
    label: "Trabajando",
    color: "#34d399",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#34d399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 2.5l5 5" /><path d="M10 5l5 5-3.5 1.5L10 16l-1.5-4.5L5 10z" /><path d="M4 16l3.5-3.5" />
      </svg>
    ),
  },
  {
    status: "paused",
    label: "En pausa",
    color: "#60a5fa",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2.5" /><path d="M15.5 3l1.5 2.5H14.5" />
      </svg>
    ),
  },
  {
    status: "focus",
    label: "Foco",
    color: "#fbbf24",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="4" /><circle cx="10" cy="10" r="1.2" fill="#fbbf24" />
      </svg>
    ),
  },
  {
    status: "favorite",
    label: "Favorito",
    color: "#f87171",
    icon: (
      <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.5 5.8 16l.8-4.7L3.2 8l4.7-.7z" />
      </svg>
    ),
  },
];

export function StatusBadge({ status }: { status: ItemStatus }) {
  const opt = STATUS_OPTIONS.find((o) => o.status === status);
  if (!opt) return null;

  const badgeColors: Record<ItemStatus, string> = {
    working: "bg-emerald-400/15 text-emerald-400",
    paused: "bg-blue-400/15 text-blue-400",
    focus: "bg-amber-400/15 text-amber-400",
    favorite: "bg-rose-400/15 text-rose-400",
  };

  const badgeIcons: Record<ItemStatus, React.ReactNode> = {
    working: (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 2.5l5 5" /><path d="M10 5l5 5-3.5 1.5L10 16l-1.5-4.5L5 10z" /><path d="M4 16l3.5-3.5" />
      </svg>
    ),
    paused: (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" /><path d="M10 6v4l2.5 2.5" /><path d="M15.5 3l1.5 2.5H14.5" />
      </svg>
    ),
    focus: (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="4" /><circle cx="10" cy="10" r="1.2" fill="currentColor" />
      </svg>
    ),
    favorite: (
      <svg width="11" height="11" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 3l2.1 4.3 4.7.7-3.4 3.3.8 4.7L10 13.5 5.8 16l.8-4.7L3.2 8l4.7-.7z" />
      </svg>
    ),
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badgeColors[status]}`}>
      {badgeIcons[status]}
      {opt.label}
    </span>
  );
}

interface StatusMenuProps {
  x: number;
  y: number;
  currentStatus: ItemStatus | null;
  onSelect: (status: ItemStatus) => void;
  onRemove: () => void;
  onClose: () => void;
}

export function StatusMenu({ x, y, currentStatus, onSelect, onRemove, onClose }: StatusMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Adjust position so menu doesn't overflow viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > window.innerHeight) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] bg-[#1a1d27] border border-[#2a2d37] rounded-xl shadow-2xl p-1"
      style={{ left: x, top: y, width: 200 }}
    >
      {STATUS_OPTIONS.map((opt) => (
        <button
          key={opt.status}
          onClick={() => onSelect(opt.status)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentStatus === opt.status ? "bg-[#22252f] text-white" : "text-gray-300 hover:bg-[#22252f]"
          }`}
        >
          {opt.icon}
          <span>{opt.label}</span>
          {currentStatus === opt.status && (
            <svg className="w-3.5 h-3.5 ml-auto text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>
      ))}
      {currentStatus && (
        <>
          <div className="h-px bg-[#2a2d37] my-1 mx-2" />
          <button
            onClick={onRemove}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-[#22252f] transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            <span>Quitar estado</span>
          </button>
        </>
      )}
    </div>
  );
}
