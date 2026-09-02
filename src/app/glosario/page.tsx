export default function GlosarioPage() {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Glosario</h1>
        <button className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 transition-colors">
          + Nuevo término
        </button>
      </div>

      {/* Búsqueda */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar en el glosario..."
          className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-300"
        />
      </div>

      {/* Filtro alfabético */}
      <div className="flex flex-wrap gap-1 mb-6">
        {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => (
          <button
            key={letter}
            className="w-8 h-8 rounded text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:border-rose-300 hover:text-rose-600 transition-colors"
          >
            {letter}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-lg font-medium mb-2">Sin términos</p>
        <p className="text-sm">
          Crea tu primer término del glosario para mantener una terminología consistente.
        </p>
      </div>
    </div>
  );
}
