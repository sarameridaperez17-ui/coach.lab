// Color de fondo por etiqueta de tarea — determinista a partir del id de la
// etiqueta, así la misma etiqueta se ve siempre del mismo color en
// cualquier parte de la web (tarjetas, filtros, formulario de creación...),
// sin guardar nada nuevo en la base de datos. Vive en lib/ (no duplicado
// por página) precisamente para que ese color sea el mismo en todos los
// sitios donde se use.
//
// "bg"/"text" son la versión sólida (tarjetas, Configuración); "bgSoft" es
// la misma tonalidad al 30% de opacidad, para un fondo sutil (formulario de
// creación/edición). Los nombres de clase están escritos tal cual para que
// Tailwind los detecte al escanear el código — no se construyen a partir de
// texto dinámico.
const TAG_COLOR_PALETTE: { bg: string; bgSoft: string; text: string }[] = [
  { bg: "bg-red-600", bgSoft: "bg-red-600/30", text: "text-white" },
  { bg: "bg-orange-600", bgSoft: "bg-orange-600/30", text: "text-white" },
  { bg: "bg-amber-600", bgSoft: "bg-amber-600/30", text: "text-white" },
  { bg: "bg-lime-600", bgSoft: "bg-lime-600/30", text: "text-white" },
  { bg: "bg-green-600", bgSoft: "bg-green-600/30", text: "text-white" },
  { bg: "bg-emerald-600", bgSoft: "bg-emerald-600/30", text: "text-white" },
  { bg: "bg-teal-600", bgSoft: "bg-teal-600/30", text: "text-white" },
  { bg: "bg-cyan-600", bgSoft: "bg-cyan-600/30", text: "text-white" },
  { bg: "bg-sky-600", bgSoft: "bg-sky-600/30", text: "text-white" },
  { bg: "bg-blue-600", bgSoft: "bg-blue-600/30", text: "text-white" },
  { bg: "bg-indigo-600", bgSoft: "bg-indigo-600/30", text: "text-white" },
  { bg: "bg-violet-600", bgSoft: "bg-violet-600/30", text: "text-white" },
  { bg: "bg-purple-600", bgSoft: "bg-purple-600/30", text: "text-white" },
  { bg: "bg-fuchsia-600", bgSoft: "bg-fuchsia-600/30", text: "text-white" },
  { bg: "bg-pink-600", bgSoft: "bg-pink-600/30", text: "text-white" },
  { bg: "bg-rose-600", bgSoft: "bg-rose-600/30", text: "text-white" },
];

export function getTagColor(tagId: string): { bg: string; bgSoft: string; text: string } {
  let hash = 0;
  for (let i = 0; i < tagId.length; i++) {
    hash = (hash * 31 + tagId.charCodeAt(i)) | 0;
  }
  const index = Math.abs(hash) % TAG_COLOR_PALETTE.length;
  return TAG_COLOR_PALETTE[index];
}
