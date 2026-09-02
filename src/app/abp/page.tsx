"use client";

import { useState } from "react";

const ABP_TYPES = [
  { id: "offensive", name: "ABP Ofensivo" },
  { id: "defensive", name: "ABP Defensivo" },
];

const ABP_SUBTYPES = {
  offensive: [
    { id: "falta-indirecta-area", name: "Falta indirecta dentro de área" },
    { id: "falta-profunda", name: "Falta profunda" },
    { id: "falta-lateral", name: "Falta lateral" },
    { id: "falta-alejada", name: "Falta alejada" },
    { id: "falta-frontal-directa", name: "Falta frontal directa" },
    { id: "falta-frontal-alejada", name: "Falta frontal alejada" },
    { id: "corner", name: "Córner" },
    { id: "saque-banda", name: "Saque de banda" },
    { id: "saque-centro", name: "Saque de centro" },
  ],
  defensive: [
    { id: "falta-indirecta-area-def", name: "Falta indirecta dentro de área" },
    { id: "falta-profunda-def", name: "Falta profunda" },
    { id: "falta-lateral-def", name: "Falta lateral" },
    { id: "falta-alejada-def", name: "Falta alejada" },
    { id: "falta-frontal-directa-def", name: "Falta frontal directa" },
    { id: "falta-frontal-alejada-def", name: "Falta frontal alejada" },
    { id: "corner-def", name: "Córner" },
    { id: "saque-banda-def", name: "Saque de banda" },
    { id: "saque-centro-def", name: "Saque de centro" },
  ],
};

export default function ABPPage() {
  const [selectedType, setSelectedType] = useState<"offensive" | "defensive">("offensive");

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Acciones a balón parado</h1>

      {/* Tipo ABP */}
      <div className="mb-6">
        <div className="flex border-b border-gray-200">
          {ABP_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id as "offensive" | "defensive")}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedType === type.id
                  ? "border-orange-600 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {type.name}
            </button>
          ))}
        </div>
      </div>

      {/* Subtipos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ABP_SUBTYPES[selectedType].map((subtype) => (
          <div
            key={subtype.id}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:border-orange-300 transition-colors cursor-pointer"
          >
            <h3 className="font-semibold text-gray-900 mb-2">{subtype.name}</h3>
            <div className="border border-dashed border-gray-200 rounded-lg h-24 flex items-center justify-center">
              <span className="text-sm text-gray-400">+ Definir estrategia</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
