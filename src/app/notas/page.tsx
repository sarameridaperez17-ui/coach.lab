export default function NotasPage() {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Notas</h1>
        <button className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition-colors">
          + Nueva nota
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar notas..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:border-cyan-300"
        />
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white">
          <option>Todas las etiquetas</option>
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white">
          <option>Más recientes</option>
          <option>Más antiguas</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-lg font-medium mb-2">Sin notas</p>
        <p className="text-sm">
          Crea tu primera nota. Las etiquetas inteligentes vincularán automáticamente
          tus reflexiones con el modelo de juego.
        </p>
      </div>
    </div>
  );
}
