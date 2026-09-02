export default function TareasPage() {
  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tareas de entrenamiento</h1>
        <button className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          + Nueva tarea
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar tareas..."
          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-300"
        />
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white">
          <option>Todas las fases</option>
        </select>
        <select className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 bg-white">
          <option>Todos los contenidos</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
        <p className="text-lg font-medium mb-2">Sin tareas</p>
        <p className="text-sm">
          Crea tu primera tarea de entrenamiento vinculada a principios del modelo de juego.
        </p>
      </div>
    </div>
  );
}
