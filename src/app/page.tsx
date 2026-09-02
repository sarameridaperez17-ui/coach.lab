import Link from "next/link";

const QUICK_ACCESS = [
  {
    href: "/modelo-de-juego",
    title: "Modelo de juego",
    description: "Principios, subprincipios y comportamientos organizados por contexto y fase.",
    icon: "◈",
    color: "bg-emerald-50 border-emerald-200 hover:border-emerald-400",
  },
  {
    href: "/posiciones",
    title: "Posiciones",
    description: "Perfiles de las 12 posiciones con comportamientos por zona y fase.",
    icon: "◉",
    color: "bg-blue-50 border-blue-200 hover:border-blue-400",
  },
  {
    href: "/conceptos-tacticos",
    title: "Conceptos tácticos",
    description: "Biblioteca de conceptos transversales: cuadrado, giro, 3ª mujer...",
    icon: "◆",
    color: "bg-amber-50 border-amber-200 hover:border-amber-400",
  },
  {
    href: "/tareas",
    title: "Tareas",
    description: "Ejercicios vinculados a principios del modelo de juego.",
    icon: "▣",
    color: "bg-purple-50 border-purple-200 hover:border-purple-400",
  },
  {
    href: "/glosario",
    title: "Glosario",
    description: "Terminología propia con definiciones y vínculos.",
    icon: "▤",
    color: "bg-rose-50 border-rose-200 hover:border-rose-400",
  },
  {
    href: "/notas",
    title: "Notas",
    description: "Reflexiones y diario del entrenador con etiquetas inteligentes.",
    icon: "▥",
    color: "bg-cyan-50 border-cyan-200 hover:border-cyan-400",
  },
];

export default function HomePage() {
  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900">
          coach<span className="text-emerald-600">.lab</span>
        </h1>
        <p className="text-gray-500 mt-2">
          Tu base de conocimiento. Tu metodología. Tu identidad.
        </p>
      </div>

      {/* Quick access grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {QUICK_ACCESS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`block p-6 rounded-xl border-2 transition-all ${item.color}`}
          >
            <div className="text-2xl mb-3">{item.icon}</div>
            <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
          </Link>
        ))}
      </div>

      {/* Stats placeholder */}
      <div className="mt-10 p-6 bg-white rounded-xl border border-gray-200">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Resumen del modelo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Principios</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Subprincipios</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Tareas</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">0</p>
            <p className="text-sm text-gray-500">Notas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
