export default function ConceptosTacticosPage() {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Conceptos tácticos</h1>
        <button className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors">
          + Nuevo concepto
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-lg font-medium mb-2">Sin conceptos tácticos</p>
        <p className="text-sm">
          Crea tu primer concepto táctico (cuadrado, giro, 3ª mujer, profundo...)
        </p>
      </div>
    </div>
  );
}
